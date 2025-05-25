from app.rag.retriever import retrieve_similar
from app.rag.jina_reranker import rerank_with_jina
from app.rag.embedder import model  # or however you use sentence-transformers
from app.rag.self_query import gemini_model  # or your Gemini interface

def reranker_rag_pipeline(question: str):
    query_embedding = model.encode([question])[0]
    initial_results = retrieve_similar(query_embedding, k=10)  # more candidates

    passages = [res.payload["text"] for res in initial_results]
    reranked = rerank_with_jina(question, passages)

    # Take top 3 reranked results
    top = sorted(reranked, key=lambda x: x["relevance_score"], reverse=True)[:3]
    top_texts = [passages[r["index"]] for r in top]
    top_sources = [initial_results[r["index"]].payload for r in top]

    context = "\n\n".join(top_texts)
    prompt = f"""You are a helpful assistant.
Use the following context to answer the question.

Context:
{context}

Question:
{question}
"""

    response = gemini_model.generate_content(prompt)

    return {
        "answer": response.text,
        "context": context,
        "sources": top_sources,
        "rerank_scores": top
    }