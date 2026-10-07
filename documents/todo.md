# 이후 개발 TODO (Final 점검 후)
 
### 구현 예정
 
| 항목 | 상태 | 비고 |
|---|---|---|
| 버튼룸 & 채팅룸 UI/UX 수정 | ✅ 완료 | Figma 시안 기준, 추가된 기능 포함 |
| 튜토리얼 / 코치 마크 | ⬜ 미구현 | 최초 1회만 등장 |
| NPC 2명 확정 & 단서 공개 → 채팅 흐름 구현 | ✅ 완료 | 장소별 채팅방 인물 연결, 단서 탭 구현 |
| 단서 페이지 | ✅ 완료 | 채팅룸 단서 탭으로 구현 (버튼룸-채팅룸 연결) |
| iPhone 실기기 확인 | ⬜ 확인 필요 | 오프닝 정렬, 페이지 스크롤, 키보드, 음악 재생 팝업, 엔딩 음원 (PR #118~#119 배포 후) |
| 범인 지목 화면 문구 정리 | ⬜ 미구현 | `suspect.html`, 쓰이지 않는 SCENE 6("모든 루프가 끝났다") 포함 |
| README 스크린샷 교체 | ⬜ 미구현 | 현재 이미지에 수정 전 문구("신경과 의사", "32세")가 보임 |
| 엔딩 음원 용량 줄이기 | ⬜ 검토 | `ending-static.mp3` 9.6MB(256kbps) → 128kbps면 약 4.8MB |
| 백엔드 테스트 4개 실패 | ⬜ 미해결 | TestAvailableButtons, TestRecordButton, TestFinalize (2026-10-07 작업 전부터 실패) |
 
### 기획 미확정
 
| 항목 | 상태 | 비고 |
|---|---|---|
| 단서 범위 정의 | ✅ 확정 | 채팅에서 획득 가능한 단서 수 = 루트별 트리거 단서 총합 |
| 오프닝 치키 대사 수위 | ⬜ 논의 필요 | "정작 네 마음속은 한 번도 안 들여다봤지?"가 `치키.md` 금지 항목(유저의 과거 죄 암시 금지)과 겹칠 수 있음 |
| 엄마의 "하나뿐인 아들" 표현 | ✅ 해결 | 세계관 문서의 주인공 성별 표현을 중립으로 수정 ("하나뿐인 자식", "전 연인" 등) + 성별 '기타' 추가 |
 
---
 
### Phase 15 — 버튼룸 시나리오 대공사 ✅ 완료
 
**배경**
기존 버튼룸 시나리오(7단계 구조)를 새 시나리오(엑셀 Sheet1 기준)로 전면 교체.
새 시나리오는 분기 구조, 씬 텍스트, NPC 등장 방식이 기존과 크게 달라짐.
 
**새 시나리오 분기 구조 요약**
```
root
├─ 100 (집에 있는다)
│    ├─ 200 (나영 기일 알고 있다)
│    │    ├─ 300 (택배 받으러 나간다)  →  400 (USB 받기) / 401 (USB 거절)
│    │    └─ 301 (나가지 않는다)       →  400 (USB 받기) / 401 (USB 거절)
│    └─ 201 (나영 기일 모른다)
│         ├─ 300 (택배 받으러 나간다)  →  402 (택배 열기) / 403 (택배 안 열기)
│         └─ 301 (나가지 않는다)       →  402 (택배 열기) / 403 (택배 안 열기)
└─ 101 (출근한다) ← Sheet2 (미완성, 추후 작업)
```
- **400번대 선택에서 채팅룸 대화 NPC 2명 확정**
- **500번대: 단서 선택 단계** (NPC 확정 이후)
**수정 대상 파일**
 
| 파일 | 수정 내용 | 우선순위 |
|---|---|---|
| `frontend/data/scenes.json` | root~400번대 씬 데이터 전면 교체 | 🔴 높음 |
| `frontend/js/button.js` (`BUTTON_TREE`) | root~400번대 분기 구조 전면 교체 | 🔴 높음 |
| `llm/stories.py` (`STORIES` + `BUTTON_STORY_MAP`) | 400번대 결과값 기준 NPC 확정 매핑 갱신 | 🔴 높음 |
| `frontend/data/scene_image_map.json` | 새 씬 키 추가 (build_scene_image_map.py 재실행으로 자동 생성) | 🟡 중간 |
| `frontend/build_scene_image_map.py` | scenes.json 수정 후 재실행 필요 | 🟡 중간 |
 
**작업 순서**
1. `scenes.json` — root~400번대 씬 데이터 작성
2. `button.js` `BUTTON_TREE` — root~400번대 분기 구조 교체
3. `stories.py` — 400번대 NPC 확정 매핑 갱신
4. `build_scene_image_map.py` 재실행 → `scene_image_map.json` 자동 갱신
5. *(이후)* 500번대 단서 선택 + 채팅룸 진입 로직 설계 및 구현
**완료 작업**
- [x] `scenes.json` root~400번대 교체
- [x] `button.js` `BUTTON_TREE` root~400번대 교체
- [x] `stories.py` NPC 확정 매핑 갱신 (loop1 101번 오류 수정 포함)
- [x] `scene_image_map.json` 재생성
- [x] 500번대 단서 선택 로직 구현
- [x] 채팅룸 NPC 2명 확정 흐름 연동


### Phase 16 — 단서(Clue) 시스템 구축 ✅ 완료

**브랜치**: `frontend` → `main` 머지 완료 (PR #92~#97)

**구현 내용**
- 버튼룸에서 씬 이동 시 해당 씬에 연결된 단서를 `sessionStorage`에 자동 저장
- 채팅룸 단서 탭에서 버튼룸에서 수집한 단서 + 채팅 트리거 단서를 통합 표시
- 단서별 이미지 Cloudinary URL 매핑 (`clue_image_map.json`) — 총 9종

**추가된 파일**
```
frontend/
├── js/clue.js                 ← 단서 로드/저장 유틸리티 (중복 방지 포함)
└── data/clue_image_map.json   ← 단서 ID → Cloudinary 이미지 URL 매핑
```

**완료 작업**
- [x] `clue.js` 작성 — `addClueToStorage()`, `getClues()`, `getClueImgMap()` 구현
- [x] `clue_image_map.json` — 단서 이미지 9종 Cloudinary 업로드 및 매핑
- [x] `button.js` — 씬 이동 시 단서 자동 저장 로직 추가
- [x] `chat.js` — 채팅룸 단서 탭에서 `sessionStorage` 단서 로드 및 렌더링
- [x] `triggers.json` — 채팅룸 단서 트리거 데이터 갱신

---

### Phase 17 — 버튼룸 UX 개선 ✅ 완료

**브랜치**: `frontend`, `npc_stat`, `button_npc_img` → `main` 머지 완료 (PR #95~#97)

**구현 내용**
- 인스타그램 QR 팝업: 버튼룸에서 특정 씬 도달 시 인스타 팝업 표시 + 터치 시 주소 이동
- 버튼 자동 비활성화 개선: 자식 버튼 2개가 모두 이미 선택된 경우 부모 노드도 비활성화
- 버튼룸 UI/UX 전면 개선 (`buttonroom.css`)
- 버튼 ID별 배경·NPC 이미지 연결 강화 및 이미지 크기 고정
- 최종 스탯 삽입 및 스토리 매핑 로직 정리 (`stories.py`, `button_node.py`, `state.py`, `game.py`)

**완료 작업**
- [x] `button.js` — 인스타 팝업 로직 + 자식 모두 선택 시 부모 비활성화
- [x] `buttonroom.css` — UI/UX 전면 개선 및 이미지 크기 고정
- [x] `llm/stories.py` — 최종 스탯 삽입 및 스토리 매핑 갱신
- [x] `llm/nodes/button_node.py` / `llm/state.py` — 버튼 노드 및 상태 로직 정리
- [x] `backend/api/game.py` / `backend/models/schemas.py` — 스키마 및 게임 API 갱신

---

### Phase 18 — 채팅룸 UX 개선 ✅ 완료

**브랜치**: `frontend`, `npc_stat` → `main` 머지 완료 (PR #98~#99)

**구현 내용**
- 장소에 따른 채팅방 인물 연결: 버튼룸에서 선택한 장소(씬)를 기반으로 채팅방에 표시될 NPC 자동 결정
- 채팅 상단바 단서 개수 표시: 채팅에서 획득 가능한 단서의 총 개수로 표기 (`/clue-triggers` 백엔드 연동)
- 채팅룸 NPC 프로필 이미지 경로 수정

**완료 작업**
- [x] `chat.js` / `chatroom.html` — 장소별 NPC 연결 로직 및 단서 개수 표시
- [x] `button.js` — 선택 장소 정보 `sessionStorage` 전달
- [x] `backend/api/triggers.py` — 채팅에서 획득 가능한 단서 총합 반환 로직 추가
- [x] `chatroom.css` — 프로필 이미지 및 단서 탭 스타일 수정

---

> Phase 19~22의 자세한 결정 배경은 [worklog-2026-10-07.md](worklog-2026-10-07.md)를 참고하세요.

### Phase 19 — 스토리 설정 정합성 ✅ 완료

**브랜치**: `npc_stat` → `main` 머지 완료 (PR #113)

**구현 내용**
- 동생(나영) 기일 0902 → 0903: 엄마의 "내일이 기일"과 회귀 날짜(0902)를 맞춤. 금고 비밀번호·박주원 일기 날짜도 0903으로 변경
- 차서연 직업 "신경과 의사" → "정신건강의학과 의사" 일괄 수정, NPC 나이를 세계관에 맞춤 (차서연 34, 김도현 36, 박도원 64)
- 성별 호칭 버그 수정: "남성" 입력이 "딸"/"언니"로 처리되던 문제

**완료 작업**
- [x] `chat.js`, `triggers.json`, 단서 문서, `세계관.md` — 0903 반영 + 벡터스토어 재빌드
- [x] `cha_seoyeon.py`, `kim_dohyun.py`, `scenes.json`, `chat.js`, `suspect.js`, `chatroom.html` — 직업·나이 정리
- [x] `llm/prompts/base.py` — `get_child_term()` / `get_sibling_term()`이 "남"으로 시작하면 남성으로 판단

---

### Phase 20 — 오프닝·엔딩 연출 개편 ✅ 완료

**브랜치**: `npc_stat` → `main` 머지 완료 (PR #113, #115, #120)

**구현 내용**
- 컨셉: 나레이션 = 게임 시스템, 치키 = 시스템을 운영하는 관리자(실제로는 집행자)
- 오프닝: 2인칭 존댓말 시스템 나레이션 + 마지막에 치키 등장, PROFILE/SUSPECTS 카드 정리, "기회는 총 3번" 추가
- 엔딩: SYSTEM 판정 → 사건 기록 → 형벌 집행 통지서 → 남겨진 사람들의 회복 → 기억 삭제 → LOOP 1. 가해자는 수감번호 `0903-4127`로만 표기

**완료 작업**
- [x] `opening.js` / `opening.html` / `opening.css` — 나레이션·카드·치키 등장 블록
- [x] `ending.js` / `ending.html` / `ending.css` — 시스템 블록, 통지서 디자인, 깨지는 피해자 규모 연출, 수감번호

---

### Phase 21 — 사운드 · 포기하기 ✅ 완료

**브랜치**: `npc_stat` → `main` 머지 완료 (PR #116, #118)

**구현 내용**
- 엔딩 배경음(`ending-static.mp3`, 5분): 끝나기 3초 전 재시작 팝업 → 자동으로 시작 페이지. 자동 재생이 막히면 터치 팝업 + 30초 후 자동 시작
- 채팅룸 BGM: `chat-bgm.mp3` 한 곡 반복, 볼륨 100%. 자동 재생이 막히면 "음악을 재생하세요" 팝업
- 채팅룸 포기하기 버튼(홈 / 엔딩) + "포기하시겠습니까?" 팝업. 팝업 중 타이머 정지

**완료 작업**
- [x] `ending.js` — 배경음, 재시작 팝업, 터치 팝업, 5분 대체 타이머
- [x] `chat.js` / `chatroom.html` / `chatroom.css` — BGM 교체, 음악 재생 팝업, 포기하기 버튼, `pauseGameTimer()` / `resumeGameTimer()`

---

### Phase 22 — 모바일 레이아웃 · iPhone 대응 ✅ 완료 (실기기 확인 필요)

**브랜치**: `npc_stat` → `main` 머지 완료 (PR #117~#119)

**구현 내용**
- 노트북 대응 방식 확정: 가운데 모바일 화면 고정형(폭 430px)
- 게임 화면 밖 효과 레이어 정리, `position: fixed` → 게임 화면 안 `absolute`, 폭 430px 통일
- iPhone Safari: 보내기 버튼 잘림(`min-width: 0`), 상태바 겹침(`viewport-fit=cover` 제거), 페이지 스크롤(`100vh` 제거), 키보드 대응(`visualViewport`)
- 버튼룸 이미지를 대사 패널 위 공간의 세로 가운데에 배치 + 위아래 그라데이션
- 새 게임 시작 / 엔딩 재시작 시 이전 기록(sessionStorage) 전부 삭제

**완료 작업**
- [x] `opening.*`, `buttonroom.*`, `chatroom.*`, `ending.*`, `suspect.js` — 레이아웃 정리
- [x] `button.js` — 대사 패널 높이 측정(`--panel-h`)
- [x] `chat.js` — 키보드 대응
- [ ] iPhone 실기기 확인 (위 '구현 예정' 표 참고)

---

### 문서 — README 재작성 ✅ 완료

**브랜치**: `npc_stat` → `main` 머지 완료 (PR #114)

- [x] `README.md` — 배포된 서비스 소개 문서로 재작성 (스토리, 플레이 방식, 기능, 기술 스택, 스크린샷, 팀)
- [x] 기존 README → `documents/development-notes.md` / `documents/todo.md`, README2 → `documents/engineer-presentation.md`

---

### Phase 23 — 닉네임 · 성별 처리 ✅ 완료

**브랜치**: `npc_stat` (커밋 `066c6d0`, PR 전)

**구현 내용**
- 닉네임은 완성형 한글만 허용, 입력칸 아래 안내 문구 표시
- 호칭 개선: 성 자르기 규칙(세 글자, 두 글자 성), 받침에 따른 호격 조사('아'/'야') 자동 처리
- 성별 '기타' 추가: 중립 호칭("우리 애", 나영은 이름으로 부름), NPC 4명 + 치키 프롬프트에 성별 중립 지침
- 세계관 문서의 주인공 성별 표현 중립화 + 벡터스토어 재빌드

**완료 작업**
- [x] `opening.html` / `opening.css` / `opening.js` — 한글 검증, 안내 문구, 성별 버튼 3칸
- [x] `llm/prompts/base.py` — `get_first_name`, `get_call_name`, `get_child_term`, `get_sibling_term`, `get_gender_guidance`
- [x] `umma.py` / `cha_seoyeon.py` — `{call_name}` 적용 / `executor.py` — 성별 중립 지침
- [x] `세계관.md` / `loop3.md` — 성별 중립 표현 + 벡터스토어 재빌드

---

### Phase 24 — LLM 모델 교체 · 프롬프트 개선 ✅ 완료

**브랜치**: `npc_stat` (PR 전)

> 자세한 내용: [llm-model-selection.md](llm-model-selection.md), [prompt-engineering.md](prompt-engineering.md)

**구현 내용**
- 모델: `gpt-4o-mini` / `gpt-4o`(legacy) → `gpt-6-luna` (1~2루프 추론 `none`, 3루프 추론 `medium`)
- 프롬프트: OpenAI 공식 가이드 구조(Identity → Instructions → Examples → Context), few-shot XML 변환, 예시 7개로 정리 + 루프 표시
- 조사 자동 보정, 엄마 호칭 정리, RAG 참고 정보 위치 변경

**완료 작업**
- [x] `llm/config.py` / `llm/nodes/chat_node.py` — 모델·추론 강도·토큰 한도
- [x] `llm/prompts/base.py` — 프롬프트 구조, `few_shot_to_xml()`, `fix_josa()`
- [x] `llm/prompts/{umma,cha_seoyeon,kim_dohyun,park_dowon}.py` — few-shot 정리, 원본은 `few_shot_archive/`
- [x] `llm/vector_store/rag_inject.py` — `<reference_story>`로 Context 끝에 추가
- [x] `llm/prompts/executor.py` — 미사용 파일임을 주석으로 명시
- [ ] 실제 플레이로 루프별 말투·정보 노출·응답 속도 확인
