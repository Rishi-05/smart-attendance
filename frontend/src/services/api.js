import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 30000, // 30s — face processing can be slow
});

// ─── Registration ────────────────────────────────────────────
export const registerStudent = (formData) =>
  api.post("/register/student", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getAllStudents = () =>
  api.get("/register/students");

export const deleteStudent = (studentId) =>
  api.delete(`/register/student/${studentId}`);

// ─── Attendance ───────────────────────────────────────────────
export const markAttendance = (photoBlob) => {
  const formData = new FormData();
  formData.append("photo", photoBlob, "frame.jpg");
  return api.post("/attendance/mark", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getTodayAttendance = () =>
  api.get("/attendance/today");

// ─── Reports ─────────────────────────────────────────────────
export const getDashboardSummary = () =>
  api.get("/reports/summary");

export const getAttendanceByDate = (date) =>
  api.get(`/reports/date/${date}`);

export const getAttendanceRange = (start, end) =>
  api.get("/reports/range", { params: { start, end } });

export const getStudentHistory = (studentId, days = 30) =>
  api.get(`/reports/student/${studentId}`, { params: { days } });

export default api;