"""
루프가 리셋될 때 실행되는 노드 파일.
사망 후 다음 루프를 준비하기 위해 GameState를 부분 초기화한다.

초기화 규칙
-----------
초기화 O (루프마다 리셋):
    - loop_count     : +1 증가
    - phase          : PHASE_BUTTON으로 초기화
    - npc_stats      : DEFAULT_NPC_STATS로 초기화
    - stats_locked   : False로 초기화
    - messages       : 빈 딕셔너리로 초기화
    - current_npc    : 빈 문자열로 초기화
    - clues          : 빈 리스트로 초기화
    - is_dead        : False로 초기화
    - is_loop_reset  : False로 초기화
    - current_story  : 빈 문자열로 초기화
    - button_history : 빈 리스트로 초기화
    - first_button   : 0으로 초기화
    - context        : 빈 리스트로 초기화

초기화 X (누적 유지):
    - player_name    : 게임 전체에서 유지
    - player_gender  : 게임 전체에서 유지
    - used_stories   : 중복 스토리 방지를 위해 누적 유지
"""

import copy

from state import GameState, PHASE_BUTTON, NPC_LIST
from config import DEFAULT_NPC_STATS


def loop_reset_node(state: GameState) -> GameState:
    """
    루프 리셋 시 호출되는 노드 함수.
    다음 루프를 위해 GameState를 부분 초기화한다.

    router.py의 route_after_chat()에서 is_dead == True 조건으로 호출됨.
    loop_count가 TOTAL_LOOPS 이상이면 이 노드가 아닌 END로 분기되므로
    이 함수는 항상 1~2루프 사망 시에만 실행된다.

    Parameters
    ----------
    state : 현재 GameState

    Returns
    -------
    부분 초기화된 GameState
    """
    return GameState(
        # 루프 회차 +1
        loop_count     = state["loop_count"] + 1,

        # Phase 1(버튼 선택)부터 다시 시작
        phase          = PHASE_BUTTON,

        # 수치를 기본값으로 되돌림 (버튼 선택 전 상태)
        npc_stats      = copy.deepcopy(DEFAULT_NPC_STATS),

        # 수치 잠금 해제 (Phase 1에서 다시 선택 가능)
        stats_locked   = False,

        # NPC별 대화 기록 초기화
        messages       = {npc: [] for npc in NPC_LIST},

        # 현재 대화 중인 NPC 초기화
        current_npc    = "",

        # 단서 목록 초기화
        clues          = [],

        # 사망 상태 초기화
        is_dead        = False,

        # 루프 강제 리셋 플래그 초기화
        is_loop_reset  = False,

        # 현재 스토리 초기화 (다음 루프에서 새로 결정)
        current_story  = "",

        # 버튼 선택 기록 초기화
        button_history = [],

        # 첫 번째 버튼 ID 초기화
        first_button   = 0,

        # 버튼 텍스트 누적 목록 초기화
        context        = [],

        # ── 누적 유지 필드 ──────────────────────
        # 유저 정보 유지
        player_name    = state["player_name"],
        player_gender  = state["player_gender"],

        # 진행한 스토리 목록 누적 유지 (중복 스토리 방지)
        used_stories   = state["used_stories"],
    )