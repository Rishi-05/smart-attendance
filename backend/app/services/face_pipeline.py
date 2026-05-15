import cv2
import numpy as np
from insightface.app import FaceAnalysis
from app.services.faiss_store import faiss_store
from app.core.config import settings

class FacePipeline:
    def __init__(self):
        # InsightFace with ArcFace model — runs on CPU
        self.app = FaceAnalysis(
            name="buffalo_l",        # best accuracy model
            providers=["CPUExecutionProvider"]
        )
        self.app.prepare(ctx_id=0, det_size=(640, 640))

    def extract_embedding(self, image: np.ndarray) -> np.ndarray | None:
        """
        Given a BGR image (from OpenCV / webcam frame):
        1. Detect all faces
        2. Return the embedding of the largest face found
        Returns None if no face is detected.
        """
        faces = self.app.get(image)

        if not faces:
            return None

        # If multiple faces, pick the largest (highest area bounding box)
        largest = max(faces, key=lambda f: (
            (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])
        ))

        return largest.embedding  # shape: (512,)

    def register_student(self, student_id: int, images: list[np.ndarray]) -> dict:
        """
        Register a student using multiple photos.
        Extracts embeddings from each photo, averages them, stores in FAISS.

        Returns:
          { "success": bool, "embeddings_used": int, "message": str }
        """
        embeddings = []

        for img in images:
            emb = self.extract_embedding(img)
            if emb is not None:
                embeddings.append(emb)

        if len(embeddings) == 0:
            return {
                "success": False,
                "embeddings_used": 0,
                "message": "No face detected in any of the provided images."
            }

        if len(embeddings) < 2:
            return {
                "success": False,
                "embeddings_used": len(embeddings),
                "message": "Need at least 2 clear face photos. Please retake."
            }

        # Average all embeddings → one master embedding per student
        avg_embedding = np.mean(embeddings, axis=0)

        faiss_store.add_embedding(student_id, avg_embedding)

        return {
            "success": True,
            "embeddings_used": len(embeddings),
            "message": f"Registered successfully using {len(embeddings)} photos."
        }

    def identify_face(self, image: np.ndarray) -> dict:
        """
        Try to identify who is in this image.

        Returns:
          {
            "identified": bool,
            "student_id": int | None,
            "confidence": float,
            "message": str
          }
        """
        embedding = self.extract_embedding(image)

        if embedding is None:
            return {
                "identified": False,
                "student_id": None,
                "confidence": 0.0,
                "message": "No face detected in frame."
            }

        student_id, score = faiss_store.search(embedding)

        if student_id is None:
            return {
                "identified": False,
                "student_id": None,
                "confidence": round(score, 3),
                "message": "Face detected but no match found."
            }

        return {
            "identified": True,
            "student_id": student_id,
            "confidence": round(score, 3),
            "message": "Match found."
        }


# Single shared instance
face_pipeline = FacePipeline()