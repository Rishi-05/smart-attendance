import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List

from app.database.db import get_db
from app.models.student import Student
from app.services.face_pipeline import face_pipeline
from app.services.faiss_store import faiss_store

router = APIRouter(prefix="/register", tags=["Registration"])


@router.post("/student")
async def register_student(
    name: str = Form(...),
    roll_number: str = Form(...),
    email: str = Form(None),
    photos: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """
    Register a new student with 3-5 face photos.
    Accepts multipart/form-data with name, roll_number, and photo files.
    """

    # 1. Check roll number not already registered
    existing = db.query(Student).filter(
        Student.roll_number == roll_number
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Roll number {roll_number} is already registered."
        )

    # 2. Decode uploaded images
    images = []
    for photo in photos:
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            images.append(img)

    if len(images) == 0:
        raise HTTPException(
            status_code=400,
            detail="No valid images received."
        )

    # 3. Save student to PostgreSQL first to get the ID
    student = Student(
        name=name,
        roll_number=roll_number,
        email=email,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # 4. Extract embeddings and store in FAISS
    result = face_pipeline.register_student(student.id, images)

    if not result["success"]:
        # Rollback the student record if face registration failed
        db.delete(student)
        db.commit()
        raise HTTPException(status_code=422, detail=result["message"])

    return {
        "success": True,
        "student_id": student.id,
        "name": student.name,
        "roll_number": student.roll_number,
        "embeddings_used": result["embeddings_used"],
        "message": f"Student {name} registered successfully!",
    }


@router.get("/students")
def get_all_students(db: Session = Depends(get_db)):
    """Return list of all registered students."""
    students = db.query(Student).order_by(Student.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "roll_number": s.roll_number,
            "email": s.email,
            "registered_at": s.created_at,
        }
        for s in students
    ]


@router.delete("/student/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    """Delete a student from PostgreSQL and remove their FAISS embeddings."""
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Remove from FAISS first
    faiss_store.delete_student(student_id)

    # Then remove from DB (cascades to attendance records)
    db.delete(student)
    db.commit()

    return {"success": True, "message": f"Student {student.name} deleted."}