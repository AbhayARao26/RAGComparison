from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.utils.OCR import extract_text_from_pdf
from app.rag.chunker import chunk_text
from app.rag.embedder import embed_chunks
from app.rag.retriever import create_collection, upload_embeddings
from app.rag.query import answer_question
from app.rag.self_query import self_query_rag_pipeline
from app.rag.reranker_rag import reranker_rag_pipeline
from app.benchmarking.gemini_benchmark import generate_benchmark_answer
from app.benchmarking.evaluator import evaluate_panel_response
import logging
import tempfile
from pydantic import BaseModel

# --- Global/In-Memory Storage for Benchmark Data (for demonstration) ---
# In a real app, manage this per user session or document upload
benchmark_data = {
    "pdf_text": "",
    "query": "", # Store the last query for which responses were generated
    "benchmark_answer": "",
}

# Define a Pydantic model for the chat request body
class ChatRequest(BaseModel):
    rag_type: str
    model_id: str
    message: str

class EvaluationRequest(BaseModel):
    # Assuming the frontend sends a list of panel outputs
    panel_outputs: list[dict] # e.g., [{"id": 1, "response": "..."}]

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_collection()
    yield

app = FastAPI(lifespan=lifespan)

# Add CORS middleware
origins = [
    "http://localhost:3000",  # Allow requests from your Next.js frontend
    # Add other origins if needed (e.g., production frontend URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allows all headers
)

@app.post("/upload/")
async def upload_pdf(file: UploadFile):
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            # Assuming extract_text_from_pdf returns [(page_num, text)]
            texts_with_pages = extract_text_from_pdf(tmp.name)
            # Join text from all pages for benchmark
            full_text = "\n".join([text for page_num, text in texts_with_pages])
            benchmark_data["pdf_text"] = full_text # Store the full text

            chunks = chunk_text(texts_with_pages) # Chunk the original [(page_num, text)] format
            embedded = embed_chunks(chunks)
            upload_embeddings(embedded)
        return {"message": "PDF processed and indexed"}
    except Exception as e:
        logging.exception("PDF upload failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Store the query for benchmarking
        benchmark_data["query"] = request.message
        benchmark_data["benchmark_answer"] = "" # Clear previous benchmark answer

        # Route based on RAG type
        if request.rag_type == 'basic':
            # Call the basic RAG function (currently uses Groq)
            # In a more advanced version, pass request.model_id here
            result = answer_question(request.message)
        elif request.rag_type == 'self-query':
             # Call the self-query RAG function (currently uses Gemini)
            # In a more advanced version, pass request.model_id here
            result = self_query_rag_pipeline(request.message)
        elif request.rag_type == 'reranker':
            # Call the reranker RAG function (currently uses Gemini + Jina)
            # In a more advanced version, pass request.model_id here
            result = reranker_rag_pipeline(request.message)
        else:
            raise HTTPException(status_code=400, detail="Invalid RAG type")

        # The structure of 'result' depends on the RAG function called.
        # You might need to standardize the output format if they differ.
        return result

    except Exception as e:
        logging.exception(f"Chat request failed for RAG type {request.rag_type} and model {request.model_id}")
        raise HTTPException(status_code=500, detail=str(e))
    
# New endpoint for evaluation
@app.post("/evaluate")
async def evaluate_responses(request: EvaluationRequest):
    if not benchmark_data["pdf_text"] or not benchmark_data["query"]:
        raise HTTPException(status_code=400, detail="PDF or query not available for benchmarking.")

    # Generate benchmark answer if not already generated for this query
    # In a real app, you'd check if query/pdf_text changed before regenerating
    if not benchmark_data["benchmark_answer"]:
         benchmark_data["benchmark_answer"] = generate_benchmark_answer(
             benchmark_data["pdf_text"],
             benchmark_data["query"]
         )

    benchmark_answer = benchmark_data["benchmark_answer"]
    evaluation_results = []

    logging.info(f"Benchmark Answer: {benchmark_answer[:200]}...") # Log start of benchmark answer
    print(f"DEBUG: Received {len(request.panel_outputs)} panel outputs for evaluation.") # Add print statement before loop

    best_score = -1
    best_panel_id = None

    for panel_output in request.panel_outputs:
        panel_id = panel_output.get("id")
        response_text = panel_output.get("response", "")

        logging.info(f"Panel {panel_id} Response: {response_text[:200]}...") # Log start of panel response
        print(f"DEBUG: Evaluating Panel {panel_id} with response: {response_text[:200]}...") # Add print statement inside loop

        # --- Use the new evaluation function ---
        scores = evaluate_panel_response(response_text, benchmark_answer)
        # --- End use of new evaluation function ---

        logging.info(f"Panel {panel_id} Scores: Similarity={scores['similarity_score']}, Correctness={scores['correctness_score']}, Total={scores['total_score']}") # Log calculated scores
        print(f"DEBUG: Panel {panel_id} Calculated Scores: Sim={scores['similarity_score']}, Corr={scores['correctness_score']}, Total={scores['total_score']}") # Add print statement for scores

        evaluation_results.append({
            "id": panel_id,
            "similarity_score": scores["similarity_score"],
            "correctness_score": scores["correctness_score"],
            "total_score": scores["total_score"],
        })

        if scores["total_score"] > best_score:
            best_score = scores["total_score"]
            best_panel_id = panel_id

    return {
        "scores": evaluation_results,
        "best_panel_id": best_panel_id,
        "benchmark_answer": benchmark_answer # Optionally return benchmark answer for comparison view
    }
    # --- End Evaluation Logic ---