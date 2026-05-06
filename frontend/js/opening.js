// ════════════════════════════════════════════
//  opening.js  —  오프닝 페이지 동작 로직
//  Phase 0 (입력) → Phase 1 (타이틀) →
//  Phase 2 (방 reveal) → Phase 3 (치키) →
//  buttonroom.html
// ════════════════════════════════════════════

// ────────────────────────────────────────────
//  상태
// ────────────────────────────────────────────
const STATE = {
  name:   '',
  gender: '',
};

// ────────────────────────────────────────────
//  치키 말풍선 대사 목록
//  인자: n = 이름 HTML span, g = 성별 문자열
// ────────────────────────────────────────────
const CHIKI_LINES = [
  (n) => `${n}야, 안녕~? 🐰✨`,
  ()  => `아이고 우리 친구. 아주 <span class="warn">불쌍하게 죽어버렸구나</span>. 여기가 어디냐고? 음… 죽기 전으로 돌아가기 전에 잠깐 들르는 곳이야. 히히.`,
  ()  => `너무 겁먹지는 마. 치키가 특별히 <span class="hl">한 번 더 살려줄게</span>. 대신 규칙이 있어.`,
  ()  => `너는 곧 <span class="warn">죽기 24시간 전</span>으로 돌아가. 그리고 오늘 <span class="warn">자정이 되기 전까지</span>, 너를 죽인 범인이 누군지 찾아야 해.`,
  ()  => `범인을 맞히면? 치키가 구해줄게! 잘못된 말 한마디, 잘못된 선택 하나로 <span class="warn">자정 전에도 죽을 수 있어</span>. 조심해.`,
  ()  => `네 정보야. 죽으면서 기억을 조금 잃었으니까, 참고해.`,
];

const CHIKI_LAST_LINE =
  `오늘 만나는 <span class="warn">모든 사람을 의심해</span>. 친절한 사람도, 걱정해주는 사람도. 웃는 얼굴 뒤에 칼을 숨기고 있을 수 있잖아? 🐰`;

// ────────────────────────────────────────────
//  유틸
// ────────────────────────────────────────────
function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ────────────────────────────────────────────
//  Phase 전환 헬퍼
// ────────────────────────────────────────────
function curtainTransition(callback, duration = 500) {
  const curtain = document.getElementById('curtain');
  curtain.classList.add('closing');
  setTimeout(() => {
    callback();
    setTimeout(() => curtain.classList.remove('closing'), 100);
  }, duration);
}

function showPhase(id) {
  document.querySelectorAll('.phase').forEach(p => {
    p.classList.remove('active');
    p.style.pointerEvents = 'none';
  });
  const el = document.getElementById(id);
  el.classList.add('active');
  el.style.pointerEvents = 'all';
}

// ────────────────────────────────────────────
//  PHASE 0: 이름 / 성별 입력 검증
// ────────────────────────────────────────────
function checkInput() {
  const name = document.getElementById('playerName').value.trim();
  STATE.name = name;
  document.getElementById('startBtn').disabled = !(name.length > 0 && STATE.gender);
}

function selectGender(g) {
  STATE.gender = g;
  document.getElementById('genderM').classList.toggle('selected', g === '남성');
  document.getElementById('genderF').classList.toggle('selected', g === '여성');
  checkInput();
}

// ────────────────────────────────────────────
//  PHASE 0 → 1: 오프닝 영상(타이틀) 시작
// ────────────────────────────────────────────
function goOpening() {
  STATE.name = document.getElementById('playerName').value.trim();
  curtainTransition(() => {
    showPhase('ph-opening');
    startOpeningSequence();
  });
}

function startOpeningSequence() {
  let secs   = 24 * 60;
  const clockEl = document.getElementById('opClock');

  // 빠른 카운트다운 효과 (디스플레이용)
  const tick = setInterval(() => {
    secs = Math.max(0, secs - 37);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    clockEl.textContent = h > 0
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (secs <= 0) clearInterval(tick);
  }, 80);

  // 5.5초 후 방 화면으로 자동 진행
  // 실제 영상 연결 시: video.addEventListener('ended', goRoom) 으로 교체
  setTimeout(() => {
    clearInterval(tick);
    goRoom();
  }, 5500);
}

function skipOpening() {
  goRoom();
}

// ────────────────────────────────────────────
//  PHASE 1 → 2: 방 Reveal
// ────────────────────────────────────────────
function goRoom() {
  curtainTransition(() => {
    showPhase('ph-room');
    const pronoun = STATE.gender === '남성' ? '그' : '그녀';
    document.getElementById('roomText').innerHTML =
      `<span class="name-hl">${escHtml(STATE.name)}</span>의 하루가 시작되었다.<br>` +
      `${pronoun}는 아직 모른다. 오늘 밤,<br>` +
      `자정이 지나기 전에 <span style="color:var(--red2)">죽는다</span>는 것을.`;
  });
}

// ────────────────────────────────────────────
//  PHASE 2 → 3: 치키 등장
// ────────────────────────────────────────────
function goChiki() {
  curtainTransition(() => {
    showPhase('ph-chiki');
    document.getElementById('piName').textContent   = STATE.name;
    document.getElementById('piGender').textContent = STATE.gender;
    startChikiDialogue();
  });
}

function startChikiDialogue() {
  const area    = document.getElementById('bubbleArea');
  const infoBox = document.getElementById('playerInfoBox');
  const goBtn   = document.getElementById('goBtn');

  area.innerHTML = '';
  infoBox.classList.remove('show');
  goBtn.classList.remove('show');

  const nameSpan = `<span class="name-call">${escHtml(STATE.name)}</span>`;
  let i = 0;

  function showNext() {
    // 본 대사 다 끝나면 → 정보 박스 + 마지막 힌트 + 시작 버튼
    if (i >= CHIKI_LINES.length) {
      setTimeout(() => {
        infoBox.classList.add('show');

        const last = document.createElement('div');
        last.className = 'bubble';
        last.innerHTML = CHIKI_LAST_LINE;
        area.appendChild(last);
        requestAnimationFrame(() => { last.offsetHeight; last.classList.add('show'); });
        setTimeout(() => last.scrollIntoView({ behavior:'smooth', block:'nearest' }), 200);
        setTimeout(() => goBtn.classList.add('show'), 600);
      }, 400);
      return;
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = CHIKI_LINES[i](nameSpan, STATE.gender);
    area.appendChild(bubble);
    requestAnimationFrame(() => { bubble.offsetHeight; bubble.classList.add('show'); });
    setTimeout(() => bubble.scrollIntoView({ behavior:'smooth', block:'nearest' }), 200);

    i++;
    setTimeout(showNext, i === 1 ? 900 : 1400);
  }

  setTimeout(showNext, 600);
}

// ────────────────────────────────────────────
//  PHASE 3 → buttonroom.html
// ────────────────────────────────────────────
async function goGame() {
  // sessionStorage에 이름·성별 저장 (button.js에서 읽음)
  sessionStorage.setItem('player_name',   STATE.name);
  sessionStorage.setItem('player_gender', STATE.gender);

  // 백엔드 /new-game 호출 → session_id 발급
  try {
    const res = await fetch('/new-game', {
      method:  'POST',
      headers: { 'Content-Type':'application/json' },
      body:    JSON.stringify({
        player_name:   STATE.name,
        player_gender: STATE.gender,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      sessionStorage.setItem('session_id', data.session_id);
      console.log('[new-game] session_id:', data.session_id);
    }
  } catch (e) {
    console.warn('[백엔드 미연결] 오프라인 모드로 진행합니다.', e);
  }

  curtainTransition(() => {
    window.location.href = 'buttonroom.html';
  });
}

// ────────────────────────────────────────────
//  초기화 — DOM 로드 후 이벤트 연결
// ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('playerName').addEventListener('input', checkInput);
});