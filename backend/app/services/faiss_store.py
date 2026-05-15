import faiss
import numpy as np
import json
import os
from app.core.config import settings

class FAISSStore:
    def __init__(self):
        # 512 = ArcFace embedding size (fixed, always 512)
        self.dimension = 512
        self.index = faiss.IndexFlatIP(self.dimension)
        # IndexFlatIP = Inner Product similarity (cosine when vectors are normalized)

        # labels[i] = student_id for the i-th vector in the index
        self.labels: list[int] = []

        # Load existing index from disk if it exists
        self._load()

    def _load(self):
        """Load FAISS index + labels from disk on startup."""
        if os.path.exists(settings.FAISS_INDEX_PATH):
            self.index = faiss.read_index(settings.FAISS_INDEX_PATH)

        if os.path.exists(settings.FAISS_LABELS_PATH):
            with open(settings.FAISS_LABELS_PATH, "r") as f:
                self.labels = json.load(f)

    def _save(self):
        """Persist index + labels to disk after every change."""
        faiss.write_index(self.index, settings.FAISS_INDEX_PATH)
        with open(settings.FAISS_LABELS_PATH, "w") as f:
            json.dump(self.labels, f)

    def add_embedding(self, student_id: int, embedding: np.ndarray):
        """
        Add one face embedding for a student.
        Called multiple times during registration (once per photo).
        """
        # Normalize to unit vector so inner product == cosine similarity
        embedding = embedding / np.linalg.norm(embedding)
        embedding = embedding.reshape(1, -1).astype(np.float32)

        self.index.add(embedding)
        self.labels.append(student_id)
        self._save()

    def search(self, embedding: np.ndarray, top_k: int = 1):
        """
        Find the closest matching student for a given embedding.
        Returns (student_id, similarity_score) or (None, 0) if no match.
        """
        if self.index.ntotal == 0:
            return None, 0.0

        embedding = embedding / np.linalg.norm(embedding)
        embedding = embedding.reshape(1, -1).astype(np.float32)

        # D = distances (similarity scores), I = indices in the FAISS index
        D, I = self.index.search(embedding, top_k)

        best_score = float(D[0][0])
        best_index = int(I[0][0])

        if best_score < settings.SIMILARITY_THRESHOLD:
            return None, best_score   # score too low = unknown face

        student_id = self.labels[best_index]
        return student_id, best_score

    def delete_student(self, student_id: int):
        """
        Remove all embeddings for a student.
        FAISS doesn't support deletion natively, so we rebuild the index.
        """
        if not self.labels:
            return

        # Collect all vectors that do NOT belong to this student
        kept_vectors = []
        kept_labels  = []

        for i, sid in enumerate(self.labels):
            if sid != student_id:
                vec = self.index.reconstruct(i)
                kept_vectors.append(vec)
                kept_labels.append(sid)

        # Rebuild from scratch
        self.index = faiss.IndexFlatIP(self.dimension)
        self.labels = kept_labels

        if kept_vectors:
            vectors = np.array(kept_vectors, dtype=np.float32)
            self.index.add(vectors)

        self._save()


# Single shared instance — imported everywhere that needs FAISS
faiss_store = FAISSStore()