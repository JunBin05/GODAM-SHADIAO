# 🎤 Voice-Based Login API - Complete Setup Guide

## 📂 Project Structure

```
GODAM-SHADIAO/
├── main.py                 # FastAPI backend server
├── test_client.py          # Python test client
├── advanced_examples.py    # Advanced usage patterns
├── index.html             # Frontend web interface
├── requirements.txt       # Python dependencies
└── README.md             # Project documentation
```

---

## 🚀 Installation & Setup

### Step 1: Install Python Dependencies

```bash
pip install -r requirements.txt
```

**System Requirements:**
- Python 3.8+
- 4GB RAM minimum (8GB+ recommended)
- GPU (optional, but recommended for faster inference)

### Step 2: Verify Installation

```bash
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA Available:', torch.cuda.is_available())"
```

---

## ▶️ Running the Application

### Option A: Start Backend Server

```bash
python main.py
```

**Expected Output:**
```
============================================================
🎤 Voice-Based Login API Starting
============================================================
Device: GPU (CUDA) or CPU
Similarity Threshold: 0.75
============================================================
```

Server runs at: `http://localhost:8000`

### Option B: Access API Documentation

Once server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🧪 Testing the API

### Option 1: Using Web Interface (Easy)

1. Open `index.html` in a web browser
2. Allow microphone access when prompted
3. Register your voice
4. Try logging in

**Features:**
- 🎤 Live microphone recording
- 📊 Real-time similarity scores
- 🎨 Beautiful UI with visualizations

### Option 2: Using Python Test Client

```bash
# Record and test with live microphone
python test_client.py

# Test with pre-recorded files
python test_client.py --files
```

### Option 3: Using cURL

```bash
# Health check
curl http://localhost:8000/health

# Register
curl -X POST http://localhost:8000/voice/register \
  -F "user_id=john_doe" \
  -F "audio=@your_voice.wav"

# Login
curl -X POST http://localhost:8000/voice/login \
  -F "user_id=john_doe" \
  -F "audio=@login_voice.wav"
```

### Option 4: Using Python Requests

```python
import requests

# Register
with open("voice.wav", "rb") as f:
    response = requests.post(
        "http://localhost:8000/voice/register",
        files={"audio": f},
        data={"user_id": "john_doe"}
    )
    print(response.json())

# Login
with open("voice.wav", "rb") as f:
    response = requests.post(
        "http://localhost:8000/voice/login",
        files={"audio": f},
        data={"user_id": "john_doe"}
    )
    print(response.json())
```

---

## 📋 API Endpoints Reference

### GET /health
Check server health and model status.

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "similarity_threshold": 0.75
}
```

---

### POST /voice/register
Register user's voice for authentication.

```bash
curl -X POST http://localhost:8000/voice/register \
  -F "user_id=alice" \
  -F "audio=@registration.wav"
```

**Form Parameters:**
- `user_id` (required): Unique user identifier
- `audio` (required): Audio file (.wav, .mp3, .m4a, .ogg)

**Response:**
```json
{
  "success": true,
  "message": "Voice registered successfully",
  "user_id": "alice",
  "embedding_dim": 192,
  "embedding_stored": true
}
```

---

### POST /voice/login
Authenticate user by voice comparison.

```bash
curl -X POST http://localhost:8000/voice/login \
  -F "user_id=alice" \
  -F "audio=@login.wav"
```

**Form Parameters:**
- `user_id` (required): Unique user identifier
- `audio` (required): Audio file (.wav, .mp3, .m4a, .ogg)

**Response (Authenticated):**
```json
{
  "success": true,
  "user_id": "alice",
  "authenticated": true,
  "similarity_score": 0.8234,
  "threshold": 0.75,
  "message": "Authentication successful"
}
```

**Response (Not Authenticated):**
```json
{
  "success": true,
  "user_id": "alice",
  "authenticated": false,
  "similarity_score": 0.6892,
  "threshold": 0.75,
  "message": "Voice does not match registered user"
}
```

---

### GET /voice/user/{user_id}/info
Get user registration information.

```bash
curl http://localhost:8000/voice/user/alice/info
```

**Response:**
```json
{
  "user_id": "alice",
  "registered": true,
  "embedding_dimension": 192,
  "embedding_norm": 42.156
}
```

---

### DELETE /voice/user/{user_id}
Delete user's registered voice embedding.

```bash
curl -X DELETE http://localhost:8000/voice/user/alice
```

**Response:**
```json
{
  "success": true,
  "message": "User alice deleted successfully"
}
```

---

## ⚙️ Configuration

Edit `main.py` to customize behavior:

### Adjust Similarity Threshold

```python
# Around line 35
SIMILARITY_THRESHOLD = 0.75  # Range: 0.0 - 1.0

# Lower value (0.70) = More lenient, fewer false negatives
# Higher value (0.80) = Stricter, fewer false positives
```

### Change Server Port

```python
# In __main__ section (end of file)
uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=8080,  # Change port here
    reload=True,
    log_level="info"
)
```

### Disable CORS (for development)

```python
# Around line 24
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 💾 Database Integration

### MongoDB Integration

```python
# In main.py, replace the dictionary with:

from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["voice_auth"]

def save_embedding(user_id: str, embedding: np.ndarray) -> None:
    db.embeddings.replace_one(
        {"user_id": user_id},
        {"user_id": user_id, "embedding": embedding.tolist()},
        upsert=True
    )

def load_embedding(user_id: str) -> Optional[np.ndarray]:
    doc = db.embeddings.find_one({"user_id": user_id})
    if doc:
        return np.array(doc["embedding"])
    return None
```

### Firestore Integration

```python
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def save_embedding(user_id: str, embedding: np.ndarray) -> None:
    db.collection("voice_embeddings").document(user_id).set({
        "embedding": embedding.tolist()
    })

def load_embedding(user_id: str) -> Optional[np.ndarray]:
    doc = db.collection("voice_embeddings").document(user_id).get()
    if doc.exists:
        return np.array(doc.get("embedding"))
    return None
```

### PostgreSQL Integration

```python
from sqlalchemy import create_engine, Column, String, ARRAY, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class VoiceEmbedding(Base):
    __tablename__ = "voice_embeddings"
    user_id = Column(String, primary_key=True)
    embedding = Column(ARRAY(Float))

engine = create_engine("postgresql://user:pass@localhost/voice_db")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

def save_embedding(user_id: str, embedding: np.ndarray) -> None:
    session = Session()
    record = VoiceEmbedding(
        user_id=user_id,
        embedding=embedding.tolist()
    )
    session.merge(record)
    session.commit()
    session.close()

def load_embedding(user_id: str) -> Optional[np.ndarray]:
    session = Session()
    record = session.query(VoiceEmbedding).filter_by(user_id=user_id).first()
    session.close()
    if record:
        return np.array(record.embedding)
    return None
```

---

## 🐳 Docker Deployment

### Build Docker Image

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Build and Run

```bash
# Build image
docker build -t voice-login-api .

# Run container
docker run -p 8000:8000 voice-login-api

# Run with GPU support
docker run --gpus all -p 8000:8000 voice-login-api
```

---

## 🚀 Production Deployment

### Using Gunicorn

```bash
pip install gunicorn

gunicorn -w 4 -b 0.0.0.0:8000 --timeout 120 main:app
```

### Using Systemd (Linux)

Create `/etc/systemd/system/voice-api.service`:

```ini
[Unit]
Description=Voice-Based Login API
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/path/to/app
ExecStart=/usr/bin/gunicorn -w 4 -b 0.0.0.0:8000 main:app
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl enable voice-api
sudo systemctl start voice-api
```

### Using Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 🎯 Advanced Usage

### Batch Registration

```python
from test_client import batch_register_users

users = [
    {"user_id": "alice", "audio_path": "alice.wav"},
    {"user_id": "bob", "audio_path": "bob.wav"},
]

results = batch_register_users(users)
print(f"Success: {len(results['success'])}")
```

### Performance Monitoring

```python
from advanced_examples import PerformanceMonitor

monitor = PerformanceMonitor()
# ... perform operations ...
summary = monitor.get_summary()
print(summary)
```

### Session Management

```python
from advanced_examples import VoiceAuthSession

session = VoiceAuthSession("alice")
session.register("alice_reg.wav")
if session.authenticate("alice_login.wav"):
    token = session.get_session_token()
```

---

## 🔧 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'torch'"

**Solution:**
```bash
pip install --upgrade torch torchaudio
```

### Issue: "CUDA out of memory"

**Solution:**
```python
# Edit main.py, force CPU:
speaker_model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_models/spkrec-ecapa-voxceleb",
    run_opts={"device": "cpu"}  # Force CPU
)
```

### Issue: Slow inference (taking >5 seconds)

**Solution:**
- Use GPU instead of CPU
- Check system resources (RAM, CPU usage)
- Reduce model load time by caching

### Issue: Low similarity scores (many false negatives)

**Solution:**
- Lower threshold: `SIMILARITY_THRESHOLD = 0.70`
- Ensure clear audio during registration
- Use consistent microphone

### Issue: High false positives

**Solution:**
- Raise threshold: `SIMILARITY_THRESHOLD = 0.80`
- Register with multiple samples
- Add liveness detection

### Issue: "Connection refused" when accessing frontend

**Solution:**
- Ensure backend is running: `python main.py`
- Check if port 8000 is in use: `netstat -ano | findstr :8000`
- Open index.html through a local server, not `file://` protocol

```bash
# Simple Python server
python -m http.server 8080

# Then visit: http://localhost:8080/index.html
```

---

## 📊 Performance Benchmarks

| Metric | CPU | GPU (CUDA) |
|--------|-----|-----------|
| Model Load | ~5s | ~3s |
| Registration | ~1-2s | ~0.3-0.5s |
| Login | ~1-2s | ~0.3-0.5s |
| Similarity Comparison | <1ms | <1ms |
| Memory Usage | ~2GB | ~1.5GB |

---

## 🔐 Security Best Practices

### For Development
✅ Current implementation is fine for hackathons and prototypes

### For Production
⚠️ Add the following:

```python
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from fastapi import Depends
import secrets

security = HTTPBearer()

async def verify_api_key(credentials: HTTPAuthCredentials = Depends(security)):
    if credentials.credentials != os.getenv("API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API key")
    return credentials.credentials

@app.post("/voice/register")
async def register_voice(
    api_key: str = Depends(verify_api_key),
    user_id: str = Form(...),
    audio: UploadFile = File(...)
):
    # ... endpoint code ...
```

### Environment Variables

Create `.env`:
```
API_KEY=your_secret_key_here
DATABASE_URL=postgresql://user:pass@localhost/db
SIMILARITY_THRESHOLD=0.75
```

---

## 📞 Support & Resources

- **SpeechBrain Docs**: https://speechbrain.github.io/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **PyTorch Docs**: https://pytorch.org/docs/

---

## 📝 License

MIT License - Feel free to use for any purpose!

---

**Built with ❤️ using FastAPI + SpeechBrain + PyTorch**
