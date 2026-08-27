"""
Rebuild the RAG search artifacts (FAISS index + embeddings + BM25 corpus)
from the cleaned dataset.

These files are NOT committed to git because they are large
(rag_embeddings.npy + rag_faiss.index are ~145 MB each, over GitHub's
100 MB per-file limit). Run this once after cloning to enable the
AI Assistant's property search:

    python rebuild_rag.py

This takes a few minutes (embeds ~99K properties with all-MiniLM-L6-v2)
and writes into property-api/:
    rag_properties.jsonl  rag_embeddings.npy  rag_faiss.index  rag_bm25.pkl
"""

import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE, "property-api"))

from ml_engine import ManzilEngine
from rag_engine import RAGEngine


def main():
    print("Loading model + dataset ...")
    engine = ManzilEngine(BASE)
    print(f"Dataset rows: {len(engine.dataset)}")

    print("Building RAG engine (this embeds all properties, ~5 min) ...")
    rag = RAGEngine(engine.dataset, rebuild=True)

    print(f"Verified FAISS index: {rag.faiss_index.ntotal} vectors")
    print("RAG rebuild complete. You can now start the server.")


if __name__ == "__main__":
    main()
