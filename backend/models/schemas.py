"""
FastAPI 요청/응답 데이터 모델 (Pydantic).
state.py의 실제 GameState 필드를 기반으로 작성됨.
"""
#게임 서버의 API 통신규격을 정의한 것
#클라이언트와 서버가 어떤 형식으로 데이터를 주고 받을 지 약속하는 명세서

from typing import Optional

from pydantic import BaseModel


# ────────────────────────────────────────────
# 요청 모델
# ────────────────────────────────────────────

class NewGameRequest(BaseModel):
    player_name: str
    player_gender: str  # "남" / "여" 


class RecordButtonRequest(BaseModel):
    """버튼 클릭 시마다 호출 — 마지막 버튼 ID 기록"""
    session_id: str
    button_id: int

class FinalizeRequest(BaseModel):
    """
    버튼 선택 완료(마지막 선택지 확정) 시 호출.
    context는 프론트에서 누적한 버튼 텍스트 목록.
    """
    session_id: str
    last_button_id: int
    context: list[str]


class ChatRequest(BaseModel):
    session_id: str
    npc_name: str       # "치키" | "김도현" | "차서연" | "엄마" | "박도원"
    user_input: str


class LoopResetRequest(BaseModel):
    session_id: str


class PlayerDeadRequest(BaseModel):
    session_id: str


# ────────────────────────────────────────────
# 응답 모델
# ────────────────────────────────────────────

class NewGameResponse(BaseModel):
    session_id: str


class AvailableButtonsResponse(BaseModel):
    """비활성화할 버튼 ID 목록"""
    disabled_button_ids: list[int]


class FinalizeResponse(BaseModel):
    story_id: str
    npc_stats: dict             # STORIES[story_id] — NPC별 수치 딕셔너리
    disabled_button_ids: list[int]


class ChatResponse(BaseModel):
    response: str
    image_url: Optional[str] = None  # 유사도 미달 시 None 반환
    is_dead: bool
    is_loop_reset: bool


class LoopResetResponse(BaseModel):
    loop_count: int
    is_game_over: bool          # loop_count > TOTAL_LOOPS(3) 이면 True


class ErrorResponse(BaseModel):
    detail: str
