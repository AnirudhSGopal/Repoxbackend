from __future__ import annotations

import logging
import threading
from typing import Optional

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import delete, func, select

from app.models.base import AsyncSessionLocal
from app.models.vector_chunk import CodeChunk

logger = logging.getLogger("prguard")

_embedding_model = None
_embedding_lock = threading.Lock()


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        with _embedding_lock:
            if _embedding_model is None:
                from sentence_transformers import SentenceTransformer

                logger.info("[RAG] Loading embedding model all-MiniLM-L6-v2")
                _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def _chunk_python(content: str, path: str) -> list[dict]:
    lines = content.split("\n")
    chunks: list[dict] = []
    current_chunk_lines: list[str] = []
    current_start = 0
    in_chunk = False

    for i, line in enumerate(lines):
        stripped = line.strip()
        is_definition = stripped.startswith("def ") or stripped.startswith("async def ") or stripped.startswith("class ")

        if is_definition and in_chunk and current_chunk_lines:
            chunk_content = "\n".join(current_chunk_lines).strip()
            if chunk_content:
                chunks.append(
                    {
                        "content": chunk_content,
                        "path": path,
                        "start_line": current_start + 1,
                        "end_line": i,
                        "language": "python",
                    }
                )
            current_chunk_lines = [line]
            current_start = i
        else:
            if is_definition:
                in_chunk = True
                current_start = i
            current_chunk_lines.append(line)

    if current_chunk_lines:
        chunk_content = "\n".join(current_chunk_lines).strip()
        if chunk_content:
            chunks.append(
                {
                    "content": chunk_content,
                    "path": path,
                    "start_line": current_start + 1,
                    "end_line": len(lines),
                    "language": "python",
                }
            )

    if not chunks:
        chunks.append(
            {
                "content": content.strip(),
                "path": path,
                "start_line": 1,
                "end_line": len(lines),
                "language": "python",
            }
        )

    return chunks


def _chunk_by_lines(content: str, path: str, language: str, chunk_size: int = 60, overlap: int = 10) -> list[dict]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be > 0")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be >= 0 and < chunk_size")

    lines = content.split("\n")
    chunks: list[dict] = []
    step = chunk_size - overlap
    start = 0

    while start < len(lines):
        end = min(start + chunk_size, len(lines))
        chunk_content = "\n".join(lines[start:end]).strip()
        if chunk_content:
            chunks.append(
                {
                    "content": chunk_content,
                    "path": path,
                    "start_line": start + 1,
                    "end_line": end,
                    "language": language,
                }
            )
        start += step

    return chunks


def chunk_code(content: str, path: str, language: str) -> list[dict]:
    if language == "python":
        return _chunk_python(content, path)
    return _chunk_by_lines(content, path, language)


def embed(texts: list[str]) -> list[list[float]]:
    return _get_embedding_model().encode(texts, show_progress_bar=False).tolist()


async def ensure_vector_store() -> None:
    # Schema and extension setup are handled during startup DB initialization.
    return None


async def index_repo(repo: str, files: list[dict]) -> dict:
    all_chunks: list[dict] = []
    for file in files:
        all_chunks.extend(chunk_code(file["content"], file["path"], file["language"]))

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await session.execute(delete(CodeChunk).where(CodeChunk.repo_name == repo))

            if not all_chunks:
                return {"indexed": 0, "chunks": 0, "repo": repo}

            batch_size = 256
            total_indexed = 0

            for i in range(0, len(all_chunks), batch_size):
                batch = all_chunks[i : i + batch_size]
                vectors = await run_in_threadpool(lambda: embed([c["content"] for c in batch]))

                session.add_all(
                    [
                        CodeChunk(
                            repo_name=repo,
                            path=chunk["path"],
                            language=chunk["language"],
                            start_line=chunk["start_line"],
                            end_line=chunk["end_line"],
                            content=chunk["content"],
                            embedding=vector,
                        )
                        for chunk, vector in zip(batch, vectors)
                    ]
                )
                total_indexed += len(batch)

    return {"repo": repo, "files": len(files), "chunks": total_indexed, "indexed": True}


async def retrieve(repo: str, query: str, n_results: int = 8, language_filter: Optional[str] = None) -> list[dict]:
    query_vector = await run_in_threadpool(lambda: embed([query])[0])

    async with AsyncSessionLocal() as session:
        count_stmt = select(func.count(CodeChunk.id)).where(CodeChunk.repo_name == repo)
        if language_filter:
            count_stmt = count_stmt.where(CodeChunk.language == language_filter)
        count = int((await session.execute(count_stmt)).scalar() or 0)
        if count == 0:
            return []

        distance_expr = CodeChunk.embedding.cosine_distance(query_vector)
        stmt = (
            select(CodeChunk, distance_expr.label("distance"))
            .where(CodeChunk.repo_name == repo)
            .order_by(distance_expr)
            .limit(min(n_results, count))
        )
        if language_filter:
            stmt = stmt.where(CodeChunk.language == language_filter)

        rows = (await session.execute(stmt)).all()

    results: list[dict] = []
    for chunk, distance in rows:
        similarity = round(1 / (1 + float(distance or 0.0)), 3)
        results.append(
            {
                "content": chunk.content,
                "path": chunk.path,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "language": chunk.language,
                "similarity": similarity,
            }
        )

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results


def format_chunks_for_prompt(chunks: list[dict]) -> str:
    if not chunks:
        return "No relevant code found."
    return "\n\n".join(
        [
            f"--- {chunk['path']} (lines {chunk['start_line']}-{chunk['end_line']}) ---\n{chunk['content']}"
            for chunk in chunks
        ]
    )


async def is_indexed(repo: str) -> bool:
    try:
        async with AsyncSessionLocal() as session:
            count = (
                await session.execute(select(func.count(CodeChunk.id)).where(CodeChunk.repo_name == repo))
            ).scalar() or 0
            return int(count) > 0
    except Exception:
        logger.exception("Failed to check index status for repo=%s", repo)
        return False


async def get_index_stats(repo: str) -> dict:
    try:
        async with AsyncSessionLocal() as session:
            count = (
                await session.execute(select(func.count(CodeChunk.id)).where(CodeChunk.repo_name == repo))
            ).scalar() or 0
            count = int(count)
            return {"repo": repo, "chunks": count, "indexed": count > 0}
    except Exception as exc:
        logger.exception("Failed to get index stats for repo=%s: %s", repo, exc)
        return {"repo": repo, "chunks": 0, "indexed": False}
