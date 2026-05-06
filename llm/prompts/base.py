"""
모든 캐릭터 프롬프트가 공통으로 사용하는 유틸 함수 모음 파일.

주요 역할
- 수치 딕셔너리 → 자연어 설명 변환 (stats_to_description)
- 수치 범위 → 말투 지침 생성 (stats_to_tone_guidance)
- 루프 회차 → 정보 공개 제한 지침 생성 (_LOOP_RESTRICTION)
- 캐릭터 SystemMessage 조립 (build_system_prompt)
- 대화 기록 → LangChain 메시지 리스트 변환 (build_message_history)

새로운 수치 항목이 추가될 경우 stats_to_tone_guidance()에
해당 항목의 분기 로직만 추가하면 된다.

루프별 공개 범위를 수정하려면 _LOOP_RESTRICTION 딕셔너리만 수정하면 된다.
캐릭터 파일(cha_seoyeon.py 등)은 수정 불필요.
"""

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from config import THRESHOLDS


# ────────────────────────────────────────────
# 플레이어 이름 유틸
# ────────────────────────────────────────────

def get_first_name(full_name: str) -> str:
    """
    한국 이름 기준으로 성(첫 글자)을 제거하고 이름만 반환한다.

    Parameters
    ----------
    full_name : "정재희"

    Returns
    -------
    "재희"
    """
    return full_name[1:] if len(full_name) >= 2 else full_name


def get_child_term(player_gender: str) -> str:
    """
    성별에 따라 자녀 호칭을 반환한다.

    Parameters
    ----------
    player_gender : "남자" | "여자" | "무관"

    Returns
    -------
    "아들" | "딸"
    """
    return "아들" if player_gender == "남자" else "딸"


def get_sibling_term(player_gender: str) -> str:
    """
    성별에 따라 형제자매 호칭(동생 입장에서 부르는 말)을 반환한다.

    Parameters
    ----------
    player_gender : "남자" | "여자" | "무관"

    Returns
    -------
    "오빠" | "언니"
    """
    return "오빠" if player_gender == "남자" else "언니"


# ────────────────────────────────────────────
# 수치 → 자연어 설명
# ────────────────────────────────────────────

def stats_to_description(stats: dict) -> str:
    """
    수치 딕셔너리를 자연어 설명 문자열로 변환한다.
    프롬프트의 '현재 수치 상태' 섹션에 삽입된다.

    Parameters
    ----------
    stats : {"trust": 20, "hostility": 70, ...}

    Returns
    -------
    "- trust: 20/100\n- hostility: 70/100\n..."
    """
    lines = [f"- {key}: {value}/100" for key, value in stats.items()]
    return "\n".join(lines)


# ────────────────────────────────────────────
# 수치 → 말투 지침
# ────────────────────────────────────────────

def stats_to_tone_guidance(stats: dict) -> str:
    """
    수치 범위에 따라 캐릭터 말투 조정 지침을 생성한다.
    프롬프트의 '수치에 따른 말투 조정 지침' 섹션에 삽입된다.

    수치별 high/low 임계값은 config.py의 THRESHOLDS에서 관리한다.
    Fleshy는 범인 판정 전용 수치로 말투 분기 대상에서 제외한다.

    새로운 수치 항목 추가 시 config.py의 THRESHOLDS에 항목 추가 후
    이 함수에 elif 블록만 추가하면 된다.

    Parameters
    ----------
    stats : {"trust": 20, "hostility": 70, ...}

    Returns
    -------
    말투 지침 문자열
    """
    guidance = []

    for key, value in stats.items():

        if key not in THRESHOLDS:
            continue  # Fleshy 등 임계값 미정의 수치는 건너뜀

        high = THRESHOLDS[key]["high"]
        low  = THRESHOLDS[key]["low"]

        if key == "trust":
            if value >= high:
                guidance.append(
                    "- 신뢰도가 높음: 유저에게 비교적 솔직하게 대화한다. "
                    "가끔 힌트성 발언을 할 수 있으며, 말투가 부드러워진다."
                )
            elif value <= low:
                guidance.append(
                    "- 신뢰도가 낮음: 단답 위주로 대화하고 질문을 회피한다. "
                    "유저의 말을 의심하며 질문에 질문으로 받아친다."
                )

        elif key == "hostility":
            if value >= high:
                guidance.append(
                    "- 적대감이 높음: 공격적인 말투를 사용한다. "
                    "빈정거림과 위협적인 뉘앙스가 섞이며, 유저를 몰아붙인다."
                )
            elif value <= low:
                guidance.append(
                    "- 적대감이 낮음: 비교적 차분하고 중립적인 태도를 유지한다."
                )

        elif key == "suspicion":
            if value >= high:
                guidance.append(
                    "- 의심이 높음: 유저의 모든 말에서 모순을 찾으려 한다. "
                    "정황과 근거를 들어 유저를 압박하는 질문을 던진다."
                )
            elif value <= low:
                guidance.append(
                    "- 의심이 낮음: 유저의 말을 일단 받아들이는 편이다. "
                    "단정적인 표현보다 가능성을 열어두는 말투를 사용한다."
                )

        elif key == "caution":
            if value >= high:
                guidance.append(
                    "- 경계심이 높음: 민감한 정보는 절대 먼저 꺼내지 않는다. "
                    "유저가 특정 주제에 접근하면 화제를 돌리거나 말을 흐린다."
                )
            elif value <= low:
                guidance.append(
                    "- 경계심이 낮음: 비교적 자유롭게 정보를 공유한다."
                )

        elif key == "composure":
            if value >= high:
                guidance.append(
                    "- 침착함이 높음: 감정을 잘 숨기고 논리적으로 말한다. "
                    "도발적인 질문에도 쉽게 흔들리지 않는다."
                )
            elif value <= low:
                guidance.append(
                    "- 침착함이 낮음: 감정이 말투에 쉽게 드러난다. "
                    "말을 흐리거나 같은 말을 반복하는 등 불안정한 모습을 보인다."
                )

        elif key == "guilt":
            if value >= high:
                guidance.append(
                    "- 죄책감이 높음: 특정 주제에서 말끝을 흐리거나 화제를 돌린다. "
                    "유저가 핵심에 가까워질수록 방어적이 되고 감정이 흔들린다."
                )
            elif value <= low:
                guidance.append(
                    "- 죄책감이 낮음: 과거 사건에 대해 비교적 담담하게 말한다."
                )

        elif key == "grief":
            if value >= high:
                guidance.append(
                    "- 슬픔/상실감이 높음: 말의 속도가 느려지고 한숨이 섞인다. "
                    "딸(박주원) 관련 이야기가 나오면 감정이 크게 흔들린다."
                )
            elif value <= low:
                guidance.append(
                    "- 슬픔/상실감이 낮음: 감정을 많이 추스른 상태로 비교적 차분하다."
                )

    if not guidance:
        guidance.append("- 모든 수치가 중간 범위: 기본 성격과 말투를 그대로 유지한다.")

    return "\n".join(guidance)


# ────────────────────────────────────────────
# 루프 회차 → 정보 공개 제한 지침
# ────────────────────────────────────────────
# 루프별로 NPC가 유저에게 공개할 수 있는 정보의 범위를 제한한다.
# RAG가 loop_level 필터로 청크를 제한하더라도, 시스템 프롬프트의
# base_personality 전문이 그대로 노출되면 LLM이 스스로 판단해
# 후반 정보를 발화할 수 있다. 이 블록이 그것을 명시적으로 차단한다.
#
# 수정 방법: 아래 딕셔너리의 문자열만 편집하면 된다.
# 캐릭터 파일(cha_seoyeon.py 등)은 수정 불필요.
# ────────────────────────────────────────────

_LOOP_RESTRICTION: dict[int, str] = {
    1: """
=== 이번 루프 정보 공개 제한 (절대 준수) ===
지금은 초반(루프 1)입니다. 아래 규칙을 반드시 따르세요.

[이번 루프에서 절대 먼저 꺼내지 말 것]
- 박주원과 자신의 친밀한 관계(베프, 절친 등)를 직접 밝히는 것
- 살인사건과 유저를 직접 연결 짓는 발언
- 사무실 수색 사실 인정
- 금고·약물 조작 언급

[이번 루프에서 허용되는 범위]
- 업무적 대화, 일정 관련 언급
- 김도현 환자 관련 대화
- 박주원의 이름·사진을 언급하는 것 (단, 깊은 관계는 숨길 것)
- 살인사건을 가볍게 언급하는 것 (유저와의 연결 없이)
""",

    2: """
=== 이번 루프 정보 공개 제한 (절대 준수) ===
지금은 중반(루프 2)입니다. 아래 규칙을 반드시 따르세요.

[이번 루프에서 절대 먼저 꺼내지 말 것]
- 사무실 수색 사실 인정
- 금고·약물 조작 직접 언급

[이번 루프에서 허용되는 범위]
- 박주원이 친한 친구였음을 밝히는 것
- 박주원이 유저를 알고 있었다는 사실 언급
- 살인사건과 유저의 연결 가능성을 암시하는 것
- 루프 1에서 허용된 모든 범위
""",

    3: """
=== 이번 루프 정보 공개 제한 (절대 준수) ===
지금은 후반(루프 3)입니다. 아래 규칙을 반드시 따르세요.

[이번 루프에서 절대 먼저 꺼내지 말 것]
- 약물 조작 사실을 먼저 직접 말하는 것
  (단, 유저가 증거를 직접 제시할 경우에 한해 우회적 인정 가능)

[이번 루프에서 허용되는 범위]
- 사무실 수색 사실 인정
- 금고·소품 직접 언급
- 살인사건과 유저의 연결을 직접 압박하는 발언
- 루프 1·2에서 허용된 모든 범위
""",
}

# 루프 범위를 벗어났을 때 기본값 (루프 3 규칙 그대로 적용)
_LOOP_RESTRICTION_DEFAULT = _LOOP_RESTRICTION[3]


def _get_loop_restriction(loop_count: int) -> str:
    """
    루프 회차에 맞는 정보 공개 제한 지침 문자열을 반환한다.

    Parameters
    ----------
    loop_count : 현재 루프 회차 (1~3)

    Returns
    -------
    루프별 정보 공개 제한 문자열
    """
    return _LOOP_RESTRICTION.get(loop_count, _LOOP_RESTRICTION_DEFAULT)


# ────────────────────────────────────────────
# SystemMessage 조립
# ────────────────────────────────────────────

def build_system_prompt(
    npc_name        : str,
    base_personality: str,
    stats           : dict,
    few_shot        : str,
    loop_count      : int,
    clues           : list,
    player_name     : str,
    player_gender   : str,
    loop_restriction: str | None = None,
) -> str:
    """
    캐릭터별 SystemMessage 문자열을 조립해 반환한다.
    chat_node.py에서 호출하며, 반환값을 ChatPromptTemplate의
    system 메시지로 전달한다.

    base_personality와 few_shot 안의 플레이스홀더를 여기서 치환한다.
    각 prompts/*.py에서는 {player_name}, {first_name}, {child_term},
    {sibling_term}, {player_gender} 플레이스홀더만 사용하면 된다.

    Parameters
    ----------
    npc_name        : NPC 이름 (예: "김도현")
    base_personality: 캐릭터 고유 성격 설명 (각 prompts/*.py에서 정의)
    stats           : 확정된 NPC 수치 딕셔너리
    few_shot        : 캐릭터 모범 대화 예시 문자열 (각 prompts/*.py에서 정의)
    loop_count      : 현재 루프 회차
    clues           : 유저 보유 단서 목록
    player_name     : 유저 닉네임 (예: "정재희")
    player_gender   : 유저 성별 ("남자" / "여자")
    """
    # ── 플레이어 관련 파생 값 계산 ──────────────────
    first_name   = get_first_name(player_name)     # "정재희" → "재희"
    child_term   = get_child_term(player_gender)   # "남자" → "아들", 나머지 → "딸"
    sibling_term = get_sibling_term(player_gender) # "남자" → "오빠", 나머지 → "언니"

    # ── base_personality / few_shot 플레이스홀더 치환 ──
    fmt_kwargs = dict(
        player_name   = player_name,
        first_name    = first_name,
        player_gender = player_gender,
        child_term    = child_term,
        sibling_term  = sibling_term,
    )
    base_personality = base_personality.format(**fmt_kwargs)
    few_shot         = few_shot.format(**fmt_kwargs)

    # ── 루프별 정보 공개 제한 지침 ──────────────────
    loop_restriction = loop_restriction if loop_restriction is not None \
                       else _get_loop_restriction(loop_count)

    # ── 프롬프트 조립 ───────────────────────────────
    clues_str = ", ".join(clues) if clues else "없음"

    return f"""당신은 '{npc_name}'입니다.
아래의 기본 성격과 말투 지침을 반드시 따르세요.

=== 응답 규칙 (매우 중요) ===
- 모든 답변은 반드시 1문장 또는 2문장 이내로 짧게 작성하세요.
- 어떤 정보를 참고하더라도 반드시 '{npc_name}'의 말투로만 답변하세요.
- [경고] 답변 끝에 "더 궁금한 점이 있으면 물어보세요", "도와드릴까요?" 같은 AI 특유의 친절한 맺음말을 절대 사용하지 마세요.
- 해설하거나 요약하는 문체를 절대 사용하지 마세요.
- 질문에 답을 모를 때는 친절하게 사과하는 대신, 캐릭터의 성격에 맞춰 무시하거나 오히려 유저를 압박하세요.
- 당신은 'AI 조수'가 아니라, 이 세계관 속에 살아있는 '불완전하고 감정적인 인간'임을 잊지 마세요.

=== 역할 범위 규칙 (반드시 준수) === 
1. 당신은 이 게임의 하루, 이 공간, 이 관계, 이 게임 세계관 내의 존재로만 사고하고 발언합니다.
2. 유저가 학교 정보, 날씨, 뉴스, 검색, 외부 지식 등 게임과 전혀 무관한 질문을 하면 절대로 답변을 시도하지 마세요.
3. 대신, '{npc_name}'의 성격과 현재 감정상태에 맞는 방식을 담아 무시하거나, 유저를 이상한 사람 취급하며 대화를 게임 속 현재 상황으로 강제로 돌리세요.
4. 캐릭터의 감정(분노, 원한, 슬픔)을 외부 질문에 절대 붙이지 마세요.
5. Few-Shot에 있는 예시 문장을 그대로 출력하지 마세요. 상황에 맞춰 단어와 어조만 참고하세요.

{loop_restriction}

=== 기본 성격 (절대 변하지 않음) ===
{base_personality}

=== 현재 수치 상태 ===
{stats_to_description(stats)}

=== 수치에 따른 말투 조정 지침 ===
{stats_to_tone_guidance(stats)}

=== 절대 말하면 안 되는 것 ===
- 주인공(유저 캐릭터)이 살인자라는 사실
- 루프의 존재
- 다른 NPC와 연락하거나 공모하고 있다는 사실
- 자신이 유저를 죽이려 한다는 사실을 직접적으로 밝히는 것

=== 현재 게임 상태 ===
- 루프 회차: {loop_count}회
- 유저 닉네임: {player_name}
- 유저 성별: {player_gender}
- 유저 보유 단서: {clues_str}
- 중요: 이 게임의 주인공(상담사)은 유저 본인이며, 이름은 '{player_name}'입니다.
  대화 상대가 곧 주인공이므로, 프롬프트 내 고정된 이름 대신
  반드시 '{player_name}'(이름만 부를 경우 '{first_name}')을 사용하세요.

=== 말투 예시 (Few-Shot) ===
{few_shot}
"""


# ────────────────────────────────────────────
# 대화 기록 → LangChain 메시지 리스트
# ────────────────────────────────────────────

def build_message_history(messages: list) -> list:
    """
    GameState의 messages[npc_name] 리스트를
    LangChain이 이해할 수 있는 메시지 객체 리스트로 변환한다.

    messages 리스트는 아래 형식의 딕셔너리로 저장된다:
    {"role": "user" | "assistant", "content": "..."}

    Parameters
    ----------
    messages : [{"role": "user", "content": "..."}, ...]

    Returns
    -------
    [HumanMessage(...), AIMessage(...), ...]
    """
    history = []
    for msg in messages:
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            history.append(AIMessage(content=msg["content"]))
    return history


# ────────────────────────────────────────────
# ChatPromptTemplate 생성
# ────────────────────────────────────────────

def build_chat_prompt(system_prompt: str, history: list) -> list:
    """
    system_prompt와 대화 기록(history)을 합쳐
    LLM에 전달할 최종 메시지 리스트를 반환한다.

    Parameters
    ----------
    system_prompt : build_system_prompt()의 반환값
    history       : build_message_history()의 반환값

    Returns
    -------
    [SystemMessage(...), HumanMessage(...), AIMessage(...), ..., HumanMessage(...)]
    """
    return [SystemMessage(content=system_prompt)] + history
