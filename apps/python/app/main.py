from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.db import close_pool, record_connectivity_check
from app.http_client import check_external_service
from app.schemas import ConnectivityCheckResponse


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    yield
    await close_pool()


app = FastAPI(title="ehr-sync-python", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/connectivity-check", response_model=ConnectivityCheckResponse)
async def connectivity_check() -> ConnectivityCheckResponse:
    external_ok = await check_external_service()

    try:
        await record_connectivity_check(source="python")
        db_status = "connected"
        status = "ok"
    except Exception:
        db_status = "disconnected"
        status = "error"

    return ConnectivityCheckResponse(
        status=status,
        database=db_status,
        external_service="reachable" if external_ok else "unreachable",
    )


if __name__ == "__main__":
    import uvicorn

    # Local dev entrypoint: reads PYTHON_PORT from the root .env via app.config.settings,
    # so it's the single source of truth (unlike passing --port on the CLI, which can't see .env).
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.python_port, reload=True)
