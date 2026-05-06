# test_rag.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vector_store.rag_inject import inject_rag_into_system

dummy_system = """=== 응답 규칙 ===
...

=== 기본 성격 ===
...

=== 말투 예시 ===
..."""

dummy_rag = "【RAG 블록】"

result = inject_rag_into_system(dummy_system, dummy_rag)
print(result)