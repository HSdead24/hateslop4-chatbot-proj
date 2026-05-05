/* ──────────── 게임 상태 ──────────── */
const GAME_STATE = {
    timer: { h:0, m:47, s:12 },
    clues: { cur:2, total:7 },
    heartRate: 72,
    trust: 28,
};

const CHOICES = [
    { id:600, iconType:'door', text:'문을 연다', trustDelta:-5 },
    { id:601, iconType:'question', text:'누구냐고 묻는다', trustDelta:-3 },
    { id:602, iconType:'lock', text:'문을 잠근다', trustDelta:+5 },
];

/* ──────────── 초기화 로직 ──────────── */
document.addEventListener('DOMContentLoaded', () => {
    renderChoices(CHOICES);
    createDrips();
    startTimer();
    updateUI();
});

function updateUI() {
    document.getElementById('clueCount').textContent = `${String(GAME_STATE.clues.cur).padStart(2,'0')}/${String(GAME_STATE.clues.total).padStart(2,'0')}`;
    document.getElementById('heartRate').textContent = GAME_STATE.heartRate;
    document.getElementById('trustValue').textContent = `${GAME_STATE.trust}%`;
}

/* ──────────── 타이머 기능 ──────────── */
function startTimer() {
    const timerEl = document.getElementById('timerDisplay');
    let total = GAME_STATE.timer.h*3600 + GAME_STATE.timer.m*60 + GAME_STATE.timer.s;
    
    setInterval(() => {
        if (total <= 0) return;
        total--;
        const h=Math.floor(total/3600), m=Math.floor((total%3600)/60), s=total%60;
        timerEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        if (total < 300) timerEl.classList.add('urgent');
    }, 1000);
}

/* ──────────── 버튼 클릭 이벤트 ──────────── */
function onChoice(choice, btn) {
    // 1. 시각 효과
    document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    
    const fl = document.getElementById('flashOverlay');
    fl.classList.add('on');
    setTimeout(() => fl.classList.remove('on'), 140);

    // 2. 상태 변경 (임시 로직)
    GAME_STATE.trust = Math.max(0, Math.min(100, GAME_STATE.trust + choice.trustDelta));
    updateUI();

    console.log('[서버 전송 준비]', choice.id, choice.text);
    // 나중에 여기에 fetch()를 추가해서 백엔드와 연결합니다.
}

/* (기타 렌더링 보조 함수들 생략 - 원본 로직 유지) */