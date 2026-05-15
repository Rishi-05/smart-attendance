import { useState, useCallback, useRef } from "react";
import WebcamFeed from "../components/WebcamFeed";
import StudentCard from "../components/StudentCard";
import { registerStudent, getAllStudents } from "../services/api";
import { useEffect } from "react";

export default function Register() {
  const [name, setName]             = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail]           = useState("");
  const [photos, setPhotos]         = useState([]);   // array of { blob, preview }
  const [status, setStatus]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [students, setStudents]     = useState([]);
  const [captureMode, setCaptureMode] = useState("webcam"); // "webcam" | "upload"
  const fileInputRef = useRef(null);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      const res = await getAllStudents();
      setStudents(res.data);
    } catch {
      console.error("Could not load students");
    }
  };

  // Called by webcam component
  const handleCapture = useCallback((blob) => {
    setPhotos((prev) => {
      const next = [...prev, { blob, preview: URL.createObjectURL(blob) }].slice(-5);
      setStatus({ type: "info", message: `${next.length}/5 photos captured. ${next.length >= 3 ? "Ready to register!" : "Need at least 3."}` });
      return next;
    });
  }, []);

  // Called by file upload input
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newPhotos = files.slice(0, 5 - photos.length).map((file) => ({
      blob: file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos((prev) => {
      const next = [...prev, ...newPhotos].slice(-5);
      setStatus({ type: "info", message: `${next.length}/5 photos loaded. ${next.length >= 3 ? "Ready to register!" : "Need at least 3."}` });
      return next;
    });

    // Reset input so same files can be re-selected if needed
    e.target.value = "";
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setStatus(next.length > 0
        ? { type: "info", message: `${next.length}/5 photos.` }
        : null
      );
      return next;
    });
  };

  const handleRegister = async () => {
    if (!name || !rollNumber) {
      setStatus({ type: "error", message: "Name and Roll Number are required." });
      return;
    }
    if (photos.length < 3) {
      setStatus({ type: "error", message: "Please provide at least 3 photos." });
      return;
    }

    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("roll_number", rollNumber);
    if (email) formData.append("email", email);
    photos.forEach(({ blob }) => formData.append("photos", blob, "photo.jpg"));

    try {
      const res = await registerStudent(formData);
      setStatus({ type: "success", message: res.data.message });
      setName(""); setRollNumber(""); setEmail(""); setPhotos([]);
      fetchStudents();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.detail || "Registration failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Register Student</h1>
      <p className="page-sub">Fill in the details and provide 3–5 face photos via webcam or file upload.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>

        {/* ── Left: Form ── */}
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem", color: "#e2e8f0" }}>Student Details</h2>

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" placeholder="e.g. John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Roll Number *</label>
            <input className="form-input" placeholder="e.g. 22CS101" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Email (optional)</label>
            <input className="form-input" placeholder="e.g. rishi@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {/* Photo slot indicators */}
          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label">Photos Collected ({photos.length}/5)</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[0,1,2,3,4].map((n) => (
                photos[n] ? (
                  // Filled slot — show thumbnail with remove button
                  <div key={n} style={{ position: "relative" }}>
                    <img
                      src={photos[n].preview}
                      alt={`photo ${n+1}`}
                      style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, border: "2px solid #7c6af7" }}
                    />
                    <button
                      onClick={() => removePhoto(n)}
                      style={{
                        position: "absolute", top: -6, right: -6,
                        width: 18, height: 18, borderRadius: "50%",
                        background: "#dc2626", border: "none",
                        color: "#fff", fontSize: "0.65rem",
                        cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >✕</button>
                  </div>
                ) : (
                  // Empty slot
                  <div key={n} style={{
                    width: 52, height: 52, borderRadius: 8,
                    background: "#1e2235",
                    border: "1px dashed #2d3148",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", color: "#64748b",
                  }}>
                    {n + 1}
                  </div>
                )
              ))}
            </div>
          </div>

          {status && (
            <div className={`alert alert-${status.type}`}>{status.message}</div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleRegister}
            disabled={loading || photos.length < 3}
            style={{ width: "100%" }}
          >
            {loading ? "Registering…" : `Register Student ${photos.length >= 3 ? "✓" : `(need ${3 - photos.length} more)`}`}
          </button>
        </div>

        {/* ── Right: Webcam or Upload ── */}
        <div className="card">

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <button
              className={captureMode === "webcam" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setCaptureMode("webcam")}
              style={{ flex: 1, justifyContent: "center" }}
            >
              📷 Webcam
            </button>
            <button
              className={captureMode === "upload" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setCaptureMode("upload")}
              style={{ flex: 1, justifyContent: "center" }}
            >
              📁 Upload Photos
            </button>
          </div>

          {/* ── Webcam mode ── */}
          {captureMode === "webcam" && (
            <WebcamFeed
              onCapture={handleCapture}
              label={`Capture Photo (${photos.length}/5)`}
            />
          )}

          {/* ── Upload mode ── */}
          {captureMode === "upload" && (
            <div>
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
                Ask your classmates to send 3–5 clear face photos (front-facing, good lighting).
                Select all of them at once.
              </p>

              {/* Drop zone */}
              <div
                onClick={() => photos.length < 5 && fileInputRef.current.click()}
                style={{
                  border: "2px dashed #2d3148",
                  borderRadius: 12,
                  padding: "3rem 1rem",
                  textAlign: "center",
                  cursor: photos.length >= 5 ? "not-allowed" : "pointer",
                  background: "#0f1117",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { if (photos.length < 5) e.currentTarget.style.borderColor = "#7c6af7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2d3148"; }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🖼️</div>
                {photos.length >= 5 ? (
                  <p style={{ color: "#4ade80", fontWeight: 500 }}>5 photos collected — ready!</p>
                ) : (
                  <>
                    <p style={{ color: "#e2e8f0", fontWeight: 500, marginBottom: "0.25rem" }}>
                      Click to select photos
                    </p>
                    <p style={{ color: "#64748b", fontSize: "0.82rem" }}>
                      JPG, PNG, WEBP · up to {5 - photos.length} more
                    </p>
                  </>
                )}
              </div>

              {/* Hidden file input — accepts multiple */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              {photos.length < 5 && (
                <button
                  className="btn btn-ghost"
                  onClick={() => fileInputRef.current.click()}
                  style={{ width: "100%", justifyContent: "center", marginTop: "0.75rem" }}
                  disabled={photos.length >= 5}
                >
                  + Add More Photos
                </button>
              )}

              {/* Tips */}
              <div style={{ marginTop: "1.25rem", padding: "1rem", background: "#1e2235", borderRadius: 8 }}>
                <p style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 500, marginBottom: "0.5rem" }}>
                  Tips for better accuracy
                </p>
                <ul style={{ fontSize: "0.8rem", color: "#64748b", paddingLeft: "1.1rem", lineHeight: 1.8 }}>
                  <li>Use photos with good lighting</li>
                  <li>Face should be front-facing and clearly visible</li>
                  <li>Avoid sunglasses or heavy shadows</li>
                  <li>Different angles work best (slightly left, right, straight)</li>
                  <li>No group photos — one face per image</li>
                </ul>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Registered students */}
      {students.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "#e2e8f0" }}>
            Registered Students ({students.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {students.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                onDeleted={(id) => setStudents((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}