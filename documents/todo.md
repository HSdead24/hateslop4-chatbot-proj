# 이후 개발 TODO (Final 점검 후)
 
### 구현 예정
 
| 항목 | 상태 | 비고 |
|---|---|---|
| 버튼룸 & 채팅룸 UI/UX 수정 | ✅ 완료 | Figma 시안 기준, 추가된 기능 포함 |
| 튜토리얼 / 코치 마크 | ⬜ 미구현 | 최초 1회만 등장 |
| NPC 2명 확정 & 단서 공개 → 채팅 흐름 구현 | ✅ 완료 | 장소별 채팅방 인물 연결, 단서 탭 구현 |
| 단서 페이지 | ✅ 완료 | 채팅룸 단서 탭으로 구현 (버튼룸-채팅룸 연결) |
 
### 기획 미확정
 
| 항목 | 상태 | 비고 |
|---|---|---|
| 단서 범위 정의 | ✅ 확정 | 채팅에서 획득 가능한 단서 수 = 루트별 트리거 단서 총합 |
 
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
