# Smart Attendance System

An AI-powered real-time attendance system using face recognition.

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Live Attendance
![Live Attendance](screenshots/live_attendance.png)

### Register Student — Webcam
![Register Webcam](screenshots/register_cam.png)

### Register Student — Upload Photos
![Register Upload](screenshots/register_upload.png)

## Tech Stack
- **Frontend** — React + Vite
- **Backend** — FastAPI
- **Database** — PostgreSQL
- **Face Recognition** — InsightFace (ArcFace)
- **Vector Search** — FAISS
- **Liveness Detection** — MediaPipe

## Features
- Register students via webcam or photo upload
- Live face recognition every 2.5 seconds
- Automatic attendance marking (once per day per student)
- Dashboard with 7-day attendance chart
- Prevents duplicate attendance

## Setup

### Backend
```bash
cd backend
py -3.11 -m venv venv
venv\Scripts\Activate
pip install -r requirements.txt
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database
```sql
CREATE DATABASE attendance_db;
\c attendance_db
\i backend/app/database/schema.sql
```

## Environment Variables
Create `backend/.env`:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/attendance_db
```
