"""
Phase 2(챗봇 대화)의 핵심 로직을 담당하는 노드 파일.

주요 역할
---------
1. 유저 입력에서 사망 트리거 감지 (DEATH_KEYWORDS, MAX_CHAT_TURNS)
2. 현재 NPC에 맞는 캐릭터 프롬프트 로드
3. 대화 기록이 MESSAGE_SUMMARY_THRESHOLD 초과 시 LLM으로 자동 요약
4. LLM 호출 후 NPC 응답 생성
5. 대화 기록 업데이트
"""

import copy

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from state import GameState, NPC_EXECUTOR, NPC_KIM, NPC_CHA, NPC_MOM, NPC_PARK
from config import (
    LLM_MODEL_DEFAULT, LLM_MODEL_HEAVY, LLM_TEMPERATURE,
    DEATH_KEYWORDS, MAX_CHAT_TURNS, MESSAGE_SUMMARY_THRESHOLD,
    TOTAL_LOOPS,
)

from prompts.base import build_message_history, build_chat_prompt
from prompts.executor import build_executor_prompt
from prompts.kim_dohyun import build_kim_prompt

# 팀원 파일 완성 후 아래 주석 해제 + stub 함수 3개 삭제
# from prompts.cha_seoyeon import build_cha_prompt
# from prompts.umma import build_mom_prompt
# from prompts.park_dowon import build_park_prompt

def build_cha_prompt(stats, loop_count, clues, player_name, player_gender) -> str:
    raise NotImplementedError("cha_seoyeon.py 완성 후 위 주석 해제")

def build_mom_prompt(stats, loop_count, clues, player_name, player_gender) -> str:
    raise NotImplementedError("umma.py 완성 후 위 주석 해제")

def build_park_prompt(stats, loop_count, clues, player_name, player_gender) -> str:
    raise NotImplementedError("park_dowon.py 완성 후 위 주석 해제")


# ────────────────────────────────────────────
# NPC → 프롬프트 빌더 매핑
# ────────────────────────────────────────────

NPC_PROMPT_BUILDERS = {
    NPC_KIM  : build_kim_prompt,
    NPC_CHA  : build_cha_prompt,
    NPC_MOM  : build_mom_prompt,
    NPC_PARK : build_park_prompt,
}


# ────────────────────────────────────────────
# 사망 트리거 감지
# ────────────────────────────────────────────

def check_death_trigger(state: GameState, user_input: str) -> bool:
    """
    유저 입력에서 사망 트리거를 감지한다.
    아래 두 조건 중 하나라도 충족되면 True를 반환한다.

    1. DEATH_KEYWORDS 중 하나가 user_input에 포함된 경우
    2. 현재 NPC와의 대화 턴이 MAX_CHAT_TURNS 이상인 경우

    Parameters
    ----------
    state      : 현재 GameState
    user_input : 유저가 입력한 텍스트

    Returns
    -------
    True이면 사망 처리
    """
    # 키워드 감지 (유저 입력에만 적용)
    for keyword in DEATH_KEYWORDS:
        if keyword in user_input:
            return True

    # 대화 턴 수 초과 감지
    npc_name = state["current_npc"]
    if npc_name and len(state["messages"].get(npc_name, [])) >= MAX_CHAT_TURNS:
        return True

    return False


# ────────────────────────────────────────────
# 대화 기록 요약
# ────────────────────────────────────────────

def summarize_messages(messages: list, llm: ChatOpenAI) -> list:
    """
    대화 기록이 MESSAGE_SUMMARY_THRESHOLD를 초과하면
    오래된 대화를 LLM으로 요약해 토큰을 절약한다.

    요약 방식
    ---------
    - 최근 MESSAGE_SUMMARY_THRESHOLD // 2 개는 원본 유지
    - 나머지 오래된 대화를 LLM이 3문장 내외로 요약
    - 요약본을 SystemMessage로 변환해 맨 앞에 삽입

    Parameters
    ----------
    messages : 현재 대화 기록 딕셔너리 리스트
    llm      : 요약에 사용할 LLM 인스턴스

    Returns
    -------
    요약이 적용된 대화 기록 딕셔너리 리스트
    """
    if len(messages) < MESSAGE_SUMMARY_THRESHOLD:
        return messages

    keep_count  = MESSAGE_SUMMARY_THRESHOLD // 2
    old_msgs    = messages[:-keep_count]
    recent_msgs = messages[-keep_count:]

    # 오래된 대화를 텍스트로 변환
    old_text = "\n".join([
        f"{'유저' if m['role'] == 'user' else 'NPC'}: {m['content']}"
        for m in old_msgs
    ])

    # LLM으로 요약
    summary_prompt = [
        SystemMessage(content="다음 대화를 3문장 이내로 핵심만 요약해줘. 요약문만 출력해."),
        HumanMessage(content=old_text)
    ]
    summary = llm.invoke(summary_prompt).content

    # 요약본을 맨 앞 메시지로 삽입
    summary_msg = {"role": "assistant", "content": f"[이전 대화 요약] {summary}"}
    return [summary_msg] + recent_msgs


# ────────────────────────────────────────────
# LLM 모델 선택
# ────────────────────────────────────────────

def get_llm(loop_count: int) -> ChatOpenAI:
    """
    루프 회차에 따라 LLM 모델을 선택한다.
    마지막 루프(TOTAL_LOOPS)에서는 고성능 모델을 사용한다.

    Parameters
    ----------
    loop_count : 현재 루프 회차

    Returns
    -------
    ChatOpenAI 인스턴스
    """
    model = LLM_MODEL_HEAVY if loop_count >= TOTAL_LOOPS else LLM_MODEL_DEFAULT
    return ChatOpenAI(model=model, temperature=LLM_TEMPERATURE)


# ────────────────────────────────────────────
# NPC 응답 생성
# ────────────────────────────────────────────

def generate_npc_response(
    state     : GameState,
    npc_name  : str,
    user_input: str,
    llm       : ChatOpenAI,
) -> str:
    """
    현재 NPC의 프롬프트를 조립하고 LLM을 호출해 응답을 생성한다.

    Parameters
    ----------
    state      : 현재 GameState
    npc_name   : 응답할 NPC 이름
    user_input : 유저 입력 텍스트
    llm        : LLM 인스턴스

    Returns
    -------
    NPC 응답 텍스트
    """
    stats        = state["npc_stats"].get(npc_name, {})
    loop_count   = state["loop_count"]
    clues        = state["clues"]
    player_name  = state["player_name"]
    player_gender= state["player_gender"]

    # 집행자(치키)는 별도 프롬프트 빌더 사용
    if npc_name == NPC_EXECUTOR:
        system_prompt = build_executor_prompt(
            loop_count    = loop_count,
            clues         = clues,
            player_name   = player_name,
            player_gender = player_gender,
        )
    else:
        builder = NPC_PROMPT_BUILDERS.get(npc_name)
        if builder is None:
            raise ValueError(f"알 수 없는 NPC: {npc_name}")
        system_prompt = builder(
            stats         = stats,
            loop_count    = loop_count,
            clues         = clues,
            player_name   = player_name,
            player_gender = player_gender,
        )

    # 대화 기록 요약 처리
    current_messages = state["messages"].get(npc_name, [])
    summarized       = summarize_messages(current_messages, llm)

    # 유저 입력을 대화 기록에 추가
    summarized_with_input = summarized + [{"role": "user", "content": user_input}]

    # LangChain 메시지 형식으로 변환
    history  = build_message_history(summarized_with_input)
    messages = build_chat_prompt(system_prompt, history)

    # LLM 호출
    response = llm.invoke(messages).content
    return response


# ────────────────────────────────────────────
# 대화 기록 업데이트
# ────────────────────────────────────────────

def update_messages(
    state     : GameState,
    npc_name  : str,
    user_input: str,
    response  : str,
) -> dict:
    """
    유저 입력과 NPC 응답을 대화 기록에 추가한다.

    Parameters
    ----------
    state      : 현재 GameState
    npc_name   : 대화한 NPC 이름
    user_input : 유저 입력 텍스트
    response   : NPC 응답 텍스트

    Returns
    -------
    업데이트된 messages 딕셔너리
    """
    updated_messages = copy.deepcopy(state["messages"])
    if npc_name not in updated_messages:
        updated_messages[npc_name] = []

    updated_messages[npc_name].append({"role": "user",      "content": user_input})
    updated_messages[npc_name].append({"role": "assistant", "content": response})
    return updated_messages


# ────────────────────────────────────────────
# LangGraph 노드 함수
# ────────────────────────────────────────────

def chat_node(state: GameState, user_input: str) -> tuple[GameState, str]:
    """
    LangGraph에서 chat_phase 노드로 등록되는 함수.
    유저 입력을 받아 NPC 응답을 생성하고 GameState를 업데이트한다.

    runner.py에서 current_npc와 user_input을 설정한 뒤 호출한다.

    Parameters
    ----------
    state      : 현재 GameState
    user_input : 유저가 입력한 텍스트

    Returns
    -------
    (업데이트된 GameState, NPC 응답 텍스트)
    """
    npc_name = state["current_npc"]

    if not npc_name:
        raise ValueError("current_npc가 설정되지 않았습니다. runner.py에서 설정 후 호출하세요.")

    # 1. 사망 트리거 감지
    is_dead = check_death_trigger(state, user_input)

    # 2. LLM 선택
    llm = get_llm(state["loop_count"])

    # 3. NPC 응답 생성 (사망 여부와 무관하게 마지막 응답은 생성)
    response = generate_npc_response(state, npc_name, user_input, llm)

    # 4. 대화 기록 업데이트
    updated_messages = update_messages(state, npc_name, user_input, response)

    # 5. GameState 업데이트
    updated_state = dict(state)
    updated_state["messages"] = updated_messages
    updated_state["is_dead"]  = is_dead

    return GameState(**updated_state), response