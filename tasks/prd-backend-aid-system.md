# Product Requirements Document: Backend System Logic & Aid Data APIs

## Introduction/Overview

This PRD defines the backend system for the MyID Voice Assistant hackathon project. The backend serves as the central data and logic layer that powers government aid access for elderly and disabled Malaysians. It provides RESTful APIs for authentication, aid program management (STR, SARA, MyKasih), eligibility checking, and store location services.

**Problem Statement:** Elderly and disabled Malaysians struggle to access government aid information due to complex digital systems. They need a simple, reliable backend that provides mock but realistic aid data through clean APIs for voice and web interfaces.

**Goal:** Create a fast, stable, hackathon-quality backend with FastAPI that delivers predictable JSON responses for 10-15 mock users across 3 aid programs, with authentication and store locator capabilities.

## Goals

1. Deliver 5 core REST API endpoints that return clean, predictable JSON within 4-5 days
2. Create realistic mock data for 10-15 user profiles with varied eligibility scenarios
3. Implement multi-method authentication (facial recognition, voiceprint, PIN fallback)
4. Build accurate store locator using Haversine distance calculation
5. Ensure all APIs are testable, documented, and ready for frontend/voice integration
6. Maintain simplicity and readability suitable for hackathon demo conditions

## User Stories

**As Person 1 (Frontend Developer):**
- I need clean JSON endpoints so I can display aid status, balances, and history without complex parsing
- I need authentication endpoints that work with facial/voice/PIN so users can log in securely
- I need a stores endpoint that returns sorted results so I can show nearest MyKasih locations

**As Person 4 (Voice/ML Specialist):**
- I need authentication APIs that accept voice biometric data for voiceprint matching
- I need eligibility endpoints that return clear yes/no decisions so the voice assistant can speak results naturally
- I need reminder data so the voice assistant can notify users of deadlines

**As an Elderly User (End User):**
- I need the system to check if I qualify for aid programs based on my profile
- I need to see my current aid balances and transaction history
- I need to find nearby stores where I can use my MyKasih credits

**As the Demo Presenter:**
- I need 10-15 diverse user scenarios that showcase different eligibility outcomes
- I need stable, predictable responses that won't fail during the live demo
- I need realistic data that demonstrates real-world Malaysian government aid scenarios

## Functional Requirements

### Authentication (FR1-FR4)

1. **FR1.1:** The system must accept facial recognition data (facial embeddings/face_id) and authenticate users by matching against stored profiles.
2. **FR1.2:** The system must accept voiceprint data (voice embeddings) and authenticate users by matching against stored voice profiles.
3. **FR1.3:** The system must support PIN-based authentication as a fallback method when biometric methods fail.
4. **FR1.4:** Authentication must return a user session token and basic user info (user_id, name, programs enrolled).

### Aid Status API (FR2)

5. **FR2.1:** `GET /api/aid/status/{user_id}` must return the enrollment status for all 3 programs (STR, SARA, MyKasih).
6. **FR2.2:** Response must include: program name, enrollment status (enrolled/not_enrolled/pending), application date, and eligibility status.
7. **FR2.3:** Must handle invalid user_id gracefully with 404 error and clear message.

### Balance API (FR3)

8. **FR3.1:** `GET /api/aid/balance/{user_id}/{program_id}` must return current credit balance for the specified program.
9. **FR3.2:** For MyKasih, must include: current balance, last transaction date, and monthly allocation.
10. **FR3.3:** For STR/SARA, must include: payment amount, last payment date, next payment date.
11. **FR3.4:** Must return appropriate error if user is not enrolled in the specified program.

### Transaction History API (FR4)

12. **FR4.1:** `GET /api/aid/history/{user_id}/{program_id}` must return transaction history for the specified program.
13. **FR4.2:** Each transaction must include: date, amount, description, and store name (for MyKasih).
14. **FR4.3:** History must be sorted by date (most recent first) and limited to last 20 transactions.
15. **FR4.4:** Must handle cases where user has no transaction history (return empty array with 200 status).

### Eligibility Checker API (FR5)

16. **FR5.1:** `POST /api/aid/check-eligibility/{program_id}` must accept user profile data and return eligibility decision.
17. **FR5.2:** Input must include: IC number, age, monthly income, household size, state, disability status, employment status, dependents count.
18. **FR5.3:** Eligibility logic must simulate real Inland Revenue Board criteria (hardcoded rules based on income thresholds, age, disability).
19. **FR5.4:** Response must include: eligible (true/false), reason (explanation), required documents list (if eligible), and estimated monthly amount.
20. **FR5.5:** Must handle partial data gracefully (return specific missing field errors).

### Store Locator API (FR6)

21. **FR6.1:** `GET /api/stores/nearby?lat={latitude}&lng={longitude}` must return list of MyKasih-eligible stores.
22. **FR6.2:** Must use existing hardcoded store list provided by team.
23. **FR6.3:** Must calculate distance using Haversine formula and return stores sorted by distance (nearest first).
24. **FR6.4:** Each store result must include: store name, address, distance in km (to 1 decimal place), latitude, longitude, store type.
25. **FR6.5:** Must return all stores with calculated distances (no limit, let frontend decide display count).

### Reminder System API (FR7)

26. **FR7.1:** `GET /api/reminders/{user_id}` must return active reminders for the user.
27. **FR7.2:** Reminders must include: credit expiry dates, payment deadlines, application status updates.
28. **FR7.3:** Each reminder must have: title, description, due_date, priority (high/medium/low), program_id.
29. **FR7.4:** Must only return reminders with future dates or dates within the last 7 days.

### Mock Data Requirements (FR8)

30. **FR8.1:** Must create 10-15 mock user profiles with realistic Malaysian IC numbers, names, and demographics.
31. **FR8.2:** User profiles must cover diverse scenarios: fully eligible, partially eligible, not eligible, different states, various income levels.
32. **FR8.3:** Must include users with disability status to demonstrate inclusivity features.
33. **FR8.4:** Each mock user must have complete profile: name, IC, age, income, household_size, state, disability_status, employment_status, dependents.
34. **FR8.5:** Mock transaction history must span 3-6 months with realistic transaction amounts and dates.
35. **FR8.6:** Store list must include 15-25 stores across Klang Valley with real-ish addresses and coordinates.

## Additional Features (Updated Scope)

### User Registration (FR9)
36. **FR9.1:** `POST /api/auth/register` must accept new user registration with basic info (name, IC, phone, email).
37. **FR9.2:** Registration must collect biometric data: face image (for facial recognition enrollment) and voice sample (for voiceprint enrollment).
38. **FR9.3:** System must validate IC number format and check for duplicates.
39. **FR9.4:** Registration must allow user to set a 6-digit PIN as fallback authentication.
40. **FR9.5:** Upon successful registration, return user_id and auto-generate initial profile for eligibility checking.
41. **FR9.6:** Registration process must be simple (single-step form, no email verification required for hackathon).

### QR Payment System (FR10)
42. **FR10.1:** `POST /api/payment/generate-qr` must generate a payment QR code for MyKasih credit usage.
43. **FR10.2:** QR code must encode: user_id, transaction_id, amount, store_id, timestamp, and signature.
44. **FR10.3:** `POST /api/payment/verify-qr` must validate and process QR code scans by merchants.
45. **FR10.4:** Payment processing must deduct from user's MyKasih balance and create transaction record.
46. **FR10.5:** QR codes must expire after 5 minutes for security.
47. **FR10.6:** Must return payment confirmation with updated balance and receipt details.

### Multi-Language Support (FR11)
48. **FR11.1:** All API responses must support language parameter `?lang=en` or `?lang=ms` (English/Malay).
49. **FR11.2:** System must return translated field labels, messages, and descriptions based on language preference.
50. **FR11.3:** Use simple JSON translation files (no ML model training required - just key-value mappings).
51. **FR11.4:** Support Malay translations for: program names, eligibility reasons, reminder messages, error messages.
52. **FR11.5:** User profile must store preferred language setting (default to Malay for elderly users).

## Non-Goals (Out of Scope)

1. **No real government API integration** - All data is mocked; no actual connection to LHDN, JKM, or MyKasih systems.
2. **No database persistence** - Data can be hardcoded or in JSON files; Firestore is optional and not required for MVP.
3. **No email/SMS verification** - Registration is instant without verification steps.
4. **No real payment gateway integration** - QR payments are simulated; no actual banking/DuitNow integration.
5. **No admin panel** - No backend management interface for viewing/editing user data.
6. **No advanced ML models for translation** - Use simple JSON translation files, not neural translation models.
7. **No real-time notifications** - Reminders are fetched on-demand; no push notification system.
8. **No audit logging** - No tracking of who accessed what data (not needed for hackathon demo).
9. **No rate limiting or advanced security** - Simple authentication is sufficient for demo purposes.
10. **No merchant portal** - QR verification is API-only; no separate merchant interface.

## Design Considerations

### API Response Format
All API responses must follow this consistent structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

### Data Format Standards
- Dates: ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`)
- Currency: Malaysian Ringgit (RM), stored as float with 2 decimal places
- Distances: Kilometers with 1 decimal place
- IC Numbers: 12-digit format (`YYMMDD-PB-###G`)
- Program IDs: `str`, `sara`, `mykasih` (lowercase, consistent)

### Authentication Flow
1. User provides biometric data (face image / voice sample) OR PIN
2. Backend matches against stored profiles
3. Return JWT token + user_id on success
4. Token included in subsequent API calls via Authorization header

## Technical Considerations

### Tech Stack
- **Framework:** FastAPI (Python 3.9+)
- **Data Storage:** JSON files or Python dictionaries (Firestore optional)
- **Face Recognition:** `face_recognition` library + `dlib`
- **Voiceprint:** Simple comparison logic (or defer to Person 4)
- **Distance Calculation:** Custom Haversine implementation
- **Authentication:** PyJWT for token generation

### Dependencies
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-jose[cryptography]==3.3.0
face-recognition==1.3.0
numpy==1.24.3
```

### API Documentation
- Use FastAPI's automatic OpenAPI documentation (Swagger UI at `/docs`)
- Include example requests/responses for all endpoints
- Document error codes and status codes

### Testing Strategy
- Manual testing via Swagger UI during development
- Create a Postman collection for all endpoints
- Test with all 10-15 mock user scenarios
- Verify edge cases (invalid IDs, missing data, extreme distances)

### Performance Requirements
- API response time < 500ms for all endpoints
- Store locator calculation < 200ms for 25 stores
- Support at least 10 concurrent requests (adequate for demo)

### Integration Points
- **Person 1 (Frontend):** Consumes all REST APIs
- **Person 4 (Voice/ML):** Uses authentication and eligibility APIs
- **Person 3 (Backend - Auth):** May share authentication logic (coordinate if needed)

## Success Metrics

1. **API Completeness:** All 7 API endpoint categories implemented and testable (100% completion)
2. **Mock Data Coverage:** 10-15 user profiles created with diverse eligibility scenarios
3. **Response Reliability:** 0 crashes or 500 errors during testing phase
4. **Response Time:** Average API response time under 300ms
5. **Integration Success:** Frontend and Voice teams can consume APIs without modification
6. **Demo Readiness:** All APIs return expected results for demo user scenarios (100% success rate)
7. **Code Quality:** Clean, commented code that can be explained to judges if asked

## Open Questions

1. **Q1:** Should authentication tokens expire? If yes, what duration (1 hour, 24 hours, never)?
   - **Decision needed by:** Day 1 of implementation
   
2. **Q2:** For facial recognition, should we store actual face images or just embeddings?
   - **Impact:** Storage size and privacy considerations
   - **Recommendation:** Store embeddings only (smaller, more secure)

3. **Q3:** Should the eligibility checker allow anonymous checks (before authentication)?
   - **Use case:** Let users check if they qualify before signing up
   - **Decision needed by:** During implementation

4. **Q4:** How should we handle users enrolled in multiple programs?
   - **Current assumption:** Users can be enrolled in all 3 programs simultaneously
   - **Confirm with team**

5. **Q5:** Should store locator filter by store type (grocery, pharmacy, etc.)?
   - **Impact:** Additional query parameter and filtering logic
   - **Decision:** Defer to frontend team's needs

6. **Q6:** Do we need CORS configuration for local development?
   - **Likely yes** - Frontend running on different port
   - **Action:** Enable CORS middleware in FastAPI

7. **Q7:** Should transaction history have pagination?
   - **Current spec:** Return last 20 transactions
   - **Alternative:** Add `?page=1&limit=20` parameters
   - **Decision:** Start with fixed 20, add pagination if time permits

8. **Q8:** How to coordinate facial recognition implementation with Person 3 or Person 4?
   - **Action:** Check with team on Day 1 to avoid duplicate work

---

**Document Version:** 1.0  
**Created:** December 7, 2025  
**Author:** Person 2 (Backend Developer - System Logic & Aid Data)  
**Status:** Ready for Review → Task Generation → Implementation
