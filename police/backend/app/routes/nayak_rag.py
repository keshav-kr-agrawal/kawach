import os
import requests
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from app.models import NayakLawChunk

# Call Gemini Embedding Endpoint
def get_embedding(text_content: str, api_key: str) -> list:
    if not api_key:
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": text_content}]}
    }
    
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=5)
        if res.status_code == 200:
            embedding = res.json().get("embedding", {}).get("values")
            if embedding:
                return embedding
    except Exception as e:
        print(f"[RAG] Embedding fetch error: {e}")
        
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

# Main RAG Retrieve Function
def retrieve_law_chunks(query: str, db: Session, api_key: str = None, top_k: int = 3) -> list:
    query = query.strip()
    if not query:
        return []
        
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
        
    # 1. Try Vector Similarity
    query_emb = get_embedding(query, api_key)
    chunks = db.query(NayakLawChunk).all()
    
    if query_emb and chunks and any(c.embedding is not None for c in chunks):
        print(f"[RAG] Performing vector-similarity search for: '{query}'")
        scored_chunks = []
        for c in chunks:
            if c.embedding is not None:
                score = cosine_similarity(query_emb, c.embedding)
                scored_chunks.append((score, c))
            else:
                scored_chunks.append((0.0, c))
                
        # Sort by score descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, c in scored_chunks[:top_k]:
            results.append({
                "id": c.id,
                "act": c.act,
                "section": c.section,
                "title": c.title,
                "official_text": c.official_text,
                "citizen_scenario": c.citizen_scenario,
                "citizen_explanation": c.citizen_explanation,
                "recommended_action": c.recommended_action,
                "penalty_summary": c.penalty_summary,
                "source_url": c.source_url,
                "last_verified": c.last_verified,
                "tags": c.tags,
                "score": score
            })
        return results
        
    # 2. Keyword Search Fallback (if embeddings fail or key is missing)
    print(f"[RAG] Fallback to keyword-based search for: '{query}'")
    keywords = [kw.lower() for kw in query.split() if len(kw) > 2]
    
    if not keywords:
        # Default to checking simple query containment
        keywords = [query.lower()]
        
    scored_chunks = []
    for c in chunks:
        score = 0.0
        c_title_lower = c.title.lower()
        c_act_lower = c.act.lower()
        c_tags_lower = [t.lower() for t in c.tags]
        c_desc_lower = c.official_text.lower() + " " + c.citizen_scenario.lower() + " " + c.citizen_explanation.lower()
        
        for kw in keywords:
            # Exact matches on tags, titles give higher weight
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
            
    # Sort by score descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    # If no keyword matches, return the first top_k chunks as default fallback
    if not scored_chunks:
        scored_chunks = [(0.0, c) for c in chunks[:top_k]]
        
    results = []
    for score, c in scored_chunks[:top_k]:
        results.append({
            "id": c.id,
            "act": c.act,
            "section": c.section,
            "title": c.title,
            "official_text": c.official_text,
            "citizen_scenario": c.citizen_scenario,
            "citizen_explanation": c.citizen_explanation,
            "recommended_action": c.recommended_action,
            "penalty_summary": c.penalty_summary,
            "source_url": c.source_url,
            "last_verified": c.last_verified,
            "tags": c.tags,
            "score": score
        })
    return results
