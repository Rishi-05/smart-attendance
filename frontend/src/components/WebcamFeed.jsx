import { useRef, useCallback, useState } from "react";
import Webcam from "react-webcam";

const VIDEO_CONSTRAINTS = {
  width: 640,
  height: 480,
  facingMode: "user",
};

export default function WebcamFeed({ onCapture, showCaptureBtn = true, label = "Capture Photo" }) {
  const webcamRef = useRef(null);
  const [captured, setCaptured] = useState(null);
  const [error, setError] = useState(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setCaptured(imageSrc);

    // Convert base64 → Blob for API upload
    fetch(imageSrc)
      .then((r) => r.blob())
      .then((blob) => onCapture(blob, imageSrc));
  }, [onCapture]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <div style={{
        borderRadius: "12px",
        overflow: "hidden",
        border: "2px solid #2d3148",
        position: "relative",
        width: 640,
        maxWidth: "100%",
      }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={VIDEO_CONSTRAINTS}
          onUserMediaError={() => setError("Camera not accessible. Check browser permissions.")}
          style={{ display: "block", width: "100%" }}
        />
        {/* Green scanning line overlay */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          border: "2px solid #7c6af7",
          borderRadius: "10px",
          pointerEvents: "none",
        }} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showCaptureBtn && (
        <button className="btn btn-primary" onClick={capture}>
          ◎ {label}
        </button>
      )}

      {captured && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.4rem" }}>Last capture</p>
          <img src={captured} alt="captured" style={{ width: 160, borderRadius: 8, border: "1px solid #2d3148" }} />
        </div>
      )}
    </div>
  );
}