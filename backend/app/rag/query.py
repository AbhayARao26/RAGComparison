from groq import Groq
from .retriever import retrieve_similar
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

model = SentenceTransformer("all-MiniLM-L6-v2")

client = Groq(api_key=GROQ_API_KEY)

def answer_question(question):
    q_emb = model.encode([question])[0]
    results = retrieve_similar(q_emb)

    context = "\n\n".join([r.payload['text'] for r in results])
    messages = [
        {"role": "system", "content": "Answer using only the context below."},
        {"role": "user", "content": f"Context: {context}\n\nQuestion: {question}"}
    ]

    response = client.chat.completions.create(
        model="llama3-70b-8192", messages=messages
    )
    return {
        "answer": response.choices[0].message.content,
        "context": context,
        "sources": [r.payload for r in results]
    }