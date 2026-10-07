"""
채팅방 '오늘의 상황' — 버튼룸에서 정해진 상황을 NPC 프롬프트용 문장으로 만든다.

데이터: frontend/data/today_situations.json (화면 나레이션과 같은 파일)
  - 키: 버튼룸 최종 장면(400~411) = state["current_story"]
  - narration, npcs[NPC].line: 화면 나레이션용 (플레이어 시점) — LLM에는 주지 않는다
  - npcs[NPC].npc_view: LLM 전용 (NPC 시점), {player}는 플레이어 닉네임
  - npcs[NPC].presence: 대면 | 문자

NPC에게는 그 NPC 시점의 문장(npc_view)과 장소·대화 방식만 준다.
플레이어가 고른 버튼 경로(state["context"])는 주지 않는다 — NPC가 직접 보지 않은 선택까지
아는 것처럼 말하게 되기 때문 (예: 박도원이 플레이어의 단서 탐색 행동을 언급).
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


def build_today_situation(
    final_node : int,
    npc_name   : str,
    player_name: str = "",
) -> str:
    """
    NPC 프롬프트 # Context에 넣을 <today_situation> 블록을 만든다.
    상황 데이터가 없으면(버튼룸을 거치지 않은 경우 등) 빈 문자열.

    화면용 나레이션(narration, line)은 플레이어 시점이라 NPC 프롬프트에 넣으면
    '당신'이 누구인지 섞인다. 그래서 LLM에는 NPC 시점으로 쓴 npc_view만 준다.
    """
    situation = get_situation(final_node)
    if not situation:
        return ""

    npc = situation.get("npcs", {}).get(npc_name, {})
    view = npc.get("npc_view", "").replace("{player}", player_name or "상대")
    presence = npc.get("presence", "대면")
    how = (
        "지금 상대와 마주 보고 대화하고 있다."
        if presence == "대면"
        else "지금 상대와 직접 만나지 않고 휴대폰 문자로 대화하고 있다. 문자 메시지답게 말한다."
    )
    return (
        "<today_situation>\n"
        f"- 장소: {situation.get('location', '')} · {situation.get('place', '')}\n"
        f"- 당신({npc_name}) 입장에서 지금까지 일어난 일: {view}\n"
        f"- 대화 방식: {how}\n"
        "</today_situation>"
    )
