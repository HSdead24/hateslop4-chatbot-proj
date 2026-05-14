// ═══════════════════════════════════════════════
//  ending.js  —  루프3 엔딩 (노이즈 타이핑 방식)
//
//  시퀀스:
//  1. 진입 시 강한 캔버스 노이즈 (레퍼런스 수준)
//  2. 노이즈 강도 점진적으로 감소 (4초)
//  3. 노이즈 걷히면 ending-content fade-in
//  4. 대사 순차 타이핑 (pauseBeforeType / speed 반영)
//  5. 타이핑 중 A+C 글리치 주기적 발동
//  6. isLast 대사 완료 후 "다시 시작" 버튼 표시
//  7. 버튼 클릭 → /opening
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
//  사용자 이름 로드 (opening에서 sessionStorage에 저장한 값)
// ─────────────────────────────────────────────
const USER_NAME = sessionStorage.getItem('player_name') || '000';

// ─────────────────────────────────────────────
//  대사 시퀀스 (확정본)
// ─────────────────────────────────────────────
const SCRIPT = [
  {
    text: '……아아.\n결국 또 여기까지 왔네 🐰',
    speed: 45,
  },
  {
    text: '몇 번째인지 기억해?\n치키는 기억해. 너는… 아마 모르겠지.',
    speed: 40,
  },
  {
    text: '매번 그래.\n아침에 눈 뜨고, 또 누군가를 찾아가고,\n같은 방식으로 파고들고, 무너뜨리고.\n그러다 또 끝나.',
    speed: 38,
  },
  {
    text: '치키가 루프를 만들었다고 생각해?\n치키가 없었어도 결국 이렇게 됐을 것 같은데. ☁️',
    speed: 42,
  },
  {
    pauseBeforeType: 400,
    text: '넌 원래 그렇게 살았어.\n죄책감도, 미안함도, 반성도 없이.\n매일 똑같이. 그냥.\n\n그 수많은 하루 중에\n딱 하루 네가 죽은 날을 반복한다고 해서\n뭐가 달라질 것 같아?',
    speed: 38,
  },
  {
    pauseBeforeType: 300,
    text: '그게 형벌이라고 생각해?\n\n…아니면 그냥 네 평소 하루랑\n똑같은 것 같아? ☁️',
    speed: 40,
  },
  {
    pauseBeforeType: 300,
    text: '<span class="name-em">김하윤</span> — 약물 조작. 상담 중 사망.\n<span class="name-em">박주원</span> — 심리 조종. 추락으로 위장.\n<span class="name-em">나영</span>   — 절벽으로 유도. 직접 살해.',
    speed: 52,
    isEvidence: true,
  },
  {
    text: '치키는 처음부터 다 알고 있었어.\n네가 어떤 사람이었는지. 무슨 짓을 했는지.',
    speed: 38,
  },
  {
    text: '왜냐하면—\n\n치키는 이 루프의 <span class="ominous">관리자</span>니까.\n죽은 사람들을 대신해서 너를 여기 붙잡아두는 <span class="ominous">집행자</span> 🐰\n\n도망치게 하면 안 되거든.',
    speed: 40,
  },
  {
    pauseBeforeType: 600,
    text: '이제 알겠어? 왜 아무도 널 구해주지 않았는지.\n왜 넌 매번 죽어야 했는지.\n왜 치키가 계속 웃고 있었는지 🐰',
    speed: 38,
  },
  {
    pauseBeforeType: 500,
    text: `또 만나, ${USER_NAME}. 🐰`,
    speed: 52,
    isLast: true,
  },
];

// ─────────────────────────────────────────────
//  DOM
// ─────────────────────────────────────────────
const noiseCanvas   = document.getElementById('noise-canvas');
const endingContent = document.getElementById('ending-content');
const endingScroll  = document.getElementById('ending-scroll');
const restartWrap   = document.getElementById('restart-wrap');
const restartBtn    = document.getElementById('restart-btn');
const ctx           = noiseCanvas.getContext('2d');

// ─────────────────────────────────────────────
//  캔버스 크기 맞추기
// ─────────────────────────────────────────────
function resizeCanvas() {
  noiseCanvas.width  = noiseCanvas.offsetWidth  || 430;
  noiseCanvas.height = noiseCanvas.offsetHeight || window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ─────────────────────────────────────────────
//  치키 이미지 3개 미리 로드 (기본 → 웃음 → 크게웃음)
// ─────────────────────────────────────────────
const CHIKI_IMGS = [
  'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550862/%E1%84%8E%E1%85%B5%E1%84%8F%E1%85%B5_%E1%84%80%E1%85%B5%E1%84%87%E1%85%A9%E1%86%AB_iasok9.png',
  'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550860/%E1%84%8E%E1%85%B5%E1%84%8F%E1%85%B5_%E1%84%8B%E1%85%AE%E1%86%BA%E1%84%8B%E1%85%B3%E1%86%B7_rn8ecs.png',
  'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550858/%E1%84%8E%E1%85%B5%E1%84%8F%E1%85%B5_%E1%84%8F%E1%85%B3%E1%84%80%E1%85%A6%E1%84%8B%E1%85%AE%E1%86%BA%E1%84%8B%E1%85%B3%E1%86%B7_za0aws.png',
].map(src => {
  const el = new Image();
  el.crossOrigin = 'anonymous';
  el.src = src;
  return el;
});

// ─────────────────────────────────────────────
//  노이즈 렌더러
//  intensity: 0.0 ~ 1.0 (1.0 = 최대 노이즈)
//  imgOpacity: 0.0 ~ 1.0 (이미지 투명도)
// ─────────────────────────────────────────────
function drawNoise(intensity, imgOpacity = 0, imgIndex = 0) {
  const W = noiseCanvas.width;
  const H = noiseCanvas.height;

  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, W, H);

  // 구간별 치키 이미지
  if (imgOpacity > 0) {
    const chikiImgEl = CHIKI_IMGS[imgIndex];
    if (chikiImgEl && chikiImgEl.complete && chikiImgEl.naturalWidth > 0) {
      const iw = chikiImgEl.naturalWidth;
      const ih = chikiImgEl.naturalHeight;
      const scale = Math.max(W / iw, H / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (W - dw) / 2;
      const dy = (H - dh) / 2;
      ctx.save();
      ctx.globalAlpha = imgOpacity;
      ctx.drawImage(chikiImgEl, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  if (intensity <= 0) return;

  // 수평 노이즈 밴드 — 이미지 위에 덮어씀
  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;

  for (let y = 0; y < H; y++) {
    const linePow = Math.random();
    const rowNoise = linePow < 0.10
      ? -(Math.random() * intensity * 220)
      : linePow < 0.25
        ? (Math.random() - 0.5) * intensity * 160
        : linePow < 0.50
          ? (Math.random() - 0.5) * intensity * 70
          : (Math.random() - 0.5) * intensity * 22;

    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const px = (Math.random() - 0.5) * intensity * 40;
      // 현재 픽셀값(이미지가 합성된 상태)에 노이즈 적용
      d[i]   = Math.max(0, Math.min(255, d[i]   + rowNoise + px));
      d[i+1] = Math.max(0, Math.min(255, d[i+1] + rowNoise + px));
      d[i+2] = Math.max(0, Math.min(255, d[i+2] + rowNoise + px));
      d[i+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 수평 슬라이스 글리치
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  tmp.getContext('2d').drawImage(noiseCanvas, 0, 0);

  const thinCount = Math.floor(intensity * 38);
  for (let i = 0; i < thinCount; i++) {
    if (Math.random() > 0.55) continue;
    const sy = Math.floor(Math.random() * H);
    const sh = Math.floor(2 + Math.random() * 10);
    const dx = (Math.random() - 0.5) * intensity * 70;
    ctx.drawImage(tmp, 0, sy, W, sh, dx, sy, W, sh);
  }

  const thickCount = Math.floor(intensity * 10);
  for (let i = 0; i < thickCount; i++) {
    if (Math.random() > 0.55) continue;
    const sy = Math.floor(Math.random() * H);
    const sh = Math.floor(20 + Math.random() * 55);
    const dx = (Math.random() - 0.5) * intensity * 90;
    ctx.drawImage(tmp, 0, sy, W, sh, dx, sy, W, sh);
  }

  // 빽빽한 스캔라인
  const scanData = ctx.getImageData(0, 0, W, H);
  const sd = scanData.data;
  for (let y = 0; y < H; y++) {
    const mul = (y % 2 === 0 ? 0.72 : 1.0) * (y % 4 === 0 ? 0.82 : 1.0);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      sd[i] *= mul; sd[i+1] *= mul; sd[i+2] *= mul;
    }
  }
  ctx.putImageData(scanData, 0, 0);

  // 블록 노이즈
  const blockCount = Math.floor(intensity * 30);
  for (let i = 0; i < blockCount; i++) {
    const bx = Math.floor(Math.random() * W);
    const by = Math.floor(Math.random() * H);
    const bw = Math.floor(6 + Math.random() * intensity * 40);
    const bh = Math.floor(2 + Math.random() * 10);
    const v  = Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgba(${v},${v},${v},${0.4 + Math.random() * 0.5})`;
    ctx.fillRect(bx, by, bw, bh);
  }
}

// ─────────────────────────────────────────────
//  노이즈 인트로: intensity 1.0 → 0.0 (4초)
//  이미지: 0 → 0.45 → 0 (노이즈 중반에 슬쩍 드러남)
//  완료 후 엔딩 콘텐츠 표시 + 타이핑 시작
// ─────────────────────────────────────────────
const NOISE_DURATION = 4500;
let noiseStart = null;
let noiseRaf   = null;

function runNoiseIntro(timestamp) {
  if (!noiseStart) noiseStart = timestamp;
  const elapsed  = timestamp - noiseStart;
  const progress = Math.min(elapsed / NOISE_DURATION, 1.0);

  // 노이즈: easeOut 기본 점감 + 이미지 전환 시점 버스트
  // 전환 구간: 0.25, 0.40, 0.55 → 각각 ±0.03 범위에서 강하게 튐
  const baseIntensity = 1.0 - Math.pow(progress, 0.55);
  const burstZones = [0.25, 0.40, 0.55];
  const burstWidth = 0.06;
  let burst = 0;
  for (const zone of burstZones) {
    const dist = Math.abs(progress - zone);
    if (dist < burstWidth) {
      burst = Math.max(burst, (1.0 - dist / burstWidth) * 1.5);
    }
  }
  const intensity = Math.min(1.0, baseIntensity + burst);

  // 이미지 투명도 + 인덱스 곡선:
  // 0~25%:  안 보임
  // 25~40%: 기본(0) 등장
  // 40~55%: 웃음(1) 등장
  // 55~75%: 크게웃음(2) 등장
  // 75~85%: 유지
  // 85~100%: 사라짐
  let imgOpacity = 0;
  let imgIndex = 0;

  if (progress >= 0.25 && progress < 0.40) {
    imgOpacity = ((progress - 0.25) / 0.15) * 0.10;
    imgIndex = 0;
  } else if (progress >= 0.40 && progress < 0.55) {
    imgOpacity = 0.10;
    imgIndex = 1;
  } else if (progress >= 0.55 && progress < 0.85) {
    imgOpacity = 0.10;
    imgIndex = 2;
  } else if (progress >= 0.85) {
    imgOpacity = 0.10 * (1.0 - (progress - 0.85) / 0.15);
    imgIndex = 2;
  }

  drawNoise(intensity, imgOpacity, imgIndex);

  if (progress < 1.0) {
    noiseRaf = requestAnimationFrame(runNoiseIntro);
  } else {
    ctx.clearRect(0, 0, noiseCanvas.width, noiseCanvas.height);
    noiseCanvas.style.display = 'none';
    endingContent.classList.add('visible');
    setTimeout(() => startTypingSequence(), 600);
  }
}

// ─────────────────────────────────────────────
//  타이핑 시퀀스
// ─────────────────────────────────────────────
const JUNK_CHARS = '░▒▓█▄▀■□╬╪═╦';
let glitchInterval = null;

function startTypingSequence() {
  // 글리치 루프 시작 (정기적으로 모든 블록에 발동)
  startGlitchLoop();
  runBlock(0);
}

function runBlock(idx) {
  if (idx >= SCRIPT.length) return;

  const line = SCRIPT[idx];
  const pause = line.pauseBeforeType || 0;

  setTimeout(() => {
    // 새 블록 생성
    const block = document.createElement('div');
    block.className = 'type-block' + (line.isEvidence ? ' evidence' : '');
    block.setAttribute('data-raw', line.text);
    endingScroll.appendChild(block);

    // 표시 (fade-in)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => block.classList.add('visible'));
    });

    // 타이핑
    typeBlock(block, line.text, line.speed || 40, () => {
      endingScroll.scrollTop = endingScroll.scrollHeight;

      if (line.isLast) {
        // 마지막 대사 → 버튼 표시
        setTimeout(() => {
          restartWrap.style.display = 'block';
        }, 800);
      } else {
        // 다음 블록 (블록 간 호흡)
        const gap = 700;
        setTimeout(() => runBlock(idx + 1), gap);
      }
    });
  }, pause);
}

// ─────────────────────────────────────────────
//  타이핑 함수 (HTML 태그 보존 + \n → <br>)
// ─────────────────────────────────────────────
function typeBlock(el, rawText, speed, onDone) {
  // HTML 태그와 일반 문자를 토큰으로 분리
  const TOKEN_RE = /(<[^>]+>[\s\S]*?<\/[^>]+>|<[^>]+\/>|\n|[\s\S])/g;
  const tokens   = rawText.match(TOKEN_RE) || [];

  el.innerHTML = '';
  let i = 0;

  // 커서 엘리먼트
  const cursor = document.createElement('span');
  cursor.className = 'type-cursor';

  function next() {
    if (i >= tokens.length) {
      cursor.remove();
      el.innerHTML = rawText.replace(/\n/g, '<br>');
      el.setAttribute('data-raw', rawText);
      if (onDone) onDone();
      return;
    }

    const tok = tokens[i++];

    if (tok === '\n') {
      el.appendChild(document.createElement('br'));
    } else if (tok.startsWith('<')) {
      const wrap = document.createElement('span');
      wrap.innerHTML = tok;
      el.appendChild(wrap);
    } else {
      el.appendChild(document.createTextNode(tok));
    }

    // 커서는 항상 마지막에
    if (cursor.parentNode) cursor.remove();
    el.appendChild(cursor);

    endingScroll.scrollTop = endingScroll.scrollHeight;
    setTimeout(next, speed + (Math.random() - 0.5) * (speed * 0.3));
  }

  next();
}

// ─────────────────────────────────────────────
//  A+C 글리치 루프
//  — 모든 .type-block.visible 에 주기적으로 발동
// ─────────────────────────────────────────────
function startGlitchLoop() {
  // 2~4초마다 랜덤 블록 1개에 글리치 버스트
  function scheduleNext() {
    const delay = 2000 + Math.random() * 2000;
    glitchInterval = setTimeout(() => {
      triggerGlitchBurst();
      scheduleNext();
    }, delay);
  }
  scheduleNext();
}

function triggerGlitchBurst() {
  const blocks = Array.from(document.querySelectorAll('.type-block.visible'));
  if (blocks.length === 0) return;

  const target = blocks[Math.floor(Math.random() * blocks.length)];
  const rawText = target.getAttribute('data-raw') || '';
  if (!rawText) return;

  // C: 문자 깨짐 시퀀스 + A: CSS 글리치 동시 발동
  const delay = (Math.random() * 0.08).toFixed(3) + 's';
  target.style.setProperty('--g-delay', delay);

  const seq = [
    { ratio: 0.55, dur: 55 },
    { ratio: 0.80, dur: 45 },
    { ratio: 0.50, dur: 55 },
    { ratio: 0.25, dur: 65 },
    { ratio: 0.10, dur: 75 },
    { ratio: 0.0,  dur: 0  },
  ];

  let phase = 0;

  function runPhase() {
    if (phase >= seq.length) {
      // 복원
      target.classList.remove('glitch-ac');
      target.innerHTML = rawText.replace(/\n/g, '<br>');
      return;
    }

    const { ratio, dur } = seq[phase];

    if (ratio > 0) {
      // C: 글자 깨짐
      target.innerHTML = junkifyHTML(rawText, ratio).replace(/\n/g, '<br>');
    } else {
      target.innerHTML = rawText.replace(/\n/g, '<br>');
    }

    // A: CSS 색수차 (첫 2 phase에만)
    if (phase < 2) {
      target.classList.add('glitch-ac');
      setTimeout(() => target.classList.remove('glitch-ac'), dur);
    }

    phase++;
    if (phase < seq.length) setTimeout(runPhase, dur);
    else {
      setTimeout(() => {
        target.innerHTML = rawText.replace(/\n/g, '<br>');
      }, 80);
    }
  }

  runPhase();
}

// HTML 태그는 보존하고 텍스트 노드만 깨뜨리기
function junkifyHTML(rawText, ratio) {
  return rawText.replace(/(<[^>]+>[\s\S]*?<\/[^>]+>|<[^>]+\/>)|([^<\n]+)/g, (match, tag, text) => {
    if (tag) return tag; // HTML 태그는 그대로
    if (!text) return match;
    return text.split('').map(c => {
      if (c === ' ') return c;
      return Math.random() < ratio
        ? JUNK_CHARS[Math.floor(Math.random() * JUNK_CHARS.length)]
        : c;
    }).join('');
  });
}

// ─────────────────────────────────────────────
//  다시 시작 버튼
// ─────────────────────────────────────────────
restartBtn.addEventListener('click', () => {
  // 글리치 루프 정지
  clearTimeout(glitchInterval);

  // sessionStorage 초기화 (새 게임)
  sessionStorage.removeItem('session_id');
  sessionStorage.removeItem('loop_num');
  sessionStorage.removeItem('last_button_id');
  sessionStorage.removeItem('timer_start');

  window.location.href = '/opening';
});

// ─────────────────────────────────────────────
//  시작
// ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // 노이즈 인트로 시작
  requestAnimationFrame(runNoiseIntro);
});
