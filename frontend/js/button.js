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
  timer: { h: 0, m: 17, s: 0 },  // 17분 제한
  currentNodeId: 'root',              // 현재 위치한 트리 노드
  buttonHistory: [],                  // 클릭한 버튼 ID 누적 → 백엔드 전달용
  contextHistory: [],                  // 클릭한 버튼 텍스트 누적 → 챗봇 맥락용
  lastButtonId: null,                // 가장 마지막 선택 ID
  sessionId: null,                // POST /new-game 에서 수신
  currentLocation: null,                // 현재 location (변경 감지용)
};


// ─────────────────────────────────────────────
//  트리 탐색 헬퍼
// ─────────────────────────────────────────────

function isLeafNode(nodeId) {
  const id = nodeId === 'root' ? '0' : String(nodeId);
  return !window.SCENE_RAW?.[id];
}

function getChildButtons(nodeId) {
  const id = nodeId === 'root' ? '0' : String(nodeId);
  const node = window.SCENE_RAW?.[id];
  if (!node?.choices) return [];
  const usedEntryIds = JSON.parse(sessionStorage.getItem('used_entry_ids') || '[]');
  return node.choices.map(c => ({
    id: c.id,
    text: c.text,
    disabled: (Number(c.id) >= 400 && Number(c.id) <= 411) && usedEntryIds.includes(Number(c.id)),
    clue: c.clue ?? null,
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
//  타이머 (17분) — chatroom과 공유
//  sessionStorage 'timer_start'에 시작 epoch(ms) 저장
//  페이지 전환 후에도 남은 시간 이어받음
// ─────────────────────────────────────────────
const timerEl = document.getElementById('timerDisplay');
const TOTAL_SECONDS = 17 * 60;  // 17분 — 기준값. chat.js는 sessionStorage에서 읽음
sessionStorage.setItem('timer_total_seconds', String(TOTAL_SECONDS));

// 이미 시작된 타이머가 있으면 이어받고, 없으면 새로 시작
let timerStart = Date.now();
sessionStorage.setItem('timer_start', String(timerStart));

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
//  선택지 렌더링
// ─────────────────────────────────────────────
function renderChoices(choices) {
  const sec = document.getElementById('choicesSection');
  sec.innerHTML = '';

  const isVertical = choices.some(c => Number(c.id) >= 500);

  // 500번 이상 노드: NPC 이미지·대사·화자 영역 숨기고 배경만 표시
  if (isVertical) {
    const sceneImg = document.getElementById('sceneImage');
    if (sceneImg) sceneImg.style.display = 'none';
    const dlg = document.getElementById('dialogueText');
    const spkName = document.getElementById('speakerName');
    const spkRole = document.getElementById('speakerRole');
    const spkDot = document.querySelector('.speaker-dot');
    if (dlg) dlg.innerHTML = '';
    if (spkName) spkName.textContent = '';
    if (spkRole) spkRole.textContent = '';
    if (spkDot) spkDot.style.display = 'none';
  }

  if (isVertical) {
    sec.classList.add('vertical');
  } else {
    sec.classList.remove('vertical');
    const spkDot = document.querySelector('.speaker-dot');
    if (spkDot) spkDot.style.display = '';
  }

  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (c.disabled ? ' disabled' : '') + (isVertical ? ' full-width' : '');
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

  // 400번대 버튼 클릭 시 used_entry_ids에 저장 (비활성화 기준)
  if (Number(choice.id) >= 400 && Number(choice.id) <= 411) {
    const usedEntryIds = JSON.parse(sessionStorage.getItem('used_entry_ids') || '[]');
    usedEntryIds.push(Number(choice.id));
    sessionStorage.setItem('used_entry_ids', JSON.stringify(usedEntryIds));
  }

  // 1) 최종 선택지(SCENE_RAW에 없는 노드) → clue 있으면 단서 공개, 없으면 꽝 → chat
  if (isLeafNode(choice.id)) {
    if (choice.clue) {
      const imgMap = await getClueImgMap();
      const imgUrl = imgMap[choice.clue.img] ?? null;
      addClue({ id: choice.clue.img, title: choice.clue.title, img: imgUrl, desc: choice.clue.desc, loop: 1 });
      showClueReveal(choice.clue, imgUrl, () => finalizeAndNavigate());
    } else {
      showPopup(
        { type: 'result', icon: '❌', label: '꽝!', sublabel: '이 단서는 아니야.', duration: 1800 },
        () => finalizeAndNavigate()
      );
    }
    return;
  }

  // 2) after_ 씬 표시 (버튼 클릭 직후 반응 대사)
  GAME_STATE.currentNodeId = String(choice.id);

  if (choice.clue) {
    getClueImgMap().then(imgMap => {
      const imgUrl = imgMap[choice.clue.img] ?? null;
      addClue({ id: choice.clue.img, title: choice.clue.title, img: imgUrl, desc: choice.clue.desc, loop: 1 });
    });
  }

  const nodeId = String(choice.id);
  const nodeScenes = window.SCENE_RAW?.[nodeId]?.scenes ?? [];
  document.getElementById('choicesSection').innerHTML = '';
  playScenes(nodeScenes, nodeId, () => renderChoices(getChildButtons(choice.id)));
}

// ─────────────────────────────────────────────
//  백엔드 API 호출
// ─────────────────────────────────────────────

// 게임 시작 → session_id 발급
async function startNewGame() {
  // opening.js에서 이미 세션이 생성된 경우 재사용 (player_name 덮어쓰기 방지)
  const existingSessionId = sessionStorage.getItem('session_id');
  if (existingSessionId) {
    GAME_STATE.sessionId = existingSessionId;
    console.log('[기존 세션 재사용] session_id:', existingSessionId);
    return;
  }

  // opening을 거치지 않고 직접 진입한 경우 신규 세션 생성
  try {
    const playerName   = sessionStorage.getItem('player_name')   || '플레이어';
    const playerGender = sessionStorage.getItem('player_gender') || '미설정';
    const res = await fetch('/new-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_name: playerName, player_gender: playerGender }),
    });
    const data = await res.json();
    GAME_STATE.sessionId = data.session_id;
    sessionStorage.setItem('session_id', data.session_id);
    console.log('[새 게임] session_id:', data.session_id);
  } catch (e) {
    console.warn('[백엔드 미연결] 오프라인 모드로 실행합니다.', e);
  }
}

// 7단계 완료 → story 확정 → chatroom.html 이동
async function finalizeAndNavigate() {
  // 타이머가 이미 만료됐으면 chat이 아닌 suspect로
  if (getRemainingSeconds() <= 0) {
    sessionStorage.setItem('death_cause', 'timer');
    const currentLoop = parseInt(sessionStorage.getItem('loop_num') || '1', 10);
    sessionStorage.setItem('loop_num', String(currentLoop));
    window.location.href = '/suspect';
    return;
  }

  const session_id = GAME_STATE.sessionId || sessionStorage.getItem('session_id');
  if (session_id) sessionStorage.setItem('session_id', session_id);
  sessionStorage.setItem('last_button_id', String(GAME_STATE.lastButtonId));

  try {
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
  } catch (e) {
    console.warn('[finalizeAndNavigate 실패]', e);
  } finally {
    window.location.href = '/chat';
  }
}

// ─────────────────────────────────────────────
//  배경 이미지 매핑 (scene.bg → Cloudinary URL)
// ─────────────────────────────────────────────
const BG_MAP = {
  'room':            'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550044/bg_room_yn5qfy.png',
  'entrance':        'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550041/bg_entrance_awsngo.png',
  'kitchen':         'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550042/bg_living_sv1swh.png',
  'lounge':          'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550043/bg_lounge_rbdrz9.png',
  'director':        'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550041/bg_director_mw2fno.png',
  'director_broken': 'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550046/office_window_broken_olziuh.png',
  'corridor':        'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550041/bg_corridor_pyjgzz.png',
  'consulting':      'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550040/bg_consulting_cregzw.png',
  'lobby':           'https://res.cloudinary.com/dqu0dyn5k/image/upload/v1778550043/bg_lobby_dbpizb.png',
};

function setSceneBgImage(bg) {
  const url = BG_MAP[bg];
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
function updateScene({ imageUrl, speaker, dialogue, bg, location, place, choices }) {
  if (imageUrl !== undefined) setSceneImage(imageUrl, speaker?.name);

  // speaker가 명시적으로 전달된 경우에만 UI 업데이트
  if (speaker !== undefined) {
    if (speaker) {
      document.getElementById('speakerName').textContent = speaker.name ?? '';
      document.getElementById('speakerRole').textContent = speaker.role ?? '';
      const dot = document.querySelector('.speaker-dot');
      if (dot) dot.style.display = '';
    } else {
      // speaker === null → 이전 씬 정보 초기화
      document.getElementById('speakerName').textContent = '';
      document.getElementById('speakerRole').textContent = '';
      const dot = document.querySelector('.speaker-dot');
      if (dot) dot.style.display = 'none';
      const sceneImg = document.getElementById('sceneImage');
      if (sceneImg) sceneImg.style.display = 'none';
    }
  }

  if (dialogue) {
    document.getElementById('dialogueText').innerHTML = dialogue.replace(/\n/g, '<br>');
  }
  if (bg) setSceneBgImage(bg);
  if (location) document.querySelector('.loc-name').textContent = location;
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
      imageUrl: (scene.npc && window.SCENE_IMAGE_MAP?.[scene.npc]) || DEFAULT_CHARACTER_IMAGES[scene.speaker_name] || null,
      speaker: scene.speaker_name ? { name: scene.speaker_name, role: scene.speaker_role } : null,
      dialogue: scene.dialogue,
      bg: scene.bg,
      location: scene.location,
      place: scene.place,
    });
    if (scene.sound) playEventSound(scene.sound);
    if (scene.popup_img) {
      getClueImgMap().then(imgMap => {
        const url = imgMap[scene.popup_img] ?? null;
        showImgPopup(url, null, scene.popup_link ?? null);
      });
    }
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

// SCENE_RAW의 개별 scene 객체를 화면에 반영
function applySceneData(s, nodeId) {
  const speakerName = s.speaker || '';
  const imageUrl = (s.npc && window.SCENE_IMAGE_MAP?.[s.npc])
    || DEFAULT_CHARACTER_IMAGES[speakerName]
    || null;

  const popupQueue = [];

  if (s.location && s.location !== GAME_STATE.currentLocation) {
    if (GAME_STATE.currentLocation !== null) {
      popupQueue.push(cb => showPopup({ type: 'location', label: s.location, sublabel: s.place, duration: 2000 }, cb));
    }
    GAME_STATE.currentLocation = s.location;
  }

  if (s.event) {
    popupQueue.push(cb => showPopup({ type: 'event', label: s.event, duration: 2000 }, cb));
  }

  runQueue(popupQueue, () => {
    updateScene({
      imageUrl,
      speaker: speakerName ? { name: speakerName, role: s.speaker_role } : null,
      dialogue: s.text,
      bg: s.bg,
      location: s.location,
      place: s.place,
    });
    if (s.sound) playEventSound(s.sound);
  });
}

// scenes 배열을 순서대로 보여주고 마지막 씬 후 onDone 호출
function playScenes(scenes, nodeId, onDone) {
  if (!scenes || scenes.length === 0) { onDone(); return; }

  const choices = getChildButtons(nodeId);
  const isVertical = choices.some(c => Number(c.id) >= 500);
  let idx = 0;

  function makeContinueBtn(sec, callback) {
    const btn = document.createElement('button');
    btn.className = 'continue-btn';
    btn.innerHTML = '<span>▶ &nbsp; 계속</span>';
    btn.addEventListener('click', callback);
    sec.appendChild(btn);
  }

  function advance() {
    const isLast = idx === scenes.length - 1;
    const scene = scenes[idx];
    applySceneData(scene, nodeId);
    idx++;

    const sec = document.getElementById('choicesSection');
    sec.innerHTML = '';

    // 다음 단계 결정 (popup_img 여부와 무관하게 동일 로직)
    const proceed = () => {
      if (!isLast) {
        makeContinueBtn(sec, advance);
      } else if (isVertical) {
        // 마지막 씬 + 500번 이상: 계속 → NPC 숨기고 choices
        makeContinueBtn(sec, onDone);
      } else {
        // 마지막 씬 + 500번 미만: NPC 유지한 채 choices 바로 표시
        renderChoices(choices);
      }
    };

    if (scene.popup_img) {
      // popup_img: 대사 표시 후 3초 뒤 오버레이 팝업, 닫기 버튼 → 다음 단계 진행
      getClueImgMap().then(imgMap => {
        const url = imgMap[scene.popup_img] || null;
        setTimeout(() => showImgPopup(url, proceed, scene.popup_link ?? null), 3000);
      });
    } else {
      proceed();
    }
  }

  advance();
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

function showImgPopup(url, onClose, link = null) {
  const overlay  = document.getElementById('imgPopupOverlay');
  const imgEl    = document.getElementById('imgPopupImg');
  const phEl     = document.getElementById('imgPopupPlaceholder');
  const closeBtn = document.getElementById('imgPopupClose');

  if (url) {
    imgEl.src = url;
    imgEl.style.display = 'block';
    phEl.style.display = 'none';
    if (link) {
      imgEl.style.cursor = 'pointer';
      imgEl.onclick = () => window.open(link, '_blank');
    } else {
      imgEl.style.cursor = '';
      imgEl.onclick = null;
    }
  } else {
    imgEl.src = '';
    imgEl.style.display = 'none';
    phEl.style.display = 'block';
  }

  overlay.classList.add('show');
  closeBtn.onclick = () => {
    overlay.classList.remove('show');
    onClose?.();
  };
}

function showClueReveal(clue, imgUrl, callback) {
  const overlay = document.getElementById('clueRevealOverlay');
  const imgEl   = document.getElementById('clueRevealImg');
  const titleEl = document.getElementById('clueRevealTitle');
  const descEl  = document.getElementById('clueRevealDesc');
  const btn     = document.getElementById('clueRevealBtn');

  imgEl.src = imgUrl || '';
  titleEl.textContent = clue.title || '';
  descEl.textContent  = clue.desc  || '';

  overlay.classList.add('show');

  btn.onclick = () => {
    console.log('[확인 버튼 클릭]');
    overlay.classList.remove('show');
    callback?.();
  };
}

function showPopup(opts, callback) {
  const popup = document.getElementById('eventPopup');
  const iconEl = document.getElementById('eventIcon');
  const labelEl = document.getElementById('eventLabel');
  const subEl = document.getElementById('eventSublabel');

  if (opts.type === 'image') {
    iconEl.textContent = '';
    labelEl.innerHTML = `<img src="${opts.imgUrl}" style="max-width:100%">`;
    if (subEl) { subEl.textContent = ''; subEl.style.display = 'none'; }
  } else {
    iconEl.textContent = opts.icon || '';
    labelEl.textContent = opts.label || '';
    if (opts.type === 'event') playEventSound(opts.label);
    if (subEl) {
      subEl.textContent = opts.sublabel || '';
      subEl.style.display = opts.sublabel ? 'block' : 'none';
    }
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
    window.SCENE_RAW = data.nodes;
    window.SCENE_DATA = data.scenes ?? null;
    console.log('[씬 노드 로드 성공]', Object.keys(window.SCENE_RAW).length, '개');
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
  const startScenes = window.SCENE_RAW?.['0']?.scenes ?? [];
  playScenes(startScenes, '0', () => renderChoices(getChildButtons('root')));
  createDrips();
})();

// 전역 API
window.GameUI = { updateScene, applyScene, renderChoices, setSceneImage };
