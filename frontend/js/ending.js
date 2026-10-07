// ═══════════════════════════════════════════════
//  ending.js  —  루프3 엔딩 (노이즈 타이핑 방식)
//
//  시퀀스:
//  1. 진입 시 강한 캔버스 노이즈 (레퍼런스 수준)
//  2. 노이즈 강도 점진적으로 감소 (4초)
//  3. 노이즈 걷히면 ending-content fade-in
//  4. 대사 순차 타이핑 (pauseBeforeType / speed 반영)
//  5. 타이핑 중 A+C 글리치 주기적 발동
//  6. isLast 대사 완료 후 "눈을 뜬다" 버튼 표시
//  7. 버튼 클릭 → /opening
//  8. 배경음(5분)이 끝나면 자동으로 /opening (3초 전 SYSTEM 팝업)
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
//  수감번호 — 엔딩에서 가해자는 이름 대신 수감번호로만 부른다
//  0903 = 사망일, 4127 = 의미 없는 관리 번호
// ─────────────────────────────────────────────
const PRISONER_NO = '0903-4127';

// 피해자 규모: 숫자가 보이지 않도록 계속 깨지는 글자 (startCorruptLoop에서 갱신)
const CORRUPT_COUNT = '<span class="corrupt" data-len="3">███</span>';

// ─────────────────────────────────────────────
//  대사 시퀀스
//  speaker: 'system' → 게임 시스템의 판정·기록 (차갑고 사무적인 톤)
//           'notice' → 형벌 집행 통지서 (문서 상자 디자인)
//           생략     → 관리자(사실은 집행자) 치키의 대사
//  구성: [SYSTEM] 판정 → [치키] 등장 → [SYSTEM] 사건 기록
//        → [통지서] 형벌 집행 → [치키] 남겨진 사람들의 회복 (이모지 없이 담담하게)
//        → [SYSTEM] 기억 삭제 · LOOP 1
// ─────────────────────────────────────────────
const SCRIPT = [
  {
    speaker: 'system',
    text: '판정 — 생존 실패.\n남은 기회: 0 / 3\n\n9월 3일 오전 0시. 침입 확인.\n9월 3일 오전 7시. 사망 확인.\n\n세 번의 하루 동안,\n대상은 단 한 번도 자신을 의심하지 않았습니다.',
    speed: 30,
  },
  {
    pauseBeforeType: 600,
    text: '……아아. 결국 또 여기까지 왔네 🐰',
    speed: 45,
  },
  {
    speaker: 'system',
    pauseBeforeType: 500,
    text: `사건 기록 조회.\n대상: 수감번호 ${PRISONER_NO}\n\n<span class="name-em">나영</span> — 친동생. 가족 여행 중 절벽 끝으로 유도, 추락.\n당시 대상 13세. 사고로 종결.\n\n<span class="name-em">김하윤</span> — 대학원 실습 당시 내담자.\n상담실 밖 사적 접촉, 약물 조작. 치사량 복용으로 위장. 자살로 종결.\n\n<span class="name-em">박주원</span> — 전 연인. 고립, 가스라이팅.\n진료 기록과 약물로 '불안정한 사람'을 만듦. 강릉에서 추락. 자살로 종결.\n\n그 외 기록 — 표시 생략.\n피해자 규모: ${CORRUPT_COUNT}명`,
    speed: 26,
  },
  {
    speaker: 'notice',
    pauseBeforeType: 900,
    text: `<span class="notice-title">형벌 집행 통지서</span>\n<span class="nf">수감번호</span>${PRISONER_NO}\n<span class="nf">죄명</span>연쇄 살인 및 심리적 살해\n<span class="nf">피해자 규모</span>${CORRUPT_COUNT}명\n<span class="nf">형벌</span>사망 전 24시간의 무기한 반복\n\n<span class="nf">집행 방법</span>\n1. 매 회차, 기억이 삭제된 상태로 9월 2일 오전 7시에 눈을 뜬다.\n2. 대상은 스스로를 피해자로 믿는다.\n3. 대상이 해친 사람들의 원한 속에서 하루를 보낸다.\n4. 9월 3일 오전 7시, 사망한다.\n5. 1로 돌아간다.\n\n<span class="nf">기한</span>없음\n<span class="nf">비고</span><span class="notice-stamp">집행자 — 치키</span>`,
    speed: 20,
  },
  {
    pauseBeforeType: 900,
    text: '너희 엄마는 요즘 나영이 사진을 다시 꺼내 봐.\n처음으로, 마음 놓고 우는 기일을 보냈어.\n김도현은 하윤이 이름을 부르면서 웃을 수 있게 됐고,\n박도원은 걸레를 내려놓고 딸의 일기장을 덮었어.\n차서연은 주원이한테 꽃을 들고 갔어. 이번엔 손이 떨리지 않았어.',
    speed: 48,
  },
  {
    speaker: 'system',
    pauseBeforeType: 1200,
    text: `수감자 ${PRISONER_NO}의 기억을 삭제합니다.\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%`,
    speed: 110,
  },
  {
    speaker: 'system',
    pauseBeforeType: 800,
    text: '9월 2일 오전 7시.\n<span class="loop-reset">LOOP 1</span>',
    speed: 70,
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
const ctx = noiseCanvas.getContext('2d', { willReadFrequently: true });

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
  startCorruptLoop();
  runBlock(0);
}

function runBlock(idx) {
  if (idx >= SCRIPT.length) return;

  const line = SCRIPT[idx];
  const pause = line.pauseBeforeType || 0;

  setTimeout(() => {
    // 새 블록 생성
    const block = document.createElement('div');
    block.className = 'type-block' + (line.speaker ? ` ${line.speaker}` : '');
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
          endingScroll.scrollTop = endingScroll.scrollHeight;
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
//  피해자 규모 — .corrupt 글자를 계속 깨뜨려 숫자가 보이지 않게
// ─────────────────────────────────────────────
function startCorruptLoop() {
  setInterval(() => {
    document.querySelectorAll('.corrupt').forEach(el => {
      const len = Number(el.dataset.len) || 3;
      let out = '';
      for (let k = 0; k < len; k++) {
        out += JUNK_CHARS[Math.floor(Math.random() * JUNK_CHARS.length)];
      }
      el.textContent = out;
    });
  }, 90);
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
// 새 게임으로 초기화 후 시작 페이지로 ('눈을 뜬다' 버튼 / 음원 종료 공용)
function restartLoop() {
  clearTimeout(glitchInterval);
  stopEndingAudio();

  // sessionStorage 초기화 (새 게임) — 단서·치키 트리거 등 모든 기록 삭제
  sessionStorage.clear();

  window.location.href = '/opening';
}

restartBtn.addEventListener('click', restartLoop);

// ─────────────────────────────────────────────
//  엔딩 배경음 (5분) — 끝나면 자동으로 시작 페이지로
//  - 끝나기 3초 전 SYSTEM 팝업으로 루프 재시작 안내
//  - 자동 재생이 막히면 SYSTEM 팝업 "화면을 터치하세요"를 띄우고
//    터치할 때까지 엔딩 전체(노이즈 인트로·대사)를 멈춰둔다
//    (30초 동안 터치가 없으면 소리 없이 자동 시작, 남은 시간을 작게 표시)
//  - 소리가 끝내 재생되지 않아도 엔딩 시작 후 5분이 지나면 이동
// ─────────────────────────────────────────────
const ENDING_AUDIO_SRC   = '/frontend/audio/ending-static.mp3';
const ENDING_DURATION_MS = 300 * 1000;  // 음원 길이 (5분)
const RESTART_NOTICE_SEC = 3;           // 끝나기 몇 초 전에 팝업을 띄울지
const GATE_TIMEOUT_SEC   = 30;          // 터치 팝업: 이 시간 동안 터치가 없으면 소리 없이 시작

const endingAudio = new Audio(ENDING_AUDIO_SRC);
endingAudio.preload = 'auto';
endingAudio.volume  = 0.7;

let fallbackTimer   = null;  // 음원이 재생되지 않을 때 쓰는 5분 타이머
let noticeShown     = false;

function stopEndingAudio() {
  endingAudio.pause();
  clearTimeout(fallbackTimer);
}

// 엔딩 본편 시작: 노이즈 인트로 → 대사 타이핑, 5분 대체 타이머
let endingStarted = false;
function beginEnding() {
  if (endingStarted) return;
  endingStarted = true;
  requestAnimationFrame(runNoiseIntro);
  startFallbackTimer();
  if (!endingAudio.paused) clearTimeout(fallbackTimer);
}

// 진입 시: 자동 재생 시도 → 성공하면 바로 시작, 막히면 터치 팝업
function tryAutoplay() {
  endingAudio.play()
    .then(beginEnding)
    .catch(openTouchGate);
}

// 터치 팝업 열기 + 30초 카운트다운 (0이 되면 소리 없이 시작)
let gateTimer = null;
function openTouchGate() {
  touchGate.classList.add('show');
  touchGate.addEventListener('pointerdown', onGateTouch, { once: true });

  let left = GATE_TIMEOUT_SEC;
  const countEl = document.getElementById('gate-countdown');
  const render = () => { countEl.textContent = `00:${String(left).padStart(2, '0')}`; };
  render();
  gateTimer = setInterval(() => {
    left -= 1;
    render();
    if (left <= 0) {
      clearInterval(gateTimer);
      touchGate.removeEventListener('pointerdown', onGateTouch);
      touchGate.classList.remove('show');
      beginEnding();
    }
  }, 1000);
}

// 터치 팝업을 누르면: 사용자 동작 안에서 재생 → 팝업 닫고 엔딩 시작
function onGateTouch() {
  clearInterval(gateTimer);
  touchGate.classList.remove('show');
  endingAudio.play()
    .catch(() => {})   // 그래도 실패하면 소리 없이 진행 (5분 타이머로 이동 보장)
    .finally(beginEnding);
}

endingAudio.addEventListener('playing', () => clearTimeout(fallbackTimer));

// 남은 시간 표시 팝업: "3초 후 루프가 다시 시작됩니다."
function showRestartNotice(secondsLeft) {
  if (noticeShown) return;
  noticeShown = true;
  restartNotice.classList.add('show');

  let left = Math.max(1, Math.round(secondsLeft));
  const countEl = document.getElementById('restart-notice-count');
  countEl.textContent = left;
  const tick = setInterval(() => {
    left -= 1;
    if (left <= 0) { clearInterval(tick); return; }
    countEl.textContent = left;
  }, 1000);
}

endingAudio.addEventListener('timeupdate', () => {
  const remaining = endingAudio.duration - endingAudio.currentTime;
  if (remaining <= RESTART_NOTICE_SEC) showRestartNotice(remaining);
});
endingAudio.addEventListener('ended', restartLoop);

// 팝업 DOM
const restartNotice = document.getElementById('restart-notice');
const touchGate     = document.getElementById('touch-gate');

function startFallbackTimer() {
  // 음원이 재생되면 'playing' 이벤트에서 해제됨
  fallbackTimer = setTimeout(restartLoop, ENDING_DURATION_MS);
  setTimeout(() => {
    if (endingAudio.paused) showRestartNotice(RESTART_NOTICE_SEC);
  }, ENDING_DURATION_MS - RESTART_NOTICE_SEC * 1000);
}

// ─────────────────────────────────────────────
//  시작
// ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // 배경음 자동 재생 시도 → 성공 시 노이즈 인트로부터 시작, 막히면 터치 팝업 후 시작
  tryAutoplay();
});
