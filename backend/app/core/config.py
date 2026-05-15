from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/attendance_db"

    FAISS_INDEX_PATH: str = "faiss_index.bin"
    FAISS_LABELS_PATH: str = "faiss_labels.json"

    SIMILARITY_THRESHOLD: float = 0.5

    CAPTURE_COUNT: int = 5

    class Config:
        env_file = ".env"

settings = Settings()