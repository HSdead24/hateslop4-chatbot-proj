"""
유저별 GameState를 메모리(dict)에서 관리한다.
서버 재시작 시 세션은 초기화된다 (데모 환경 기준).
"""
#세션관리자 역할

import uuid
import copy
import sys
import os

# 프로젝트 루트(llm 코드)를 import 경로에 추가
# backend/ 와 llm/ 코드가 같은 레포 루트에 있다고 가정
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from state import GameState, create_initial_state
from config import DEFAULT_NPC_STATS


# ────────────────────────────────────────────
# 인메모리 세션 저장소
# ────────────────────────────────────────────
#모든 유저의 게임 상태를 딕셔너리 형태로 보관
#key : session_id, value : GameState
#메모리에만 저장 -> 서버를 껐다가 켜면 모든 데이터가 사라짐.

_sessions: dict[str, GameState] = {}


# ────────────────────────────────────────────
# 세션 CRUD
# ────────────────────────────────────────────

def create_session(player_name: str, player_gender: str) -> str:
    """
    새 게임 세션을 생성하고 session_id를 반환한다.
    GameState는 create_initial_state()로 초기화한다.
    """
    session_id = str(uuid.uuid4())
    _sessions[session_id] = create_initial_state(
        player_name=player_name,
        player_gender=player_gender,
        default_npc_stats=copy.deepcopy(DEFAULT_NPC_STATS),
    )
    return session_id


def get_state(session_id: str) -> GameState:
    """
    세션 ID로 GameState를 조회한다.
    존재하지 않으면 KeyError.
    """
    if session_id not in _sessions:
        raise KeyError(f"세션 없음: {session_id}")
    return _sessions[session_id]


def update_state(session_id: str, state: GameState) -> None:
    """GameState를 덮어쓴다."""
    _sessions[session_id] = state


def delete_session(session_id: str) -> None:
    """세션을 삭제한다."""
    _sessions.pop(session_id, None)


def session_exists(session_id: str) -> bool:
    return session_id in _sessions