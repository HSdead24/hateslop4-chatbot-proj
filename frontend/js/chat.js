// ═══════════════════════════════════════════════
//  chat.js  —  Phase 2 채팅 UI 동작 로직
//  담당: NPC 전환 / 타이머 / 메시지 송수신 /
//        치키 트리거 / 드로어 / 사망 연출
// ═══════════════════════════════════════════════

const BASE_URL = 'http://localhost:8000';

// ─────────────────────────────────────────────
//  NPC 데이터
//  TODO: 백엔드 연동 시 GET /npc-data 로 교체
// ─────────────────────────────────────────────
const NPCs = [
  {
    id:0, name:'김도현', sub:'34세 · 남성', tag:'내담자',
    tagColor:'#6a7f99', avatarStyle:'color:#6a7f99;',
    statLabel:'경계심', statVal:72, statColor:'#c0392b',
    choices:['그 이름을 왜 묻습니까?','이틀 전 일이요?','기억하고 있습니다','왜 화났어요?'],
    responses:[
      '선생님은 정말 기억이 안 나십니까?',
      '그 이름을 왜 묻습니까? 선생님이 먼저 꺼낼 이름은 아닌 것 같은데요.',
      '이번엔 안 그러려고 왔습니다. 그냥… 확인하고 싶었습니다.',
    ]
  },
  {
    id:1, name:'차서연', sub:'32세 · 여성', tag:'신경과 의사',
    tagColor:'#5a8870', avatarStyle:'color:#5a8870;',
    statLabel:'의심도', statVal:58, statColor:'#b07030',
    choices:['커피 안 마실게요','박주원 알아요?','사무실 뒤진 거예요?','패턴이 뭔가요?'],
    responses:[
      '패턴이 이상해요. 선생님 주변에서만 반복되는 이유가 있겠죠.',
      '커피 드실래요? 오늘 상태 안 좋아 보여서요.',
      '박주원이라고, 제 친한 친구였어요. 혹시 이 얼굴 기억 안 나세요?',
    ]
  },
  {
    id:2, name:'엄마', sub:'61세 · 여성', tag:'가족',
    tagColor:'#8a7040', avatarStyle:'color:#8a7040;',
    statLabel:'집착도', statVal:89, statColor:'#b07030',
    choices:['밥 먹었어요','내일이 기일이에요?','동생 기억해요','엄마 미안해요'],
    responses:[
      '밥은 먹었어? 얼굴이 왜 이렇게 상했어, 재희야.',
      '내일이 무슨 날인지 기억하니? 아니야, 됐다.',
      '엄마한텐 너밖에 없어. 그게 제일 무서운 말인 거 엄마도 알아.',
    ]
  },
  {
    id:3, name:'박도원', sub:'60세 · 남성', tag:'청소부',
    tagColor:'#7a6a5a', avatarStyle:'color:#7a6a5a;',
    statLabel:'수상함', statVal:45, statColor:'#7a6a5a',
    choices:['누구세요?','문 앞에 두세요','딸이 있으세요?','여기서 일한 지 얼마나 됐어요?'],
    responses:[
      '아이고, 선생님. 바닥에 유리 조각이 아직 남아 있네요.',
      '우리 딸이 생각나서요. 혹시 이 얼굴, 어디서 익숙하지 않습니까?',
      '아비는요, 자식이 남긴 글을 보면 압니다.',
    ]
  }
];

// ─────────────────────────────────────────────
//  트리거 데이터
//  GET /chiki-triggers  — 서버에서 loop별로 받아옴
//  GET /clue-triggers   — NPC 발화 감지용
//
//  백엔드 미연결 시 FALLBACK_TRIGGERS로 동작 (오프라인 모드)
// ─────────────────────────────────────────────
let CHIKI_TRIGGERS = [];  // loadTriggers() 이후 채워짐
let CLUE_TRIGGERS  = [];  // loadTriggers() 이후 채워짐

// 백엔드 연결 실패 시 사용할 최소 폴백
// (triggers.json의 loop_visible=1 항목 중 핵심만 포함)
const FALLBACK_CHIKI_TRIGGERS = [
  {
    id: 'hayun', words: ['김하윤', '하윤'],
    toast: '🐰 …그 이름은 잠금 처리된 이름인데.',
    msg:   '김… 하… 윤? 어라라, 이상하다! 그 이름은 잠금 처리된 이름인데? 누가 열쇠를 주웠지? 🗝️🐰',
    clue:  { icon: '🗝️', title: '잠긴 이름 — 김하윤', desc: '치키가 반응했다. 이 이름은 시스템에서 잠금 처리된 이름이다.' }
  },
  {
    id: 'safe', words: ['금고', '거울'],
    toast: '🐰 그 문은 열면 안 돼…',
    msg:   '어라라? 그 문을 열려고? 음… 열면 이제 피해자인 척하기 조금 어려워질 텐데? 🐰🔒',
    clue:  { icon: '🔒', title: '금고 / 거울', desc: '치키가 접근을 막았다. 열면 피해자인 척하기 어려워진다고.' }
  },
  {
    id: 'murder', words: ['죽었', '죽어', '살인', '범인'],
    toast: '🐰 누가 죽였냐고? 히히…',
    msg:   '누가 널 죽였냐고? 그건 직접 찾아야 해! 🐰🔍',
    clue:  { icon: '🔍', title: '사망의 진실', desc: '치키는 범인을 알고 있지만 직접 말하지 않는다.' }
  },
];

// ─────────────────────────────────────────────
//  상태 변수
// ─────────────────────────────────────────────
let currentNPC        = 0;
let totalSeconds      = 47 * 60 + 12;
let loopNum           = 1;
let loopCount         = 1;
let responseIdx       = 0;
let timerInterval     = null;
let chikiToastTimeout = null;
let currentTab        = 'chat';  // 'chat' | 'clue'
let clues             = [];      // 수집된 단서 목록
let triggersLoaded    = false;   // 트리거 로드 완료 여부
let isSending         = false;   // 중복 전송 방지
let isSwitchingNPC    = false;   // NPC 전환 중 전송 차단
let isDeadProcessing  = false;   // triggerDeath() 중복 실행 방지
let lastLoopCount     = 0;       // /new-loop 루프당 1회 호출 보장

// ─────────────────────────────────────────────
//  공통 API 헬퍼 — POST, session_id 자동 주입
// ─────────────────────────────────────────────
async function fetchAPI(path, body = {}) {
  const session_id = sessionStorage.getItem('session_id');
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ session_id, ...body }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[fetchAPI] ${path}:`, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
//  트리거 로드 (GET /chiki-triggers, GET /clue-triggers)
// ─────────────────────────────────────────────
async function loadTriggers() {
  const loop = loopNum;  // 현재 루프 회차를 쿼리로 전달

  try {
    const [chikiRes, clueRes] = await Promise.all([
      fetch(`/chiki-triggers?loop=${loop}`),
      fetch(`/clue-triggers?loop=${loop}`)
    ]);

    if (!chikiRes.ok || !clueRes.ok) throw new Error('trigger fetch failed');

    const chikiData = await chikiRes.json();
    const clueData  = await clueRes.json();

    CHIKI_TRIGGERS = chikiData.chiki_triggers ?? [];
    CLUE_TRIGGERS  = clueData.clue_triggers   ?? [];
    triggersLoaded = true;

    console.log(`[triggers] 치키 ${CHIKI_TRIGGERS.length}개, 단서 ${CLUE_TRIGGERS.length}개 로드 (loop ${loop})`);

  } catch (err) {
    // 백엔드 미연결 → 폴백으로 동작
    console.warn('[triggers] 백엔드 미연결, 폴백 트리거 사용:', err.message);
    CHIKI_TRIGGERS = FALLBACK_CHIKI_TRIGGERS;
    CLUE_TRIGGERS  = [];
    triggersLoaded = true;
  }
}

// ─────────────────────────────────────────────
//  루프 변경 시 트리거 갱신
//  루프가 바뀌면 공개 범위가 달라지므로 재요청
// ─────────────────────────────────────────────
async function reloadTriggersForLoop(newLoop) {
  loopNum   = newLoop;
  loopCount = newLoop;
  triggersLoaded = false;
  await loadTriggers();
}

// ─────────────────────────────────────────────
//  타이머
// ─────────────────────────────────────────────
function updateTimer() {
  if (totalSeconds <= 0) { triggerDeath(); return; }
  totalSeconds--;

  const h   = Math.floor(totalSeconds / 3600);
  const m   = Math.floor((totalSeconds % 3600) / 60);
  const s   = totalSeconds % 60;
  const str = `${pad(h)}:${pad(m)}:${pad(s)}`;

  document.getElementById('timer-display').textContent = str;

  const mins = totalSeconds / 60;
  const d    = document.getElementById('timer-display');

  if (mins < 3) {
    d.classList.add('critical');
  } else {
    d.classList.remove('critical');
  }

  // 30분 이하 진입 시 단서 이벤트 트리거
  if (totalSeconds === 30 * 60) {
    fireEventTrigger('timer_30min');
  }
}

function pad(n) { return String(n).padStart(2, '0'); }

timerInterval = setInterval(updateTimer, 1000);

// ─────────────────────────────────────────────
//  하단 탭 전환
// ─────────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;

  const chatScroll  = document.getElementById('chat-scroll');
  const choicesArea = document.getElementById('choices-area');
  const inputArea   = document.getElementById('input-area');
  const cluePanel   = document.getElementById('clue-panel');
  const tabChat     = document.getElementById('tab-chat');
  const tabClue     = document.getElementById('tab-clue');
  const badge       = document.getElementById('tab-clue-badge');
  const npcTabs     = document.getElementById('npc-tabs');
  const header      = document.getElementById('header');

  if (tab === 'chat') {
    chatScroll.style.display  = '';
    choicesArea.style.display = '';
    inputArea.style.display   = '';
    npcTabs.style.display     = '';
    header.style.display      = '';
    cluePanel.classList.remove('active');
    tabChat.classList.add('active');
    tabClue.classList.remove('active');
  } else {
    chatScroll.style.display  = 'none';
    choicesArea.style.display = 'none';
    inputArea.style.display   = 'none';
    npcTabs.style.display     = 'none';
    header.style.display      = 'none';
    cluePanel.classList.add('active');
    tabChat.classList.remove('active');
    tabClue.classList.add('active');
    badge.style.display = 'none';
    renderClues();
  }
}

// ─────────────────────────────────────────────
//  단서 추가 & 렌더링
// ─────────────────────────────────────────────
function addClue(clue) {
  if (clues.some(c => c.title === clue.title)) return;  // 중복 방지
  clues.push({ ...clue, time: nowTime() });

  if (currentTab !== 'clue') {
    document.getElementById('tab-clue-badge').style.display = '';
  }
  if (currentTab === 'clue') renderClues();
}

function renderClues() {
  const list  = document.getElementById('clue-list');
  const count = document.getElementById('clue-count');
  count.textContent = clues.length;

  if (clues.length === 0) {
    list.innerHTML = `
      <div class="clue-empty">
        <div class="clue-empty-icon">🐰</div>
        <div class="clue-empty-text">치키가 알려준 단서가<br>여기에 기록됩니다.</div>
      </div>`;
    return;
  }

  list.innerHTML = clues.map((c, i) => `
    <div class="clue-item">
      <div class="clue-item-top">
        <span class="clue-item-badge">단서 #${String(i + 1).padStart(2, '0')}</span>
      </div>
      <div class="clue-item-main">
        <div class="clue-item-icon">${c.icon}</div>
        <div class="clue-item-text">
          <div class="clue-item-title">${esc(c.title)}</div>
          <div class="clue-item-desc">${esc(c.desc)}</div>
        </div>
      </div>
      <div class="clue-item-from">치키의 힌트</div>
    </div>`).join('');
}

// ─────────────────────────────────────────────
//  NPC 전환
// ─────────────────────────────────────────────
function switchNPC(idx) {
  isSwitchingNPC = true;
  currentNPC  = idx;
  responseIdx = 0;

  document.querySelectorAll('.npc-tab').forEach((t, i) =>
    t.classList.toggle('active', i === idx)
  );

  const npc = NPCs[idx];

  // 아바타
  const av = document.getElementById('header-npc-avatar');
  if (av) {
    av.style.cssText   = npc.avatarStyle;
    av.textContent     = npc.name.slice(1, 3) || npc.name.slice(0, 2);
  }

  // 헤더 텍스트
  document.getElementById('header-npc-name').textContent = npc.name;
  document.getElementById('header-npc-sub').textContent  = npc.sub;

  // 헤더 태그
  const ht = document.getElementById('header-tag');
  ht.textContent       = npc.tag;
  ht.style.color       = npc.tagColor;
  ht.style.borderColor = npc.tagColor + '44';
  ht.style.background  = npc.tagColor + '14';

  // 채팅창 전환
  for (let i = 0; i < NPCs.length; i++) {
    const el = document.getElementById(`chat-npc-${i}`);
    if (el) el.style.display = (i === idx) ? 'block' : 'none';
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
//  메시지 전송
// ─────────────────────────────────────────────
function sendMsg() {
  if (isSending || isSwitchingNPC) return;
  const input = document.getElementById('msg-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  checkChikiTrigger(text);
  addPlayerMsg(text);
  sendToBackend(text);
}

function addPlayerMsg(text) {
  const row = document.createElement('div');
  row.className = 'msg-row player';
  row.innerHTML = `
    <div class="player-avatar">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    </div>
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

function showTyping() {
  const npc = NPCs[currentNPC];
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = 'typing-row';
  row.innerHTML = `
    <div class="npc-avatar" style="${npc.avatarStyle}">
      ${npc.name.slice(1, 3) || npc.name.slice(0, 2)}
    </div>
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

  setTimeout(() => {
    const tr = document.getElementById('typing-row');
    if (tr) tr.remove();
    addNPCMsg();
  }, 1400);
}

// typing-row만 삽입 (자동 제거 없음 — sendToBackend가 응답 후 직접 제거)
function appendTypingRow() {
  const npc = NPCs[currentNPC];
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = 'typing-row';
  row.innerHTML = `
    <div class="npc-avatar" style="${npc.avatarStyle}">
      ${npc.name.slice(1, 3) || npc.name.slice(0, 2)}
    </div>
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
  const npc  = NPCs[currentNPC];
  const text = overrideText ?? npc.responses[responseIdx % npc.responses.length];
  responseIdx++;

  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `
    <div class="npc-avatar" style="${npc.avatarStyle}">
      ${npc.name.slice(1, 3) || npc.name.slice(0, 2)}
    </div>
    <div class="msg-col">
      <div class="msg-name">${npc.name}</div>
      <div class="bubble">${esc(text)}</div>
      <div class="msg-meta"><span class="msg-time">${nowTime()}</span></div>
    </div>`;
  currentChatEl().appendChild(row);
  scrollToBottom();

  // NPC 발화에 단서 트리거 감지
  checkClueTrigger(npc.name, text);
}

// image_url이 있을 때 마지막 NPC 말풍선 아래 이미지 삽입
function renderNPCImage(url) {
  const chat    = currentChatEl();
  const lastRow = chat.querySelector('.msg-row:last-child');
  if (!lastRow) return;
  const bubble  = lastRow.querySelector('.bubble');
  if (!bubble) return;
  const img = document.createElement('img');
  img.src   = url;
  img.style.cssText = 'max-width:200px;border-radius:8px;margin-top:6px;display:block;';
  img.onerror = () => img.remove();
  bubble.insertAdjacentElement('afterend', img);
  scrollToBottom();
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
        document.getElementById('chiki-bubble-text').textContent = trigger.msg;
        openChiki();
        if (trigger.clue) addClue(trigger.clue);
      }, 1300);
      return;  // 첫 번째 매칭만 처리
    }
  }
}

// ─────────────────────────────────────────────
//  단서 트리거 감지 (NPC 발화)
//  source=npc 항목만 여기서 처리
//  source=event 항목은 fireEventTrigger()로 처리
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
//  source=event 항목 수동 호출용
//  사용 예) 금고 열림 → fireEventTrigger('safe_opened')
//           30분 이하 → fireEventTrigger('timer_30min')
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
  document.getElementById('chiki-drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('show');
}

function closeChiki() {
  document.getElementById('chiki-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('show');
}

// ─────────────────────────────────────────────
//  사망 연출
// ─────────────────────────────────────────────
async function triggerDeath() {
  if (isDeadProcessing) return;
  isDeadProcessing = true;

  clearInterval(timerInterval);
  document.getElementById('death-overlay').classList.add('show');

  const nextLoop = loopNum + 1;

  // 오버레이 연출 딜레이(3500ms)와 API 호출을 병렬 처리
  const [, loopData] = await Promise.all([
    new Promise(r => setTimeout(r, 3500)),
    (async () => {
      await fetchAPI('/player-dead');
      if (lastLoopCount >= nextLoop) return null;
      const data = await fetchAPI('/new-loop');
      lastLoopCount = nextLoop;
      return data;
    })()
  ]);

  const resolvedLoop = loopData?.loop_count ?? nextLoop;

  if (loopData?.is_game_over) {
    document.getElementById('death-overlay').classList.remove('show');
    document.getElementById('game-over-overlay')?.classList.add('show');
    isDeadProcessing = false;
    return;
  }

  document.getElementById('loop-num').textContent   = resolvedLoop;
  document.getElementById('loop-count').textContent = resolvedLoop;
  totalSeconds = 47 * 60 + 12;

  await reloadTriggersForLoop(resolvedLoop);

  setTimeout(() => {
    document.getElementById('death-overlay').classList.remove('show');
    timerInterval    = setInterval(updateTimer, 1000);
    isDeadProcessing = false;
  }, 1200);
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
document.getElementById('msg-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMsg();
});

document.getElementById('tab-chat').addEventListener('click', () => switchTab('chat'));
document.getElementById('tab-clue').addEventListener('click', () => switchTab('clue'));

// ─────────────────────────────────────────────
//  초기화 — 트리거 로드 후 UI 시작
// ─────────────────────────────────────────────
(async () => {
  await loadTriggers();   // 트리거 먼저 로드
  switchNPC(0);
  scrollToBottom();
})();

async function sendToBackend(text) {
  const input   = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');

  isSending        = true;
  input.disabled   = true;
  sendBtn.disabled = true;

  appendTypingRow();

  try {
    const session_id = sessionStorage.getItem('session_id');
    if (!session_id) throw new Error('no session_id');

    const res = await fetch(`${BASE_URL}/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id,
        npc_name:   NPCs[currentNPC].name,
        user_input: text,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const tr = document.getElementById('typing-row');
    if (tr) tr.remove();
    addNPCMsg(data.response);
    if (data.image_url) renderNPCImage(data.image_url);

    if (data.is_dead) {
      triggerDeath();
    } else if (data.is_loop_reset) {
      const nextLoop = loopNum + 1;
      await reloadTriggersForLoop(nextLoop);

      if (lastLoopCount < nextLoop) {
        const loopData = await fetchAPI('/new-loop');
        lastLoopCount = nextLoop;

        const resolvedLoop = loopData?.loop_count ?? nextLoop;
        document.getElementById('loop-num').textContent   = resolvedLoop;
        document.getElementById('loop-count').textContent = resolvedLoop;

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
    isSending        = false;
    input.disabled   = false;
    sendBtn.disabled = false;
    input.focus();
  }
}