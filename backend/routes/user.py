from fastapi import FastAPI, APIRouter, Form, UploadFile, File
from pydantic import BaseModel
from io import BytesIO
from starlette.responses import JSONResponse
from services.facialRecognition import FaceRecognition
from services.voiceRecognition import VoiceRecognition
import re
import base64
from PIL import Image
import numpy as np


class SimpleRegisterRequest(BaseModel):
    ic_number: str
    name: str
    language: str
    face_embedding: str = None
    voice_embedding: str = None

class UserRegisterRequest(BaseModel):
    nric: str
    name: str
    ic_image_url: str
    face_image_url: str

class UserVerifyRequest(BaseModel):
    nric: str
    face_image_url: str

class SetLanguageRequest(BaseModel):
    user_id: str
    language: str

class UserExistsRequest(BaseModel):
    nric: str

class LoginFaceRequest(BaseModel):
    nric: str
    face_image_url: str

router = APIRouter()
FaceRecognition = FaceRecognition()
VoiceRecognition = VoiceRecognition()

# User lookup endpoint - IC is the document ID
@router.get("/{ic}")
async def get_user_by_ic(ic: str):
    """Get user by IC number (IC is the document ID in MongoDB)"""
    from services.mongodb_service import get_user_by_id

    # Mock test users for easy testing (fallback)
    test_users = {
        "test": {"name": "Test User", "icNumber": "test", "language": "en", "hasVoice": True, "hasFace": True},
        "demo": {"name": "Demo User", "icNumber": "demo", "language": "en", "hasVoice": True, "hasFace": True},
    }

    # Check test users first
    if ic in test_users:
        return {"success": True, **test_users[ic]}

    # Check MongoDB - IC is the _id
    try:
        user = get_user_by_id(ic)

        if user:
            return {
                "success": True,
                "name": user.get('name', ''),
                "icNumber": ic,
                "language": user.get('preferred_language', 'en'),
                "hasVoice": bool(user.get('voice_embedding')),
                "hasFace": bool(user.get('face_embedding'))
            }
    except Exception as e:
        print(f"Error loading user from MongoDB: {e}")

    return {"success": False, "detail": "User not found. Try 'test' or 'demo' for testing."}

@router.post("/user_exists")
async def user_exists(user_data: UserExistsRequest):
    from services.mongodb_service import get_user_by_id
    nric = user_data.nric.replace("-", "")
    user = get_user_by_id(nric)
    hasFace = user is not None and 'face_embedding' in user and user['face_embedding'] is not None
    hasVoice = user is not None and 'voice_embedding' in user and user['voice_embedding'] is not None
    if user:
        return JSONResponse(
            status_code=200,
            content={"status": "success", "message": "User with the given NRIC already exists.", "user_exists": True, "hasFace": hasFace, "hasVoice": hasVoice}
        )
    else:
        return JSONResponse(
            status_code=200,
            content={"status": "fail", "message": "User with the given NRIC does not exist.", "user_exists": False, "hasFace": False, "hasVoice": False}
        )

# Simple user registration endpoint for frontend
@router.post("/simple_register")
async def simple_register(request: SimpleRegisterRequest):
    """Simple registration endpoint for frontend - uses IC as document ID in MongoDB"""
    from services.mongodb_service import get_user_by_id, create_user, update_user

    ic_number = request.ic_number
    name = request.name
    language = request.language
    face_embedding = request.face_embedding
    voice_embedding = request.voice_embedding

    # Check if user already exists (IC is the _id)
    try:
        user = get_user_by_id(ic_number)

        if user:
            # Update existing user
            update_data = {}
            if name:
                update_data['name'] = name
            if language:
                update_data['preferred_language'] = language
            if face_embedding:
                update_data['face_embedding'] = face_embedding
            if voice_embedding:
                update_data['voice_embedding'] = voice_embedding

            if update_data:
                update_user(ic_number, update_data)

            return {
                "success": True,
                "message": "User updated",
                "user_id": ic_number,
                "name": name
            }
        else:
            # Create new user with IC as _id
            new_user = {
                "_id": ic_number,
                "name": name or "New User",
                "preferred_language": language,
                "face_embedding": face_embedding if face_embedding else None,
                "voice_embedding": voice_embedding if voice_embedding else None,
                "created_date": "2024-12-10"
            }

            create_user(new_user)
            return {
                "success": True,
                "message": "Registration successful",
                "user_id": ic_number,
                "name": new_user['name']
            }
    except Exception as e:
        print(f"Error in registration: {e}")
        return {"success": False, "detail": str(e)}


@router.post("/register")
async def register_user(user_data: UserRegisterRequest):
    from services.mongodb_service import create_user, user_exists
    nric = user_data.nric.replace("-", "")
    name = user_data.name
    ic_image_url = user_data.ic_image_url
    face_image_url = user_data.face_image_url

    ic_image_b64 = re.sub('^data:image/.+;base64,', '', ic_image_url)
    face_image_b64 = re.sub('^data:image/.+;base64,', '', face_image_url)

    ic_image_data = base64.b64decode(ic_image_b64)
    face_image_data = base64.b64decode(face_image_b64)
    ic_img = Image.open(BytesIO(ic_image_data))
    face_img = Image.open(BytesIO(face_image_data))

    ic_img = np.array(ic_img)
    face_img = np.array(face_img)

    emb = FaceRecognition.compare_embeddings(ic_img, face_img)
    if emb is not None:
        if not user_exists(nric):
            emb_json = emb.tolist()
            create_user({
                "_id": nric,
                "name": name,
                "face_embedding": emb_json,
            })
            return JSONResponse(
                status_code=200,
                content={"status": "success", "message": "User registered successfully.", "user_exists": False}

            )
        else:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "User with the given NRIC already exists.", "user_exists": True}
            )
    else:
        return JSONResponse(
            status_code=200,
            content={"status": "fail", "message": "Face does not match IC image.", "user_exists": False}
        )

@router.post("/update_voice")
async def update_voice_embedding(
    user_id: str = Form(...),
    voice_1: UploadFile = File(...),
    voice_2: UploadFile = File(...)

):
    from services.mongodb_service import user_exists, update_user
    user_id = user_id.replace("-", "")
    if not user_exists(user_id):
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "User with the given NRIC does not exist."}
        )

    # Read uploaded audio bytes
    audio_1_bytes = await voice_1.read()
    audio_2_bytes = await voice_2.read()

    audio_1 = BytesIO(audio_1_bytes)
    audio_2 = BytesIO(audio_2_bytes)

    # Example: extract embedding from audio buffer
    # Replace with your actual voice pipeline
    # e.g., using torchaudio/soundfile to load waveform, then FaceRecognition
    # waveform, sr = torchaudio.backend.sox_io.load(fileobj=buf, format="wav")
    # emb = FaceRecognition.extract_voice_embedding(waveform, sr)

    emb1 = VoiceRecognition.extract_voice_embedding(audio_1)
    emb2 = VoiceRecognition.extract_voice_embedding(audio_2)
    if emb1 is None or emb2 is None:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Could not extract voice embeddings from the provided audio files."}
        )

    if VoiceRecognition.similar_for_confirmation(emb1, emb2):
        averaged_embedding = VoiceRecognition.average_embeddings(emb1, emb2)
        update_user(user_id, {"voice_embedding": averaged_embedding.tolist()})
        return JSONResponse(
            status_code=200,
            content={"status": "success", "message": "Voice embeddings updated successfully."}
        )
    else:
        return JSONResponse(
            status_code=200,
            content={"status": "fail", "message": "Voice samples do not match."}
        )

@router.post("/set_language")
async def set_preferred_language(request: SetLanguageRequest):
    from services.mongodb_service import user_exists, update_user
    user_id = request.user_id.replace("-", "")
    language = request.language

    if not user_exists(user_id):
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "User with the given NRIC does not exist."}
        )

    update_user(user_id, {"preferred_language": language})
    return JSONResponse(
        status_code=200,
        content={"status": "success", "message": "Preferred language updated successfully."}
    )


@router.post("/login_face")
async def login_face(request: LoginFaceRequest):
    from services.mongodb_service import get_user_by_id, user_exists
    nric = request.nric.replace("-", "")
    face_image_url = request.face_image_url

    face_image_b64 = re.sub('^data:image/.+;base64,', '', face_image_url)
    face_image_data = base64.b64decode(face_image_b64)
    face_img = Image.open(BytesIO(face_image_data))
    face_img = np.array(face_img)

    if not user_exists(nric):
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "User with the given NRIC does not exist."}
        )

    user = get_user_by_id(nric)
    if not user or 'face_embedding' not in user or user['face_embedding'] is None:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "User with the given NRIC has no face data."}
        )

    sameFace = FaceRecognition.verify_face(face_img, nric)

    userData = {
        "icNumber": nric,
        "name": user.get('name', ''),
        "language": user.get('preferred_language', 'en'),
        "hasVoice": bool(user.get('voice_embedding')),
        "hasFace": True,
        "phone": user.get('phone', ''),
        "email": user.get('email', ''),
        "disability_status": user.get('disability_status', False),
        "state": user.get('state', ''),
    }

    if sameFace:
        return JSONResponse(
            status_code=200,
            content={"status": "success", "message": "Face authentication successful.", "verified": True, "userData": userData})
    else:
        return JSONResponse(
            status_code=200,
            content={"status": "fail", "message": "Face authentication failed.", "verified": False, "userData": None}
        )