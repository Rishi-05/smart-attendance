import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date

from app.database.db import get_db
from app.models.student import Student
from app.models.attendance import Attendance
from app.services.face_pipeline import face_pipeline

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/mark")
async def mark_attendance(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Core endpoint — receives one webcam frame,
    identifies the face, marks attendance if not already marked today.
    """

    # 1. Decode the uploaded frame
    contents = await photo.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image data.")

    # 2. Run face identification
    result = face_pipeline.identify_face(frame)

    if not result["identified"]:
        return {
            "success": False,
            "identified": False,
            "message": result["message"],
            "confidence": result["confidence"],
        }

    student_id = result["student_id"]

    # 3. Fetch student details
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        return {
            "success": False,
            "identified": False,
            "message": "Matched FAISS entry but student not in database.",
        }

    # 4. Check if already marked today
    today = date.today()
    already_marked = db.query(Attendance).filter(
        and_(
            Attendance.student_id == student_id,
            Attendance.date == today,
        )
    ).first()

    if already_marked:
        return {
            "success": True,
            "identified": True,
            "already_marked": True,
            "student_id": student.id,
            "name": student.name,
            "roll_number": student.roll_number,
            "confidence": result["confidence"],
            "message": f"{student.name} already marked present today.",
        }

    # 5. Mark attendance
    record = Attendance(
        student_id=student_id,
        date=today,
        status="present",
    )
    db.add(record)
    db.commit()

    return {
        "success": True,
        "identified": True,
        "already_marked": False,
        "student_id": student.id,
        "name": student.name,
        "roll_number": student.roll_number,
        "confidence": result["confidence"],
        "message": f"✓ {student.name} | {student.roll_number} | Attendance Marked",
    }


@router.get("/today")
def get_today_attendance(db: Session = Depends(get_db)):
    """Get all students marked present today."""
    today = date.today()

    records = (
        db.query(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Attendance.date == today)
        .order_by(Attendance.marked_at.desc())
        .all()
    )

    return {
        "date": str(today),
        "total": len(records),
        "records": [
            {
                "attendance_id": a.id,
                "student_id": s.id,
                "name": s.name,
                "roll_number": s.roll_number,
                "marked_at": a.marked_at,
                "status": a.status,
            }
            for a, s in records
        ],
    }


@router.get("/status/{student_id}")
def get_student_status(student_id: int, db: Session = Depends(get_db)):
    """Check if a specific student is marked present today."""
    today = date.today()
    record = db.query(Attendance).filter(
        and_(
            Attendance.student_id == student_id,
            Attendance.date == today,
        )
    ).first()

    return {
        "student_id": student_id,
        "date": str(today),
        "present": record is not None,
        "marked_at": record.marked_at if record else None,
    }