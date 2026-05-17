// 단서 이미지 맵 로드 (1회)
let CLUE_IMG_MAP = null;
async function getClueImgMap() {
  if (!CLUE_IMG_MAP) {
    const res = await fetch('/frontend/data/clue_image_map.json');
    CLUE_IMG_MAP = await res.json();
  }
  return CLUE_IMG_MAP;
}

// 단서 추가 (중복 방지 포함)
function addClue(clueObj) {
  const clues = JSON.parse(sessionStorage.getItem('clues') || '[]');
  if (!clues.find(c => c.id === clueObj.id)) {
    clues.push(clueObj);
    sessionStorage.setItem('clues', JSON.stringify(clues));
  }
}

// 단서 전체 조회
function getClues() {
  return JSON.parse(sessionStorage.getItem('clues') || '[]');
}
