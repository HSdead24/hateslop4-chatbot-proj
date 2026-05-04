"""
FastAPI 앱 진입점.

실행 방법:
    # 프로젝트 루트에서 실행
    uvicorn backend.main:app --reload --port 8000

    # 또는 backend/ 폴더 안에서 실행
    cd backend && uvicorn main:app --reload --port 8000

Swagger UI:
    http://localhost:8000/docs
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.game import router as game_router
from api.chat import router as chat_router


# ────────────────────────────────────────────
# 앱 생성
# ────────────────────────────────────────────

app = FastAPI(
    title="죽기 24시간 전에 (Phase6 백엔드 API)",
    description="버튼 선택 → 스토리 확정 → NPC 챗봇 대화 게임 백엔드",
    version="1.0.0",
)


# ────────────────────────────────────────────
# CORS 설정
# 웹브라우저가 보안을 위해 자신의 도메인이 아닌 다른 서버로 요청을 보내는 것을 막는 정책
# ────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # 개발 중 전체 허용. 배포 시 프론트 도메인으로 교체.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────────────────
# 전역 예외 핸들러
# ────────────────────────────────────────────

@app.exception_handler(KeyError)
async def key_error_handler(request: Request, exc: KeyError):
    return JSONResponse(
        status_code=404,
        content={"detail": f"세션을 찾을 수 없습니다: {str(exc)}"},
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )


# ────────────────────────────────────────────
# 라우터 등록
# ────────────────────────────────────────────

app.include_router(game_router)
app.include_router(chat_router)


# ────────────────────────────────────────────
# 헬스 체크
# ────────────────────────────────────────────

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}


@app.get("/", tags=["system"])
def root():
    return {"message": "Hateslop4 Game API. /docs 에서 API 문서 확인."}