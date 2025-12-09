# 🎤 Voice-Based Speaker Verification Backend

A FastAPI backend for voice-based login authentication using SpeechBrain's ECAPA-TDNN speaker embedding model.

## Features

✅ **Speaker Registration** - Record and store voice embeddings  
✅ **Voice Login** - Authenticate users by comparing voice patterns  
✅ **ECAPA-TDNN Model** - State-of-the-art speaker recognition (trained on VoxCeleb)  
✅ **Cosine Similarity** - Configurable similarity threshold for authentication  
✅ **Error Handling** - Comprehensive error responses  
✅ **CORS Support** - Ready for frontend integration  
✅ **Mock Database** - Easy to integrate with Firestore/MongoDB/PostgreSQL  

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

**Python Version**: 3.8+  
**System Requirements**: ~4GB RAM (GPU recommended for faster inference)

### 2. Run the Server

```bash
python main.py
```

Server starts at `http://localhost:8000`

### 3. API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 📋 API Endpoints

### Health Check
```
GET /health
```

### Register Voice
```
POST /voice/register
```
Form data: `user_id`, `audio` file

### Login with Voice
```
POST /voice/login
```
Form data: `user_id`, `audio` file

### Get User Info
```
GET /voice/user/{user_id}/info
```

### Delete User
```
DELETE /voice/user/{user_id}
```

---

## 🧪 Testing

Use `test_client.py` to test the API with live microphone recording or pre-recorded files.

---

## 📦 Model Details

**Model**: SpeechBrain ECAPA-TDNN  
**Output**: 192-dimensional speaker embedding  
**Similarity Threshold**: 0.75 (configurable)

---

## 🗄️ Database Integration

Easily integrate with:
- Firestore
- MongoDB  
- PostgreSQL
- Any database of your choice

See code comments for integration examples.

---

## 📝 License
