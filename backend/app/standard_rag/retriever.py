from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct

qdrant = QdrantClient(host="localhost", port=6333)

def create_collection():
    qdrant.recreate_collection(
        collection_name="pdf_chunks",
        vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    )

def upload_embeddings(chunks):
    points = [
        PointStruct(id=i, vector=c['embedding'], payload={"text": c['text'], "page": c['page']})
        for i, c in enumerate(chunks)
    ]
    qdrant.upsert(collection_name="pdf_chunks", points=points)

def retrieve_similar(query_embedding, k=3):
    results = qdrant.search(
        collection_name="pdf_chunks",
        query_vector=query_embedding,
        limit=k
    )
    return results