"""
FastAPI Backend for Voice-Based Speaker Verification
Uses SpeechBrain ECAPA-TDNN model for speaker embedding extraction
"""

# Fix Windows symlink permission issue - MUST be set before importing huggingface_hub
import os
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"

import tempfile
import shutil
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import torch
import torchaudio
from scipy.spatial.distance import cosine
from speechbrain.inference.speaker import SpeakerRecognition

# Initialize FastAPI app
app = FastAPI(
    title="Voice-Based Login API",
    description="Speaker verification backend using SpeechBrain ECAPA-TDNN",
    version="1.0.0"
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Configuration
# ============================================================================

TEMP_DIR = Path("./temp_audio")
TEMP_DIR.mkdir(exist_ok=True)

# Cosine similarity threshold for authentication
SIMILARITY_THRESHOLD = 0.75

# Mock database: stores {user_id: embedding_list}
# In production, use Firestore, MongoDB, PostgreSQL, etc.
EMBEDDINGS_DB = {}

# ============================================================================
# Initialize SpeechBrain Model (ECAPA-TDNN)
# ============================================================================

# Import LocalStrategy for Windows compatibility
from speechbrain.utils.fetching import LocalStrategy

speaker_model = None

def load_speaker_model():
    """Load the speaker recognition model."""
    global speaker_model
    try:
        # Load pre-trained speaker recognition model
        # This model is trained on VoxCeleb dataset
        # Use COPY strategy on Windows to avoid symlink permission issues
        speaker_model = SpeakerRecognition.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir="pretrained_models/spkrec-ecapa-voxceleb",
            run_opts={"device": "cuda" if torch.cuda.is_available() else "cpu"},
            local_strategy=LocalStrategy.COPY  # Use COPY instead of SYMLINK for Windows
        )
        print("✓ SpeechBrain ECAPA-TDNN model loaded successfully")
        return True
    except Exception as e:
        print(f"⚠ Warning: Could not load SpeechBrain model: {e}")
        print("  Ensure internet connection for initial download")
        return False

# Try to load model at startup
load_speaker_model()


# ============================================================================
# Helper Functions
# ============================================================================

def extract_voice_embedding(audio_path: str) -> Optional[np.ndarray]:
    """
    Extract voice embedding from audio file using SpeechBrain ECAPA-TDNN.
    
    Args:
        audio_path: Path to audio file (.wav or .mp3)
        
    Returns:
        Embedding as numpy array of shape (192,) or None if extraction fails
    """
    try:
        if speaker_model is None:
            raise RuntimeError("Speaker model not initialized")
        
        # Load audio using torchaudio
        waveform, sample_rate = torchaudio.load(audio_path)
        
        # Resample to 16kHz if needed (model expects 16kHz)
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(sample_rate, 16000)
            waveform = resampler(waveform)
        
        # Extract embedding (returns tensor of shape [1, 192])
        embedding = speaker_model.encode_batch(waveform)
        
        # Convert to numpy and flatten
        embedding_np = embedding.squeeze().detach().cpu().numpy()
        
        return embedding_np
    
    except Exception as e:
        print(f"Error extracting embedding: {e}")
        return None


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


def save_embedding(user_id: str, embedding: np.ndarray) -> None:
    """Save embedding to mock database (dict)."""
    EMBEDDINGS_DB[user_id] = embedding.tolist()
    print(f"✓ Embedding stored for user: {user_id}")


def load_embedding(user_id: str) -> Optional[np.ndarray]:
    """Load embedding from mock database (dict)."""
    if user_id in EMBEDDINGS_DB:
        return np.array(EMBEDDINGS_DB[user_id])
    return None


def process_audio_file(audio_file: UploadFile) -> Optional[str]:
    """
    Save uploaded audio file to temp directory.
    
    Args:
        audio_file: UploadFile from form-data
        
    Returns:
        Path to saved audio file or None if save fails
    """
    try:
        # Create unique temp file path
        temp_path = TEMP_DIR / f"{audio_file.filename}"
        
        # Save file
        with open(temp_path, "wb") as f:
            content = audio_file.file.read()
            f.write(content)
        
        return str(temp_path)
    
    except Exception as e:
        print(f"Error saving audio file: {e}")
        return None


def cleanup_temp_file(file_path: str) -> None:
    """Clean up temporary audio file."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"✓ Temp file cleaned: {file_path}")
    except Exception as e:
        print(f"Warning: Could not clean temp file {file_path}: {e}")


# ============================================================================
# API Routes
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": speaker_model is not None,
        "similarity_threshold": SIMILARITY_THRESHOLD
    }


@app.post("/voice/register")
async def register_voice(
    user_id: str = Form(...),
    audio: UploadFile = File(...)
):
    """
    Register a user's voice by extracting and storing voice embedding.
    
    Args:
        user_id: Unique user identifier
        audio: Audio file from form-data
        
    Returns:
        JSON with registration status and embedding info
    """
    try:
        # Validate user_id
        if not user_id or len(user_id.strip()) == 0:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Validate audio file
        if not audio or audio.filename == "":
            raise HTTPException(status_code=400, detail="Audio file is required")
        
        # Check file extension
        allowed_extensions = {".wav", ".mp3", ".m4a", ".ogg"}
        file_ext = Path(audio.filename).suffix.lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported audio format. Supported: {', '.join(allowed_extensions)}"
            )
        
        print(f"\n📝 Registering user: {user_id}")
        
        # Process audio file
        audio_path = process_audio_file(audio)
        if audio_path is None:
            raise HTTPException(status_code=500, detail="Failed to save audio file")
        
        try:
            # Extract embedding
            embedding = extract_voice_embedding(audio_path)
            if embedding is None:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to extract voice embedding"
                )
            
            # Save embedding to database
            save_embedding(user_id, embedding)
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "Voice registered successfully",
                    "user_id": user_id,
                    "embedding_dim": len(embedding),
                    "embedding_stored": True
                }
            )
        
        finally:
            # Clean up temp file
            cleanup_temp_file(audio_path)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post("/voice/login")
async def login_voice(
    user_id: str = Form(...),
    audio: UploadFile = File(...)
):
    """
    Authenticate user by comparing voice with registered embedding.
    
    Args:
        user_id: Unique user identifier
        audio: Audio file from form-data
        
    Returns:
        JSON with authentication result and similarity score
    """
    try:
        # Validate user_id
        if not user_id or len(user_id.strip()) == 0:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Validate audio file
        if not audio or audio.filename == "":
            raise HTTPException(status_code=400, detail="Audio file is required")
        
        print(f"\n🔐 Login attempt for user: {user_id}")
        
        # Check if user has registered embedding
        stored_embedding = load_embedding(user_id)
        if stored_embedding is None:
            raise HTTPException(
                status_code=404,
                detail=f"User {user_id} not registered. Please register first."
            )
        
        # Process audio file
        audio_path = process_audio_file(audio)
        if audio_path is None:
            raise HTTPException(status_code=500, detail="Failed to save audio file")
        
        try:
            # Extract embedding from login audio
            login_embedding = extract_voice_embedding(audio_path)
            if login_embedding is None:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to extract voice embedding"
                )
            
            # Compare embeddings using cosine similarity
            similarity = compute_cosine_similarity(stored_embedding, login_embedding)
            
            # Determine authentication result (convert to Python bool for JSON serialization)
            authenticated = bool(similarity > SIMILARITY_THRESHOLD)
            
            print(f"  Similarity Score: {similarity:.4f}")
            print(f"  Threshold: {SIMILARITY_THRESHOLD}")
            print(f"  Result: {'✓ AUTHENTICATED' if authenticated else '✗ REJECTED'}")
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "user_id": user_id,
                    "authenticated": authenticated,
                    "similarity_score": round(float(similarity), 4),
                    "threshold": SIMILARITY_THRESHOLD,
                    "message": "Authentication successful" if authenticated else "Voice does not match registered user"
                }
            )
        
        finally:
            # Clean up temp file
            cleanup_temp_file(audio_path)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.delete("/voice/user/{user_id}")
async def delete_user(user_id: str):
    """
    Delete user's registered voice embedding (useful for testing).
    
    Args:
        user_id: Unique user identifier
        
    Returns:
        JSON with deletion status
    """
    try:
        if user_id in EMBEDDINGS_DB:
            del EMBEDDINGS_DB[user_id]
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": f"User {user_id} deleted successfully"
                }
            )
        else:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")


@app.get("/voice/user/{user_id}/info")
async def get_user_info(user_id: str):
    """
    Get information about a registered user (for testing/debugging).
    
    Args:
        user_id: Unique user identifier
        
    Returns:
        JSON with user info
    """
    try:
        if user_id in EMBEDDINGS_DB:
            embedding = EMBEDDINGS_DB[user_id]
            return JSONResponse(
                status_code=200,
                content={
                    "user_id": user_id,
                    "registered": True,
                    "embedding_dimension": len(embedding),
                    "embedding_norm": float(np.linalg.norm(embedding))
                }
            )
        else:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Called when server starts."""
    print("\n" + "="*60)
    print("🎤 Voice-Based Login API Starting")
    print("="*60)
    print(f"Device: {'GPU (CUDA)' if torch.cuda.is_available() else 'CPU'}")
    print(f"Similarity Threshold: {SIMILARITY_THRESHOLD}")
    print("="*60 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Called when server shuts down."""
    print("\n" + "="*60)
    print("🛑 Voice-Based Login API Shutting Down")
    print("="*60)
    # Clean up temp directory
    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR, ignore_errors=True)
    print("✓ Temp files cleaned\n")


# ============================================================================
# Run Server (for development)
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
