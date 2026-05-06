"""
build_store.py — Phase 3 RAG 파이프라인 1단계, Phase 4 이미지 임베딩 구축

역할: 프로듀서가 미리 청킹해서 제공한 .md 파일을 읽어
      OpenAI 임베딩으로 변환한 뒤 Chroma DB에 저장한다.
      프로듀서 문서가 바뀔 때마다 1회 실행한다.

실행 방법:
    python -m llm.vector_store.build_store

    # 강제 초기화 후 재구축 (기존 DB 삭제 후 처음부터)
    python -m llm.vector_store.build_store --reset

파일 규칙 (프로듀서가 지켜야 할 네이밍):
    data/characters/{캐릭터명}.md          → 전 루프 공개
    data/characters/{캐릭터명}_loop{N}.md  → 루프 N 이상에서만 검색 노출
    data/world/{파일명}.md                 → 전 루프 공개 세계관 문서
    data/world/{파일명}_loop{N}.md         → 루프 N 이상에서만 검색 노출

    파일 1개 = 문서 1개 (프로듀서가 이미 적절한 크기로 분할해서 제공)

저장되는 메타데이터:
    source      : 원본 파일 경로
    doc_type    : "character" | "world"
    character   : 캐릭터명 (world 문서는 빈 문자열)
    loop_level  : 몇 루프부터 공개 (0이면 항상 공개)

주의:
    - OPENAI_API_KEY 환경변수가 필요하다 (.env 파일 또는 환경변수로 설정)
    - 임베딩 API를 호출하므로 파일 수에 비례해 토큰이 소비된다
    - data/ 폴더에 .md 파일이 없으면 빈 DB가 만들어진다
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import uuid

# 프로젝트 루트를 sys.path에 추가 (어디서 실행해도 import 가능하도록)
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

from config import CHROMA_PATH, STORY_COLLECTION, EMBEDDING_MODEL
from vector_store.image_retriever import build_image_store

load_dotenv()


# ──────────────────────────────────────────────
# 내부 유틸
# ──────────────────────────────────────────────

def _get_openai_ef() -> embedding_functions.OpenAIEmbeddingFunction:
    """OpenAI 임베딩 함수 객체를 반환한다."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다. "
            ".env 파일을 확인해 주세요."
        )
    return embedding_functions.OpenAIEmbeddingFunction(
        api_key    = api_key,
        model_name = EMBEDDING_MODEL,
    )

#파일명 규칙에서 루프를 뽑아내고, 필터링한다.
def _parse_loop_level(filename: str) -> int:
    """파일명에서 loop_level을 추출한다. 예) 김도현_loop2.md → 2"""
    m = re.search(r"_loop(\d+)", filename)
    return int(m.group(1)) if m else 0

def _parse_route(filename: str) -> int:
    """파일명에서 route를 추출한다. 예) route101_loop2_단서1_USB.md → 101"""
    m = re.search(r"_route(\d+)", filename)
    return int(m.group(1)) if m else 0

#파일명에서 캐릭터 이름만 추출한다.
def _parse_character(filename: str) -> str:
    """캐릭터 파일명에서 캐릭터명을 추출한다. 예) 김도현_loop2.md → 김도현"""
    base = os.path.splitext(filename)[0]
    return re.sub(r"_loop\d+$", "", base)

# 청킹 설정
CHUNK_SIZE    = 3000   # 청크 1개당 최대 글자 수 (약 750토큰)
CHUNK_OVERLAP = 200    # 앞뒤 문맥 겹치는 글자 수


def _chunk_text(text: str) -> list[str]:
    """
    텍스트를 CHUNK_SIZE 단위로 나눈다.
    CHUNK_OVERLAP만큼 앞 청크와 겹쳐서 문맥이 끊기지 않도록 한다.
    """
    chunks = []
    start  = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end])
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


#data 폴더 내의 모든 .md 파일을 찾아서 정보를 수집한다.
def _read_docs(data_dir: str) -> tuple[list[str], list[dict], list[str]]:
    """
    data/characters/, data/world/, data/clues/ 의 .md 파일을 모두 읽어
    (texts, metadatas, ids) 튜플로 반환한다.

    긴 파일은 CHUNK_SIZE 단위로 청킹해 여러 문서로 저장한다.
    파일 1개 = 1개 이상의 문서.
    """
    texts     : list[str]  = []
    metadatas : list[dict] = []
    ids       : list[str]  = []

    subdirs = {
        "character": os.path.join(data_dir, "characters"),
        "world"    : os.path.join(data_dir, "world"),
        "clue"     : os.path.join(data_dir, "clues"),
    }

    for doc_type, folder in subdirs.items():
        if not os.path.isdir(folder):
            print(f"[build_store] 폴더 없음 (건너뜀): {folder}")
            continue

        for filename in sorted(os.listdir(folder)):
            if not filename.endswith(".md"):
                continue

            filepath = os.path.join(folder, filename)
            try:
                with open(filepath, encoding="utf-8") as f:
                    text = f.read().strip()
            except Exception as e:
                print(f"[build_store] 파일 읽기 실패: {filepath} → {e}")
                continue

            if not text:
                print(f"[build_store] 빈 파일 건너뜀: {filepath}")
                continue

            loop_level = _parse_loop_level(filename)
            character  = _parse_character(filename) if doc_type == "character" else ""
            route      = _parse_route(filename)

            # 청킹: 짧은 파일은 1개, 긴 파일은 여러 개로 분할
            chunks = _chunk_text(text)
            if len(chunks) > 1:
                print(f"[build_store] 청킹: {filename} → {len(chunks)}개 조각")

            for i, chunk in enumerate(chunks):
                short_uuid = str(uuid.uuid4())[:8]
                doc_id     = f"{character or doc_type}_{short_uuid}"

                texts.append(chunk)
                metadatas.append({
                    "source"    : filepath,
                    "doc_type"  : doc_type,
                    "character" : character,
                    "loop_level": loop_level,
                    "route"     : route,
                    "chunk_index": i,          # 몇 번째 청크인지 (디버깅용)
                })
                ids.append(doc_id)

    return texts, metadatas, ids


# ──────────────────────────────────────────────
# 공개 API
# ──────────────────────────────────────────────
#DB구축 핵심 로직

def build(reset: bool = False) -> None:
    """
    Chroma DB를 구축한다. RAG 텍스트 문서와 이미지 임베딩을 함께 구축한다.

    Args:
        reset: True면 기존 컬렉션을 삭제 후 재생성한다.
    """
    print(f"[build_store] DB 경로: {CHROMA_PATH}")
    print(f"[build_store] 컬렉션: {STORY_COLLECTION}")
    print(f"[build_store] 임베딩 모델: {EMBEDDING_MODEL}")

    data_dir = os.path.join(os.path.dirname(__file__), "data")

    # ── 1. 파일 읽기 ─────────────────────────
    texts, metadatas, ids = _read_docs(data_dir)

    if not texts:
        print("[build_store] 문서가 없습니다. data/ 폴더에 .md 파일을 추가하세요.")
    else:
        print(f"[build_store] 문서 {len(texts)}개 로드 완료")

        # ── 2. Chroma 클라이언트 & 컬렉션 ────────
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        ef     = _get_openai_ef()

        if reset:
            try:
                client.delete_collection(STORY_COLLECTION)
                print(f"[build_store] 기존 컬렉션 '{STORY_COLLECTION}' 삭제 완료")
            except Exception:
                pass  # 컬렉션이 없었으면 무시

        collection = client.get_or_create_collection(
            name               = STORY_COLLECTION,
            embedding_function = ef,
            metadata           = {"hnsw:space": "cosine"},
        )

        # ── 3. 배치 단위로 upsert ─────────────────
        BATCH_SIZE = 100

        for batch_start in range(0, len(texts), BATCH_SIZE):
            batch_end = batch_start + BATCH_SIZE
            collection.upsert(
                ids       = ids[batch_start:batch_end],
                documents = texts[batch_start:batch_end],
                metadatas = metadatas[batch_start:batch_end],
            )
            print(
                f"[build_store] upsert {batch_start + 1}"
                f"~{min(batch_end, len(texts))} / {len(texts)}"
            )

        final_count = collection.count()
        print(f"[build_store] RAG 완료 — DB 내 총 {final_count}개 문서 저장됨")

    # ── 4. 이미지 임베딩 구축 ─────────────────
    print("\n[build_store] 이미지 임베딩 구축 시작...")
    image_dir = os.path.join(data_dir, "images")
    if os.path.isdir(image_dir):
        build_image_store(image_dir, reset=reset)
    else:
        print(f"[build_store] 이미지 폴더 없음 (건너뜀): {image_dir}")


# ──────────────────────────────────────────────
# CLI 진입점
# ──────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chroma DB 구축 스크립트 (Phase 3 + Phase 4)")
    parser.add_argument(
        "--reset",
        action  = "store_true",
        help    = "기존 DB를 삭제하고 처음부터 재구축한다",
    )
    args = parser.parse_args()
    build(reset=args.reset)