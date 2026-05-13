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
// ── 카드 삽입 인덱스 ──────────────────────────
//  RULE_CARD_AFTER  = 2  (index 2 대사 직후)
//  INFO_CARD_AFTER  = 4  (index 4 대사 직후, 기존 infoBox 위치)
//  SUSPECT_CARD_AFTER = 7 (index 7 대사 직후, 구 index 11 텍스트 리스트 대체)
const RULE_CARD_AFTER    = 2;
const INFO_CARD_AFTER    = 4;
const SUSPECT_CARD_AFTER = 7;

const CHIKI_LINES = [
  // 0
  (n) => `${n}, 안녕~? 🐰✨`,
  // 1
  ()  => `우리 친구 아주 불쌍하게 죽었네. 🩸`,
  // 2 ← RULE_CARD_AFTER
  ()  => `치키가 한 번 더 기회를 줄게. 대신 규칙이 있어.`,
  // 3
  ()  => `너는 곧 <span class="warn">죽기 24시간 전</span>으로 돌아가. 자정 전까지 범인을 찾아야 해.`,
  // 4 ← INFO_CARD_AFTER
  ()  => `죽으면서 기억을 조금 잃었지? 아주 간단하게만 알려줄게. 범인을 바로 알려주면 재미없잖아 ♦️🐰`,
  // 5
  ()  => `너는 사람의 마음을 들여다보는 일을 해. 그런데 이상하지?`,
  // 6
  ()  => `사람 마음은 그렇게 잘 안다면서, 왜 <span class="warn">누군가의 원한은 몰랐을까?</span> 🐰`,
  // 7 ← SUSPECT_CARD_AFTER
  ()  => `대신 의심할 사람들은 알려줄게. 짜잔~ 🎀`,
  // 8
  ()  => `지금부터 네 선택이 너를 가를 거야.`,
  // 9
  ()  => `누구를 믿을지, 누구를 피할지. 잘못 고르면 곤란하겠지? 🐰`,
  // 10
  (n) => `그럼 시작해볼까, ${n}.`,
  // 11
  ()  => `단서를 모으고, 마지막에 범인을 맞혀봐. 치키가 끝까지 지켜볼게. 🐰⏰🩸`,
];

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
    showPhase('ph-video');
    const video = document.getElementById('opVideo');
    video.play().catch(() => {
      // 재생 실패 시 타이머 페이즈로 바로 이동
      goTimer();
    });
    startOpeningSequence();
  });
}

function startOpeningSequence() {
  const video = document.getElementById('opVideo');
  video.addEventListener('ended', () => goTimer());
  video.addEventListener('error', () => goTimer());
}

function goTimer() {
  curtainTransition(() => {
    showPhase('ph-opening');
    // 1초 후 타이머 시작
    setTimeout(() => runTimer(), 1000);
  });
}

function runTimer() {
  let secs   = 24 * 60;
  const clockEl = document.getElementById('opClock');

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
  setTimeout(() => {
    clearInterval(tick);
    goRoom();
  }, 5500);
}

function skipOpening() {
  const video = document.getElementById('opVideo');
  video.pause();
  goTimer();
}

// ────────────────────────────────────────────
//  PHASE 1 → 2: 방 Reveal
// ────────────────────────────────────────────
function goRoom() {
  curtainTransition(() => {
    showPhase('ph-room');
  });
}

// ────────────────────────────────────────────
//  PHASE 2 → 3: 치키 등장
// ────────────────────────────────────────────
function goChiki() {
  curtainTransition(() => {
    showPhase('ph-chiki');
    startChikiDialogue();
  });
}

// ────────────────────────────────────────────
//  글리치 타이핑 유틸
// ────────────────────────────────────────────
const NOISE_CHARS = ['█','▒','▓','?','╳','▌','#','　'];

function glitchTypeInto(el, html, onDone) {
  el.classList.add('chroma-in');
  const cursor = document.createElement('span');
  cursor.className = 'type-cursor';
  el.appendChild(cursor);
  let i = 0;
  function tick() {
    if (i >= html.length) { cursor.remove(); if (onDone) onDone(); return; }
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      cursor.insertAdjacentHTML('beforebegin', html.slice(i, end + 1));
      i = end + 1; setTimeout(tick, 20); return;
    }
    if (Math.random() < 0.10) {
      const n = document.createElement('span');
      n.className = 'type-noise';
      n.textContent = NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
      cursor.insertAdjacentElement('beforebegin', n);
      setTimeout(() => n.remove(), 90);
      setTimeout(tick, 120); return;
    }
    cursor.insertAdjacentText('beforebegin', html[i]);
    i++; setTimeout(tick, 36);
  }
  setTimeout(tick, 300);
}

// ────────────────────────────────────────────
//  카드 생성 헬퍼
// ────────────────────────────────────────────
function createRuleCard() {
  const card = document.createElement('div');
  card.className = 'info-card';
  card.innerHTML = `
    <div class="info-card-title">규칙</div>
    <div class="info-card-row">
      <span class="ic-label">⏰</span>
      <span class="ic-val"><span class="warn">죽기 24시간 전</span>으로 돌아가. <span class="warn">자정 전까지</span> 범인을 찾아야 해.</span>
    </div>
    <div class="info-card-result-row">
      <div class="ic-result good">✅ 맞히면<br>치키가 구해줌</div>
      <div class="ic-result bad">💀 틀리면<br>또 죽음 🩸</div>
    </div>`;
  return card;
}

function createInfoCard() {
  const card = document.createElement('div');
  card.className = 'info-card';
  card.innerHTML = `
    <div class="info-card-title">네 정보</div>
    <div class="info-card-row"><span class="ic-label">이름</span><span class="ic-val accent">${escHtml(STATE.name)}</span></div>
    <div class="info-card-row"><span class="ic-label">나이</span><span class="ic-val">34세</span></div>
    <div class="info-card-row"><span class="ic-label">성별</span><span class="ic-val">${escHtml(STATE.gender)}</span></div>
    <div class="info-card-row"><span class="ic-label">직업</span><span class="ic-val">정신건강의학과 의사 / 심리상담센터 &lt;안식&gt; 상담가</span></div>`;
  return card;
}

function createSuspectCard() {
  const card = document.createElement('div');
  card.className = 'info-card';
  card.innerHTML = `
    <div class="info-card-title">의심 인물</div>
    <div class="suspect-grid">
      <div class="suspect-chip"><span class="suspect-dot"></span><div><div class="suspect-name">김도현</div><div class="suspect-sub">&lt;안식&gt;의 환자</div></div></div>
      <div class="suspect-chip"><span class="suspect-dot"></span><div><div class="suspect-name">차서연</div><div class="suspect-sub">동료 의사</div></div></div>
      <div class="suspect-chip"><span class="suspect-dot"></span><div><div class="suspect-name">박도원</div><div class="suspect-sub">&lt;안식&gt;의 청소부</div></div></div>
      <div class="suspect-chip"><span class="suspect-dot"></span><div><div class="suspect-name">윤미경</div><div class="suspect-sub">어머니 / 가장 오래 알고 있는 사람</div></div></div>
    </div>`;
  return card;
}

function insertCard(area, cardEl) {
  area.appendChild(cardEl);
  requestAnimationFrame(() => { cardEl.offsetHeight; cardEl.classList.add('show'); });
  setTimeout(() => cardEl.scrollIntoView({ behavior:'smooth', block:'nearest' }), 200);
}

// ────────────────────────────────────────────
//  치키 대화 진행
// ────────────────────────────────────────────
function startChikiDialogue() {
  const area  = document.getElementById('bubbleArea');
  const goBtn = document.getElementById('goBtn');

  area.innerHTML = '';
  goBtn.classList.remove('show');

  const nameSpan = `<span class="name-call">${escHtml(STATE.name)}</span>`;
  let i = 0;

  function showNext() {
    if (i >= CHIKI_LINES.length) return;
    showNextBubble();
  }

  function showNextBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    area.appendChild(bubble);

    const html = CHIKI_LINES[i](nameSpan, STATE.gender);
    const currentIndex = i;
    i++;

    glitchTypeInto(bubble, html, () => {
      setTimeout(() => bubble.scrollIntoView({ behavior:'smooth', block:'nearest' }), 100);

      if (currentIndex === CHIKI_LINES.length - 1) {
        setTimeout(() => goBtn.classList.add('show'), 400);
        return;
      }

      if (currentIndex === RULE_CARD_AFTER) {
        setTimeout(() => { insertCard(area, createRuleCard()); setTimeout(showNext, 900); }, 400);
        return;
      }
      if (currentIndex === INFO_CARD_AFTER) {
        setTimeout(() => { insertCard(area, createInfoCard()); setTimeout(showNext, 900); }, 400);
        return;
      }
      if (currentIndex === SUSPECT_CARD_AFTER) {
        setTimeout(() => { insertCard(area, createSuspectCard()); setTimeout(showNext, 900); }, 400);
        return;
      }

      setTimeout(showNext, currentIndex === 0 ? 600 : 500);
    });
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
    window.location.href = '/button';
  });
}

// ────────────────────────────────────────────
//  초기화 — DOM 로드 후 이벤트 연결
// ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('playerName').addEventListener('input', checkInput);
});
