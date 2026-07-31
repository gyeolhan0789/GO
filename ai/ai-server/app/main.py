import logging
from fastapi import FastAPI

from app.api.mission import router as mission_router

logging.basicConfig(
    level=logging.INFO
)

app = FastAPI(
    title="AI Mission Server"
)

app.include_router(mission_router)