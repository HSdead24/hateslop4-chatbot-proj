# image_retriever.py - Phase 4
# LLM 응답 텍스트를 이미지 캡션 벡터 DB와 대조해 관련 이미지 URL을 반환하는 모듈.
# build_image_store: 캐릭터 폴더를 순회하며 파일명에서 캡션을 자동 추출해 Chroma DB에 저장 (1회성)
# retrieve_image: 응답 텍스트와 코사인 유사도가 가장 높은 이미지 URL을 반환

import os
import sys
import chromadb
from openai import OpenAI

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from config import CHROMA_PATH, IMAGE_COLLECTION, EMBEDDING_MODEL, IMAGE_THRESHOLD


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


def build_image_store(image_dir: str, reset: bool = False) -> None:
    """
    image_dir 하위 {캐릭터명}/ 폴더를 순회하며 파일명에서 캡션을 자동 추출해 Chroma DB에 저장한다.

    파일명 규칙: {캐릭터명}_{감정/상황설명}.png
    캡션 자동 생성: "{캐릭터명}이 {감정/상황설명} 상태이다."
    _프로필.png 파일은 감정 매칭 대상에서 제외한다.
    DB가 없을 때 최초 1회만 실행하면 된다.

    Args:
        image_dir: 캐릭터별 하위 폴더가 있는 images/ 디렉토리 경로
    """
    if reset:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        try:
            client.delete_collection(IMAGE_COLLECTION)
            print(f"[build_image_store] 기존 컬렉션 '{IMAGE_COLLECTION}' 삭제 완료")
        except Exception:
            pass
    
    collection = _get_collection()
    ids, embeddings, metadatas, documents = [], [], [], []

    for char_entry in sorted(os.scandir(image_dir), key=lambda e: e.name):
        if not char_entry.is_dir():
            continue
        character = char_entry.name  # "김도현", "차서연" 등

        for img_entry in sorted(os.scandir(char_entry.path), key=lambda e: e.name):
            if not img_entry.name.lower().endswith(".png"):
                continue

            stem = os.path.splitext(img_entry.name)[0]  # "김도현_짜증초기단계"

            # 프로필 이미지는 감정 매칭 대상에서 제외
            if stem.endswith("_프로필"):
                continue

            # "{캐릭터명}_" 접두어 제거 → 감정/상황 텍스트 추출
            situation = stem.removeprefix(f"{character}_")
            caption = f"{character}이 {situation} 상태이다."

            # image_url: images/ 기준 상대경로 (백엔드 static 서빙 경로와 일치)
            rel_path = f"images/{character}/{img_entry.name}"

            ids.append(rel_path)
            embeddings.append(_get_embedding(caption))
            metadatas.append({"image_url": rel_path, "character": character})
            documents.append(caption)

            print(f"  [+] {rel_path} → \"{caption}\"")

    collection.upsert(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)
    print(f"\n[build_image_store] {len(ids)}개 이미지 저장 완료 → {CHROMA_PATH}/{IMAGE_COLLECTION}")


def retrieve_image(response_text: str, character: str | None = None) -> str | None:
    """
    response_text를 임베딩해 Chroma DB에서 코사인 유사도 Top-1 이미지를 검색한다.

    유사도가 IMAGE_THRESHOLD 이상이면 해당 image_url을 반환하고,
    미만이거나 결과가 없으면 해당 캐릭터의 프로필 이미지 경로를 반환한다.

    Args:
        response_text: LLM이 생성한 NPC 응답 텍스트
        character: 현재 대화 중인 NPC 이름 (예: "김도현")

    Returns:
        image_url 문자열 (항상 반환, None 없음)
    """
    default_image = f"images/{character}/{character}_프로필.png"

    embedding = _get_embedding(response_text)
    collection = _get_collection()

    where = {"character": character} if character else None

    results = collection.query(
        query_embeddings=[embedding],
        n_results=1,
        include=["metadatas", "distances"],
        where=where,
    )

    if not results["metadatas"] or not results["metadatas"][0]:
        return default_image

    distance = results["distances"][0][0]
    similarity = 1.0 - distance
    print(f"[DEBUG] similarity: {similarity}")
    print(f"[DEBUG] matched: {results['metadatas'][0][0]['image_url']}")

    if similarity >= IMAGE_THRESHOLD:
        return results["metadatas"][0][0]["image_url"]

    return default_image