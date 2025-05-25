def chunk_text(texts, chunk_size=200, overlap=50):
    chunks = []
    for page_num, text in texts:
        if not text: continue
        words = text.split()
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i+chunk_size])
            chunks.append({"page": page_num, "text": chunk})
    return chunks