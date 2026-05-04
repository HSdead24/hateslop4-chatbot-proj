"""
backend 구조적 동작 pytest 테스트.
chat_node를 mock 처리하여 LLM 실제 호출 없이 실행.

실행:
    cd backend
    pip install httpx pytest   # 패키지 없을 경우
    pytest tests/test_api.py -v
"""

import sys
import os
from unittest.mock import MagicMock
import pytest

# ── 경로 설정 (app import 전에 먼저 실행) ────────────────────────
_TESTS_DIR   = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_TESTS_DIR)
_LLM_DIR     = os.path.abspath(os.path.join(_BACKEND_DIR, "..", "llm"))
_NODES_DIR   = os.path.join(_LLM_DIR, "nodes")

for _p in (_NODES_DIR, _LLM_DIR, _BACKEND_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ── chat_node 모듈 mock (app import 전에 반드시 설정) ────────────
# chat_node 내부에서 langchain_openai 등 LLM 라이브러리를 import하므로
# sys.modules에 mock을 먼저 주입해 실제 import를 차단한다.
from state import GameState  # noqa: E402

def _mock_chat_node(state: GameState, user_input: str):
    updated = dict(state)
    updated["is_dead"] = False
    updated["is_loop_reset"] = False
    return GameState(**updated), "테스트 응답", None

_mock_mod = MagicMock()
_mock_mod.chat_node = _mock_chat_node
sys.modules["chat_node"] = _mock_mod

# ── app import ───────────────────────────────────────────────────
from fastapi.testclient import TestClient  # noqa: E402
from main import app                        # noqa: E402


# ════════════════════════════════════════════════════════════════
# Fixtures
# ════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient — 모듈 내 모든 테스트가 공유."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def session_id(client):
    """테스트마다 독립적인 새 게임 세션을 생성하고 session_id를 반환한다."""
    resp = client.post("/new-game", json={"player_name": "테스터", "player_gender": "남"})
    assert resp.status_code == 200, f"새 게임 생성 실패: {resp.text}"
    return resp.json()["session_id"]


@pytest.fixture
def finalized_session(client, session_id):
    """record-button → finalize 까지 완료된 세션(Phase 2 진입 상태)을 반환한다."""
    client.post("/record-button", json={"session_id": session_id, "button_id": 600})
    client.post("/finalize", json={
        "session_id": session_id,
        "last_button_id": 600,
        "context": ["선택지1", "선택지2"],
    })
    return session_id


# ════════════════════════════════════════════════════════════════
# POST /new-game
# ════════════════════════════════════════════════════════════════

class TestNewGame:
    def test_returns_session_id(self, client):
        resp = client.post("/new-game", json={"player_name": "테스터", "player_gender": "남"})

        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert isinstance(data["session_id"], str)
        assert len(data["session_id"]) > 0


# ════════════════════════════════════════════════════════════════
# GET /available-buttons
# ════════════════════════════════════════════════════════════════

class TestAvailableButtons:
    def test_empty_disabled_list_on_first_game(self, client, session_id):
        resp = client.get(f"/available-buttons?session_id={session_id}")

        assert resp.status_code == 200
        assert resp.json()["disabled_button_ids"] == []

    def test_404_on_invalid_session(self, client):
        resp = client.get("/available-buttons?session_id=nonexistent")

        assert resp.status_code == 404


# ════════════════════════════════════════════════════════════════
# POST /record-button
# ════════════════════════════════════════════════════════════════

class TestRecordButton:
    def test_returns_ok(self, client, session_id):
        resp = client.post(
            "/record-button",
            json={"session_id": session_id, "button_id": 600},
        )

        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_404_on_invalid_session(self, client):
        resp = client.post(
            "/record-button",
            json={"session_id": "nonexistent", "button_id": 600},
        )

        assert resp.status_code == 404


# ════════════════════════════════════════════════════════════════
# POST /finalize
# ════════════════════════════════════════════════════════════════

class TestFinalize:
    def test_has_required_fields(self, client, session_id):
        client.post("/record-button", json={"session_id": session_id, "button_id": 600})
        resp = client.post("/finalize", json={
            "session_id": session_id,
            "last_button_id": 600,
            "context": ["선택지1", "선택지2"],
        })

        assert resp.status_code == 200
        data = resp.json()
        assert "story_id" in data
        assert "npc_stats" in data
        assert "disabled_button_ids" in data

    def test_story_id_not_empty(self, client, session_id):
        client.post("/record-button", json={"session_id": session_id, "button_id": 600})
        resp = client.post("/finalize", json={
            "session_id": session_id,
            "last_button_id": 600,
            "context": [],
        })

        assert resp.json()["story_id"] != ""

    def test_selected_button_added_to_disabled(self, client, session_id):
        client.post("/record-button", json={"session_id": session_id, "button_id": 600})
        resp = client.post("/finalize", json={
            "session_id": session_id,
            "last_button_id": 600,
            "context": [],
        })

        assert 600 in resp.json()["disabled_button_ids"]

    def test_404_on_invalid_session(self, client):
        resp = client.post("/finalize", json={
            "session_id": "nonexistent",
            "last_button_id": 600,
            "context": [],
        })

        assert resp.status_code == 404


# ════════════════════════════════════════════════════════════════
# POST /new-loop
# ════════════════════════════════════════════════════════════════

class TestNewLoop:
    def test_loop_count_increments_to_2(self, client, finalized_session):
        resp = client.post("/new-loop", json={"session_id": finalized_session})

        assert resp.status_code == 200
        assert resp.json()["loop_count"] == 2

    def test_is_game_over_false_on_loop_2(self, client, finalized_session):
        resp = client.post("/new-loop", json={"session_id": finalized_session})

        assert resp.json()["is_game_over"] is False

    def test_404_on_invalid_session(self, client):
        resp = client.post("/new-loop", json={"session_id": "nonexistent"})

        assert resp.status_code == 404


# ════════════════════════════════════════════════════════════════
# 존재하지 않는 session_id → 전 엔드포인트 404
# ════════════════════════════════════════════════════════════════

class TestInvalidSession:
    """존재하지 않는 session_id에 대해 모든 엔드포인트가 404를 반환하는지 확인."""

    FAKE = "00000000-0000-0000-0000-000000000000"

    def test_available_buttons_404(self, client):
        assert client.get(f"/available-buttons?session_id={self.FAKE}").status_code == 404

    def test_record_button_404(self, client):
        assert client.post(
            "/record-button",
            json={"session_id": self.FAKE, "button_id": 600},
        ).status_code == 404

    def test_finalize_404(self, client):
        assert client.post(
            "/finalize",
            json={"session_id": self.FAKE, "last_button_id": 600, "context": []},
        ).status_code == 404

    def test_new_loop_404(self, client):
        assert client.post(
            "/new-loop",
            json={"session_id": self.FAKE},
        ).status_code == 404
