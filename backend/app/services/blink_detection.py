import cv2
import mediapipe as mp
import numpy as np

# MediaPipe landmark indices for left and right eye
# These are the standard 6-point EAR (Eye Aspect Ratio) landmarks
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]

# EAR below this value = eye is closed
EAR_THRESHOLD = 0.22

# How many consecutive closed frames = confirmed blink
BLINK_CONSEC_FRAMES = 2


def _eye_aspect_ratio(landmarks, eye_indices, img_w, img_h):
    """
    EAR formula: ratio of eye height to eye width.
    Open eye  ≈ 0.3+
    Closed eye ≈ 0.15–0.20
    """
    pts = []
    for idx in eye_indices:
        lm = landmarks[idx]
        pts.append((lm.x * img_w, lm.y * img_h))

    # Vertical distances
    A = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
    B = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))
    # Horizontal distance
    C = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))

    ear = (A + B) / (2.0 * C)
    return ear


class BlinkDetector:
    def __init__(self):
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.blink_count    = 0
        self.consec_frames  = 0  # how many frames eye has been closed

    def process_frame(self, frame: np.ndarray) -> dict:
        """
        Process a single BGR frame.
        Returns:
          {
            "blink_detected": bool,   # True if a blink just completed
            "blink_count": int,       # total blinks seen so far
            "ear": float,             # current Eye Aspect Ratio
            "landmarks_found": bool
          }
        """
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return {
                "blink_detected": False,
                "blink_count": self.blink_count,
                "ear": 0.0,
                "landmarks_found": False,
            }

        landmarks = results.multi_face_landmarks[0].landmark

        left_ear  = _eye_aspect_ratio(landmarks, LEFT_EYE,  w, h)
        right_ear = _eye_aspect_ratio(landmarks, RIGHT_EYE, w, h)
        ear = (left_ear + right_ear) / 2.0

        blink_just_happened = False

        if ear < EAR_THRESHOLD:
            self.consec_frames += 1
        else:
            # Eye just opened — if it was closed long enough, count as blink
            if self.consec_frames >= BLINK_CONSEC_FRAMES:
                self.blink_count += 1
                blink_just_happened = True
            self.consec_frames = 0

        return {
            "blink_detected": blink_just_happened,
            "blink_count": self.blink_count,
            "ear": round(ear, 3),
            "landmarks_found": True,
        }

    def reset(self):
        """Call this when starting a new attendance session."""
        self.blink_count   = 0
        self.consec_frames = 0