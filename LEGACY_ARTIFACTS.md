# Legacy Artifacts Documentation

This document explains historical artifacts in the codebase that are no longer used but are kept for reference.

## chroma_db/ Directory

**Status**: OBSOLETE (do not use)

### What It Is
Directory containing ChromaDB vector store artifacts (SQLite database + collection files):
- `chroma_db/chroma.sqlite3` - local ChromaDB database
- `chroma_db/*/` - ChromaDB collection metadata

### Why It Exists
Earlier versions of PRGuard used ChromaDB for vector storage with semantic search. This directory was created during development and testing.

### Why It's No Longer Used
The system was refactored to use **PostgreSQL pgvector** instead:

| Aspect | ChromaDB (Old) | pgvector (Current) |
|--------|----------------|-------------------|
| **Location** | Local SQLite file | PostgreSQL table |
| **Deployment** | Requires file persistence | Database handles persistence |
| **Production Viability** | Limited (single-instance) | Excellent (multi-instance safe) |
| **Integration** | Separate system | Native database integration |
| **Scaling** | Manual sync needed | Built-in replication |

### What Changed
- **embeddings** now stored in `code_chunks` table with pgvector type
- **Retrieval** uses PostgreSQL cosine distance operator (`<->`)
- **Setup** automated via SQLAlchemy models (no external tool needed)

### Can I Delete It?
**Yes**, this directory can be safely deleted:
- No code references it
- Not part of initialization
- Not required for any functionality

### Should I Keep It?
You may keep it for:
- **Historical reference** during maintenance/troubleshooting
- **Backwards compatibility** if rolling back to older versions

Recommended: Delete after confirming pgvector is working in production.

---

## Related Documentation

- [INFRASTRUCTURE_AUDIT_REPORT.md](INFRASTRUCTURE_AUDIT_REPORT.md) - Full system audit
- [backend/app/services/rag.py](backend/app/services/rag.py) - Current RAG implementation using pgvector
- [backend/workers/review_worker.py](backend/workers/review_worker.py) - How RAG is used in PR reviews

