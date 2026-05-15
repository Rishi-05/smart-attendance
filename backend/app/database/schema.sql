CREATE TABLE IF NOT EXISTS students (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    roll_number VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(150),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
    marked_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date        DATE DEFAULT CURRENT_DATE,
    status      VARCHAR(20) DEFAULT 'present',

    UNIQUE(student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);