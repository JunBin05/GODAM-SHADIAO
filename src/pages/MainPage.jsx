import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Mic, HeartHandshake, Banknote, QrCode } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import FamilyDock from '../components/FamilyDock';
import StatusCard from '../components/StatusCard';
import ReminderWidget from '../components/ReminderWidget';
import QRCodeModal from '../components/QRCodeModal';
import { useAidPrograms, useReminders } from '../hooks/useAPI';

const MainPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const { status: aidStatus, loading: aidLoading } = useAidPrograms(userId, language);
  const { reminders, loading: remindersLoading } = useReminders(userId, language);

  // Mock reminders for demonstration (remove when backend is ready)
  const mockReminders = [
    {
      id: 'REM001',
      title: 'STR Payment Incoming',
      message: 'Your STR monthly payment of RM 350 will be deposited to your bank account soon.',
      category: 'payment',
      priority: 'high',
      due_date: '2025-12-15T00:00:00'
    },
    {
      id: 'REM002',
      title: 'Document Renewal Required',
      message: 'Your MyKad needs to be renewed. Please visit the nearest JPN branch.',
      category: 'document',
      priority: 'medium',
      due_date: '2025-12-20T00:00:00'
    },
    {
      id: 'REM003',
      title: 'BSN Branch Appointment',
      message: 'Your appointment at BSN Kuala Lumpur branch is scheduled.',
      category: 'appointment',
      priority: 'medium',
      due_date: '2025-12-10T10:00:00'
    },
    {
      id: 'REM004',
      title: 'SARA Balance Expiring',
      message: 'You have RM 50 in SARA balance that will expire at the end of the month.',
      category: 'payment',
      priority: 'medium',
      due_date: '2025-12-31T00:00:00'
    }
  ];

  // Use mock reminders if no real reminders available
  const displayReminders = reminders && reminders.length > 0 ? reminders : mockReminders;

  useEffect(() => {
    const storedUser = localStorage.getItem('registeredUser');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
      setUserId('USR001'); // In production, get from JWT token
    }
  }, []);

  // Log aid status when available
  useEffect(() => {
    if (aidStatus) {
      console.log('User aid programs:', aidStatus);
    }
  }, [aidStatus]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      // Map app language to speech language
      const langMap = {
        'en': 'en-US',
        'ms': 'ms-MY',
        'zh-cn': 'zh-CN',
        'zh-tw': 'zh-TW',
        'ta': 'ta-IN'
      };
      recognitionRef.current.lang = langMap[language] || 'en-US';

      recognitionRef.current.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleAIResponse(text);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [language]);

  const handleAIResponse = (text) => {
    // AI Logic with intent detection
    let response = "";
    const lowerText = text.toLowerCase();

    // NOTE: Your teammate will replace this with real AI voice assistant
    // For now, simple keyword detection for navigation
    
    // STR Application Intent
    if (lowerText.includes('apply for str') || lowerText.includes('apply str') || lowerText.includes('str application')) {
      response = "Opening STR application form for you.";
      setAiResponse(response);
      speak(response);
      setTimeout(() => navigate('/str-apply'), 1500);
      return;
    }
    
    // STR Status Check
    if (lowerText.includes('str status') || lowerText.includes('str check') || lowerText.includes('my str')) {
      response = "Checking your STR status.";
      setAiResponse(response);
      speak(response);
      setTimeout(() => navigate('/str'), 1500);
      return;
    }

    // SARA Intent
    if (lowerText.includes('sara') || lowerText.includes('asas rahmah')) {
      response = "Opening SARA page.";
      setAiResponse(response);
      speak(response);
      setTimeout(() => navigate('/sara'), 1500);
      return;
    }

    // Money/Payment Queries
    if (lowerText.includes('money') || lowerText.includes('duit') || lowerText.includes('wang') || lowerText.includes('cash') || lowerText.includes('payment')) {
      if (aidStatus && aidStatus.data) {
        const strProgram = aidStatus.data.find(p => p.program_id === 'str');
        if (strProgram && strProgram.enrollment_status === 'enrolled') {
          response = "You are enrolled in STR! You can check your payment status and next payments on the STR page.";
        } else {
          response = "You are not currently enrolled in STR. Would you like to apply? Just say 'apply for STR'.";
        }
      } else {
        response = "You can check your STR status by clicking the button on the right.";
      }
    } else if (lowerText.includes('help') || lowerText.includes('tolong') || lowerText.includes('bantu')) {
      response = "I am here to help. Press and hold the mic button to ask about SARA, STR, or say 'apply for STR' to start an application.";
    } else if (lowerText.includes('register') || lowerText.includes('daftar')) {
      response = "You are already registered and logged in.";
    } else {
      response = `I heard you say: "${text}". How can I help you with SARA or STR? You can say 'apply for STR' to start an application.`;
    }

    setAiResponse(response);
    speak(response);
  };

  const speak = (text) => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map app language to speech voice language
    const langMap = {
      'en': 'en-US',
      'ms': 'ms-MY',
      'zh-cn': 'zh-CN',
      'zh-tw': 'zh-TW',
      'ta': 'ta-IN'
    };
    utterance.lang = langMap[language] || 'en-US';
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const startListening = (e) => {
    // Prevent default behavior to avoid scrolling/context menu/selection
    if (e.cancelable) {
      e.preventDefault();
    }
    
    // Capture pointer to ensure we get the up event even if they move slightly off
    if (e.target.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (err) {
        console.error("Pointer capture error:", err);
      }
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Start error:", err);
      }
    } else {
      alert("Speech recognition not supported in this browser.");
    }
  };

  const stopListening = (e) => {
    if (e.target.releasePointerCapture) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {
        console.error("Pointer release error:", err);
      }
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="page-container main-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header className="landing-header" style={{ flexShrink: 0, position: 'relative' }}>
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
            pointerEvents: 'none' // Prevent blocking clicks if it overlaps (though it shouldn't)
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

      {/* Main Content (Chat Area) */}
      <main style={{ flexGrow: 1, padding: '20px', paddingBottom: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Status Cards Section */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#374151', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {t('quickOverview')}
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px',
            marginBottom: '20px'
          }}>
            <StatusCard 
              program={aidStatus?.data?.find(p => p.program_id === 'str')}
              icon={<Banknote size={32} />}
              onClick={() => navigate('/str')}
              type="str"
            />
            <StatusCard 
              program={aidStatus?.data?.find(p => p.program_id === 'sara')}
              icon={<HeartHandshake size={32} />}
              onClick={() => navigate('/sara')}
              type="sara"
            />
          </div>
        </div>

        {/* Reminders Widget */}
        <ReminderWidget 
          reminders={displayReminders} 
          onViewAll={() => navigate('/reminders')} 
        />

        {/* Welcome Message */}
        {!transcript && !aiResponse && (
          <div style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280' }}>
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
      </main>

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

      {/* Floating Voice Assistant Button */}
      <div style={{ 
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: '50%',
        padding: '10px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
      }}>
        {/* Voice Assistant Mic Button */}
        <div style={{ position: 'relative' }}>
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
            opacity: isListening ? 1 : 0, 
            transition: 'opacity 0.2s',
            pointerEvents: 'none'
          }}>
            {isListening ? t('listening') : t('pressToTalk')}
          </p>
          
          <button
            onPointerDown={startListening}
            onPointerUp={stopListening}
            onPointerLeave={stopListening}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#ef4444' : 'var(--primary-color)',
              border: '6px solid #f3f4f6',
              boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: isListening ? 'scale(1.05)' : 'scale(1)',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none'
            }}
          >
            <Mic size={55} color="white" />
          </button>
        </div>
      </div>

      {/* Family Dock */}
      <FamilyDock />

      {/* QR Code Modal */}
      <QRCodeModal 
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        userId={userId}
      />
    </div>
  );
};

export default MainPage;