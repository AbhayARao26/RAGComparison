# backend/app/benchmarking/gemini_benchmark.py
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_benchmark_answer(pdf_text: str, query: str) -> str:
    """
    Generates a benchmark answer for a query using Gemini based solely on provided text.
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash-preview-04-17")

        prompt = f"""You are a helpful assistant whose sole purpose is to answer questions
based ONLY on the provided context. Do NOT use any prior knowledge.
If the answer cannot be found in the context, state "The information needed to answer this question is not available in the document."

Context:
---
{pdf_text}
---

Question:
{query}

Answer:
"""
        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        print(f"Error generating benchmark answer: {e}")
        return "Error generating benchmark answer."

# --- Evaluation Functions (will be added later, potentially in a separate file or here) ---
# These will compare panel responses against the benchmark answer.