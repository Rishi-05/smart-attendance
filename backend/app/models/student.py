from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database.db import Base

class Student(Base):
    __tablename__ = "students"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False)
    roll_number = Column(String(50), unique=True, nullable=False)
    email       = Column(String(150), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())