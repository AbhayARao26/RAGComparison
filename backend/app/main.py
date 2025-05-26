from fastapi import FastAPI, UploadFile, Form, HTTPException
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_collection()
    yield

app = FastAPI(lifespan=lifespan)

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

@app.post("/query/")
async def query(question: str = Form(...)):
    try:
        result = answer_question(question)
        return result
    except Exception as e:
        logging.exception("Query failed")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/self-query/")
async def self_query(question: str = Form(...)):
    try:
        result = self_query_rag_pipeline(question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reranker-query/")
def reranker_query(question: str = Form(...)):
    try:
        result = reranker_rag_pipeline(question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))