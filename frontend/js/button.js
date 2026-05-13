// ═══════════════════════════════════════════════
//  button.js  —  Phase 1 버튼 선택 UI 동작 로직
//  담당: 게임 상태 / 타이머 / 버튼 트리 탐색 /
//        선택지 렌더링 / 백엔드 연동 / 씬 업데이트
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
//  게임 상태
// ─────────────────────────────────────────────
// 캐릭터별 기본(fallback) 이미지 — 씬 이미지가 없거나 로드 실패 시 사용
const DEFAULT_CHARACTER_IMAGES = {
  '김도현': 'https://res.cloudinary.com/dqu0dyn5k/image/upload/f_png/v1778592804/button/%EA%B9%80%EB%8F%84%ED%98%84/%EA%B9%80%EB%8F%84%ED%98%84_%EB%AC%B4%ED%91%9C%EC%A0%95.png',
  '박도원': 'https://res.cloudinary.com/dqu0dyn5k/image/upload/f_png/v1778592789/button/%EB%B0%95%EB%8F%84%EC%9B%90/%EB%B0%95%EB%8F%84%EC%9B%90_%EC%9D%80%EC%9D%80%ED%95%9C%EB%AF%B8%EC%86%8C_%EC%B0%A9%ED%95%9C%EC%82%AC%EB%9E%8C%EC%9D%B8%EC%B2%99.png',
  '엄마':   'https://res.cloudinary.com/dqu0dyn5k/image/upload/f_png/v1778592818/button/%EC%97%84%EB%A7%88/%EC%97%84%EB%A7%88_%EC%A0%95%EC%83%89.png',
  '차서연': 'https://res.cloudinary.com/dqu0dyn5k/image/upload/f_png/v1778592766/button/%EC%B0%A8%EC%84%9C%EC%97%B0/%EC%B0%A8%EC%84%9C%EC%97%B0_%EB%AC%B8%EC%9E%901.png',
  '치키':   'https://res.cloudinary.com/dqu0dyn5k/image/upload/f_png/v1778592778/button/%EC%B9%98%ED%82%A4/%EC%B9%98%ED%82%A4_%EA%B8%B0%EB%B3%B8%EC%B9%98%ED%82%A4.png',
};

const GAME_STATE = {
  timer: { h: 0, m: 24, s: 0 },  // 24분 제한
  currentNodeId: 'root',              // 현재 위치한 트리 노드
  buttonHistory: [],                  // 클릭한 버튼 ID 누적 → 백엔드 전달용
  contextHistory: [],                  // 클릭한 버튼 텍스트 누적 → 챗봇 맥락용
  lastButtonId: null,                // 가장 마지막 선택 ID
  disabledIds: [],                  // 백엔드에서 수신한 비활성화 버튼 ID 목록
  sessionId: null,                // POST /new-game 에서 수신
  currentLocation: null,                // 현재 location (변경 감지용)
};

// ─────────────────────────────────────────────
//  버튼 트리
//  구조: { 부모ID(string): { 자식ID(string): "버튼텍스트" } }
//  'root' = 게임 시작점 (선택1)
//  리프 노드 = 자식이 없는 노드 → 7단계 완료 신호
// ─────────────────────────────────────────────
const BUTTON_TREE = {
  "root": {
    "100": "집에 있는다",
    "101": "출근한다"
  },
  // ── Sheet1: 100 (집에 있는다) 루트 ──
  "100": {
    "200": "나가지 않고 '택배 두고가세요' 말만 한다",
    "201": "나가서 택배를 받는다"
  },
  "200": {
    "300": "출근을 한다",
    "301": "핑계를 대며 출근을 안 하고 밥을 마저 먹는다"
  },
  "201": {
    "302": "자신을 아냐고 직접 물어본다",
    "303": "애써 웃으며 싸인만 한다"
  },
  "300": {
    "400": "차서연에게 사무실이 왜 어질러져 있는지 물어본다",
    "401": "물어보지 않는다"
  },
  "301": {
    "402": "나한테 동생이 있었어? 라며 물어본다",
    "403": "엄마의 말을 무시한다"
  },
  "302": {
    "404": "USB 파일을 열어본다",
    "405": "USB 파일을 열어보지 않고 밥을 먹으러 간다"
  },
  "303": {
    "406": "나한테 동생이 있었어? 라며 물어본다",
    "407": "엄마의 말을 무시한다"
  },
  "400": {
    "500": "차서연이 전달한 인스타를 확인한다",
    "501": "확인하지 않는다. 내담자와의 윤리를 지켜야한다"
  },
  "401": {
    "502": "차서연이 전달한 인스타를 확인한다",
    "503": "확인하지 않는다. 내담자와의 윤리를 지켜야한다"
  },
  "402": {
    "504": "엄마에게 어릴 때의 자신에 대해 물어본다",
    "505": "엄마에게 어릴 때의 자신에 대해 묻지 않는다"
  },
  "403": {
    "506": "엄마에게 어릴 때의 자신에 대해 물어본다",
    "507": "엄마에게 어릴 때의 자신에 대해 묻지 않는다"
  },
  "404": {
    "508": "발신자 표시 제한 전화를 받는다",
    "509": "전화를 받지 않는다"
  },
  "405": {
    "510": "아무 일도 없었다고 잘 지낸다고 말한다",
    "511": "요즘 살인현장에 관한 꿈을 꾼다고 말한다"
  },
  "406": {
    "512": "엄마에게 어릴 때의 자신에 대해 물어본다",
    "513": "엄마에게 어릴 때의 자신에 대해 묻지 않는다"
  },
  "407": {
    "514": "엄마에게 어릴 때의 자신에 대해 물어본다",
    "515": "엄마에게 어릴 때의 자신에 대해 묻지 않는다"
  },
  "500": {
    "600": "김하윤이 누군데 이러세요? 김도현을 진정시키고 대화를 시작한다",
    "601": "차서연씨!! 도와주세요. 함께 김도현을 내쫓는다"
  },
  "501": {
    "602": "김하윤이 누군데 이러세요? 김도현을 진정시키고 대화를 시작한다",
    "603": "차서연씨!! 도와주세요. 함께 김도현을 내쫓는다"
  },
  "502": {
    "604": "김하윤이 누군데 이러세요? 김도현을 진정시키고 대화를 시작한다",
    "605": "차서연씨!! 도와주세요. 함께 김도현을 내쫓는다"
  },
  "503": {
    "606": "김하윤이 누군데 이러세요? 김도현을 진정시키고 대화를 시작한다",
    "607": "차서연씨!! 도와주세요. 함께 김도현을 내쫓는다"
  },
  "504": {
    "608": "카톡에 오늘 근무가 어려울 것 같다고 답한다",
    "609": "카톡에 답하지 않는다"
  },
  "505": {
    "610": "카톡에 오늘 근무가 어려울 것 같다고 답한다",
    "611": "카톡에 답하지 않는다"
  },
  "506": {
    "612": "카톡에 오늘 근무가 어려울 것 같다고 답한다",
    "613": "카톡에 답하지 않는다"
  },
  "507": {
    "614": "카톡에 오늘 근무가 어려울 것 같다고 답한다",
    "615": "카톡에 답하지 않는다"
  },
  "508": {
    "616": "내담자가 자신에게 달려드는 듯한 사진을 받았다고 이야기한다",
    "617": "이상한 일 없으며 잘 지내고 있다고 말한다"
  },
  "509": {
    "618": "내담자가 자신에게 달려드는 듯한 사진을 받았다고 이야기한다",
    "619": "이상한 일 없으며 잘 지내고 있다고 말한다"
  },
  "510": {
    "620": "엄마에게 주원에 대해 물어본다",
    "621": "엄마에게 주원에 대해 물어보지 않는다"
  },
  "512": {
    "622": "카톡에 오늘 근무가 어려울 것 같다고 답한다",
    "623": "창문 쪽으로 가본다"
  },
  "513": {
    "624": "카톡에 오늘 근무가 어려울 것 같다고 답한다",
    "625": "창문 쪽으로 가본다"
  },
  "514": {
    "626": "카톡에 오늘 근무가 어려울 것 같다고 답한다",
    "627": "창문 쪽으로 가본다"
  },
  "515": {
    "628": "카톡에 오늘 근무가 어려울 것 같다고 답한다",
    "629": "창문 쪽으로 가본다"
  },
  "601": {
    "700": "차서연에게 김하윤에 대해 묻는다",
    "701": "차서연에게 김하윤에 대해 묻지 않는다"
  },
  "603": {
    "702": "차서연에게 김하윤에 대해 묻는다",
    "703": "차서연에게 김하윤에 대해 묻지 않는다"
  },
  "605": {
    "704": "차서연에게 김하윤에 대해 묻는다",
    "705": "차서연에게 김하윤에 대해 묻지 않는다"
  },
  "607": {
    "706": "차서연에게 김하윤에 대해 묻는다",
    "707": "차서연에게 김하윤에 대해 묻지 않는다"
  },
  "616": {
    "708": "엄마에게 전에 김도현에 대해 어떻게 이야기 했었는지 말해달라 한다",
    "709": "황급히 엄마한테 내일 무엇을 하는지 물어본다"
  },
  "617": {
    "710": "엄마에게 전에 김도현에 대해 어떻게 이야기 했었는지 말해달라 한다",
    "711": "황급히 엄마한테 내일 무엇을 하는지 물어본다"
  },
  "618": {
    "712": "엄마에게 전에 김도현에 대해 어떻게 이야기 했었는지 말해달라 한다",
    "713": "황급히 엄마한테 내일 무엇을 하는지 물어본다"
  },
  "619": {
    "714": "엄마에게 전에 김도현에 대해 어떻게 이야기 했었는지 말해달라 한다",
    "715": "황급히 엄마한테 내일 무엇을 하는지 물어본다"
  },
  "623": {
    "716": "쫓아간다",
    "717": "쫓아가지 않고 돌아가 엄마랑 마저 밥을 먹는다"
  },
  "625": {
    "718": "쫓아간다",
    "719": "쫓아가지 않고 돌아가 엄마랑 마저 밥을 먹는다"
  },
  "627": {
    "720": "쫓아간다",
    "721": "쫓아가지 않고 돌아가 엄마랑 마저 밥을 먹는다"
  },
  "629": {
    "722": "쫓아간다",
    "723": "쫓아가지 않고 돌아가 엄마랑 마저 밥을 먹는다"
  },

  // ── Sheet2: 101 (출근한다) 루트 ──
  "101": {
    "202": "커피를 마신다",
    "203": "거절한다"
  },
  "202": {
    "304": "인스타를 확인한다.",
    "305": "김도현이 누구야? 확인하지 않는다."
  },
  "203": {
    "306": "사무실로 이동한다",
    "307": "거절한다"
  },
  "304": {
    "408": "김하윤이 누군데 이러세요? 김도현과 대치한다",
    "409": "차서연씨!! 도와주세요. 함께 김도현을 내쫓는다"
  },
  "305": {
    "410": "김하윤이 누군데 이러세요? 김도현과 대치한다",
    "411": "차서연씨!! 도와주세요. 함께 김도현을 내쫓는다"
  },
  "306": {
    "412": "차서연에게 말을 건다",
    "413": "무시하고 김도현과 대화한다"
  },
  "307": {
    "414": "그 사람이 누군데 이러세요!!",
    "415": "제가 무슨 사람을 죽여요!!!!"
  },
  "408": {
    "516": "처음 듣는 일이에요",
    "517": "아.. 맞아요.. 정말 안타깝네요.."
  },
  "409": {
    "518": "차서연에게 김하윤에 대해 묻는다",
    "519": "물어보지 않는다"
  },
  "410": {
    "520": "(침묵)",
    "521": "(당황하며) 하윤씨가... 그런 일이 있었다니 정말 안타깝네요.."
  },
  "411": {
    "522": "차서연에게 김하윤에 대해 묻는다",
    "523": "물어보지 않는다"
  },
  "412": {
    "524": "뭐 찾고 있었던 거 아니냐고 물어본다",
    "525": "믿어준다"
  },
  "413": {
    "526": "무엇을 찾는지 물어본다",
    "527": "별 반응 없이 지켜본다"
  },
  "414": {
    "528": "김도현에게 공격적으로 대응, 내쫓는다",
    "529": "김도현을 진정시킨다. 자발적으로 나간다"
  },
  "415": {
    "530": "김도현에게 공격적으로 대응, 내쫓는다",
    "531": "김도현을 진정시킨다. 자발적으로 나간다"
  },
  "516": {
    "630": "몰러유",
    "631": "기억 나는 것 같기도 하구요.. 뉴스에서 봤었나?"
  },
  "517": {
    "632": "몰러유",
    "633": "기억 나는 것 같기도 하구요.. 뉴스에서 봤었나?"
  },
  "518": {
    "634": "인스타를 확인한다",
    "635": "확인하지 않는다"
  },
  "519": {
    "636": "(혼란스러워하며) 모르겠어요...",
    "637": "기억 나는 것 같기도 하구요.. 뉴스에서 봤었나?"
  },
  "520": {
    "638": "(혼란스러워하며) 모르겠어요...",
    "639": "기억 나는 것 같기도 하구요.. 뉴스에서 봤었나?"
  },
  "521": {
    "640": "모르겠어요...",
    "641": "기억 나는 것 같기도 하구요.. 뉴스에서 봤었나?"
  },
  "522": {
    "642": "인스타를 확인한다",
    "643": "확인하지 않는다"
  },
  "523": {
    "644": "(혼란스러워하며) 모르겠어요...",
    "645": "기억 나는 것 같기도 하구요.. 뉴스에서 봤었나?"
  },
  "524": {
    "646": "거절한다",
    "647": "승인한다"
  },
  "525": {
    "648": "거절한다",
    "649": "승인한다"
  },
  "526": {
    "650": "거절한다",
    "651": "승인한다"
  },
  "527": {
    "652": "거절한다",
    "653": "승인한다"
  },
  "528": {
    "654": "무시한다",
    "655": "사과를 한다"
  },
  "529": {
    "656": "차서연에게 말을 건다",
    "657": "박도원에게 말을 건다"
  },
  "530": {
    "658": "무시한다",
    "659": "사과를 한다"
  },
  "531": {
    "660": "차서연에게 말을 건다",
    "661": "박도원에게 말을 건다"
  },
  "630": { "724": "머리가 복잡하다. 바람도 쐴 겸 병원 1층으로 가본다" },
  "631": { "725": "머리가 복잡하다. 바람도 쐴 겸 병원 1층으로 가본다" },
  "632": { "726": "네" },
  "633": { "727": "아니요" },
  "634": { "728": "네" },
  "635": { "729": "아니요" },
  "636": { "730": "머리가 복잡하다. 이 주인공은 왜 죽어야 했는지, 범인은 대체 누구인지...\n 일단 핸드폰을 열어 남아있는 문자 기록을 확인한다." },
  "637": { "731": "머리가 복잡하다. 이 주인공은 왜 죽어야 했는지, 범인은 대체 누구인지...\n 일단 핸드폰을 열어 남아있는 문자 기록을 확인한다." },
  "638": { "732": "머리가 복잡하다. 이 주인공은 왜 죽어야 했는지, 범인은 대체 누구인지...\n 일단 핸드폰을 열어 남아있는 문자 기록을 확인한다." },
  "639": { "733": "머리가 복잡하다. 이 주인공은 왜 죽어야 했는지, 범인은 대체 누구인지...\n 일단 핸드폰을 열어 남아있는 문자 기록을 확인한다." },
  "640": { "734": "차서연에게 김하윤에 대해 묻지 않는다" },
  "641": { "735": "네" },
  "642": { "736": "네" },
  "643": { "737": "아니요" },
  "644": { "738": "머리가 복잡하다. 바람도 쐴 겸 병원 1층으로 가본다" },
  "645": { "739": "머리가 복잡하다. 바람도 쐴 겸 병원 1층으로 가본다" },
  "646": { "740": "USB 파일을 열어본다" },
  "647": {
    "741": "모르겠어요",
    "742": "본 거 같기도 한데 기억이 잘 안 나네요"
  },
  "648": { "743": "USB 파일을 열어본다" },
  "649": {
    "744": "모르겠어요",
    "745": "본 거 같기도 한데 기억이 잘 안 나네요"
  },
  "650": { "746": "USB 파일을 열어본다" },
  "651": {
    "747": "모르겠어요",
    "748": "본 거 같기도 한데 기억이 잘 안 나네요"
  },
  "652": { "749": "USB 파일을 열어본다" },
  "653": {
    "750": "모르겠어요",
    "751": "본 거 같기도 한데 기억이 잘 안 나네요"
  },
  "654": {
    "752": "박도원과 대화한다",
    "753": "사무실에 들어간다"
  },
  "655": {
    "754": "박도원과 대화한다",
    "755": "사무실에 들어간다"
  },
  "656": { "756": "몰러유" },
  "657": {
    "757": "그런가요? 흉흉한지 몰랐어요",
    "758": "에이 그래도 다 없어지는 건 너무 나쁜 생각 아닐까요~"
  },
  "658": {
    "759": "박도원과 대화한다",
    "760": "사무실에 들어간다"
  },
  "659": {
    "761": "박도원과 대화한다",
    "762": "사무실에 들어간다"
  },
  "660": { "763": "몰러유" },
  "661": {
    "764": "그런가요? 흉흉한지 몰랐어요",
    "765": "에이 그래도 다 없어지는 건 너무 나쁜 생각 아닐까요~"
  },
};

// ─────────────────────────────────────────────
//  트리 탐색 헬퍼
// ─────────────────────────────────────────────

// 리프 노드 여부 (자식 없음 = 7단계 완료)
function isLeafNode(nodeId) {
  return !BUTTON_TREE[String(nodeId)];
}

// 현재 노드의 자식 버튼 배열 반환 (disabled 적용 포함)
function getChildButtons(nodeId) {
  const children = BUTTON_TREE[String(nodeId)];
  if (!children) return [];
  return Object.entries(children).map(([id, text]) => ({
    id: Number(id),
    text,
    disabled: GAME_STATE.disabledIds.includes(Number(id)),
  }));
}

// ─────────────────────────────────────────────
//  피 방울 장식 생성
// ─────────────────────────────────────────────
function createDrips() {
  const container = document.getElementById('dripContainer');
  const drips = [
    { left: '12%', len: '22px', dur: '7s', delay: '1.5s' },
    { left: '28%', len: '14px', dur: '9s', delay: '4.2s' },
    { left: '43%', len: '30px', dur: '11s', delay: '0.8s' },
    { left: '61%', len: '18px', dur: '8s', delay: '3.0s' },
    { left: '75%', len: '25px', dur: '10s', delay: '6.5s' },
    { left: '88%', len: '12px', dur: '13s', delay: '2.1s' },
  ];
  drips.forEach(d => {
    const el = document.createElement('div');
    el.className = 'drip';
    el.style.left = d.left;
    el.style.setProperty('--len', d.len);
    el.style.setProperty('--dur', d.dur);
    el.style.setProperty('--delay', d.delay);
    container.appendChild(el);
  });
}

// ─────────────────────────────────────────────
//  타이머 (24분) — chatroom과 공유
//  sessionStorage 'timer_start'에 시작 epoch(ms) 저장
//  페이지 전환 후에도 남은 시간 이어받음
// ─────────────────────────────────────────────
const timerEl = document.getElementById('timerDisplay');
const TOTAL_SECONDS = 24 * 60;  // 24분 고정

// 이미 시작된 타이머가 있으면 이어받고, 없으면 새로 시작
let timerStart = parseInt(sessionStorage.getItem('timer_start') || '0', 10);
if (!timerStart) {
  timerStart = Date.now();
  sessionStorage.setItem('timer_start', String(timerStart));
}

function getRemainingSeconds() {
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  return Math.max(0, TOTAL_SECONDS - elapsed);
}

function updateButtonTimer() {
  const remaining = getRemainingSeconds();

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  timerEl.textContent =
    String(h).padStart(2, '0') + ':' +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0');

  if (remaining < 300) timerEl.classList.add('urgent');

  // 타이머 만료 → suspect.html로 이동 (타이머 사망)
  if (remaining <= 0) {
    clearInterval(btnTimerInterval);
    sessionStorage.setItem('death_cause', 'timer');
    // 루프 횟수는 suspect.js goToMorning()에서 증가시키므로 여기선 현재값만 저장
    const currentLoop = parseInt(sessionStorage.getItem('loop_num') || '1', 10);
    sessionStorage.setItem('loop_num', String(currentLoop));
    window.location.href = '/suspect';
  }
}

const btnTimerInterval = setInterval(updateButtonTimer, 1000);
updateButtonTimer();  // 즉시 한 번 표시

// ─────────────────────────────────────────────
//  "▶ 계속" 버튼 표시 (씬 대사 읽은 후 선택지로 넘어가기)
// ─────────────────────────────────────────────
function showContinueBtn(nodeId) {
  const sec = document.getElementById('choicesSection');
  sec.innerHTML = '';

  const btn = document.createElement('button');
  btn.className = 'continue-btn';
  btn.innerHTML = '<span>▶ &nbsp; 계속</span>';
  btn.addEventListener('click', () => {
    applyScene(nodeId, 'start_');
    renderChoices(getChildButtons(nodeId));
  });

  sec.appendChild(btn);

  // TODO: #progressBtn (>>) 버튼 — 프로듀서 측 기능 확정 후 구현 예정
  // const progressBtn = document.getElementById('progressBtn');
  // if (progressBtn) {
  //   progressBtn.style.display = 'flex';
  //   progressBtn.onclick = () => {
  //     progressBtn.style.display = 'none';
  //     applyScene(nodeId, 'start_');
  //     renderChoices(getChildButtons(nodeId));
  //   };
  // }
}

// ─────────────────────────────────────────────
//  선택지 렌더링
// ─────────────────────────────────────────────
function renderChoices(choices) {
  const sec = document.getElementById('choicesSection');
  sec.innerHTML = '';

  // TODO: progressBtn 연동 — 프로듀서 측 기능 확정 후 구현 예정
  // const progressBtn = document.getElementById('progressBtn');
  // if (progressBtn) progressBtn.style.display = 'none';

  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (c.disabled ? ' disabled' : '');
    btn.dataset.id = c.id;
    btn.innerHTML = `<span class="choice-text">${c.text}</span>`;
    if (!c.disabled) btn.addEventListener('click', () => onChoice(c, btn));
    sec.appendChild(btn);
  });
}

// ─────────────────────────────────────────────
//  버튼 클릭 처리
// ─────────────────────────────────────────────
async function onChoice(choice, btn) {
  // 선택 하이라이트
  document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // 클릭 플래시 연출
  const fl = document.getElementById('flashOverlay');
  fl.classList.add('on');
  setTimeout(() => fl.classList.remove('on'), 140);

  // 히스토리 누적
  GAME_STATE.buttonHistory.push(choice.id);
  GAME_STATE.contextHistory.push(choice.text);
  GAME_STATE.lastButtonId = choice.id;

  console.log('[선택]', choice.id, choice.text);

  // 1) 백엔드에 버튼 클릭 기록
  await recordButton(choice.id);

  // 2) 리프 노드 = 7단계 완료 → finalize 후 chatroom 이동
  if (isLeafNode(choice.id)) {
    await finalizeAndNavigate();
    return;
  }

  // 3) after_ 씬 표시 (버튼 클릭 직후 반응 대사)
  GAME_STATE.currentNodeId = String(choice.id);
  applyScene(choice.id, 'select_');
  document.getElementById('choicesSection').innerHTML = '';

  // 4) 2초 후 >> 진행 버튼 등장
  setTimeout(() => showContinueBtn(choice.id), 2000);
}

// ─────────────────────────────────────────────
//  백엔드 API 호출
// ─────────────────────────────────────────────

// 게임 시작 → session_id 발급
async function startNewGame() {
  try {
    const res = await fetch('/new-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_name: '플레이어', player_gender: '미설정' }),
    });
    const data = await res.json();
    GAME_STATE.sessionId = data.session_id;
    sessionStorage.setItem('session_id', data.session_id);
    console.log('[새 게임] session_id:', data.session_id);

    // 비활성화 버튼 목록 초기 조회 (루프 중복 방지)
    await fetchDisabledButtons();
  } catch (e) {
    console.warn('[백엔드 미연결] 오프라인 모드로 실행합니다.', e);
  }
}

// 비활성화 버튼 목록 조회
async function fetchDisabledButtons() {
  try {
    const session_id = GAME_STATE.sessionId || sessionStorage.getItem('session_id');
    if (!session_id) return;
    const res = await fetch(`/available-buttons?session_id=${session_id}`);
    const data = await res.json();
    GAME_STATE.disabledIds = data.disabled_button_ids || [];
    console.log('[비활성화 버튼]', GAME_STATE.disabledIds);
  } catch (e) {
    console.warn('[fetchDisabledButtons 실패]', e);
  }
}

// 버튼 클릭 기록 (매 선택마다)
async function recordButton(buttonId) {
  try {
    const session_id = GAME_STATE.sessionId || sessionStorage.getItem('session_id');
    if (!session_id) return;
    await fetch('/record-button', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, button_id: buttonId }),
    });
  } catch (e) {
    console.warn('[recordButton 실패]', e);
  }
}

// 7단계 완료 → story 확정 → chatroom.html 이동
async function finalizeAndNavigate() {
  try {
    const session_id = GAME_STATE.sessionId || sessionStorage.getItem('session_id');
    const res = await fetch('/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id,
        last_button_id: GAME_STATE.lastButtonId,
        context: GAME_STATE.contextHistory,
      }),
    });
    const data = await res.json();
    console.log('[finalize]', data);
    sessionStorage.setItem('session_id', session_id);

    // ★ 추가: last_button_id를 sessionStorage에 저장 → suspect.js에서 범인 판별에 사용
    sessionStorage.setItem('last_button_id', String(GAME_STATE.lastButtonId));

  } catch (e) {
    console.warn('[finalizeAndNavigate 실패]', e);
    // 오프라인 모드에서도 last_button_id 저장
    sessionStorage.setItem('last_button_id', String(GAME_STATE.lastButtonId));
  } finally {
    window.location.href = '/chat';
  }
}

// ─────────────────────────────────────────────
//  배경 이미지 매핑 (location → bg 파일)
// ─────────────────────────────────────────────
const LOCATION_BG_MAP = {
  '주인공의 방':   'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550044/bg_room_yn5qfy.png',
  '현관 앞':       'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550041/bg_entrance_awsngo.png',
  '거실':          'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550042/bg_living_sv1swh.png',
  '거실 창가':     'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550042/bg_living_sv1swh.png',
  '휴게실':        'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550043/bg_lounge_rbdrz9.png',
  '원장실':        'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550041/bg_director_mw2fno.png',
  '원장실 앞':     'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550041/bg_corridor_pyjgzz.png',
  '진료실':        'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550040/bg_consulting_cregzw.png',
  '진료실 앞':     'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550041/bg_corridor_pyjgzz.png',
  '상담실':        'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550040/bg_consulting_cregzw.png',
  '복도':          'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550041/bg_corridor_pyjgzz.png',
  '병원 1층 로비': 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550043/bg_lobby_dbpizb.png',
};

function setSceneBgImage(location) {
  const url = LOCATION_BG_MAP[location];
  if (!url) return;
  const bgImg = document.getElementById('sceneBgImage');
  if (!bgImg) return;
  bgImg.onload = () => { bgImg.style.opacity = '1'; };
  bgImg.src = url;
  bgImg.style.display = 'block';
}

// ─────────────────────────────────────────────
//  씬 이미지 교체
// ─────────────────────────────────────────────
function setSceneImage(url, speakerName) {
  if (!url) return;
  const img = document.getElementById('sceneImage');
  const fig = document.getElementById('sceneFigure');
  img.onerror = () => {
    const fallback = DEFAULT_CHARACTER_IMAGES[speakerName];
    if (fallback && img.src !== location.origin + fallback) {
      img.src = fallback;
    }
  };
  img.src = url;
  img.style.display = 'block';
  if (fig) fig.style.display = 'none';
}

// ─────────────────────────────────────────────
//  씬 전체 업데이트 (외부에서 호출 가능)
// ─────────────────────────────────────────────
function updateScene({ imageUrl, speaker, dialogue, location, place, choices }) {
  if (imageUrl !== undefined) setSceneImage(imageUrl, speaker?.name);
  if (speaker) {
    document.getElementById('speakerName').textContent = speaker.name;
    document.getElementById('speakerRole').textContent = speaker.role;
  }
  if (dialogue) {
    document.getElementById('dialogueText').innerHTML = dialogue.replace(/\n/g, '<br>');
  }
  if (location) {
    setSceneBgImage(location);
    document.querySelector('.loc-name').textContent = location;
  }
  if (place) {
    document.querySelector('.loc-place-name .name').textContent = place;
  }
  if (choices) renderChoices(choices);
}

// scenes.json 데이터를 화면에 반영하는 헬퍼
// prefix: 'select_' | 'start_'
function applyScene(nodeId, prefix = 'select_') {
  if (!window.SCENE_DATA) return;
  const key = prefix + String(nodeId);
  const scene = window.SCENE_DATA[key];
  if (!scene) return;

  const applyUpdate = () => {
    updateScene({
      imageUrl: window.SCENE_IMAGE_MAP?.[key] || DEFAULT_CHARACTER_IMAGES[scene.speaker_name] || null,
      speaker: { name: scene.speaker_name, role: scene.speaker_role },
      dialogue: scene.dialogue,
      location: scene.location,
      place: scene.place,
    });
  };

  const popupQueue = [];

  if (scene.location && scene.location !== GAME_STATE.currentLocation) {
    if (GAME_STATE.currentLocation !== null) {
      popupQueue.push((callback) => showPopup({
        type: 'location',
        label: scene.location,
        sublabel: scene.place,
        duration: 2000,
      }, callback));
    }
    GAME_STATE.currentLocation = scene.location;
  }

  if (scene.event) {
    popupQueue.push((callback) => showPopup({
      type: 'event',
      label: scene.event,
      duration: 2000,
    }, callback));
  }

  /*
  // 3) 인물 변경
  if (scene.speaker_name && scene.speaker_name !== GAME_STATE.currentSpeaker && scene.speaker_name !== '치키') {
    if (GAME_STATE.currentSpeaker !== null) {
      // 처음 로드가 아닐 때만 팝업
      popupQueue.push((callback) => showPopup({
        type:     'speaker_name',
        icon:     '👤',
        label:    scene.speaker_name,
        sublabel: scene.speaker_role,
        duration: 2000,
      }, callback));
    }
    GAME_STATE.currentSpeaker = scene.speaker_name;
  }
  */

  // 큐 실행: 팝업들을 순서대로 실행하고, 마지막에 씬 적용
  runQueue(popupQueue, applyUpdate);
}

function runQueue(queue, finalCallback) {
  if (queue.length === 0) {
    finalCallback();
    return;
  }
  const next = queue.shift();
  next(() => runQueue(queue, finalCallback));
}

// ============= [음향 매핑 및 재생 함수] =============
const EVENT_SOUND_BASE = '/frontend/audio/';
const EVENT_SOUND_MAP = {
  '전화': '전화벨.mp3',
  '문자': '문자알림.mp3',
  '유리': '유리깨짐.mp3',
  '초인종': '초인종.mp3',
  '노크': '노크.mp3'
};

function playEventSound(eventText) {
  if (!eventText) return;
  let soundFile = null;
  for (const [keyword, filename] of Object.entries(EVENT_SOUND_MAP)) {
    if (eventText.includes(keyword)) {
      soundFile = filename;
      break;
    }
  }
  if (soundFile) {
    const audio = new Audio(EVENT_SOUND_BASE + soundFile);
    audio.play().catch(e => console.warn('[오디오 재생 실패]:', e));
  }
}

function showPopup(opts, callback) {
  const popup = document.getElementById('eventPopup');
  const iconEl = document.getElementById('eventIcon');
  const labelEl = document.getElementById('eventLabel');
  const subEl = document.getElementById('eventSublabel');

  iconEl.textContent = opts.icon;
  labelEl.textContent = opts.label;
  
  // ============= [팝업 뜰 때 소리 재생] =============
  if (opts.type === 'event') {
    playEventSound(opts.label);
  }
  
  if (subEl) {
    subEl.textContent = opts.sublabel || '';
    subEl.style.display = opts.sublabel ? 'block' : 'none';
  }

  popup.dataset.type = opts.type || 'event';
  popup.classList.add('show');

  setTimeout(() => {
    popup.classList.remove('show');
    if (callback) setTimeout(callback, 250);
  }, opts.duration || 1500);
}

// ─────────────────────────────────────────────
//  초기화
// ─────────────────────────────────────────────
(async () => {
  // ★ sessionStorage에서 루프 번호 읽어서 UI 반영
  const loopNum = parseInt(sessionStorage.getItem('loop_num') || '1', 10);
  const loopNumEl = document.querySelector('.loop-num');
  if (loopNumEl) loopNumEl.textContent = loopNum;

  try {
    const res = await fetch('/frontend/data/scenes.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    window.SCENE_DATA = data.scenes;
    console.log('[씬 데이터 로드 성공]', Object.keys(window.SCENE_DATA).length, '개');
  } catch (e) {
    console.error('[SCENE_DATA 로드 실패]', e.message);
  }

  // ★ 추가: scene_image_map.json 로드 (씬별 인물 이미지 매핑)
  try {
    const res = await fetch('/frontend/data/scene_image_map.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    window.SCENE_IMAGE_MAP = await res.json();
    console.log('[이미지 맵 로드 성공]', Object.keys(window.SCENE_IMAGE_MAP).length, '개');
  } catch (e) {
    console.warn('[이미지 맵 로드 실패]', e.message);
    window.SCENE_IMAGE_MAP = {};
  }

  await startNewGame();
  applyScene('root', 'select_');
  setTimeout(() => showContinueBtn('root'), 3000);
  createDrips();
})();

// 전역 API
window.GameUI = { updateScene, applyScene, renderChoices, setSceneImage };