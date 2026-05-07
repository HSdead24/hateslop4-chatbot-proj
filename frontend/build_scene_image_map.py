"""
build_scene_image_map.py
========================
scenes.json의 각 씬 대사를 임베딩하여,
해당 화자(speaker_name)의 이미지 파일들과 cosine 유사도를 계산하고
가장 어울리는 이미지를 scene_image_map.json으로 저장하는 1회성 스크립트.

실행 방법 (frontend/ 폴더에서):
    python build_scene_image_map.py

출력:
    frontend/data/scene_image_map.json

의존 환경:
    pip install openai numpy
    환경변수 OPENAI_API_KEY 필요

이미지 경로 규칙:
    llm/vector_store/data/images/button/{캐릭터명}/{파일명}.png
    → 프론트 서빙 경로: /static/images/button/{캐릭터명}/{파일명}.png
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Optional

import numpy as np

# ── 경로 설정 ─────────────────────────────────────────
ROOT = Path(__file__).parent.parent   # ★ 변경: frontend/ 한 단계 위 = 프로젝트 루트

SCENES_JSON   = ROOT / "frontend" / "data" / "scenes.json"
CAPTIONS_JSON = ROOT / "llm" / "vector_store" / "data" / "button_image_captions.json"  # ★ 변경
IMAGES_DIR    = ROOT / "llm" / "vector_store" / "data" / "button"           # ★ 변경
OUTPUT_JSON   = ROOT / "frontend" / "data" / "scene_image_map.json"

# 프론트에서 이미지를 서빙하는 URL prefix (main.py 기준)
IMAGE_URL_PREFIX = "/static/images/button"  # ★ 변경

# 캐릭터별 기본(fallback) 이미지 — 이미지가 null이거나 매핑 실패 시 사용
DEFAULT_CHARACTER_IMAGES: dict[str, str] = {
    "김도현": f"{IMAGE_URL_PREFIX}/김도현/김도현_무표정.png",
    "박도원": f"{IMAGE_URL_PREFIX}/박도원/박도원_은은한미소_착한사람인척.png",
    "엄마":   f"{IMAGE_URL_PREFIX}/엄마/엄마_정색.png",
    "차서연": f"{IMAGE_URL_PREFIX}/차서연/차서연_무표정.png",
    "치키":   f"{IMAGE_URL_PREFIX}/치키/치키_기본치키.png",
}

# 치키 폴더가 없을 때 최종 fallback (DEFAULT_CHARACTER_IMAGES["치키"]로 대체됨)
CHIKI_FALLBACK_URL = DEFAULT_CHARACTER_IMAGES["치키"]

# 임베딩 모델 (config.py와 동일하게 유지)
EMBEDDING_MODEL = "text-embedding-3-small"

# ── OpenAI 클라이언트 초기화 ───────────────────────────
try:
    from openai import OpenAI
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
except ImportError:
    print("[ERROR] openai 패키지가 없습니다. pip install openai")
    sys.exit(1)

# ── 임베딩 캐시 (중복 API 호출 방지) ──────────────────
_embed_cache: dict[str, list[float]] = {}

def get_embedding(text: str) -> list[float]:
    """텍스트 임베딩 반환. 동일 텍스트는 캐시에서 반환."""
    if text in _embed_cache:
        return _embed_cache[text]
    # API rate limit 방지용 짧은 대기
    time.sleep(0.05)
    resp = client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    vec = resp.data[0].embedding
    _embed_cache[text] = vec
    return vec

def cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)

# ── button_image_captions.json 로드 ──────────────────────────
def load_captions() -> dict:
    """
    button_image_captions.json 구조 예시:
    {
      "김도현/화남.png": "김도현이 분노하며 주먹을 쥐고 있는 표정",
      "김도현/놀람.png": "김도현이 눈을 크게 뜨고 놀라는 표정",
      ...
    }
    또는 배열 형태:
    [
      {"image_path": "김도현/화남.png", "caption": "..."},
      ...
    ]
    """
    with open(CAPTIONS_JSON, encoding="utf-8") as f:
        raw = json.load(f)

    # 배열 형태 → dict 형태로 정규화
    if isinstance(raw, list):
        return {item["image_path"]: item["caption"] for item in raw}
    return raw  # 이미 dict 형태

# ── 화자별 이미지 목록 분류 ───────────────────────────
def build_char_image_index(captions: dict) -> dict[str, dict[str, str]]:
    """
    { "김도현": {"김도현/화남.png": "캡션...", ...}, "차서연": {...}, ... }
    캡션이 없는 이미지는 파일명을 캡션으로 대체.
    """
    index: dict[str, dict[str, str]] = {}
    for img_path, caption in captions.items():
        # img_path = "김도현/화남.png" or "김도현\\화남.png"
        parts = Path(img_path).parts
        if len(parts) >= 2:
            char_name = parts[0]
        else:
            # 폴더 구분자 없이 파일명만 있는 경우 — 건너뜀
            continue
        index.setdefault(char_name, {})[img_path] = caption or Path(img_path).stem
    return index

# ── 씬 텍스트 구성 ────────────────────────────────────
def scene_query_text(scene: dict) -> str:
    """
    대사 + 장소 + 이벤트 정보를 합쳐 임베딩용 쿼리 텍스트 생성.
    화자 감정/상황이 잘 반영되도록 구성.
    """
    parts = []
    if scene.get("dialogue"):
        parts.append(scene["dialogue"].replace("\n", " ").strip())
    if scene.get("location"):
        parts.append(f"장소: {scene['location']}")
    if scene.get("event"):
        parts.append(f"상황: {scene['event']}")
    return " | ".join(parts) if parts else scene.get("speaker_name", "")

# ── 최적 이미지 선택 ──────────────────────────────────
def pick_best_image(
    query_vec: list[float],
    char_images: dict[str, str],
    char_image_embed: dict[str, list[float]],
) -> Optional[str]:
    """cosine 유사도 기준 Top-1 이미지 경로 반환."""
    best_path, best_score = None, -1.0
    for img_path, cap_vec in char_image_embed.items():
        score = cosine_similarity(query_vec, cap_vec)
        if score > best_score:
            best_score = score
            best_path = img_path
    return best_path

# ── 메인 ──────────────────────────────────────────────
def main():
    print("=" * 60)
    print("build_scene_image_map.py — 씬 이미지 사전 계산 시작")
    print("=" * 60)

    # 1. 파일 로드
    print(f"\n[1/5] scenes.json 로드: {SCENES_JSON}")
    with open(SCENES_JSON, encoding="utf-8") as f:
        scenes_data: dict = json.load(f)["scenes"]
    print(f"      씬 수: {len(scenes_data)}개")

    print(f"\n[2/5] button_image_captions.json 로드: {CAPTIONS_JSON}")
    captions = load_captions()
    print(f"      캡션 수: {len(captions)}개")

    # 2. 캐릭터별 이미지 인덱스 구성
    char_index = build_char_image_index(captions)
    print(f"\n[3/5] 캐릭터별 이미지 분류:")
    for char, imgs in char_index.items():
        print(f"      {char}: {len(imgs)}장")

    # 3. 이미지 캡션 임베딩 (캐릭터별로 한 번만 계산)
    print(f"\n[4/5] 이미지 캡션 임베딩 계산 (API 호출)...")
    char_embed_index: dict[str, dict[str, list[float]]] = {}
    for char_name, img_dict in char_index.items():
        print(f"      [{char_name}] {len(img_dict)}개 이미지...")
        char_embed_index[char_name] = {}
        for img_path, caption in img_dict.items():
            char_embed_index[char_name][img_path] = get_embedding(caption)
    print(f"      완료. 캐시 크기: {len(_embed_cache)}개")

    # 4. 씬별 최적 이미지 계산
    print(f"\n[5/5] 씬별 최적 이미지 계산...")
    result: dict[str, Optional[str]] = {}
    skipped = 0

    for scene_key, scene in scenes_data.items():
        speaker = scene.get("speaker_name", "")

        # 치키: 표정 이미지 없으면 fallback
        if speaker == "치키":
            if "치키" in char_index:
                query_text = scene_query_text(scene)
                query_vec = get_embedding(query_text)
                best = pick_best_image(
                    query_vec,
                    char_index["치키"],
                    char_embed_index["치키"],
                )
                result[scene_key] = f"{IMAGE_URL_PREFIX}/{best}" if best else CHIKI_FALLBACK_URL
            else:
                result[scene_key] = CHIKI_FALLBACK_URL
            continue

        # ???: 알 수 없는 화자 → null
        if speaker == "???":
            result[scene_key] = None
            skipped += 1
            continue

        # 이미지 없는 화자 → 기본 이미지(있으면) 또는 null
        if speaker not in char_embed_index:
            fallback = DEFAULT_CHARACTER_IMAGES.get(speaker)
            if fallback:
                print(f"      [경고] '{speaker}' 이미지 없음 → 기본 이미지 사용: {fallback}")
                result[scene_key] = fallback
            else:
                print(f"      [경고] '{speaker}' 이미지 없음 → {scene_key} null 처리")
                result[scene_key] = None
            skipped += 1
            continue

        # 임베딩 + 유사도 계산
        query_text = scene_query_text(scene)
        query_vec = get_embedding(query_text)
        best = pick_best_image(
            query_vec,
            char_index[speaker],
            char_embed_index[speaker],
        )
        result[scene_key] = (
            f"{IMAGE_URL_PREFIX}/{best}" if best
            else DEFAULT_CHARACTER_IMAGES.get(speaker)
        )

    print(f"      완료. 매핑 {len(result) - skipped}건, null {skipped}건")

    # 5. 결과 저장
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 저장 완료: {OUTPUT_JSON}")
    print(f"   총 {len(result)}개 씬 매핑")

    # 샘플 출력
    print("\n[샘플 결과 (처음 5개)]")
    for i, (k, v) in enumerate(list(result.items())[:5]):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()