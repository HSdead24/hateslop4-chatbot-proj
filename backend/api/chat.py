"""
채팅 엔드포인트.

POST /chat  ← NPC와 대화. (GameState, response, image_url) 반환.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from fastapi import APIRouter, HTTPException

from models.schemas import ChatRequest, ChatResponse
from session.manager import get_state, update_state

from chat_node import chat_node
from state import GameState, NPC_EXECUTOR, NPC_KIM, NPC_CHA, NPC_MOM, NPC_PARK

VALID_NPC_NAMES = {NPC_EXECUTOR, NPC_KIM, NPC_CHA, NPC_MOM, NPC_PARK}

router = APIRouter(tags=["chat"])


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