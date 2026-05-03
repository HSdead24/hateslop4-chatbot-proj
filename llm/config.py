"""
게임의 고정 설정값을 모아두는 파일.
NPC별 초기 수치, 사용할 GPT 모델명, 루프 횟수 등
코드 전체에서 공통으로 참조하는 상수를 관리한다.

수치 밸런싱 시        → DEFAULT_NPC_STATS 수정
모델 교체 시          → LLM_MODEL_DEFAULT / LLM_MODEL_HEAVY 수정
스토리 추가 시        → STORIES + BUTTON_STORY_MAP에 함께 추가
사망 트리거 수정 시   → DEATH_KEYWORDS / MAX_CHAT_TURNS / SESSION_TIMEOUT 수정

[스토리 결정 흐름]
루프 시작
→ DEFAULT_NPC_STATS로 수치 초기화 (버튼 선택 전 기본값)
→ Phase 1 버튼 선택 순서 기록 (button_history에 누적)
→ 버튼 선택 완료 시 BUTTON_STORY_MAP으로 스토리 직접 확정
→ state["npc_stats"] = STORIES[selected_story]로 수치 덮어씀
→ Phase 2 채팅 (수치 고정)
→ 사망 → 루프 리셋 → DEFAULT_NPC_STATS로 다시 초기화
"""

# ────────────────────────────────────────────
# LLM 모델 설정
# ────────────────────────────────────────────

# 일반 대화에 사용하는 기본 모델 (토큰 절약)
LLM_MODEL_DEFAULT = "gpt-3.5-turbo"

# 중요한 장면(루프 후반, 진실 접근 시)에 사용하는 고성능 모델
LLM_MODEL_HEAVY = "gpt-4o"

# LLM 온도 설정 (0.0 = 일관성 최대 / 1.0 = 창의성 최대)
LLM_TEMPERATURE = 0.7


# ────────────────────────────────────────────
# 대화 기록 요약 설정
# ────────────────────────────────────────────

# NPC별 대화가 이 횟수를 초과하면 오래된 기록을 요약 처리
# (토큰 절약 + 맥락 유지)
MESSAGE_SUMMARY_THRESHOLD = 10


# ────────────────────────────────────────────
# NPC 초기 수치
# ────────────────────────────────────────────
# 수치 범위: 0 ~ 100
# 수치 항목은 캐릭터마다 다를 수 있음 (base.py의 stats_to_tone_guidance 참고)
# 루프 리셋 시 loop_node.py에서 이 값으로 초기화됨
# 버튼 선택 전 기본값으로 되돌리는 용도
#
# [임시값 - 기획 확정 후 수정 필요]
# trust     : 유저에 대한 신뢰도
# hostility : 유저에 대한 적대감
# suspicion : 유저에 대한 의심
# composure : 감정 억제력 (낮을수록 말실수/감정 노출)
# guilt     : 죄책감
# grief     : 슬픔/상실감
# ────────────────────────────────────────────

DEFAULT_NPC_STATS: dict[str, dict[str, int]] = {
    "김도현": {
        "trust"     : 20,
        "hostility" : 70,
        "composure" : 80,
    },
    "차서연": {
        "trust"     : 50,
        "suspicion" : 60,
        "caution"   : 75,
    },
    "엄마": {
        "trust"     : 80,
        "guilt"     : 90,
        "composure" : 40,
    },
    "박도원": {
        "trust"     : 60,
        "grief"     : 85,
        "composure" : 65,
    },
}


# ────────────────────────────────────────────
# 수치 임계값 (threshold)
# ────────────────────────────────────────────
# base.py의 stats_to_tone_guidance()에서 말투 분기 기준으로 사용
# 예: trust >= HIGH_THRESHOLD → 친절한 말투
#     trust <= LOW_THRESHOLD  → 단답/회피하는 말투
# ────────────────────────────────────────────

HIGH_THRESHOLD = 70   # 이 값 이상이면 해당 수치가 "높음"으로 판단
LOW_THRESHOLD  = 30   # 이 값 이하이면 해당 수치가 "낮음"으로 판단


# ────────────────────────────────────────────
# 사망 트리거 설정
# ────────────────────────────────────────────
# 아래 세 가지 조건 중 하나라도 충족되면 유저는 사망 처리된다.
# 세 조건은 동시에 적용된다.

# 대화 개수 제한
# NPC별 대화 턴이 이 값 이상이 되면 자동 사망 처리
# chat_node.py에서 messages[npc_name] 길이로 체크
MAX_CHAT_TURNS = 20

# 시간 제한 (초 단위)
# 프론트엔드 타이머가 0이 되면 백엔드에 사망 신호를 전송
# 960초 = 16분
SESSION_TIMEOUT = 960

# 사망 트리거 단어
# 유저 입력에 이 문자열이 포함되면 자동 사망 처리
# chat_node.py에서 in 연산자로 부분 일치 체크
# 문장이 길수록 정확한 일치에 가까워져 오탐 가능성이 낮아짐
# 프로듀서 확정 후 채우기
DEATH_KEYWORDS: list[str] = [
    "내가 잘못했어",
    "당신을 용서할 수 없어",
]


# ────────────────────────────────────────────
# 스토리 목록
# ────────────────────────────────────────────
# Phase 1 버튼 선택 완료 후 확정되는 NPC 수치 세트.
# BUTTON_STORY_MAP으로 스토리가 결정되면
# state["npc_stats"]를 이 값으로 덮어씀.
# [임시값 - 프로듀서 확정 후 수치 채우기]
# ────────────────────────────────────────────

STORIES: dict[str, dict] = {
    "story_A": {
        "김도현": {"trust": 20, "hostility": 70, "composure": 80},
        "차서연": {"trust": 50, "suspicion": 60, "caution": 75},
        "엄마":   {"trust": 80, "guilt": 90,     "composure": 40},
        "박도원": {"trust": 60, "grief": 85,      "composure": 65},
    },
    "story_B": {
        # 프로듀서 확정 후 채우기
    },
    "story_C": {
        # 프로듀서 확정 후 채우기
    },
}


# ────────────────────────────────────────────
# 버튼 조합 → 스토리 매핑
# ────────────────────────────────────────────
# Phase 1에서 유저가 선택한 버튼 순서(tuple)를 스토리 ID에 매핑한다.
# 순서가 다르면 다른 스토리로 판단한다.
# 예: ("A","B","A","A") ≠ ("A","A","B","A")
#
# button_node.py에서 tuple(state["button_history"])로 키를 조회한다.
# 매핑되는 조합이 없으면 DEFAULT_STORY를 기본값으로 사용한다.
# [임시값 - 프로듀서 확정 후 조합 채우기]
# ────────────────────────────────────────────

BUTTON_STORY_MAP: dict[tuple, str] = {
    ("A", "B", "A", "A"): "story_A",   # 프로듀서 확정 후 수정
    ("A", "B", "C", "A"): "story_B",
    ("B", "A", "A", "C"): "story_C",
}

# ── Phase 3: RAG ──────────────────────
import os as _os
CHROMA_PATH = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "vector_store", "db")  # 절대경로
STORY_COLLECTION = "story_chunks" #스토리 문서 청크를 저장하는 컬렉션 이름
RAG_TOP_K = 3 #유저 발화와 유사한 문서를 몇개까지 가져올 것인가

# ── Phase 4: 이미지 ───────────────────
IMAGE_COLLECTION = "image_captions"#이미지 캡션을 저장하는 컬렉션 이름
IMAGE_THRESHOLD = 0.7 #이 점수 미만이면 유사한 이미지 없음.

# ── 공통 ──────────────────────────────
EMBEDDING_MODEL = "text-embedding-3-small" #phase3,4 모두 사용되는 임베딩 모델