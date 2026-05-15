import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { markAttendance, getTodayAttendance } from "../services/api";
import AttendanceTable from "../components/AttendanceTable";

const VIDEO_CONSTRAINTS = { width: 640, height: 480, facingMode: "user" };
const SCAN_INTERVAL_MS  = 2500; // scan every 2.5 seconds

export default function Attendance() {
  const webcamRef   = useRef(null);
  const intervalRef = useRef(null);

  const [isRunning,  setIsRunning]  = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [records,    setRecords]    = useState([]);
  const [scanCount,  setScanCount]  = useState(0);
  const [blinkReady, setBlinkReady] = useState(false);

  useEffect(() => {
    fetchToday();
    return () => stopScanning();
  }, []);

  const fetchToday = async () => {
    try {
      const res = await getTodayAttendance();
      setRecords(res.data.records);
    } catch {
      console.error("Could not fetch today's records");
    }
  };

  const scanFrame = useCallback(async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setScanCount((c) => c + 1);

    try {
      const blob = await fetch(imageSrc).then((r) => r.blob());
      const res  = await markAttendance(blob);
      const data = res.data;

      setLastResult(data);

      if (data.success && data.identified && !data.already_marked) {
        // New attendance marked — refresh the table
        fetchToday();
      }
    } catch (err) {
      setLastResult({
        success: false,
        message: err.response?.data?.detail || "Scan failed.",
      });
    }
  }, []);

  const startScanning = () => {
    setIsRunning(true);
    setLastResult(null);
    setScanCount(0);
    intervalRef.current = setInterval(scanFrame, SCAN_INTERVAL_MS);
  };

  const stopScanning = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
  };

  const getResultStyle = () => {
    if (!lastResult) return {};
    if (lastResult.already_marked) return { borderColor: "#fbbf24" };
    if (lastResult.identified)     return { borderColor: "#4ade80" };
    return {};
  };

  return (
    <div>
      <h1 className="page-title">Live Attendance</h1>
      <p className="page-sub">Start the scanner — it automatically marks attendance every 2.5 seconds.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>

        {/* Left — Camera */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#e2e8f0" }}>
              Camera Feed
              {isRunning && (
                <span style={{ marginLeft: "0.6rem", fontSize: "0.75rem", color: "#4ade80" }}>
                  ● LIVE
                </span>
              )}
            </h2>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Scans: {scanCount}
            </span>
          </div>

          {/* Webcam */}
          <div style={{
            borderRadius: 10, overflow: "hidden",
            border: `2px solid ${isRunning ? "#4ade80" : "#2d3148"}`,
            transition: "border-color 0.3s",
            ...getResultStyle(),
          }}>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={VIDEO_CONSTRAINTS}
              style={{ display: "block", width: "100%" }}
            />
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            {!isRunning ? (
              <button className="btn btn-success" onClick={startScanning} style={{ flex: 1 }}>
                ▶ Start Scanner
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopScanning} style={{ flex: 1 }}>
                ■ Stop Scanner
              </button>
            )}
          </div>

          {/* Last result banner */}
          {lastResult && (
            <div style={{ marginTop: "1rem" }}>
              {lastResult.identified && !lastResult.already_marked && (
                <div className="alert alert-success">
                  ✓ {lastResult.name} | {lastResult.roll_number} | Attendance Marked
                  <span style={{ float: "right", opacity: 0.7 }}>
                    {Math.round(lastResult.confidence * 100)}% match
                  </span>
                </div>
              )}
              {lastResult.already_marked && (
                <div className="alert" style={{ background: "#451a03", color: "#fbbf24", border: "1px solid #92400e" }}>
                  ↩ {lastResult.name} already marked today
                </div>
              )}
              {!lastResult.identified && (
                <div className="alert alert-info">
                  {lastResult.message || "No face matched"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — Today's records */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#e2e8f0" }}>
              Today's Attendance
            </h2>
            <span className="badge badge-green">{records.length} present</span>
          </div>
          <AttendanceTable records={records} />
        </div>
      </div>
    </div>
  );
}