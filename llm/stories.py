"""
버튼 선택 완료 후 확정되는 NPC 최종 수치 세트.

400번대 버튼 ID가 직접 STORIES의 키로 사용된다.
유저가 400번대 버튼을 클릭하는 순간 스토리(NPC 수치)가 확정된다.

수치 수정 시  → 해당 버튼 ID 항목에서 수치만 변경
스토리 추가 시 → 버튼 ID를 키로 항목 추가
"""

# ────────────────────────────────────────────
# NPC별 수치 항목
# ────────────────────────────────────────────
# 김도현: trust, hostility, composure, Fleshy
# 차서연: trust, suspicion, caution, Fleshy
# 엄마:   trust, guilt, composure, Fleshy
# 박도원: trust, grief, composure, Fleshy
# ────────────────────────────────────────────

STORIES: dict[int, dict] = {

    # ── Sheet1: 집 루트 (100번 선택) ──────────────────────────
    # 노드300 → 400: 차서연 문자(김도현 상담일) 씬
    400: {
        '김도현': {'trust': 10, 'hostility': 70, 'composure': 80, 'Fleshy': 90},
        '차서연': {'trust': 20, 'suspicion': 60, 'caution': 75, 'Fleshy': 30},
        '엄마': {'trust': 100, 'guilt': 90, 'composure': 38, 'Fleshy': 24},
        '박도원': {'trust': 60, 'grief': 85, 'composure': 65, 'Fleshy': 20}
    },
    # 노드300 → 401: 엄마 밥 씬
    401: {
        '김도현': {'trust': 20, 'hostility': 70, 'composure': 80, 'Fleshy': 20},
        '차서연': {'trust': 20, 'suspicion': 60, 'caution': 75, 'Fleshy': 20},
        '엄마': {'trust': 100, 'guilt': 90, 'composure': 38, 'Fleshy': 24},
        '박도원': {'trust': 30, 'grief': 85, 'composure': 65, 'Fleshy': 70}
    },
    # 노드301 → 402: 엄마 택배 씬
    402: {
        '김도현': {'trust': 20, 'hostility': 70, 'composure': 80, 'Fleshy': 20},
        '차서연': {'trust': 20, 'suspicion': 60, 'caution': 75, 'Fleshy': 20},
        '엄마': {'trust': 10, 'guilt': 94, 'composure': 38, 'Fleshy': 60},
        '박도원': {'trust': 30, 'grief': 85, 'composure': 65, 'Fleshy': 60}
    },
    # 노드301 → 403: 택배기사 도망 씬
    403: {
        '김도현': {'trust': 20, 'hostility': 70, 'composure': 80, 'Fleshy': 20},
        '차서연': {'trust': 10, 'suspicion': 80, 'caution': 75, 'Fleshy': 60},
        '엄마': {'trust': 100, 'guilt': 90, 'composure': 38, 'Fleshy': 24},
        '박도원': {'trust': 30, 'grief': 85, 'composure': 65, 'Fleshy': 70}
    },

    # ── Sheet2: 출근 루트 (101번 선택) ────────────────────────
    # 노드302 → 404: 차서연이 박도원 의심
    404: {
         "김도현": {'trust': 15, 'hostility': 89, 'composure': 60, 'Fleshy': 45},
         "차서연": {'trust': 28, 'suspicion': 94, 'caution': 91, 'Fleshy': 65},
         "엄마": {'trust': 80, 'guilt': 90, 'composure': 40, 'Fleshy': 20},
         "박도원": {'trust': 24, 'grief': 130, 'composure': 26, 'Fleshy': 80},
    },
    # 노드302 → 405: 차서연이 유저를 의심
    405: {
        "김도현": {'trust': 13, 'hostility': 96, 'composure': 52,   'Fleshy': 55},
        "차서연": {'trust': 22, 'suspicion': 101, 'caution': 94,   'Fleshy': 75},
        "엄마": {'trust': 80, 'guilt': 90, 'composure': 40,   'Fleshy': 20},
        "박도원": {'trust': 48, 'grief': 100, 'composure': 52,   'Fleshy': 40},
    },
    # 노드303 → 406: 박도원 몰래 따라감
    406: {
         "김도현": {'trust': 15, 'hostility': 89, 'composure': 60, 'Fleshy': 45},
         "차서연": {'trust': 28, 'suspicion': 94, 'caution': 91, 'Fleshy': 65},
         "엄마": {'trust': 80, 'guilt': 90, 'composure': 40, 'Fleshy': 20},
         "박도원": {'trust': 24, 'grief': 130, 'composure': 26, 'Fleshy': 80},
    },
    # 노드303 → 407: 박도원 안 따라감
    407: {
         "김도현": {'trust': 11, 'hostility': 104, 'composure': 44, 'Fleshy': 65},
         "차서연": {'trust': 28, 'suspicion': 94, 'caution': 91, 'Fleshy': 60},
         "엄마": {'trust': 80, 'guilt': 90, 'composure': 40, 'Fleshy': 20},
         "박도원": {'trust': 48, 'grief': 100, 'composure': 52, 'Fleshy': 40},
    },
    # 노드304 → 408: 차서연 재의심
    408: {
        "김도현": {'trust': 14, 'hostility': 92, 'composure': 56, 'Fleshy': 50},
        "차서연": {'trust': 0, 'suspicion': 135, 'caution': 110, 'Fleshy': 120},
        "엄마": {'trust': 80, 'guilt': 90, 'composure': 40, 'Fleshy': 20},
        "박도원": {'trust': 57, 'grief': 89, 'composure': 62, 'Fleshy': 25},
    },
    # 노드304 → 409: 김도현 무시하고 나감
    409: {
        "김도현": {'trust': 0, 'hostility': 145, 'composure': 0, 'Fleshy': 120},
        "차서연": {'trust': 40, 'suspicion': 75, 'caution': 82, 'Fleshy': 40},
        "엄마": {'trust': 80, 'guilt': 90, 'composure': 40, 'Fleshy': 20},
        "박도원": {'trust': 57, 'grief': 89, 'composure': 62, 'Fleshy': 25},
    },
    # 노드305 → 410: 차서연 "모른다"
    410: {
        "김도현": {'trust': 0, 'hostility': 145, 'composure': 0, 'Fleshy': 120},
        "차서연": {'trust': 42, 'suspicion': 71, 'caution': 80, 'Fleshy': 35},
        "엄마": {'trust': 80, 'guilt': 90, 'composure': 40, 'Fleshy': 20},
        "박도원": {'trust': 57, 'grief': 89, 'composure': 62, 'Fleshy': 25},
    },
    # 노드305 → 411: 차서연 "기억날 것 같다"
    411: {
       "김도현": {'trust': 14, 'hostility': 92, 'composure': 56, 'Fleshy': 50},
       "차서연": {'trust': 0, 'suspicion': 135, 'caution': 110, 'Fleshy': 120},
       "엄마": {'trust': 80, 'guilt': 90, 'composure': 40, 'Fleshy': 20},
       "박도원": {'trust': 57, 'grief': 89, 'composure': 62, 'Fleshy': 25},
    },
}