"""
버튼 선택 완료 후 확정되는 NPC 최종 수치 세트와
버튼 조합 → 스토리 매핑을 관리하는 파일.

스토리 수치 수정 시  → STORIES 딕셔너리에서 해당 스토리 키를 찾아 수정
버튼 조합 수정 시    → BUTTON_STORY_MAP에서 해당 마지막 버튼 ID(int)를 찾아 수정
스토리 추가 시       → STORIES에 항목 추가 후 BUTTON_STORY_MAP에 조합 연결
"""

# ────────────────────────────────────────────
# 스토리 목록
# ────────────────────────────────────────────

STORIES: dict[str, dict] = {

    # ── Sheet1 ────────────────────────────────────────────────

    "400": {  # 범인: 김도현
        "김도현":    {"trust": 10, "hostility": 70, "composure": 80, "Fleshy": 90},
        "차서연":    {"trust": 20, "suspicion": 60, "caution": 75, "Fleshy": 30},
        "엄마":     {"trust": 100, "guilt": 90, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 60, "grief": 85, "composure": 65, "Fleshy": 20},
    },
    "401": {  # 범인: 차서연
        "김도현":    {"trust": 20, "hostility": 70, "composure": 80, "Fleshy": 20},
        "차서연":    {"trust": 20, "suspicion": 60, "caution": 75, "Fleshy": 20},
        "엄마":     {"trust": 100, "guilt": 90, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 30, "grief": 85, "composure": 65, "Fleshy": 70},
    },
    "402": {  # 범인: 차서연
        "김도현":    {"trust": 20, "hostility": 80, "composure": 80, "Fleshy": 20},
        "차서연":    {"trust": 20, "suspicion": 60, "caution": 75, "Fleshy": 20},
        "엄마":     {"trust": 10, "guilt": 94, "composure": 38, "Fleshy": 60},
        "박도원":    {"trust": 30, "grief": 85, "composure": 65, "Fleshy": 60},
    },
    "403": {  # 범인: 김도현
        "김도현":    {"trust": 20, "hostility": 70, "composure": 80, "Fleshy": 20},
        "차서연":    {"trust": 10, "suspicion": 80, "caution": 75, "Fleshy": 60},
        "엄마":     {"trust": 100, "guilt": 90, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 30, "grief": 85, "composure": 65, "Fleshy": 70},
    },
    "404": {  # 범인: 차서연
        "김도현":    {"trust": 17, "hostility": 81, "composure": 76, "Fleshy": 32},
        "차서연":    {"trust": 35, "suspicion": 105, "caution": 96, "Fleshy": 100},
        "엄마":     {"trust": 79, "guilt": 94, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 60, "grief": 85, "composure": 65, "Fleshy": 20},
    },
    "405": {  # 범인: 차서연
        "김도현":    {"trust": 17, "hostility": 81, "composure": 76, "Fleshy": 32},
        "차서연":    {"trust": 35, "suspicion": 109, "caution": 98, "Fleshy": 102},
        "엄마":     {"trust": 79, "guilt": 94, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 60, "grief": 85, "composure": 65, "Fleshy": 20},
    },
    "406": {  # 범인: 김도현
        "김도현":    {"trust": 9, "hostility": 111, "composure": 64, "Fleshy": 97},
        "차서연":    {"trust": 45, "suspicion": 79, "caution": 84, "Fleshy": 39},
        "엄마":     {"trust": 79, "guilt": 94, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 60, "grief": 85, "composure": 65, "Fleshy": 20},
    },
    "407": {  # 범인: 차서연
        "김도현":    {"trust": 13, "hostility": 96, "composure": 70, "Fleshy": 47},
        "차서연":    {"trust": 35, "suspicion": 105, "caution": 96, "Fleshy": 100},
        "엄마":     {"trust": 79, "guilt": 94, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 60, "grief": 85, "composure": 65, "Fleshy": 20},
    },
    "408": {  # 범인: 차서연
        "김도현":    {"trust": 13, "hostility": 96, "composure": 70, "Fleshy": 47},
        "차서연":    {"trust": 35, "suspicion": 109, "caution": 98, "Fleshy": 102},
        "엄마":     {"trust": 79, "guilt": 94, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 60, "grief": 85, "composure": 65, "Fleshy": 20},
    },
    "409": {  # 범인: 김도현
        "김도현":    {"trust": 11, "hostility": 104, "composure": 65, "Fleshy": 91},
        "차서연":    {"trust": 44, "suspicion": 82, "caution": 86, "Fleshy": 43},
        "엄마":     {"trust": 79, "guilt": 94, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 60, "grief": 85, "composure": 65, "Fleshy": 20},
    },
    "410": {  # 범인: 김도현
        "김도현":    {"trust": 11, "hostility": 104, "composure": 65, "Fleshy": 91},
        "차서연":    {"trust": 44, "suspicion": 82, "caution": 86, "Fleshy": 43},
        "엄마":     {"trust": 79, "guilt": 94, "composure": 38, "Fleshy": 24},
        "박도원":    {"trust": 60, "grief": 85, "composure": 65, "Fleshy": 20},
    }
}


# ────────────────────────────────────────────
# 버튼 조합 → 스토리 매핑
# ────────────────────────────────────────────
# 유저가 마지막으로 누른 버튼 ID 하나로 스토리를 확정한다.
# 백의 자리 = 선택 화면 번호, 나머지 = 해당 화면의 옵션 순번
# Sheet1 선택1 고정: 100 (집에 있는다)
# Sheet2 선택1 고정: 101 (출근한다)
# 매핑되는 ID가 없으면 button_node.py에서 DEFAULT_STORY를 기본값으로 사용한다.
# ────────────────────────────────────────────

BUTTON_STORY_MAP: dict[int, str] = {
    600: "story_1",   # 범인: 김도현
    700: "story_2",   # 범인: 차서연
    701: "story_3",   # 범인: 차서연
    602: "story_4",   # 범인: 김도현
    702: "story_5",   # 범인: 차서연
    703: "story_6",   # 범인: 차서연
    604: "story_7",   # 범인: 김도현
    704: "story_8",   # 범인: 차서연
    705: "story_9",   # 범인: 차서연
    606: "story_10",  # 범인: 김도현
    706: "story_11",  # 범인: 차서연
    707: "story_12",  # 범인: 차서연
    608: "story_13",  # 범인: 엄마
    609: "story_14",  # 범인: 엄마
    610: "story_15",  # 범인: 엄마
    611: "story_16",  # 범인: 엄마
    612: "story_17",  # 범인: 엄마
    613: "story_18",  # 범인: 엄마
    614: "story_19",  # 범인: 엄마
    615: "story_20",  # 범인: 엄마
    708: "story_21",  # 범인: 김도현
    709: "story_22",  # 범인: 김도현
    710: "story_23",  # 범인: 김도현
    711: "story_24",  # 범인: 김도현
    712: "story_25",  # 범인: 김도현
    713: "story_26",  # 범인: 김도현
    714: "story_27",  # 범인: 김도현
    715: "story_28",  # 범인: 김도현
    620: "story_29",  # 범인: 엄마
    621: "story_30",  # 범인: 박도원
    511: "story_31",  # 범인: 엄마
    622: "story_32",  # 범인: 박도원
    716: "story_33",  # 범인: 박도원
    717: "story_34",  # 범인: 박도원
    624: "story_35",  # 범인: 박도원
    718: "story_36",  # 범인: 박도원
    719: "story_37",  # 범인: 박도원
    626: "story_38",  # 범인: 박도원
    720: "story_39",  # 범인: 박도원
    721: "story_40",  # 범인: 박도원
    628: "story_41",  # 범인: 박도원
    722: "story_42",  # 범인: 박도원
    723: "story_43",  # 범인: 박도원
    724: "story_44",  # 범인: 김도현
    725: "story_45",  # 범인: 김도현
    726: "story_46",  # 범인: 차서연
    727: "story_47",  # 범인: 차서연
    728: "story_48",  # 범인: 김도현
    729: "story_49",  # 범인: 차서연
    730: "story_50",  # 범인: 차서연
    731: "story_51",  # 범인: 김도현
    732: "story_52",  # 범인: 김도현
    733: "story_53",  # 범인: 김도현
    734: "story_54",  # 범인: 차서연
    735: "story_55",  # 범인: 차서연
    736: "story_56",  # 범인: 차서연
    737: "story_57",  # 범인: 차서연
    738: "story_58",  # 범인: 차서연
    739: "story_59",  # 범인: 김도현
    740: "story_60",  # 범인: 차서연
    741: "story_61",  # 범인: 차서연
    742: "story_62",  # 범인: 박도원
    743: "story_63",  # 범인: 차서연
    744: "story_64",  # 범인: 차서연
    745: "story_65",  # 범인: 박도원
    746: "story_66",  # 범인: 김도현
    747: "story_67",  # 범인: 김도현
    748: "story_68",  # 범인: 박도원
    749: "story_69",  # 범인: 김도현
    750: "story_70",  # 범인: 김도현
    751: "story_71",  # 범인: 박도원
    752: "story_72",  # 범인: 김도현
    753: "story_73",  # 범인: 김도현
    754: "story_74",  # 범인: 김도현
    755: "story_75",  # 범인: 김도현
    756: "story_76",  # 범인: 차서연
    757: "story_77",  # 범인: 차서연
    758: "story_78",  # 범인: 박도원
    759: "story_79",  # 범인: 김도현
    760: "story_80",  # 범인: 김도현
    761: "story_81",  # 범인: 김도현
    762: "story_82",  # 범인: 김도현
    763: "story_83",  # 범인: 차서연
    764: "story_84",  # 범인: 김도현
    765: "story_85",  # 범인: 박도원
}