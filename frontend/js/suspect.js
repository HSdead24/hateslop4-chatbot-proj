// ═══════════════════════════════════════════════
//  suspect.js  —  범인 선택 화면 로직
//  흐름: 치키 등장 → 범인 선택 → 확인 멘트
//        → 밤 → 사망 이미지 → 다음 루프(or 엔딩)
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
//  세션 데이터 로드
// ─────────────────────────────────────────────
const SESSION_ID = sessionStorage.getItem('session_id');
const LAST_BTN_ID = parseInt(sessionStorage.getItem('last_button_id') || '0', 10);
const LOOP_NUM = parseInt(sessionStorage.getItem('loop_num') || '1', 10);
const BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:8000"
  : "https://hateslop4-dead24.onrender.com";


const DEATH_IMAGE_MAP = {
  '김도현': 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550922/%E1%84%89%E1%85%A1%E1%84%86%E1%85%A1%E1%86%BC_%E1%84%8E%E1%85%AE%E1%84%85%E1%85%A1%E1%86%A8%E1%84%89%E1%85%A1_leqyal.png',
  '차서연': 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550915/%E1%84%89%E1%85%A1%E1%84%86%E1%85%A1%E1%86%BC_%E1%84%91%E1%85%B5_%E1%84%90%E1%85%A9_%E1%84%92%E1%85%A1%E1%84%82%E1%85%B3%E1%86%AB_%E1%84%89%E1%85%A1%E1%84%85%E1%85%A1%E1%86%B7_jwvvkz.png',
  '박도원': 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550917/%E1%84%89%E1%85%A1%E1%84%86%E1%85%A1%E1%86%BC2_%E1%84%8F%E1%85%A1%E1%86%AF_h0io4f.png',
  '엄마':   'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550920/%E1%84%89%E1%85%A1%E1%84%86%E1%85%A1%E1%86%BC_%E1%84%B0%E1%85%A1%E1%86%BC_wqnnyz.png',
};

const NPC_INFO = {
  '김도현': { color: '#6a7f99', role: '내담자', initials: '도현', profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595803/chat/%EA%B9%80%EB%8F%84%ED%98%84/%EA%B9%80%EB%8F%84%ED%98%84_%ED%94%84%EB%A1%9C%ED%95%84.png'},
  '차서연': { color: '#5a8870', role: '신경과 의사', initials: '서연', profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595780/chat/%EC%B0%A8%EC%84%9C%EC%97%B0/%EC%B0%A8%EC%84%9C%EC%97%B0_%ED%94%84%EB%A1%9C%ED%95%84.png'},
  '박도원': { color: '#7a6a5a', role: '청소부', initials: '도원', profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595793/chat/%EB%B0%95%EB%8F%84%EC%9B%90/%EB%B0%95%EB%8F%84%EC%9B%90_%ED%94%84%EB%A1%9C%ED%95%84.png' },
  '엄마':   { color: '#8a7040', role: '가족', initials: '엄마', displayName: '윤미경', profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595813/chat/%EC%97%84%EB%A7%88/%EC%97%84%EB%A7%88_%ED%94%84%EB%A1%9C%ED%95%84.png' },
};

// ─────────────────────────────────────────────
//  상태
// ─────────────────────────────────────────────
let selectedSuspect = null;
let ACTUAL_VILLAIN = '차서연';

// ─────────────────────────────────────────────
//  진범 데이터 로드 함수 (scenes.json 기준)
// ─────────────────────────────────────────────
async function fetchActualVillain() {
  try {
    // BASE_URL이 로컬/배포 환경을 자동 판별하므로 절대 경로로 안전하게 요청
    const response = await fetch(`${BASE_URL}/data/scenes.json`); 
    
    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 진범 역추적 로직 (이전 답변과 동일)
    if (data.nodes[LAST_BTN_ID] && data.nodes[LAST_BTN_ID].result_npc) {
      ACTUAL_VILLAIN = data.nodes[LAST_BTN_ID].result_npc;
    } else {
      for (const nodeId in data.nodes) {
        const node = data.nodes[nodeId];
        if (node.choices && node.choices.some(choice => choice.id === LAST_BTN_ID)) {
          ACTUAL_VILLAIN = node.result_npc || '김도현';
          break;
        }
      }
    }
    
    console.log("최종 확정된 진범:", ACTUAL_VILLAIN); 
    
  } catch (error) {
    console.error('scenes.json을 불러오는데 실패했습니다.', error);
  }
}

// ─────────────────────────────────────────────
//  씬 전환
// ─────────────────────────────────────────────
function showScene(id) {
  document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function fadeToScene(id, delay = 0) {
  setTimeout(() => showScene(id), delay);
}

// ─────────────────────────────────────────────
//  이미지 로드 헬퍼
// ─────────────────────────────────────────────
function loadImg(imgEl, src, fallbackEl) {
  if (!src) {
    imgEl.style.display = 'none';
    if (fallbackEl) fallbackEl.style.display = 'flex';
    return;
  }
  const encoded = src.startsWith('http') ? src : (() => {
    const parts = src.split('/');
    const filename = parts.pop();
    return parts.join('/') + '/' + encodeURIComponent(filename);
  })();
  imgEl.style.display = 'block';
  if (fallbackEl) fallbackEl.style.display = 'none';
  imgEl.src = encoded;
  imgEl.onerror = () => {
    imgEl.style.display = 'none';
    if (fallbackEl) fallbackEl.style.display = 'flex';
  };
}

// ─────────────────────────────────────────────
//  범인 선택 카드 렌더링
// ─────────────────────────────────────────────
function renderSuspectCards() {
  const grid = document.getElementById('suspect-grid');
  const npcs = ['김도현', '차서연', '박도원', '엄마'];
  grid.innerHTML = npcs.map(name => {
    const info = NPC_INFO[name];
    return `
      <div class="suspect-card" data-name="${name}" onclick="selectSuspect('${name}', this)">
        <div class="suspect-avatar" style="border-color:${info.color}33;">
          <img src="${info.profile}" alt="${info.initials}"
               style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
               onerror="this.style.display='none';this.parentElement.innerHTML+='<span class=\\'avatar-initials\\' style=\\'color:${info.color};position:absolute;\\'>${info.initials}</span>'">
        </div>
        <div class="suspect-name">${info.displayName ?? name}</div>
        <div class="suspect-role">${info.role}</div>
      </div>
    `;
  }).join('');
}

function selectSuspect(name, el) {
  selectedSuspect = name;
  document.querySelectorAll('.suspect-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const btn = document.getElementById('confirm-btn');
  btn.classList.add('visible');
}

// ─────────────────────────────────────────────
//  사망 씬 그레인 효과 — 처음엔 검게 덮고 서서히 걷힘
// ─────────────────────────────────────────────
let _grainRaf = null;

function startDeathGrain() {
  const cv = document.getElementById('death-grain');
  if (!cv) return;

  const scene = document.getElementById('scene-death');
  cv.width  = scene.offsetWidth  || window.innerWidth;
  cv.height = scene.offsetHeight || window.innerHeight;

  const ctx = cv.getContext('2d');
  const FADE_DURATION = 2200; // grain이 걷히는 시간 (ms)
  const startTime = performance.now();

  function drawGrain(now) {
    const elapsed = now - startTime;
    // 0 → 1 (완전 불투명 → 완전 투명)
    const progress = Math.min(elapsed / FADE_DURATION, 1);
    // easeInQuad로 처음엔 천천히, 나중엔 빠르게 걷힘
    const eased = progress * progress;

    const w = cv.width, h = cv.height;
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 60) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = Math.random() > 0.42 ? 80 : 18;
    }
    ctx.putImageData(img, 0, 0);

    // 차콜 틴트: 1.0(완전 검정)에서 0으로 서서히 감소
    const tint = (1 - eased) * 0.92 + 0.38 * (1 - eased);
    ctx.fillStyle = `rgba(18,18,18,${Math.min(tint, 1)})`;
    ctx.fillRect(0, 0, w, h);

    if (progress < 1) {
      _grainRaf = requestAnimationFrame(drawGrain);
    } else {
      // grain 완전히 걷힌 뒤 canvas 숨김
      cv.style.display = 'none';
      _grainRaf = null;
    }
  }
  _grainRaf = requestAnimationFrame(drawGrain);
}

// ─────────────────────────────────────────────
//  확정 버튼 클릭
// ─────────────────────────────────────────────
function confirmSuspect() {
  if (!selectedSuspect) return;
  document.getElementById('chiki-confirm-text').innerHTML =
    `내가 <span class="highlight">${selectedSuspect}</span>으로부터 지켜줄게~! 🐰✨<br>걱정 마, 치키가 옆에 있을게.`;
  showScene('scene-confirm');
  // 치키 확인 멘트 2500ms 후 바로 사망 씬
  setTimeout(() => { goToDeath(); }, 2500);
}

// ─────────────────────────────────────────────
//  사망 씬
// ─────────────────────────────────────────────
function goToDeath() {
  showScene('scene-death');
  const deathImg = DEATH_IMAGE_MAP[ACTUAL_VILLAIN] || DEATH_IMAGE_MAP['김도현'];
  // 이미지 미리 로드
  loadImg(
    document.getElementById('death-img'),
    deathImg,
    document.getElementById('death-fallback')
  );
  // grain 즉시 시작 (검정 → 이미지 드러남)
  startDeathGrain();
  notifyDeath();
  // 사망 씬 6000ms 유지
  setTimeout(() => {
    if (LOOP_NUM >= 3) {
      goToEnding();
    } else {
      goToMorning();
    }
  }, 6000);
}

// ─────────────────────────────────────────────
//  아침 씬 (다음 루프)
// ─────────────────────────────────────────────
function goToMorning() {
  const nextLoop = LOOP_NUM + 1;
  showScene('scene-morning');
  document.getElementById('next-loop-badge').textContent = `LOOP ${nextLoop}`;
  document.getElementById('next-loop-title').textContent = `${nextLoop}번째 하루`;
  loadImg(
    document.getElementById('morning-img'),
    'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550044/bg_room_yn5qfy.png',
    document.getElementById('morning-fallback')
  );
  sessionStorage.setItem('loop_num', String(nextLoop));
  sessionStorage.removeItem('timer_start');
}

function tapMorning() {
  window.location.href = '/button';
}

// ─────────────────────────────────────────────
//  엔딩 전환 — 글리치 + 사운드 + 블랙아웃
// ─────────────────────────────────────────────
function goToEnding() {
  // 1. 현재 씬 위에 글리치 오버레이 생성
  const overlay = document.createElement('div');
  overlay.id = 'glitch-transition-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:#000;opacity:0;pointer-events:all;
  `;
  document.body.appendChild(overlay);

  // 2. Web Audio: 지지직 + 팍 사운드
  playGlitchSound();

  // 3. 화면 지지직 CSS 글리치 (0~900ms)
  const appEl = document.querySelector('#app') || document.body;
  appEl.classList.add('ending-glitch-anim');

  // 4. 900ms 후 팍 — 블랙아웃
  setTimeout(() => {
    appEl.classList.remove('ending-glitch-anim');
    overlay.style.transition = 'opacity 0.08s ease';
    overlay.style.opacity = '1';
  }, 900);

  // 5. 블랙아웃 완료 후 ending 페이지로
  setTimeout(() => {
    window.location.href = '/ending';
  }, 1100);
}

// ─────────────────────────────────────────────
//  Web Audio: 지지직 + 팍 컷오프
// ─────────────────────────────────────────────
function playGlitchSound() {
  try {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();

    const duration = 1.0;
    const sampleRate = actx.sampleRate;
    const bufSize = Math.floor(sampleRate * duration);
    const buf = actx.createBuffer(1, bufSize, sampleRate);
    const data = buf.getChannelData(0);

    // 화이트 노이즈 생성
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const src = actx.createBufferSource();
    src.buffer = buf;

    const gain = actx.createGain();
    const filter = actx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, actx.currentTime);
    filter.frequency.linearRampToValueAtTime(600, actx.currentTime + duration);
    filter.Q.value = 0.7;

    const now = actx.currentTime;

    // 볼륨 곡선: 빠르게 올라오다 → 지지직 떨림 → 팍 컷
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.04);

    // 지지직 스터터링 (볼륨 떨림)
    const stutterCount = 14;
    for (let i = 0; i < stutterCount; i++) {
      const t = now + 0.04 + i * (0.76 / stutterCount);
      const v = 0.15 + Math.random() * 0.35;
      gain.gain.linearRampToValueAtTime(v, t);
      gain.gain.linearRampToValueAtTime(Math.random() * 0.08, t + 0.025);
    }

    // 팍 — 즉각 컷오프 (0.88초 시점)
    gain.gain.linearRampToValueAtTime(0.5, now + 0.85);
    gain.gain.setValueAtTime(0, now + 0.88);  // 즉각 컷

    src.connect(filter);
    filter.connect(gain);
    gain.connect(actx.destination);
    src.start(now);
    src.stop(now + duration);
  } catch (e) {
    console.warn('[Web Audio] 재생 실패:', e.message);
  }
}

// ─────────────────────────────────────────────
//  글리치 CSS 애니메이션 (suspect 페이지 전체)
//  suspect.html <head> 또는 suspect.css에 추가 필요
// ─────────────────────────────────────────────
(function injectGlitchStyle() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes endingGlitch {
      0%   { transform:translate(0);   filter:none; }
      10%  { transform:translate(-3px,0); filter:brightness(1.3) contrast(1.2); }
      12%  { transform:translate(3px,0);  filter:brightness(0.7); }
      14%  { transform:translate(0);   filter:none; }
      30%  { transform:translate(0);   filter:none; }
      32%  { transform:translate(-4px,1px); filter:hue-rotate(30deg) brightness(1.4); }
      34%  { transform:translate(4px,-1px); filter:hue-rotate(-20deg); }
      36%  { transform:translate(0);   filter:none; }
      55%  { transform:translate(0);   filter:none; }
      57%  { transform:translate(-2px,0); filter:brightness(1.5) contrast(1.3); }
      58%  { transform:translate(2px,0);  filter:brightness(0.6); }
      60%  { transform:translate(0);   filter:none; }
      75%  { transform:translate(0);   filter:none; }
      77%  { transform:translate(-5px,0); filter:brightness(1.8) contrast(1.5); }
      79%  { transform:translate(5px,0);  filter:brightness(0.4) contrast(1.8); }
      82%  { transform:translate(-3px,0); filter:brightness(2.0); }
      85%  { transform:translate(0);   filter:brightness(0.3); }
      90%  { transform:translate(-6px,0); filter:brightness(2.5) contrast(2); }
      93%  { transform:translate(0);   filter:brightness(0.1); }
      100% { transform:translate(0);   filter:none; }
    }
    .ending-glitch-anim {
      animation: endingGlitch 0.9s steps(1) forwards;
    }
  `;
  document.head.appendChild(style);
})();

// ─────────────────────────────────────────────
//  백엔드 연동
// ─────────────────────────────────────────────
async function notifyDeath() {
  if (!SESSION_ID) return;
  try {
    await fetch(`${BASE_URL}/player-dead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID }),
    });
    if (LOOP_NUM < 3) {
      const res = await fetch(`${BASE_URL}/new-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: SESSION_ID }),
      });
      const data = await res.json();
      console.log('[new-loop]', data);
    }
  } catch (e) {
    console.warn('[백엔드 미연결] 오프라인 모드:', e.message);
  }
}

// ─────────────────────────────────────────────
//  초기화
// ─────────────────────────────────────────────
(async function init() {
  await fetchActualVillain(); // 진범 데이터를 먼저 로드

  const deathCause = sessionStorage.getItem('death_cause');
  sessionStorage.removeItem('death_cause');

  if (deathCause === 'timer') {
    showScene('scene-death');
    loadImg(
      document.getElementById('death-img'),
      'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550922/%E1%84%89%E1%85%A1%E1%84%86%E1%85%A1%E1%86%BC_%E1%84%8E%E1%85%AE%E1%84%85%E1%85%A1%E1%86%A8%E1%84%89%E1%85%A1_leqyal.png',
      document.getElementById('death-fallback')
    );
    setTimeout(() => {
      if (LOOP_NUM >= 3) goToEnding();
      else goToMorning();
    }, 3500);
  } else {
    renderSuspectCards();
    showScene('scene-select');
  }
})();
