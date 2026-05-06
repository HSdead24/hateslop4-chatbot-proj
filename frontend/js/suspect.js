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
const BASE_URL = 'https://hateslop4-dead24.onrender.com';

// ─────────────────────────────────────────────
//  범인 NPC → 사망 이미지 매핑
// ─────────────────────────────────────────────
const VILLAIN_MAP = {
  // 엄마
  511: '엄마', 608: '엄마', 609: '엄마', 610: '엄마', 611: '엄마',
  612: '엄마', 613: '엄마', 614: '엄마', 615: '엄마', 620: '엄마',
  // 김도현
  600: '김도현', 602: '김도현', 604: '김도현', 606: '김도현',
  708: '김도현', 709: '김도현', 710: '김도현', 711: '김도현',
  712: '김도현', 713: '김도현', 714: '김도현', 715: '김도현',
  724: '김도현', 725: '김도현', 728: '김도현', 731: '김도현',
  732: '김도현', 733: '김도현', 739: '김도현', 746: '김도현',
  747: '김도현', 749: '김도현', 750: '김도현', 752: '김도현',
  753: '김도현', 754: '김도현', 755: '김도현', 759: '김도현',
  760: '김도현', 761: '김도현', 762: '김도현', 764: '김도현',
  // 박도원
  621: '박도원', 622: '박도원', 624: '박도원', 626: '박도원', 628: '박도원',
  716: '박도원', 717: '박도원', 718: '박도원', 719: '박도원',
  720: '박도원', 721: '박도원', 722: '박도원', 723: '박도원',
  742: '박도원', 745: '박도원', 748: '박도원', 751: '박도원',
  758: '박도원', 765: '박도원',
  // 차서연
  700: '차서연', 701: '차서연', 702: '차서연', 703: '차서연',
  704: '차서연', 705: '차서연', 706: '차서연', 707: '차서연',
  726: '차서연', 727: '차서연', 729: '차서연', 730: '차서연',
  734: '차서연', 735: '차서연', 736: '차서연', 737: '차서연',
  738: '차서연', 740: '차서연', 741: '차서연', 743: '차서연',
  744: '차서연', 756: '차서연', 757: '차서연', 763: '차서연',
};

// 범인 NPC → 사망 이미지 파일명
const DEATH_IMAGE_MAP = {
  '김도현': 'images/사망_루프.png',
  '차서연': 'images/사망_피 토 하는 사람.png',
  '박도원': 'images/사망2_칼.png',
  '엄마': 'images/사망_방.png',
};

// NPC 정보 (아바타 색상, 역할)
const NPC_INFO = {
  '김도현': { color: '#6a7f99', role: '내담자', initials: '도현', profile: 'images/kim_profile.png' },
  '차서연': { color: '#5a8870', role: '신경과 의사', initials: '서연', profile: 'images/cha_profile.png' },
  '박도원': { color: '#7a6a5a', role: '청소부', initials: '도원', profile: 'images/park_profile.png' },
  '엄마': { color: '#8a7040', role: '가족', initials: '엄마', profile: 'images/umma_profile.png' },
};

// ─────────────────────────────────────────────
//  상태
// ─────────────────────────────────────────────
let selectedSuspect = null;   // 유저가 고른 범인 이름
const ACTUAL_VILLAIN = VILLAIN_MAP[LAST_BTN_ID] || '김도현';  // 실제 범인 (스토리상)

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
//  이미지 로드 헬퍼 (없으면 fallback 표시)
// ─────────────────────────────────────────────
function loadImg(imgEl, src, fallbackEl) {
  if (!src) {
    imgEl.style.display = 'none';
    if (fallbackEl) fallbackEl.style.display = 'flex';
    return;
  }

  // 한글·공백 포함 파일명 URL 인코딩
  // 'images/사망_피 토 하는 사람.png' → 'images/%EC%82%AC%EB%A7%9D_...'
  const parts = src.split('/');
  const filename = parts.pop();
  const encoded = parts.join('/') + '/' + encodeURIComponent(filename);

  // 일단 즉시 보여주고, 로드 실패 시 fallback으로 교체
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
        <div class="suspect-name">${name}</div>
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
//  확정 버튼 클릭 → Scene 2 (치키 확인 멘트)
// ─────────────────────────────────────────────
function confirmSuspect() {
  if (!selectedSuspect) return;

  // 치키 확인 멘트 텍스트 세팅
  document.getElementById('chiki-confirm-text').innerHTML =
    `내가 <span class="highlight">${selectedSuspect}</span>으로부터 지켜줄게~! 🐰✨<br>걱정 마, 치키가 옆에 있을게.`;

  showScene('scene-confirm');

  // 3초 후 밤 씬으로
  fadeToScene('scene-night', 3000);

  // 밤 씬 이미지 세팅
  loadImg(
    document.getElementById('night-img'),
    'images/밤.png',
    document.getElementById('night-fallback')
  );

  // 밤 2.5초 후 사망 씬으로
  setTimeout(() => {
    goToDeath();
  }, 5500);
}

// ─────────────────────────────────────────────
//  사망 씬
// ─────────────────────────────────────────────
function goToDeath() {
  showScene('scene-death');

  const deathImg = DEATH_IMAGE_MAP[ACTUAL_VILLAIN] || DEATH_IMAGE_MAP['김도현'];
  loadImg(
    document.getElementById('death-img'),
    deathImg,
    document.getElementById('death-fallback')
  );

  // 백엔드 사망 처리
  notifyDeath();

  // 3초 후 다음 씬으로
  setTimeout(() => {
    if (LOOP_NUM >= 3) {
      goToEnding();
    } else {
      goToMorning();
    }
  }, 3500);
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
    'images/아침_방.png',
    document.getElementById('morning-fallback')
  );

  // ★ 다음 루프 sessionStorage 업데이트
  sessionStorage.setItem('loop_num', String(nextLoop));
  // ★ 타이머 리셋 — 유저가 화면 탭해서 buttonroom 진입할 때 새 24분 시작
  sessionStorage.removeItem('timer_start');
}

// 아침 씬 탭 → 버튼룸으로
function tapMorning() {
  window.location.href = 'buttonroom.html';
}

// ─────────────────────────────────────────────
//  엔딩 씬 (루프 3 종료)
// ─────────────────────────────────────────────
function goToEnding() {
  showScene('scene-ending');

  loadImg(
    document.getElementById('ending-img'),
    'images/엔딩.png',
    document.getElementById('ending-fallback')
  );
}

// ─────────────────────────────────────────────
//  백엔드 연동
// ─────────────────────────────────────────────
async function notifyDeath() {
  if (!SESSION_ID) return;
  try {
    // /player-dead → /new-loop 순서
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
(function init() {
  const deathCause = sessionStorage.getItem('death_cause');
  sessionStorage.removeItem('death_cause');  // 1회용 플래그 초기화

  if (deathCause === 'timer') {
    // 타이머 사망 → 범인 선택 없이 바로 사망 이미지 (추락사)
    showScene('scene-death');
    loadImg(
      document.getElementById('death-img'),
      'images/사망_추락사.png',
      document.getElementById('death-fallback')
    );
    setTimeout(() => {
      if (LOOP_NUM >= 3) goToEnding();
      else goToMorning();
    }, 3500);
  } else {
    // 대화 20회 소진 → 범인 선택 화면
    renderSuspectCards();
    showScene('scene-select');
  }
})();