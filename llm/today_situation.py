"""
채팅방 '오늘의 상황' — 버튼룸에서 정해진 상황을 NPC 프롬프트용 문장으로 만든다.

데이터: frontend/data/today_situations.json (화면 나레이션과 같은 파일)
  - 키: 버튼룸 최종 장면(400~411) = state["current_story"]
  - narration: 두 NPC 공통 상황 한 줄
  - npcs[NPC].presence / line: 이 NPC와 대면인지 문자인지, NPC별 한 줄

LLM에게는 화면에 보이지 않는 '고른 버튼 경로'(state["context"])도 함께 준다.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache

_DATA_PATH = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "frontend", "data", "today_situations.json"
))


@lru_cache(maxsize=1)
def _load_situations() -> dict:
    try:
        with open(_DATA_PATH, encoding="utf-8") as f:
            return json.load(f).get("situations", {})
    except (OSError, json.JSONDecodeError):
        return {}


def get_situation(final_node: int) -> dict | None:
    """최종 장면 번호(400~411)의 '오늘의 상황'. 없으면 None."""
    return _load_situations().get(str(final_node))


def build_today_situation(final_node: int, button_path: list[str], npc_name: str) -> str:
    """
    NPC 프롬프트 # Context에 넣을 <today_situation> 블록을 만든다.
    상황 데이터가 없으면(버튼룸을 거치지 않은 경우 등) 빈 문자열.
    """
    situation = get_situation(final_node)
    if not situation:
        return ""

    npc = situation.get("npcs", {}).get(npc_name, {})
    presence = npc.get("presence", "대면")
    how = (
        "지금 상대와 마주 보고 대화하고 있다."
        if presence == "대면"
        else "지금 상대와 직접 만나지 않고 휴대폰 문자로 대화하고 있다. 문자 메시지답게 말한다."
    )
    path = " → ".join(button_path) if button_path else "없음"

    return (
        "<today_situation>\n"
        f"- 장소: {situation.get('location', '')} · {situation.get('place', '')}\n"
        f"- 지금까지의 상황: {situation.get('narration', '')}\n"
        f"- 당신의 현재 상태: {npc.get('line', '')} ({how})\n"
        f"- 상대가 오늘 내린 선택: {path}\n"
        "</today_situation>"
    )
