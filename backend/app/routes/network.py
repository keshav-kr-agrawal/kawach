from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import networkx as nx
from app.database import get_db
from app.models import Offender, FIRRecord
from sqlalchemy import select

router = APIRouter()

@router.get("/graph")
def get_network_graph(min_weight: int = 1, db: Session = Depends(get_db)):
    # Fetch all offenders and their mutual links through FIRs
    offenders = db.query(Offender).all()
    firs = db.query(FIRRecord).all()
    
    # Construct NetworkX Graph
    G = nx.Graph()
    
    # Add offender nodes
    offender_map = {}
    for o in offenders:
        G.add_node(
            o.id,
            name=o.name,
            risk_score=o.risk_score,
            priors=o.num_prior_offenses
        )
        offender_map[o.id] = o
        
    # Add links for known associates
    for o in offenders:
        for assoc in o.associates:
            G.add_edge(o.id, assoc.id, weight=2)
            
    # Add links for co-accused in FIRs
    for f in firs:
        accused_ids = [a.id for a in f.accused]
        if len(accused_ids) > 1:
            for i in range(len(accused_ids)):
                for j in range(i + 1, len(accused_ids)):
                    id1, id2 = accused_ids[i], accused_ids[j]
                    if G.has_edge(id1, id2):
                        G[id1][id2]['weight'] += 1
                    else:
                        G.add_edge(id1, id2, weight=1)
                        
    # Filter by min_weight edge filter to keep graph clean
    filtered_edges = [(u, v, d) for u, v, d in G.edges(data=True) if d['weight'] >= min_weight]
    
    # Create new graph with filtered edges to compute metrics
    F = nx.Graph()
    F.add_nodes_from(G.nodes(data=True))
    F.add_edges_from(filtered_edges)
    
    # Keep only nodes with degree > 0 for demo visual clarity (unless they have high risk score)
    nodes_to_keep = [n for n in F.nodes() if F.degree(n) > 0 or (G.nodes[n].get('priors', 0) > 4)]
    F = F.subgraph(nodes_to_keep).copy()
    
    if len(F.nodes()) == 0:
        return {"nodes": [], "links": []}
        
    # Calculate Centrality and PageRank
    try:
        deg_centrality = nx.degree_centrality(F)
        betweenness = nx.betweenness_centrality(F)
        pagerank = nx.pagerank(F, alpha=0.85)
    except Exception:
        deg_centrality = {n: 0.0 for n in F.nodes()}
        betweenness = {n: 0.0 for n in F.nodes()}
        pagerank = {n: 0.0 for n in F.nodes()}
        
    # Louvain Community Detection
    try:
        from networkx.algorithms.community import louvain_communities
        communities = list(louvain_communities(F))
        community_map = {}
        for c_idx, comm in enumerate(communities):
            for node in comm:
                community_map[node] = c_idx
    except Exception:
        community_map = {n: 0 for n in F.nodes()}
        
    # Format nodes
    nodes_res = []
    for n_id, data in F.nodes(data=True):
        nodes_res.append({
            "id": n_id,
            "name": data.get("name"),
            "risk_score": data.get("risk_score", 0.0),
            "priors": data.get("priors", 0),
            "degree_centrality": round(float(deg_centrality.get(n_id, 0.0)), 4),
            "betweenness_centrality": round(float(betweenness.get(n_id, 0.0)), 4),
            "pagerank": round(float(pagerank.get(n_id, 0.0)), 4),
            "community_id": community_map.get(n_id, 0)
        })
        
    # Format edges
    links_res = []
    for u, v, data in F.edges(data=True):
        links_res.append({
            "source": u,
            "target": v,
            "weight": data.get("weight", 1)
        })
        
    return {
        "nodes": nodes_res,
        "links": links_res
    }
