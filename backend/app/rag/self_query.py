import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from app.rag.retriever import retrieve_similar
import os
from dotenv import load_dotenv
import re
import json
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = SentenceTransformer("all-MiniLM-L6-v2")
client = QdrantClient(host="localhost", port=6333)

gemini_model = genai.GenerativeModel("gemini-2.0-flash")

def generate_self_query_filter(question: str):
    prompt = f"""
        You are a helpful assistant. Given a user query, extract the following:
        - A search query
        - Filters like page number or keywords

        Return only valid JSON. Do NOT explain. Do NOT add any text before or after the JSON.

        Format:
        {{
        "query": "...",
        "filters": {{
            "page": ...
        }}
        }}

        User Query: "{question}"
    """

    response = gemini_model.generate_content(prompt)
    print("Gemini response:", response.text)

    # Extract JSON using regex to avoid extra text from Gemini
    try:
        json_text = re.search(r"\{[\s\S]*\}", response.text).group()
        parsed = json.loads(json_text)
        return parsed
    except Exception as e:
        raise ValueError(f"Failed to parse Gemini response: {response.text}")

def self_query_rag_pipeline(question: str):
    parsed = generate_self_query_filter(question)
    q_vector = model.encode([parsed["query"]])[0]

    conditions = []
    if "filters" in parsed:
        for key, val in parsed["filters"].items():
            conditions.append(FieldCondition(key=key, match=MatchValue(value=val)))

    result = client.search(
        collection_name="pdf_chunks",
        query_vector=q_vector,
        limit=3,
        query_filter=Filter(must=conditions) if conditions else None
    )

    context = "\n\n".join([r.payload['text'] for r in result])

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
        "sources": [r.payload for r in result],
        "filters_used": parsed.get("filters", {})
    }
