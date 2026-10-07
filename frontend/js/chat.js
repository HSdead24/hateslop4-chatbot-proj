// ═══════════════════════════════════════════════
//  chat.js  —  Phase 2 채팅 UI 동작 로직
//  담당: NPC 전환 / 타이머 / 메시지 송수신 /
//        치키 트리거 / 드로어 / 사망 연출
// ═══════════════════════════════════════════════

const BASE_URL = '';

// ─────────────────────────────────────────────
//  NPC 데이터 — final_node 기반 동적 선택
// ─────────────────────────────────────────────
const ALL_NPCS = {
  차서연: {
    id: 0, name: '차서연', sub: '34세 · 여성', tag: '정신건강의학과 의사',
    tagColor: '#5a8870',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595780/chat/%EC%B0%A8%EC%84%9C%EC%97%B0/%EC%B0%A8%EC%84%9C%EC%97%B0_%ED%94%84%EB%A1%9C%ED%95%84.png',
  },
  엄마: {
    id: 1, name: '엄마', displayName: '윤미경', sub: '61세 · 여성', tag: '가족',
    tagColor: '#8a7040',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595815/chat/%EC%97%84%EB%A7%88/%EC%97%84%EB%A7%88_%ED%9B%84%ED%9B%97%20%EB%82%98%EB%8F%84%20%EB%AD%94%ED%91%9C%EC%A0%95%EC%9D%B8%EC%A7%80%EB%AA%B0%EB%9D%BC%20%ED%9B%84%ED%9B%97%20%EB%A8%B9%EA%B8%88.png',
  },
  박도원: {
    id: 2, name: '박도원', sub: '64세 · 남성', tag: '청소부',
    tagColor: '#5a6070',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595793/chat/%EB%B0%95%EB%8F%84%EC%9B%90/%EB%B0%95%EB%8F%84%EC%9B%90_%ED%94%84%EB%A1%9C%ED%95%84.png',
  },
  김도현: {
    id: 3, name: '김도현', sub: '36세 · 남성', tag: '내담자',
    tagColor: '#6a4050',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595806/chat/%EA%B9%80%EB%8F%84%ED%98%84/%EA%B9%80%EB%8F%84%ED%98%84_%EA%B4%9C%EC%B0%AE%EC%9D%80%EB%93%AF%20%EC%9B%83%EC%9D%8C.png',
  },
};

// 첫 메시지는 '오늘의 상황'을 바탕으로 서버(LLM)가 생성한다 (/chat/opening).
// 생성이 실패하거나 OPENING_TIMEOUT_MS를 넘기면 장면과 상관없이 어울리는 짧은 대체 문구를 쓰고,
// 서버에도 알려 대화 기록의 첫 메시지를 같은 문구로 맞춘다 (화면과 LLM 기록 일치).
// 배포 서버가 잠들었다 깨어나는 시간까지 고려해 넉넉히 기다린다.
const OPENING_TIMEOUT_MS = 15000;
const FALLBACK_OPENERS = {
  차서연: '선생님, 잠깐 얘기 좀 할 수 있어요?',
  엄마: '왜 그렇게 멍하니 있어.',
  박도원: '아이고, 선생님.',
  김도현: '…선생님, 잠깐 시간 되십니까?',
};

const NODE_NPC_MAP = {
  400: ['차서연', '박도원'],
  401: ['박도원', '엄마'],
  402: ['박도원', '엄마'],
  403: ['엄마', '차서연'],
  404: ['차서연', '박도원'],
  405: ['차서연', '박도원'],
  406: ['차서연', '박도원'],
  407: ['차서연', '김도현'],
  408: ['차서연', '김도현'],
  409: ['차서연', '김도현'],
  410: ['차서연', '김도현'],
  411: ['차서연', '김도현'],
};
const DEFAULT_NPCS = ['차서연', '엄마'];

const finalNode = parseInt(sessionStorage.getItem('final_node') || '0', 10);
const npcNames = NODE_NPC_MAP[finalNode] ?? DEFAULT_NPCS;
const NPCs = npcNames.map((name, i) => ({ ...ALL_NPCS[name], id: i }));

// ─────────────────────────────────────────────
//  트리거 데이터
// ─────────────────────────────────────────────
let CHIKI_TRIGGERS = [];
let CLUE_TRIGGERS = [];

// FALLBACK_CHIKI_TRIGGERS 제거 — 백엔드 triggers.json 사용
// getClueImgMap(), getClues() 는 clue.js에서 전역으로 제공

// ─────────────────────────────────────────────
//  상태 변수
// ─────────────────────────────────────────────
let currentNPC = 0;
let loopNum = parseInt(sessionStorage.getItem('loop_num') || '1', 10);
let loopCount = loopNum;
let responseIdx = 0;
let timerInterval = null;
let chikiToastTimeout = null;
let currentTab = 'chat';
let clues = [];
let unreadClueCount = 0;
let triggersLoaded = false;
// 이미 발동된 치키 트리거 id — 세션 내 중복 발동 방지
const _firedChikiIds = new Set(JSON.parse(sessionStorage.getItem('fired_chiki_ids') || '[]'));
let isSending = false;
let isSwitchingNPC = false;
let isDeadProcessing = false;
let lastLoopCount = 0;
// 단서 총 개수 (백엔드 /clue-triggers 응답의 total_clues)
let totalClues = 0;
// 버튼룸 첫 선택 ID (sessionStorage 'first_button' — button.js에서 저장)
const firstButton = sessionStorage.getItem('first_button') ?? '';

// 대화 횟수 카운터 (NPC별 10회 × 2 = 통합 20회)
let msgCount = 0;
const MSG_LIMIT = 20;
const NPC_HP_MAX = 20;
let npcHp = NPC_HP_MAX; // 통합 잔여 대화 횟수
let isMsgLimitReached = false;

// ─────────────────────────────────────────────
//  공통 API 헬퍼
// ─────────────────────────────────────────────
async function fetchAPI(path, body = {}) {
  const session_id = sessionStorage.getItem('session_id');
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, ...body }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[fetchAPI] ${path}:`, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
//  트리거 로드
// ─────────────────────────────────────────────
async function loadTriggers() {
  const loop = loopNum;
  try {
    const [chikiRes, clueRes] = await Promise.all([
      fetch(`/chiki-triggers?loop=${loop}`),
      fetch(`/clue-triggers?loop=${loop}&first_button=${firstButton}`),
    ]);
    if (!chikiRes.ok || !clueRes.ok) throw new Error('trigger fetch failed');
    const chikiData = await chikiRes.json();
    const clueData = await clueRes.json();
    CHIKI_TRIGGERS = chikiData.chiki_triggers ?? [];
    CLUE_TRIGGERS = clueData.clue_triggers ?? [];
    // ✅ Fix 2: 버튼룸에서 이미 획득한 단서 수를 합산하여 분자/분모 역전 방지
    const buttonClueCount = JSON.parse(sessionStorage.getItem('clues') || '[]')
      .filter(c => c.source === 'button').length;
    totalClues = (clueData.total_clues ?? 0) + buttonClueCount;
    triggersLoaded = true;

    // 단서 총 개수 UI 반영
    const totalEl = document.getElementById('clue-total-count');
    if (totalEl) totalEl.textContent = totalClues;

    console.log(`[triggers] 치키 ${CHIKI_TRIGGERS.length}개, 단서 ${CLUE_TRIGGERS.length}개 로드 (loop ${loop}, first_button ${firstButton || '미설정'}), 총 획득 가능: ${totalClues} (채팅 ${clueData.total_clues ?? 0} + 버튼룸 ${buttonClueCount})`);
  } catch (err) {
    console.warn('[triggers] 백엔드 미연결:', err.message);
    CHIKI_TRIGGERS = [];
    CLUE_TRIGGERS = [];
    triggersLoaded = true;
  }
}

async function reloadTriggersForLoop(newLoop) {
  loopNum = newLoop;
  loopCount = newLoop;
  triggersLoaded = false;
  await loadTriggers();
}

// ─────────────────────────────────────────────
//  타이머 — buttonroom에서 시작한 timer_start 이어받기
// ─────────────────────────────────────────────
function updateTimer() {
  const timerStart = parseInt(sessionStorage.getItem('timer_start') || '0', 10);
  const TOTAL_SECONDS = parseInt(sessionStorage.getItem('timer_total_seconds') || String(17 * 60), 10);
  if (!timerStart) {
    // timer_start 미설정 시 지금 시각으로 초기화 (즉시 사망 방지)
    sessionStorage.setItem('timer_start', String(Date.now()));
    return;
  }
  const remaining = Math.max(0, TOTAL_SECONDS - Math.floor((Date.now() - timerStart) / 1000));

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  document.getElementById('timer-display').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

  const d = document.getElementById('timer-display');
  if (remaining < 180) d.classList.add('critical');
  else d.classList.remove('critical');

  if (remaining <= 0) { triggerDeath('timer'); return; }
}

function pad(n) { return String(n).padStart(2, '0'); }

timerInterval = setInterval(updateTimer, 1000);

// ─────────────────────────────────────────────
//  HP 생명바 UI — 현재 NPC의 잔여 대화 횟수
// ─────────────────────────────────────────────
function updateHpBar() {
  const fill = document.getElementById('hp-bar-fill');
  if (!fill) return;
  const hp = npcHp;
  const pct = (hp / NPC_HP_MAX) * 100;
  fill.style.width = pct + '%';
  fill.classList.remove('warn', 'empty');
  if (hp <= 0)      fill.classList.add('empty');
  else if (hp <= 3) fill.classList.add('warn');
}

// ─────────────────────────────────────────────
//  ★ 20회 소진 → 치키 등장 후 suspect.html 이동
// ─────────────────────────────────────────────
function triggerMsgLimit() {
  if (isMsgLimitReached) return;
  isMsgLimitReached = true;

  // 입력창 비활성화
  const input = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');
  if (input) input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  // 치키 토스트
  showChikiToast('🐰 이제 범인을 골라볼 시간이야~!');

  // 1.3초 후 치키 드로어 열기
  setTimeout(() => {
    document.getElementById('chiki-popup-text').textContent =
      '대화를 충분히 나눴지? 이제 범인을 골라볼 차례야! 치키가 도와줄게~ 🐰✨';
    openChiki();
  }, 1300);

  // 4초 후 드로어 닫고 suspect.html 이동
  setTimeout(() => {
    closeChiki();
    setTimeout(() => {
      sessionStorage.setItem('loop_num', String(loopNum));
      window.location.href = '/suspect';
    }, 800);
  }, 4000);
}

// ─────────────────────────────────────────────
//  단서 패널 토글 (폴더 버튼)
// ─────────────────────────────────────────────
function toggleCluePanel() {
  currentTab = currentTab === 'chat' ? 'clue' : 'chat';
  switchTab(currentTab);
}

function switchTab(tab) {
  currentTab = tab;

  const chatScroll = document.getElementById('chat-scroll');
  const cluePanel = document.getElementById('clue-panel');
  const folderBtn = document.getElementById('folder-btn');
  const folderBadge = document.getElementById('folder-badge');
  const msgInput = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');

  if (tab === 'chat') {
    chatScroll.style.display = '';
    cluePanel.classList.remove('active');
    folderBtn.classList.remove('active');
    if (!isMsgLimitReached) {
      msgInput.disabled = false;
      sendBtn.disabled = false;
    }
  } else {
    chatScroll.style.display = 'none';
    cluePanel.classList.add('active');
    folderBtn.classList.add('active');
    // 현재 단서 전체를 읽음 처리
    unreadClueCount = 0;
    updateClueBadge();
    const allIds = JSON.parse(sessionStorage.getItem('clues') || '[]').map(c => c.id);
    sessionStorage.setItem('clues_read', JSON.stringify(allIds));
    msgInput.disabled = true;
    sendBtn.disabled = true;
    renderClues();
  }
}

// ─────────────────────────────────────────────
//  단서 추가 & 렌더링
// ─────────────────────────────────────────────
// 치키 힌트 단서탭 등록 — 상단바 카운트(clue-info-count)에는 포함하지 않음
async function addChikiHint(clue) {
  if (clues.some(c => c.title === clue.title && c.source === 'chiki')) return;

  const imgMap = await getClueImgMap();
  const imgUrl = clue.img ? (imgMap[clue.img] || null) : null;

  clues.push({ ...clue, img: imgUrl, imgUrls: null, time: nowTime(), source: 'chiki' });

  // sessionStorage 동기화
  const stored = JSON.parse(sessionStorage.getItem('clues') || '[]');
  const storeId = 'chiki__' + (clue.img ?? clue.title);
  if (!stored.find(c => c.id === storeId)) {
    stored.push({ ...clue, id: storeId, img: imgUrl, imgUrls: null, source: 'chiki' });
    sessionStorage.setItem('clues', JSON.stringify(stored));
  }

  // 미확인 배지만 올림 (상단바 단서 개수는 건드리지 않음)
  if (currentTab !== 'clue') {
    unreadClueCount++;
    updateClueBadge();
  }
  if (currentTab === 'clue') renderClues();
}

async function addClue(clue) {
  // ✅ Fix 1: sessionStorage 기준으로 중복 체크 (버튼룸 단서 포함)
  const stored = JSON.parse(sessionStorage.getItem('clues') || '[]');
  const storeId = clue.imgs ? clue.imgs[0] : (clue.img ?? clue.title);
  if (stored.find(c => c.id === storeId || c.title === clue.title)) {
    return; // 이미 있음 (버튼룸에서 획득했거나 이전에 추가됨)
  }

  const imgMap = await getClueImgMap();

  // imgs 배열 처리 (USB처럼 여러 이미지 토글이 필요한 단서)
  let imgUrls = null;
  let imgUrl = null;
  if (clue.imgs) {
    imgUrls = clue.imgs.map(k => imgMap[k] || null).filter(Boolean);
    imgUrl = imgUrls[0] || null;
  } else if (clue.img) {
    imgUrl = imgMap[clue.img] || null;
  }

  clues.push({ ...clue, img: imgUrl, imgUrls: imgUrls || null, time: nowTime(), source: 'chat', loop: loopNum });

  // sessionStorage 동기화 (button.js 단서와 통합 관리)
  stored.push({ ...clue, id: storeId, img: imgUrl, imgUrls: imgUrls || null, source: 'chat', loop: loopNum });
  sessionStorage.setItem('clues', JSON.stringify(stored));

  // 2. 상단바 카운트 통합: source === 'chat' 대신 chiki 힌트만 제외하여 통합 집계
  const infoCount = document.getElementById('clue-info-count');
  if (infoCount) infoCount.textContent = clues.filter(c => c.source !== 'chiki' && (c.loop ?? 1) <= loopNum).length;
  
  if (currentTab !== 'clue') {
    unreadClueCount++;
    updateClueBadge();
  }
  if (currentTab === 'clue') renderClues();
}

// 이미지 토글 상태 (단서 인덱스 → 현재 이미지 인덱스)
const _imgToggleState = {};

function toggleClueImg(clueIdx) {
  const c = getClues()[clueIdx];
  if (!c?.imgUrls || c.imgUrls.length < 2) return;
  _imgToggleState[clueIdx] = ((_imgToggleState[clueIdx] ?? 0) + 1) % c.imgUrls.length;
  const imgEl = document.getElementById(`clue-img-${clueIdx}`);
  const hintEl = document.getElementById(`clue-img-hint-${clueIdx}`);
  if (imgEl) imgEl.src = c.imgUrls[_imgToggleState[clueIdx]];
  if (hintEl) hintEl.textContent = _imgToggleState[clueIdx] === 0 ? '🔍 탭하여 확대 / 전환' : '🔄 탭하여 전환';
}

function renderClues() {
  const allClues = getClues();
  const list = document.getElementById('clue-list');
  const count = document.getElementById('clue-count');
  count.textContent = allClues.length;

  if (allClues.length === 0) {
    list.innerHTML = `
      <div class="clue-empty">
        <div class="clue-empty-icon">🐰</div>
        <div class="clue-empty-text">치키가 알려준 단서가<br>여기에 기록됩니다.</div>
      </div>`;
    return;
  }

  list.innerHTML = allClues.map((c, i) => {
    const hasToggle = c.imgUrls && c.imgUrls.length > 1;
    const currentImg = hasToggle ? (c.imgUrls[_imgToggleState[i] ?? 0] || null) : c.img;

    let imgBlock = '';
    if (currentImg) {
      const onclickAttr = hasToggle
        ? 'toggleClueImg(' + i + ')'
        : 'openImgLightbox(\'' + esc(currentImg) + '\', \'' + esc(c.title) + '\')';
      const hintText = hasToggle ? '🔄 탭하여 전환' : '🔍 탭하여 확대';
      imgBlock = '<div class="clue-item-img-wrap" onclick="' + onclickAttr + '">'
        + '<img src="' + esc(currentImg) + '" class="clue-item-img" id="clue-img-' + i + '" alt="">'
        + '<div class="clue-item-img-hint" id="clue-img-hint-' + i + '">' + hintText + '</div>'
        + '</div>';
    }

    return `
    <div class="clue-item${c.type === 'safe' ? ' clue-item--safe' : ''}">
      <div class="clue-item-top">
        <span class="clue-item-badge">${(() => {
          const src = c.source || 'chat';
          const label = src === 'button' ? '버튼 단서' : src === 'chiki' ? '치키 힌트' : '채팅 단서';
          // 같은 source 내에서의 순번 계산
          const sameSourceIdx = allClues.slice(0, i + 1).filter(x => (x.source || 'chat') === src).length;
          return label + ' #' + String(sameSourceIdx).padStart(2, '0');
        })()}</span>
      </div>
      ${imgBlock}
      <div class="clue-item-text">
        <div class="clue-item-title">${esc(c.title)}</div>
        <div class="clue-item-desc">${esc(c.desc)}</div>
      </div>
      ${c.type === 'safe' && !c.unlocked ? `
      <div class="safe-input-wrap" id="safe-wrap-${i}">
        <input class="safe-input" id="safe-pw-${i}" type="text" maxlength="4" placeholder="비밀번호 4자리" inputmode="numeric">
        <button class="safe-submit-btn" onclick="trySafePassword(${i})">확인</button>
        <div class="safe-hint" id="safe-hint-${i}"></div>
      </div>` : ''}
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
//  금고 비밀번호 처리
// ─────────────────────────────────────────────
async function trySafePassword(idx) {
  const input = document.getElementById(`safe-pw-${idx}`);
  const hint  = document.getElementById(`safe-hint-${idx}`);
  if (!input) return;

  const pw = input.value.trim();
  if (pw === '0903') {
    // 정답 — 단서 카드 업데이트
    const allClues = getClues();
    const safeClue = allClues[idx];
    if (safeClue) safeClue.unlocked = true;

    // 금고_열림 이미지로 교체
    const imgMap = await getClueImgMap();
    const openImg = imgMap['금고_열림'] || null;
    if (openImg) safeClue.img = openImg;

    // sessionStorage 업데이트
    const stored = JSON.parse(sessionStorage.getItem('clues') || '[]');
    const target = stored.find(c => c.title === safeClue.title); // 명확하게 이름으로 찾도록 수정
    if (target) { target.img = openImg; target.unlocked = true; }
    sessionStorage.setItem('clues', JSON.stringify(stored));

    // clue_safe_opened 이벤트 트리거
    fireEventTrigger('safe_opened');

    renderClues();
    showChikiToast('🐰 열렸다.');
    setTimeout(() => {
      document.getElementById('chiki-popup-text').textContent =
        '열렸네. 🐰 안에 뭐가 있는지 봤어? 테이프 여러 개. 그중 하나에만 이름이 적혀 있더라~';
      openChiki();
    }, 800);
  } else {
    if (hint) {
      hint.textContent = '틀렸어.';
      setTimeout(() => { if (hint) hint.textContent = ''; }, 1500);
    }
    showChikiToast('🐰 아닌 것 같은데.');
  }
}


function switchNPCToggle() {
  if (isSwitchingNPC || isSending || isMsgLimitReached) return;
  switchNPC(currentNPC === 0 ? 1 : 0);
}

function switchNPC(idx) {
  isSwitchingNPC = true;
  currentNPC = idx;
  responseIdx = 0;

  const npc = NPCs[idx];
  const otherNpc = NPCs[1 - idx]; // 상대 NPC

  // 포트레이트 이미지 업데이트
  const portraitImg = document.getElementById('header-portrait-img');
  if (portraitImg) {
    portraitImg.src = npc.profile;
    portraitImg.alt = npc.name;
  }

  // 이름 / 서브 / 태그 업데이트
  document.getElementById('header-npc-name').textContent = npc.displayName ?? npc.name;
  document.getElementById('header-npc-sub').textContent = npc.sub;
  const ht = document.getElementById('header-tag');
  ht.textContent = npc.tag;
  ht.style.color = npc.tagColor;
  ht.style.borderColor = npc.tagColor + '44';
  ht.style.background = npc.tagColor + '14';

  // 전환 버튼: 상대 NPC 아바타 표시
  const switchImg = document.getElementById('switch-avatar-img');
  if (switchImg) {
    switchImg.src = otherNpc.profile;
    switchImg.alt = otherNpc.name;
  }

  // 채팅창 전환
  for (let i = 0; i < NPCs.length; i++) {
    const el = document.getElementById(`chat-npc-${i}`);
    if (el) el.style.display = (i === idx) ? 'block' : 'none';
  }

  // HP바 업데이트
  updateHpBar();

  // 현재 NPC HP 소진 시 입력 비활성
  const input = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');
  if (npcHp <= 0 || isMsgLimitReached) {
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
  } else {
    if (!isMsgLimitReached && currentTab === 'chat') {
      if (input) input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  clearSuggestionChips();
  scrollToBottom();
  isSwitchingNPC = false;
}

// ─────────────────────────────────────────────
//  자동 추천 문장 시스템
//  NPC별 + 루프별 분기 + bigram 자카드 유사도
// ─────────────────────────────────────────────

// ── NPC별 추천 문장 (2026-10-07 새로 작성 · NPC당 30개 = 루프별 10개) ──
//  loop  : 이 루프부터 추천 (루프별 공개 범위)
//  nodes : 이 최종 장면(버튼룸 400~411)에서만 추천. 없으면 모든 장면
//  트리거 키워드(triggers.json)가 들어간 문장은 단서·치키 트리거를 여는 통로 역할을 한다.
//  ※ "~건가요/인가요/겁니까"로 끝나거나 부정형이면 치키 트리거가 막히므로 트리거 문장에는 쓰지 않는다.
const CLINIC_NODES = [404, 405, 406, 407, 408, 409, 410, 411];
const NPC_SUGGESTIONS = {
  엄마: [
    { text: "엄마는 오늘 왜 이렇게 기운이 없어?", loop: 1 },
    { text: "나 어릴 때 어떤 애였어?", loop: 1 },
    { text: "밥 더 안 먹어도 돼. 입맛이 없어.", loop: 1, nodes: [401] },
    { text: "아까 그 택배기사, 아는 사람이야?", loop: 1, nodes: [401] },
    { text: "이 상자 누가 보낸 건지 알아?", loop: 1, nodes: [402] },
    { text: "창문은 언제 깨진 거야?", loop: 1, nodes: [402] },
    { text: "왜 갑자기 나영이 얘기를 꺼내?", loop: 1, nodes: [402] },
    { text: "나 오늘 출근 안 해도 될까?", loop: 1, nodes: [403] },
    { text: "거실에 걸린 가족사진, 언제 찍은 거야?", loop: 1 },
    { text: "자정 넘으면 현관문 꼭 잠가 줘.", loop: 1 },
    { text: "내일이 나영이 기일이지?", loop: 2 },
    { text: "동생은 어떤 애였어?", loop: 2 },
    { text: "나 그때 동생한테 잘해줬어?", loop: 2 },
    { text: "그 가족 여행, 나만 기억이 안 나.", loop: 2 },
    { text: "아빠는 어떻게 돌아가셨어?", loop: 2 },
    { text: "0903, 이 숫자 무슨 뜻인지 알아?", loop: 2 },
    { text: "모르는 번호로 전화가 계속 와.", loop: 2 },
    { text: "그 상자 안에 있던 거, 같이 봤잖아.", loop: 2, nodes: [402] },
    { text: "주원이 알아? 예전에 나랑 만나던 사람.", loop: 2 },
    { text: "왜 나만 보면 그렇게 겁먹은 얼굴이야?", loop: 2 },
    { text: "나영이 그날 정말 혼자 떨어진 거야?", loop: 3 },
    { text: "엄마, 그날 뭘 본 거야?", loop: 3 },
    { text: "나 때문이라고 생각해?", loop: 3 },
    { text: "왜 그동안 아무 말도 안 했어?", loop: 3 },
    { text: "내 방 금고, 열어 본 적 있어?", loop: 3 },
    { text: "녹음 테이프 같은 거 본 적 있어?", loop: 3 },
    { text: "치키라는 이름 들어 본 적 있어?", loop: 3 },
    { text: "나를 지키려고 거짓말한 거지?", loop: 3 },
    { text: "그래도 나 미워하지는 않지?", loop: 3 },
    { text: "오늘 하루가 자꾸 반복되는 것 같아.", loop: 3 },
  ],
  박도원: [
    { text: "아까 그 USB, 어디서 주우셨어요?", loop: 1, nodes: [400, 401, 404, 405, 406] },
    { text: "택배 일은 언제부터 하셨어요?", loop: 1, nodes: [400, 401, 402] },
    { text: "아까는 왜 그렇게 급히 가셨어요?", loop: 1, nodes: [402] },
    { text: "이 상자, 직접 두고 가신 거죠?", loop: 1, nodes: [402] },
    { text: "제 방 서랍 정리하신 적 있으세요?", loop: 1, nodes: [404, 405] },
    { text: "들고 계신 그 파일, 뭐예요?", loop: 1, nodes: [404] },
    { text: "아까 원장실 앞에서 뭘 보고 계셨어요?", loop: 1, nodes: [406] },
    { text: "박도원 씨는 원래 무슨 일 하셨어요?", loop: 1 },
    { text: "따님이 계세요?", loop: 1 },
    { text: "이 사진 속 사람, 혹시 아세요?", loop: 1 },
    { text: "택배 상자 안에 뭐가 들어 있었어요?", loop: 2 },
    { text: "일기장 얘기, 다시 해 주실래요?", loop: 2 },
    { text: "따님은 어떤 분이셨어요?", loop: 2 },
    { text: "따님이 쓴 글, 읽어 보셨어요?", loop: 2 },
    { text: "USB 안에 뭐가 들었는지 아세요?", loop: 2 },
    { text: "제 집 주소는 어떻게 아셨어요?", loop: 2, nodes: [400, 401, 402] },
    { text: "어젯밤 저한테 전화하셨어요?", loop: 2 },
    { text: "왜 자꾸 저를 지켜보세요?", loop: 2 },
    { text: "그날 밤에 어디 계셨어요?", loop: 2 },
    { text: "혹시 금고 여는 법 아세요?", loop: 2 },
    { text: "따님 이름이 박주원이었죠?", loop: 3 },
    { text: "주원 씨가 마지막으로 만난 사람이 저였어요?", loop: 3 },
    { text: "따님 일로 저를 원망하세요?", loop: 3 },
    { text: "복수하려고 여기 오신 거예요?", loop: 3 },
    { text: "따님이 왜 그렇게 됐는지 알고 계세요?", loop: 3 },
    { text: "일기장 마지막 장에 뭐라고 적혀 있었어요?", loop: 3 },
    { text: "따님을 그렇게 만든 범인이 있다고 생각하세요?", loop: 3 },
    { text: "오늘 자정에 무슨 일이 생기는지 아세요?", loop: 3 },
    { text: "녹음 파일 같은 거 갖고 계세요?", loop: 3 },
    { text: "제가 기억 못 하는 걸 알고 계시죠?", loop: 3 },
  ],
  차서연: [
    { text: "김도현 환자 아직 기다리고 있어요?", loop: 1, nodes: [400, 403] },
    { text: "지금 바로 갈게요. 무슨 일 있어요?", loop: 1, nodes: [400, 403] },
    { text: "커피는 괜찮아요. 오늘은 안 마실게요.", loop: 1, nodes: CLINIC_NODES },
    { text: "서랍에 있던 약은 누가 처방한 거예요?", loop: 1, nodes: CLINIC_NODES },
    { text: "아까 원장실에서 뭘 찾고 계셨어요?", loop: 1, nodes: [408, 409] },
    { text: "박도원 씨가 원래 수상했어요?", loop: 1, nodes: [404, 405, 406] },
    { text: "김도현 씨는 오늘 왜 그렇게 화가 났을까요?", loop: 1, nodes: [407, 410, 411] },
    { text: "인스타 계정 얘기, 더 해 주세요.", loop: 1, nodes: [404, 405, 406, 407, 410, 411] },
    { text: "서연 씨, 요즘 이 근처 사건 얘기 들었어요?", loop: 1 },
    { text: "원장실 창문은 왜 깨진 거예요?", loop: 1, nodes: CLINIC_NODES },
    { text: "박주원 씨 얘기, 처음부터 다시 해 주세요.", loop: 2 },
    { text: "주원 씨는 어떤 친구였어요?", loop: 2 },
    { text: "처방 기록이 왜 비어 있어요?", loop: 2 },
    { text: "CCTV 영상 확인해 보셨어요?", loop: 2 },
    { text: "발신자 표시 제한 전화, 받아 본 적 있어요?", loop: 2 },
    { text: "우리 대학 때부터 알던 사이죠?", loop: 2 },
    { text: "제가 뭘 숨기고 있다고 느껴요?", loop: 2 },
    { text: "그 사진, 다시 보여 주실래요?", loop: 2, nodes: [410, 411] },
    { text: "김하윤 환자 기록 보셨어요?", loop: 2 },
    { text: "제 기억에 빈 곳이 있는 것 같아요.", loop: 2 },
    { text: "주원 씨가 마지막에 저에 대해 뭐라고 했어요?", loop: 3 },
    { text: "제가 주원 씨한테 무슨 짓을 했다고 생각해요?", loop: 3 },
    { text: "커피에 뭘 탄 적 있어요?", loop: 3, nodes: CLINIC_NODES },
    { text: "금고 비밀번호, 혹시 아세요?", loop: 3 },
    { text: "녹음 테이프 얘기 들어 본 적 있어요?", loop: 3 },
    { text: "주원 씨를 그렇게 만든 범인이 있다고 믿어요?", loop: 3 },
    { text: "왜 그동안 아무렇지 않은 척했어요?", loop: 3 },
    { text: "0903이 무슨 날인지 알아요?", loop: 3 },
    { text: "토끼 인형 같은 거 본 적 있어요?", loop: 3 },
    { text: "오늘 밤 12시에 어디 있을 거예요?", loop: 3 },
  ],
  김도현: [
    { text: "하윤 씨 얘기, 조금 더 들려주실래요?", loop: 1 },
    { text: "하윤 씨 상담일지를 다시 찾아볼게요.", loop: 1 },
    { text: "아까는 왜 그렇게 화가 나셨어요?", loop: 1, nodes: [407, 410, 411] },
    { text: "원장실은 왜 보고 싶으셨어요?", loop: 1, nodes: [408, 409] },
    { text: "지금 어디세요? 괜찮으세요?", loop: 1, nodes: [407, 410, 411] },
    { text: "상담 일정은 다시 잡을게요.", loop: 1 },
    { text: "제가 그때 무슨 말을 했죠?", loop: 1 },
    { text: "이틀 전 일은 저도 많이 놀랐어요.", loop: 1 },
    { text: "하윤 씨가 먹던 약, 알고 계세요?", loop: 1 },
    { text: "치키라는 이름 들어 보셨어요?", loop: 1 },
    { text: "하윤 씨는 언제부터 여기 다녔어요?", loop: 2 },
    { text: "하윤 씨 처방 기록, 같이 보실래요?", loop: 2 },
    { text: "하윤 씨가 동생분이셨죠?", loop: 2 },
    { text: "제가 하윤 씨를 기억 못 한다고 생각하세요?", loop: 2 },
    { text: "USB 영상, 보신 적 있어요?", loop: 2 },
    { text: "모르는 번호로 전화하신 거, 김도현 씨죠?", loop: 2 },
    { text: "인스타에 올린 글, 누구한테 쓴 거예요?", loop: 2 },
    { text: "저를 원망하세요?", loop: 2 },
    { text: "하윤 씨 일, 사고가 아니라고 보세요?", loop: 2 },
    { text: "왜 하필 오늘 찾아오셨어요?", loop: 2 },
    { text: "하윤 씨가 마지막 상담에서 뭐라고 했어요?", loop: 3 },
    { text: "제가 하윤 씨한테 약을 줬다고요?", loop: 3 },
    { text: "하윤 씨를 그렇게 만든 범인이 있다고 생각하세요?", loop: 3 },
    { text: "제가 상담실 밖에서 하윤 씨를 만났어요?", loop: 3 },
    { text: "오늘 자정에 어디 계실 거예요?", loop: 3 },
    { text: "금고 안에 하윤 씨 물건이 있어요?", loop: 3 },
    { text: "녹음된 상담 기록이 남아 있어요?", loop: 3 },
    { text: "0903, 이 날짜 기억나세요?", loop: 3 },
    { text: "제게 원하는 게 뭐예요?", loop: 3 },
    { text: "제가 사과하면 달라지는 게 있을까요?", loop: 3 },
  ],
};

// ── 이미 보낸 문장 기록 (NPC별, 루프가 바뀌면 초기화) ──
const _normalizeMsg = t => t.replace(/\s+/g, '');
function loadSentMsgs() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('sent_msgs') || 'null');
    if (saved && saved.loop === loopNum) return saved;
  } catch (e) { /* 손상된 값은 무시 */ }
  return { loop: loopNum, npcs: {} };
}
function markSentMsg(npcName, text) {
  const saved = loadSentMsgs();
  const list = saved.npcs[npcName] ?? [];
  const key = _normalizeMsg(text);
  if (!list.includes(key)) list.push(key);
  saved.npcs[npcName] = list;
  sessionStorage.setItem('sent_msgs', JSON.stringify(saved));
}

// ── 이미 얻은 단서·치키 트리거를 여는 추천 문장 제외 ──
// 인물 이름만으로 걸리는 키워드는 판단에서 뺀다 (예: '하윤'이 들어간 김도현 질문 전체가 사라지지 않게)
const NAME_KEYWORDS = new Set(['하윤', '김하윤', '박주원', '주원', '나영', '박도원', '엄마', '어머니', '차서연', '서연']);
const hitsKeyword = (text, words) => (words ?? []).some(w => !NAME_KEYWORDS.has(w) && text.includes(w));

function isClueTriggerDone(trigger) {
  const owned = getClues();
  if (trigger.package_delivery) return owned.some(c => c.title === '수상한 택배');
  return !!trigger.clue?.title && owned.some(c => c.title === trigger.clue.title);
}

// 이 문장이 여는 트리거(현재 루프에 열린 것만)를 모두 이미 얻었으면 true
function isSuggestionExhausted(text, npcName) {
  const triggers = [
    ...CHIKI_TRIGGERS
      .filter(t => hitsKeyword(text, t.words))
      .map(t => _firedChikiIds.has(t.id)),
    ...CLUE_TRIGGERS
      .filter(t => t.source === 'user' && (!t.npc || t.npc === npcName) && hitsKeyword(text, t.detect_words))
      .map(t => isClueTriggerDone(t)),
  ];
  return triggers.length > 0 && triggers.every(done => done);
}

// 현재 NPC · 루프 · 최종 장면 기준 추천 풀
// (이미 보낸 문장, 이미 얻은 단서·치키 트리거만 여는 문장 제외)
function buildSuggestionPool() {
  const npcName = NPCs[currentNPC]?.name ?? '';
  const sent = new Set(loadSentMsgs().npcs[npcName] ?? []);
  return (NPC_SUGGESTIONS[npcName] ?? [])
    .filter(s => s.loop <= loopNum)
    .filter(s => !s.nodes || !finalNode || s.nodes.includes(finalNode))
    .map(s => s.text)
    .filter(text => !sent.has(_normalizeMsg(text)))
    .filter(text => !isSuggestionExhausted(text, npcName));
}

// 입력칸이 비어 있을 때 보여줄 추천 2개 (풀에서 무작위)
function getIdleSuggestions(count = 2) {
  const pool = buildSuggestionPool();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// ── bigram 유사도 계산 ──
function getBigrams(str) {
  const s = str.replace(/\s+/g, '');
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s[i] + s[i + 1]);
  return set;
}

function jaccardSimilarity(a, b) {
  const ba = getBigrams(a), bb = getBigrams(b);
  if (ba.size === 0 && bb.size === 0) return 0;
  let intersection = 0;
  ba.forEach(g => { if (bb.has(g)) intersection++; });
  const union = ba.size + bb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function containsScore(query, candidate) {
  return candidate.toLowerCase().includes(query.trim().toLowerCase()) ? 0.5 : 0;
}

function getSuggestions(query) {
  if (!query || query.trim().length < 2) return [];
  const pool = buildSuggestionPool();
  return pool
    .map(s => ({ text: s, score: jaccardSimilarity(query.trim(), s) + containsScore(query, s) }))
    .filter(s => s.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.text);
}

// ── 추천 칩 렌더링 ──
function renderSuggestionChips(suggestions, rawQuery) {
  const area = document.getElementById('suggestion-area');
  if (!area) return;
  area.innerHTML = '';

  // 직접 입력 칩
  if (rawQuery && rawQuery.trim().length > 0) {
    const directChip = document.createElement('button');
    directChip.className = 'suggestion-chip suggestion-chip--direct';
    directChip.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>직접 입력: "${esc(rawQuery.trim())}"`;
    directChip.onclick = () => sendMsg();
    area.appendChild(directChip);
  }

  // 유사도 추천 칩
  suggestions.forEach(text => {
    const chip = document.createElement('button');
    chip.className = 'suggestion-chip';
    chip.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
    </svg>${esc(text)}`;
    chip.onclick = () => {
      document.getElementById('msg-input').value = text;
      clearSuggestionChips();
      sendMsg();
    };
    area.appendChild(chip);
  });
}

function clearSuggestionChips() {
  const area = document.getElementById('suggestion-area');
  if (area) area.innerHTML = '';
}

// ─────────────────────────────────────────────
//  입력 키워드 기반 추천 문구 필터링
// ─────────────────────────────────────────────
function filterChoicesByInput(query) {
  const q = query.trim();
  if (!q) {
    // 입력칸이 비면 다시 추천 2개
    showIdleSuggestions();
    return;
  }
  const suggestions = getSuggestions(q);
  renderSuggestionChips(suggestions, q);
}

// 입력칸을 눌렀는데 비어 있으면 추천 2개를 보여준다
function showIdleSuggestions() {
  const input = document.getElementById('msg-input');
  if (!input || input.value.trim() || input.disabled) {
    if (input && !input.value.trim()) clearSuggestionChips();
    return;
  }
  renderSuggestionChips(getIdleSuggestions(2), '');
}

// ─────────────────────────────────────────────
//  스토리 무관 입력 감지
//  — 게임 세계관과 관계없는 질문을 LLM에 넘기지 않음
// ─────────────────────────────────────────────
function isOffTopic(text) {
  const OFF_TOPIC_PATTERNS = [
    // AI/모델 관련
    /클로드|챗.?지피티|gpt|openai|anthropic|gemini|제미나이|llm|인공지능|ai가|ai야/i,
    // 게임 외부 일상
    /오늘\s*점심|뭐\s*먹|맛집|배달|쇼핑|날씨가\s*어때|주식|코인|로또/i,
    // 메타 질문
    /너는\s*누구야|너\s*이름이\s*뭐야|몇\s*살이야|어느\s*회사|만든\s*사람/i,
    // 게임 외부 정치·사회
    /대통령|선거|전쟁|뉴스|정치/i,
  ];
  return OFF_TOPIC_PATTERNS.some(p => p.test(text));
}

// ─────────────────────────────────────────────
//  메시지 전송 (★ 대화 횟수 카운트 추가)
// ─────────────────────────────────────────────
function sendMsg() {
  if (isSending || isSwitchingNPC || isMsgLimitReached || isOpening) return;
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  // 전송 후 추천 칩 초기화 + 보낸 문장 기록 (추천에서 제외)
  clearSuggestionChips();
  markSentMsg(NPCs[currentNPC].name, text);

  // 대화 횟수 증가 & HP 감소
  msgCount++;
  npcHp = Math.max(0, npcHp - 1);
  updateHpBar();

  // HP 소진 시 입력 비활성 (전환은 가능)
  if (npcHp <= 0 && !isMsgLimitReached) {
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
  }

  const isChikiTriggered = checkChikiTrigger(text);
  addPlayerMsg(text, false);

  // 치키 트리거 발동 시 — 입력창 즉시 재활성화 후 LLM으로 계속 진행
  if (isChikiTriggered) {
    const inp = document.getElementById('msg-input');
    const sBtn = document.getElementById('send-btn');
    // 한글 IME 조합 잔여 글자 방지: blur → value 재초기화 → 재활성화
    if (inp) {
      inp.blur();
      inp.value = '';
      if (npcHp > 0 && !isMsgLimitReached) inp.disabled = false;
    }
    if (sBtn && npcHp > 0 && !isMsgLimitReached) sBtn.disabled = false;
  }

  // 스토리 무관 입력 차단 — LLM 전송 안 함
  if (isOffTopic(text)) {
    showChikiToast('🐰 그런 건 나한테 물어봐~');
    setTimeout(() => {
      document.getElementById('chiki-popup-text').textContent =
        '지금 그런 거 생각할 때가 아니야. 🐰 오늘 자정까지 범인을 찾아야 한다고~';
      openChiki();
    }, 800);
    if (npcHp > 0 && !isMsgLimitReached) {
      const input = document.getElementById('msg-input');
      const sendBtn = document.getElementById('send-btn');
      if (input) input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
    }
    return;
  }

  // 단서 트리거 감지 — 치키 미발동 + 스토리 관련 입력일 때만 체크
  checkClueTrigger(text);

  sendToBackend(text, msgCount >= MSG_LIMIT);
}

function addPlayerMsg(text, failed = false) {
  const row = document.createElement('div');
  row.className = 'msg-row player';
  const statusHtml = failed
    ? `<span class="msg-failed">전송 실패</span>`
    : `<span class="msg-read">읽음</span>`;
  row.innerHTML = `
    <div class="msg-col">
      <div class="bubble">${esc(text)}</div>
      <div class="msg-meta" style="justify-content:flex-end;">
        ${statusHtml}
        <span class="msg-time">${nowTime()}</span>
      </div>
    </div>`;
  currentChatEl().appendChild(row);
  scrollToBottom();
}

function appendTypingRow() {
  const npc = NPCs[currentNPC];
  const chatEl = currentChatEl();
  const prevRows = chatEl.querySelectorAll('.msg-row:not(.player)');
  const isContinuous = prevRows.length > 0;

  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = 'typing-row';
  row.innerHTML = `
    <div class="msg-col">
      <div class="msg-name${isContinuous ? ' msg-name--hidden' : ''}">${npc.name}</div>
      <div class="typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  chatEl.appendChild(row);
  scrollToBottom();
}

function addNPCMsg(overrideText = null) {
  const npc = NPCs[currentNPC];
  const text = overrideText ?? (npc.responses?.[responseIdx % npc.responses?.length] ?? '...');
  responseIdx++;

  const chatEl = currentChatEl();

  // 직전 메시지가 같은 NPC인지 확인
  const prevRows = chatEl.querySelectorAll('.msg-row:not(.player)');
  const prevRow = prevRows.length > 0 ? prevRows[prevRows.length - 1] : null;
  const isContinuous = prevRow !== null;

  // 연속 메시지면: 직전 메시지의 타임스탬프 숨기기
  if (isContinuous) {
    const prevMeta = prevRow.querySelector('.msg-meta');
    if (prevMeta) prevMeta.classList.add('msg-meta--hidden');
  }

  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `
    <div class="msg-col">
      <div class="msg-name${isContinuous ? ' msg-name--hidden' : ''}">${npc.displayName ?? npc.name}</div>
      <div class="bubble">${esc(text)}</div>
      <div class="msg-meta"><span class="msg-time">${nowTime()}</span></div>
    </div>`;
  chatEl.appendChild(row);
  scrollToBottom();

}

// NPC 표정 이미지 → 상단 헤더 포트레이트 업데이트
function renderNPCImage(url, npcIdx = currentNPC) {
  if (npcIdx !== currentNPC) return; // 전환된 상태면 무시
  const portrait = document.getElementById('header-portrait-img');
  if (!portrait) return;
  const fullUrl = url.startsWith('http') ? url : `/static/images/${url}`;
  portrait.style.opacity = '0';
  setTimeout(() => {
    portrait.src = fullUrl;
    portrait.onload = () => { portrait.style.opacity = '1'; };
    portrait.onerror = () => { portrait.style.opacity = '1'; };
  }, 150);
}

// ─────────────────────────────────────────────
//  택배 도착 연출
//  — diary/clue_package/clue_seoyeon_watch 공통
//  — 중복 방지: 이미 "수상한 택배" 단서가 있으면 발동 안 함
// ─────────────────────────────────────────────
async function triggerPackageDelivery() {
  // 중복 방지
  if (getClues().some(c => c.title === '수상한 택배')) return;

  // 초인종 효과음
  const sfx = new Audio('/frontend/audio/초인종.mp3');
  sfx.play().catch(() => {});

  // 치키 토스트
  showChikiToast('🐰 택배 왔다.');

  // 치키 팝업
  setTimeout(() => {
    document.getElementById('chiki-popup-text').textContent =
      '택배가 왔네. 🐰 발신인이 없어. 열어볼 거야? 근데 있지, 안에 뭐가 들었는지는… 알 것 같기도 하고~';
    openChiki();
  }, 1300);

  // 단서 저장
  await addClue({
    icon: '📦',
    title: '수상한 택배',
    desc: '발신인 없는 택배상자. 안에는 말라붙은 꽃 한 송이, 오래된 약 봉투, 그리고 일기장이 들어 있다.',
    img: '수상한_택배',
  });
}


// ─────────────────────────────────────────────
//  치키 트리거 블락킹 패턴
//  — 유저가 트리거 워드를 반문·부정·인용 맥락으로 쓴 경우 차단
//  — 예) "저를 살인자로 의심하는 건가요?" / "범인이라고 생각해요?"
// ─────────────────────────────────────────────
const CHIKI_BLOCK_PATTERNS = [
  // 반문형 어미
  /의심하는\s*(건가요|거예요|거죠|겁니까)/,
  /(건가요|인가요|겁니까|건지요|는건가요)\s*[?？]?\s*$/,
  // "~로/으로 보다/의심하다/생각하다"
  /(?:로|으로)\s*(보는|의심|생각하는|몰다|모는)/,
  // "~이라고/라고 생각/말하다"
  /(?:이라고|라고)\s*(생각|봐요|봐|봐요\?|말하)/,
  // 부정형
  /(?:아닌가요|아니에요|아니야|아닌데|아닐|아니잖)/,
  // "나를/저를/제가 ~ 한다는" 구조 (유저가 자신에게 향하는 의심을 언급)
  /(?:나를|저를|제가|날)\s*.{0,8}(?:살인|범인|죽인|의심)/,
];

function isBlockedByContext(text) {
  return CHIKI_BLOCK_PATTERNS.some(p => p.test(text));
}

function checkChikiTrigger(text) {
  if (!triggersLoaded) return false;

  // 반문·부정·인용 맥락이면 치키 트리거 차단
  if (isBlockedByContext(text)) return false;

  for (const trigger of CHIKI_TRIGGERS) {
    if (_firedChikiIds.has(trigger.id)) continue;
    if (trigger.words.some(w => text.includes(w))) {
      // 발동 기록 — 이후 동일 트리거 재발동 차단
      _firedChikiIds.add(trigger.id);
      sessionStorage.setItem('fired_chiki_ids', JSON.stringify([..._firedChikiIds]));

      // package_delivery 트리거 — 택배 도착 연출
      if (trigger.package_delivery) {
        triggerPackageDelivery();
        return true;
      }
      showChikiToast(trigger.toast || '🐰 치키가 반응했습니다…');
      setTimeout(() => {
        document.getElementById('chiki-popup-text').textContent = trigger.msg;
        openChiki();
        // 치키 힌트 — 단서탭에 기록하되 상단바 카운트 제외
        if (trigger.clue) addChikiHint(trigger.clue);
      }, 1300);
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────
//  단서 트리거 감지 (유저 입력 + 현재 NPC 맥락 체크)
//  — source: 'user' 트리거만 처리
//  — trigger.npc 필드로 현재 대화 중인 NPC 일치 여부 확인
//  — 치키 트리거 발동 시엔 호출되지 않음 (sendMsg에서 보장)
// ─────────────────────────────────────────────
function checkClueTrigger(userText) {
  if (!triggersLoaded) return;
  const currentNPCName = NPCs[currentNPC]?.name ?? '';
  for (const trigger of CLUE_TRIGGERS) {
    if (trigger.source !== 'user') continue;
    // npc 필드가 있으면 현재 대화 NPC와 일치해야 발동
    if (trigger.npc && trigger.npc !== currentNPCName) continue;
    const detected = (trigger.detect_words ?? []).some(w => userText.includes(w));
    if (!detected) continue;
    // package_delivery 트리거 — 택배 도착 연출
    if (trigger.package_delivery) {
      triggerPackageDelivery();
      return;
    }
    if (trigger.clue) {
      addClue(trigger.clue);
      return;
    }
  }
}

// ─────────────────────────────────────────────
//  이벤트 트리거 발화
// ─────────────────────────────────────────────
function fireEventTrigger(eventId) {
  if (!triggersLoaded) return;
  const trigger = CLUE_TRIGGERS.find(
    t => t.source === 'event' && t.event === eventId
  );
  if (trigger?.clue) addClue(trigger.clue);
}

function showChikiToast(msg) {
  const toast = document.getElementById('chiki-toast');
  toast.textContent = msg;
  toast.classList.add('show');
  if (chikiToastTimeout) clearTimeout(chikiToastTimeout);
  chikiToastTimeout = setTimeout(() => toast.classList.remove('show'), 1200);
}

// ─────────────────────────────────────────────
//  치키 드로어
// ─────────────────────────────────────────────
function openChiki() {
  document.getElementById('chiki-popup').classList.add('open');
  document.getElementById('chiki-overlay').classList.add('show');
}

function closeChiki() {
  document.getElementById('chiki-popup').classList.remove('open');
  document.getElementById('chiki-overlay').classList.remove('show');
}

// ─────────────────────────────────────────────
//  ★ 사망 연출 (타이머 사망 전용)
//  대화 중 is_dead는 sendToBackend에서 처리
// ─────────────────────────────────────────────
async function triggerDeath(cause = 'timer') {
  if (isDeadProcessing) return;
  isDeadProcessing = true;

  clearInterval(timerInterval);

  sessionStorage.setItem('death_cause', cause);
  sessionStorage.setItem('loop_num', String(loopNum));

  await fetchAPI('/player-dead');
  window.location.href = '/suspect';
}

// ─────────────────────────────────────────────
//  백엔드 채팅 전송
// ─────────────────────────────────────────────
async function sendToBackend(text, isLastMsg = false) {
  const input = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');

  // 전송 시점의 NPC 인덱스를 고정: 백엔드 응답 대기 중 탭 전환이 일어나도
  // 올바른 채팅 영역에 이미지를 삽입할 수 있도록 클로저로 캡처
  const npcIndexAtSend = currentNPC;

  isSending = true;
  input.disabled = true;
  sendBtn.disabled = true;
  const switchBtn = document.getElementById('npc-switch-btn');
  if (switchBtn) switchBtn.disabled = true;

  appendTypingRow();

  try {
    const session_id = sessionStorage.getItem('session_id');
    if (!session_id) throw new Error('no session_id');

    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id,
        npc_name: NPCs[currentNPC].name,
        user_input: text,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const tr = document.getElementById('typing-row');
    if (tr) tr.remove();
    addNPCMsg(data.response);
    if (data.image_url) renderNPCImage(data.image_url, npcIndexAtSend);

    // HP 소진(20회 도달) → NPC 답변을 읽을 시간을 준 뒤 치키 등장
    if (isLastMsg && !data.is_dead) {
      setTimeout(() => triggerMsgLimit(), 4000);
    }

    if (data.is_dead) {
      // 대화 중 사망 → 치키 등장 후 suspect.html로 (death-overlay 없이)
      sessionStorage.setItem('death_cause', 'chat');
      sessionStorage.setItem('loop_num', String(loopNum));
      clearInterval(timerInterval);
      if (!isMsgLimitReached) {
        isMsgLimitReached = true;
        const input = document.getElementById('msg-input');
        const sendBtn = document.getElementById('send-btn');
        if (input) input.disabled = true;
        if (sendBtn) sendBtn.disabled = true;

        showChikiToast('🐰 이제 범인을 골라볼 시간이야~!');
        setTimeout(() => {
          document.getElementById('chiki-popup-text').textContent =
            '대화를 충분히 나눴지? 이제 범인을 골라볼 차례야! 치키가 도와줄게~ 🐰✨';
          openChiki();
        }, 1300);
        setTimeout(() => {
          closeChiki();
          setTimeout(() => {
            window.location.href = '/suspect';
          }, 800);
        }, 4000);
      }

    } else if (data.is_loop_reset) {
      const nextLoop = loopNum + 1;
      await reloadTriggersForLoop(nextLoop);

      if (lastLoopCount < nextLoop) {
        const loopData = await fetchAPI('/new-loop');
        lastLoopCount = nextLoop;
        const resolvedLoop = loopData?.loop_count ?? nextLoop;
        const loopNumEl2 = document.getElementById('loop-num');
        const loopCountEl2 = document.getElementById('loop-count');
        if (loopNumEl2) loopNumEl2.textContent = resolvedLoop;
        if (loopCountEl2) loopCountEl2.textContent = resolvedLoop;

        if (loopData?.is_game_over) {
          document.getElementById('game-over-overlay')?.classList.add('show');
        }
      }
    }

  } catch (err) {
    console.warn('[sendToBackend] 백엔드 미연결, 폴백 응답 사용:', err.message);
    const tr = document.getElementById('typing-row');
    if (tr) tr.remove();
    addNPCMsg();
    if (isLastMsg) {
      setTimeout(() => triggerMsgLimit(), 4000);
    }
  } finally {
    isSending = false;
    if (switchBtn) switchBtn.disabled = false;
    // 메시지 한도 도달 또는 현재 NPC HP 소진 시 입력창 비활성 유지
    if (!isMsgLimitReached && npcHp > 0) {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }
}

// ─────────────────────────────────────────────
//  유틸
// ─────────────────────────────────────────────
function currentChatEl() {
  return document.getElementById(`chat-npc-${currentNPC}`);
}

function scrollToBottom() {
  const s = document.getElementById('chat-scroll');
  s.scrollTop = s.scrollHeight;
}

function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────
//  이벤트 바인딩
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  BGM 제어 로직 (자동 재생 시도 포함)
// ─────────────────────────────────────────────
// 채팅룸 BGM: chat-bgm.mp3 한 곡을 무한 반복
// (이전 BGM — 되돌릴 때 참고: atlasaudio-horror-ambience-512255.mp3 →
//  konstantinpazuzustudio-horror-piano-488124.mp3 두 곡을 번갈아 재생)
const BGM_SRC = '/frontend/audio/chat-bgm.mp3';

let bgmAudio = new Audio(BGM_SRC);
bgmAudio.loop   = true;
bgmAudio.volume = 1.0;

let isSoundOn = false;
let hasInteracted = false;

// 상단 스피커 아이콘 이미지를 바꿔주는 헬퍼 함수
function updateSoundIcon(playing) {
  const iconOn = document.getElementById('sound-icon-on');
  const iconOff = document.getElementById('sound-icon-off');
  if (playing) {
    iconOn.style.display = 'block';
    iconOff.style.display = 'none';
    isSoundOn = true;
  } else {
    iconOn.style.display = 'none';
    iconOff.style.display = 'block';
    isSoundOn = false;
  }
}

// 스피커 버튼을 눌렀을 때 켜고 끄기
function toggleSound() {
  if (isSoundOn) {
    bgmAudio.pause();
    updateSoundIcon(false);
  } else {
    bgmAudio.play().then(() => {
        updateSoundIcon(true);
    }).catch(e => console.warn('BGM 재생 실패:', e));
  }
}

// 자동 재생이 브라우저에 의해 막혔을 때, 사용자의 첫 클릭 시 재생
document.body.addEventListener('click', () => {
  if (!hasInteracted) {
    hasInteracted = true;
    if (!isSoundOn) {
        bgmAudio.play().then(() => {
            updateSoundIcon(true);
        }).catch(e => console.warn('BGM 재생 실패:', e));
    }
  }
}, { once: true });

// 스피커 아이콘 클릭 이벤트
document.getElementById('sound-toggle').addEventListener('click', (e) => {
  e.stopPropagation(); 
  hasInteracted = true; 
  toggleSound();
});

// ─────────────────────────────────────────────
//  키보드 대응 — 키보드가 열리면 화면 전체가 밀려 올라가지 않고
//  #app 높이를 '키보드 위에 보이는 영역'에 맞춰 줄인다
//  (헤더는 제자리, 대화 영역이 줄어들고 입력창이 키보드 바로 위에 붙음)
//  iOS Safari: visualViewport로 처리 / Android Chrome: viewport의 interactive-widget
// ─────────────────────────────────────────────
(function fitAppToVisualViewport() {
  const vv  = window.visualViewport;
  const app = document.getElementById('app');
  if (!vv || !app) return;

  function fit() {
    app.style.height = `${vv.height}px`;
    // iOS가 입력창을 보이게 하려고 페이지를 위로 스크롤한 것을 되돌림
    window.scrollTo(0, 0);
    if (typeof scrollToBottom === 'function') scrollToBottom();
  }

  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', () => window.scrollTo(0, 0));
  document.getElementById('msg-input').addEventListener('blur', () => {
    // 키보드가 닫히면 원래 높이(CSS 100dvh)로 복귀
    setTimeout(() => { app.style.height = ''; window.scrollTo(0, 0); }, 100);
  });
})();

// ─────────────────────────────────────────────
//  타이머 일시정지 / 재개 (팝업이 떠 있는 동안 사용)
//  재개할 때 멈춘 시간만큼 timer_start를 뒤로 미뤄 남은 시간을 그대로 이어간다
// ─────────────────────────────────────────────
let timerPausedAt = null;

function pauseGameTimer() {
  clearInterval(timerInterval);
  if (!timerPausedAt) timerPausedAt = Date.now();
}

function resumeGameTimer() {
  if (timerPausedAt) {
    const timerStart = parseInt(sessionStorage.getItem('timer_start') || '0', 10);
    if (timerStart) {
      sessionStorage.setItem('timer_start', String(timerStart + (Date.now() - timerPausedAt)));
    }
    timerPausedAt = null;
  }
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
}

// ─────────────────────────────────────────────
//  음악 재생 팝업 — 자동 재생이 막혔을 때 입장 직후 표시
//  '재생'을 누르면 (사용자 동작 안에서) BGM 재생 후 닫힘
// ─────────────────────────────────────────────
function openSoundGate() {
  pauseGameTimer();
  document.getElementById('sound-gate-popup').classList.add('open');
  document.getElementById('sound-gate-overlay').classList.add('show');
}

function confirmSoundGate() {
  hasInteracted = true;
  bgmAudio.play()
    .then(() => updateSoundIcon(true))
    .catch(e => console.warn('BGM 재생 실패:', e));
  document.getElementById('sound-gate-popup').classList.remove('open');
  document.getElementById('sound-gate-overlay').classList.remove('show');
  resumeGameTimer();
}

document.getElementById('sound-gate-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  confirmSoundGate();
});

// ─────────────────────────────────────────────
//  포기하기 — 홈(처음으로) / 엔딩으로 버튼
//  버튼 → '포기하시겠습니까?' 팝업 → 예: 이동 / 아니오: 닫기
//  팝업이 떠 있는 동안 타이머는 멈추고, 닫으면 멈춘 시간만큼 timer_start를 미뤄서 재개
// ─────────────────────────────────────────────
let giveUpTarget = null; // 'home' | 'ending'

function openGiveUp(target) {
  giveUpTarget = target;
  pauseGameTimer();
  document.getElementById('giveup-popup').classList.add('open');
  document.getElementById('giveup-overlay').classList.add('show');
}

function closeGiveUp() {
  giveUpTarget = null;
  document.getElementById('giveup-popup').classList.remove('open');
  document.getElementById('giveup-overlay').classList.remove('show');
  resumeGameTimer();
}

function confirmGiveUp() {
  clearInterval(timerInterval);
  bgmAudio.pause();

  if (giveUpTarget === 'home') {
    // 게임 기록 전부 삭제 후 첫 화면으로
    sessionStorage.clear();
    window.location.href = '/';
  } else if (giveUpTarget === 'ending') {
    window.location.href = '/ending';
  }
}

document.getElementById('giveup-home-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  openGiveUp('home');
});
document.getElementById('giveup-ending-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  openGiveUp('ending');
});

// ─────────────────────────────────────────────
//  미확인 단서 배지 업데이트
// ─────────────────────────────────────────────
function updateClueBadge() {
  const badge = document.getElementById('folder-badge');
  if (!badge) return;
  if (unreadClueCount > 0) {
    badge.textContent = unreadClueCount > 9 ? '9+' : String(unreadClueCount);
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ─────────────────────────────────────────────
//  단서 이미지 라이트박스
// ─────────────────────────────────────────────
let _lbScale = 1, _lbDist0 = 0, _lbX = 0, _lbY = 0, _lbDx = 0, _lbDy = 0, _lbDragging = false;

function openImgLightbox(src, title) {
  let lb = document.getElementById('img-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'img-lightbox';
    lb.innerHTML = `
      <div id="lb-backdrop"></div>
      <div id="lb-container">
        <div id="lb-label"></div>
        <div id="lb-img-wrap"><img id="lb-img" src="" alt="" draggable="false"></div>
        <div id="lb-hint">핀치로 줌 · 드래그로 이동 · 더블탭으로 리셋</div>
      </div>`;
    document.getElementById('app').appendChild(lb);
    document.getElementById('lb-backdrop').addEventListener('click', closeImgLightbox);

    const img = document.getElementById('lb-img');
    let lastTap = 0;
    img.addEventListener('touchend', () => {
      const now = Date.now();
      if (now - lastTap < 280) { _lbScale = 1; _lbDx = 0; _lbDy = 0; applyLbTransform(); }
      lastTap = now;
    });
    img.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        _lbDist0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      } else if (e.touches.length === 1 && _lbScale > 1) {
        _lbDragging = true; _lbX = e.touches[0].clientX - _lbDx; _lbY = e.touches[0].clientY - _lbDy;
      }
    }, { passive: true });
    img.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        _lbScale = Math.min(5, Math.max(1, _lbScale * (d / _lbDist0))); _lbDist0 = d; applyLbTransform();
      } else if (e.touches.length === 1 && _lbDragging) {
        _lbDx = e.touches[0].clientX - _lbX; _lbDy = e.touches[0].clientY - _lbY; applyLbTransform();
      }
    }, { passive: false });
    img.addEventListener('touchend', () => { _lbDragging = false; });
  }
  _lbScale = 1; _lbDx = 0; _lbDy = 0;
  document.getElementById('lb-img').src = src;
  document.getElementById('lb-label').textContent = title || '';
  applyLbTransform();
  lb.classList.add('open');
}

function closeImgLightbox() {
  const lb = document.getElementById('img-lightbox');
  if (lb) lb.classList.remove('open');
}

function applyLbTransform() {
  const img = document.getElementById('lb-img');
  if (img) img.style.transform = `translate(${_lbDx}px, ${_lbDy}px) scale(${_lbScale})`;
}

// ─────────────────────────────────────────────
//  오늘의 상황 · 첫 메시지
// ─────────────────────────────────────────────
let isOpening = false;  // 첫 메시지 생성 중에는 전송을 막는다

// 버튼룸 최종 장면(final_node)의 '오늘의 상황' (frontend/data/today_situations.json)
async function loadTodaySituation() {
  if (!finalNode) return null;
  try {
    const res = await fetch('/frontend/data/today_situations.json');
    const data = await res.json();
    return data.situations?.[String(finalNode)] ?? null;
  } catch (e) {
    console.warn('[오늘의 상황] 불러오기 실패', e);
    return null;
  }
}

// 대화창 맨 위 SYSTEM 나레이션 카드: 공통 상황 + 이 NPC와의 현재 상태 한 줄
function buildSituationCard(situation, npcName) {
  const npcLine = situation.npcs?.[npcName]?.line ?? '';
  const card = document.createElement('div');
  card.className = 'situation-card';
  card.innerHTML = `
    <div class="situation-label">SYSTEM · 오늘의 상황</div>
    <div class="situation-loc">📍 ${esc(situation.location)} · ${esc(situation.place)}</div>
    <div class="situation-text">${esc(situation.narration)}</div>
    ${npcLine ? `<div class="situation-npc">— ${esc(npcLine)}</div>` : ''}`;
  return card;
}

// 특정 대화창(idx)에 '입력 중…' 표시
function appendTypingRowTo(idx) {
  const chatEl = document.getElementById(`chat-npc-${idx}`);
  if (!chatEl) return;
  const npc = NPCs[idx];
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = `opening-typing-${idx}`;
  row.innerHTML = `
    <div class="msg-col">
      <div class="msg-name">${esc(npc.displayName ?? npc.name)}</div>
      <div class="typing-bubble">
        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
      </div>
    </div>`;
  chatEl.appendChild(row);
  if (idx === currentNPC) scrollToBottom();
}

// 특정 대화창(idx)에 NPC 메시지 추가 (현재 보고 있지 않은 대화창에도 쓸 수 있게)
function appendNPCBubbleTo(idx, text) {
  const chatEl = document.getElementById(`chat-npc-${idx}`);
  if (!chatEl) return;
  const npc = NPCs[idx];
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `
    <div class="msg-col">
      <div class="msg-name">${esc(npc.displayName ?? npc.name)}</div>
      <div class="bubble">${esc(text)}</div>
      <div class="msg-meta"><span class="msg-time">${nowTime()}</span></div>
    </div>`;
  chatEl.appendChild(row);
  if (idx === currentNPC) scrollToBottom();
}

// NPC 한 명의 첫 메시지 요청 (시간 초과·실패 시 대체 문구)
async function fetchOpening(idx) {
  const npcName = NPCs[idx].name;
  const session_id = sessionStorage.getItem('session_id');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENING_TIMEOUT_MS);
  try {
    if (!session_id) throw new Error('no session_id');
    const res = await fetch(`${BASE_URL}/chat/opening`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, npc_name: npcName }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { text: data.response || FALLBACK_OPENERS[npcName], imageUrl: data.image_url };
  } catch (e) {
    console.warn(`[첫 메시지] ${npcName} 생성 실패 → 대체 문구`, e);
    const fallback = FALLBACK_OPENERS[npcName] ?? '…';
    syncFallbackOpening(session_id, npcName, fallback);
    return { text: fallback, imageUrl: null };
  } finally {
    clearTimeout(timer);
  }
}

// 화면이 보여준 대체 문구를 서버 대화 기록의 첫 메시지로 맞춘다 (결과는 기다리지 않음)
function syncFallbackOpening(session_id, npcName, fallbackText) {
  if (!session_id) return;
  fetch(`${BASE_URL}/chat/opening`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, npc_name: npcName, fallback_text: fallbackText }),
  }).catch(() => {});
}

// 두 NPC의 첫 메시지를 동시에 생성해 각 대화창에 표시
async function startOpenings() {
  isOpening = true;
  NPCs.forEach((_, i) => appendTypingRowTo(i));
  await Promise.all(NPCs.map(async (_, i) => {
    const { text, imageUrl } = await fetchOpening(i);
    document.getElementById(`opening-typing-${i}`)?.remove();
    appendNPCBubbleTo(i, text);
    if (imageUrl) renderNPCImage(imageUrl, i);
  }));
  isOpening = false;
}

// ─────────────────────────────────────────────
//  초기화
// ─────────────────────────────────────────────
(async () => {
  const storedLoop = parseInt(sessionStorage.getItem('loop_num') || '1', 10);
  loopNum = storedLoop;
  loopCount = storedLoop;
  sessionStorage.setItem('loop_num', String(loopNum));

  const loopNumEl = document.getElementById('loop-num');
  const loopCountEl = document.getElementById('loop-count');
  if (loopNumEl) loopNumEl.textContent = loopNum;
  if (loopCountEl) loopCountEl.textContent = loopNum;

  // ★ 버튼룸에서 획득한 단서 포함 — clues 배열 복원 + 미확인 카운트 초기화
  // clues_read 에 없는 id는 아직 단서탭에서 확인 안 한 것
  const existingClues = JSON.parse(sessionStorage.getItem('clues') || '[]');
  const readClues     = JSON.parse(sessionStorage.getItem('clues_read') || '[]');
  // 페이지 재진입 시 인메모리 clues 배열 복원 (없으면 단서탭이 비는 버그 방지)
  clues = existingClues.map(c => ({ ...c, time: '' }));
  unreadClueCount = existingClues.filter(c => !readClues.includes(c.id)).length;
  updateClueBadge();
  renderClues();
  // 상단바 단서 카운트 복원 (chiki 힌트 제외)
  // 상단바 단서 카운트 복원 (chiki 힌트를 제외한 모든 정식 단서 통합)
  const infoCountInit = document.getElementById('clue-info-count');
  if (infoCountInit) infoCountInit.textContent = clues.filter(c => c.source !== 'chiki' && (c.loop ?? 1) <= loopNum).length;

  const HEADER_BG_MAP = {
    401: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550042/bg_living_sv1swh.png',
    402: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550042/bg_living_sv1swh.png',
    400: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550043/bg_lobby_dbpizb.png',
    404: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550043/bg_lobby_dbpizb.png',
    405: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550043/bg_lobby_dbpizb.png',
    406: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550043/bg_lobby_dbpizb.png',
    403: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550044/bg_room_yn5qfy.png',
  };
  const headerBgUrl = HEADER_BG_MAP[finalNode];
  if (headerBgUrl) {
    const header = document.getElementById('header');
    if (header) {
      header.style.backgroundImage = `url('${headerBgUrl}')`;
      header.style.backgroundSize = 'cover';
      header.style.backgroundPosition = 'center';
    }
  }

  // 대화창 + '오늘의 상황' 나레이션 카드
  const situation = await loadTodaySituation();
  const chatScroll = document.getElementById('chat-scroll');
  NPCs.forEach((npc, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'chat-messages';
    wrap.id = `chat-npc-${i}`;
    if (i !== 0) wrap.style.display = 'none';
    if (situation) wrap.appendChild(buildSituationCard(situation, npc.name));
    chatScroll.appendChild(wrap);
  });

  await loadTriggers();
  switchNPC(0);
  updateHpBar();
  scrollToBottom();

  // 두 NPC의 첫 메시지를 동시에 생성 (끝날 때까지 전송은 막음)
  startOpenings();

  const msgInput = document.getElementById('msg-input');
  msgInput.addEventListener('input', (e) => { filterChoicesByInput(e.target.value); });
  msgInput.addEventListener('focus', showIdleSuggestions);
  msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) sendMsg(); });

  bgmAudio.play().then(() => {
    console.log('BGM 자동 재생 성공');
    updateSoundIcon(true);
    hasInteracted = true;
  }).catch(() => {
    console.warn('브라우저 정책으로 자동 재생 차단. 음악 재생 팝업 표시.');
    updateSoundIcon(false);
    openSoundGate();
  });
})();
