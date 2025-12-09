# GODAM-SHADIAO MyID Voice Assistant

A multilingual voice-enabled digital assistant designed for elderly and disabled Malaysians to access government aid programs (STR, SARA/MyKasih) with ease.

## 🎯 Project Overview

**Target Users:** Malaysian elderly & disabled citizens (60+ years old)  
**Languages:** English, Malay, Chinese, Tamil  
**Key Features:**
- 🎤 Voice-activated assistant with speech recognition
- 💰 STR (Sumbangan Tunai Rahmah) application & status tracking
- 🛒 SARA (Sumbangan Asas Rahmah) balance & store locator
- 👨‍👩‍👧‍👦 Family member linking system
- 📱 QR code payment generation
- 🔔 Reminders for payments & document renewals
- 🌐 Multi-language support with auto-translation

---

## 📁 Project Structure

```
GODAM-SHADIAO/
├── backend/                 # FastAPI Python backend
│   ├── data/               # Mock data & translations
│   ├── models/             # Pydantic data models
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── utils/              # Helper functions
│   └── main.py             # FastAPI app entry point
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── context/            # React context providers
│   ├── data/               # Mock frontend data
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   └── main.jsx            # React entry point
├── public/                 # Static assets
├── docs/                   # Documentation
│   ├── planning/           # PRDs, plans, enhancement docs
│   ├── reports/            # Progress reports
│   └── guides/             # User & developer guides
├── tests/                  # Test files
│   ├── backend/            # Backend tests
│   └── frontend/           # Frontend tests
├── tasks/                  # Task breakdowns
├── archive/                # Old files & assets
└── README.md

```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **Python** 3.9+
- **npm** or **yarn**

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# OR: source venv/bin/activate  # Mac/Linux
pip install -r ../requirements.txt
```

### 2. Run Development Servers

**Terminal 1 - Frontend:**
```bash
npm run dev
```
Frontend runs at: **http://localhost:5173**

**Terminal 2 - Backend:**
```bash
cd backend
python main.py
```
Backend runs at: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs**

---

## 🎨 Features Implemented

### ✅ Phase 1: Core Authentication
- User registration & login
- Multi-language support (EN/MS/ZH/TA)
- Language toggle component

### ✅ Phase 2: Voice Assistant
- Speech recognition (Web Speech API)
- Text-to-speech responses
- Voice command navigation

### ✅ Phase 3: Aid Program Integration
- STR application form (7 steps)
- SARA/MyKasih balance display
- Store locator with Google Maps
- QR code payment generation (60s auto-refresh)

### ✅ Phase 4: Family & Reminders
- Family member linking (bidirectional)
- Accept/reject family requests
- Sidebar with notifications
- Payment & document reminders

---

## 🧪 Testing

### Frontend Tests
```bash
npm run test
```

### Backend Tests
```bash
cd backend
pytest tests/
```

### Manual Testing
See `docs/guides/TESTING_GUIDE.md` for detailed test scenarios.

---

## 📚 Documentation

- **Planning:** `docs/planning/` - PRDs, enhancement plans
- **Reports:** `docs/reports/` - Progress & completion reports  
- **Guides:** `docs/guides/` - Testing & translation guides
- **API Docs:** http://localhost:8000/docs (when backend is running)

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **React Router** - Navigation
- **Lucide Icons** - Icon library
- **QRCode.js** - QR generation
- **Google Maps API** - Store locator

### Backend
- **FastAPI** - Web framework
- **Pydantic** - Data validation
- **Python 3.9+** - Programming language

---

## 👥 Team

- **JunBin** - Backend & Integration
- **GuanHoong** - Frontend UI Design
- **Jon** - QR Feature & Testing

---

## 📝 License

This project is developed for educational purposes as part of a hackathon project.

---

## 🔗 Related Links

- [Backend API Documentation](http://localhost:8000/docs)
- [Enhancement Plan](docs/planning/MAINPAGE_ENHANCEMENT_PLAN.md)
- [Translation System](docs/guides/TRANSLATION_SYSTEM.md)

---

## 📝 License

MIT
