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


def _load_triggers() -> dict:
    """triggers.json을 읽어 dict로 반환. 파일 없으면 404."""
    if not TRIGGERS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=f"triggers.json not found at {TRIGGERS_PATH}"
        )
    with open(TRIGGERS_PATH, encoding="utf-8") as f:
        return json.load(f)


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
def get_clue_triggers(loop: Optional[int] = Query(default=1, ge=1, le=3)):
    """
    단서 트리거 목록 반환 (NPC 발화 감지용 / 이벤트 기반).

    Query param:
        loop (int, 1~3): 현재 루프 회차.

    Response:
        {
          "clue_triggers": [
            {
              "id": "clue_dohyun_record",
              "source": "npc",          // "npc" | "event"
              "npc": "김도현",           // source=npc일 때만
              "detect_words": ["그 애", ...],
              "event": "safe_opened",   // source=event일 때만
              "clue": { "icon": "...", "title": "...", "desc": "..." }
            },
            ...
          ]
        }
    """
    data = _load_triggers()
    all_triggers = data.get("clue_triggers", [])

    visible = [
        t for t in all_triggers
        if t.get("loop_visible", 1) <= loop
    ]

    cleaned = [
        {k: v for k, v in t.items() if k not in ("loop_visible",)}
        for t in visible
    ]

    return {"clue_triggers": cleaned}