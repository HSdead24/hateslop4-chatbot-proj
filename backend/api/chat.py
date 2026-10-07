"""
채팅 엔드포인트.

POST /chat          ← NPC와 대화. (GameState, response, image_url) 반환.
POST /chat/opening  ← 채팅방 입장 시 NPC가 먼저 건네는 첫 메시지 생성 ('오늘의 상황' 기반).
"""

import copy
import sys
import os
import threading
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../llm")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../llm/nodes")))

from fastapi import APIRouter, HTTPException

from models.schemas import ChatRequest, ChatResponse, ChatOpeningRequest, ChatOpeningResponse
from session.manager import get_state, update_state

from chat_node import chat_node, generate_opening
from state import GameState, NPC_EXECUTOR, NPC_KIM, NPC_CHA, NPC_MOM, NPC_PARK

VALID_NPC_NAMES = {NPC_EXECUTOR, NPC_KIM, NPC_CHA, NPC_MOM, NPC_PARK}

router = APIRouter(tags=["chat"])

# 두 NPC의 첫 메시지를 동시에 요청해도 서로의 저장을 덮어쓰지 않도록,
# 저장 직전에 최신 세션 상태를 다시 읽어 합칠 때 사용하는 잠금
_opening_lock = threading.Lock()


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    NPC와 한 턴 대화한다.

    1. session_id로 GameState 조회
    2. current_npc를 req.npc_name으로 설정
    3. chat_node(state, user_input) 호출
       → (updated_state, response, image_url) 반환
    4. is_dead / is_loop_reset 상태를 그대로 프론트에 전달
       (실제 루프 리셋은 프론트가 /new-loop 또는 /player-dead 호출)
    """
    try:
        state = get_state(req.session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    if req.npc_name not in VALID_NPC_NAMES:
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 NPC 이름: {req.npc_name}. "
                   f"허용값: {sorted(VALID_NPC_NAMES)}"
        )

    # current_npc 설정
    updated_state = dict(state)
    updated_state["current_npc"] = req.npc_name
    state = GameState(**updated_state)

    # chat_node 호출 — (GameState, str, str | None)
    try:
        updated_state, response, image_url = chat_node(
            state=state,
            user_input=req.user_input,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM 호출 오류: {str(e)}")

    update_state(req.session_id, updated_state)

    return ChatResponse(
        response=response,
        image_url=image_url,
        is_dead=updated_state["is_dead"],
        is_loop_reset=updated_state["is_loop_reset"],
    )


@router.post("/chat/opening", response_model=ChatOpeningResponse)
def chat_opening(req: ChatOpeningRequest):
    """
    채팅방 입장 시 NPC의 첫 메시지를 생성해 대화 기록에 저장한다.

    - 버튼룸에서 정해진 '오늘의 상황'(current_story, context)을 바탕으로 만든다.
    - 이미 이 NPC와의 대화 기록이 있으면 새로 만들지 않고 첫 NPC 발화를 돌려준다.
    - 첫 메시지는 플레이어 대화 개수(20회)에 포함되지 않는다.
    """
    try:
        state = get_state(req.session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    if req.npc_name not in VALID_NPC_NAMES or req.npc_name == NPC_EXECUTOR:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 NPC 이름: {req.npc_name}")

    try:
        generated_state, response, image_url = generate_opening(state, req.npc_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM 호출 오류: {str(e)}")

    # 새로 만든 경우에만 저장. 생성하는 동안 다른 요청이 세션을 바꿨을 수 있으므로
    # 최신 상태를 다시 읽어, 이 NPC의 기록이 아직 비어 있을 때만 첫 메시지를 넣는다.
    if generated_state is not state:
        with _opening_lock:
            latest = get_state(req.session_id)
            messages = copy.deepcopy(latest["messages"])
            if not messages.get(req.npc_name):
                messages[req.npc_name] = [{"role": "assistant", "content": response}]
                merged = dict(latest)
                merged["messages"] = messages
                update_state(req.session_id, GameState(**merged))

    return ChatOpeningResponse(response=response, image_url=image_url)
