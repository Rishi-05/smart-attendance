import { useEffect, useState } from "react";
import { getDashboardSummary, getAttendanceByDate, getAttendanceRange } from "../services/api";
import AttendanceTable from "../components/AttendanceTable";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Dashboard() {
  const [summary,    setSummary]    = useState(null);
  const [todayRecs,  setTodayRecs]  = useState([]);
  const [chartData,  setChartData]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Use local date string, not UTC
      const todayLocal = new Date();
      const fmt = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      const today   = fmt(todayLocal);
      const weekAgo = fmt(new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate() - 6));

      const [sumRes, todayRes, rangeRes] = await Promise.all([
        getDashboardSummary(),
        getAttendanceByDate(today),
        getAttendanceRange(weekAgo, today),
      ]);

      setSummary(sumRes.data);
      setTodayRecs(todayRes.data.present || []);
      setChartData(rangeRes.data.daily || []);
    } catch (err) {
      console.error("Dashboard load failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>Loading dashboard…</div>;
  }

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

      {/* Stat cards */}
      {summary && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Students</div>
            <div className="stat-value purple">{summary.total_students}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Present Today</div>
            <div className="stat-value green">{summary.present_today}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Absent Today</div>
            <div className="stat-value amber">{summary.absent_today}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Attendance %</div>
            <div className="stat-value" style={{ color: summary.attendance_today_pct >= 75 ? "#4ade80" : "#f87171" }}>
              {summary.attendance_today_pct}%
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">7-day avg</div>
            <div className="stat-value purple">{summary.week_daily_average}</div>
            <div className="stat-sub">students/day</div>
          </div>
        </div>
      )}

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#e2e8f0" }}>Last 7 Days</h2>
              <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                Students present per day
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "0.8rem", color: "#64748b" }}>
              <span>Total registered: <strong style={{ color: "#e2e8f0" }}>{summary?.total_students ?? 0}</strong></span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={chartData}
              barSize={36}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(d) => {
                  const dt = new Date(d + "T00:00:00");
                  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                }}
                axisLine={{ stroke: "#2d3148" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                domain={[0, summary?.total_students || "auto"]}
                label={{
                  value: "Students Present",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: "#475569", fontSize: 11 },
                }}
              />
              <Tooltip
                cursor={{ fill: "#1e2235" }}
                contentStyle={{
                  background: "#1a1d27",
                  border: "1px solid #2d3148",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                }}
                labelStyle={{ color: "#94a3b8", marginBottom: "0.25rem" }}
                labelFormatter={(d) => {
                  const dt = new Date(d + "T00:00:00");
                  return dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
                }}
                formatter={(value, name) => [
                  `${value} / ${summary?.total_students ?? "?"} students`,
                  "Present",
                ]}
              />
              <Bar dataKey="present" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => {
                  const isToday = entry.date === (() => {
                    const d = new Date();
                    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                  })();
                  const pct = summary?.total_students
                    ? entry.present / summary.total_students
                    : 0;
                  const color = isToday
                    ? "#7c6af7"
                    : pct >= 0.75 ? "#4ade80"
                    : pct >= 0.5  ? "#fbbf24"
                    : "#f87171";
                  return <Cell key={i} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b" }}>
            <span><span style={{ color: "#7c6af7" }}>■</span> Today</span>
            <span><span style={{ color: "#4ade80" }}>■</span> ≥75% present</span>
            <span><span style={{ color: "#fbbf24" }}>■</span> ≥50% present</span>
            <span><span style={{ color: "#f87171" }}>■</span> &lt;50% present</span>
          </div>
        </div>
      )}

      {/* Today's table */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#e2e8f0" }}>Today's Records</h2>
          <button className="btn btn-ghost" onClick={loadAll} style={{ fontSize: "0.82rem" }}>↻ Refresh</button>
        </div>
        <AttendanceTable records={todayRecs} />
      </div>
    </div>
  );
}