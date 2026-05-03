"""
모든 캐릭터 프롬프트가 공통으로 사용하는 유틸 함수 모음 파일.

주요 역할
- 수치 딕셔너리 → 자연어 설명 변환 (stats_to_description)
- 수치 범위 → 말투 지침 생성 (stats_to_tone_guidance)
- 캐릭터 SystemMessage 조립 (build_system_prompt)
- 대화 기록 → LangChain 메시지 리스트 변환 (build_message_history)

새로운 수치 항목이 추가될 경우 stats_to_tone_guidance()에
해당 항목의 분기 로직만 추가하면 된다.
"""

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from config import HIGH_THRESHOLD, LOW_THRESHOLD


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

    - HIGH_THRESHOLD(70) 이상 → 해당 수치가 "높음"
    - LOW_THRESHOLD(30) 이하  → 해당 수치가 "낮음"
    - 그 사이                 → 기본 성격 유지

    새로운 수치 항목 추가 시 이 함수에 elif 블록만 추가하면 된다.

    Parameters
    ----------
    stats : {"trust": 20, "hostility": 70, ...}

    Returns
    -------
    말투 지침 문자열
    """
    guidance = []

    for key, value in stats.items():

        if key == "trust":
            if value >= HIGH_THRESHOLD:
                guidance.append(
                    "- 신뢰도가 높음: 유저에게 비교적 솔직하게 대화한다. "
                    "가끔 힌트성 발언을 할 수 있으며, 말투가 부드러워진다."
                )
            elif value <= LOW_THRESHOLD:
                guidance.append(
                    "- 신뢰도가 낮음: 단답 위주로 대화하고 질문을 회피한다. "
                    "유저의 말을 의심하며 질문에 질문으로 받아친다."
                )

        elif key == "hostility":
            if value >= HIGH_THRESHOLD:
                guidance.append(
                    "- 적대감이 높음: 공격적인 말투를 사용한다. "
                    "빈정거림과 위협적인 뉘앙스가 섞이며, 유저를 몰아붙인다."
                )
            elif value <= LOW_THRESHOLD:
                guidance.append(
                    "- 적대감이 낮음: 비교적 차분하고 중립적인 태도를 유지한다."
                )

        elif key == "suspicion":
            if value >= HIGH_THRESHOLD:
                guidance.append(
                    "- 의심이 높음: 유저의 모든 말에서 모순을 찾으려 한다. "
                    "정황과 근거를 들어 유저를 압박하는 질문을 던진다."
                )
            elif value <= LOW_THRESHOLD:
                guidance.append(
                    "- 의심이 낮음: 유저의 말을 일단 받아들이는 편이다. "
                    "단정적인 표현보다 가능성을 열어두는 말투를 사용한다."
                )

        elif key == "caution":
            if value >= HIGH_THRESHOLD:
                guidance.append(
                    "- 경계심이 높음: 민감한 정보는 절대 먼저 꺼내지 않는다. "
                    "유저가 특정 주제에 접근하면 화제를 돌리거나 말을 흐린다."
                )
            elif value <= LOW_THRESHOLD:
                guidance.append(
                    "- 경계심이 낮음: 비교적 자유롭게 정보를 공유한다."
                )

        elif key == "composure":
            if value >= HIGH_THRESHOLD:
                guidance.append(
                    "- 침착함이 높음: 감정을 잘 숨기고 논리적으로 말한다. "
                    "도발적인 질문에도 쉽게 흔들리지 않는다."
                )
            elif value <= LOW_THRESHOLD:
                guidance.append(
                    "- 침착함이 낮음: 감정이 말투에 쉽게 드러난다. "
                    "말을 흐리거나 같은 말을 반복하는 등 불안정한 모습을 보인다."
                )

        elif key == "guilt":
            if value >= HIGH_THRESHOLD:
                guidance.append(
                    "- 죄책감이 높음: 특정 주제에서 말끝을 흐리거나 화제를 돌린다. "
                    "유저가 핵심에 가까워질수록 방어적이 되고 감정이 흔들린다."
                )
            elif value <= LOW_THRESHOLD:
                guidance.append(
                    "- 죄책감이 낮음: 과거 사건에 대해 비교적 담담하게 말한다."
                )

        elif key == "grief":
            if value >= HIGH_THRESHOLD:
                guidance.append(
                    "- 슬픔/상실감이 높음: 말의 속도가 느려지고 한숨이 섞인다. "
                    "딸(박주원) 관련 이야기가 나오면 감정이 크게 흔들린다."
                )
            elif value <= LOW_THRESHOLD:
                guidance.append(
                    "- 슬픔/상실감이 낮음: 감정을 많이 추스른 상태로 비교적 차분하다."
                )

    if not guidance:
        guidance.append("- 모든 수치가 중간 범위: 기본 성격과 말투를 그대로 유지한다.")

    return "\n".join(guidance)


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
    first_name   = get_first_name(player_name)    # "정재희" → "재희"
    child_term   = get_child_term(player_gender)  # "남자" → "아들", 나머지 → "딸"
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

    # ── 프롬프트 조립 ───────────────────────────────
    clues_str = ", ".join(clues) if clues else "없음"

    return f"""당신은 '{npc_name}'입니다.
아래의 기본 성격과 말투 지침을 반드시 따르세요.

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