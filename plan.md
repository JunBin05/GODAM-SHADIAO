# PROJECT CONTEXT — READ BEFORE GENERATING ANY CODE

We are a 5-person team participating in the “Inclusivity Track” of a Malaysian
digital identity hackathon. Our project is called:

    MyID Voice Assistant — Government Aid Access for Elderly & Disabled Malaysians

The app is a WEB-BASED platform, NOT mobile. It must work well for elderly,
disabled, visually impaired, and low-digital-literacy users in Malaysia.

The goal: make it extremely easy for older Malaysians to 
access/check/apply/understand government-aid programs using VOICE.

We focus on 3 government aid programs (mocked):
- STR (Sumbangan Tunai Rahmah)
- SARA
- MyKasih

NO actual government API is available. 
We must generate MOCK data for eligibility, application status, credit balance,
and history.

Core Features:
1. Voice-first interface (Malay speech → action → Malay TTS)
2. Aid checking (mock data, realistic responses)
3. Store locator for MyKasih (hardcoded stores + Haversine distance)
4. Accessibility UI (large text, high contrast)
5. Family-Assisted Mode (child can help elderly)
6. Simple authentication (PIN or voiceprint)
7. Reminders for deadlines or credit expiry

Team roles:
- 1 Frontend dev (React)
- 2 Backend devs
- 1 Voice/ML specialist
- 1 Pitch deck presenter

MY ROLE = PERSON 2:
Backend Developer – System Logic + Aid Data

This means:
- I manage all aid program logic 
- I create mock data for STR / SARA / MyKasih
- I design and implement clean REST APIs:
      GET /api/aid/status/{user_id}
      GET /api/aid/balance/{user_id}/{program_id}
      GET /api/aid/history/{user_id}/{program_id}
      POST /api/aid/check-eligibility/{program_id}
      GET /api/stores/nearby?lat=&lng=
- I build store locator logic (Haversine)
- I create sample users and scenarios for the demo
- I must produce simple, stable, predictable JSON for frontend and voice backend

Tech stack:
- Backend: FastAPI (Python)
- Database: Firestore OR temporary mock dictionary
- Store locator: Simple math + mock store list
- AI: Handled by Person 4 (speech-to-text, TTS, intent classification)
- Frontend expects easy-to-consume JSON, no nesting, no ambiguity

My output should always follow:
- Clean FastAPI code
- Clean JSON examples
- Simple function signatures
- Only mock logic (NEVER assume real gov integration)
- Reliability, readability, and hackathon-speed implementation

IMPORTANT:
Always remember this is a hackathon prototype, so implementation must be fast,
lightweight, and human-friendly (simple code). No overengineering.

# END OF CONTEXT


