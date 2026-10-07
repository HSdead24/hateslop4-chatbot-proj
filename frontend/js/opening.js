// ════════════════════════════════════════════
//  opening.js  —  오프닝 페이지 동작 로직
//  Phase 0 (입력) → Phase 1 (타이틀) →
//  Phase 2 (방 reveal) → Phase 3 (나레이션 + 치키 등장) →
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
//  나레이션 대사 목록 — 게임 시스템의 목소리 (2인칭 존댓말)
//  인자: n = 이름 HTML span, g = 성별 문자열
// ────────────────────────────────────────────
// ── 카드 삽입 인덱스 ──────────────────────────
//  RULE_CARD_AFTER    = 2  (index 2 대사 직후)
//  INFO_CARD_AFTER    = 7  (index 7 대사 직후)
//  SUSPECT_CARD_AFTER = 8  (index 8 대사 직후)
const RULE_CARD_AFTER    = 2;
const INFO_CARD_AFTER    = 7;
const SUSPECT_CARD_AFTER = 8;

const NARRATION_LINES = [
  // 0
  (n) => `${n}, 당신은 죽었습니다.`,
  // 1
  ()  => `9월 3일 오전 7시. 아무도 당신의 마지막을 지켜보지 않았습니다.`,
  // 2 ← RULE_CARD_AFTER
  ()  => `그런데 시간이 거꾸로 흐르기 시작합니다. 단, 규칙이 있습니다.`,
  // 3
  ()  => `당신은 죽기 정확히 하루 전, <span class="warn">9월 2일 오전 7시</span>로 돌아갑니다.`,
  // 4
  ()  => `그리고 <span class="warn">밤 12시</span>, 누군가가 당신을 찾아옵니다.`,
  // 5
  ()  => `그 방문이 죽음으로 이어지기 전에, 당신을 노리는 사람이 누구인지 알아내야 합니다.`,
  // 6
  ()  => `당신에게 주어진 기회는 <span class="warn">단 세 번</span>뿐입니다.`,
  // 7 ← INFO_CARD_AFTER
  ()  => `죽음을 지나오며 기억의 일부가 지워졌습니다. 남아 있는 것은 이것뿐입니다.`,
  // 8 ← SUSPECT_CARD_AFTER
  ()  => `당신의 곁에는 의심할 만한 사람들이 있습니다.`,
  // 9
  ()  => `누구를 믿고, 누구를 피할지. 모든 선택은 당신의 몫입니다.`,
  // 10
  ()  => `단서를 모으고, 자정이 오기 전에 범인을 지목하십시오.`,
  // 11
  ()  => `잘못 고른다면, 이 아침은 다시 시작될 것입니다.`,
  // 12 ── 관리자 치키 소개
  ()  => `이 루프는 관리자 <span class="hl">치키</span>가 운영합니다.`,
  // 13
  ()  => `치키는 당신에게 규칙을 안내하고, 당신이 끝까지 살아남을 수 있도록 도울 것입니다.`,
];

// 나레이션이 끝난 뒤 시스템 관리자 치키가 등장해서 하는 대사 (반말, 장난스러운 말투)
const CHIKI_CAMEO_LINES = [
  (n) => `안녕~ ${n}? 🐰 이 루프를 관리하는 치키야!`,
  ()  => `남의 마음은 그렇게 잘 들여다보면서…`,
  ()  => `정작 <span class="warn">네 마음속</span>은 한 번도 안 들여다봤지? 🐰`,
  ()  => `괜찮아, 치키가 끝까지 지켜보고 있을게. 자, 이제 눈 뜰 시간이야. 히히 🩸`,
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
  sessionStorage.setItem('player_name', name);
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
//  PHASE 2 → 3: 나레이션
// ────────────────────────────────────────────
function goNarration() {
  curtainTransition(() => {
    showPhase('ph-chiki');
    startNarration();
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
      <span class="ic-val"><span class="warn">죽기 24시간 전</span>으로 돌아갑니다. <span class="warn">자정 전까지</span> 범인을 찾아야 합니다.</span>
    </div>
    <div class="info-card-row">
      <span class="ic-label">🔁</span>
      <span class="ic-val">기회는 <span class="warn">총 3번</span>. 모두 놓치면 더는 돌아올 수 없습니다.</span>
    </div>
    <div class="info-card-result-row">
      <div class="ic-result good">✅ 맞히면<br>살아남습니다</div>
      <div class="ic-result bad">💀 틀리면<br>다시 죽습니다 🩸</div>
    </div>`;
  return card;
}

function createInfoCard() {
  const card = document.createElement('div');
  card.className = 'info-card';
  card.innerHTML = `
    <div class="info-card-title">PROFILE</div>
    <div class="info-card-row"><span class="ic-label">이름</span><span class="ic-val accent">${escHtml(STATE.name)}</span></div>
    <div class="info-card-row"><span class="ic-label">나이</span><span class="ic-val">34세</span></div>
    <div class="info-card-row"><span class="ic-label">성별</span><span class="ic-val">${escHtml(STATE.gender)}</span></div>
    <div class="info-card-row"><span class="ic-label">직업</span><span class="ic-val">정신건강의학과 &lt;안식&gt; 상담사</span></div>`;
  return card;
}

function createSuspectCard() {
  const card = document.createElement('div');
  card.className = 'info-card';
  card.innerHTML = `
    <div class="info-card-title">SUSPECTS</div>
    <div class="suspect-grid">
      <div class="suspect-chip"><span class="suspect-dot"></span><div><div class="suspect-name">김도현</div><div class="suspect-sub">&lt;안식&gt;의 내담자</div></div></div>
      <div class="suspect-chip"><span class="suspect-dot"></span><div><div class="suspect-name">차서연</div><div class="suspect-sub">&lt;안식&gt;의 정신건강의학과 의사</div></div></div>
      <div class="suspect-chip"><span class="suspect-dot"></span><div><div class="suspect-name">박도원</div><div class="suspect-sub">&lt;안식&gt;의 청소부</div></div></div>
      <div class="suspect-chip"><span class="suspect-dot"></span><div><div class="suspect-name">윤미경</div><div class="suspect-sub">당신의 어머니</div></div></div>
    </div>`;
  return card;
}

function insertCard(area, cardEl) {
  area.appendChild(cardEl);
  requestAnimationFrame(() => { cardEl.offsetHeight; cardEl.classList.add('show'); });
  setTimeout(() => cardEl.scrollIntoView({ behavior:'smooth', block:'nearest' }), 200);
}

// ────────────────────────────────────────────
//  치키 등장 블록 (나레이션 마지막에 1회)
// ────────────────────────────────────────────
function createChikiCameo() {
  const cameo = document.createElement('div');
  cameo.className = 'chiki-cameo';
  cameo.innerHTML = `
    <div class="chiki-cameo-figure">
      <div class="chiki-aura"></div>
      <img class="chiki-img" src="https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550819/chiki_img_hwqadm.png" alt="치키"
         onerror="this.style.display='none'">
    </div>
    <div class="chiki-name-tag">
      <span class="chiki-name">치키</span>
      <div class="chiki-dot"></div>
      <span class="chiki-role">ADMIN</span>
    </div>
    <div class="chiki-bubble-area"></div>`;
  return cameo;
}

// ────────────────────────────────────────────
//  나레이션 진행
// ────────────────────────────────────────────
function startNarration() {
  const area  = document.getElementById('bubbleArea');
  const goBtn = document.getElementById('goBtn');

  area.innerHTML = '';
  goBtn.classList.remove('show');

  const nameSpan = `<span class="name-call">${escHtml(STATE.name)}</span>`;
  let i = 0;

  function showNext() {
    if (i >= NARRATION_LINES.length) return;
    showNextBubble();
  }

  function showChikiCameo() {
    const cameo = createChikiCameo();
    insertCard(area, cameo);
    const cameoArea = cameo.querySelector('.chiki-bubble-area');
    let j = 0;

    function showNextChikiLine() {
      const bubble = document.createElement('div');
      bubble.className = 'bubble chiki-bubble';
      cameoArea.appendChild(bubble);

      glitchTypeInto(bubble, CHIKI_CAMEO_LINES[j](nameSpan), () => {
        setTimeout(() => bubble.scrollIntoView({ behavior:'smooth', block:'nearest' }), 100);
        j++;
        if (j < CHIKI_CAMEO_LINES.length) {
          setTimeout(showNextChikiLine, 500);
          return;
        }
        setTimeout(() => {
          goBtn.classList.add('show');
          goBtn.scrollIntoView({ behavior:'smooth', block:'nearest' });
        }, 400);
      });
    }

    setTimeout(showNextChikiLine, 700);
  }

  function showNextBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    area.appendChild(bubble);

    const html = NARRATION_LINES[i](nameSpan, STATE.gender);
    const currentIndex = i;
    i++;

    glitchTypeInto(bubble, html, () => {
      setTimeout(() => bubble.scrollIntoView({ behavior:'smooth', block:'nearest' }), 100);

      if (currentIndex === NARRATION_LINES.length - 1) {
        setTimeout(showChikiCameo, 900);
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
  // 새 게임: 이전 플레이의 기록(단서, 치키 트리거, 루프 정보 등)을 전부 지운다
  sessionStorage.clear();

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

  // ── 제목 글리치 트리거 ──
  const titleEl = document.querySelector('.input-title');
  if (titleEl) {
    // data-text에 plain text 세팅 (::before/::after content용)
    titleEl.setAttribute('data-text', '죽기 24시간 전에');

    function triggerTitleGlitch() {
      titleEl.classList.remove('glitch-on');
      void titleEl.offsetWidth; // reflow — 애니메이션 재시작
      titleEl.classList.add('glitch-on');

      // 애니메이션 끝나면 클래스 제거
      setTimeout(() => titleEl.classList.remove('glitch-on'), 300);

      // 다음 발동까지 랜덤 대기 (2~5초)
      setTimeout(triggerTitleGlitch, 2000 + Math.random() * 3000);
    }

    // 1초 후 첫 발동
    setTimeout(triggerTitleGlitch, 1000);
  }
});
