"""
main.py — FastAPI entry point
PERSONALIZED LEARNING AI — Personalized Learning Assistant
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from routes.auth import router as auth_router
from routes.learning import router as learning_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events."""
    print(f"🚀 PERSONALIZED LEARNING AI API starting on port {settings.PORT}")
    print(f"   Environment: {settings.ENVIRONMENT}")
    yield
    print("🛑 PERSONALIZED LEARNING AI API shutting down")


app = FastAPI(
    title="PERSONALIZED LEARNING AI API",
    description="Personalized Learning AI Assistant powered by Gemini",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──
app.include_router(auth_router,     prefix="/auth",     tags=["Authentication"])
app.include_router(learning_router, prefix="/learning", tags=["Learning"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "PERSONALIZED LEARNING AI API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
