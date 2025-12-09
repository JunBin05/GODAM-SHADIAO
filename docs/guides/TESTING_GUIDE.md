# MyID Voice Assistant - Backend Testing Guide

## 🎯 Current Implementation Status

### ✅ **Completed Components**

1. **Project Structure** - All directories created
2. **FastAPI Server** - Basic server with CORS configured
3. **Mock Data Files**:
   - ✅ `mock_users.json` - 15 diverse user profiles
   - ✅ `mock_stores.json` - 20 stores with coordinates
   - ✅ `mock_aid_data.json` - Transactions & reminders
   - ✅ `translations.json` - English/Malay translations
4. **Configuration** - Settings in `config.py`

### ⏳ **Not Yet Implemented**

- Authentication endpoints (login, register)
- Aid program endpoints (status, balance, history, eligibility)
- Store locator endpoint
- QR payment system
- Reminder endpoint
- Pydantic models
- Service layer logic
- JWT token handling

---

## 🧪 How to Test What's Working Now

### 1. **Start the FastAPI Server**

```powershell
# Make sure you're in the project root directory
cd C:\Users\JON\OneDrive\Documents\GODAM-SHADIAO

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start the server
cd backend
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

### 2. **Access Swagger UI (Interactive API Documentation)**

Open your browser and go to:
```
http://localhost:8000/docs
```

This will show you:
- All available endpoints
- Interactive testing interface
- Request/response schemas

### 3. **Test Basic Endpoints**

**Option A: Using Browser**
- Root: http://localhost:8000/
- Health: http://localhost:8000/health

**Option B: Using PowerShell (curl)**
```powershell
# Test root endpoint
curl http://localhost:8000/

# Test health check
curl http://localhost:8000/health
```

Expected response:
```json
{
  "success": true,
  "message": "MyID Voice Assistant Backend API",
  "version": "1.0.0",
  "status": "running"
}
```

### 4. **Verify Mock Data Files**

```powershell
# Check if data files exist
Get-ChildItem backend\data\

# View user data (first few lines)
Get-Content backend\data\mock_users.json -Head 20

# View store data
Get-Content backend\data\mock_stores.json -Head 20

# View translations
Get-Content backend\data\translations.json -Head 20
```

### 5. **Verify Python Dependencies**

```powershell
.\venv\Scripts\Activate.ps1
pip list
```

Should show:
- ✅ fastapi==0.104.1
- ✅ uvicorn==0.24.0
- ✅ pydantic==2.5.0
- ✅ python-jose==3.3.0
- ✅ numpy (>=1.26.0)
- ✅ qrcode, pillow, etc.

---

## 📊 Mock Data Summary

### **Users (15 profiles)**
- **USR001-USR015**: Diverse income levels (RM900 - RM4200)
- **Ages**: 46-61 years old
- **States**: Selangor, KL, Penang, Johor, Kedah, Perak, etc.
- **Disability status**: 5 users with disability (USR002, USR005, USR008, USR011, USR015)
- **Enrolled programs**: Various combinations of STR, SARA, MyKasih
- **PINs**: Each user has a 6-digit PIN for testing

### **Stores (20 locations)**
- **Types**: Grocery, Supermarket, Hypermarket, Pharmacy
- **Coverage**: Klang Valley area with GPS coordinates
- **Examples**: 99 Speedmart, Mydin, Giant, Guardian, KK Mart

### **Transactions**
- Mock transaction history for enrolled MyKasih users
- Includes monthly allocations and spending
- Disability users get bonus allocations (RM250 vs RM200)

### **Translations**
- Full English/Malay support for:
  - Program names
  - Status messages
  - Error messages
  - Field labels
  - Eligibility reasons

---

## 🔥 Quick Test Examples (For When APIs Are Implemented)

### Test User Credentials
```
User: USR001 (Ahmad bin Abdullah)
PIN: 123456
Income: RM1800 (eligible for STR, MyKasih)
Language: Malay

User: USR002 (Siti Aminah)
PIN: 654321
Income: RM950 (eligible for all programs + disability bonus)
Language: Malay

User: USR004 (Raj Kumar)
PIN: 999888
Income: RM3500 (NOT eligible - income too high)
Language: English
```

### Test Store Locations
```
Test coordinates (Petaling Jaya):
Latitude: 3.1142
Longitude: 101.6253
(Should find 99 Speedmart as nearest)

Test coordinates (KL City Center):
Latitude: 3.1478
Longitude: 101.7000
(Should find stores in Ampang, Cheras area)
```

---

## 🚀 Next Steps to Make APIs Work

To test actual functionality, you need to implement:

1. **Authentication Routes** (`/api/auth/login`, `/api/auth/register`)
2. **Aid Routes** (`/api/aid/status/{user_id}`, etc.)
3. **Store Locator** (`/api/stores/nearby`)
4. **Payment Routes** (`/api/payment/generate-qr`, etc.)
5. **Reminder Route** (`/api/reminders/{user_id}`)

Would you like me to:
- ✅ Continue implementing the remaining APIs?
- ✅ Create a Postman collection for testing?
- ✅ Write unit tests?

---

## 🐛 Common Issues & Solutions

### Issue: "Python not found"
**Solution**: Use `py` launcher instead:
```powershell
py -m venv venv
py --version
```

### Issue: "Module not found" errors
**Solution**: Make sure virtual environment is activated:
```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Issue: "Port 8000 already in use"
**Solution**: Kill existing process or use different port:
```powershell
# Find process on port 8000
netstat -ano | findstr :8000
# Kill it (replace PID)
taskkill /PID <pid> /F

# Or use different port
uvicorn main:app --port 8001
```

### Issue: "CORS errors in browser"
**Solution**: Already configured in `main.py` with `allow_origins=["*"]`

---

## 📝 Test Checklist

- [x] Virtual environment created
- [x] Dependencies installed
- [x] FastAPI server starts without errors
- [x] `/` and `/health` endpoints respond
- [x] Swagger UI accessible at `/docs`
- [x] Mock data files present and valid JSON
- [ ] Authentication endpoints working
- [ ] Aid endpoints working
- [ ] Store locator working
- [ ] QR payment working
- [ ] Multi-language support working

---

**Current Progress**: **30% Complete** (Setup & Data Done, APIs Pending)

Ready to continue implementation? Let me know! 🚀
