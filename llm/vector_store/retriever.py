"""
retriever.py — Phase 3 RAG 파이프라인 3단계

역할: 유저 발화(user_input)와 현재 루프 회차(loop)를 받아
      Chroma DB에서 관련 스토리 청크를 검색하고 문자열로 반환한다.

호출처: rag_inject.py → chat_node.py (Phase 3 연동 완료 후)

검색 필터 규칙:
    - loop_level <= 현재 루프 회차인 청크만 반환  (루프별 공개 정보 통제)
    - character 필터가 주어지면 해당 캐릭터 문서 우선 검색
    - RAG_TOP_K(config.py)개 만큼 반환

반환값:
    관련 청크 텍스트를 "\n\n---\n\n"으로 이어 붙인 단일 문자열.
    검색 결과가 없으면 빈 문자열("") 반환.

엔지니어 B(image_retriever.py)와 독립적으로 동작한다.
"""

from __future__ import annotations

import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

from config import (
    CHROMA_PATH,
    STORY_COLLECTION,
    EMBEDDING_MODEL,
    RAG_TOP_K,
)

load_dotenv()

# ──────────────────────────────────────────────
# Chroma 클라이언트 — 모듈 로드 시 1회만 초기화
# ──────────────────────────────────────────────
_client     : chromadb.PersistentClient | None = None
_collection : chromadb.Collection | None       = None


def _get_collection() -> chromadb.Collection:
    """싱글턴 패턴으로 Chroma 컬렉션을 반환한다."""
    global _client, _collection

    if _collection is not None:
        return _collection

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다."
        )

    ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key    = api_key,
        model_name = EMBEDDING_MODEL,
    )

    _client     = chromadb.PersistentClient(path=CHROMA_PATH)
    _collection = _client.get_or_create_collection(
        name               = STORY_COLLECTION,
        embedding_function = ef,
        metadata           = {"hnsw:space": "cosine"},
    )
    return _collection


# ──────────────────────────────────────────────
# 공개 API
# ──────────────────────────────────────────────

def retrieve_story_context(
    user_input : str,
    loop       : int,
    character  : str | None = None,
    top_k      : int        = RAG_TOP_K,
) -> str:
    """
    유저 발화와 유사한 스토리 청크를 검색해 문자열로 반환한다.

    Args:
        user_input: 유저가 입력한 메시지
        loop      : 현재 루프 회차 (0-based). loop_level <= loop 인 문서만 검색.
        character : NPC 이름. 주어지면 해당 캐릭터 문서를 우선 검색한다.
                    None이면 전체 문서에서 검색.
        top_k     : 반환할 최대 청크 수 (기본값: config.RAG_TOP_K)

    Returns:
        관련 청크를 "\n\n---\n\n"으로 이어붙인 문자열.
        결과가 없으면 빈 문자열.
    """
    if not user_input.strip():
        return ""

    collection = _get_collection()

    # ── where 필터 구성 ────────────────────────
    # loop_level <= loop 조건 + 선택적 character 필터
    # Chroma where 문법: $and / $lte / $eq
    if character:
        where: dict = {
            "$and": [
                {"loop_level": {"$lte": loop}},
                {
                    "$or": [
                        {"character": {"$eq": character}},
                        {"doc_type" : {"$eq": "world"}},   # 세계관 문서는 항상 포함
                    ]
                },
            ]
        }
    else:
        where = {"loop_level": {"$lte": loop}}

    # ── 검색 실행 ──────────────────────────────
    try:
        results = collection.query(
            query_texts      = [user_input],
            n_results        = top_k,
            where            = where,
            include          = ["documents", "metadatas", "distances"],
        )
    except Exception as e:
        print(f"[retriever] 검색 오류: {e}")
        return ""

    # ── 결과 조합 ──────────────────────────────
    docs: list[str] = results.get("documents", [[]])[0]

    if not docs:
        return ""

    return "\n\n---\n\n".join(docs)


def retrieve_story_context_by_character(
    user_input : str,
    loop       : int,
    character  : str,
    top_k      : int = RAG_TOP_K,
) -> str:
    """
    캐릭터 전용 편의 함수. character 파라미터를 명시적으로 강제한다.
    chat_node.py에서 NPC별로 호출하기 편하도록 제공.

    Args:
        user_input: 유저 입력
        loop      : 현재 루프 회차
        character : NPC 이름 (반드시 전달해야 함)
        top_k     : 반환할 최대 청크 수

    Returns:
        관련 청크 문자열
    """
    return retrieve_story_context(
        user_input = user_input,
        loop       = loop,
        character  = character,
        top_k      = top_k,
    )


# retriever.py - Phase 3
#def retrieve_story_context(user_input: str, loop: int) -> str:
#    pass  # 2단계에서 채움
