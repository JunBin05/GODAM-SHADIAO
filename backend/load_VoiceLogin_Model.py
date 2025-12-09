"""
FastAPI Backend for Voice-Based Speaker Verification
Uses SpeechBrain ECAPA-TDNN model for speaker embedding extraction
Integrated with Firebase Firestore (users collection)
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
import soundfile as sf
from scipy.spatial.distance import cosine
from speechbrain.inference.speaker import SpeakerRecognition

# Firebase imports
import firebase_admin
from firebase_admin import credentials, firestore

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

# Firebase configuration
FIREBASE_KEY_PATH = Path(__file__).parent.parent / "serviceAccountKey.json"
FIREBASE_COLLECTION = "users"  # Consolidated users collection

# ============================================================================
# Initialize Firebase
# ============================================================================

db = None
firebase_initialized = False

def init_firebase():
    """Initialize Firebase Admin SDK and Firestore."""
    global db, firebase_initialized
    try:
        # Check if already initialized
        try:
            firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate(str(FIREBASE_KEY_PATH))
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        firebase_initialized = True
        print("✓ Firebase Firestore initialized successfully")
        print(f"  Using collection: '{FIREBASE_COLLECTION}'")
        return True
    except Exception as e:
        print(f"⚠ Firebase initialization failed: {e}")
        print("  Voice embeddings will be stored in memory only")
        return False

# Initialize Firebase at startup
init_firebase()

# Fallback in-memory storage
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
        
        # Load audio using soundfile (more compatible on Windows)
        audio_data, sample_rate = sf.read(audio_path)
        
        # Convert to tensor
        if len(audio_data.shape) == 1:
            # Mono audio - add channel dimension
            waveform = torch.tensor(audio_data, dtype=torch.float32).unsqueeze(0)
        else:
            # Stereo audio - convert to mono by averaging channels
            waveform = torch.tensor(audio_data.mean(axis=1), dtype=torch.float32).unsqueeze(0)
        
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


def save_embedding(user_id: str, embedding: np.ndarray, name: str = None) -> None:
    """
    Save voice embedding to Firebase Firestore (users collection).
    Updates the 'voiceEmbedding' field in the user's document.
    
    Firebase Structure:
    - Collection: 'users'
    - Document ID: 'USR001', 'USR002', etc.
    - Field 'ic': The IC number
    - Field 'name': User's name
    - Field 'voiceEmbedding': array of 192 floats
    
    If user_id is an IC number, looks up the user document by IC field first.
    If no user exists with that IC, creates a new USR### document.
    """
    embedding_list = embedding.tolist()
    
    if firebase_initialized and db:
        try:
            doc_id = user_id
            
            # If user_id looks like an IC (not USR###), find the user document by IC field
            if not user_id.startswith('USR'):
                user_doc = get_user_doc_by_ic(user_id)
                if user_doc:
                    doc_id = user_doc[0]  # Use the actual document ID (USR###)
                    print(f"  Found existing user document: {doc_id} for IC: {user_id}")
                else:
                    # No user exists with this IC - create a new USR### document
                    # Get the next USR number
                    all_users = db.collection(FIREBASE_COLLECTION).stream()
                    max_num = 0
                    for doc in all_users:
                        if doc.id.startswith('USR'):
                            try:
                                num = int(doc.id[3:])
                                max_num = max(max_num, num)
                            except:
                                pass
                    
                    new_usr_num = max_num + 1
                    doc_id = f"USR{new_usr_num:03d}"
                    
                    # Create the new user document with required fields only
                    new_user_data = {
                        'ic': user_id,
                        'name': name if name else '',
                        'voiceEmbedding': embedding_list
                    }
                    db.collection(FIREBASE_COLLECTION).document(doc_id).set(new_user_data)
                    print(f"✓ Created new user document: {doc_id} with IC: {user_id}, Name: {name}")
                    return
            
            # Update existing document with voice embedding (and name if provided)
            update_data = {'voiceEmbedding': embedding_list}
            if name:
                update_data['name'] = name
            
            doc_ref = db.collection(FIREBASE_COLLECTION).document(doc_id)
            doc_ref.set(update_data, merge=True)
            
            print(f"✓ Voice embedding saved to Firebase for user: {doc_id}")
            return
        except Exception as e:
            print(f"⚠ Firebase save failed: {e}, falling back to memory")
    
    # Fallback to in-memory storage
    EMBEDDINGS_DB[user_id] = embedding_list
    print(f"✓ Embedding stored in memory for user: {user_id}")


def load_embedding(user_id: str) -> Optional[np.ndarray]:
    """
    Load voice embedding from Firebase Firestore (users collection).
    Reads the 'voiceEmbedding' field from the user's document.
    
    If user_id is an IC number, looks up the actual user document first.
    Also checks if there's a document with the IC as document ID (legacy support).
    """
    if firebase_initialized and db:
        try:
            # Try to find user by IC if not a USR### format
            doc_id = user_id
            doc_data = None
            
            if not user_id.startswith('USR'):
                user_doc = get_user_doc_by_ic(user_id)
                if user_doc:
                    doc_id = user_doc[0]
                    doc_data = user_doc[1]
            
            if doc_data is None:
                doc_ref = db.collection(FIREBASE_COLLECTION).document(doc_id)
                doc = doc_ref.get()
                if doc.exists:
                    doc_data = doc.to_dict()
            
            if doc_data:
                voice_embedding = doc_data.get('voiceEmbedding')
                
                if voice_embedding and len(voice_embedding) > 1:
                    print(f"✓ Voice embedding loaded from Firebase for user: {doc_id}")
                    return np.array(voice_embedding)
                else:
                    # User exists but no voice embedding - check if there's a legacy document with IC as ID
                    if not user_id.startswith('USR') and doc_id != user_id:
                        legacy_doc_ref = db.collection(FIREBASE_COLLECTION).document(user_id)
                        legacy_doc = legacy_doc_ref.get()
                        if legacy_doc.exists:
                            legacy_data = legacy_doc.to_dict()
                            legacy_embedding = legacy_data.get('voiceEmbedding')
                            if legacy_embedding and len(legacy_embedding) > 1:
                                print(f"✓ Voice embedding loaded from legacy document: {user_id}")
                                # Migrate to the proper user document
                                db.collection(FIREBASE_COLLECTION).document(doc_id).set({
                                    'voiceEmbedding': legacy_embedding
                                }, merge=True)
                                print(f"  ✓ Migrated voice embedding to user: {doc_id}")
                                # Delete legacy document
                                legacy_doc_ref.delete()
                                print(f"  ✓ Deleted legacy document: {user_id}")
                                return np.array(legacy_embedding)
                    print(f"  User {doc_id} exists but has no voice embedding registered")
                    return None
            else:
                # No user found by IC field, try direct document lookup with IC as ID
                if not user_id.startswith('USR'):
                    legacy_doc_ref = db.collection(FIREBASE_COLLECTION).document(user_id)
                    legacy_doc = legacy_doc_ref.get()
                    if legacy_doc.exists:
                        legacy_data = legacy_doc.to_dict()
                        legacy_embedding = legacy_data.get('voiceEmbedding')
                        if legacy_embedding and len(legacy_embedding) > 1:
                            print(f"✓ Voice embedding loaded from document ID: {user_id}")
                            return np.array(legacy_embedding)
                print(f"  User {user_id} not found in Firebase")
                return None
        except Exception as e:
            print(f"⚠ Firebase load failed: {e}, checking memory")
    
    # Fallback to in-memory storage
    if user_id in EMBEDDINGS_DB:
        return np.array(EMBEDDINGS_DB[user_id])
    return None
    
    # Fallback to in-memory storage
    if user_id in EMBEDDINGS_DB:
        return np.array(EMBEDDINGS_DB[user_id])
    return None


def check_user_exists(user_id: str) -> bool:
    """Check if a user document exists in Firebase."""
    if firebase_initialized and db:
        try:
            # First try direct document lookup
            doc = db.collection(FIREBASE_COLLECTION).document(user_id).get()
            if doc.exists:
                return True
            # Try lookup by IC field
            user_doc = get_user_doc_by_ic(user_id)
            return user_doc is not None
        except:
            pass
    return user_id in EMBEDDINGS_DB


def get_user_doc_by_ic(ic_number: str) -> Optional[tuple]:
    """
    Get user document reference by IC number.
    Returns (doc_id, doc_data) or None if not found.
    """
    if not firebase_initialized or not db:
        return None
    
    try:
        # Clean IC number (remove dashes)
        clean_ic = ic_number.replace("-", "")
        
        # Search by IC field
        query = db.collection(FIREBASE_COLLECTION).where('ic', '==', ic_number).limit(1).stream()
        for doc in query:
            return (doc.id, doc.to_dict())
        
        # Also try without dashes
        query = db.collection(FIREBASE_COLLECTION).where('ic', '==', clean_ic).limit(1).stream()
        for doc in query:
            return (doc.id, doc.to_dict())
        
        return None
    except Exception as e:
        print(f"Error looking up user by IC: {e}")
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


# ============================================================================
# User Registration Data API
# ============================================================================

from pydantic import BaseModel
from typing import List, Optional as Opt

class UserRegistrationData(BaseModel):
    """Schema for user registration data."""
    icNumber: str  # Document ID (primary key)
    name: str
    faceEmbedding: Opt[List[float]] = None  # Optional: face encoding
    language: Opt[str] = None  # BC, BI, BM, or HK


@app.post("/user/register")
async def register_user_data(data: UserRegistrationData):
    """
    Save user registration data to Firebase Firestore (users collection).
    This endpoint saves name, IC number, face embedding, and language preference.
    
    Voice embedding is saved separately via /voice/register/confirm endpoint.
    """
    if not firebase_initialized or not db:
        raise HTTPException(status_code=503, detail="Firebase not available")
    
    try:
        # Check if user already exists by IC
        existing_user = get_user_doc_by_ic(data.icNumber)
        
        if existing_user:
            # Update existing user
            doc_id = existing_user[0]
            user_data = {}
            
            # Update name if provided
            if data.name:
                user_data["name"] = data.name
            
            # Update face embedding if provided
            if data.faceEmbedding:
                user_data["faceEmbedding"] = data.faceEmbedding
            
            # Update language/preferred_language if provided
            if data.language:
                valid_languages = ["BC", "BI", "BM", "HK", "en", "ms", "zh", "ta"]
                if data.language not in valid_languages:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid language. Must be one of: {valid_languages}"
                    )
                user_data["preferred_language"] = data.language
            
            # Merge with existing data
            doc_ref = db.collection(FIREBASE_COLLECTION).document(doc_id)
            doc_ref.set(user_data, merge=True)
            
            print(f"✓ User updated: {doc_id}")
            return {
                "success": True,
                "message": "User data updated successfully",
                "user_id": doc_id
            }
        else:
            # Create new user - generate new user_id
            all_users = db.collection(FIREBASE_COLLECTION).stream()
            max_user_num = 0
            for doc in all_users:
                try:
                    user_num = int(doc.id.replace('USR', ''))
                    max_user_num = max(max_user_num, user_num)
                except (ValueError, AttributeError):
                    continue
            
            new_user_id = f"USR{str(max_user_num + 1).zfill(3)}"
            
            # Prepare data to save
            user_data = {
                "user_id": new_user_id,
                "name": data.name,
                "ic": data.icNumber,
                "age": 0,
                "phone": "",
                "email": "",
                "monthly_income": 0,
                "household_size": 1,
                "state": "",
                "disability_status": False,
                "employment_status": "unknown",
                "dependents": 0,
                "pin": "123456",
                "enrolled_programs": [],
                "created_date": "2024-12-09"
            }
            
            # Add optional fields
            if data.faceEmbedding:
                user_data["faceEmbedding"] = data.faceEmbedding
            
            if data.language:
                valid_languages = ["BC", "BI", "BM", "HK", "en", "ms", "zh", "ta"]
                if data.language not in valid_languages:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid language. Must be one of: {valid_languages}"
                    )
                user_data["preferred_language"] = data.language
            
            # Save to Firebase
            doc_ref = db.collection(FIREBASE_COLLECTION).document(new_user_id)
            doc_ref.set(user_data)
            
            print(f"✓ New user created: {new_user_id}")
            print(f"  Name: {data.name}")
            print(f"  Language: {data.language or 'Not set'}")
            print(f"  Face embedding: {'Yes' if data.faceEmbedding else 'No'}")
            
            return {
                "success": True,
                "message": "User registration data saved successfully",
                "user_id": new_user_id
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save user data: {str(e)}")


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


# Temporary storage for registration confirmation flow
PENDING_REGISTRATIONS = {}  # {user_id: {'embedding': [...], 'name': '...'}}

# Confirmation threshold (should be higher than login threshold for registration)
CONFIRMATION_THRESHOLD = 0.80


@app.post("/voice/register/start")
async def start_registration(
    user_id: str = Form(...),
    name: str = Form(None),
    audio: UploadFile = File(...)
):
    """
    Start voice registration - record first voice sample.
    Stores embedding temporarily for confirmation.
    
    Args:
        user_id: IC number
        name: User's name (optional)
        audio: Audio file
    """
    try:
        if not user_id or len(user_id.strip()) == 0:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        if not audio or audio.filename == "":
            raise HTTPException(status_code=400, detail="Audio file is required")
        
        print(f"\n📝 Starting registration for: {user_id} (Name: {name})")
        
        audio_path = process_audio_file(audio)
        if audio_path is None:
            raise HTTPException(status_code=500, detail="Failed to save audio file")
        
        try:
            embedding = extract_voice_embedding(audio_path)
            if embedding is None:
                raise HTTPException(status_code=500, detail="Failed to extract voice embedding")
            
            # Store temporarily for confirmation (with name)
            PENDING_REGISTRATIONS[user_id] = {
                'embedding': embedding.tolist(),
                'name': name
            }
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "First recording saved. Please record again to confirm.",
                    "user_id": user_id,
                    "step": "awaiting_confirmation"
                }
            )
        finally:
            cleanup_temp_file(audio_path)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Start registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration start failed: {str(e)}")


@app.post("/voice/register/confirm")
async def confirm_registration(
    user_id: str = Form(...),
    audio: UploadFile = File(...)
):
    """
    Confirm voice registration - compare second recording with first.
    If match, save to database. If not, require re-registration.
    """
    try:
        if not user_id or len(user_id.strip()) == 0:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        if user_id not in PENDING_REGISTRATIONS:
            raise HTTPException(
                status_code=400, 
                detail="No pending registration found. Please start registration first."
            )
        
        if not audio or audio.filename == "":
            raise HTTPException(status_code=400, detail="Audio file is required")
        
        # Get pending registration data
        pending_data = PENDING_REGISTRATIONS[user_id]
        pending_name = pending_data.get('name') if isinstance(pending_data, dict) else None
        
        print(f"\n🔄 Confirming registration for: {user_id} (Name: {pending_name})")
        
        audio_path = process_audio_file(audio)
        if audio_path is None:
            raise HTTPException(status_code=500, detail="Failed to save audio file")
        
        try:
            # Extract confirmation embedding
            confirm_embedding = extract_voice_embedding(audio_path)
            if confirm_embedding is None:
                raise HTTPException(status_code=500, detail="Failed to extract voice embedding")
            
            # Get first recording embedding
            first_embedding_data = pending_data.get('embedding') if isinstance(pending_data, dict) else pending_data
            first_embedding = np.array(first_embedding_data)
            
            # Compare the two recordings
            similarity = compute_cosine_similarity(first_embedding, confirm_embedding)
            
            print(f"  Confirmation similarity: {similarity:.4f}")
            print(f"  Threshold: {CONFIRMATION_THRESHOLD}")
            
            if similarity >= CONFIRMATION_THRESHOLD:
                # Voice confirmed! Average the two embeddings for better accuracy
                averaged_embedding = (first_embedding + confirm_embedding) / 2
                save_embedding(user_id, averaged_embedding, name=pending_name)
                
                # Clean up pending registration
                del PENDING_REGISTRATIONS[user_id]
                
                print(f"  ✓ Registration CONFIRMED and saved!")
                
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": True,
                        "confirmed": True,
                        "similarity_score": round(float(similarity), 4),
                        "message": "Voice confirmed and registered successfully!",
                        "user_id": user_id
                    }
                )
            else:
                # Voice doesn't match - clear pending and ask to restart
                del PENDING_REGISTRATIONS[user_id]
                
                print(f"  ✗ Confirmation FAILED - voices don't match")
                
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": True,
                        "confirmed": False,
                        "similarity_score": round(float(similarity), 4),
                        "threshold": CONFIRMATION_THRESHOLD,
                        "message": "Voice recordings don't match. Please try registering again.",
                        "user_id": user_id
                    }
                )
        
        finally:
            cleanup_temp_file(audio_path)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Confirm registration error: {e}")
        # Clean up on error
        if user_id in PENDING_REGISTRATIONS:
            del PENDING_REGISTRATIONS[user_id]
        raise HTTPException(status_code=500, detail=f"Registration confirmation failed: {str(e)}")


@app.delete("/voice/register/cancel/{user_id}")
async def cancel_registration(user_id: str):
    """Cancel a pending registration."""
    if user_id in PENDING_REGISTRATIONS:
        del PENDING_REGISTRATIONS[user_id]
    return JSONResponse(
        status_code=200,
        content={"success": True, "message": "Pending registration cancelled"}
    )


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


@app.get("/user/{user_id}")
async def get_user_by_ic(user_id: str):
    """
    Get user data from Firebase by IC number.
    Used for login verification.
    
    Args:
        user_id: IC number (with or without dashes)
        
    Returns:
        JSON with user data (name, icNumber, language, hasVoice, hasFace)
    """
    # Remove dashes from IC number
    clean_id = user_id.replace("-", "")
    
    if not firebase_initialized or not db:
        raise HTTPException(status_code=503, detail="Firebase not available")
    
    try:
        doc_ref = db.collection(FIREBASE_COLLECTION).document(clean_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "user_id": clean_id,
                    "name": data.get("name", "Unknown"),
                    "icNumber": data.get("icNumber", clean_id),
                    "language": data.get("language"),
                    "hasVoice": bool(data.get("voiceEmbedding") and len(data.get("voiceEmbedding", [])) > 1),
                    "hasFace": bool(data.get("faceEmbedding") and len(data.get("faceEmbedding", [])) > 1)
                }
            )
        else:
            raise HTTPException(status_code=404, detail=f"User not registered")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


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
    print(f"Firebase: {'✓ Connected' if firebase_initialized else '✗ Not connected'}")
    if firebase_initialized:
        print(f"Collection: '{FIREBASE_COLLECTION}'")
        print(f"Fields: voiceEmbedding (updated on registration)")
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
        "load_VoiceLogin_Model:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
