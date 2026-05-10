"""
LangGraph의 전체 흐름을 조립하는 파일.
버튼 선택(Phase 1) → 챗봇 대화(Phase 2) → 루프 리셋의 노드들을
연결하고, 어떤 조건에서 어떤 노드로 이동할지 엣지를 정의한다.

노드 구성
---------
- button_phase : Phase 1 버튼 선택 노드
- chat_phase   : Phase 2 챗봇 대화 노드
- loop_reset   : 루프 리셋 노드

라우팅 구성
-----------
- 진입점          : route_entry()     → button_phase 또는 chat_phase
- button_phase 후 : route_after_button() → chat_phase 또는 button_phase 유지
- chat_phase 후   : route_after_chat()   → loop_reset, chat_phase, END
- loop_reset 후   : button_phase로 고정 전환
"""

from langgraph.graph import StateGraph, END

from state import GameState
from nodes.button_node import button_phase_node
from nodes.chat_node import chat_node
from nodes.loop_node import loop_reset_node
from nodes.router import (
    route_entry,
    route_after_button,
    route_after_chat,
    ROUTE_BUTTON,
    ROUTE_CHAT,
    ROUTE_RESET,
)


# ────────────────────────────────────────────
# chat_phase 노드 래퍼
# ────────────────────────────────────────────
# LangGraph 노드는 (state) → state 형태여야 한다.
# chat_node()는 (state, user_input) → (state, response) 형태라
# runner.py가 user_input을 state에 임시로 주입한 뒤 호출하는 방식으로 처리한다.
# graph.py에서는 state만 받는 래퍼 함수를 노드로 등록한다.

def chat_phase_node(state: GameState) -> GameState:
    """
    LangGraph 노드용 chat_node 래퍼.
    runner.py에서 state["_user_input"]에 유저 입력을 임시 저장한 뒤 호출한다.
    응답 텍스트는 state["_last_response"]에 저장해 runner.py가 꺼내 쓴다.

    _user_input, _last_response는 GameState 외부 임시 필드로,
    runner.py에서만 사용하고 LangGraph 상태에는 영향을 주지 않는다.
    """
    user_input = state.get("_user_input", "")
    updated_state, response, image_url = chat_node(state, user_input)

    # 응답을 임시 필드에 저장 (runner.py에서 꺼내 쓴 후 제거)
    result = dict(updated_state)
    result["_last_response"] = response
    result["_image_url"] = image_url

    return GameState(**result)


# ────────────────────────────────────────────
# 그래프 조립
# ────────────────────────────────────────────

def build_graph() -> StateGraph:
    """
    LangGraph StateGraph를 조립해 반환한다.
    runner.py에서 이 함수를 호출해 그래프 인스턴스를 생성한다.

    Returns
    -------
    컴파일된 LangGraph 앱
    """
    graph = StateGraph(GameState)

    # ── 노드 등록 ────────────────────────────
    graph.add_node(ROUTE_BUTTON, button_phase_node)
    graph.add_node(ROUTE_CHAT,   chat_phase_node)
    graph.add_node(ROUTE_RESET,  loop_reset_node)

    # ── 진입점 ───────────────────────────────
    # 게임 시작 또는 루프 리셋 직후 phase에 따라 분기
    graph.set_conditional_entry_point(
        route_entry,
        {
            ROUTE_BUTTON: ROUTE_BUTTON,
            ROUTE_CHAT  : ROUTE_CHAT,
        }
    )

    # ── button_phase 이후 엣지 ───────────────
    # stats_locked 여부에 따라 chat_phase 또는 button_phase 유지
    graph.add_conditional_edges(
        ROUTE_BUTTON,
        route_after_button,
        {
            ROUTE_CHAT  : ROUTE_CHAT,
            ROUTE_BUTTON: ROUTE_BUTTON,
        }
    )

    # ── chat_phase 이후 엣지 ─────────────────
    # 사망 여부 + 루프 횟수에 따라 분기
    graph.add_conditional_edges(
        ROUTE_CHAT,
        route_after_chat,
        {
            ROUTE_CHAT : END, # ROUTE_CHAT(정상 진행)일 때 다시 돌지 말고 그래프 실행을 종료(END)하여 유저 입력을 기다리도록 변경
            ROUTE_RESET: ROUTE_RESET,
            END        : END,
        }
    )

    # ── loop_reset 이후 엣지 ─────────────────
    # 루프 리셋 후 항상 button_phase로 전환
    graph.add_edge(ROUTE_RESET, ROUTE_BUTTON)

    return graph.compile()


# ────────────────────────────────────────────
# 그래프 싱글톤
# ────────────────────────────────────────────
# runner.py에서 import해서 사용
# 매 요청마다 build_graph()를 호출하지 않도록 모듈 로드 시 1회만 생성

game_graph = build_graph()