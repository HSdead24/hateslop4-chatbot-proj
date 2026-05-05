#!/bin/bash
# test_integration.sh — 실제 흐름 통합 테스트 (토큰 절약: /chat 1회)
# 실행: bash test_integration.sh

BASE_URL="http://localhost:8000"

echo "=== 통합 테스트 시작 ==="

# JSON에서 특정 키 값 추출 (python3 사용)
json_val() { echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('$2',''))" 2>/dev/null; }

# ── STEP 1: /new-game ────────────────────────────────────────────
echo ""
echo "[1/10] POST /new-game"
R=$(curl -s -X POST "$BASE_URL/new-game" \
  -H "Content-Type: application/json" \
  -d '{"player_name":"통합테스터","player_gender":"남"}')
echo "  응답: $R"
SID=$(json_val "$R" "session_id")
if [ -z "$SID" ]; then echo "FAIL: session_id 없음"; exit 1; fi
echo "  session_id: $SID"

# ── STEP 2: /available-buttons ───────────────────────────────────
echo ""
echo "[2/10] GET /available-buttons"
R=$(curl -s "$BASE_URL/available-buttons?session_id=$SID")
echo "  응답: $R"
echo "$R" | grep -q "disabled_button_ids" || { echo "FAIL: disabled_button_ids 없음"; exit 1; }
echo "  OK"

# ── STEP 3~8: /record-button (100~600) ───────────────────────────
STEP=3
for BTN in 100 200 300 400 500 600; do
  echo ""
  echo "[$STEP/10] POST /record-button (button_id=$BTN)"
  R=$(curl -s -X POST "$BASE_URL/record-button" \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"$SID\",\"button_id\":$BTN}")
  echo "  응답: $R"
  echo "$R" | grep -q '"ok"' || { echo "FAIL: record-button $BTN 실패"; exit 1; }
  echo "  OK"
  STEP=$((STEP + 1))
done

# ── STEP 9: /finalize ────────────────────────────────────────────
echo ""
echo "[9/10] POST /finalize"
R=$(curl -s -X POST "$BASE_URL/finalize" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SID\",\"last_button_id\":600,\"context\":[\"선택지1\",\"선택지2\"]}")
echo "  응답: $R"
echo "$R" | grep -q '"story_id"' || { echo "FAIL: finalize 실패"; exit 1; }
echo "  OK"

# ── STEP 10: /chat (1회 — 실제 LLM 호출) ────────────────────────
echo ""
echo "[10/10] POST /chat  ← 토큰 사용 (1회)"
CHAT_R=$(curl -s -X POST "$BASE_URL/chat" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SID\",\"npc_name\":\"김도현\",\"user_input\":\"안녕하세요\"}")
echo "  응답: $CHAT_R"

# ── 결과 요약 ─────────────────────────────────────────────────────
echo ""
echo "==========================================="
echo "            통합 테스트 결과"
echo "==========================================="
if echo "$CHAT_R" | grep -q '"response"'; then
  NPC_MSG=$(json_val "$CHAT_R" "response")
  echo "상태    : 성공"
  echo "/chat 응답: $NPC_MSG"
else
  echo "상태    : 실패"
  echo "/chat 전체 응답: $CHAT_R"
  exit 1
fi
