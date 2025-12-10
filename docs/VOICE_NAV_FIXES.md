# Voice Navigation Fixes Plan

## 🎯 Objective
Fix identified issues in voice navigation to improve stability and user experience.

---

## ✅ Fixes to Implement

### Fix 1: Hallucination Detection
**File:** `voice-login/voice_navigation_module.py`
**Function:** `clean_transcription()`

**Add detection for:**
- Repeated characters: "R-R-R-R-R-R" 
- Repeated patterns: "S-T-R-R-R-R-R-R-R-R"
- Repeated words: same word 5+ times

**Action:** Return empty string if hallucination detected

---

### Fix 2: Empty Transcript Early Return
**File:** `voice-login/voice_navigation_module.py`  
**Function:** `run_agent_logic()`

**Add:** Check if transcript is empty or too short (<2 chars)
**Action:** Return "I didn't hear anything" message, skip Gemini API call

---

### Fix 3: "Thank You" Exclusion
**File:** `voice-login/voice_navigation_module.py`
**Function:** `keyword_based_classification()`

**Add:** Exclude "thank you" from triggering MyKasih keywords
**Line ~218:** Add `and "thank you" not in lower_text`

---

### Fix 4: Remove Duplicate Yes/No Keywords
**File:** `voice-login/voice_navigation_module.py`
**Lines:** 307-321

**Action:** Remove redundant yes/no fallback block (already handled at lines 163-188)

---

## 🔄 Implementation Order

| Step | Fix | Risk | Notes |
|------|-----|------|-------|
| 1 | Hallucination detection | Low | Add to existing clean_transcription |
| 2 | Empty transcript check | Low | Add early return in run_agent_logic |
| 3 | Thank you exclusion | Low | One-line change |
| 4 | Remove duplicates | Low | Code cleanup |

---

## 📝 Testing Plan

After implementation:
1. Restart backend server
2. Test: Say "STR" → Should hear status, ask navigation
3. Test: Say "Ya/Yes" → Should navigate to /str
4. Test: Stay silent → Should hear "didn't hear anything"
5. Test: Say "Thank you" → Should NOT trigger MyKasih

---

## ✍️ Approval

- [ ] Fix 1: Hallucination Detection
- [ ] Fix 2: Empty Transcript Check  
- [ ] Fix 3: Thank You Exclusion
- [ ] Fix 4: Remove Duplicates

**Reply with which fixes to implement (1-4 or "all")**
