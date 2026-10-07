# LLM — 죽기 24시간 전에

> LangGraph 기반 루프형 추리 게임 챗봇 엔진.
> 버튼 선택(Phase 1) → NPC 대화(Phase 2) → 루프 리셋의 사이클을 3회 반복하며
> 유저가 범인을 추리하는 게임 흐름을 관리한다.

---

## 폴더 구조

```
llm/
├── graph.py              # LangGraph 그래프 조립 (노드 + 엣지 정의)
├── state.py              # GameState TypedDict 정의, 초기화 헬퍼
├── config.py             # LLM 모델, NPC 초기 수치, 임계값 등 상수
├── runner.py             # 백엔드가 호출하는 공개 API 진입점
├── stories.py            # 스토리별 NPC 확정 수치, 버튼 → 스토리 매핑
├── death_triggers.py     # 사망 트리거 키워드 감지 로직
│
├── nodes/
│   ├── button_node.py    # Phase 1: 버튼 선택 처리, 스토리 확정
│   ├── chat_node.py      # Phase 2: NPC 응답 생성, 사망 감지
│   ├── loop_node.py      # 루프 리셋 처리 (loop_count +1, 상태 초기화)
│   └── router.py         # LangGraph 조건부 엣지 분기 함수
│
├── prompts/
│   ├── base.py           # 공통 프롬프트 유틸 (대화 기록 변환, 수치 → 말투 가이드)
│   ├── executor.py       # 집행자(치키) 시스템 프롬프트 빌더
│   ├── kim_dohyun.py     # 김도현 시스템 프롬프트 빌더
│   ├── cha_seoyeon.py    # 차서연 시스템 프롬프트 빌더
│   ├── umma.py           # 엄마 시스템 프롬프트 빌더
│   └── park_dowon.py     # 박도원 시스템 프롬프트 빌더
│
└── vector_store/
    ├── build_store.py    # RAG DB 구축 스크립트 (최초 1회 또는 문서 변경 시 실행)
    ├── retriever.py      # 유저 발화 → Chroma 유사도 검색
    ├── rag_inject.py     # 검색 결과를 시스템 프롬프트에 삽입
    ├── image_retriever.py # NPC 응답 → 유사 이미지 URL 검색
    ├── test_image_retriever.py
    └── data/
        ├── characters/   # NPC별 배경 문서 (.md)
        ├── world/        # 세계관·루프별 사건 문서 (.md)
        ├── clues/        # 단서 문서 (.md)
        └── image_captions.json  # 이미지 캡션 데이터
```

---

## 게임 흐름

```
게임 시작 (new_game)
     │
     ▼
[Phase 1] 버튼 선택 (button_phase)
  - 유저가 버튼을 클릭할 때마다 select_button() 호출
  - 마지막 버튼 확정 시 finalize_button_selection() 호출
  - BUTTON_STORY_MAP으로 스토리 확정 → npc_stats 덮어씀
     │  stats_locked = True
     ▼
[Phase 2] NPC 대화 (chat_phase)
  - run_chat(state, npc_name, user_input) 호출
  - 사망 트리거 감지 or 대화 턴 초과 → is_dead = True
  - RAG 컨텍스트 주입 후 LLM 응답 생성
  - 이미지 유사도 검색 → image_url 반환
     │
     ├─ is_dead = False → 계속 대화 (game_status: "continue")
     │
     ├─ is_dead = True, loop_count < 3
     │    → 루프 리셋 (game_status: "loop_reset")
     │         loop_count +1, Phase 1로 복귀
     │
     └─ is_dead = True, loop_count == 3
          → 게임 종료 (game_status: "game_over")
```

---

## 주요 모듈 설명

### `runner.py` — 백엔드 API 진입점

백엔드는 이 파일의 함수만 호출한다. LangGraph 내부 구조를 알 필요 없음.

| 함수 | 역할 |
|------|------|
| `new_game(player_name, player_gender)` | 새 게임 시작, 초기 GameState 반환 |
| `get_available_buttons(state, all_buttons)` | 선택 가능한 버튼 목록 반환 (중복 스토리 방지) |
| `select_button(state, button)` | 버튼 클릭 처리, 업데이트된 state 반환 |
| `finalize_button_selection(state)` | 버튼 선택 완료 → Phase 2 전환 |
| `run_chat(state, npc_name, user_input)` | NPC 응답 생성, `(state, response, image_url, game_status)` 반환 |
| `set_player_dead(state)` | 타이머 만료 시 사망 처리 |
| `new_loop(state)` | 루프 리셋 연출 후 다음 루프 state 반환 |

`run_chat` 반환값의 `game_status`:
- `"continue"` : 정상 대화 진행
- `"loop_reset"` : 사망 → 루프 리셋 (연출 후 `new_loop()` 호출)
- `"game_over"` : 3루프 사망 → 게임 종료

---

### `state.py` — GameState

LangGraph 전체 노드가 공유하는 TypedDict. 주요 필드:

| 필드 | 타입 | 설명 |
|------|------|------|
| `loop_count` | int | 현재 루프 회차 (1~3) |
| `phase` | str | `"button"` 또는 `"chat"` |
| `npc_stats` | dict | NPC별 수치 (trust, hostility, guilt 등) |
| `stats_locked` | bool | True이면 npc_stats 고정 (Phase 2 진입 후) |
| `messages` | dict | NPC별 대화 기록 |
| `current_npc` | str | 현재 대화 중인 NPC 이름 |
| `is_dead` | bool | 사망 여부 |
| `current_story` | str | 확정된 스토리 ID |
| `used_stories` | list | 루프 간 중복 방지용 진행 스토리 목록 |
| `first_button` | int | 첫 번째 버튼 ID (RAG 필터용: 100=Sheet1, 101=Sheet2) |
| `context` | list | 선택한 버튼 텍스트 누적 (시스템 프롬프트에 오늘의 배경으로 주입) |

---

### `config.py` — 설정 상수

| 상수 | 기본값 | 설명 |
|------|--------|------|
| `LLM_MODEL_DEFAULT` | `gpt-6-luna` | 1~2루프 사용 모델 |
| `LLM_MODEL_HEAVY` | `gpt-6-luna` | 마지막 루프 사용 모델 (추론 강도만 높임) |
| `LLM_REASONING_EFFORT_DEFAULT` / `_HEAVY` | `none` / `medium` | 추론 강도 |
| `LLM_MAX_TOKENS_DEFAULT` / `_HEAVY` | `800` / `4000` | 응답 최대 토큰 (추론 토큰 포함) |
| `MAX_CHAT_TURNS` | `20` | NPC별 대화 턴 초과 시 자동 사망 |
| `SESSION_TIMEOUT` | `960` | 타이머 제한 (초, 프론트 타이머) |
| `MESSAGE_SUMMARY_THRESHOLD` | `10` | 대화 기록 자동 요약 기준 턴 수 |
| `RAG_TOP_K` | `3` | RAG 검색 결과 수 |
| `FLESHY_THRESHOLD` | `67` | 범인 판정 기준 수치 |

---

### `stories.py` — 스토리 수치 & 버튼 매핑

- `STORIES` : 스토리 ID → NPC별 확정 수치 세트 (총 85개 스토리)
- `BUTTON_STORY_MAP` : 마지막 버튼 ID(int) → 스토리 ID 매핑
  - 버튼 ID 백의 자리 = 선택 화면 번호 (6xx = Sheet1, 7xx = Sheet2)
- `Fleshy` 수치가 `FLESHY_THRESHOLD(67)` 이상인 NPC가 범인

수치 수정 시 → `STORIES` 딕셔너리 해당 항목 수정  
버튼 조합 수정 시 → `BUTTON_STORY_MAP` 수정

---

### NPC 수치 시스템

각 NPC는 수치를 가지며, `config.py`의 `THRESHOLDS`를 기준으로 말투가 분기된다.

| 수치 | 대상 NPC | 설명 |
|------|----------|------|
| `trust` | 전체 | 유저 신뢰도 (높을수록 친근) |
| `hostility` | 김도현 | 적대감 (높을수록 공격적) |
| `suspicion` | 차서연 | 의심 (높을수록 회피) |
| `caution` | 차서연 | 경계심 |
| `guilt` | 엄마 | 죄책감 (높을수록 감정 노출) |
| `grief` | 박도원 | 슬픔/상실감 |
| `composure` | 전체 | 감정 억제력 (낮을수록 말실수) |
| `Fleshy` | 전체 | 범인 판정 수치 (최고값 NPC가 범인) |

---

## RAG 파이프라인

```
[문서 준비]
data/characters/{캐릭터명}.md          → 전 루프 공개
data/characters/{캐릭터명}_loop{N}.md  → 루프 N 이상에서만 검색 노출
data/world/{파일명}.md                 → 전 루프 공개 세계관
data/clues/{단서명}_route{ID}.md       → 특정 route(버튼 선택)에서만 노출
        ↓
[build_store.py] 문서 청킹 + OpenAI 임베딩 → Chroma DB 저장
        ↓
[chat_node.py] 유저 입력 수신
        ↓
[retriever.py] 유저 발화 임베딩 → Chroma 유사도 검색
               (loop_level, route, character 메타데이터 필터 적용)
        ↓
[rag_inject.py] 검색 결과를 시스템 프롬프트 끝에 삽입
        ↓
[LLM] RAG 컨텍스트가 주입된 프롬프트로 NPC 응답 생성
```

### DB 구축 실행

```bash
# 최초 구축 또는 문서 변경 시
python -m llm.vector_store.build_store

# 기존 DB 삭제 후 재구축
python -m llm.vector_store.build_store --reset
```

---

## 이미지 유사도 검색

`image_captions.json`에 이미지 캡션(설명 텍스트)을 저장해두고,
NPC 응답 문장과 코사인 유사도를 계산해 가장 유사한 이미지 URL을 반환한다.
`IMAGE_THRESHOLD(0.7)` 미만이면 None 반환.

---

## 환경변수 (.env)

```
OPENAI_API_KEY=sk-xxxx
```

---

## 개발·배포 모델 전략

| 루프 | 모델 | 이유 |
|------|------|------|
| 1~2루프 | `gpt-6-luna` (추론 `none`) | 가장 효율적인 모델, 빠른 응답 ($0.10 / $0.50 per 1M) |
| 3루프 (마지막) | `gpt-6-luna` (추론 `medium`) | 진실 접근 장면의 규칙 준수. sol 대비 빠르고 약 1/19 비용 |
| 임베딩 | `text-embedding-3-small` | RAG + 이미지 검색 공통 |
