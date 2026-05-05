// ═══════════════════════════════════════════════
//  chat.js  —  Phase 2 채팅 UI 동작 로직
//  담당: NPC 전환 / 타이머 / 메시지 송수신 /
//        치키 트리거 / 드로어 / 사망 연출
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
//  NPC 데이터
//  TODO: 백엔드 연동 시 GET /npc-data 로 교체
// ─────────────────────────────────────────────
const NPCs = [
  {
    id:0, name:'김도현', sub:'34세 · 남성', tag:'내담자',
    tagColor:'#6a7f99', avatarStyle:'color:#6a7f99;',
    statLabel:'경계심', statVal:72, statColor:'#c0392b',
    // TODO: 백엔드 연동 시 GET /available-buttons 로 교체
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
//  치키 트리거 단어 & 대사
//  TODO: 백엔드에서 트리거 목록 받아오는 경우 GET /chiki-triggers 로 교체
// ─────────────────────────────────────────────
const CHIKI_TRIGGERS = [
  {
    words: ['김하윤', '하윤'],
    toast: '🐰 …그 이름은 잠금 처리된 이름인데.',
    msg:   '김… 하… 윤? 어라라, 이상하다! 그 이름은 잠금 처리된 이름인데? 누가 열쇠를 주웠지? 🗝️🐰',
    clue: {
      icon:  '🗝️',
      title: '잠긴 이름 — 김하윤',
      desc:  '치키가 반응했다. 이 이름은 시스템에서 잠금 처리된 이름이다. 누군가가 숨기고 싶었던 것.',
    }
  },
  {
    words: ['금고', '거울'],
    toast: '🐰 그 문은 열면 안 돼…',
    msg:   '어라라? 그 문을 열려고? 음… 열면 이제 피해자인 척하기 조금 어려워질 텐데? 그래도 괜찮아? 🐰🔒',
    clue: {
      icon:  '🔒',
      title: '금고 / 거울',
      desc:  '치키가 접근을 막았다. 열면 피해자인 척하기 어려워진다고 했다. 진실이 숨겨져 있다.',
    }
  },
  {
    words: ['죽었', '죽어', '살인', '범인'],
    toast: '🐰 누가 죽였냐고? 히히…',
    msg:   '누가 널 죽였냐고? 그건 직접 찾아야 해! 그래야 재밌… 아니, 그래야 안전하니까! 🐰🔍',
    clue: {
      icon:  '🔍',
      title: '사망의 진실',
      desc:  '치키는 범인을 알고 있지만 직접 말하지 않는다. "직접 찾아야 한다"고 했다.',
    }
  },
  {
    words: ['루프', '반복', '다시'],
    toast: '🐰 반복하면 익숙해지거든. 히히.',
    msg:   '반복하면 익숙해져! 죽는 것도, 울지 않는 것도, 모르는 척하는 것도! 히히 🥕',
    clue: {
      icon:  '⏰',
      title: '루프의 의미',
      desc:  '"모르는 척하는 것도 익숙해진다"고 했다. 주인공이 무언가를 알면서도 모른 척하고 있다.',
    }
  },
  {
    words: ['치키', '토끼'],
    toast: '🐰 불렀어? 나 여기 있었는데!',
    msg:   '히히, 불렀어? 나는 항상 여기 있었는데! 네가 죽는 순간까지 곁에 있어주는 친구잖아? 🐰💛',
    clue: {
      icon:  '🐰',
      title: '치키의 정체',
      desc:  '"네가 죽는 순간까지 곁에 있어준다"고 했다. 수호 요정이 아닐 수도 있다.',
    }
  },
];

// ─────────────────────────────────────────────
//  상태 변수
// ─────────────────────────────────────────────
let currentNPC       = 0;
let totalSeconds     = 47 * 60 + 12;
let loopNum          = 1;
let loopCount        = 1;
let responseIdx      = 0;
let timerInterval    = null;
let chikiToastTimeout= null;
let currentTab       = 'chat';  // 'chat' | 'clue'
let clues            = [];      // 치키가 알려준 단서 목록

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

  document.getElementById('timer-display').textContent= str;

  const mins = totalSeconds / 60;
  const d    = document.getElementById('timer-display');

  if (mins < 3) {
    d.classList.add('critical');
  } else {
    d.classList.remove('critical');
  }

  const st = document.getElementById('sys-timer');
  if (st) st.textContent = `${Math.ceil(mins)}분`;
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

  if (tab === 'chat') {
    chatScroll.style.display  = '';
    choicesArea.style.display = '';
    inputArea.style.display   = '';
    cluePanel.classList.remove('active');
    tabChat.classList.add('active');
    tabClue.classList.remove('active');
  } else {
    chatScroll.style.display  = 'none';
    choicesArea.style.display = 'none';
    inputArea.style.display   = 'none';
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
  // 같은 제목의 단서 중복 방지
  if (clues.some(c => c.title === clue.title)) return;

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
        <span class="clue-item-time">${c.time}</span>
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
  currentNPC  = idx;
  responseIdx = 0;

  document.querySelectorAll('.npc-tab').forEach((t, i) =>
    t.classList.toggle('active', i === idx)
  );

  const npc = NPCs[idx];

  // 헤더 아바타
  const ha = document.getElementById('header-avatar');
  ha.style.color = npc.tagColor;
  document.getElementById('header-initial').textContent =
    npc.name.slice(1, 3) || npc.name.slice(0, 2);

  // 헤더 텍스트
  document.getElementById('header-npc-name').textContent = npc.name;
  document.getElementById('header-npc-sub').textContent  = npc.sub;

  // 헤더 태그
  const ht = document.getElementById('header-tag');
  ht.textContent        = npc.tag;
  ht.style.color        = npc.tagColor;
  ht.style.borderColor  = npc.tagColor + '44';
  ht.style.background   = npc.tagColor + '14';

  // 헤더 스탯 (제거됨)
  // document.getElementById('header-stat-label')
  // document.getElementById('header-stat-bar')
  // document.getElementById('header-stat-val')

  // 채팅창 전환
  for (let i = 0; i < NPCs.length; i++) {
    const el = document.getElementById(`chat-npc-${i}`);
    if (el) el.style.display = (i === idx) ? 'block' : 'none';
  }

  renderChoices(npc.choices);
  scrollToBottom();
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
  const input = document.getElementById('msg-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  checkChikiTrigger(text);  // 치키 트리거 먼저 체크
  addPlayerMsg(text);
  setTimeout(showTyping, 400);

  // ── FUTURE: 백엔드 연동 시 아래로 교체 ──────────
  // sendToBackend(text);
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

function addNPCMsg() {
  const npc  = NPCs[currentNPC];
  const text = npc.responses[responseIdx % npc.responses.length];
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
}

// ─────────────────────────────────────────────
//  치키 트리거 감지
// ─────────────────────────────────────────────
function checkChikiTrigger(text) {
  for (const trigger of CHIKI_TRIGGERS) {
    if (trigger.words.some(w => text.includes(w))) {
      showChikiToast(trigger.toast || '🐰 치키가 반응했습니다…');
      setTimeout(() => {
        document.getElementById('chiki-bubble-text').textContent = trigger.msg;
        openChiki();
        if (trigger.clue) addClue(trigger.clue);  // 단서 객체만 저장
      }, 1300);
      return;
    }
  }
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
function triggerDeath() {
  clearInterval(timerInterval);
  document.getElementById('death-overlay').classList.add('show');

  setTimeout(() => {
    loopNum++;
    loopCount++;
    document.getElementById('loop-num').textContent     = loopNum;
    document.getElementById('loop-count').textContent   = loopCount;
    totalSeconds = 47 * 60 + 12;

    setTimeout(() => {
      document.getElementById('death-overlay').classList.remove('show');
      timerInterval = setInterval(updateTimer, 1000);

      // ── FUTURE: 루프 리셋 백엔드 연동 ──────────
      // fetch('/new-loop', { method:'POST' });
    }, 1200);
  }, 3500);
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
//  초기화
// ─────────────────────────────────────────────
switchNPC(0);
scrollToBottom();

// ── FUTURE BACKEND INTEGRATION ───────────────────────────
// async function sendToBackend(text) {
//   const session_id = sessionStorage.getItem('session_id');
//   const res = await fetch('/chat', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ session_id, npc: NPCs[currentNPC].name, text })
//   });
//   const data = await res.json();
//   // data.response  → NPC 응답 텍스트
//   // data.image_url → 이미지 URL (있을 경우 말풍선 안에 삽입)
//   addNPCMsgFromBackend(data.response, data.image_url);
// }
//
// triggerLoopReset()  → POST /player-dead
// switchNPC(name)     → GET  /available-buttons
// CHIKI_TRIGGERS      → GET  /chiki-triggers  (트리거 단어 서버에서 관리 시)