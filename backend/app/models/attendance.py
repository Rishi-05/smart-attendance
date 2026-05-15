from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.db import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    marked_at  = Column(DateTime(timezone=True), server_default=func.now())
    date       = Column(Date, server_default=func.current_date())
    status     = Column(String(20), default="present")

    student = relationship("Student", backref="attendance_records")