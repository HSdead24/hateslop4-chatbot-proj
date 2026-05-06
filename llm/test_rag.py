# RAG 문제 사항 확인용

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vector_store.retriever import retrieve_story_context

result = retrieve_story_context(
    user_input = "제가 상담해줘야하는데, 왜 당신이 상담사처럼 구죠?",
    loop       = 1,
    character  = "김도현",
)
print(result)