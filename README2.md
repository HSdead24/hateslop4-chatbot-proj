# 엔지니어 파트 발표 — 죽기 24시간 전에

---

## 목차

1. [전체 구조](#1-전체-구조)
2. [시스템 프롬프트 : Few-shot 프롬프팅](#2-시스템-프롬프트--few-shot-프롬프팅)
3. [RAG — 문서 검색](#3-rag--문서-검색)
4. [RAG — 이미지 검색 (코사인 유사도)](#4-rag--이미지-검색-코사인-유사도)

---

## 1. 전체 구조

### 1-1. 게임 플로우

```
오프닝 (이름·성별 입력)
      ↓
버튼 선택 화면  ×7단계
      ↓
  /finalize  →  story_id 확정 + NPC 수치 로드
      ↓
채팅 화면  (최대 3루프)
  ├── 유저 메시지 입력
  ├── [LLM] 시스템 프롬프트 조립
  │       ├── 기본 성격 + Few-Shot
  │       ├── NPC 수치 → 말투 지침
  │       ├── 루프 제한 지침
  │       └── RAG 블록 주입 (문서 검색)
  ├── GPT 응답 생성
  ├── [RAG] 이미지 검색 (코사인 유사도)
  └── 응답 + 이미지 URL 반환
      ↓
용의자 선택 → 엔딩 / 루프 리셋
```

### 1-2. 기술 스택

| 레이어 | 기술 |
|---|---|
| LLM | OpenAI GPT-3.5-turbo (기본) / GPT-4o (마지막 루프) |
| 임베딩 | `text-embedding-3-small` |
| 벡터 DB | ChromaDB (Persistent, cosine space) |
| 오케스트레이션 | LangChain + LangGraph |
| 백엔드 API | FastAPI + Uvicorn |
| 프론트엔드 | Vanilla JS + HTML/CSS |
| 배포 | Render.com (Docker) |

### 1-3. 디렉토리 구조

```
hateslop4-chatbot-proj/
├── llm/
│   ├── config.py              ← 모델·수치·RAG 상수 통합 관리
│   ├── state.py               ← GameState (TypedDict)
│   ├── graph.py               ← LangGraph 노드 연결
│   ├── stories.py             ← STORIES + BUTTON_STORY_MAP (85개)
│   ├── nodes/
│   │   ├── chat_node.py       ← LLM 호출 + RAG 주입 + 이미지 검색
│   │   ├── button_node.py     ← 버튼 기록 + 비활성화 계산
│   │   └── loop_node.py       ← 루프 리셋
│   ├── prompts/
│   │   ├── base.py            ← 수치→말투 변환, 루프 제한, SystemMessage 조립
│   │   ├── kim_dohyun.py      ← 김도현 성격 + Few-Shot
│   │   ├── cha_seoyeon.py     ← 차서연 성격 + Few-Shot
│   │   ├── umma.py            ← 엄마 성격 + Few-Shot
│   │   ├── park_dowon.py      ← 박도원 성격 + Few-Shot
│   │   └── executor.py        ← 치키 성격 + Few-Shot
│   └── vector_store/
│       ├── build_store.py     ← DB 구축 스크립트 (1회성)
│       ├── retriever.py       ← 문서 RAG 검색
│       ├── rag_inject.py      ← RAG 블록 → 시스템 프롬프트 주입
│       ├── image_retriever.py ← 이미지 RAG 검색 (코사인 유사도)
│       └── data/
│           ├── characters/    ← 캐릭터별 배경 문서 (.md)
│           ├── world/         ← 세계관·루프별 공개 범위 (.md)
│           ├── clues/         ← 단서 문서 (.md)
│           └── images/        ← NPC 표정 이미지 (NPC별 폴더)
├── backend/                   ← FastAPI 서버
└── frontend/                  ← HTML·CSS·JS
```

### 1-4. 채팅 1회 처리 흐름 (chat_node.py)

```
유저 입력
   │
   ├─ ① 사망 트리거 감지 (death_triggers.py)
   │
   ├─ ② 루프에 따라 LLM 모델 선택
   │       루프 1·2  →  GPT-3.5-turbo
   │       루프 3    →  GPT-4o
   │
   ├─ ③ NPC별 시스템 프롬프트 조립 (prompts/*.py)
   │
   ├─ ④ RAG 블록 주입 (rag_inject.py)
   │       유저 입력 임베딩 → Chroma 검색 → 프롬프트 삽입
   │
   ├─ ⑤ 슬라이딩 윈도우 + 대화 요약
   │       최근 6턴만 유지 / 10턴 초과 시 LLM 요약
   │
   ├─ ⑥ GPT 호출 → NPC 응답 생성
   │
   └─ ⑦ 이미지 검색 (image_retriever.py)
           응답 텍스트 임베딩 → Chroma 검색 → image_url 반환
```

---

## 2. 시스템 프롬프트 : Few-shot 프롬프팅

### 2-1. 시스템 프롬프트 구조

NPC 1명당 아래 블록들이 순서대로 조립된다.

```
① 응답 규칙          ← 화자 이름 출력 금지, '유저' 단어 사용 금지, 길이 제한 등
② 역할 범위 규칙     ← 게임 외부 질문 무시, Few-Shot 문장 그대로 출력 금지
③ 루프 제한 지침     ← 루프별 공개/비공개 정보 범위 (아래 2-3 참고)
④ [RAG 블록]         ← 검색된 관련 문서 (동적 삽입 — 아래 3장 참고)
⑤ 기본 성격          ← 캐릭터 고유 성격, 말투 규칙 (각 prompts/*.py에 정의)
⑥ 현재 수치 상태     ← trust / hostility / composure 등 (버튼 선택으로 확정)
⑦ 수치 기반 말투 지침 ← 수치 범위에 따라 동적 생성 (아래 2-4 참고)
⑧ 게임 상태          ← 루프 회차, 플레이어 이름·성별, 보유 단서
⑨ Few-Shot 예시       ← 상황별 대화 예시 7종 × 5~7대화 (아래 2-5 참고)
```

> **설계 포인트**: RAG 블록은 `=== 기본 성격` 섹션 바로 앞에 삽입된다.  
> Few-Shot이 맨 끝에 위치해 LLM의 **recency bias** (최근 정보를 더 따르는 경향)를 활용한다.

### 2-2. 캐릭터별 프롬프트 분리

| 파일 | 캐릭터 | 핵심 성격 |
|---|---|---|
| `kim_dohyun.py` | 김도현 | 조용한 분노, 복수심, 존댓말↔반말 혼용 |
| `cha_seoyeon.py` | 차서연 | 겉으로 친절, 내면 의심·경계 |
| `umma.py` | 엄마 | 과보호, 죄책감, 감정 폭발 |
| `park_dowon.py` | 박도원 | 상실감, 침착하지만 흔들리는 |
| `executor.py` | 치키 | 발랄·귀여움 뒤의 집행자 |

각 캐릭터 파일은 `build_system_prompt()` (base.py)를 호출하며,  
`{player_name}`, `{first_name}`, `{child_term}`, `{sibling_term}` 같은 플레이스홀더를 사용해 **플레이어 정보를 성격 설명에 자동 주입**한다.

### 2-3. 루프별 정보 공개 제한

캐릭터가 루프 진행 정도에 따라 스스로 다른 정도의 진실을 드러내도록  
`_LOOP_RESTRICTION` 블록이 매 응답마다 프롬프트에 포함된다.

| 루프 | 공개 범위 | 차단 내용 |
|---|---|---|
| 루프 1 | 업무 대화, 가벼운 이름 언급 | 박주원과 친밀 관계, 사무실 수색, 약물 조작 |
| 루프 2 | 위에 추가 — 친밀 관계 암시 | 사무실 수색 인정, 약물 조작 직접 언급 |
| 루프 3 | 위에 추가 — 수색 인정, 직접 압박 | 약물 조작 사실을 먼저 직접 말하는 것 |

```python
# base.py — 루프 지침 자동 선택
def _get_loop_restriction(loop_count: int) -> str:
    return _LOOP_RESTRICTION.get(loop_count, _LOOP_RESTRICTION_DEFAULT)
```

### 2-4. NPC 수치 → 말투 지침 자동 생성

버튼 선택으로 확정된 NPC 수치가 프롬프트의 말투 지침으로 자동 변환된다.

```
수치 예시 (김도현, 특정 스토리)
  trust     : 20/100  →  "단답 위주, 질문을 회피, 의심하며 되물음"
  hostility : 70/100  →  (임계값 미달이므로 지침 없음 — 중간 범위)
  composure : 80/100  →  "감정을 잘 숨기고 논리적으로 말함"
```

```python
# base.py — stats_to_tone_guidance()
# 수치별 high/low 임계값(config.py THRESHOLDS)과 비교해 지침 문자열 자동 생성
if key == "trust":
    if value >= high:   # 신뢰도 높음 → 솔직·부드러운 말투
    elif value <= low:  # 신뢰도 낮음 → 단답·회피 말투
```

수치 항목 : `trust`, `hostility`, `suspicion`, `caution`, `composure`, `guilt`, `grief`  
`Fleshy` 수치는 범인 판정 전용으로 말투 변환 대상에서 제외.

### 2-5. Few-Shot 프롬프팅 설계

각 캐릭터마다 **7개 상황 × 5~7개 대화**의 Few-Shot 예시가 정의된다.

```
[상황 1] 첫 등장 — 상담받으러 온 척 (정체 숨김)
[상황 2] 이틀 전 폭행 시도를 지적받음
[상황 3] 김하윤에 대해 처음 질문받음
[상황 4] 김하윤에 대해 3회 이상 반복 질문 → 분노 폭발
[상황 5] "왜 화났냐" 반복 → 김하윤과의 관계(동생) 드러남
[상황 6] 게임 외부 지식 질문 (GPT 미래, 맛집 등) → 무시
[상황 7] 치키 언급 → 냉소적 반응
```

**Few-Shot 주의사항 (프롬프트에 명시)**:
- `유저:`, `김도현:` 같은 화자 표시는 대본 형식일 뿐, 실제 응답 생성 시 화자 이름 출력 금지
- 예시 문장을 그대로 복사하지 말고 말투·어조만 참고
- 상황 이해를 위한 `{player_name}` 플레이스홀더가 캐릭터 성격 설명에도 동일하게 치환됨

---

## 3. RAG — 문서 검색

### 3-1. 목적

NPC가 게임 세계관·캐릭터 배경·단서 정보를 **정확하게 알고 있으면서도**  
루프 진행에 따라 **적절히 숨기거나 공개**하도록 하기 위해 RAG를 사용한다.  
시스템 프롬프트에 모든 정보를 넣으면 토큰이 과다하고 루프 제한이 어렵기 때문이다.

### 3-2. 문서 종류 및 파일 구조

```
llm/vector_store/data/
├── world/
│   ├── 세계관.md              ← 게임 전제·진실 구조·NPC 관계 (전 루프 공개)
│   ├── loop1.md               ← 루프 1 공개 가능 정보 범위
│   ├── loop2.md               ← 루프 2 공개 가능 정보 범위
│   └── loop3.md               ← 루프 3 공개 가능 정보 범위
├── characters/
│   ├── 김도현.md              ← 루프 1부터 공개
│   ├── 김도현_loop2.md        ← 루프 2 이상에서만 공개
│   ├── 박도원.md / _loop2.md / _loop3.md
│   ├── 엄마.md / _loop2.md / _loop3.md
│   ├── 차서연.md / _loop2.md
│   └── 치키.md / _loop2.md / _loop3.md
└── clues/
    ├── 기본단서1_녹음테이프.md
    ├── 기본단서2_가족사진.md
    ├── 기본단서3_약병과 처방 기록.md
    ├── AB단서0_김도현상담일지_route101.md
    ├── AB단서1_USB_route101_loop2.md
    ├── AB단서2_발신자표시제한전화_route101_loop2.md
    └── AB단서3_택배상자_속_일기장_route101.md
```

**파일 네이밍 규칙으로 루프 제한을 자동 추출**:

| 파일명 패턴 | `loop_level` | 검색 노출 조건 |
|---|---|---|
| `김도현.md` | 0 | 전 루프 공개 |
| `김도현_loop2.md` | 2 | 루프 2 이상에서만 |
| `AB단서1_USB_route101_loop2.md` | 2 | 루프 2 이상 + route 101 |

```python
# build_store.py — 파일명에서 자동 추출
loop_level = _parse_loop_level(filename)   # "_loop2" → 2
route      = _parse_route(filename)        # "_route101" → 101
```

### 3-3. DB 구축 (build_store.py)

```
.md 파일 읽기
      ↓
청킹 (3000자 단위, 200자 오버랩)
      ↓
OpenAI text-embedding-3-small 로 임베딩 생성
      ↓
메타데이터와 함께 ChromaDB에 저장
      {
        "doc_type"  : "character" | "world" | "clue",
        "character" : "김도현",
        "loop_level": 2,
        "route"     : 101
      }
```

실행:
```bash
python -m llm.vector_store.build_store --reset
```

### 3-4. 검색 필터 (retriever.py)

유저 발화가 들어오면 **루프 회차 + 선택한 route + 캐릭터** 조건으로 필터링 후 검색한다.

```python
# 루프 2, 캐릭터 "김도현", route 101 예시
where = {
    "$and": [
        {"loop_level": {"$lte": 2}},          # loop_level <= 현재 루프
        {"$or": [
            {"route": {"$eq": 0}},             # 공통 문서
            {"route": {"$eq": 101}},           # 선택된 route 문서
        ]},
        {"$or": [
            {"character": {"$eq": "김도현"}},  # 해당 NPC 문서
            {"doc_type": {"$eq": "world"}},    # 세계관 문서
        ]},
    ]
}
```

검색 결과 상위 3개(`RAG_TOP_K = 3`)를 프롬프트에 삽입.

### 3-5. 프롬프트 주입 (rag_inject.py)

```
RAG 블록 삽입 위치:  "=== 기본 성격" 섹션 바로 앞
(Few-Shot이 맨 끝에 유지되어 말투 recency bias 활용)

┌──────────────────────────────────────────────┐
│ 응답 규칙 / 역할 범위 / 루프 제한             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [RAG 블록] ← 여기에 삽입                      │
│   참고용 스토리 정보 (문체 따라하기 금지)     │
│   루프 제한 위반 정보는 발화 금지             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 기본 성격 (절대 변하지 않음)                  │
│ 현재 수치 상태 + 말투 지침                    │
│ 게임 상태                                     │
│ Few-Shot 예시 ← 맨 끝                         │
└──────────────────────────────────────────────┘
```

**안전 장치**: 문서 내 '유저', '주인공' 워딩을 '대화 상대방'으로 교체  
→ LLM이 메타 단어를 그대로 출력하는 현상 방지

```python
safe_context = context.replace("유저", "대화 상대방").replace("주인공", "대화 상대방")
```

---

## 4. RAG — 이미지 검색 (코사인 유사도)

### 4-1. 목적

채팅창에서 NPC의 **감정 상태에 맞는 표정 이미지**를 실시간으로 표시한다.  
GPT 응답 텍스트를 임베딩해 이미지 캡션 벡터 DB와 코사인 유사도를 비교,  
가장 유사한 이미지를 선택한다.

### 4-2. 이미지 데이터 구성

```
llm/vector_store/data/images/
├── 김도현/   김도현_개빡침.png, 김도현_울기.png, 김도현_놀람.png 등 8종
├── 박도원/   박도원_낙담.png, 박도원_당혹.png, 박도원_짜증.png 등 8종
├── 엄마/     엄마_당혹.png, 엄마_억지웃음.png, 엄마_화.png 등 8종
└── 차서연/   차서연_공감.png, 차서연_당혹.png, 차서연_정색+짜증.png 등 7종
```

**캡션 자동 생성 규칙** (파일명 → 캡션):

```
파일명: "김도현_짜증초기단계.png"
캡션:  "김도현이 짜증초기단계 상태이다."
```

### 4-3. DB 구축 (image_retriever.py — build_image_store)

```
images/{캐릭터명}/*.png 순회
      ↓
파일명에서 캡션 자동 생성 ("김도현이 {감정} 상태이다.")
      ↓
OpenAI text-embedding-3-small 로 캡션 임베딩 생성
      ↓
ChromaDB (cosine space) 에 저장
      {
        "image_url" : "images/김도현/김도현_짜증초기단계.png",
        "character" : "김도현"
      }
```

`_프로필.png` 파일은 감정 매칭 대상에서 **자동 제외** (기본 이미지로 예약).

### 4-4. 이미지 검색 (image_retriever.py — retrieve_image)

```
GPT 응답 텍스트
      ↓
text-embedding-3-small 임베딩 생성
      ↓
ChromaDB 쿼리 (character 필터 + n_results=1)
      ↓
코사인 유사도 계산: similarity = 1.0 - distance
      ↓
similarity >= IMAGE_THRESHOLD (0.2)?
    YES → 매칭된 image_url 반환
    NO  → 기본 프로필 이미지 반환
           ({캐릭터명}/{캐릭터명}_프로필.png)
```

```python
# image_retriever.py
distance   = results["distances"][0][0]
similarity = 1.0 - distance               # ChromaDB cosine distance → similarity

if similarity >= IMAGE_THRESHOLD:         # 0.2
    return results["metadatas"][0][0]["image_url"]
return f"{character}/{character}_프로필.png"
```

### 4-5. 전체 이미지 처리 흐름 요약

```
채팅 1회 처리
│
└─ GPT 응답 생성 완료
        │
        ├─ 응답 텍스트 → 임베딩 (text-embedding-3-small)
        │
        ├─ ChromaDB 검색 (해당 캐릭터 필터)
        │       상위 1개 매칭 + 코사인 유사도 계산
        │
        ├─ 유사도 >= 0.2?
        │       YES → 해당 감정 이미지 URL
        │       NO  → 기본 프로필 이미지 URL
        │
        └─ 프론트엔드로 { response, image_url } 전달
                 → 채팅 말풍선 옆에 NPC 이미지 렌더링
```

---

## 요약

| 기능 | 핵심 기술 | 파일 |
|---|---|---|
| 캐릭터 일관성 유지 | Few-Shot 프롬프팅 | `prompts/kim_dohyun.py` 등 |
| 말투 동적 분기 | NPC 수치 → 말투 지침 자동 변환 | `prompts/base.py` |
| 루프별 정보 통제 | 루프 제한 블록 + RAG 메타 필터 | `prompts/base.py`, `retriever.py` |
| 세계관 지식 주입 | 문서 RAG (ChromaDB + OpenAI 임베딩) | `rag_inject.py`, `retriever.py` |
| NPC 표정 이미지 | 이미지 RAG (코사인 유사도) | `image_retriever.py` |
