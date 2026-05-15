from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.db import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Attendance API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
from app.routers import register, attendance, reports
app.include_router(register.router)
app.include_router(attendance.router)
app.include_router(reports.router)

@app.on_event("startup")
async def load_ai_models():
    from app.services.face_pipeline import face_pipeline
    print("✓ InsightFace model loaded")

@app.get("/")
def root():
    return {"message": "Smart Attendance API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}