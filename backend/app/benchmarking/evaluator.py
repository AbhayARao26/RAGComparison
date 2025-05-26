# backend/app/benchmarking/evaluator.py
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Load the same embedding model used for RAG
# Ensure this model is appropriate for semantic similarity tasks
model = SentenceTransformer("all-MiniLM-L6-v2")

def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculates the cosine similarity between two texts using sentence embeddings.
    Returns a score between -1 and 1.
    """
    if not text1 or not text2:
        return 0.0 # Return 0 if either text is empty

    try:
        embeddings = model.encode([text1, text2])
        # Calculate cosine similarity between the two vectors
        similarity_score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(similarity_score)
    except Exception as e:
        print(f"Error calculating similarity: {e}")
        return 0.0

def evaluate_panel_response(response_text: str, benchmark_answer: str) -> dict:
    """
    Evaluates a single panel response against the benchmark answer.
    Returns similarity and correctness scores (using similarity as a proxy for correctness).
    """
    # Use semantic similarity for scoring
    similarity = calculate_similarity(response_text, benchmark_answer)

    # For this example, we'll use similarity as the correctness score too.
    # A real implementation might need a different approach for correctness.
    correctness = similarity

    total = (similarity + correctness) / 2 # Simple average of the two scores

    return {
        "similarity_score": round(similarity, 4), # Round for display
        "correctness_score": round(correctness, 4),
        "total_score": round(total, 4),
    }