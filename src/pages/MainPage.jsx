import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Mic, HeartHandshake, Banknote } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import FamilyDock from '../components/FamilyDock';

const MainPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    const storedUser = localStorage.getItem('registeredUser');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }
  }, []);

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
    // Mock AI Logic
    let response = "";
    const lowerText = text.toLowerCase();

    if (lowerText.includes('money') || lowerText.includes('duit') || lowerText.includes('wang') || lowerText.includes('cash')) {
      response = t('aiCheckStr');
    } else if (lowerText.includes('help') || lowerText.includes('tolong') || lowerText.includes('bantu')) {
      response = t('aiHelp');
    } else if (lowerText.includes('register') || lowerText.includes('daftar')) {
      response = t('aiRegistered');
    } else {
      response = t('aiDefault').replace('{text}', text);
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
      </main>

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
              touchAction: 'none',
              width: '110px', // Much larger
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
              transform: isListening ? 'scale(1.05)' : 'scale(1.2) translateY(-25px)', // Pop out effect
              touchAction: 'none', // Critical for mobile: prevents scrolling/gestures
              userSelect: 'none', // Prevents text selection
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none' // Prevents iOS context menu
            }}
          >
            <Mic size={55} color="white" />
          </button>
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

      {/* Family Dock */}
      <FamilyDock />
    </div>
  );
};

export default MainPage;