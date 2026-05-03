# hateslop4-chatbot-proj

# 엔지니어 파트 필수 구현 요구사항

## 원문
> LLM 모델을 활용하여, 캐릭터의 성격/세계관 등이 담긴 챗봇 구현
> - 항상 캐릭터의 컨셉이 유지된 답변이 잘 나올 수 있도록 최적화 (필수)
>   - RAG와 프롬프트 엔지니어링을 활용 (모델 gpt-4o 사용 가능, 팀당 대략 300~400회)
> - DB내 있는 이미지와 답변 문장의 임베딩 벡터 유사도를 통한 적절한 이미지 출력 (필수)
> - javascript, html을 활용하여 채팅 인터페이스를 동적으로 구현 (필수)

---

## 역할 분담

| | 엔지니어 A | 엔지니어 B |
|---|---|---|
| LLM | Phase 3 (RAG) + chat_node.py 최종 수정 | Phase 4 (이미지 임베딩) |
| 추가 담당 | Phase 6 (백엔드 API) | Phase 5 (채팅 UI) |

**브랜치 규칙**
- 엔지니어 A: `RAG`
- 엔지니어 B: `image`

**chat_node.py 수정 규칙**
- 엔지니어 A, B 각자 Phase 3/4 작업 중 chat_node.py를 직접 수정하지 않는다.
- 각자 수정할 내용을 별도 함수/파일로 작성해 전달한다.
- Phase 3, 4가 모두 완료된 후 엔지니어 A(본인)가 chat_node.py를 한 번에 수정한다.

**병행 가능한 구간**
- Phase 3/4/5/6 전부 동시 진행 가능
- Phase 7(통합 테스트)은 3/4/5/6 완료 후 진행

---

## Phase 3/4 동시 진행 합의사항 ✅

### 공통 상수 (config.py 맨 아래에 추가)

```python
# ── Phase 3: RAG ──────────────────────
CHROMA_PATH = "./llm/vector_store/db"  # Chroma DB가 실제로 저장되는 폴더 경로
STORY_COLLECTION = "story_chunks"      # 스토리 문서 청크를 저장하는 컬렉션 이름
RAG_TOP_K = 3                          # 유저 발화와 유사한 문서를 몇 개까지 가져올지

# ── Phase 4: 이미지 ───────────────────
IMAGE_COLLECTION = "image_captions"    # 이미지 캡션을 저장하는 컬렉션 이름
IMAGE_THRESHOLD = 0.7                  # 이 점수 미만이면 유사한 이미지 없음으로 판단 (0~1)

# ── 공통 ──────────────────────────────
EMBEDDING_MODEL = "text-embedding-3-small"  # Phase 3, 4 둘 다 사용하는 임베딩 모델
```

### 납품 함수 시그니처

```python
# retriever.py — Phase 3 (엔지니어 A)
def retrieve_story_context(user_input: str, loop: int) -> str:
    # 반환값: 프롬프트에 바로 붙일 수 있는 문자열. 없으면 빈 문자열.
    pass

# image_retriever.py — Phase 4 (엔지니어 B)
def retrieve_image(response_text: str) -> str | None:
    # 반환값: image_url 문자열. 유사도 threshold 미만이면 None.
    pass

def build_image_store(image_dir: str) -> None:
    # 이미지 캡션을 임베딩해서 Chroma DB에 저장하는 1회성 함수.
    pass
```

### config.py 수정 규칙
- 엔지니어 A는 `# ── Phase 3: RAG ──` 섹션에만 추가
- 엔지니어 B는 `# ── Phase 4: 이미지 ──` 섹션에만 추가
- 공통 상수는 `# ── 공통 ──` 섹션에 추가 (둘이 협의 후)

### 더미 데이터
- 위치: `llm/vector_store/data/dummy_responses.py`
- 용도: Phase 4 개발 중 실제 LLM 응답 없이 테스트할 때 사용 (엔지니어 B 전용)

---

## 개발 단계별 계획

### Phase 2 — LLM 캐릭터 코어 ✅ 완료 (+ 마무리 작업 필요)

**Phase 2 마무리 작업**
- [x] `cha_seoyeon.py`, `umma.py`, `park_dowon.py` 코드 합치기
- [x] `chat_node.py` stub 함수 3개 → import로 교체
- [x] 프로듀서에게 받은 Few-Shot 샘플 추가 (치키 4개, 김도현 나머지, 차서연/엄마/박도원)
- [ ] 프로듀서 확정 후 `config.py` 수정 (수치, 스토리, 버튼 조합, 사망 트리거)

**프로듀서 제공 자료**
- [x] 치키 Few-Shot 샘플 나머지 4개
- [x] 김도현 Few-Shot 샘플 나머지
- [x] 차서연 Few-Shot 샘플
- [x] 엄마 Few-Shot 샘플
- [x] 박도원 Few-Shot 샘플
- [ ] 사망 트리거 단어 목록
- [ ] 스토리별 버튼 조합
- [ ] 스토리별 NPC 수치
- [ ] NPC 수치 항목 최종 확정

**구현 완료**
- `state.py`, `config.py`, `graph.py`, `runner.py`
- `prompts/base.py`, `prompts/executor.py`, `prompts/kim_dohyun.py`
- `nodes/router.py`, `nodes/loop_node.py`, `nodes/button_node.py`, `nodes/chat_node.py`

---

### Phase 3 — RAG 파이프라인 (엔지니어 A) 🔄 진행 중

**브랜치**: `RAG`

**프로듀서 제공 자료**
- [ ] 캐릭터별 배경 스토리 전문 (텍스트)
- [ ] 게임 세계관 설정 문서 (텍스트)
- [ ] 사건 일지 및 단서 목록 (텍스트)
- [ ] 루프 회차별 공개 가능 정보 범위

**구현 내용**
1. 스토리 문서 청킹 — 캐릭터별 배경, 사건 일지, 단서 분리
2. 임베딩 생성 — 각 청크를 임베딩 벡터로 변환
3. Chroma DB 저장 — 루프 회차·공개 레벨 메타데이터 포함
4. 검색 API 구현 — 유저 발화 → 유사 청크 검색
5. Phase 2 LLM과 연동 테스트

**추가되는 파일**
```
llm/vector_store/
├── build_store.py     ← 벡터 DB 구축 스크립트 (1회성 실행)
├── retriever.py       ← 유사 문서 검색 함수
└── data/
    ├── characters/    ← 캐릭터 배경 문서 (프로듀서 제공)
    └── world/         ← 세계관 설정 문서 (프로듀서 제공)
```

**chat_node.py 수정 내용 (엔지니어 A가 Phase 4 완료 후 반영)**
```python
# generate_npc_response()에 RAG 검색 결과 주입
# 유저 입력 → 벡터 DB 검색 → 관련 문서 추출 → 프롬프트에 주입
```

**수정되는 파일 (chat_node.py 제외)**
- `config.py` — Phase 3 섹션에 상수 추가

---

### Phase 4 — 이미지 유사도 검색 (엔지니어 B) ✅ 완료 (프로듀서 자료 대기 중)

**브랜치**: `image`

**프로듀서 제공 자료**
- [ ] 게임에서 사용할 이미지 파일 전체
- [ ] 각 이미지가 어떤 상황/장면에서 쓰이는지 설명 (캡션 작성 참고용)

**구현 내용**
1. 이미지 DB 구성 — 프로듀서 이미지에 캡션(설명 텍스트) 작성
2. 캡션 임베딩 생성 후 Chroma DB 저장
3. LLM 응답 문장 임베딩 생성
4. 코사인 유사도 계산 → Top-1 이미지 선택 API

**추가된 파일**
```
llm/vector_store/
├── image_retriever.py      ← 이미지 유사도 검색 함수
├── test_image_retriever.py ← 단위 테스트
└── data/
    ├── images/             ← 프로듀서 제공 이미지 + 캡션 (대기 중)
    ├── image_captions.json ← 이미지 캡션 데이터 (초안, 실제 데이터 수령 후 교체)
    └── dummy_responses.py  ← 단위 테스트용 더미 LLM 응답 샘플
```

**완료 작업**
- [x] `config.py` Phase 4 섹션 상수 추가
- [x] `image_retriever.py` 작성 (build_image_store, retrieve_image)
- [x] `image_captions.json` 초안 작성
- [x] `dummy_responses.py` 작성
- [x] `test_image_retriever.py` 작성 및 테스트 확인 (4/5 통과, 1개는 실제 데이터 수령 후 재확인)

**프로듀서 자료 수령 후 할 작업**
- [ ] 실제 이미지 파일 → `data/images/`에 추가
- [ ] `image_captions.json` 실제 데이터로 교체
- [ ] DB 재구축 후 테스트 전체 통과 확인

**chat_node.py 수정 내용 (엔지니어 A가 Phase 3 완료 후 반영)**
```python
# chat_node() 반환값에 image_url 추가
# 현재: (GameState, response)
# 변경: (GameState, response, image_url)
```

**통합 시 수정되는 파일 (엔지니어 A와 함께)**
- `chat_node.py` — retrieve_image 연동 (엔지니어 A 담당)
- `runner.py` — `image_url`을 백엔드로 전달하도록 수정

---

### Phase 5 — 채팅 인터페이스 (엔지니어 B)

**프로듀서 제공 자료**
- [ ] 채팅 UI 디자인 시안 또는 레퍼런스 이미지
- [ ] 사망 연출 화면 디자인 (Loop Reset 화면)
- [ ] NPC별 프로필 이미지

**구현 내용**
- 채팅창 (유저 / NPC 말풍선 구분)
- 텍스트 입력창 + 전송 버튼
- 타이머 표시 (16분 카운트다운, Phase 2 진입 시점부터 시작)
- NPC 전환 UI (김도현 / 차서연 / 엄마 / 박도원)
- 이미지 렌더링 (백엔드에서 image_url 수신 시 말풍선 안에 표시)
- 사망 연출 화면 (Loop Reset 문구 + 붉은 효과)
- 백엔드 API 연동

---

### Phase 6 — 백엔드 API 서버 (엔지니어 A)

**프로듀서 제공 자료**
- 없음 (엔지니어 자체 설계)

**구현 내용**
```
backend/
├── main.py           ← FastAPI 앱 진입점 + CORS 설정
├── api/
│   ├── game.py       ← 게임 관련 엔드포인트
│   └── chat.py       ← 채팅 관련 엔드포인트
├── models/
│   └── schemas.py    ← 요청/응답 데이터 모델 (Pydantic)
└── session/
    └── manager.py    ← 유저별 GameState 관리
```

**주요 엔드포인트**
```
POST /new-game                    ← 게임 시작
GET  /available-buttons           ← 선택 가능한 버튼 목록
POST /button-click                ← 버튼 선택
POST /finalize-buttons            ← 버튼 선택 완료 → Phase 2 전환
POST /chat                        ← NPC와 대화
POST /player-dead                 ← 타이머 만료 사망 처리
POST /new-loop                    ← 루프 리셋
```

---

### Phase 7 — 통합 연동 테스트 (공통)

**프로듀서 제공 자료**
- 없음

**구현 내용**
- LLM + RAG + 이미지 + 백엔드 + 프론트 전체 연결
- 루프 3회 전체 흐름 테스트
- 사망 트리거 3가지 동작 확인
- API 호출 횟수 모니터링 (팀당 300~400회 제한)

---

### Phase 8 — 배포 (공통)

**프로듀서 제공 자료**
- 없음

**구현 내용**
```
requirements.txt    ← 패키지 목록
.env                ← 환경변수 (OPENAI_API_KEY 등)
Dockerfile          ← 컨테이너 빌드 설정
```

**주요 패키지**
```
langchain
langchain-openai
langgraph
fastapi
uvicorn
python-dotenv
chromadb
openai
```

---

## 프로듀서 제공 자료 전체 체크리스트

### Phase 2 관련
- [x] 치키 Few-Shot 샘플 나머지 4개
- [x] 김도현 Few-Shot 샘플 나머지
- [x] 차서연 Few-Shot 샘플
- [x] 엄마 Few-Shot 샘플
- [x] 박도원 Few-Shot 샘플
- [ ] 사망 트리거 단어 목록
- [ ] 스토리별 버튼 조합
- [ ] 스토리별 NPC 수치
- [ ] NPC 수치 항목 최종 확정

### Phase 3 관련
- [ ] 캐릭터별 배경 스토리 전문
- [ ] 게임 세계관 설정 문서
- [ ] 사건 일지 및 단서 목록
- [ ] 루프 회차별 공개 가능 정보 범위

### Phase 4 관련
- [ ] 게임 사용 이미지 파일 전체
- [ ] 이미지별 사용 상황/장면 설명

### Phase 5 관련
- [ ] 채팅 UI 디자인 시안
- [ ] 사망 연출 화면 디자인
- [ ] NPC별 프로필 이미지
