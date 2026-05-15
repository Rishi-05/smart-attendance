from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, timedelta

from app.database.db import get_db
from app.models.student import Student
from app.models.attendance import Attendance

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/date/{target_date}")
def attendance_by_date(target_date: str, db: Session = Depends(get_db)):
    """Get full attendance report for a specific date. Format: YYYY-MM-DD"""
    try:
        d = date.fromisoformat(target_date)
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD"}

    total_students = db.query(Student).count()

    records = (
        db.query(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Attendance.date == d)
        .order_by(Student.name)
        .all()
    )

    present_ids = {s.id for _, s in records}

    # Get absent students
    all_students = db.query(Student).all()
    absent = [s for s in all_students if s.id not in present_ids]

    return {
        "date": str(d),
        "total_students": total_students,
        "present_count": len(records),
        "absent_count": len(absent),
        "attendance_percentage": round(
            (len(records) / total_students * 100) if total_students > 0 else 0, 1
        ),
        "present": [
            {
                "student_id": s.id,
                "name": s.name,
                "roll_number": s.roll_number,
                "marked_at": a.marked_at,
            }
            for a, s in records
        ],
        "absent": [
            {"student_id": s.id, "name": s.name, "roll_number": s.roll_number}
            for s in absent
        ],
    }


@router.get("/range")
def attendance_by_range(
    start: str = Query(..., description="Start date YYYY-MM-DD"),
    end: str = Query(..., description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """Attendance summary for a date range — used by dashboard charts."""
    try:
        start_date = date.fromisoformat(start)
        end_date   = date.fromisoformat(end)
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD"}

    rows = (
        db.query(
            Attendance.date,
            func.count(Attendance.id).label("present_count")
        )
        .filter(
            and_(
                Attendance.date >= start_date,
                Attendance.date <= end_date,
            )
        )
        .group_by(Attendance.date)
        .order_by(Attendance.date)
        .all()
    )

    total_students = db.query(Student).count()

    return {
        "start": str(start_date),
        "end": str(end_date),
        "total_students": total_students,
        "daily": [
            {
                "date": str(r.date),
                "present": r.present_count,
                "absent": total_students - r.present_count,
                "percentage": round(
                    (r.present_count / total_students * 100) if total_students > 0 else 0, 1
                ),
            }
            for r in rows
        ],
    }


@router.get("/student/{student_id}")
def student_attendance_history(
    student_id: int,
    days: int = Query(30, description="How many past days to fetch"),
    db: Session = Depends(get_db),
):
    """Full attendance history for one student."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return {"error": "Student not found"}

    since = date.today() - timedelta(days=days)

    records = (
        db.query(Attendance)
        .filter(
            and_(
                Attendance.student_id == student_id,
                Attendance.date >= since,
            )
        )
        .order_by(Attendance.date.desc())
        .all()
    )

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "roll_number": student.roll_number,
        },
        "period_days": days,
        "days_present": len(records),
        "attendance_percentage": round(
            (len(records) / days * 100), 1
        ),
        "records": [
            {"date": str(r.date), "marked_at": r.marked_at, "status": r.status}
            for r in records
        ],
    }


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    """Quick summary card data for the dashboard homepage."""
    today = date.today()
    total_students  = db.query(Student).count()
    present_today   = db.query(Attendance).filter(Attendance.date == today).count()

    # Last 7 days average
    week_ago = today - timedelta(days=7)
    week_records = (
        db.query(Attendance.date, func.count().label("cnt"))
        .filter(Attendance.date >= week_ago)
        .group_by(Attendance.date)
        .all()
    )
    week_avg = (
        round(sum(r.cnt for r in week_records) / len(week_records), 1)
        if week_records else 0
    )

    return {
        "total_students": total_students,
        "present_today": present_today,
        "absent_today": total_students - present_today,
        "attendance_today_pct": round(
            (present_today / total_students * 100) if total_students > 0 else 0, 1
        ),
        "week_daily_average": week_avg,
        "date": str(today),
    }