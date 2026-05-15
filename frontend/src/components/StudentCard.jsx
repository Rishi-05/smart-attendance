import { deleteStudent } from "../services/api";
import { useState } from "react";

export default function StudentCard({ student, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    setLoading(true);
    try {
      await deleteStudent(student.id);
      onDeleted(student.id);
    } catch {
      alert("Failed to delete student.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "#2d2660", color: "#a89cf7",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "1rem",
        }}>
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{student.name}</div>
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
            {student.roll_number}
            {student.email && ` · ${student.email}`}
          </div>
        </div>
      </div>

      <button
        className={confirming ? "btn btn-danger" : "btn btn-ghost"}
        onClick={handleDelete}
        disabled={loading}
        style={{ fontSize: "0.82rem", padding: "0.35rem 0.9rem" }}
      >
        {loading ? "Deleting…" : confirming ? "Confirm delete?" : "Delete"}
      </button>
    </div>
  );
}