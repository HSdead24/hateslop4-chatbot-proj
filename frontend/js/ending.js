// ═══════════════════════════════════════════════
//  ending.js  —  루프3 사망 엔딩
//  치키 이미지 + 말풍선 순차 타이핑
//  탭/클릭으로 진행
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
//  치키 이미지 목록
//  실제 파일명에 맞게 수정해주세요
// ─────────────────────────────────────────────
const CHIKI_IMAGES = {
  default:  '/frontend/images/치키_기본.png',
  smile:    '/frontend/images/치키_웃음.png',
  laugh:    '/frontend/images/치키_크게웃음.png',
  close:    '/frontend/images/치키_접근.jpeg',
  whisper:  '/frontend/images/치키_귓속말.png',
};

// ─────────────────────────────────────────────
//  대사 시퀀스
//  image          : 이 대사 시작 시 치키 이미지 교체
//  text           : 타이핑될 텍스트 (\n = 줄바꿈, HTML 태그 가능)
//  speed          : ms / 글자 (숫자 클수록 느림)
//  pauseBeforeType: 이미지 교체 후 타이핑 전 대기 ms
//  isLast         : true 이면 탭 힌트 없이 화면 유지
// ─────────────────────────────────────────────
const SCRIPT = [
  {
    image: 'default',
    text: '……아아.\n결국 또 여기까지 왔네 🐰',
    speed: 45,
  },
  {
    text: '이번엔 꽤 오래 버텼다?\n치키 조금 놀랐어. 히히.',
    speed: 40,
  },
  {
    text: '범인 찾았어? 누가 널 죽였는지… 왜 죽였는지…\n다 알아냈어? ☁️',
    speed: 38,
  },
  {
    text: '……근데 있지.\n너 계속 착각하고 있었어.\n이 게임은 원래부터\n\'범인 찾기\' 같은 게 아니었거든 ⏳',
    speed: 42,
  },
  {
    image: 'smile',
    pauseBeforeType: 400,
    text: '너는 계속 자기가 피해자라고 믿었지. 그래야 편하니까 🙂\n\n근데 이상하지 않았어?\n왜 다들 널 그렇게 무서워했을까.\n왜 죽은 사람들 이름이… 전부 네 주변에만 있었을까 💭',
    speed: 38,
  },
  {
    image: 'laugh',
    pauseBeforeType: 300,
    text: '<span class="name-em">김하윤. 박주원. 나영.</span> 다 기억나? 🐰',
    speed: 48,
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
    text: '그래서 계속 반복된 거야 ⏳\n\n죽기 24시간 전.\n네가 끝까지 외면했던 순간을 다시 보게 하려고.',
    speed: 42,
  },
  {
    image: 'close',
    pauseBeforeType: 600,
    text: '이제 알겠어? 왜 아무도 널 구해주지 않았는지.\n왜 넌 매번 죽어야 했는지.\n왜 치키가 계속 웃고 있었는지 🐰',
    speed: 38,
  },
  {
    image: 'whisper',
    pauseBeforeType: 500,
    text: '이번엔…\n\n정말 끝낼 수 있을까?',
    speed: 52,
    isLast: true,
  },
];

// ─────────────────────────────────────────────
//  상태
// ─────────────────────────────────────────────
let currentIdx   = 0;
let isTyping     = false;
let typeTimer    = null;
let waitForTap   = false;

// ─────────────────────────────────────────────
//  DOM
// ─────────────────────────────────────────────
const chikiImg    = document.getElementById('chiki-img');
const bubbleText  = document.getElementById('bubble-text');
const cursorEl    = document.getElementById('cursor');
const tapHint     = document.getElementById('tap-hint');
const restartWrap = document.getElementById('restart-wrap');
const restartBtn  = document.getElementById('restart-btn');

// ─────────────────────────────────────────────
//  치키 이미지 교체 (페이드)
// ─────────────────────────────────────────────
function changeChikiImage(key) {
  const src = CHIKI_IMAGES[key];
  if (!src) return;

  chikiImg.style.opacity = '0';
  setTimeout(() => {
    chikiImg.src = src;
    chikiImg.style.opacity = '1';
  }, 350);
}

// ─────────────────────────────────────────────
//  텍스트 한 글자씩 타이핑
//  HTML 태그(<span> 등)는 통째로 삽입
// ─────────────────────────────────────────────
function typeText(rawText, speed, onDone) {
  // rawText의 \n을 실제 줄바꿈 마커로 두고
  // HTML 태그와 일반 텍스트를 토큰 단위로 분리
  const TOKEN_RE = /(<[^>]+>.*?<\/[^>]+>|<[^>]+\/>|\n|[\s\S])/g;
  const tokens = rawText.match(TOKEN_RE) || [];

  bubbleText.innerHTML = '';
  let i = 0;

  function next() {
    if (i >= tokens.length) {
      onDone();
      return;
    }
    const tok = tokens[i++];

    if (tok === '\n') {
      bubbleText.appendChild(document.createElement('br'));
      typeTimer = setTimeout(next, speed * 0.3);
    } else if (tok.startsWith('<')) {
      // HTML 태그 통째로
      const wrap = document.createElement('span');
      wrap.innerHTML = tok;
      bubbleText.appendChild(wrap);
      typeTimer = setTimeout(next, speed);
    } else {
      bubbleText.appendChild(document.createTextNode(tok));
      typeTimer = setTimeout(next, speed);
    }
  }

  next();
}

// ─────────────────────────────────────────────
//  대사 라인 표시
// ─────────────────────────────────────────────
function showLine(idx) {
  if (idx >= SCRIPT.length) return;

  const line = SCRIPT[idx];
  isTyping   = true;
  waitForTap = false;

  tapHint.style.display = 'none';
  cursorEl.classList.remove('hidden');

  // 이미지 교체
  if (line.image) changeChikiImage(line.image);

  const startTyping = () => {
    typeText(line.text, line.speed || 40, () => {
      // 타이핑 완료
      isTyping = false;
      cursorEl.classList.add('hidden');

      if (line.isLast) {
        // 마지막 → 재시작 버튼 표시
        setTimeout(() => {
          restartWrap.style.display = 'block';
        }, 800);
        return;
      }

      waitForTap = true;
      tapHint.style.display = 'block';
    });
  };

  const delay = line.pauseBeforeType || 0;
  setTimeout(startTyping, delay);
}

// ─────────────────────────────────────────────
//  탭/클릭 처리
// ─────────────────────────────────────────────
function handleTap() {
  if (isTyping) {
    // 타이핑 중 → 즉시 완성
    clearTimeout(typeTimer);
    isTyping = false;
    cursorEl.classList.add('hidden');

    const line = SCRIPT[currentIdx];
    // HTML span 태그 유지하면서 \n → <br>
    bubbleText.innerHTML = line.text.replace(/\n/g, '<br>');

    waitForTap = true;
    tapHint.style.display = 'block';
    return;
  }

  if (waitForTap) {
    waitForTap = false;
    currentIdx++;
    showLine(currentIdx);
  }
}

// ─────────────────────────────────────────────
//  이벤트
// ─────────────────────────────────────────────
document.getElementById('app').addEventListener('click', handleTap);
document.getElementById('app').addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleTap();
}, { passive: false });

// ─────────────────────────────────────────────
//  재시작 버튼
// ─────────────────────────────────────────────
restartBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  window.location.href = '/opening';
});

// ─────────────────────────────────────────────
//  시작
// ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  showLine(0);
});