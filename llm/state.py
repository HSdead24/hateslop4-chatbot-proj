"""
게임의 모든 상태(루프 횟수, 현재 수치, NPC별 대화 기록 등)를 담는 중앙 저장소.
messages를 딕셔너리 형태로 분리하여 NPC별 1:1 대화 기록이 섞이지 않도록 방지한다.
모든 LangGraph 노드는 이 TypedDict를 읽고 쓴다.
"""

from typing import TypedDict

# ────────────────────────────────────────────
# 상수 정의
# ────────────────────────────────────────────

PHASE_BUTTON = "button"   # Phase 1: 버튼 선택 중
PHASE_CHAT   = "chat"     # Phase 2: 챗봇 대화 중

TOTAL_LOOPS = 3           # 루프 최대 횟수


# ────────────────────────────────────────────
# NPC 이름 상수
# (오타 방지용: 코드 전체에서 문자열 직접 입력 대신 이 상수를 사용)
# ────────────────────────────────────────────

NPC_EXECUTOR  = "치키"     # 집행자 — 수치 시스템 외부 (GameState에 포함하지 않음)
NPC_KIM       = "김도현"
NPC_CHA       = "차서연"
NPC_MOM       = "엄마"
NPC_PARK      = "박도원"

NPC_LIST = [NPC_KIM, NPC_CHA, NPC_MOM, NPC_PARK]  # 수치 관리 대상 NPC 목록


# ────────────────────────────────────────────
# GameState
# ────────────────────────────────────────────

class GameState(TypedDict):
    """
    LangGraph 전체 노드가 공유하는 게임 상태.

    필드 설명
    ---------
    loop_count : int
        현재 루프 회차. 1부터 시작하며 TOTAL_LOOPS(3)를 초과하면 게임 종료.

    phase : str
        현재 게임 페이즈. PHASE_BUTTON 또는 PHASE_CHAT.
        - PHASE_BUTTON : 버튼 선택 단계
        - PHASE_CHAT   : 챗봇 대화 단계 (수치 확정 후)

    npc_stats : dict[str, dict[str, int]]
        NPC별 수치 딕셔너리.
        키: NPC 이름 (NPC_LIST 참고)
        값: {수치 항목명: 현재 값(0~100)}
        루프 시작 시 config.py의 DEFAULT_NPC_STATS로 초기화.
        버튼 선택 완료 시 STORIES[current_story]로 덮어씀.
        예시: {"김도현": {"trust": 20, "hostility": 70}, ...}

    stats_locked : bool
        True이면 npc_stats 수정 불가 (Phase 2 진입 후 확정된 상태).
        button_node.py에서 스토리 확정 시 True로 전환.

    messages : dict[str, list]
        NPC별 독립 대화 기록.
        키: NPC 이름 / 값: LangChain 메시지 객체 리스트
        NPC를 전환해도 각자의 대화 맥락이 유지된다.
        예시: {"김도현": [HumanMessage(...), AIMessage(...)], ...}

    current_npc : str
        현재 유저가 대화 중인 NPC 이름.
        chat_node.py에서 어떤 캐릭터 프롬프트를 불러올지 결정하는 데 사용.

    clues : list[str]
        유저가 현재 루프에서 획득한 단서 목록.
        챗봇 대화 중 특정 키워드 감지 시 추가된다.
        루프 리셋 시 초기화된다.

    is_dead : bool
        True이면 유저가 사망한 상태.
        router.py에서 루프 리셋 또는 게임 종료를 트리거.

    player_name : str
        유저가 입력한 플레이어 닉네임. 프롬프트에 {player_name}으로 주입.

    player_gender : str
        유저가 선택한 성별 ("남" / "여" / "무관").
        일부 캐릭터 프롬프트에서 호칭 분기에 사용.

    current_story : str
        현재 루프에서 확정된 스토리 ID (예: "story_1").
        button_node.py에서 BUTTON_STORY_MAP 조회 후 설정됨.
        루프 리셋 시 빈 문자열로 초기화.

    used_stories : list[str]
        이미 진행한 스토리 ID 목록. 중복 방지용.
        루프 리셋 시 초기화하지 않고 누적 유지.
        (3루프 동안 같은 스토리가 반복되지 않도록 관리)

    button_history : list[int]
        마지막으로 선택한 버튼 ID만 저장 (항상 길이 0 또는 1).
        버튼 클릭 시 [button_id]로 덮어씀.
        스토리 확정 시 button_history[0]을 BUTTON_STORY_MAP 조회에 사용.
        루프 리셋 시 빈 리스트로 초기화.

    first_button : int
        첫 번째 선택지 버튼 ID. RAG route 필터에 사용.
        Sheet1 → 100, Sheet2 → 101.
        루프 리셋 시 0으로 초기화.

    context : list[str]
        유저가 선택한 버튼 텍스트 누적 목록.
        프론트에서 조합해서 전달하며, 챗봇 시스템 프롬프트에 오늘의 배경으로 주입.
        루프 리셋 시 빈 리스트로 초기화.
    """

    loop_count     : int
    phase          : str
    npc_stats      : dict   # dict[str, dict[str, int]]
    stats_locked   : bool
    messages       : dict   # dict[str, list]
    current_npc    : str
    clues          : list   # list[str]
    is_dead        : bool
    is_loop_reset  : bool   # 치키 + __ALL__ 트리거 시 루프 강제 리셋 플래그
    player_name    : str
    player_gender  : str
    current_story  : str
    used_stories   : list   # list[str]
    button_history : list   # list[int] — 마지막 버튼 ID 1개만 저장
    first_button   : int    # 첫 번째 선택지 버튼 ID. RAG route 필터에 사용.
    context        : list   # list[str] — 프론트에서 조합한 버튼 텍스트 목록

    _user_input    : str    
    _last_response : str    
    _image_url     : str | None


# ────────────────────────────────────────────
# 초기 GameState 생성 헬퍼
# ────────────────────────────────────────────

def create_initial_state(
    player_name: str,
    player_gender: str,
    default_npc_stats: dict,
) -> GameState:
    """
    게임 시작 또는 루프 리셋 시 초기 GameState를 생성한다.

    Parameters
    ----------
    player_name      : 유저 닉네임
    player_gender    : 유저 성별 ("남" / "여" / "무관")
    default_npc_stats: config.py의 DEFAULT_NPC_STATS (깊은 복사로 전달)
    """
    import copy
    return GameState(
        loop_count     = 1,
        phase          = PHASE_BUTTON,
        npc_stats      = copy.deepcopy(default_npc_stats),
        stats_locked   = False,
        messages       = {npc: [] for npc in NPC_LIST},
        current_npc    = "",
        clues          = [],
        is_dead        = False,
        is_loop_reset  = False,
        player_name    = player_name,
        player_gender  = player_gender,
        current_story  = "",
        used_stories   = [],
        button_history = [],
        first_button   = 0,
        context        = [],

        # 초기값 세팅
        _user_input    = "",
        _last_response = "",
        _image_url     = None,
    )