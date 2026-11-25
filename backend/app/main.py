
from app.routes import router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.models import seed_database
from app.voice_routes import router as voice_router

app = FastAPI(
    title="Doctor Appointment AI",
    description="AI-powered doctor appointment booking system",
    version="1.0.0"
)

@app.on_event("startup")
def startup_event():
    init_db()
    seed_database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(voice_router)

@app.get("/")
def home():
    return {
        "message": "Doctor Appointment AI Backend is running!"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
