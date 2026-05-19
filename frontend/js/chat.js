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
    id: 0, name: '차서연', sub: '32세 · 여성', tag: '신경과 의사',
    tagColor: '#5a8870',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595780/chat/%EC%B0%A8%EC%84%9C%EC%97%B0/%EC%B0%A8%EC%84%9C%EC%97%B0_%ED%94%84%EB%A1%9C%ED%95%84.png',
    choices: ['커피 안 마실게요', '박주원 알아요?', '사무실 뒤진 거예요?', '패턴이 뭔가요?'],
  },
  엄마: {
    id: 1, name: '엄마', displayName: '윤미경', sub: '61세 · 여성', tag: '가족',
    tagColor: '#8a7040',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595815/chat/%EC%97%84%EB%A7%88/%EC%97%84%EB%A7%88_%ED%9B%84%ED%9B%97%20%EB%82%98%EB%8F%84%20%EB%AD%94%ED%91%9C%EC%A0%95%EC%9D%B8%EC%A7%80%EB%AA%B0%EB%9D%BC%20%ED%9B%84%ED%9B%97%20%EB%A8%B9%EA%B8%88.png',
    choices: ['밥 먹었어요', '내일이 기일이에요?', '동생 기억해요', '엄마 미안해요'],
  },
  박도원: {
    id: 2, name: '박도원', sub: '51세 · 남성', tag: '청소부',
    tagColor: '#5a6070',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595793/chat/%EB%B0%95%EB%8F%84%EC%9B%90/%EB%B0%95%EB%8F%84%EC%9B%90_%ED%94%84%EB%A1%9C%ED%95%84.png',
    choices: ['어디서 주운 거예요?', '전에 본 적 있어요?', '병원에 왜 있었어요?', '제 물건 건드렸어요?'],
  },
  김도현: {
    id: 3, name: '김도현', sub: '29세 · 남성', tag: '내담자',
    tagColor: '#6a4050',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595806/chat/%EA%B9%80%EB%8F%84%ED%98%84/%EA%B9%80%EB%8F%84%ED%98%84_%EA%B4%9C%EC%B0%AE%EC%9D%80%EB%93%AF%20%EC%9B%83%EC%9D%8C.png',
    choices: ['하윤이가 누구예요?', '왜 화난 거예요?', '저 기억해요?', '약 얘기가 뭐예요?'],
  },
};

const NPC_INIT_MSGS = {
  차서연: [
    '김도현 환자 오늘 진료 있는 거 잊었어요? 지금 화난 상태로 기다리고 있어요.',
    '커피 드실래요? 오늘 상태 안 좋아 보여서요.',
  ],
  엄마: [
    '밥은 먹었어? 얼굴이 왜 이렇게 상했어.',
    '내일이 무슨 날인지 기억하니? 아니야, 됐다.',
  ],
  박도원: [
    '아이고, 선생님. 안녕하십니까.',
    '제가 청소 일 하는 박도원이라고 합니다.',
  ],
  김도현: [
    '제가 화난 것처럼 보입니까? 선생님은 사람 감정을 읽는 게 그렇게 자신 있으신가요?',
  ],
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
    totalClues = clueData.total_clues ?? 0;
    triggersLoaded = true;

    // 단서 총 개수 UI 반영
    const totalEl = document.getElementById('clue-total-count');
    if (totalEl) totalEl.textContent = totalClues;

    console.log(`[triggers] 치키 ${CHIKI_TRIGGERS.length}개, 단서 ${CLUE_TRIGGERS.length}개 로드 (loop ${loop}, first_button ${firstButton || '미설정'}), 총 획득 가능: ${totalClues}`);
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
  const choicesArea = document.getElementById('choices-area');
  const cluePanel = document.getElementById('clue-panel');
  const folderBtn = document.getElementById('folder-btn');
  const folderBadge = document.getElementById('folder-badge');
  const msgInput = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');

  if (tab === 'chat') {
    chatScroll.style.display = '';
    choicesArea.style.display = '';
    cluePanel.classList.remove('active');
    folderBtn.classList.remove('active');
    if (!isMsgLimitReached) {
      msgInput.disabled = false;
      sendBtn.disabled = false;
    }
  } else {
    chatScroll.style.display = 'none';
    choicesArea.style.display = 'none';
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
async function addClue(clue) {
  if (clues.some(c => c.title === clue.title)) return;

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

  clues.push({ ...clue, img: imgUrl, imgUrls: imgUrls || null, time: nowTime(), source: 'chat' });

  // sessionStorage 동기화 (button.js 단서와 통합 관리)
  const stored = JSON.parse(sessionStorage.getItem('clues') || '[]');
  const storeId = clue.imgs ? clue.imgs[0] : (clue.img ?? clue.title);
  if (!stored.find(c => c.id === storeId)) {
    stored.push({ id: storeId, title: clue.title, desc: clue.desc || '', img: imgUrl, imgUrls: imgUrls || null, source: 'chat' });
    sessionStorage.setItem('clues', JSON.stringify(stored));
  }

  const infoCount = document.getElementById('clue-info-count');
  if (infoCount) infoCount.textContent = getClues().length;
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
          const label = src === 'button' ? '버튼 단서' : '채팅 단서';
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
  if (pw === '0902') {
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
    const target = stored.find(c => c.id === (safeClue.img_key ?? '금고_닫힘'));
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

  renderChoices(npc.choices);
  scrollToBottom();
  isSwitchingNPC = false;
}

// ─────────────────────────────────────────────
//  선택지 버튼 렌더링
// ─────────────────────────────────────────────
function renderChoices(choices) {
  const area = document.getElementById('choices-area');
  area.innerHTML = '';

  choices.forEach(text => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
    </svg>${esc(text)}`;
    btn.onclick = () => selectChoice(text);
    area.appendChild(btn);
  });
}

function selectChoice(text) {
  document.getElementById('msg-input').value = text;
  sendMsg();
}

// ─────────────────────────────────────────────
//  입력 키워드 기반 추천 문구 필터링
// ─────────────────────────────────────────────
function filterChoicesByInput(query) {
  const npc = NPCs[currentNPC];
  if (!npc) return;

  const area = document.getElementById('choices-area');
  const q = query.trim();

  // 입력 없으면 원래 선택지 복원
  if (!q) {
    renderChoices(npc.choices);
    return;
  }

  // 현재 NPC choices에서 키워드 포함 항목 필터링
  const matched = npc.choices.filter(c =>
    c.toLowerCase().includes(q.toLowerCase())
  );

  area.innerHTML = '';

  if (matched.length > 0) {
    // 매칭된 항목: 일치 부분 빨간 하이라이트
    matched.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn choice-btn--suggest';

      const highlighted = text.replace(
        new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '<mark>$1</mark>'
      );

      btn.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
      </svg>${highlighted}`;
      btn.onclick = () => selectChoice(text);
      area.appendChild(btn);
    });
  } else {
    // 매칭 없으면 "직접 입력" 안내 버튼
    const btn = document.createElement('button');
    btn.className = 'choice-btn choice-btn--suggest choice-btn--direct';
    btn.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>직접 입력: "${esc(q)}"`;
    btn.onclick = () => sendMsg();
    area.appendChild(btn);
  }
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
  if (isSending || isSwitchingNPC || isMsgLimitReached) return;
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  // 전송 후 추천 문구 → 원래 선택지 복원
  renderChoices(NPCs[currentNPC].choices);

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
  addPlayerMsg(text);

  // 치키 트리거 발동 시 — LLM 전송 차단, HP/카운트 원복
  if (isChikiTriggered) {
    msgCount--;
    npcHp = Math.min(NPC_HP_MAX, npcHp + 1);
    updateHpBar();
    const inp = document.getElementById('msg-input');
    const sBtn = document.getElementById('send-btn');
    // 한글 IME 조합 잔여 글자 방지: blur → value 재초기화 → 재활성화
    if (inp) {
      inp.blur();
      inp.value = '';
      inp.disabled = false;
    }
    if (sBtn) sBtn.disabled = false;
    return;
  }

  // 스토리 무관 입력 차단 — LLM 전송 안 함
  if (isOffTopic(text)) {
    showChikiToast('🐰 그런 건 나한테 물어봐~');
    setTimeout(() => {
      document.getElementById('chiki-popup-text').textContent =
        '지금 그런 거 생각할 때가 아니야. 🐰 오늘 자정까지 범인을 찾아야 한다고~';
      openChiki();
    }, 800);
    // HP/카운트 원복
    msgCount--;
    npcHp = Math.min(NPC_HP_MAX, npcHp + 1);
    updateHpBar();
    if (npcHp > 0 && !isMsgLimitReached) {
      const input = document.getElementById('msg-input');
      const sendBtn = document.getElementById('send-btn');
      if (input) input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
    }
    return;
  }

  sendToBackend(text);

  // 20회 도달 시 → NPC 응답 받은 후 suspect.html 이동
  if (msgCount >= MSG_LIMIT) {
    // sendToBackend 완료(약 2~3초) 후 triggerMsgLimit 호출
    setTimeout(() => triggerMsgLimit(), 3000);
  }
}

function addPlayerMsg(text) {
  const row = document.createElement('div');
  row.className = 'msg-row player';
  row.innerHTML = `
    <div class="msg-col">
      <div class="bubble">${esc(text)}</div>
      <div class="msg-meta" style="justify-content:flex-end;">
        <span class="msg-read">읽음</span>
        <span class="msg-time">${nowTime()}</span>
      </div>
    </div>`;
  currentChatEl().appendChild(row);
  scrollToBottom();
}

function appendTypingRow() {
  const npc = NPCs[currentNPC];
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = 'typing-row';
  row.innerHTML = `
    <div class="msg-col">
      <div class="msg-name">${npc.name}</div>
      <div class="typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  currentChatEl().appendChild(row);
  scrollToBottom();
}

function addNPCMsg(overrideText = null) {
  const npc = NPCs[currentNPC];
  const text = overrideText ?? (npc.responses?.[responseIdx % npc.responses?.length] ?? '...');
  responseIdx++;

  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `
    <div class="msg-col">
      <div class="msg-name">${npc.name}</div>
      <div class="bubble">${esc(text)}</div>
      <div class="msg-meta"><span class="msg-time">${nowTime()}</span></div>
    </div>`;
  currentChatEl().appendChild(row);
  scrollToBottom();

  checkClueTrigger(npc.name, text);
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


function checkChikiTrigger(text) {
  if (!triggersLoaded) return false;
  for (const trigger of CHIKI_TRIGGERS) {
    if (trigger.words.some(w => text.includes(w))) {
      // package_delivery 트리거 — 택배 도착 연출
      if (trigger.package_delivery) {
        triggerPackageDelivery();
        return true;
      }
      showChikiToast(trigger.toast || '🐰 치키가 반응했습니다…');
      setTimeout(() => {
        document.getElementById('chiki-popup-text').textContent = trigger.msg;
        openChiki();
        if (trigger.clue) addClue(trigger.clue);
      }, 1300);
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────
//  단서 트리거 감지 (NPC 발화)
// ─────────────────────────────────────────────
function checkClueTrigger(npcName, npcText) {
  if (!triggersLoaded) return;
  for (const trigger of CLUE_TRIGGERS) {
    if (trigger.source !== 'npc') continue;
    if (trigger.npc !== npcName) continue;
    const detected = (trigger.detect_words ?? []).some(w => npcText.includes(w));
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
async function sendToBackend(text) {
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
const bgmList = [
  '/frontend/audio/atlasaudio-horror-ambience-512255.mp3',
  '/frontend/audio/konstantinpazuzustudio-horror-piano-488124.mp3'
];

let currentBgmIdx = 0; 
let bgmAudio = new Audio(bgmList[currentBgmIdx]);
bgmAudio.volume = 0.3;

let isSoundOn = false;
let hasInteracted = false;

// 한 곡이 끝났을 때 다음 곡으로 넘어감
bgmAudio.addEventListener('ended', () => {
  currentBgmIdx = (currentBgmIdx + 1) % bgmList.length;
  bgmAudio.src = bgmList[currentBgmIdx];
  bgmAudio.volume = 0.3;
  if (isSoundOn) {
      bgmAudio.play().catch(e => console.warn('다음 BGM 재생 실패:', e));
  }
});

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
  // 이미 획득한 단서가 있으면 패널 즉시 렌더링 (탭 열기 전에도 데이터 준비)
  renderClues();

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

  const chatScroll = document.getElementById('chat-scroll');
  NPCs.forEach((npc, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'chat-messages';
    wrap.id = `chat-npc-${i}`;
    if (i !== 0) wrap.style.display = 'none';
    const msgs = NPC_INIT_MSGS[npc.name] ?? [];
    wrap.innerHTML = msgs.map(text => `
    <div class="msg-row">
      <div class="msg-col">
        <div class="msg-name">${npc.displayName ?? npc.name}</div>
        <div class="bubble">${text}</div>
        <div class="msg-meta"><span class="msg-time">${nowTime()}</span></div>
      </div>
    </div>`).join('');
    chatScroll.appendChild(wrap);
  });

  await loadTriggers();
  switchNPC(0);
  updateHpBar();
  scrollToBottom();

  const msgInput = document.getElementById('msg-input');
  msgInput.addEventListener('input', (e) => { filterChoicesByInput(e.target.value); });
  msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) sendMsg(); });

  bgmAudio.play().then(() => {
    console.log('BGM 자동 재생 성공');
    updateSoundIcon(true);
    hasInteracted = true;
  }).catch(() => {
    console.warn('브라우저 정책으로 자동 재생 차단. 사용자 클릭 대기 중.');
    updateSoundIcon(false);
  });
})();
