"""
rag_inject.py — Phase 3 RAG 파이프라인 4단계 (접착제)

역할: retriever.py가 반환한 스토리 컨텍스트를
      NPC 시스템 프롬프트에 삽입할 수 있는 형태로 가공한다.

호출처: chat_node.py → generate_npc_response() 내부에서 호출

사용 예시 (chat_node.py 수정 시 엔지니어 A가 반영):

    from llm.vector_store.rag_inject import build_rag_block, inject_rag_into_system

    rag_block = build_rag_block(
        user_input = user_message,
        loop       = state["loop"],
        character  = npc_name,
    )
    system_prompt = inject_rag_into_system(base_system_prompt, rag_block)

설계 원칙:
    - retriever 호출 실패 또는 결과 없을 때: 원본 프롬프트 그대로 반환 (안전 fallback)
    - RAG 블록은 시스템 프롬프트의 맨 끝(# Context 섹션)에 붙인다
    - <reference_story> XML 태그로 감싸 LLM이 참고 정보임을 인식하도록 한다
"""

from __future__ import annotations

from vector_store.retriever import retrieve_story_context

# ──────────────────────────────────────────────
# 상수
# ──────────────────────────────────────────────

# 시스템 프롬프트 내 RAG 블록을 감싸는 구분선
_RAG_HEADER = (
    "\n"
    "아래 <reference_story>는 사실 확인용 참고 정보입니다.\n"
    "- 문체와 형식은 따라 하지 말고, <character_profile>의 말투와 성격으로만 답합니다.\n"
    "- '이번 루프 정보 공개 제한'에서 금지한 내용은 여기에 있더라도 말하지 않습니다.\n"
    "- 직접 인용하거나 요약하지 말고, 캐릭터 시점에서 자연스럽게 녹여냅니다.\n"
    "<reference_story>\n"
)

_RAG_FOOTER = (
    "\n</reference_story>\n"
)

_NO_CONTEXT_MSG = ""   # 컨텍스트가 없을 때 삽입할 내용 (빈 문자열 = 삽입 안 함)


# ──────────────────────────────────────────────
# 공개 API
# ──────────────────────────────────────────────

def build_rag_block(
    user_input : str,
    loop       : int,
    first_button : int      = 0,
    character  : str | None = None,
) -> str:
    """
    retriever를 호출해 RAG 컨텍스트 블록을 만든다.

    Args:
        user_input: 유저가 입력한 메시지
        loop      : 현재 루프 회차
        first_button: 첫 번째로 선택된 버튼 ID
        character : NPC 이름 (None이면 전체 문서에서 검색)

    Returns:
        헤더 + 컨텍스트 + 푸터로 구성된 문자열.
        검색 결과가 없으면 빈 문자열 반환.
    """
    context = retrieve_story_context(
        user_input = user_input,
        loop       = loop,
        first_button = first_button,
        character  = character,
    )

    if not context.strip():
        return _NO_CONTEXT_MSG
    
    # 문서의 '유저', '주인공'을 LLM이 읽기 전에 중립적인 단어로 강제 변환
    safe_context = context.replace("유저", "대화 상대방").replace("주인공", "대화 상대방")

    return f"{_RAG_HEADER}{safe_context}{_RAG_FOOTER}"


def inject_rag_into_system(
    system_prompt: str,
    rag_block    : str,
) -> str:
    """
    RAG 블록을 시스템 프롬프트 맨 끝(# Context 섹션 마지막)에 덧붙인다.
    OpenAI 공식 가이드 구조(Identity → Instructions → Examples → Context)에서
    참고 정보는 Context에 속한다.
    """
    if not rag_block:
        return system_prompt
    return system_prompt.rstrip() + "\n" + rag_block


def get_enriched_system_prompt(
    system_prompt : str,
    user_input    : str,
    loop          : int,
    first_button  : int      = 0,
    character     : str | None = None,
) -> str:
    """
    build_rag_block + inject_rag_into_system을 한 번에 처리하는 편의 함수.
    chat_node.py에서 이 함수 하나만 호출하면 된다.

    Args:
        system_prompt: 기존 NPC 시스템 프롬프트
        user_input   : 유저 입력 메시지
        loop         : 현재 루프 회차
        first_button : 첫 번째로 선택된 버튼 ID
        character    : NPC 이름

    Returns:
        RAG 컨텍스트가 주입된 최종 시스템 프롬프트
    """
    rag_block = build_rag_block(
        user_input = user_input,
        loop       = loop,
        first_button = first_button,
        character  = character,
    )
    return inject_rag_into_system(system_prompt, rag_block)