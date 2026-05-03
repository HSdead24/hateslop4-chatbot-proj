"""
Phase 1(버튼 선택)의 로직을 담당하는 노드 파일.

주요 역할
---------
1. 유저가 버튼을 클릭할 때마다 button_history에 선택을 기록
2. 다음 단계에서 선택 가능한 버튼 목록 반환 (중복 조합 방지)
3. 버튼 선택 완료 시 BUTTON_STORY_MAP으로 스토리 확정
4. 확정된 스토리의 수치를 npc_stats에 적용 후 Phase 2로 전환
"""

import copy

from state import GameState, PHASE_CHAT
from config import BUTTON_STORY_MAP, STORIES, DEFAULT_NPC_STATS


# ────────────────────────────────────────────
# 버튼 선택 기록
# ────────────────────────────────────────────

def record_button(state: GameState, button: str) -> GameState:
    """
    유저가 버튼을 클릭할 때마다 호출된다.
    선택한 버튼을 button_history에 추가한다.

    stats_locked가 True이면 (Phase 2 진입 후) 버튼 선택을 무시한다.

    Parameters
    ----------
    state  : 현재 GameState
    button : 유저가 선택한 버튼 ID (예: "A", "B", "C")

    Returns
    -------
    button_history가 업데이트된 GameState
    """
    if state["stats_locked"]:
        return state

    updated_state = dict(state)
    updated_state["button_history"] = state["button_history"] + [button]
    return GameState(**updated_state)


# ────────────────────────────────────────────
# 선택 가능한 버튼 목록 반환
# ────────────────────────────────────────────

def get_available_buttons(state: GameState, all_buttons: list) -> list:
    """
    현재 button_history를 기준으로 다음 단계에서
    선택 가능한 버튼 목록을 반환한다.

    past_sequences와 현재 button_history를 비교해서
    이전 루프와 동일한 조합이 되는 버튼을 차단한다.

    예시
    ----
    past_sequences = [["A", "B", "A", "A"]]
    현재 button_history = ["A", "B", "A"]
    → past[0:3] == ["A","B","A"] → 일치
    → past[3] == "A" → A 버튼 차단
    → 반환: ["B", "C", "D"] (A 제외)

    Parameters
    ----------
    state       : 현재 GameState
    all_buttons : 전체 버튼 목록 (예: ["A", "B", "C", "D"])

    Returns
    -------
    선택 가능한 버튼 목록
    """
    current = state["button_history"]
    blocked = set()

    for past in state["past_sequences"]:
        # 현재까지의 선택이 과거 시퀀스의 앞부분과 동일한지 확인
        if past[:len(current)] == current:
            # 동일하면 그 다음 버튼을 차단
            if len(past) > len(current):
                blocked.add(past[len(current)])

    return [btn for btn in all_buttons if btn not in blocked]


# ────────────────────────────────────────────
# 스토리 확정
# ────────────────────────────────────────────

def get_story(state: GameState) -> str:
    """
    현재 button_history를 BUTTON_STORY_MAP에서 조회해 스토리 ID를 반환한다.

    매핑된 스토리가 없거나 이미 사용한 스토리이면
    사용하지 않은 스토리 중 첫 번째를 반환한다.

    Parameters
    ----------
    state : 현재 GameState

    Returns
    -------
    확정된 스토리 ID (예: "story_A")
    None이면 사용 가능한 스토리가 없는 상태 (예외 상황)
    """
    button_tuple = tuple(state["button_history"])

    # 버튼 조합으로 스토리 직접 매핑
    selected = BUTTON_STORY_MAP.get(button_tuple)

    # 매핑된 스토리가 없거나 이미 사용한 스토리이면
    # 사용하지 않은 스토리 중 첫 번째 선택
    if selected is None or selected in state["used_stories"]:
        available = [s for s in STORIES if s not in state["used_stories"]]
        selected = available[0] if available else None

    return selected


def finalize_stats(state: GameState) -> GameState:
    """
    버튼 선택 완료 시 호출된다.
    스토리를 확정하고 해당 스토리의 수치를 npc_stats에 적용한 뒤
    Phase 2(챗봇 대화)로 전환한다.

    Parameters
    ----------
    state : 현재 GameState

    Returns
    -------
    스토리와 수치가 확정되고 phase가 PHASE_CHAT으로 전환된 GameState
    """
    selected_story = get_story(state)

    # 사용 가능한 스토리가 없는 예외 상황 처리
    if selected_story is None:
        # 모든 스토리를 소진한 경우 DEFAULT_NPC_STATS로 fallback
        confirmed_stats = copy.deepcopy(DEFAULT_NPC_STATS)
        selected_story  = ""
    else:
        confirmed_stats = copy.deepcopy(STORIES[selected_story])

    updated_state = dict(state)
    updated_state["current_story"]  = selected_story
    updated_state["used_stories"]   = state["used_stories"] + [selected_story]
    updated_state["npc_stats"]      = confirmed_stats
    updated_state["stats_locked"]   = True
    updated_state["phase"]          = PHASE_CHAT

    return GameState(**updated_state)


# ────────────────────────────────────────────
# LangGraph 노드 함수
# ────────────────────────────────────────────

def button_phase_node(state: GameState) -> GameState:
    """
    LangGraph에서 button_phase 노드로 등록되는 함수.
    실제 버튼 클릭 이벤트는 백엔드 API를 통해 record_button()을 직접 호출하고,
    이 노드는 Phase 1 진입 시 상태를 확인하는 용도로 사용된다.

    stats_locked가 이미 True이면 (재진입 방지) 상태를 그대로 반환한다.
    """
    if state["stats_locked"]:
        return state
    return state