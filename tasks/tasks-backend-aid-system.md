# Task List: Backend System Logic & Aid Data APIs

## Relevant Files

- `backend/main.py` - FastAPI application entry point, router registration, CORS configuration
- `backend/config.py` - Configuration settings, constants, environment variables
- `backend/models/user.py` - Pydantic models for User, UserProfile, BiometricData
- `backend/models/aid.py` - Pydantic models for Aid programs (STR, SARA, MyKasih)
- `backend/models/payment.py` - Pydantic models for QR payment system
- `backend/models/auth.py` - Pydantic models for authentication requests/responses
- `backend/routes/auth.py` - Authentication endpoints (login, register)
- `backend/routes/aid.py` - Aid program endpoints (status, balance, history, eligibility)
- `backend/routes/payment.py` - QR payment endpoints (generate, verify)
- `backend/routes/stores.py` - Store locator endpoint
- `backend/routes/reminders.py` - Reminder system endpoint
- `backend/services/auth_service.py` - Authentication logic (face, voice, PIN matching)
- `backend/services/aid_service.py` - Aid program business logic
- `backend/services/eligibility_service.py` - Eligibility calculation logic
- `backend/services/payment_service.py` - QR code generation and verification
- `backend/services/translation_service.py` - Multi-language support handler
- `backend/utils/haversine.py` - Distance calculation utility
- `backend/utils/jwt_handler.py` - JWT token generation and validation
- `backend/data/mock_users.json` - Mock user profiles (10-15 users)
- `backend/data/mock_stores.json` - Mock store list (15-25 stores)
- `backend/data/translations.json` - English/Malay translation mappings
- `requirements.txt` - Python dependencies
- `README.md` - Setup instructions and API documentation

### Notes

- Tests will be added as time permits during hackathon
- Focus on working functionality first, then polish
- Use FastAPI's built-in Swagger UI (`/docs`) for testing
- Keep code simple and readable for hackathon demo conditions

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch (e.g., `git checkout -b feature/backend-aid-system`)

- [x] 1.0 Project Setup & Environment Configuration
  - [x] 1.1 Create project directory structure (`backend/`, `backend/routes/`, `backend/services/`, `backend/models/`, `backend/utils/`, `backend/data/`)
  - [x] 1.2 Create `requirements.txt` with all dependencies (FastAPI, uvicorn, pydantic, python-jose, numpy, qrcode, pillow)
  - [x] 1.3 Create virtual environment and install dependencies
  - [x] 1.4 Create `backend/main.py` with FastAPI app initialization and CORS middleware
  - [x] 1.5 Create `backend/config.py` with constants (JWT_SECRET, TOKEN_EXPIRY, PROGRAM_IDS, etc.)
  - [x] 1.6 Test FastAPI server runs successfully (`uvicorn main:app --reload`)

- [x] 2.0 Create Mock Data & Translation Files
  - [x] 2.1 Create `backend/data/mock_users.json` with 15 diverse user profiles (name, IC, age, income, household_size, state, disability_status, employment_status, dependents, PIN, face_embedding, voice_embedding)
  - [x] 2.2 Create `backend/data/mock_stores.json` with 20 stores (name, address, latitude, longitude, store_type)
  - [x] 2.3 Generate mock transaction history for each user (included in mock_aid_data.json)
  - [x] 2.4 Generate mock aid enrollment data (included in user profiles - enrolled_programs field)
  - [x] 2.5 Create `backend/data/translations.json` with English/Malay key-value pairs for common messages
  - [x] 2.6 Create mock reminder data for users (credit expiry, payment deadlines in mock_aid_data.json)

- [x] 3.0 Implement Authentication System (Facial, Voiceprint, PIN)
  - [x] 3.1 Create `backend/models/auth.py` with Pydantic models (LoginRequest, RegisterRequest, AuthResponse, TokenData)
  - [x] 3.2 Create `backend/utils/jwt_handler.py` with functions to create and verify JWT tokens
  - [x] 3.3 Create `backend/services/auth_service.py` with authentication logic (match face embeddings, match voice embeddings, verify PIN)
  - [x] 3.4 Implement `POST /api/auth/login` endpoint in `backend/routes/auth.py` (accept face_id/voice_id/pin, return JWT token + user info)
  - [x] 3.5 Implement `POST /api/auth/register` endpoint (accept user info + biometrics, validate IC format, check duplicates, create new user, return user_id)
  - [ ] 3.6 Test authentication endpoints via Swagger UI with different authentication methods

- [x] 4.0 Implement Core Aid APIs (Status, Balance, History)
  - [x] 4.1 Create `backend/models/aid.py` with Pydantic models (AidStatus, AidBalance, Transaction, AidHistory)
  - [x] 4.2 Create `backend/services/aid_service.py` with functions to retrieve aid data from mock data
  - [x] 4.3 Implement `GET /api/aid/status/{user_id}` endpoint (return enrollment status for all 3 programs)
  - [x] 4.4 Implement `GET /api/aid/balance/{user_id}/{program_id}` endpoint (return balance/payment info for specific program)
  - [x] 4.5 Implement `GET /api/aid/history/{user_id}/{program_id}` endpoint (return last 20 transactions sorted by date)
  - [x] 4.6 Add error handling for invalid user_id and unenrolled programs (404 errors with clear messages)
  - [ ] 4.7 Test all aid endpoints with multiple mock users

- [x] 5.0 Implement Eligibility Checker Logic
  - [x] 5.1 Create `backend/models/eligibility.py` with Pydantic models (EligibilityRequest, EligibilityResponse)
  - [x] 5.2 Create `backend/services/eligibility_service.py` with hardcoded eligibility rules for STR/SARA/MyKasih (income thresholds, age requirements, disability bonuses)
  - [x] 5.3 Implement eligibility calculation function (check income, age, household size, disability status against program criteria)
  - [x] 5.4 Implement `POST /api/aid/check-eligibility/{program_id}` endpoint (accept user profile data, return eligible/not eligible with reason)
  - [x] 5.5 Generate required documents list and estimated monthly amount for eligible users
  - [x] 5.6 Add validation for missing fields (return specific error messages)
  - [x] 5.7 Test eligibility checker with various income/age scenarios

- [x] 6.0 Implement Store Locator with Haversine Distance
  - [x] 6.1 Create `backend/utils/haversine.py` with Haversine distance calculation function (input: lat1, lon1, lat2, lon2, output: distance in km)
  - [x] 6.2 Create `backend/models/store.py` with Pydantic models (Store, StoreWithDistance)
  - [x] 6.3 Implement `POST /api/stores/locate` endpoint in `backend/routes/store.py` (changed from GET to POST for better payload handling)
  - [x] 6.4 Load stores from JSON, calculate distance for each store using Haversine formula, sort by distance (nearest first)
  - [x] 6.5 Format response with store name, address, distance (2 decimals), lat, lng, store_type, accepted_programs
  - [x] 6.6 Test with various coordinates and filters (tested PJ, KL areas with radius/type/program filters)

- [ ] 7.0 Implement QR Payment System
  - [ ] 7.1 Create `backend/models/payment.py` with Pydantic models (QRGenerateRequest, QRGenerateResponse, QRVerifyRequest, PaymentReceipt)
  - [ ] 7.2 Create `backend/services/payment_service.py` with QR code generation logic (encode user_id, transaction_id, amount, store_id, timestamp, signature)
  - [ ] 7.3 Implement `POST /api/payment/generate-qr` endpoint (generate QR code data as base64 image, set 5-minute expiry)
  - [ ] 7.4 Implement QR verification logic (decode QR, validate signature, check expiry, verify balance)
  - [ ] 7.5 Implement `POST /api/payment/verify-qr` endpoint (process payment, deduct balance, create transaction record, return receipt)
  - [ ] 7.6 Add error handling for insufficient balance, expired QR, invalid signature
  - [ ] 7.7 Test QR generation and verification flow with mock users

- [ ] 8.0 Implement Reminder System & Multi-Language Support
  - [ ] 8.1 Create `backend/models/reminder.py` with Pydantic models (Reminder, ReminderList)
  - [ ] 8.2 Create `backend/services/translation_service.py` with function to load translations and translate text based on language parameter
  - [ ] 8.3 Implement `GET /api/reminders/{user_id}?lang=en|ms` endpoint (return reminders for credit expiry, payment deadlines, application updates)
  - [ ] 8.4 Filter reminders to only show future dates or dates within last 7 days
  - [ ] 8.5 Add `?lang=en|ms` support to all existing endpoints (translate program names, error messages, eligibility reasons)
  - [ ] 8.6 Update user profile to store preferred language (default to Malay)
  - [ ] 8.7 Test multi-language responses in both English and Malay

- [ ] 9.0 Testing & Documentation
  - [ ] 9.1 Test all endpoints via Swagger UI (`/docs`) with all 10-15 mock users
  - [ ] 9.2 Verify edge cases (invalid IDs, missing data, extreme distances, insufficient balance)
  - [ ] 9.3 Test authentication with all 3 methods (face, voice, PIN)
  - [ ] 9.4 Test eligibility checker with various income/age scenarios
  - [ ] 9.5 Test QR payment flow end-to-end (generate → verify → balance update)
  - [ ] 9.6 Create `README.md` with setup instructions, API endpoint list, example requests/responses
  - [ ] 9.7 Optional: Create Postman collection for easy testing by frontend/voice teams
  - [ ] 9.8 Optional: Add request/response examples in Swagger UI docstrings
  - [ ] 9.9 Verify all API responses follow consistent format (success/error structure)
  - [ ] 9.10 Final run-through: Test demo scenarios that will be presented

---

**Status:** All sub-tasks generated. Ready for implementation!
