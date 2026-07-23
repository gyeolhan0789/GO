from fastapi import FastAPI

from app.api.mission import router as mission_router

app = FastAPI(
    title="AI Mission Server"
)

app.include_router(mission_router)