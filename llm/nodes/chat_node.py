"""
Phase 2(챗봇 대화)의 핵심 로직을 담당하는 노드 파일.

주요 역할
---------
1. 유저 입력에서 사망 트리거 감지 (DEATH_TRIGGERS, MAX_CHAT_TURNS)
2. 현재 NPC에 맞는 캐릭터 프롬프트 로드
3. 대화 기록이 MESSAGE_SUMMARY_THRESHOLD 초과 시 LLM으로 자동 요약
4. LLM 호출 후 NPC 응답 생성
5. 대화 기록 업데이트
"""

import copy

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from state import GameState, NPC_EXECUTOR, NPC_KIM, NPC_CHA, NPC_MOM, NPC_PARK, TOTAL_LOOPS
from config import (
    LLM_MODEL_DEFAULT, LLM_MODEL_HEAVY, LLM_TEMPERATURE, LLM_MAX_TOKENS,
    MAX_CHAT_TURNS
)
from death_triggers import check_death_trigger, check_chiki_loop_reset

from prompts.base import build_message_history, build_chat_prompt
from prompts.executor import build_executor_prompt
from prompts.kim_dohyun import build_kim_prompt
from prompts.cha_seoyeon import build_cha_prompt
from prompts.umma import build_umma_prompt
from prompts.park_dowon import build_park_prompt

from vector_store.rag_inject import build_rag_block, inject_rag_into_system
from vector_store.image_retriever import retrieve_image

# ────────────────────────────────────────────
# NPC → 프롬프트 빌더 매핑
# ────────────────────────────────────────────

NPC_PROMPT_BUILDERS = {
    NPC_KIM  : build_kim_prompt,
    NPC_CHA  : build_cha_prompt,
    NPC_MOM  : build_umma_prompt,
    NPC_PARK : build_park_prompt,
}

# RAG 컨텍스트 캐시 — 동일 NPC × 루프 × 입력 앞 20자 조합 재사용
# 프로세스 재시작 시 초기화되므로 영속성 불필요
_rag_cache: dict = {}


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
    return ChatOpenAI(model=model, temperature=LLM_TEMPERATURE, max_tokens=LLM_MAX_TOKENS)


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
    stats         = state["npc_stats"].get(npc_name, {})
    loop_count    = state["loop_count"]
    clues         = state["clues"]
    player_name   = state["player_name"]
    player_gender = state["player_gender"]

    # 1. RAG 먼저 실행 — 캐시 확인 후 없으면 검색
    _cache_key = f"{npc_name}_{loop_count}_{user_input[:20]}"
    if _cache_key in _rag_cache:
        rag_block = _rag_cache[_cache_key]
    else:
        rag_block = build_rag_block(
            user_input   = user_input,
            loop         = loop_count,
            first_button = state["first_button"],
            character    = npc_name,
        )
        _rag_cache[_cache_key] = rag_block

    # 2. 프롬프트 빌드
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

    # 3. RAG 주입
    system_prompt = inject_rag_into_system(system_prompt, rag_block)

    # 요약(Summary) 로직 완전 삭제, 원본 그대로 사용
    current_messages = state["messages"].get(npc_name, [])

    # 유저 입력을 원본 대화 기록 전체에 바로 추가
    messages_with_input = current_messages + [{"role": "user", "content": user_input}]

    # 5. LangChain 메시지 형식으로 변환
    history  = build_message_history(messages_with_input)
    messages = build_chat_prompt(system_prompt, history)

    # 6. LLM 호출
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

def chat_node(state: GameState, user_input: str) -> tuple[GameState, str, str]:
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
    (업데이트된 GameState, NPC 응답 텍스트, 이미지 URL 또는 None)
    """
    npc_name = state["current_npc"]

    if not npc_name:
        raise ValueError("current_npc가 설정되지 않았습니다. runner.py에서 설정 후 호출하세요.")

    # 1. 사망 트리거 감지
    is_dead = check_death_trigger(npc_name, user_input)

    # 치키 + __ALL__ 트리거 → 사망 아닌 루프 강제 리셋
    is_loop_reset = False
    if is_dead and npc_name == NPC_EXECUTOR:
        is_dead       = False
        is_loop_reset = True

    # 대화 턴 수 초과 감지
    if len(state["messages"].get(npc_name, [])) >= MAX_CHAT_TURNS:
        is_dead = True

    # 2. LLM 선택
    llm = get_llm(state["loop_count"])

    # 3. NPC 응답 생성 (사망 여부와 무관하게 마지막 응답은 생성)
    response = generate_npc_response(state, npc_name, user_input, llm)

    # 4. 대화 기록 업데이트
    updated_messages = update_messages(state, npc_name, user_input, response)

    # 5. GameState 업데이트
    updated_state = dict(state)
    updated_state["messages"]      = updated_messages
    updated_state["is_dead"]       = is_dead
    updated_state["is_loop_reset"] = is_loop_reset

    # 6. 이미지 검색
    image_url = retrieve_image(response, character=npc_name)

    return GameState(**updated_state), response, image_url