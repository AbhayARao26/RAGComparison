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
import logging
import tempfile
from pydantic import BaseModel

# Define a Pydantic model for the chat request body
class ChatRequest(BaseModel):
    rag_type: str
    model_id: str
    message: str

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
            texts = extract_text_from_pdf(tmp.name)
            chunks = chunk_text(texts)
            embedded = embed_chunks(chunks)
            upload_embeddings(embedded)
        return {"message": "PDF processed and indexed"}
    except Exception as e:
        logging.exception("PDF upload failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
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