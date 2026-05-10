"""
게임의 고정 설정값을 모아두는 파일.
NPC별 초기 수치, 사용할 GPT 모델명, 루프 횟수 등
코드 전체에서 공통으로 참조하는 상수를 관리한다.

수치 밸런싱 시        → DEFAULT_NPC_STATS 수정
모델 교체 시          → LLM_MODEL_DEFAULT / LLM_MODEL_HEAVY 수정
스토리/버튼 수정 시   → stories.py의 STORIES / BUTTON_STORY_MAP 수정
사망 트리거 수정 시   → DEATH_KEYWORDS / MAX_CHAT_TURNS / SESSION_TIMEOUT 수정

[스토리 결정 흐름]
루프 시작
→ DEFAULT_NPC_STATS로 수치 초기화 (버튼 선택 전 기본값)
→ Phase 1 버튼 선택 완료 시 마지막 버튼 ID를 button_history에 저장
→ 버튼 선택 완료 시 BUTTON_STORY_MAP으로 스토리 직접 확정
→ state["npc_stats"] = STORIES[selected_story]로 수치 덮어씀
→ Phase 2 채팅 (수치 고정)
→ 사망 → 루프 리셋 → DEFAULT_NPC_STATS로 다시 초기화
"""

# ────────────────────────────────────────────
# LLM 모델 설정
# ────────────────────────────────────────────

# 일반 대화에 사용하는 기본 모델 (토큰 절약)
LLM_MODEL_DEFAULT = "gpt-4o-mini"

# 중요한 장면(루프 후반, 진실 접근 시)에 사용하는 고성능 모델
LLM_MODEL_HEAVY = "gpt-4o"

# LLM 온도 설정 (0.0 = 일관성 최대 / 1.0 = 창의성 최대)
LLM_TEMPERATURE = 0.7

# NPC 응답 최대 토큰 수 - 파싱 에러 방지 위해 여유 있게 수정
LLM_MAX_TOKENS = 800


# ────────────────────────────────────────────
# NPC 초기 수치
# ────────────────────────────────────────────
# 수치 범위: 0 ~ 100 (단, Fleshy는 100 초과 가능)
# 루프 리셋 시 loop_node.py에서 이 값으로 초기화됨
# 버튼 선택 전 기본값으로 되돌리는 용도
# (base.py의 stats_to_tone_guidance 참고)
#
# trust     : 유저에 대한 신뢰도
# hostility : 유저에 대한 적대감
# suspicion : 유저에 대한 의심
# caution   : 경계심/방어성
# composure : 감정 억제력 (낮을수록 말실수/감정 노출)
# guilt     : 죄책감
# grief     : 슬픔/상실감
# Fleshy    : 범인 확정 수치 (가장 높은 NPC가 범인으로 판정)
# ────────────────────────────────────────────

DEFAULT_NPC_STATS: dict[str, dict[str, int]] = {
    "김도현": {
        "trust"     : 20,
        "hostility" : 70,
        "composure" : 80,
        "Fleshy"    : 20,
    },
    "차서연": {
        "trust"     : 50,
        "suspicion" : 60,
        "caution"   : 75,
        "Fleshy"    : 20,
    },
    "엄마": {
        "trust"     : 80,
        "guilt"     : 90,
        "composure" : 40,
        "Fleshy"    : 20,
    },
    "박도원": {
        "trust"     : 60,
        "grief"     : 85,
        "composure" : 65,
        "Fleshy"    : 20,
    },
}


# ────────────────────────────────────────────
# 수치 임계값 (threshold)
# ────────────────────────────────────────────
# base.py의 stats_to_tone_guidance()에서 말투 분기 기준으로 사용
# 각 수치마다 high/low를 개별 정의하여 수치별 범위 차이를 반영
# 예: trust >= THRESHOLDS["trust"]["high"] → 친절한 말투
#     trust <= THRESHOLDS["trust"]["low"]  → 단답/회피하는 말투
#
# Fleshy는 범인 판정 전용 수치로 THRESHOLDS 적용 대상에서 제외
#    범인 판정 기준은 FLESHY_THRESHOLD 사용
#    Fleshy 1등: 80~125 / 2등 이하: 20~55 → 안전 갭 25 확보
# ────────────────────────────────────────────

THRESHOLDS: dict[str, dict[str, int]] = {
    "trust"     : {"high": 60,  "low": 25},   # 기본 20~80
    "hostility" : {"high": 100, "low": 75},   # 기본 70~145
    "composure" : {"high": 60,  "low": 30},   # 기본 0~80
    "suspicion" : {"high": 90,  "low": 65},   # 기본 60~135
    "caution"   : {"high": 90,  "low": 75},   # 기본 75~110
    "guilt"     : {"high": 115, "low": 95},   # 기본 90~131
    "grief"     : {"high": 130, "low": 90},   # 기본 85~164
}

FLESHY_THRESHOLD = 67


# ────────────────────────────────────────────
# 게임 제한 설정
# ────────────────────────────────────────────
# 아래 두 가지 조건 + 사망 트리거 중 하나라도 충족되면 유저는 사망 처리된다.
# 두 조건 + 사망 트리거는 동시에 적용된다.

# 대화 개수 제한
# NPC별 대화 턴이 이 값 이상이 되면 자동 사망 처리
# chat_node.py에서 messages[npc_name] 길이로 체크
MAX_CHAT_TURNS = 20

# 시간 제한 (초 단위)
# 프론트엔드 타이머가 0이 되면 백엔드에 사망 신호를 전송
# 1440초 = 24분
SESSION_TIMEOUT = 1440


# ── Phase 3: RAG ──────────────────────
import os as _os
CHROMA_PATH = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "vector_store", "db")  # 절대경로
STORY_COLLECTION = "story_chunks" #스토리 문서 청크를 저장하는 컬렉션 이름
RAG_TOP_K = 3  # 유저 발화와 유사한 문서를 몇 개까지 가져올 것인가 (루프 3회 고정 → 루프별 문서 누락 방지)

# ── Phase 4: 이미지 ───────────────────
IMAGE_COLLECTION = "image_captions"#이미지 캡션을 저장하는 컬렉션 이름
IMAGE_THRESHOLD = 0.2 #이 점수 미만이면 유사한 이미지 없음.

# ── 공통 ──────────────────────────────
EMBEDDING_MODEL = "text-embedding-3-small" #phase3,4 모두 사용되는 임베딩 모델