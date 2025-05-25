from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_chunks(chunks):
    texts = [c['text'] for c in chunks]
    embeddings = model.encode(texts).tolist()
    for i, emb in enumerate(embeddings):
        chunks[i]['embedding'] = emb
    return chunks