# ═══════════════════════════════════════════════════════
#  backend/api/triggers.py
#  GET /chiki-triggers  — triggers.json 읽어서 반환
#  GET /clue-triggers   — clue_triggers 블록 반환
#
#  triggers.json 위치: 프로젝트 루트 data/triggers.json
#  경로를 바꾸려면 config.py의 TRIGGERS_PATH 수정
# ═══════════════════════════════════════════════════════

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter()

# ── 경로 설정 ────────────────────────────────────────
# config.py에서 가져오도록 바꾸려면:
#   from config import TRIGGERS_PATH
TRIGGERS_PATH = Path(__file__).parent.parent.parent / "llm" / "vector_store" / "data" / "triggers.json"

# ── 루트별 NPC 매핑 ──────────────────────────────────
# first_button=101(출근) 루트에서만 등장하는 NPC
_ROUTE_101_NPCS: frozenset[str] = frozenset({"김도현", "박도원", "차서연"})
# first_button=100(집) 루트에서만 등장하는 NPC
_ROUTE_100_NPCS: frozenset[str] = frozenset({"엄마"})


def _load_triggers() -> dict:
    """triggers.json을 읽어 dict로 반환. 파일 없으면 404."""
    if not TRIGGERS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=f"triggers.json not found at {TRIGGERS_PATH}"
        )
    with open(TRIGGERS_PATH, encoding="utf-8") as f:
        return json.load(f)


def _is_clue_visible(trigger: dict, loop: int, first_button: Optional[int]) -> bool:
    """
    clue_trigger 하나가 현재 조건에서 공개 가능한지 판단.

    - loop_visible: 해당 루프 이상이어야 공개
    - npc 필드가 있으면 루트(first_button) 조건 적용
      · 출근 루트(101) 전용 NPC → first_button == 101 일 때만
      · 집 루트(100) 전용 NPC  → first_button == 100 일 때만
    - source == 'event' 또는 npc 없으면 루트 무관
    """
    if trigger.get("loop_visible", 1) > loop:
        return False

    npc = trigger.get("npc")
    if npc is None:
        return True  # 이벤트 트리거 등 — 루트 무관

    if npc in _ROUTE_101_NPCS and first_button != 101:
        return False
    if npc in _ROUTE_100_NPCS and first_button != 100:
        return False

    return True


def _calc_total_clues(all_triggers: list[dict], loop: int, first_button: Optional[int]) -> int:
    """
    현재 루프·루트 조건에서 획득 가능한 단서 총 개수 계산.

    package_delivery 트리거(clue_package + clue_seoyeon_watch)는
    같은 단서 1개를 공유하므로 중복 카운트 방지.
    """
    count = 0
    package_counted = False  # package_delivery 단서 중복 방지

    for t in all_triggers:
        if not _is_clue_visible(t, loop, first_button):
            continue

        if t.get("package_delivery"):
            if not package_counted:
                count += 1
                package_counted = True
        elif t.get("clue"):
            count += 1

    return count


# ── 엔드포인트 ───────────────────────────────────────

@router.get("/chiki-triggers")
def get_chiki_triggers(loop: Optional[int] = Query(default=1, ge=1, le=3)):
    """
    치키 트리거 목록 반환.

    Query param:
        loop (int, 1~3): 현재 루프 회차.
                         loop_visible 값이 loop 이하인 트리거만 반환.
                         생략 시 loop=1 (전체 중 loop1 공개 범위).

    Response:
        {
          "chiki_triggers": [
            {
              "id": "hayun",
              "words": ["김하윤", "하윤"],
              "toast": "🐰 …",
              "msg": "...",
              "clue": { "icon": "🗝️", "title": "...", "desc": "..." }
            },
            ...
          ]
        }
    """
    data = _load_triggers()
    all_triggers = data.get("chiki_triggers", [])

    # loop_visible 필터: 값이 없으면 항상 공개
    visible = [
        t for t in all_triggers
        if t.get("loop_visible", 1) <= loop
    ]

    # 클라이언트에 불필요한 내부 필드 제거
    cleaned = [
        {k: v for k, v in t.items() if k not in ("loop_visible",)}
        for t in visible
    ]

    return {"chiki_triggers": cleaned}


@router.get("/clue-triggers")
def get_clue_triggers(
    loop: Optional[int] = Query(default=1, ge=1, le=3),
    first_button: Optional[int] = Query(default=None, description="버튼룸 첫 선택 ID (100=집, 101=출근)"),
):
    """
    단서 트리거 목록 반환 (NPC 발화 감지용 / 이벤트 기반).

    Query params:
        loop (int, 1~3)       : 현재 루프 회차.
        first_button (int|None): 버튼룸 첫 선택 ID.
                                 100=집 루트, 101=출근 루트.
                                 미전달 시 루트 필터 미적용(전체 반환).

    Response:
        {
          "clue_triggers": [...],
          "total_clues": 3        // 현재 조건에서 획득 가능한 단서 총 개수
        }
    """
    data = _load_triggers()
    all_triggers = data.get("clue_triggers", [])

    visible = [t for t in all_triggers if _is_clue_visible(t, loop, first_button)]

    cleaned = [
        {k: v for k, v in t.items() if k not in ("loop_visible",)}
        for t in visible
    ]

    total = _calc_total_clues(all_triggers, loop, first_button)

    return {"clue_triggers": cleaned, "total_clues": total}
