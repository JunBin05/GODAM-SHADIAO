import numpy as np
import torch
import torchaudio
# Monkey patch: Define the missing function manually
if not hasattr(torchaudio, "list_audio_backends"):
    # Return a list of available backends (usually ffmpeg or soundfile)
    torchaudio.list_audio_backends = lambda: ["ffmpeg", "soundfile"]
from scipy.spatial.distance import cosine
from speechbrain.inference.speaker import SpeakerRecognition
from speechbrain.utils.fetching import LocalStrategy
from services.mongodb_service import save_voice_embedding, load_voice_embedding
from typing import Optional
from io import BytesIO

SIMILARITY_THRESHOLD = 0.55  # Lowered for more lenient matching
CONFIRMATION_THRESHOLD = 0.60  # Lowered for registration confirmation



class VoiceRecognition:
    def __init__(self):
        self.speaker_model = None
        self.load_speaker_recognition_model()

    def load_speaker_recognition_model(self):
        """
        Load the speaker recognition model.
        """
        try:
            self.speaker_model = SpeakerRecognition.from_hparams(
                source="./pretrained_models/speechbrain/spkrec-ecapa-voxceleb",
                savedir="./pretrained_models/spkrec-ecapa-voxceleb",
                run_opts={"device": "cuda" if torch.cuda.is_available() else "cpu"},
                local_strategy=LocalStrategy.COPY  # Use COPY instead of SYMLINK for Windows
            )
            return True
        except Exception as e:
            print(f"⚠ Warning: Could not load SpeechBrain model: {e}")
            return False

    def extract_voice_embedding(self, audio: BytesIO) -> Optional[np.ndarray]:
        """
        Extract voice embedding from audio file using SpeechBrain ECAPA-TDNN.

        Args:
            audio_path: Path to audio file (.wav or .mp3)

        Returns:
            Embedding as numpy array of shape (192,) or None if extraction fails
        """
        try:
            if self.speaker_model is None:
                raise RuntimeError("Speaker model not initialized")

            # Load audio using torchaudio
            waveform, sample_rate = torchaudio.load(audio)

            # Resample to 16kHz if needed (model expects 16kHz)
            if sample_rate != 16000:
                resampler = torchaudio.transforms.Resample(sample_rate, 16000)
                waveform = resampler(waveform)

            # Extract embedding (returns tensor of shape [1, 192])
            embedding = self.speaker_model.encode_batch(waveform)

            # Convert to numpy and flatten
            embedding_np = embedding.squeeze().detach().cpu().numpy()

            return embedding_np

        except Exception as e:
            print(f"Error extracting embedding: {e}")
            return None

    def save_embedding(self, user_id: str, name, face_embedding_json: str, embedding: np.ndarray, language) -> None:
        """
        Save voice embedding to Firebase Firestore (userIC collection).
        Updates the 'voiceEmbedding' field in the user's document.

        Firebase Structure:
        - Collection: 'userIC'
        - Document ID: user_id (IC number)
        - Field updated: 'voiceEmbedding' (array of 192 floats)
        """
        embedding_list = str(embedding.tolist())

        self.database.add_user(
            icNumber=user_id,
            name=name,
            faceEmbedding=face_embedding_json,
            voiceEmbedding=embedding_list,
            language=language
        )

    def load_embedding(self, user_id: str) -> Optional[np.ndarray]:
        """
        Load voice embedding from Firebase Firestore (userIC collection).
        Reads the 'voiceEmbedding' field from the user's document.
        """
        embedding = load_voice_embedding(user_id)
        if embedding is not None:
            return np.array(embedding, dtype=np.float32)
        return None



    def similar_for_confirmation(self, embedding1: np.ndarray, embedding2: np.ndarray) -> bool:
        similarity = self.compute_cosine_similarity(embedding1, embedding2)
        print(similarity)
        return similarity >= CONFIRMATION_THRESHOLD

    def is_similar(self, embedding1: np.ndarray, embedding2: np.ndarray) -> bool:
        similarity = self.compute_cosine_similarity(embedding1, embedding2)
        return similarity >= SIMILARITY_THRESHOLD

    @staticmethod
    def average_embeddings(embedding1: np.ndarray, embedding2: np.ndarray) -> np.ndarray:
        return (embedding1 + embedding2) / 2

    @staticmethod
    def compute_cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Compute cosine similarity between two embeddings.

        Args:
            embedding1: First embedding (numpy array)
            embedding2: Second embedding (numpy array)

        Returns:
            Similarity score between 0 and 1
        """
        try:
            # Cosine distance returns value between 0-2, convert to similarity
            distance = cosine(embedding1, embedding2)
            similarity = 1 - distance
            return max(0, min(1, similarity))  # Clamp to [0, 1]
        except Exception as e:
            print(f"Error computing similarity: {e}")
            return 0.0

