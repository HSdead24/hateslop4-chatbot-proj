"""
현재 GameState를 보고 다음에 어떤 노드로 이동할지 결정하는 파일.
LangGraph의 conditional_edge에서 호출되며, 문자열로 다음 노드 이름을 반환한다.

분기 조건
---------
1. phase == PHASE_BUTTON  → "button_phase"  (버튼 선택 단계)
2. is_dead == True        → "loop_reset"    (사망 → 루프 리셋)
3. loop_count > TOTAL_LOOPS → END           (루프 3회 초과 → 게임 종료)
4. 그 외                  → "chat_phase"    (정상 대화 진행)
"""

from langgraph.graph import END

from state import GameState, PHASE_BUTTON, TOTAL_LOOPS


# ────────────────────────────────────────────
# 라우팅 상수
# (graph.py의 add_conditional_edges에서 매핑 키로 사용)
# ────────────────────────────────────────────

ROUTE_BUTTON = "button_phase"
ROUTE_CHAT   = "chat_phase"
ROUTE_RESET  = "loop_reset"
ROUTE_END    = END


# ────────────────────────────────────────────
# 진입점 라우터
# graph.py의 set_conditional_entry_point에서 사용
# ────────────────────────────────────────────

def route_entry(state: GameState) -> str:
    """
    게임 시작 또는 루프 리셋 직후 진입점에서 호출된다.
    현재 phase에 따라 버튼 선택 또는 챗봇 대화로 분기한다.
    """
    if state["phase"] == PHASE_BUTTON:
        return ROUTE_BUTTON
    return ROUTE_CHAT


# ────────────────────────────────────────────
# 챗봇 페이즈 이후 라우터
# graph.py의 chat_phase 노드 이후 conditional_edge에서 사용
# ────────────────────────────────────────────

def route_after_chat(state: GameState) -> str:
    if state["is_dead"]:
        # 3루프에서 사망 → 게임 종료
        if state["loop_count"] >= TOTAL_LOOPS:
            return ROUTE_END
        # 1~2루프에서 사망 → 루프 리셋
        return ROUTE_RESET

    return ROUTE_CHAT


# ────────────────────────────────────────────
# 버튼 페이즈 이후 라우터
# graph.py의 button_phase 노드 이후 conditional_edge에서 사용
# ────────────────────────────────────────────

def route_after_button(state: GameState) -> str:
    """
    버튼 선택 턴이 끝난 뒤 호출된다.
    수치가 확정(stats_locked == True)되면 챗봇 페이즈로 전환한다.
    아직 선택 중이면 버튼 페이즈를 유지한다.
    """
    if state["stats_locked"]:
        return ROUTE_CHAT
    return ROUTE_BUTTON