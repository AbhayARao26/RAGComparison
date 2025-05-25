from fastapi import FastAPI, UploadFile, Form, HTTPException
from contextlib import asynccontextmanager
from app.utils.pdf_parser import extract_text_from_pdf
from app.standard_rag.chunker import chunk_text
from app.standard_rag.embedder import embed_chunks
from app.standard_rag.retriever import create_collection, upload_embeddings
from app.standard_rag.query import answer_question
import logging
import tempfile

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_collection()
    yield

app = FastAPI(lifespan=lifespan)

@app.post("/upload/")
async def upload_pdf(file: UploadFile):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file.read())
        texts = extract_text_from_pdf(tmp.name)
        chunks = chunk_text(texts)
        embedded = embed_chunks(chunks)
        upload_embeddings(embedded)
    return {"message": "PDF processed and indexed"}

@app.post("/query/")
async def query(question: str = Form(...)):
    try:
        result = answer_question(question)
        return result
    except Exception as e:
        logging.exception("Query failed")
        raise HTTPException(status_code=500, detail=str(e))