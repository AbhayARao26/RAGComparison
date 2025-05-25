import requests
import os
from dotenv import load_dotenv
load_dotenv()

JINA_API_KEY = os.getenv("JINA_API_KEY")

def rerank_with_jina(query: str, passages: list[str]):
    url = "https://api.jina.ai/v1/rerank"

    headers = {
        "Authorization": f"Bearer {JINA_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "jina-reranker-v1-base-en",  # or jina-reranker-v2-base-en
        "query": query,
        "documents": passages
    }

    response = requests.post(url, headers=headers, json=data)

    if response.status_code != 200:
        raise ValueError(f"Jina rerank error: {response.text}")

    reranked = response.json()["results"]
    return reranked  # list of dicts: {index, relevance_score}