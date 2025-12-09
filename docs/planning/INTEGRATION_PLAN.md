# 🎯 **INTEGRATION PLAN: Frontend ↔ Backend**

## **Current State Analysis**

### ✅ **Backend (You - Person 2)**
- **Framework**: FastAPI running on `http://localhost:8000`
- **APIs**: 24+ endpoints (auth, aid programs, eligibility, stores, payment, reminders, **STR application**)
- **Features**: 
  - JWT authentication
  - Multi-language (4 languages: en/ms/zh/ta)
  - Official STR 2026 6-step application helper
  - 84,727 SARA stores with geolocation
  - QR payment generation
- **Documentation**: Swagger UI at `/docs`
- **CORS**: Already enabled for frontend communication

### ✅ **Frontend (Person 1 - GuanHoong)**
- **Framework**: React 19 + Vite
- **Dev Server**: `npm run dev` (probably `http://localhost:5173`)
- **Pages**: Landing, Login, Register, Main, STRPage, MyKasihPage
- **Components**: BottomNav, CameraCapture, LanguageToggle, FamilyDock, ProgressBar
- **Mock Data**: `mockStrData.js`, `mockMyKasihData.js` (needs replacement with real API calls)
- **Features**: OCR (Tesseract.js), Camera capture, Multi-language context

---

## **📋 INTEGRATION PLAN (Step-by-Step)**

### **PHASE 1: Environment Setup & Communication Test** ⏱️ 30 mins

#### **1.1 Check Frontend Runs**
```powershell
# In project root
npm install
npm run dev
# Expected: Frontend opens at http://localhost:5173
```

#### **1.2 Check Backend Runs Simultaneously**
```powershell
# In another terminal
.\venv\Scripts\Activate.ps1
cd backend
python -m uvicorn main:app --reload
# Expected: Backend at http://localhost:8000
```

#### **1.3 Test CORS (Critical!)**
- Open browser console at `http://localhost:5173`
- Try fetch: `fetch('http://localhost:8000/api/aid/programs').then(r=>r.json()).then(console.log)`
- Expected: Should return JSON, NOT CORS error
- If CORS error → Need to update backend `main.py` origins

---

### **PHASE 2: API Integration Layer** ⏱️ 1-2 hours

#### **2.1 Create API Service Module**
**File**: `src/services/api.js` (NEW FILE - Person 1 creates)

**Purpose**: Central API configuration
```javascript
const API_BASE_URL = 'http://localhost:8000/api';

export const api = {
  // Auth
  login: (credentials) => fetch(`${API_BASE_URL}/auth/login`, {...}),
  register: (userData) => fetch(`${API_BASE_URL}/auth/register`, {...}),
  
  // Aid Programs
  getPrograms: (lang) => fetch(`${API_BASE_URL}/aid/programs?lang=${lang}`),
  checkEligibility: (data, lang) => fetch(`${API_BASE_URL}/aid/check-eligibility?lang=${lang}`, {...}),
  
  // STR Application (NEW!)
  prepareSTRApplication: (appData, lang) => 
    fetch(`${API_BASE_URL}/str-application/prepare-application?lang=${lang}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(appData)
    }),
  
  // Stores
  findStores: (lat, lng, radius, lang) => 
    fetch(`${API_BASE_URL}/stores/nearby?lat=${lat}&lng=${lng}&radius=${radius}&lang=${lang}`),
};
```

#### **2.2 Replace Mock Data**
**Files to update**:
- `src/data/mockStrData.js` → Replace with API calls
- `src/data/mockMyKasihData.js` → Replace with API calls

**Strategy**: 
- Keep mock data as fallback during development
- Gradually replace with real API calls
- Use `try/catch` for error handling

---

### **PHASE 3: Page-by-Page Integration** ⏱️ 3-4 hours

#### **3.1 LoginPage.jsx → Backend Auth**
**Current**: Probably uses mock auth or local storage
**Change**:
```javascript
// Replace mock login with:
const handleLogin = async () => {
  const response = await api.login({username, password});
  const {access_token} = await response.json();
  localStorage.setItem('token', access_token);
  // Redirect to MainPage
};
```

**Backend Endpoint**: `POST /api/auth/login`
**Response**: `{access_token: "...", token_type: "bearer"}`

---

#### **3.2 RegisterPage.jsx → Backend Registration**
**Backend Endpoint**: `POST /api/auth/register`
**Required Fields**: Check `backend/models/user.py` for UserCreate model

---

#### **3.3 STRPage.jsx → STR Application Flow** ⭐ **MAIN INTEGRATION**

**Current State**: Probably uses `mockStrData.js`

**Integration Strategy**:

**STEP A: Get Application Info**
```javascript
// On page load
const getSTRInfo = async (lang) => {
  const response = await fetch(`/api/str-application/application-info?lang=${lang}`);
  const {data} = await response.json();
  // Display: program_name, description, amount_range, requirements
};
```

**STEP B: Collect User Data (Multi-Step Form)**
```javascript
// Follow official 6-step structure:
const [step, setStep] = useState(1); // 1-6
const [formData, setFormData] = useState({
  applicant: {}, 
  spouse: null, 
  children: [], 
  guardian: {}
});

// Step 1: Applicant Info (IC, phone, income, marital status, address, bank)
// Step 2: Spouse Info (conditional - only if married)
// Step 3: Children Info (max 5)
// Step 4: Documents (show checklist, upload later at portal)
// Step 5: Guardian Info
// Step 6: Review & Submit
```

**STEP C: Validate Data Progressively**
```javascript
// After each step
const validateStep = async (stepData, lang) => {
  const response = await fetch(`/api/str-application/validate-data?lang=${lang}`, {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  const {valid, errors} = await response.json();
  if (!valid) showErrors(errors);
};
```

**STEP D: Prepare Application (Final Submit)**
```javascript
// When user clicks "Submit" on Step 6
const submitApplication = async (lang) => {
  const response = await fetch(`/api/str-application/prepare-application?lang=${lang}`, {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  
  const result = await response.json();
  // result contains:
  // - eligibility_result: {eligible, estimated_amount, reason}
  // - required_documents: [{document_type, description_en/ms/zh/ta}]
  // - next_steps: {en: [...], ms: [...], zh: [...], ta: [...]}
  // - portal_url: "https://bantuantunai.gov.my/"
  
  // Display result to user with:
  // 1. Eligibility status + amount
  // 2. Document checklist
  // 3. Step-by-step instructions in their language
  // 4. Button to open government portal
};
```

**UI Components Needed**:
- Multi-step form with ProgressBar (already exists!)
- Language-aware error messages
- Document checklist display
- Final instructions page with "Go to Portal" button

---

#### **3.4 MyKasihPage.jsx → Aid Programs API**
**Backend Endpoints**:
- `GET /api/aid/programs?lang={lang}` - List all programs
- `POST /api/aid/check-eligibility?lang={lang}` - Check user eligibility
- `GET /api/aid/balance?user_id={id}` - Get credit balance
- `GET /api/aid/transactions?user_id={id}` - Transaction history

---

#### **3.5 MainPage.jsx → Dashboard Data**
**Integrate**:
- User profile from auth token
- Aid programs summary
- Nearby stores (use geolocation)
- Recent reminders

**Backend Endpoints**:
- `GET /api/aid/programs`
- `GET /api/stores/nearby?lat=...&lng=...`
- `GET /api/reminders/{user_id}`

---

### **PHASE 4: Multi-Language Integration** ⏱️ 1 hour

#### **4.1 Connect LanguageContext to Backend**
**Current**: Frontend has `LanguageContext.jsx`
**Change**: Use selected language in all API calls

```javascript
// In LanguageContext
const {currentLanguage} = useLanguage(); // 'en', 'ms', 'zh', 'ta'

// Pass to all API calls
await api.prepareSTRApplication(data, currentLanguage);
```

#### **4.2 Display Backend Translations**
Backend returns translations in all 4 languages:
```json
{
  "next_steps": {
    "en": ["Step 1...", "Step 2..."],
    "ms": ["Langkah 1...", "Langkah 2..."],
    "zh": ["步骤 1...", "步骤 2..."],
    "ta": ["படி 1...", "படி 2..."]
  }
}
```

Frontend displays based on `currentLanguage`:
```javascript
const steps = result.next_steps[currentLanguage];
```

---

### **PHASE 5: Authentication Flow** ⏱️ 1 hour

#### **5.1 JWT Token Management**
```javascript
// Store token after login
localStorage.setItem('token', access_token);

// Add to all authenticated requests
fetch(url, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
});
```

#### **5.2 Protected Routes**
```javascript
// In App.jsx or router setup
const PrivateRoute = ({children}) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};
```

---

### **PHASE 6: Testing & Debugging** ⏱️ 2 hours

#### **6.1 Test Each Flow**
- ✅ Register → Login → Dashboard
- ✅ STR Application (all 6 steps)
- ✅ Language switching
- ✅ Store locator
- ✅ Error handling

#### **6.2 Common Issues to Check**
- CORS errors → Update backend `CORS_ORIGINS`
- 422 Validation errors → Check data model matches backend
- Authentication failures → Check JWT token format
- Multi-language not working → Check `lang` parameter in URLs

---

## **🔧 TECHNICAL DECISIONS NEEDED**

### **Person 1 (Frontend) Decisions:**
1. **Use Axios or Fetch?** (Fetch is native, Axios has better error handling)
2. **State Management?** (Context API vs useState vs Redux)
3. **Form Library?** (React Hook Form for STR multi-step form)
4. **Error Display?** (Toast notifications vs inline errors)

### **Person 2 (You - Backend) Decisions:**
1. **CORS Origins**: Add frontend URL to allowed origins
2. **File Upload**: If documents need upload, add endpoint
3. **Rate Limiting**: Consider adding for production
4. **Error Format**: Standardize error responses

---

## **⚡ QUICK START (Recommended Order)**

### **Day 1 - Basic Connection**
1. Start both servers (backend + frontend)
2. Test CORS with simple fetch
3. Integrate login/register pages
4. Get main dashboard showing real data

### **Day 2 - STR Feature**
1. Build STR multi-step form (frontend)
2. Connect each step to validation endpoint
3. Integrate final submission
4. Display results with instructions

### **Day 3 - Polish**
1. Add language switching everywhere
2. Error handling & loading states
3. Test all flows end-to-end
4. Fix bugs

---

## **🚨 CRITICAL INTEGRATION POINTS**

### **Must Align:**
1. **Data Models**: Frontend form fields MUST match backend Pydantic models exactly
   - Check: `backend/models/str_application.py`
   - Example: `applicant` not `applicant_info`, `phone_mobile` not `mobile_phone`

2. **Language Codes**: Both must use same codes: `en`, `ms`, `zh`, `ta`

3. **Authentication**: Frontend must send `Authorization: Bearer {token}` for protected endpoints

4. **Error Handling**: Backend returns specific error format - frontend must parse correctly

---

## **📊 WHO DOES WHAT**

### **Person 1 (Frontend - GuanHoong):**
- [ ] Create `src/services/api.js`
- [ ] Update all pages to use real APIs
- [ ] Build STR 6-step form
- [ ] Integrate LanguageContext with API calls
- [ ] Add loading states & error handling
- [ ] Test on real data

### **Person 2 (You - Backend):**
- [ ] Verify CORS includes frontend URL
- [ ] Test all endpoints with frontend request format
- [ ] Provide Person 1 with:
  - API documentation (Swagger at `/docs`)
  - Example requests/responses
  - Error codes reference
- [ ] Be available for debugging
- [ ] Add any missing endpoints Person 1 needs

---

## **🎯 SUCCESS CRITERIA**

✅ User can login with backend authentication  
✅ STR application collects data through 6 official steps  
✅ Backend validates and calculates eligibility  
✅ User sees personalized instructions in their language  
✅ User can switch languages and see translated content  
✅ All 24+ backend APIs are accessible from frontend  
✅ Error messages appear in user's selected language  

---

## **📚 REFERENCE DOCUMENTATION**

### **Backend API Documentation**
- Swagger UI: `http://localhost:8000/docs`
- Redoc: `http://localhost:8000/redoc`

### **Key Backend Files**
- `backend/main.py` - API routes registration, CORS config
- `backend/models/str_application.py` - STR data models
- `backend/routes/str_application.py` - STR endpoints (3 new endpoints)
- `backend/services/str_application_service.py` - STR business logic
- `backend/config.py` - Eligibility rules, API keys

### **Key Frontend Files**
- `src/pages/STRPage.jsx` - STR application UI (needs integration)
- `src/context/LanguageContext.jsx` - Multi-language context
- `src/data/mockStrData.js` - Mock data (replace with API)
- `package.json` - Dependencies

---

## **🆘 TROUBLESHOOTING GUIDE**

### **Problem: CORS Error**
**Solution**: Update `backend/main.py` CORS origins:
```python
origins = [
    "http://localhost:5173",  # Add Vite dev server
    "http://localhost:3000",
]
```

### **Problem: 422 Validation Error**
**Solution**: Check request body matches Pydantic model exactly
- Use Swagger UI `/docs` to see expected format
- Check field names (e.g., `phone_mobile` not `mobile_phone`)

### **Problem: 401 Unauthorized**
**Solution**: Check JWT token is sent correctly:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
}
```

### **Problem: Backend not returning translations**
**Solution**: Ensure `lang` query parameter is passed:
```javascript
fetch(`/api/str-application/prepare-application?lang=ms`, ...)
```

---

**Last Updated**: December 8, 2025  
**Status**: Ready for Phase 1 implementation
