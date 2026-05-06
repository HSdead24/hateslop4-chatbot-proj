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
  (n) => `${n}, 안녕~? 🐰✨`,
  ()  => `아이고, 우리 친구. 아주 <span class="warn">불쌍하게 죽어버렸구나</span>. 여기가 어디냐구? 음… 죽기 전으로 돌아가기 전에 잠깐 들르는 곳?`,
  ()  => `히히. 🐰 너무 겁먹지는 마. 치키가 특별히 <span class="hl">한 번 더 살려줄게</span>. 대신 규칙이 있어.`,
  ()  => `너는 곧 <span class="warn">죽기 24시간 전</span>으로 돌아가. 그리고 오늘 <span class="warn">자정이 되기 전까지</span>, 너를 죽인 범인이 누군지 찾아야 해.`,
  ()  => `범인을 맞히면? 치키가 구해줄게! ✨ 범인이 너를 죽이기 전에, 짜잔! 하고 나타나서 막아주는 거야.`,
  ()  => `물론… 틀리면? <span class="warn">또 죽는 거지</span>. 🐰⏰`,
  ()  => `아하. 죽으면서 기억을 조금 잃었구나? 괜찮아. 아주 간단하게만 알려줄게. 너무 많이 알려주면 재미없잖아… 아니, 위험하잖아.`,
  ()  => `네가 <span class="warn">범인을 기억해버릴 수도</span> 있으니까~`,
  // index 8: infoBox가 이 대사 앞에 등장
  ()  => `이 정도면 충분해. 너는 사람의 마음을 들여다보는 일을 해. 그런데 이상하지? 사람 마음은 그렇게 잘 안다면서, 왜 누군가의 원한은 몰랐을까? 🐰`,
  ()  => `범인이 누구냐구? 그건 친구가 맞혀야지~ 치키가 다 말해주면 <span class="hl">게임이 아니잖아</span>🩸`,
  ()  => `대신 의심할 사람들은 알려줄게. 짜잔~ 🎀 <span class="hl">의심할 만한 사람 리스트!</span>`,
  ()  => `<div style="text-align:left; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; margin-top:5px;">
            1. <b>김도현</b>: &lt;안식&gt;의 환자<br>
            2. <b>차서연</b>: 동료 의사<br>
            3. <b>박도원</b>: &lt;안식&gt;의 청소부<br>
            4. <b>엄마</b>: 너를 가장 오래 알고 있는 사람
          </div>`,
  ()  => `지금부터 네 선택이 너를 가를 거야. 누구를 믿을지, 누구를 피할지, 누구를 더 화나게 만들지. 잘못 고르면 또 죽어🐰`,
  (n) => `그럼… 이제 시작해볼까? 죽기 24시간 전으로 돌아가는 거야, ${n}. 들어가서 행동을 선택하고, 의심 가는 인물들과 이야기하고, 단서를 모아.`,
];

const CHIKI_LAST_LINE =
  `그리고 마지막에 <span class="warn">범인을 맞혀봐</span>. 치키가 끝까지 지켜봐줄게. 히히 🐰⏰🩸`;

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

function startChikiDialogue() {
  const area  = document.getElementById('bubbleArea');
  const goBtn = document.getElementById('goBtn');

  area.innerHTML = '';
  goBtn.classList.remove('show');

  const nameSpan = `<span class="name-call">${escHtml(STATE.name)}</span>`;
  let i = 0;

  function showNext() {
    // 모든 대사 끝 → 마지막 대사 + 시작 버튼
    if (i >= CHIKI_LINES.length) {
      setTimeout(() => {
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

    // 3번 수정: index 8 직전 — infoBox를 bubbleArea 안에 동적 삽입
    if (i === 8) {
      const infoBox = document.createElement('div');
      infoBox.className = 'player-info-box show';
      infoBox.innerHTML = `
        <div class="player-info-row">
          <span class="pi-label">이름</span>
          <span class="pi-val accent">${escHtml(STATE.name)}</span>
        </div>
        <div class="player-info-row">
          <span class="pi-label">나이</span>
          <span class="pi-val">34세</span>
        </div>
        <div class="player-info-row">
          <span class="pi-label">성별</span>
          <span class="pi-val">${escHtml(STATE.gender)}</span>
        </div>
        <div class="player-info-row">
          <span class="pi-label">직업</span>
          <span class="pi-val">정신건강의학과 의사 / 심리상담센터 &lt;안식&gt; 상담가</span>
        </div>
      `;
      area.appendChild(infoBox);
      setTimeout(() => infoBox.scrollIntoView({ behavior:'smooth', block:'nearest' }), 200);
      setTimeout(() => showNextBubble(), 1000);
      return;
    }

    showNextBubble();
  }

  function showNextBubble() {
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
    window.location.href = '/frontend/buttonroom.html';
  });
}

// ────────────────────────────────────────────
//  초기화 — DOM 로드 후 이벤트 연결
// ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('playerName').addEventListener('input', checkInput);
});