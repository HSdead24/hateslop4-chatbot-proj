"""
FastAPI 앱 진입점.

실행 방법:

    # backend/ 폴더 안에서 실행
    cd backend && uvicorn main:app --reload --port 8000

    # 브라우저에서 아래 주소로 접속
    http://localhost:8000/

"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from api.game import router as game_router
from api.chat import router as chat_router
from api.triggers import router as triggers_router


# ────────────────────────────────────────────
# 앱 생성  ← 반드시 라우터 등록보다 먼저
# ────────────────────────────────────────────

app = FastAPI(
    title="죽기 24시간 전에 (Phase6 백엔드 API)",
    description="버튼 선택 → 스토리 확정 → NPC 챗봇 대화 게임 백엔드",
    version="1.0.0",
)


# ────────────────────────────────────────────
# CORS 설정
# ────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # 배포 시 프론트 도메인으로 교체
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────────────────
# 정적 파일 서빙 (frontend/ 폴더 전체)
# → http://localhost:8000/frontend/data/scenes.json 으로 접근 가능
# ────────────────────────────────────────────

_FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
if _FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=str(_FRONTEND_DIR)), name="frontend")


# ────────────────────────────────────────────
# 정적 파일 서빙
# ────────────────────────────────────────────
_DATA_DIR = Path(__file__).parent.parent / "frontend" / "data"
if _DATA_DIR.exists():
    app.mount("/data", StaticFiles(directory=str(_DATA_DIR)), name="data")

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
# 라우터 등록  ← app 생성 이후에 등록
# ────────────────────────────────────────────

app.include_router(game_router)
app.include_router(chat_router)
app.include_router(triggers_router)


# ────────────────────────────────────────────
# 헬스 체크 및 HTML 라우팅
# ────────────────────────────────────────────

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}

@app.get("/", tags=["system"])
def root():
    return FileResponse(str(_FRONTEND_DIR / "opening.html"))

# /button 주소로 접속하면 buttonroom.html들을 보여줍니다.
@app.get("/button", tags=["system"])
def get_room():
    return FileResponse(str(_FRONTEND_DIR / "buttonroom.html"))

@app.get("/chat", tags=["system"])
def get_chat():
    return FileResponse(str(_FRONTEND_DIR / "chatroom.html"))

@app.get("/suspect", tags=["system"])
def get_suspect():
    return FileResponse(str(_FRONTEND_DIR / "suspect.html"))

@app.get("/ending", tags=["system"])
def get_ending():
    return FileResponse(str(_FRONTEND_DIR / "ending.html"))

@app.get("/opening", tags=["system"])
def get_opening():
    return FileResponse(str(_FRONTEND_DIR / "opening.html"))