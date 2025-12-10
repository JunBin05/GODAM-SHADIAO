import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Mic, HeartHandshake, Banknote, Bell, Calendar, Clock, AlertCircle, X, QrCode } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import FamilyDock from '../components/FamilyDock';
import QRCodeModal from '../components/QRCodeModal';
import { myKasihData } from '../data/mockMyKasihData';
import { strData } from '../data/mockStrData';
import { useVoiceNavigation } from '../hooks/useVoiceNavigation';

const MainPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  
  const [userData, setUserData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [reminders, setReminders] = useState({ myKasih: null, sara: null, str: null });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Get IC from localStorage immediately (for voice navigation)
  const getStoredIc = () => {
    try {
      const storedUser = localStorage.getItem('registeredUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.icNumber;
      }
    } catch (e) {
      console.error('Error getting stored IC:', e);
    }
    return null;
  };

  // Use Python voice navigation instead of browser speech recognition
  const {
    isListening,
    isProcessing,
    transcript,
    aiResponse,
    startListening,
    stopListening,
    error: voiceError,
  } = useVoiceNavigation(getStoredIc(), (route) => {
    // Navigate to the route returned by voice AI
    console.log('🚀 Voice navigation to:', route);
    
    // Special handling for QR - open modal instead of navigating
    if (route === '/qr') {
      console.log('📱 Opening QR modal...');
      setIsQRModalOpen(true);
    } else {
      navigate(route);
    }
  });

  const synthRef = useRef(window.speechSynthesis);

  // Helper for days left
  const getDaysLeft = (dateString) => {
    if (!dateString) return null;
    let targetDate = new Date(dateString);
    if (isNaN(targetDate.getTime())) {
       // Try appending " 1" for "Month Year" format (e.g. "November 2025")
       targetDate = new Date("1 " + dateString);
    }
    if (isNaN(targetDate.getTime())) return null;
    
    const today = new Date();
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('registeredUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);

      // Load Requests
      const loadRequests = () => {
        // Read once per tick and avoid repeated parsing inside tight loop
        const raw = localStorage.getItem('family_requests');
        const allRequests = raw ? JSON.parse(raw) : [];
        const myRequests = allRequests.filter(req => req.toIc === user.icNumber && req.status === 'pending');
        setRequests(myRequests);
      };
      loadRequests();
      // Poll less frequently to reduce CPU and JSON parsing on page load
      const interval = setInterval(loadRequests, 10000);

      // Load Reminders
      const mkData = myKasihData[user.icNumber];
      const sData = strData[user.icNumber];
      const newReminders = {};

      if (mkData && mkData.eligible) {
        const mkDays = getDaysLeft(mkData.myKasihExpiry);
        if (mkDays !== null && mkDays >= 0) {
             newReminders.myKasih = { date: mkData.myKasihExpiry, days: mkDays };
        }

        const saraDays = getDaysLeft(mkData.saraNextPayment);
        if (saraDays !== null && saraDays >= 0) {
            newReminders.sara = { date: mkData.saraNextPayment, days: saraDays };
        }
      }

      if (sData && sData.eligible && sData.upcoming) {
        // Find future payment
        const nextPayment = sData.upcoming.find(p => {
            const d = getDaysLeft(p.date);
            return d !== null && d >= 0 && (p.status === 'Scheduled' || p.status === 'Pending');
        });

        if (nextPayment) {
           newReminders.str = { date: nextPayment.date, days: getDaysLeft(nextPayment.date), amount: nextPayment.amount };
        }
      }
      setReminders(newReminders);

      return () => clearInterval(interval);
    }
  }, []);

  // No need for speech recognition initialization - using Python backend now!

  return (
    <div className="page-container main-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header className="landing-header" style={{ flexShrink: 0, position: 'relative', zIndex: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="logo-placeholder">{t('appTitle')}</div>
          <div style={{ width: '3px', height: '40px', backgroundColor: '#9ca3af' }}></div>
        </div>

        {userData && (
          <div style={{ 
            position: 'absolute', 
            left: '50%', 
            top: '50%', 
            transform: 'translate(-50%, -50%)',
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center',
            textAlign: 'center',
            width: 'max-content',
            gap: '20px',
            pointerEvents: 'none'
          }}>
            <span style={{ fontWeight: 'bold', color: 'black', fontSize: '1.5rem' }}>{userData.name}</span>
            <span style={{ fontWeight: 'bold', color: 'black', fontSize: '1.5rem' }}>{userData.icNumber}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            <LogOut size={18} />
            {t('signOut')}
          </button>
          <LanguageToggle />
        </div>
      </header>

      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Sidebar */}
        {isSidebarOpen && (
          <div className="sidebar-panel" style={{
            width: '300px',
            backgroundColor: 'white',
            borderRight: '1px solid #e5e7eb',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '25px',
            overflowY: 'auto',
            flexShrink: 0,
            animation: 'slideRight 0.5s ease-out',
            zIndex: 50,
            boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af'
              }}
            >
              <X size={20} />
            </button>

            {/* Notifications Section */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1f2937', marginTop: 0 }}>
                <Bell size={20} color="#ef4444" /> Notifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {requests.length > 0 ? (
                  requests.map(req => (
                    <div key={req.id} style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{req.fromName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>wants to add you as family.</div>
                      <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '5px', fontWeight: 'bold' }}>Check Family Dock</div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>No new notifications</div>
                )}
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#e5e7eb' }}></div>

            {/* Reminders Section */}
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1f2937', marginTop: 0 }}>
                <Calendar size={20} color="#2563eb" /> Reminders
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>

                {/* MyKasih Expiry */}
                {reminders.myKasih && (
                  <div style={{ padding: '12px', backgroundColor: '#fff7ed', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <Clock size={16} color="#ea580c" />
                      <span style={{ fontWeight: 'bold', color: '#9a3412', fontSize: '0.9rem' }}>MyKasih Expiry</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#c2410c' }}>
                      {reminders.myKasih.days} days left
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9a3412' }}>Due: {reminders.myKasih.date}</div>
                  </div>
                )}

                {/* SARA Payment */}
                {reminders.sara && (
                  <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <Banknote size={16} color="#16a34a" />
                      <span style={{ fontWeight: 'bold', color: '#166534', fontSize: '0.9rem' }}>Next SARA</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#15803d' }}>
                      {reminders.sara.days} days left
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#166534' }}>Date: {reminders.sara.date}</div>
                  </div>
                )}

                {/* STR Payment */}
                {reminders.str && (
                  <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <Banknote size={16} color="#2563eb" />
                      <span style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '0.9rem' }}>Next STR ({reminders.str.amount})</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                      {reminders.str.days} days left
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#1e40af' }}>Expected: {reminders.str.date}</div>
                  </div>
                )}

                {!reminders.myKasih && !reminders.sara && !reminders.str && (
                   <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.9rem' }}>No upcoming reminders</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content (Chat Area) */}
        <main style={{ flexGrow: 1, padding: '20px', paddingBottom: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Welcome Message */}
          {!transcript && !aiResponse && (
            <div style={{ textAlign: 'center', marginTop: '50px', color: '#6b7280' }}>
              <p style={{ fontSize: '1.5rem' }}>{t('mainWelcome')}</p>
            </div>
          )}

          {/* User Transcript */}
          {transcript && (
            <div style={{ alignSelf: 'flex-end', backgroundColor: '#dbeafe', padding: '15px', borderRadius: '15px 15px 0 15px', maxWidth: '80%' }}>
              <p style={{ margin: 0, color: '#1e40af' }}>{transcript}</p>
            </div>
          )}

          {/* AI Response */}
          {aiResponse && (
            <div style={{ alignSelf: 'flex-start', backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '15px 15px 15px 0', maxWidth: '80%', border: '1px solid #e5e7eb' }}>
              <p style={{ margin: 0, color: '#374151' }}>{aiResponse}</p>
            </div>
          )}

          {/* Voice Assistant Typing Indicator */}
          {isProcessing && (
            <div style={{ alignSelf: 'flex-start', backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '15px 15px 15px 0', maxWidth: '80%', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#374151', fontStyle: 'italic' }}>Voice assistant is typing</span>
              <span className="typing-indicator" style={{ display: 'inline-block', width: '24px', height: '24px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="5" cy="12" r="2" fill="#9ca3af">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="12" cy="12" r="2" fill="#9ca3af">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="19" cy="12" r="2" fill="#9ca3af">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1s" begin="0.5s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </span>
            </div>
          )}
        </main>
      </div>

      {/* Floating Bottom Dock */}
      <div style={{ 
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: '50px', // Bubble shape
        padding: '10px 20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)', // Floating shadow
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px', // Close to mic
        zIndex: 100,
        width: 'max-content'
      }}>
        {/* Left Button: MyKasih */}
        <button
          onClick={() => navigate('/mykasih')}
          className="nav-icon-btn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            background: 'none',
            border: 'none',
            color: '#4b5563',
            cursor: 'pointer',
            width: '90px', // Fixed width for symmetry
            textAlign: 'center'
          }}
        >
          <div style={{ backgroundColor: '#fce7f3', padding: '12px', borderRadius: '50%', marginBottom: '5px' }}>
            <HeartHandshake size={28} color="#ec4899" />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', lineHeight: '1.2' }}>{t('myKasih')}</span>
        </button>

        {/* Center: Huge Mic Button */}
        <div style={{ position: 'relative', margin: '0 10px' }}>
          {/* Label above mic */}
          <p style={{ 
            position: 'absolute',
            top: '-60px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'max-content',
            fontSize: '0.9rem', 
            color: '#6b7280', 
            fontWeight: '600',
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '6px 12px',
            borderRadius: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            opacity: (isListening || isProcessing) ? 1 : 0, 
            transition: 'opacity 0.2s',
            pointerEvents: 'none'
          }}>
            {isListening ? 'Recording...' : isProcessing ? 'Processing...' : t('pressToTalk')}
          </p>
          
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              if (e.target.setPointerCapture) {
                try {
                  e.target.setPointerCapture(e.pointerId);
                } catch (err) {
                  console.error("Pointer capture error:", err);
                }
              }
              startListening();
            }}
            onPointerUp={(e) => {
              if (e.target.releasePointerCapture) {
                try {
                  e.target.releasePointerCapture(e.pointerId);
                } catch (err) {}
              }
              stopListening();
            }}
            onPointerLeave={(e) => {
              if (e.target.releasePointerCapture) {
                try {
                  e.target.releasePointerCapture(e.pointerId);
                } catch (err) {}
              }
              stopListening();
            }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={isProcessing}
            style={{
              touchAction: 'none',
              width: '110px', // Much larger
              height: '110px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#ef4444' : isProcessing ? '#f59e0b' : 'var(--primary-color)',
              border: '6px solid #f3f4f6',
              boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isProcessing ? 'wait' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: isListening ? 'scale(1.05)' : 'scale(1.2) translateY(-25px)', // Pop out effect
              touchAction: 'none', // Critical for mobile: prevents scrolling/gestures
              userSelect: 'none', // Prevents text selection
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none', // Prevents iOS context menu
              opacity: isProcessing ? 0.7 : 1
            }}
          >
            <Mic size={55} color="white" />
          </button>
          
          {/* Error message */}
          {voiceError && (
            <p style={{
              position: 'absolute',
              bottom: '-50px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'max-content',
              maxWidth: '300px',
              fontSize: '0.8rem',
              color: '#ef4444',
              backgroundColor: '#fee2e2',
              padding: '8px 12px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              {voiceError}
            </p>
          )}
        </div>

        {/* Right Button: STR */}
        <button
          onClick={() => navigate('/str')}
          className="nav-icon-btn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            background: 'none',
            border: 'none',
            color: '#4b5563',
            cursor: 'pointer',
            width: '90px', // Fixed width for symmetry
            textAlign: 'center'
          }}
        >
          <div style={{ backgroundColor: '#d1fae5', padding: '12px', borderRadius: '50%', marginBottom: '5px' }}>
            <Banknote size={28} color="#10b981" />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', lineHeight: '1.2' }}>{t('str')}</span>
        </button>
      </div>

      {/* Floating Bell Button (When Sidebar Closed) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="bell-trigger"
          style={{
            position: 'fixed',
            bottom: '130px', // Desktop default
            left: '30px',
            zIndex: 90,
            backgroundColor: 'white',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bell size={32} color="#2563eb" />
          {(requests.length > 0 || Object.keys(reminders).length > 0) && (
            <div style={{
              position: 'absolute',
              top: '0',
              right: '0',
              width: '16px',
              height: '16px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              border: '2px solid white'
            }} />
          )}
        </button>
      )}

      {/* Floating QR Code Button - Bottom Right */}
      <button
        onClick={() => setIsQRModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '80px',
          height: '80px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: '4px solid white',
          borderRadius: '50%',
          fontSize: '18px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.5)',
          transition: 'all 0.3s',
          zIndex: 100,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.5)';
        }}
        title={t('generateQR')}
      >
        <QrCode size={40} />
      </button>

      {/* Family Dock */}
      <FamilyDock />

      {/* QR Code Modal */}
      <QRCodeModal 
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        userId="USR001"
      />

      <style>{`
        @keyframes slideRight {
          from { transform: translateX(-50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .bell-trigger {
            bottom: 260px !important;
            left: 20px !important;
          }
          .sidebar-panel {
            position: absolute !important;
            height: 100% !important;
            box-shadow: 5px 0 15px rgba(0,0,0,0.1) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MainPage;