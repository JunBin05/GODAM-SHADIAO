# Main Page Enhancement Plan
**Project:** GODAM-SHADIAO MyID Voice Assistant  
**Target:** MainPage.jsx Dashboard Enhancement  
**Date:** December 8, 2025  
**Status:** DRAFT for Review

---

## 🎯 Overview

**Current State:**
- Main page has voice assistant (microphone button)
- Two navigation buttons (SARA, STR)
- Mostly blank/empty space
- Real API integration started but data not displayed

**Goal:**
Transform main page into a comprehensive dashboard showing:
- Real-time aid program status
- Upcoming reminders & notifications
- Quick action buttons for common tasks
- Recent activity feed
- User profile summary

**Target Users:** Elderly & disabled Malaysians (60+ years old)

---

## 📋 Phase 1: Quick Aid Status Cards
**Priority:** HIGH  
**Estimated Time:** 2-3 hours  
**Backend APIs Required:** ✅ Already available

### Features to Implement:
1. **STR Status Card**
   - API: `GET /api/aid/status/{userId}`
   - Display:
     - ✅ Enrollment status (Enrolled/Not Enrolled)
     - ✅ Monthly benefit amount (RM 350/450/600)
     - ✅ Next payment date
     - ✅ Household income bracket
   - Visual:
     - Green card if enrolled
     - Gray card if not enrolled
     - Large icon (Banknote from lucide-react)
     - 24px font size minimum

2. **SARA Balance Card**
   - API: `GET /api/aid/status/{userId}`
   - Display:
     - ✅ One-off balance (RM XXX)
     - ✅ Regular balance (RM XXX)
     - ✅ Total stores available (84,727)
   - Visual:
     - Two-column layout inside card
     - HeartHandshake icon
     - "Find Stores" quick link button

### Implementation Steps:
```jsx
// 1. Use existing useAidPrograms hook (already imported)
const { status: aidStatus, loading: aidLoading } = useAidPrograms(userId, language);

// 2. Extract STR and SARA data
const strProgram = aidStatus?.data?.find(p => p.program_id === 'str');
const saraProgram = aidStatus?.data?.find(p => p.program_id === 'sara');

// 3. Create StatusCard component
<div className="status-cards-grid">
  <StatusCard 
    program={strProgram}
    icon={<Banknote />}
    onClick={() => navigate('/str')}
  />
  <StatusCard 
    program={saraProgram}
    icon={<HeartHandshake />}
    onClick={() => navigate('/sara')}
  />
</div>
```

### Design Specs:
- **Card Size:** Minimum 300px width, 200px height
- **Font Sizes:** 
  - Title: 24px bold
  - Amount: 32px bold (highlight)
  - Details: 18px regular
- **Colors:**
  - Enrolled: `bg-green-50`, `border-green-500`
  - Not Enrolled: `bg-gray-50`, `border-gray-300`
- **Spacing:** 16px padding, 12px gap between cards
- **Touch Target:** Entire card clickable (60x60px minimum)

### Success Criteria:
- [x] STR card shows correct enrollment status
- [x] SARA card shows both balances
- [x] Cards are touch-friendly (large click area)
- [x] Loading state while fetching data
- [x] Error handling if API fails
- [x] Fallback to mock data when backend unavailable

---

## 📋 Phase 2: Upcoming Reminders Widget
**Priority:** HIGH  
**Estimated Time:** 2-3 hours  
**Backend APIs Required:** ✅ Already available

### Features to Implement:
1. **Reminders Display**
   - API: `GET /api/reminders/{userId}`
   - Display top 3 upcoming reminders
   - Show:
     - ✅ Reminder title
     - ✅ Due date/time (human-readable: "Tomorrow", "In 3 days")
     - ✅ Category badge (Payment/Document/Appointment)
     - ✅ Priority indicator (High/Medium/Low)

2. **Visual Design**
   - Card-based layout
   - Color-coded by category:
     - Payment: Blue
     - Document: Yellow
     - Appointment: Purple
   - Bell icon for each reminder
   - "View All" button at bottom

### Implementation Steps:
```jsx
// 1. Create useReminders hook in hooks/useAPI.js
export const useReminders = (userId, language = 'en') => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchReminders(userId, language);
  }, [userId, language]);
  
  return { reminders, loading, refetch: fetchReminders };
};

// 2. In MainPage.jsx
const { reminders, loading: remindersLoading } = useReminders(userId, language);
const upcomingReminders = reminders.slice(0, 3);

// 3. Create ReminderWidget component
<ReminderWidget reminders={upcomingReminders} />
```

### API Response Format:
```json
{
  "success": true,
  "reminders": [
    {
      "id": "REM001",
      "user_id": "USR001",
      "title": "STR Payment Due",
      "message": "Your STR payment will be deposited on Dec 15",
      "category": "payment",
      "priority": "high",
      "due_date": "2025-12-15T00:00:00",
      "is_recurring": false
    }
  ]
}
```

### Design Specs:
- **Widget Size:** Full width, auto height
- **Font Sizes:** 
  - Title: 20px semibold
  - Message: 16px regular
  - Date: 14px gray
- **Badge:** 
  - Small pill shape
  - 12px font
  - Color-coded background
- **Spacing:** 12px between reminder items

### Success Criteria:
- [x] Shows 3 most recent reminders
- [x] Dates displayed in human-readable format
- [x] Category badges color-coded correctly
- [x] "View All" navigates to full reminders page
- [x] Empty state message if no reminders
- [x] Loading skeleton while fetching

---

## 📋 Phase 3: Quick Action Buttons
**Priority:** HIGH  
**Estimated Time:** 1-2 hours  
**Backend APIs Required:** ✅ Already available

### Features to Implement:
1. **Generate QR Code Button**
   - API: `POST /api/payment/generate-qr`
   - Action: Opens modal with QR code for SARA payment
   - Icon: QrCode icon (lucide-react)

2. **Check Eligibility Button**
   - API: `POST /api/aid/check-eligibility`
   - Action: Opens eligibility checker form
   - Icon: CheckCircle icon

3. **Find Nearby Stores Button**
   - Action: Navigate to /sara page with auto-location
   - Icon: MapPin icon

4. **View Reminders Button**
   - Action: Navigate to reminders page (to be created)
   - Icon: Bell icon

### Implementation:
```jsx
<div className="quick-actions-grid">
  <QuickActionButton
    icon={<QrCode />}
    label={t('generateQR')}
    onClick={handleGenerateQR}
    color="blue"
  />
  <QuickActionButton
    icon={<CheckCircle />}
    label={t('checkEligibility')}
    onClick={() => navigate('/eligibility')}
    color="green"
  />
  <QuickActionButton
    icon={<MapPin />}
    label={t('findStores')}
    onClick={() => navigate('/sara')}
    color="purple"
  />
  <QuickActionButton
    icon={<Bell />}
    label={t('viewReminders')}
    onClick={() => navigate('/reminders')}
    color="orange"
  />
</div>
```

### Design Specs:
- **Button Size:** 120px x 120px (square)
- **Icon Size:** 48px
- **Font Size:** 16px
- **Layout:** 2x2 grid on mobile, 4x1 row on desktop
- **Colors:** Each button has distinct color scheme
- **Spacing:** 16px gap between buttons
- **Interaction:** 
  - Hover: Slight scale up (1.05)
  - Active: Scale down (0.95)
  - Ripple effect on tap

### Success Criteria:
- [x] 4 buttons displayed in responsive grid
- [x] Icons clearly visible and recognizable
- [x] Labels translated based on selected language
- [x] All buttons navigate/trigger correct actions
- [x] Touch-friendly size (minimum 60x60px)
- [x] Visual feedback on interaction

---

## 📋 Phase 4: Profile Summary Banner
**Priority:** MEDIUM  
**Estimated Time:** 1-2 hours  
**Backend APIs Required:** ✅ Already available

### Features to Implement:
1. **User Info Display**
   - API: `GET /api/auth/profile` (already called on login)
   - Display:
     - ✅ User's full name
     - ✅ Masked IC number (9xxxxx-xx-xxxx)
     - ✅ Profile photo (if available)
     - ✅ Total programs enrolled (count)

2. **Quick Stats**
   - Programs enrolled: "2 Programs"
   - Last login: "Today at 2:30 PM"
   - Language preference: EN/MS/ZH/TA badge

### Implementation:
```jsx
<div className="profile-banner">
  <div className="profile-avatar">
    {userData?.photo ? (
      <img src={userData.photo} alt="Profile" />
    ) : (
      <User size={48} />
    )}
  </div>
  <div className="profile-info">
    <h2>{userData?.name || 'Guest'}</h2>
    <p className="ic-number">{maskIC(userData?.icNumber)}</p>
    <div className="quick-stats">
      <span className="badge">{enrolledCount} Programs</span>
      <span className="badge">{language.toUpperCase()}</span>
    </div>
  </div>
  <button onClick={handleLogout} className="logout-btn">
    <LogOut />
  </button>
</div>
```

### Design Specs:
- **Banner Height:** 120px
- **Avatar Size:** 80px circle
- **Font Sizes:**
  - Name: 24px bold
  - IC: 16px gray
  - Stats: 14px
- **Layout:** Flexbox, items aligned center
- **Background:** Light gradient or solid color
- **Logout Button:** Positioned top-right corner

### Success Criteria:
- [x] Displays user name and masked IC
- [x] Shows correct enrollment count
- [x] Language badge matches current selection
- [x] Logout button functional
- [x] Responsive on mobile and desktop

---

## 📋 Phase 5: Recent Transactions Feed
**Priority:** MEDIUM  
**Estimated Time:** 2 hours  
**Backend APIs Required:** ⚠️ Needs new endpoint or payment history endpoint

### Features to Implement:
1. **Transaction List**
   - API: `GET /api/payment/history/{userId}` (if available)
   - Display last 5 transactions:
     - ✅ Transaction type (QR Payment/STR Deposit)
     - ✅ Amount (RM XXX)
     - ✅ Store name (for SARA payments)
     - ✅ Timestamp (human-readable)
     - ✅ Transaction status (Completed/Pending/Failed)

2. **Visual Design**
   - List layout with dividers
   - Icons for transaction types:
     - QrCode for SARA payments
     - ArrowDownCircle for STR deposits
   - Color-coded amounts:
     - Green for deposits (+RM)
     - Red for spending (-RM)

### Implementation:
```jsx
const { transactions, loading: txLoading } = usePaymentHistory(userId);
const recentTransactions = transactions.slice(0, 5);

<div className="transactions-feed">
  <h3>Recent Activity</h3>
  {recentTransactions.map(tx => (
    <TransactionItem 
      key={tx.id}
      type={tx.type}
      amount={tx.amount}
      store={tx.store_name}
      timestamp={tx.created_at}
      status={tx.status}
    />
  ))}
  <button onClick={() => navigate('/transactions')}>
    View All Transactions
  </button>
</div>
```

### Design Specs:
- **Item Height:** 80px per transaction
- **Font Sizes:**
  - Store name: 18px semibold
  - Amount: 20px bold
  - Timestamp: 14px gray
- **Colors:**
  - Deposits: `text-green-600`
  - Spending: `text-red-600`
- **Layout:** Flexbox, space-between alignment

### Success Criteria:
- [x] Shows 5 most recent transactions
- [x] Amounts formatted as currency (RM XXX.XX)
- [x] Timestamps human-readable ("2 hours ago")
- [x] Icons match transaction types
- [x] Empty state if no transactions
- [x] "View All" navigates to full history

---

## 📋 Phase 6: Notification Badge System
**Priority:** LOW  
**Estimated Time:** 1 hour  
**Backend APIs Required:** ⚠️ Needs notification count endpoint

### Features to Implement:
1. **Notification Icon**
   - Position: Top-right of page
   - Shows unread count badge
   - API: `GET /api/notifications/unread-count`

2. **Notification Types:**
   - Reminders due soon (within 24h)
   - Pending actions
   - System announcements

### Implementation:
```jsx
const { unreadCount } = useNotifications(userId);

<div className="notification-icon">
  <Bell size={24} />
  {unreadCount > 0 && (
    <span className="badge">{unreadCount}</span>
  )}
</div>
```

### Design Specs:
- **Icon Size:** 24px
- **Badge:** 
  - Red circle
  - White text
  - 18px diameter
  - Positioned top-right of icon
- **Max Count:** Show "9+" if more than 9

### Success Criteria:
- [x] Badge shows correct unread count
- [x] Updates in real-time
- [x] Clicking opens notifications panel
- [x] Badge disappears when count = 0

---

## 🎨 Overall Design System

### Color Palette:
```css
/* Primary Colors */
--primary-blue: #3b82f6;
--primary-green: #10b981;
--primary-red: #ef4444;

/* Status Colors */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-500: #6b7280;
--gray-900: #111827;

/* Semantic Colors */
--enrolled: #10b981;
--not-enrolled: #6b7280;
--payment: #3b82f6;
--document: #f59e0b;
--appointment: #8b5cf6;
```

### Typography:
```css
/* For Elderly Users - Larger than typical */
--text-xs: 14px;    /* Normal apps: 12px */
--text-sm: 16px;    /* Normal apps: 14px */
--text-base: 18px;  /* Normal apps: 16px */
--text-lg: 20px;    /* Normal apps: 18px */
--text-xl: 24px;    /* Normal apps: 20px */
--text-2xl: 32px;   /* Normal apps: 24px */

/* Font Weights */
--font-regular: 400;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing:
```css
--space-xs: 8px;
--space-sm: 12px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

### Component Specs:
- **Minimum Touch Target:** 60x60px (elderly users)
- **Border Radius:** 12px (rounded corners)
- **Card Shadow:** `0 2px 8px rgba(0,0,0,0.1)`
- **Transition:** `all 0.2s ease` (smooth animations)

---

## 📱 Responsive Layout

### Mobile (< 768px):
```
┌─────────────────────┐
│  Profile Banner     │
├─────────────────────┤
│  STR Card          │
├─────────────────────┤
│  SARA Card         │
├─────────────────────┤
│  Reminders Widget  │
├─────────────────────┤
│  Quick Actions     │
│  [2x2 Grid]        │
├─────────────────────┤
│  Transactions Feed │
├─────────────────────┤
│  Voice Assistant   │
└─────────────────────┘
```

### Desktop (> 768px):
```
┌────────────────────────────────────────┐
│         Profile Banner                 │
├──────────────────┬────────────────────┤
│  STR Card        │  SARA Card         │
├──────────────────┴────────────────────┤
│  Quick Actions [4x1 Grid]             │
├──────────────────┬────────────────────┤
│  Reminders       │  Transactions      │
│  Widget          │  Feed              │
├──────────────────┴────────────────────┤
│         Voice Assistant                │
└────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Functional Testing:
- [ ] Phase 1: STR/SARA cards display correct data
- [ ] Phase 1: Cards clickable and navigate to correct pages
- [ ] Phase 2: Reminders fetched and displayed
- [ ] Phase 2: Date formatting works in all languages
- [ ] Phase 3: All quick action buttons functional
- [ ] Phase 3: QR code generation works
- [ ] Phase 4: Profile banner shows user data
- [ ] Phase 4: Logout button works
- [ ] Phase 5: Transactions display correctly
- [ ] Phase 5: Transaction history pagination
- [ ] Phase 6: Notification badge shows correct count

### API Integration Testing:
- [ ] `/api/aid/status/{userId}` - Aid program status
- [ ] `/api/reminders/{userId}` - Reminders list
- [ ] `/api/payment/generate-qr` - QR code generation
- [ ] `/api/payment/history/{userId}` - Transaction history
- [ ] `/api/auth/profile` - User profile data
- [ ] Graceful degradation when backend unavailable

### Accessibility Testing:
- [ ] Voice commands work for all actions
- [ ] All buttons have proper aria-labels
- [ ] Keyboard navigation functional
- [ ] Screen reader compatible
- [ ] High contrast mode support
- [ ] Large text mode (minimum 18px)

### Responsive Testing:
- [ ] Mobile layout (320px - 767px)
- [ ] Tablet layout (768px - 1023px)
- [ ] Desktop layout (1024px+)
- [ ] Orientation change handling
- [ ] Touch targets minimum 60x60px

### Language Testing:
- [ ] English (EN) - All text translated
- [ ] Malay (MS) - All text translated
- [ ] Chinese (ZH) - All text translated
- [ ] Tamil (TA) - All text translated
- [ ] Date formatting locale-aware
- [ ] Currency formatting (RM) consistent

---

## 🔄 Fallback Strategy

### When Backend Unavailable:
1. **Aid Status Cards:** 
   - Show cached data from localStorage
   - Display "Last updated: X mins ago"
   - Retry button to refresh

2. **Reminders Widget:**
   - Show mock reminders (hardcoded)
   - Warning banner: "Unable to sync"

3. **Transactions Feed:**
   - Show cached transactions
   - Disable "View All" button

4. **Quick Actions:**
   - QR Generation: Show cached QR code
   - Eligibility: Allow offline form fill
   - Store Locator: Use mock store data

### Error Handling:
```jsx
// Consistent error state across all components
<ErrorState 
  title="Connection Error"
  message="Unable to fetch data. Please try again."
  retry={refetchData}
  showCached={hasCachedData}
/>
```

---

## 📅 Implementation Timeline

| Phase | Features | Time | Cumulative |
|-------|----------|------|------------|
| Phase 1 | Aid Status Cards | 2-3h | 3h |
| Phase 2 | Reminders Widget | 2-3h | 6h |
| Phase 3 | Quick Action Buttons | 1-2h | 8h |
| Phase 4 | Profile Banner | 1-2h | 10h |
| Phase 5 | Transactions Feed | 2h | 12h |
| Phase 6 | Notification Badge | 1h | 13h |
| Testing | All phases | 3h | 16h |
| **TOTAL** | **6 Phases + Testing** | **~16h** | **2 days** |

---

## 🚀 Next Steps

1. **Review this plan together** - Get feedback and approval
2. **Start with Phase 1** - Quick wins with high impact
3. **Test incrementally** - Deploy each phase before moving to next
4. **Gather user feedback** - Test with elderly users after Phase 3
5. **Iterate and improve** - Refine based on real usage

---

## 💬 Questions for Discussion

1. **Priority Order:** Do you agree with High/Medium/Low priorities?
2. **API Availability:** Are all backend endpoints ready? Any missing?
3. **Design Preferences:** Any specific UI library (e.g., Tailwind, Material-UI)?
4. **Additional Features:** Anything else you want on main page?
5. **Testing Resources:** Do you have test users/devices available?

---

## 📝 Notes

- All backend APIs are documented at: `http://localhost:8000/docs`
- Current frontend uses React 19 + Vite
- Voice assistant using Web Speech API
- Multi-language support already implemented
- Target completion: 2-3 days (16 hours total)

---

**Ready to start? Let's begin with Phase 1!** 🎯
