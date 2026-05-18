"""
게임 흐름 엔드포인트.

POST /new-game    ← 게임 시작
POST /finalize    ← 버튼 선택 완료 → 스토리/수치 확정
POST /new-loop    ← 루프 리셋
POST /player-dead ← 타이머 만료 사망
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../llm")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../llm/nodes")))

from fastapi import APIRouter, HTTPException

from models.schemas import (
    NewGameRequest, NewGameResponse,
    FinalizeRequest, FinalizeResponse,
    LoopResetRequest, LoopResetResponse,
    PlayerDeadRequest,
)
from session.manager import create_session, get_state, update_state

from button_node import record_button, get_story, finalize_stats
from state import TOTAL_LOOPS

import copy
from stories import STORIES


router = APIRouter(tags=["game"])


# ────────────────────────────────────────────
# 게임 시작
# ────────────────────────────────────────────

@router.post("/new-game", response_model=NewGameResponse)
def new_game(req: NewGameRequest):
    """
    새 게임을 시작한다.
    player_name, player_gender를 받아 GameState를 초기화하고 session_id를 반환.
    """
    session_id = create_session(
        player_name=req.player_name,
        player_gender=req.player_gender,
    )
    return NewGameResponse(session_id=session_id)


# ────────────────────────────────────────────
# 버튼 선택 완료 → 스토리/수치 확정
# ────────────────────────────────────────────

@router.post("/finalize", response_model=FinalizeResponse)
def finalize(req: FinalizeRequest):
    """
    마지막 버튼 선택 완료 시 호출.
    1. last_button_id를 button_history에 기록
    2. context(버튼 텍스트 목록)를 state에 저장
    3. 버튼 ID로 STORIES에서 직접 npc_stats 확정 + phase → PHASE_CHAT 전환
    """
    try:
        state = get_state(req.session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    # 마지막 버튼 ID 기록
    state = record_button(state, req.last_button_id)

    # context 저장 (프론트에서 조합한 버튼 텍스트 목록)
    updated_state = dict(state)
    updated_state["context"] = req.context
    from state import GameState
    state = GameState(**updated_state)

    # 스토리/수치 확정 + phase 전환
    state = finalize_stats(state)

    update_state(req.session_id, state)

    story_id = state["current_story"]
    npc_stats = copy.deepcopy(STORIES.get(story_id, {}))

    return FinalizeResponse(
        story_id=story_id,
        npc_stats=npc_stats,
    )


# ────────────────────────────────────────────
# 루프 리셋
# ────────────────────────────────────────────

@router.post("/new-loop", response_model=LoopResetResponse)
def new_loop(req: LoopResetRequest):
    """
    루프를 리셋한다.
    loop_count 증가 + context/button_history/first_button/is_dead 초기화.
    loop_count > TOTAL_LOOPS(3)이면 is_game_over=True.
    """
    try:
        state = get_state(req.session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    # loop_node에서 리셋 로직 처리
    from loop_node import loop_reset_node
    state = loop_reset_node(state)
    update_state(req.session_id, state)

    is_game_over = state["loop_count"] > TOTAL_LOOPS
    return LoopResetResponse(
        loop_count=state["loop_count"],
        is_game_over=is_game_over,
    )


# ────────────────────────────────────────────
# 타이머 만료 사망
# ────────────────────────────────────────────

@router.post("/player-dead", response_model=LoopResetResponse)
def player_dead(req: PlayerDeadRequest):
    """
    타이머 만료로 사망 처리.
    내부적으로 is_dead=True 설정 후 /new-loop 와 동일하게 처리.
    """
    try:
        state = get_state(req.session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    # is_dead 플래그 설정
    updated_state = dict(state)
    updated_state["is_dead"] = True
    from state import GameState
    state = GameState(**updated_state)
    update_state(req.session_id, state)

    # 루프 리셋과 동일하게 처리
    return new_loop(LoopResetRequest(session_id=req.session_id))
