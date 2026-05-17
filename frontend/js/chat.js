// ═══════════════════════════════════════════════
//  chat.js  —  Phase 2 채팅 UI 동작 로직
//  담당: NPC 전환 / 타이머 / 메시지 송수신 /
//        치키 트리거 / 드로어 / 사망 연출
// ═══════════════════════════════════════════════

const BASE_URL = '';

// ─────────────────────────────────────────────
//  NPC 데이터 — 현재 차서연/엄마 쌍 구현
//  다른 쌍으로 교체 시 이 배열만 수정하면 됨
// ─────────────────────────────────────────────
const NPCs = [
  {
    id: 0, name: '차서연', sub: '32세 · 여성', tag: '신경과 의사',
    tagColor: '#5a8870',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595780/chat/%EC%B0%A8%EC%84%9C%EC%97%B0/%EC%B0%A8%EC%84%9C%EC%97%B0_%ED%94%84%EB%A1%9C%ED%95%84.png',
    choices: ['커피 안 마실게요', '박주원 알아요?', '사무실 뒤진 거예요?', '패턴이 뭔가요?'],
  },
  {
    id: 1, name: '엄마', displayName: '윤미경', sub: '61세 · 여성', tag: '가족',
    tagColor: '#8a7040',
    profile: 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778595815/chat/%EC%97%84%EB%A7%88/%EC%97%84%EB%A7%88_%ED%9B%84%ED%9B%97%20%EB%82%98%EB%8F%84%20%EB%AD%94%ED%91%9C%EC%A0%95%EC%9D%B8%EC%A7%80%EB%AA%B0%EB%9D%BC%20%ED%9B%84%ED%9B%97%20%EB%A8%B9%EA%B8%88.png',
    choices: ['밥 먹었어요', '내일이 기일이에요?', '동생 기억해요', '엄마 미안해요'],
  },
];

// ─────────────────────────────────────────────
//  트리거 데이터
// ─────────────────────────────────────────────
let CHIKI_TRIGGERS = [];
let CLUE_TRIGGERS = [];

const FALLBACK_CHIKI_TRIGGERS = [
  {
    id: 'hayun', words: ['김하윤', '하윤'],
    toast: '🐰 …그 이름은 잠금 처리된 이름인데.',
    msg: '김… 하… 윤? 어라라, 이상하다! 그 이름은 잠금 처리된 이름인데? 누가 열쇠를 주웠지? 🗝️🐰',
    clue: { icon: '🗝️', title: '잠긴 이름 — 김하윤', desc: '치키가 반응했다. 이 이름은 시스템에서 잠금 처리된 이름이다.' }
  },
  {
    id: 'safe', words: ['금고', '거울'],
    toast: '🐰 그 문은 열면 안 돼…',
    msg: '어라라? 그 문을 열려고? 음… 열면 이제 피해자인 척하기 조금 어려워질 텐데? 🐰🔒',
    clue: { icon: '🔒', title: '금고 / 거울', desc: '치키가 접근을 막았다. 열면 피해자인 척하기 어려워진다고.' }
  },
  {
    id: 'murder', words: ['죽었', '죽어', '살인', '범인'],
    toast: '🐰 누가 죽였냐고? 히히…',
    msg: '누가 널 죽였냐고? 그건 직접 찾아야 해! 🐰🔍',
    clue: { icon: '🔍', title: '사망의 진실', desc: '치키는 범인을 알고 있지만 직접 말하지 않는다.' }
  },
];

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
let triggersLoaded = false;
let isSending = false;
let isSwitchingNPC = false;
let isDeadProcessing = false;
let lastLoopCount = 0;

// 대화 횟수 카운터 (NPC별 10회 × 2 = 통합 20회)
let msgCount = 0;
const MSG_LIMIT = 20;
const NPC_HP_MAX = 10;
let npcHp = [NPC_HP_MAX, NPC_HP_MAX]; // NPC별 잔여 대화 횟수
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
      fetch(`/clue-triggers?loop=${loop}`)
    ]);
    if (!chikiRes.ok || !clueRes.ok) throw new Error('trigger fetch failed');
    const chikiData = await chikiRes.json();
    const clueData = await clueRes.json();
    CHIKI_TRIGGERS = chikiData.chiki_triggers ?? [];
    CLUE_TRIGGERS = clueData.clue_triggers ?? [];
    triggersLoaded = true;
    console.log(`[triggers] 치키 ${CHIKI_TRIGGERS.length}개, 단서 ${CLUE_TRIGGERS.length}개 로드 (loop ${loop})`);
  } catch (err) {
    console.warn('[triggers] 백엔드 미연결, 폴백 트리거 사용:', err.message);
    CHIKI_TRIGGERS = FALLBACK_CHIKI_TRIGGERS;
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
  const hp = npcHp[currentNPC];
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
    folderBadge.style.display = 'none';
    msgInput.disabled = true;
    sendBtn.disabled = true;
    renderClues();
  }
}

// ─────────────────────────────────────────────
//  단서 추가 & 렌더링
// ─────────────────────────────────────────────
function addClue(clue) {
  if (clues.some(c => c.title === clue.title)) return;
  clues.push({ ...clue, time: nowTime() });

  // sessionStorage 동기화 (button.js 단서와 통합 관리)
  const stored = JSON.parse(sessionStorage.getItem('clues') || '[]');
  if (!stored.find(c => c.id === clue.title)) {
    stored.push({ id: clue.title, title: clue.title, desc: clue.desc || '', img: clue.img || null });
    sessionStorage.setItem('clues', JSON.stringify(stored));
  }

  const infoCount = document.getElementById('clue-info-count');
  if (infoCount) infoCount.textContent = getClues().length;
  if (currentTab !== 'clue') {
    const badge = document.getElementById('folder-badge');
    if (badge) badge.style.display = '';
  }
  if (currentTab === 'clue') renderClues();
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

  list.innerHTML = allClues.map((c, i) => `
    <div class="clue-item">
      <div class="clue-item-top">
        <span class="clue-item-badge">단서 #${String(i + 1).padStart(2, '0')}</span>
      </div>
      <div class="clue-item-main">
        ${c.img ? `<img src="${esc(c.img)}" class="clue-item-img" alt="" style="max-width:100%;border-radius:6px;margin-bottom:6px;">` : ''}
        <div class="clue-item-text">
          <div class="clue-item-title">${esc(c.title)}</div>
          <div class="clue-item-desc">${esc(c.desc)}</div>
        </div>
      </div>
    </div>`).join('');
}

// ─────────────────────────────────────────────
//  NPC 전환 (switch 버튼: 현재↔상대 토글)
// ─────────────────────────────────────────────
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
  if (npcHp[idx] <= 0 || isMsgLimitReached) {
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
  npcHp[currentNPC] = Math.max(0, npcHp[currentNPC] - 1);
  updateHpBar();

  // 현재 NPC HP 소진 시 입력 비활성 (전환은 가능)
  if (npcHp[currentNPC] <= 0 && !isMsgLimitReached) {
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
  }

  checkChikiTrigger(text);
  addPlayerMsg(text);
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
//  치키 트리거 감지 (유저 입력)
// ─────────────────────────────────────────────
function checkChikiTrigger(text) {
  if (!triggersLoaded) return;
  for (const trigger of CHIKI_TRIGGERS) {
    if (trigger.words.some(w => text.includes(w))) {
      showChikiToast(trigger.toast || '🐰 치키가 반응했습니다…');
      setTimeout(() => {
        document.getElementById('chiki-popup-text').textContent = trigger.msg;
        openChiki();
        if (trigger.clue) addClue(trigger.clue);
      }, 1300);
      return;
    }
  }
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
    if (detected && trigger.clue) {
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
    if (!isMsgLimitReached && npcHp[currentNPC] > 0) {
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

let isSoundOn = false;
let hasInteracted = false;

// 한 곡이 끝났을 때 다음 곡으로 넘어감
bgmAudio.addEventListener('ended', () => {
  currentBgmIdx = (currentBgmIdx + 1) % bgmList.length;
  bgmAudio.src = bgmList[currentBgmIdx];
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

  await loadTriggers();
  switchNPC(0);
  updateHpBar();
  scrollToBottom();

  // 입력창 키워드 기반 추천 문구 필터링
  const msgInput = document.getElementById('msg-input');
  msgInput.addEventListener('input', (e) => {
    filterChoicesByInput(e.target.value);
  });
  // Enter 키 전송
  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMsg();
  });

  // 페이지 로드 시 백그라운드에서 오디오 재생 시도
  bgmAudio.play().then(() => {
      console.log('BGM 자동 재생 성공');
      updateSoundIcon(true);
      hasInteracted = true; 
  }).catch((e) => {
      // 브라우저가 막으면 꺼진 상태로 대기 (사용자 첫 클릭 시 켜짐)
      console.warn('브라우저 정책으로 자동 재생 차단. 사용자 클릭 대기 중.');
      updateSoundIcon(false);
  });
})();
