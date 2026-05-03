"""
버튼 선택 완료 후 확정되는 NPC 최종 수치 세트와
버튼 조합 → 스토리 매핑을 관리하는 파일.

스토리 수치 수정 시  → STORIES 딕셔너리에서 해당 스토리 키를 찾아 수정
버튼 조합 수정 시    → BUTTON_STORY_MAP에서 해당 tuple 키를 찾아 수정
스토리 추가 시       → STORIES에 항목 추가 후 BUTTON_STORY_MAP에 조합 연결
"""

# ────────────────────────────────────────────
# 스토리 목록
# ────────────────────────────────────────────

STORIES: dict[str, dict] = {

    # ── Sheet1 ────────────────────────────────────────────────

    "story_1": {  # 범인: 김도현
        "김도현": {"trust": 11, "hostility": 104, "composure": 65, "Fleshy": 65},
        "차서연": {"trust": 46, "suspicion": 75,  "caution": 82,   "Fleshy": 40},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_2": {  # 범인: 차서연
        "김도현": {"trust": 15, "hostility": 89,  "composure": 72, "Fleshy": 45},
        "차서연": {"trust": 35, "suspicion": 101, "caution": 94,   "Fleshy": 75},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_3": {  # 범인: 차서연
        "김도현": {"trust": 15, "hostility": 89,  "composure": 72, "Fleshy": 45},
        "차서연": {"trust": 35, "suspicion": 105, "caution": 96,   "Fleshy": 80},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_4": {  # 범인: 김도현
        "김도현": {"trust": 13, "hostility": 100, "composure": 65, "Fleshy": 55},
        "차서연": {"trust": 45, "suspicion": 79,  "caution": 84,   "Fleshy": 45},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_5": {  # 범인: 차서연
        "김도현": {"trust": 17, "hostility": 81,  "composure": 76, "Fleshy": 35},
        "차서연": {"trust": 35, "suspicion": 105, "caution": 96,   "Fleshy": 80},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_6": {  # 범인: 차서연
        "김도현": {"trust": 17, "hostility": 81,  "composure": 76, "Fleshy": 35},
        "차서연": {"trust": 35, "suspicion": 109, "caution": 98,   "Fleshy": 85},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_7": {  # 범인: 김도현
        "김도현": {"trust": 9,  "hostility": 111, "composure": 64, "Fleshy": 75},
        "차서연": {"trust": 45, "suspicion": 79,  "caution": 84,   "Fleshy": 45},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_8": {  # 범인: 차서연
        "김도현": {"trust": 13, "hostility": 96,  "composure": 70, "Fleshy": 55},
        "차서연": {"trust": 35, "suspicion": 105, "caution": 96,   "Fleshy": 80},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_9": {  # 범인: 차서연
        "김도현": {"trust": 13, "hostility": 96,  "composure": 70, "Fleshy": 55},
        "차서연": {"trust": 35, "suspicion": 109, "caution": 98,   "Fleshy": 85},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_10": {  # 범인: 김도현
        "김도현": {"trust": 11, "hostility": 104, "composure": 65, "Fleshy": 65},
        "차서연": {"trust": 44, "suspicion": 82,  "caution": 86,   "Fleshy": 50},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_11": {  # 범인: 차서연
        "김도현": {"trust": 15, "hostility": 89,  "composure": 72, "Fleshy": 45},
        "차서연": {"trust": 35, "suspicion": 109, "caution": 98,   "Fleshy": 85},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_12": {  # 범인: 차서연
        "김도현": {"trust": 15, "hostility": 89,  "composure": 72, "Fleshy": 45},
        "차서연": {"trust": 35, "suspicion": 112, "caution": 100,  "Fleshy": 90},
        "엄마":   {"trust": 79, "guilt": 94,       "composure": 38, "Fleshy": 25},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_13": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 48, "suspicion": 68,  "caution": 78,   "Fleshy": 30},
        "엄마":   {"trust": 70, "guilt": 128,      "composure": 25, "Fleshy": 70},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_14": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 46, "suspicion": 75,  "caution": 82,   "Fleshy": 40},
        "엄마":   {"trust": 70, "guilt": 128,      "composure": 25, "Fleshy": 70},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_15": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 48, "suspicion": 68,  "caution": 78,   "Fleshy": 30},
        "엄마":   {"trust": 70, "guilt": 125,      "composure": 26, "Fleshy": 65},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_16": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 46, "suspicion": 75,  "caution": 82,   "Fleshy": 40},
        "엄마":   {"trust": 70, "guilt": 125,      "composure": 26, "Fleshy": 65},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_17": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 48, "suspicion": 68,  "caution": 78,   "Fleshy": 30},
        "엄마":   {"trust": 69, "guilt": 131,      "composure": 24, "Fleshy": 75},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_18": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 46, "suspicion": 75,  "caution": 82,   "Fleshy": 40},
        "엄마":   {"trust": 69, "guilt": 131,      "composure": 24, "Fleshy": 75},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_19": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 48, "suspicion": 68,  "caution": 78,   "Fleshy": 30},
        "엄마":   {"trust": 70, "guilt": 128,      "composure": 25, "Fleshy": 70},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_20": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 46, "suspicion": 75,  "caution": 82,   "Fleshy": 40},
        "엄마":   {"trust": 70, "guilt": 128,      "composure": 25, "Fleshy": 70},
        "박도원": {"trust": 60, "grief": 85,        "composure": 65, "Fleshy": 20},
    },
    "story_21": {  # 범인: 김도현
        "김도현": {"trust": 9,  "hostility": 111, "composure": 64, "Fleshy": 75},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 78, "guilt": 98,       "composure": 37, "Fleshy": 30},
        "박도원": {"trust": 58, "grief": 92,        "composure": 62, "Fleshy": 30},
    },
    "story_22": {  # 범인: 김도현
        "김도현": {"trust": 10, "hostility": 108, "composure": 65, "Fleshy": 70},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 76, "guilt": 105,      "composure": 34, "Fleshy": 40},
        "박도원": {"trust": 58, "grief": 92,        "composure": 62, "Fleshy": 30},
    },
    "story_23": {  # 범인: 김도현
        "김도현": {"trust": 9,  "hostility": 111, "composure": 64, "Fleshy": 75},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 77, "guilt": 101,      "composure": 36, "Fleshy": 35},
        "박도원": {"trust": 58, "grief": 92,        "composure": 62, "Fleshy": 30},
    },
    "story_24": {  # 범인: 김도현
        "김도현": {"trust": 10, "hostility": 108, "composure": 65, "Fleshy": 70},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 75, "guilt": 109,      "composure": 32, "Fleshy": 45},
        "박도원": {"trust": 58, "grief": 92,        "composure": 62, "Fleshy": 30},
    },
    "story_25": {  # 범인: 김도현
        "김도현": {"trust": 10, "hostility": 108, "composure": 65, "Fleshy": 70},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 78, "guilt": 98,       "composure": 37, "Fleshy": 30},
        "박도원": {"trust": 58, "grief": 92,        "composure": 62, "Fleshy": 30},
    },
    "story_26": {  # 범인: 김도현
        "김도현": {"trust": 11, "hostility": 104, "composure": 65, "Fleshy": 65},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 76, "guilt": 105,      "composure": 34, "Fleshy": 40},
        "박도원": {"trust": 58, "grief": 92,        "composure": 62, "Fleshy": 30},
    },
    "story_27": {  # 범인: 김도현
        "김도현": {"trust": 10, "hostility": 108, "composure": 65, "Fleshy": 70},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 77, "guilt": 101,      "composure": 36, "Fleshy": 35},
        "박도원": {"trust": 58, "grief": 92,        "composure": 62, "Fleshy": 30},
    },
    "story_28": {  # 범인: 김도현
        "김도현": {"trust": 11, "hostility": 104, "composure": 65, "Fleshy": 65},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 75, "guilt": 109,      "composure": 32, "Fleshy": 45},
        "박도원": {"trust": 58, "grief": 92,        "composure": 62, "Fleshy": 30},
    },
    "story_29": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 70, "guilt": 128,      "composure": 25, "Fleshy": 70},
        "박도원": {"trust": 53, "grief": 111,       "composure": 54, "Fleshy": 55},
    },
    "story_30": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 78, "guilt": 98,       "composure": 37, "Fleshy": 30},
        "박도원": {"trust": 45, "grief": 126,       "composure": 45, "Fleshy": 75},
    },
    "story_31": {  # 범인: 엄마
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 75, "guilt": 109,      "composure": 32, "Fleshy": 45},
        "박도원": {"trust": 61, "grief": 81,        "composure": 66, "Fleshy": 10},
    },
    "story_32": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 76, "guilt": 105,      "composure": 34, "Fleshy": 40},
        "박도원": {"trust": 45, "grief": 141,       "composure": 42, "Fleshy": 95},
    },
    "story_33": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 76, "guilt": 105,      "composure": 34, "Fleshy": 40},
        "박도원": {"trust": 39, "grief": 164,       "composure": 34, "Fleshy": 125},
    },
    "story_34": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 76, "guilt": 105,      "composure": 34, "Fleshy": 40},
        "박도원": {"trust": 39, "grief": 164,       "composure": 34, "Fleshy": 125},
    },
    "story_35": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 77, "guilt": 101,      "composure": 36, "Fleshy": 35},
        "박도원": {"trust": 45, "grief": 141,       "composure": 42, "Fleshy": 95},
    },
    "story_36": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 77, "guilt": 101,      "composure": 36, "Fleshy": 35},
        "박도원": {"trust": 39, "grief": 164,       "composure": 34, "Fleshy": 125},
    },
    "story_37": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 77, "guilt": 101,      "composure": 36, "Fleshy": 35},
        "박도원": {"trust": 39, "grief": 164,       "composure": 34, "Fleshy": 125},
    },
    "story_38": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 75, "guilt": 109,      "composure": 32, "Fleshy": 45},
        "박도원": {"trust": 45, "grief": 141,       "composure": 42, "Fleshy": 95},
    },
    "story_39": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 75, "guilt": 109,      "composure": 32, "Fleshy": 45},
        "박도원": {"trust": 39, "grief": 164,       "composure": 34, "Fleshy": 125},
    },
    "story_40": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 75, "guilt": 109,      "composure": 32, "Fleshy": 45},
        "박도원": {"trust": 39, "grief": 164,       "composure": 34, "Fleshy": 125},
    },
    "story_41": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 76, "guilt": 105,      "composure": 34, "Fleshy": 40},
        "박도원": {"trust": 45, "grief": 141,       "composure": 42, "Fleshy": 95},
    },
    "story_42": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 76, "guilt": 105,      "composure": 34, "Fleshy": 40},
        "박도원": {"trust": 39, "grief": 164,       "composure": 34, "Fleshy": 125},
    },
    "story_43": {  # 범인: 박도원
        "김도현": {"trust": 20, "hostility": 70,  "composure": 80, "Fleshy": 20},
        "차서연": {"trust": 50, "suspicion": 60,  "caution": 75,   "Fleshy": 20},
        "엄마":   {"trust": 76, "guilt": 105,      "composure": 34, "Fleshy": 40},
        "박도원": {"trust": 39, "grief": 164,       "composure": 34, "Fleshy": 125},
    },

    # ── Sheet2 ────────────────────────────────────────────────

    "story_44": {  # 범인: 김도현
        "김도현": {"trust": 0,  "hostility": 145, "composure": 0,  "Fleshy": 120},
        "차서연": {"trust": 40, "suspicion": 75,  "caution": 82,   "Fleshy": 40},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_45": {  # 범인: 김도현
        "김도현": {"trust": 0,  "hostility": 145, "composure": 0,  "Fleshy": 120},
        "차서연": {"trust": 42, "suspicion": 71,  "caution": 80,   "Fleshy": 35},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_46": {  # 범인: 차서연
        "김도현": {"trust": 14, "hostility": 92,  "composure": 56, "Fleshy": 50},
        "차서연": {"trust": 0,  "suspicion": 135, "caution": 110,  "Fleshy": 120},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_47": {  # 범인: 차서연
        "김도현": {"trust": 14, "hostility": 92,  "composure": 56, "Fleshy": 50},
        "차서연": {"trust": 0,  "suspicion": 135, "caution": 110,  "Fleshy": 120},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_48": {  # 범인: 김도현
        "김도현": {"trust": 11, "hostility": 104, "composure": 44, "Fleshy": 65},
        "차서연": {"trust": 35, "suspicion": 82,  "caution": 86,   "Fleshy": 50},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_49": {  # 범인: 차서연
        "김도현": {"trust": 13, "hostility": 96,  "composure": 52, "Fleshy": 55},
        "차서연": {"trust": 22, "suspicion": 101, "caution": 94,   "Fleshy": 75},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_50": {  # 범인: 차서연
        "김도현": {"trust": 15, "hostility": 89,  "composure": 60, "Fleshy": 45},
        "차서연": {"trust": 10, "suspicion": 120, "caution": 103,  "Fleshy": 100},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_51": {  # 범인: 김도현
        "김도현": {"trust": 12, "hostility": 100, "composure": 48, "Fleshy": 60},
        "차서연": {"trust": 25, "suspicion": 98,  "caution": 92,   "Fleshy": 70},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_52": {  # 범인: 김도현
        "김도현": {"trust": 0,  "hostility": 145, "composure": 0,  "Fleshy": 120},
        "차서연": {"trust": 38, "suspicion": 79,  "caution": 84,   "Fleshy": 45},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_53": {  # 범인: 김도현
        "김도현": {"trust": 0,  "hostility": 145, "composure": 0,  "Fleshy": 120},
        "차서연": {"trust": 35, "suspicion": 82,  "caution": 86,   "Fleshy": 50},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_54": {  # 범인: 차서연
        "김도현": {"trust": 14, "hostility": 92,  "composure": 56, "Fleshy": 50},
        "차서연": {"trust": 0,  "suspicion": 135, "caution": 110,  "Fleshy": 120},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_55": {  # 범인: 차서연
        "김도현": {"trust": 14, "hostility": 92,  "composure": 56, "Fleshy": 50},
        "차서연": {"trust": 0,  "suspicion": 135, "caution": 110,  "Fleshy": 120},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_56": {  # 범인: 차서연
        "김도현": {"trust": 13, "hostility": 96,  "composure": 52, "Fleshy": 55},
        "차서연": {"trust": 22, "suspicion": 101, "caution": 94,   "Fleshy": 75},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_57": {  # 범인: 차서연
        "김도현": {"trust": 15, "hostility": 89,  "composure": 60, "Fleshy": 45},
        "차서연": {"trust": 10, "suspicion": 120, "caution": 103,  "Fleshy": 100},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_58": {  # 범인: 차서연
        "김도현": {"trust": 15, "hostility": 89,  "composure": 60, "Fleshy": 45},
        "차서연": {"trust": 10, "suspicion": 120, "caution": 103,  "Fleshy": 100},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_59": {  # 범인: 김도현
        "김도현": {"trust": 13, "hostility": 96,  "composure": 52, "Fleshy": 55},
        "차서연": {"trust": 22, "suspicion": 101, "caution": 94,   "Fleshy": 75},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_60": {  # 범인: 차서연
        "김도현": {"trust": 13, "hostility": 96,  "composure": 52, "Fleshy": 55},
        "차서연": {"trust": 22, "suspicion": 101, "caution": 94,   "Fleshy": 75},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 51, "grief": 96,        "composure": 55, "Fleshy": 35},
    },
    "story_61": {  # 범인: 차서연
        "김도현": {"trust": 13, "hostility": 96,  "composure": 52, "Fleshy": 55},
        "차서연": {"trust": 22, "suspicion": 101, "caution": 94,   "Fleshy": 75},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_62": {  # 범인: 박도원
        "김도현": {"trust": 15, "hostility": 89,  "composure": 60, "Fleshy": 45},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 24, "grief": 130,       "composure": 26, "Fleshy": 80},
    },
    "story_63": {  # 범인: 차서연
        "김도현": {"trust": 13, "hostility": 96,  "composure": 52, "Fleshy": 55},
        "차서연": {"trust": 22, "suspicion": 101, "caution": 94,   "Fleshy": 75},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_64": {  # 범인: 차서연
        "김도현": {"trust": 13, "hostility": 96,  "composure": 52, "Fleshy": 55},
        "차서연": {"trust": 22, "suspicion": 101, "caution": 94,   "Fleshy": 75},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_65": {  # 범인: 박도원
        "김도현": {"trust": 15, "hostility": 89,  "composure": 60, "Fleshy": 45},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 24, "grief": 130,       "composure": 26, "Fleshy": 80},
    },
    "story_66": {  # 범인: 김도현
        "김도현": {"trust": 11, "hostility": 104, "composure": 44, "Fleshy": 65},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_67": {  # 범인: 김도현
        "김도현": {"trust": 11, "hostility": 104, "composure": 44, "Fleshy": 65},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_68": {  # 범인: 박도원
        "김도현": {"trust": 15, "hostility": 89,  "composure": 60, "Fleshy": 45},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 24, "grief": 130,       "composure": 26, "Fleshy": 80},
    },
    "story_69": {  # 범인: 김도현
        "김도현": {"trust": 11, "hostility": 104, "composure": 44, "Fleshy": 65},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_70": {  # 범인: 김도현
        "김도현": {"trust": 9,  "hostility": 111, "composure": 36, "Fleshy": 75},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_71": {  # 범인: 김도현
        "김도현": {"trust": 9,  "hostility": 111, "composure": 36, "Fleshy": 75},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_72": {  # 범인: 김도현
        "김도현": {"trust": 7,  "hostility": 119, "composure": 28, "Fleshy": 85},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_73": {  # 범인: 차서연
        "김도현": {"trust": 14, "hostility": 92,  "composure": 56, "Fleshy": 50},
        "차서연": {"trust": 10, "suspicion": 120, "caution": 103,  "Fleshy": 100},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_74": {  # 범인: 차서연
        "김도현": {"trust": 14, "hostility": 92,  "composure": 56, "Fleshy": 50},
        "차서연": {"trust": 10, "suspicion": 120, "caution": 103,  "Fleshy": 100},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_75": {  # 범인: 박도원
        "김도현": {"trust": 15, "hostility": 89,  "composure": 60, "Fleshy": 45},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 24, "grief": 130,       "composure": 26, "Fleshy": 80},
    },
    "story_76": {  # 범인: 김도현
        "김도현": {"trust": 7,  "hostility": 119, "composure": 28, "Fleshy": 85},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_77": {  # 범인: 김도현
        "김도현": {"trust": 5,  "hostility": 126, "composure": 20, "Fleshy": 95},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_78": {  # 범인: 김도현
        "김도현": {"trust": 7,  "hostility": 119, "composure": 28, "Fleshy": 85},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_79": {  # 범인: 김도현
        "김도현": {"trust": 5,  "hostility": 126, "composure": 20, "Fleshy": 95},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_80": {  # 범인: 차서연
        "김도현": {"trust": 14, "hostility": 92,  "composure": 56, "Fleshy": 50},
        "차서연": {"trust": 10, "suspicion": 120, "caution": 103,  "Fleshy": 100},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 57, "grief": 89,        "composure": 62, "Fleshy": 25},
    },
    "story_81": {  # 범인: 김도현
        "김도현": {"trust": 7,  "hostility": 119, "composure": 28, "Fleshy": 85},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_82": {  # 범인: 박도원
        "김도현": {"trust": 15, "hostility": 89,  "composure": 60, "Fleshy": 45},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 24, "grief": 130,       "composure": 26, "Fleshy": 80},
    },
    "story_83": {  # 범인: 김도현
        "김도현": {"trust": 7,  "hostility": 119, "composure": 28, "Fleshy": 85},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_84": {  # 범인: 김도현
        "김도현": {"trust": 5,  "hostility": 126, "composure": 20, "Fleshy": 95},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 48, "grief": 100,       "composure": 52, "Fleshy": 40},
    },
    "story_85": {  # 범인: 박도원
        "김도현": {"trust": 15, "hostility": 89,  "composure": 60, "Fleshy": 45},
        "차서연": {"trust": 28, "suspicion": 94,  "caution": 91,   "Fleshy": 65},
        "엄마":   {"trust": 80, "guilt": 90,       "composure": 40, "Fleshy": 20},
        "박도원": {"trust": 24, "grief": 130,       "composure": 26, "Fleshy": 80},
    },
}


# ────────────────────────────────────────────
# 버튼 조합 → 스토리 매핑
# ────────────────────────────────────────────
# Phase 1에서 유저가 선택한 버튼 순서(tuple)를 스토리 ID에 매핑한다.
# 순서가 다르면 다른 스토리로 판단한다.
# 매핑되는 조합이 없으면 button_node.py에서 DEFAULT_STORY를 기본값으로 사용한다.
# [프로듀서 확정 후 조합 채우기]
# ────────────────────────────────────────────

BUTTON_STORY_MAP: dict[tuple, str] = {
    # ("A", "B", "A", "A"): "story_1",  # 프로듀서 확정 후 채우기
}