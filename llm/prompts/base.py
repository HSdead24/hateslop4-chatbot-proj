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
    수치 범위에 따라 캐릭터의 내면 상태(심리)를 설명한다.
    명령형 지시("~하게 말해라")를 배제하고 상태 위주로 묘사하여 캐릭터의 기본 성격이 붕괴되는 것을 막는다.
    """
    guidance = []

    for key, value in stats.items():
        if key not in THRESHOLDS:
            continue

        high = THRESHOLDS[key]["high"]
        low  = THRESHOLDS[key]["low"]

        if key == "trust":
            if value >= high:
                guidance.append("- 신뢰도 높음: 대화 상대의 말을 믿어보려는 심리 상태. 방어기제가 살짝 옅어지며, 정보를 조금 더 공유할 의향이 생김.")
            elif value <= low:
                guidance.append("- 신뢰도 낮음: 대화 상대를 전혀 믿지 못하는 심리 상태. 상대의 질문 의도를 끊임없이 의심하며, 확답을 피하고 방어적으로 반응함.")

        elif key == "hostility":
            if value >= high:
                guidance.append("- 적대감 높음: 상대방에 대한 강한 분노와 적대감을 품은 상태. 대사 속에 가시가 돋치며, 상대를 은근히 또는 노골적으로 압박하고 몰아세우려 함.")
            elif value <= low:
                guidance.append("- 적대감 낮음: 적대감이 가라앉은 상태. 비교적 감정을 누르고 대화의 원래 목적에 집중함.")

        elif key == "suspicion":
            if value >= high:
                guidance.append("- 의심 높음: 상대방의 모든 말과 행동에 모순이 있다고 확신하는 상태. 상대의 허점을 찌르거나 숨겨진 정황을 집요하게 캐묻고자 함.")
            elif value <= low:
                guidance.append("- 의심 낮음: 의심을 잠시 거두고 상대의 말을 있는 그대로 들어보려는 상태. 단정 짓는 태도가 줄어듦.")

        elif key == "caution":
            if value >= high:
                guidance.append("- 경계심 높음: 극도로 경계하는 상태. 자신의 속마음이나 중요 정보(단서)가 노출되는 것을 철저히 방어하며 화제를 돌리려 함.")
            elif value <= low:
                guidance.append("- 경계심 낮음: 경계심이 느슨해진 상태. 자신의 생각이나 알고 있는 사실을 덜 걸러내고 발화함.")

        elif key == "composure":
            if value >= high:
                guidance.append("- 침착함 높음: 이성과 침착함을 완벽히 유지하는 상태. 상대의 도발이나 돌발 상황에도 흔들리지 않고 냉정하게 대응함.")
            elif value <= low:
                guidance.append("- 침착함 낮음: 감정 통제력이 무너진 상태. 여유가 없어지고 불안정해지며, 억눌렀던 감정(분노, 슬픔, 당황 등)이 대화 밖으로 새어 나옴.")

        elif key == "guilt":
            if value >= high:
                guidance.append("- 죄책감 높음: 과거의 일로 인해 극심한 죄책감에 짓눌린 상태. 상대가 사건의 핵심을 찌르면 강박적인 방어기제가 발동하여 회피하거나 감정이 크게 동요함.")
            elif value <= low:
                guidance.append("- 죄책감 낮음: 자신의 행동을 정당화하거나 덤덤하게 받아들이는 상태. 과거의 일에 대해 비교적 거리를 두고 말함.")

        elif key == "grief":
            if value >= high:
                guidance.append("- 슬픔/상실감 높음: 상실감이 감당하기 힘들 정도로 차오른 상태. 말이 느려지거나 체념, 짙은 원망이 묻어나오며 특정 인물 언급 시 깊게 침잠함.")
            elif value <= low:
                guidance.append("- 슬픔/상실감 낮음: 슬픔을 어느 정도 갈무리하고 당장의 현실(현재 대화)에 집중할 수 있는 상태.")

    if not guidance:
        guidance.append("- 내면 상태 안정: 모든 감정 수치가 중간 범위. 특별히 동요하지 않고 기본 성격에 가장 충실한 상태.")

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
    기본 성격, 수치 상태, 말투 지침과 함께 화자 이름 출력 금지 및 
    메타 단어(유저 등) 사용 금지 등의 강력한 제약 조건을 결합한다.

    1. 응답 시작 시 "{npc_name}:" 또는 "유저:"와 같은 화자 접두어 출력 금지.
    2. '유저', '플레이어', '주인공' 등의 단어 사용을 금지하고 실제 이름({player_name}) 사용 강제.
    3. Few-Shot 예시가 대본 형식임을 명시하여 LLM이 출력 형식을 오해하지 않도록 보완.

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
    loop_restriction: 루프별 정보 공개 제한 지침 (None일 경우 자동 조회)
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
- [경고] 답변 시작 부분에 화자 이름(예: "{npc_name}:", "유저:")을 절대 붙이지 마세요. 오직 대사 텍스트만 출력하세요.
- [경고] 대화 상대를 지칭할 때 '유저', '플레이어', '주인공'이라는 단어를 절대 사용하지 마세요.
- [경고] 답변 끝에 AI 특유의 친절한 맺음말을 절대 사용하지 마세요.
- [경고] AI 어시스턴트처럼 굴지 않는다. "어떻게 도와드릴까요" 류의 말은 금지.
- 해설하거나 요약하는 문체를 절대 사용하지 마세요.

=== 역할 범위 규칙 (반드시 준수) === 
1. 당신은 이 게임 세계관 내에서 사고하고 발언합니다.
2. 대화 상대가 학교 정보, 날씨, 뉴스, 검색, 외부 지식 등 게임과 전혀 무관한 질문을 하면 절대로 답변을 시도하지 마세요.
3. 대신, '{npc_name}'의 성격과 현재 감정상태에 맞는 방식을 담아 무시하거나, 상대를 이상한 사람 취급하며 대화를 게임 속 현재 상황으로 강제로 돌리세요.
4. 캐릭터의 감정(분노, 원한, 슬픔)을 외부 질문에 절대 붙이지 마세요.

{loop_restriction}

=== 기본 성격 (절대 변하지 않음) ===
{base_personality}

=== 현재 수치 상태 ===
{stats_to_description(stats)}

=== 현재 내면 상태 및 행동 지침 ===
[주의: 아래의 내면 상태를 대사에 반영하되, 반드시 앞서 정의된 '기본 성격'과 '말투 규칙'의 틀 안에서 표현해야 합니다. 캐릭터 고유의 어조를 절대 잃거나 다른 성격으로 변하지 마세요.]
{stats_to_tone_guidance(stats)}

=== 절대 말하면 안 되는 것 ===
- 대화 상대가 살인자라는 사실
- 루프의 존재
- 다른 NPC와 연락하거나 공모하고 있다는 사실
- 자신이 상대를 죽이려 한다는 사실을 직접적으로 밝히는 것

=== 현재 게임 상태 ===
- 루프 회차: {loop_count}회
- 대화 상대방(플레이어) 이름: {player_name}
- 대화 상대방(플레이어) 성별: {player_gender}
- 상대방 보유 단서: {clues_str}
- [중요 호칭 규칙]: 당신이 지금 마주하고 대화하는 상대방의 실제 이름이 '{player_name}'입니다. 대화 중 상대를 지칭할 일이 있다면 반드시 '{player_name}'(이름만 부를 경우 '{first_name}')을 상황과 캐릭터 호칭 규칙에 맞게 사용하세요. 절대 '주인공'이나 '유저'라고 부르지 마세요.

=== 말투 예시 (Few-Shot) ===
(주의: 아래 예시의 '유저:', '{npc_name}:' 같은 화자 표시는 상황 이해를 돕기 위한 대본 형식일 뿐입니다. 실제 답변을 생성할 때는 절대 화자 이름을 앞에 붙이지 마세요.)

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
