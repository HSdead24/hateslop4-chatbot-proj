"""
백엔드(backend/)가 LLM 기능을 호출할 때 사용하는 진입점 파일.
백엔드는 이 파일의 함수만 호출하면 되며,
LangGraph 내부 구조를 알 필요가 없도록 인터페이스를 단순하게 유지한다.

제공 함수
---------
- new_game()                  : 새 게임 시작 (GameState 초기화)
- get_available_buttons()     : 선택 가능한 버튼 목록 반환
- select_button()             : 버튼 선택 처리
- finalize_button_selection() : 버튼 선택 완료 → Phase 2 전환
- run_chat()                  : NPC와 대화
- set_player_dead()           : 타이머 만료 시 사망 처리
- start_phase2_directly()     : Phase 1 없이 Phase 2 직접 진입 (테스트용)
"""

import copy

from state import GameState, PHASE_CHAT, NPC_LIST
from config import DEFAULT_NPC_STATS
from stories import STORIES
from graph import game_graph
from nodes.button_node import record_button, finalize_stats, get_disabled_buttons as _get_available_buttons
from nodes.router import route_after_chat, ROUTE_RESET, ROUTE_END
from langgraph.graph import END


# ────────────────────────────────────────────
# 게임 시작
# ────────────────────────────────────────────

def new_game(player_name: str, player_gender: str) -> GameState:
    """
    새 게임을 시작한다.
    GameState를 초기화하고 반환한다.

    Parameters
    ----------
    player_name   : 유저 닉네임
    player_gender : 유저 성별 ("남" / "여" / "무관")

    Returns
    -------
    초기화된 GameState
    """
    from state import create_initial_state
    return create_initial_state(
        player_name       = player_name,
        player_gender     = player_gender,
        default_npc_stats = copy.deepcopy(DEFAULT_NPC_STATS),
    )


# ────────────────────────────────────────────
# Phase 1 — 버튼 선택
# ────────────────────────────────────────────

def get_available_buttons(state: GameState, all_buttons: list) -> list:
    """
    현재 선택 가능한 버튼 목록을 반환한다.
    이전 루프와 동일한 버튼 조합이 되는 버튼은 제외된다.
    프론트엔드에서 버튼을 렌더링하기 전에 호출한다.

    Parameters
    ----------
    state       : 현재 GameState
    all_buttons : 전체 버튼 목록 (예: ["A", "B", "C", "D"])

    Returns
    -------
    선택 가능한 버튼 목록
    """
    return _get_available_buttons(state, all_buttons)


def select_button(state: GameState, button: str) -> GameState:
    """
    유저가 버튼을 클릭할 때 호출된다.
    button_history에 선택을 기록하고 업데이트된 GameState를 반환한다.

    Parameters
    ----------
    state  : 현재 GameState
    button : 선택한 버튼 ID (예: "A")

    Returns
    -------
    업데이트된 GameState
    """
    return record_button(state, button)


def finalize_button_selection(state: GameState) -> GameState:
    """
    버튼 선택이 완료됐을 때 호출된다.
    스토리를 확정하고 npc_stats를 덮어쓴 뒤 Phase 2로 전환한다.

    Returns
    -------
    스토리와 수치가 확정된 GameState (phase = PHASE_CHAT)
    """
    return finalize_stats(state)


# ────────────────────────────────────────────
# Phase 2 — 챗봇 대화
# ────────────────────────────────────────────

def run_chat(
    state     : GameState,
    npc_name  : str,
    user_input: str,
) -> tuple[GameState, str, str | None, str]:
    """
    유저가 NPC에게 메시지를 보낼 때 호출된다.
    LangGraph를 통해 NPC 응답을 생성하고 업데이트된 GameState를 반환한다.

    사망 트리거가 감지되면 GameState의 is_dead가 True로 설정된다.
    루프 리셋 또는 게임 종료 여부는 반환된 game_status로 확인한다.

    Parameters
    ----------
    state      : 현재 GameState
    npc_name   : 대화할 NPC 이름 (state.NPC_KIM 등 상수 사용 권장)
    user_input : 유저가 입력한 텍스트

    Returns
    -------
    (업데이트된 GameState, NPC 응답 텍스트, image_url, game_status)

    image_url
    ---------
    유사 이미지가 있으면 URL 문자열, 없으면 None

    game_status
    -----------
    "continue"   : 정상 대화 진행
    "loop_reset" : 사망 → 루프 리셋 필요 (프론트에서 루프 리셋 연출 후 new_loop() 호출)
    "game_over"  : 게임 종료 (3루프 사망)
    """
    # current_npc와 user_input을 state에 임시 주입
    injected = dict(state)
    injected["current_npc"]    = npc_name
    injected["_user_input"]    = user_input
    injected["_last_response"] = ""
    injected["_image_url"]     = None

    # LangGraph 실행 (chat_phase 노드 1회 실행)
    result = game_graph.invoke(GameState(**injected))

    # 임시 필드 제거
    response  = result.pop("_last_response", "")
    image_url = result.pop("_image_url", None)
    result.pop("_user_input", None)

    updated_state = GameState(**result)

    # game_status 판단
    status = route_after_chat(updated_state)
    if status == END:
        game_status = "game_over"
    elif status == ROUTE_RESET:
        game_status = "loop_reset"
    else:
        game_status = "continue"

    return updated_state, response, image_url, game_status


# ────────────────────────────────────────────
# 타이머 만료 사망 처리
# ────────────────────────────────────────────

def set_player_dead(state: GameState) -> tuple[GameState, str]:
    """
    프론트엔드 타이머가 만료됐을 때 호출된다.
    is_dead를 True로 설정하고 game_status를 반환한다.

    Returns
    -------
    (업데이트된 GameState, game_status)
    game_status: "loop_reset" 또는 "game_over"
    """
    updated = dict(state)
    updated["is_dead"] = True
    updated_state = GameState(**updated)

    status = route_after_chat(updated_state)
    game_status = "game_over" if status == END else "loop_reset"

    return updated_state, game_status


# ────────────────────────────────────────────
# 루프 리셋
# ────────────────────────────────────────────

def new_loop(state: GameState) -> GameState:
    """
    루프 리셋 연출이 끝난 뒤 호출된다.
    loop_node.py의 loop_reset_node()를 실행해
    다음 루프를 위한 GameState를 반환한다.

    Returns
    -------
    초기화된 GameState (loop_count +1, phase = PHASE_BUTTON)
    """
    from nodes.loop_node import loop_reset_node
    return loop_reset_node(state)


# ────────────────────────────────────────────
# 테스트용 — Phase 2 직접 진입
# ────────────────────────────────────────────

def start_phase2_directly(
    player_name  : str,
    player_gender: str,
    story_id     : str = "story_A",
) -> GameState:
    """
    Phase 1 없이 바로 Phase 2로 진입하는 테스트용 함수.
    프론트엔드 팀원이 Phase 1 완성 전에 채팅 UI를 테스트할 때 사용한다.
    프로듀서에게 스토리 확정 전까지 임시로 사용하며,
    Phase 1 구현 완료 후 이 함수는 제거한다.

    Parameters
    ----------
    player_name   : 유저 닉네임
    player_gender : 유저 성별
    story_id      : 테스트할 스토리 ID (기본값: "story_A")

    Returns
    -------
    Phase 2 진입 상태의 GameState
    """
    from state import create_initial_state
    state = create_initial_state(
        player_name       = player_name,
        player_gender     = player_gender,
        default_npc_stats = copy.deepcopy(DEFAULT_NPC_STATS),
    )

    # 스토리 수치 직접 적용
    updated = dict(state)
    updated["current_story"] = story_id
    updated["used_stories"]  = [story_id]
    updated["npc_stats"]     = copy.deepcopy(STORIES.get(story_id, DEFAULT_NPC_STATS))
    updated["stats_locked"]  = True
    updated["phase"]         = PHASE_CHAT

    return GameState(**updated)