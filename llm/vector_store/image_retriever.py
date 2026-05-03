# image_retriever.py - Phase 4
# LLM 응답 텍스트를 이미지 캡션 벡터 DB와 대조해 관련 이미지 URL을 반환하는 모듈.
# build_image_store: 이미지 캡션 JSON을 읽어 Chroma DB에 임베딩 저장 (1회성)
# retrieve_image: 응답 텍스트와 코사인 유사도가 가장 높은 이미지 URL을 반환

import json
import os
import uuid

import chromadb
from openai import OpenAI

from llm.config import CHROMA_PATH, IMAGE_COLLECTION, EMBEDDING_MODEL, IMAGE_THRESHOLD


def _get_embedding(text: str) -> list[float]:
    """OpenAI API로 텍스트 임베딩 벡터를 생성한다."""
    client = OpenAI()
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


def _get_collection() -> chromadb.Collection:
    """Chroma DB에서 이미지 캡션 컬렉션을 반환한다. 없으면 생성한다."""
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_or_create_collection(
        name=IMAGE_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )


def build_image_store(image_dir: str) -> None:
    """
    image_dir 안의 image_captions.json을 읽어 Chroma DB에 임베딩 저장한다.

    각 항목의 caption을 EMBEDDING_MODEL로 임베딩하고,
    image_url을 메타데이터로 포함해 IMAGE_COLLECTION 컬렉션에 저장한다.
    DB가 없을 때 최초 1회만 실행하면 된다.

    Args:
        image_dir: image_captions.json이 위치한 디렉토리 경로
    """
    json_path = os.path.join(image_dir, "image_captions.json")
    with open(json_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    collection = _get_collection()

    ids, embeddings, metadatas, documents = [], [], [], []

    for item in items:
        caption = item["caption"]
        embedding = _get_embedding(caption)

        ids.append(str(uuid.uuid4()))
        embeddings.append(embedding)
        metadatas.append({
            "image_url": item["image_url"],
            "character": item.get("character", ""),
        })
        documents.append(caption)

    collection.add(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=documents,
    )

    print(f"[build_image_store] {len(items)}개 이미지 캡션 저장 완료 → {CHROMA_PATH}/{IMAGE_COLLECTION}")


def retrieve_image(response_text: str) -> str | None:
    """
    response_text를 임베딩해 Chroma DB에서 코사인 유사도 Top-1 이미지를 검색한다.

    유사도(1 - cosine_distance)가 IMAGE_THRESHOLD 이상이면 image_url을 반환하고,
    미만이면 None을 반환한다.

    Args:
        response_text: LLM이 생성한 NPC 응답 텍스트

    Returns:
        유사도 조건을 만족하는 이미지 URL 문자열, 또는 None
    """
    embedding = _get_embedding(response_text)
    collection = _get_collection()

    results = collection.query(
        query_embeddings=[embedding],
        n_results=1,
        include=["metadatas", "distances"],
    )

    if not results["metadatas"] or not results["metadatas"][0]:
        return None

    # ChromaDB cosine distance = 1 - cosine_similarity (값이 작을수록 유사)
    distance = results["distances"][0][0]
    similarity = 1.0 - distance

    if similarity >= IMAGE_THRESHOLD:
        return results["metadatas"][0][0]["image_url"]

    return None
