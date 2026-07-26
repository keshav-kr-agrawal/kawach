import os
import requests
import numpy as np
from app.zcql_utils import zcql_rows

# "text-embedding-004" 404s ("is not found ... or is not supported") on keys
# tied to newer accounts — confirmed 2026-07-19, same restriction pattern as
# gemini-2.5-flash. gemini-embedding-001 is the current supported model.
EMBEDDING_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")

# Call Gemini Embedding Endpoint
def get_embedding(text_content: str, api_key: str) -> list:
    if not api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:embedContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text_content}]}
    }
    
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=5)
        if res.status_code == 200:
            embedding = res.json().get("embedding", {}).get("values")
            if embedding:
                return embedding
    except Exception as e:
        print(f"[RAG] Embedding fetch error: {type(e).__name__}: {e}", flush=True)
        
    return None

# Compute Cosine Similarity
def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))

def _chunk_dict(c: dict, score: float) -> dict:
    return {
        "id": c.get("id"),
        "act": c.get("act"),
        "section": c.get("section"),
        "title": c.get("title"),
        "official_text": c.get("official_text"),
        "citizen_scenario": c.get("citizen_scenario"),
        "citizen_explanation": c.get("citizen_explanation"),
        "recommended_action": c.get("recommended_action"),
        "penalty_summary": c.get("penalty_summary"),
        "source_url": c.get("source_url"),
        "last_verified": c.get("last_verified"),
        "tags": c.get("tags") or [],
        "score": score,
    }


# Main RAG Retrieve Function
def retrieve_law_chunks(query: str, db, api_key: str = None, top_k: int = 3) -> list:
    query = query.strip()
    if not query:
        return []

    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")

    # 1. Try Vector Similarity
    query_emb = get_embedding(query, api_key)
    chunks = zcql_rows(db, "NayakLawChunk")

    if query_emb and chunks and any(c.get("embedding") is not None for c in chunks):
        print(f"[RAG] Performing vector-similarity search for: '{query}'")
        scored_chunks = []
        for c in chunks:
            if c.get("embedding") is not None:
                score = cosine_similarity(query_emb, c["embedding"])
                scored_chunks.append((score, c))
            else:
                scored_chunks.append((0.0, c))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [_chunk_dict(c, score) for score, c in scored_chunks[:top_k]]

    # 2. Keyword Search Fallback (if embeddings fail or key is missing)
    print(f"[RAG] Fallback to keyword-based search for: '{query}'")
    keywords = [kw.lower() for kw in query.split() if len(kw) > 2]

    if not keywords:
        keywords = [query.lower()]

    scored_chunks = []
    for c in chunks:
        score = 0.0
        c_title_lower = (c.get("title") or "").lower()
        c_act_lower = (c.get("act") or "").lower()
        c_tags_lower = [t.lower() for t in (c.get("tags") or [])]
        c_desc_lower = ((c.get("official_text") or "") + " " + (c.get("citizen_scenario") or "") + " " + (c.get("citizen_explanation") or "")).lower()

        for kw in keywords:
            if any(kw == t for t in c_tags_lower):
                score += 3.0
            if kw in c_title_lower:
                score += 2.0
            if kw in c_act_lower:
                score += 1.0
            if kw in c_desc_lower:
                score += 0.5

        if score > 0:
            scored_chunks.append((score, c))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)

    if not scored_chunks:
        scored_chunks = [(0.0, c) for c in chunks[:top_k]]

    return [_chunk_dict(c, score) for score, c in scored_chunks[:top_k]]
