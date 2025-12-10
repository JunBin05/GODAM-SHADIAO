# Voice Navigation Integration Guide

## Overview
Your microphone button on MainPage can now use the advanced Python AI voice navigation with page navigation features.

## Architecture
```
Frontend (MainPage.jsx)
    ↓ [records audio]
useVoiceNavigation Hook
    ↓ [sends WAV file]
Voice API Server (port 8001)
    ↓ [uses]
voice_navigation_local.py (AI logic)
    ↓ [returns]
Response + Navigation commands
```

## Setup Instructions

### 1. Start the Voice API Server

Open a new PowerShell terminal:

```powershell
cd "c:\Users\Vincent Loh\GODAM-SHADIAO\voice-login"
& "C:/Program Files/Python313/python.exe" voice_api_server.py
```

This starts the API server on **http://localhost:8001**

### 2. Update MainPage.jsx

Replace the existing microphone button logic with the new hook:

```jsx
// At top of MainPage.jsx, add import:
import { useVoiceNavigation } from '../hooks/useVoiceNavigation';

// Inside MainPage component, replace speech recognition code with:
const {
  isListening,
  isProcessing,
  transcript,
  aiResponse,
  startListening,
  stopListening,
  resetConversation
} = useVoiceNavigation(userData?.icNumber);

// Replace the microphone button handlers:
const handleMicPress = (e) => {
  e.preventDefault();
  if (e.target.setPointerCapture) {
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {
      console.error("Pointer capture error:", err);
    }
  }
  startListening();
};

const handleMicRelease = (e) => {
  if (e.target.releasePointerCapture) {
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (err) {}
  }
  stopListening();
};
```

### 3. Run Everything

You need 3 terminals running:

**Terminal 1 - Backend (MongoDB):**
```powershell
cd "c:\Users\Vincent Loh\GODAM-SHADIAO\backend"
& "C:/Program Files/Python313/python.exe" -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Voice API Server:**
```powershell
cd "c:\Users\Vincent Loh\GODAM-SHADIAO\voice-login"
& "C:/Program Files/Python313/python.exe" voice_api_server.py
```

**Terminal 3 - Frontend:**
```powershell
cd "c:\Users\Vincent Loh\GODAM-SHADIAO"
npm run dev
```

## How It Works

### User Flow:
1. **User presses mic button** → Recording starts
2. **User speaks** → Audio captured
3. **User releases mic** → Audio sent to Python AI
4. **AI processes** → Returns transcript + response
5. **AI speaks response** → Uses browser TTS
6. **If navigation question** → Asks user "Want to go to X page?"
7. **User responds** → Opens browser to that page OR continues conversation

### Example:
```
👤 User: "Check my STR balance"
🤖 AI: "Permohonan STR anda lulus. Bayaran seterusnya RM200. 
       Adakah anda mahu pergi ke halaman STR?"
👤 User: "Ya"
🤖 AI: "Membuka halaman STR..."
🌐 [Browser opens /str page]
```

## API Endpoints

### POST /voice/process
- **Request**: 
  - `audio`: WAV file (multipart/form-data)
  - `user_ic`: User IC number
- **Response**:
  ```json
  {
    "transcript": "user said this",
    "reply": "AI response",
    "language": "BM",
    "continue_conversation": true/false,
    "navigate_to": "str" | null,
    "session_state": {...}
  }
  ```

### POST /voice/reset
- Resets conversation state

### GET /voice/state
- Gets current conversation state

## Troubleshooting

### Voice API Server won't start
- Check if port 8001 is available
- Make sure all dependencies installed: `pip install fastapi uvicorn soundfile`

### Audio not being processed
- Check browser console for errors
- Verify API server is running on port 8001
- Check CORS is enabled (already configured)

### Navigation not working
- Frontend must be on http://localhost:5174
- Browser popup blocker may block new windows
- Check `FRONTEND_URL` in voice_navigation_local.py matches your setup

## Advanced Features

### Multi-language Support
The AI automatically detects user's language preference and responds accordingly:
- **Malay (BM)**: Default
- **Chinese (BC)**: Auto-translates responses
- **English (BI)**: Auto-translates responses

### Conversation Continuity
Some actions require multi-turn conversation:
- Adding family representative (asks for IC, confirms, asks for limit)
- Navigation confirmation (asks if user wants to go to page)

The hook automatically continues listening when `continue_conversation: true`

### Page Navigation Map
Current navigable pages:
- `str` → /str (STR status page)
- `sara` → /sara (MyKasih page)
- `str_apply` → /str-apply (STR application)
- `reminders` → /reminders (Reminders page)
- `main` → /main (Home page)

## Files Modified/Created

### New Files:
1. `voice-login/voice_api_server.py` - FastAPI server wrapper
2. `src/hooks/useVoiceNavigation.js` - React hook for frontend integration

### Files to Modify:
1. `src/pages/MainPage.jsx` - Replace speech recognition with useVoiceNavigation hook

### Existing Files (no changes needed):
- `voice-login/voice_navigation_local.py` - Already has navigation features
- `backend/main.py` - Backend API (separate service)

## Next Steps

1. Start all 3 servers (backend, voice API, frontend)
2. Update MainPage.jsx to use the new hook
3. Test the microphone button
4. Speak commands like:
   - "Check my STR balance"
   - "Check MyKasih balance"
   - "Go home"
   - "Apply for STR"

The AI will respond and offer to navigate to relevant pages!
