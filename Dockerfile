FROM python:3.11-slim

WORKDIR /app

# 빌드 시간 최적화를 위한 requirements.txt 우선 복사
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 전체 코드 복사
COPY . .

# PYTHONPATH 환경변수 설정
ENV PYTHONPATH=/app/llm:/app/llm/nodes:/app/backend

# 포트 노출 (Render 환경변수)
EXPOSE 8000

# FastAPI 서버 실행 (sh -c로 동적 포트 바인딩)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
