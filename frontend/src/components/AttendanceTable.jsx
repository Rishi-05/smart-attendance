export default function AttendanceTable({ records, showDate = false }) {
  if (!records || records.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
        No attendance records found.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Roll Number</th>
            {showDate && <th>Date</th>}
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.attendance_id || r.student_id}>
              <td style={{ fontWeight: 500, color: "#e2e8f0" }}>{r.name}</td>
              <td>
                <span className="badge badge-purple">{r.roll_number}</span>
              </td>
              {showDate && <td>{r.date}</td>}
              <td style={{ color: "#64748b", fontSize: "0.85rem" }}>
                {r.marked_at
                  ? new Date(r.marked_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit",
                    })
                  : "—"}
              </td>
              <td>
                <span className="badge badge-green">Present</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}