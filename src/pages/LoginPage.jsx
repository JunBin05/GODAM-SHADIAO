import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mic, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import CameraCapture from '../components/CameraCapture';
import { useAuth } from '../hooks/useAPI';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';


const API_BASE_URL = 'http://localhost:8000/api';


const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isRecording, isProcessing, error: voiceError, verifyVoice, checkServer } = useVoiceRecorder();
  
  const [step, setStep] = useState('input-ic'); // input-ic, select-method, verify-face, verify-voice, success
  const [icInput, setIcInput] = useState('');
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { login, loading: authLoading } = useAuth();
  const [isCheckingIC, setIsCheckingIC] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [voiceVerificationResult, setVoiceVerificationResult] = useState(null);
  const [voiceVerificationError, setVoiceVerificationError] = useState(null);

  // Check if voice server is online
  useEffect(() => {
    const checkVoiceServer = async () => {
      const status = await checkServer();
      setServerOnline(status);
    };
    checkVoiceServer();
  }, [checkServer]);

  // Check IC against Firebase
  const handleCheckIC = async () => {
    if (!icInput.trim()) {
      setError('Please enter your IC number');
      return;
    }

    setError('');
    setIsCheckingIC(true);

    // Backdoor for testing STR/MyKasih logic
    if (icInput === '111' || icInput === '222') {
      const mockUser = {
        name: icInput === '111' ? 'Ah Gong (Eligible)' : 'Ah Ma (Not Eligible)',
        icNumber: icInput,
        address: '123 Test Street'
      };
      setUserData(mockUser);
      setIsCheckingIC(false);
      setStep('select-method');
      return;
    }

    try {
      // Call backend API to check user in Firebase
      console.log('[LOGIN] Checking IC:', icInput);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/user/user_exists`, {
        signal: controller.signal,
        method: 'POST',
        body: JSON.stringify({ nric: icInput }),
        headers: { 'Content-Type': 'application/json' }
      });
      clearTimeout(timeoutId);
      const result = await response.json();
      console.log('[LOGIN] IC check result:', result);

      if (response.ok && result.user_exists) {
        setUserData({
          icNumber: icInput,
          name: result.name,
          hasVoice: result.hasVoice,
          hasFace: result.hasFace
        });
        setStep('select-method');
      } else {
        // Fallback to local storage check
        const storedUser = localStorage.getItem('registeredUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.icNumber.includes(icInput) || icInput === 'demo') {
            setUserData(user);
            setStep('select-method');
            return;
          }
        }
        setError(result.message || t('notRegistered'));
      }
    } catch (err) {
      console.error('Error checking IC:', err);
      if (err.name === 'AbortError') {
        setError('Request timeout. Please check if backend is running.');
      } else {
        setError('Server not available. Please try again.');
      }
      // Fallback to localStorage even on error
      const storedUser = localStorage.getItem('registeredUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.icNumber === icInput || user.icNumber.includes(icInput)) {
          setUserData(user);
          setStep('select-method');
          setError('');
          return;
        }
      }
    } finally {
      setIsCheckingIC(false);
    }
  };

  const handleFaceVerify = async (imageSrc) => {
    setIsVerifying(true);
    try {
      // // For demo: face verification always succeeds after 2 seconds
      // // In production, send imageSrc to backend for face recognition

      // await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`${API_BASE_URL}/user/login_face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nric: userData.icNumber,
          face_image_url: imageSrc,
        }),
      });
      const result = await response.json();
      console.log('[LOGIN] Face verification result:', result);
      if (!response.ok || !result.verified) {
        throw new Error(result.message || 'Face not recognized');
      }

      console.log('✓ Face verified successfully');
      const updatedUserData = result.userData || {};
      setUserData(updatedUserData);


      // Save user data to localStorage for other pages
      localStorage.setItem('registeredUser', JSON.stringify(updatedUserData));
      
      setIsVerifying(false);
      setStep('success');
    } catch (err) {
      setIsVerifying(false);
      setError('Face verification failed');
    }
  };

  // Real voice verification using FastAPI backend
  const handleVoiceVerify = async () => {
    if (!userData?.icNumber) {
      setVoiceVerificationError('IC number not found.');
      return;
    }

    setVoiceVerificationError(null);
    setVoiceVerificationResult(null);
    
    // Use IC number as user_id (remove dashes)
    const userId = userData.icNumber.replace(/-/g, '');
    
    const result = await verifyVoice(userId);
    
    if (result.success) {
      setVoiceVerificationResult(result);
      
      if (result.authenticated) {
        // Save user data to localStorage for other pages
        localStorage.setItem('registeredUser', JSON.stringify(result.userData));
        
        // Short delay to show success message
        setTimeout(() => {
          setStep('success');
        }, 1500);
      } else {
        setVoiceVerificationError(`Voice does not match`);
      }
    } else {
      setVoiceVerificationError(result.message);
    }
  };

  const renderInputStep = () => (
    <div className="step-container">
      <div className="verification-card" style={{ padding: '40px 20px' }}>
        <h2 style={{ color: 'var(--primary-color)', marginBottom: '30px', fontSize: '3rem', fontWeight: '800' }}>{t('loginTitle')}</h2>
        
        <div className="input-group" style={{ marginBottom: '20px', width: '100%' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.2rem', color: '#374151' }}>
            {t('enterIC')}
          </label>
          <input 
            type="text" 
            value={icInput}
            onChange={(e) => setIcInput(e.target.value)}
            placeholder="e.g. 800101-14-1234"
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '1.5rem',
              borderRadius: '10px',
              border: '2px solid #d1d5db',
              textAlign: 'center',
              letterSpacing: '2px'
            }}
          />
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            color: '#b91c1c', 
            padding: '15px', 
            borderRadius: '10px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={24} />
            <span style={{ fontSize: '1.1rem' }}>{error}</span>
          </div>
        )}

        <button 
          className="primary-btn" 
          onClick={handleCheckIC}
          disabled={isCheckingIC}
          style={{ opacity: isCheckingIC ? 0.7 : 1 }}
        >
          {isCheckingIC ? 'Checking...' : t('check')}
        </button>
        
        {error && (
          <button 
            className="secondary-btn" 
            onClick={() => navigate('/register')} 
            style={{ marginTop: '15px', width: '100%' }}
          >
            {t('registerTitle')}
          </button>
        )}
      </div>
    </div>
  );

  const renderSelectMethodStep = () => (
    <div className="step-container">
      <h2 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>
        {t('welcomeBack').replace('{name}', userData?.name || 'User')}
      </h2>
      <p style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '30px' }}>
        {t('selectMethod')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        <button 
          className="upload-block" 
          onClick={() => setStep('verify-face')}
          disabled={!userData?.hasFace}
          style={{ 
            height: '150px', 
            flexDirection: 'row', 
            gap: '20px',
            opacity: userData?.hasFace ? 1 : 0.5,
            cursor: userData?.hasFace ? 'pointer' : 'not-allowed'
          }}
        >
          <User size={48} className="plus-icon" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              {t('faceAuth')}
            </span>
            {!userData?.hasFace && (
              <span style={{ fontSize: '0.9rem', color: '#ef4444' }}>Not registered</span>
            )}
          </div>
        </button>

        <button 
          className="upload-block" 
          onClick={() => setStep('verify-voice')}
          disabled={!userData?.hasVoice}
          style={{ 
            height: '150px', 
            flexDirection: 'row', 
            gap: '20px',
            opacity: userData?.hasVoice ? 1 : 0.5,
            cursor: userData?.hasVoice ? 'pointer' : 'not-allowed'
          }}
        >
          <Mic size={48} className="plus-icon" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              {t('voiceAuth')}
            </span>
            {!userData?.hasVoice && (
              <span style={{ fontSize: '0.9rem', color: '#ef4444' }}>Not registered</span>
            )}
            {userData?.hasVoice && serverOnline && (
              <span style={{ fontSize: '0.9rem', color: '#10b981' }}>✓ Ready</span>
            )}
            {userData?.hasVoice && !serverOnline && (
              <span style={{ fontSize: '0.9rem', color: '#f59e0b' }}>Server offline</span>
            )}
          </div>
        </button>
      </div>
    </div>
  );

  const renderFaceVerifyStep = () => (
    <div className="step-container">
      <h2 className="step-title">{t('faceAuth')}</h2>
      <div className="upload-block" style={{ border: 'none', padding: 0, overflow: 'hidden' }}>
        {isVerifying ? (
          <div className="scanning-animation">
            <div className="scan-line"></div>
            <p>{t('processing')}</p>
          </div>
        ) : (
          <CameraCapture onCapture={handleFaceVerify} label={t('scanFace')} mode="user" />
        )}
      </div>
      <button className="secondary-btn" onClick={() => setStep('select-method')} style={{ marginTop: '20px' }}>
        {t('back')}
      </button>
    </div>
  );

  const renderVoiceVerifyStep = () => (
    <div className="step-container">
      <h2 className="step-title">{t('voiceAuth')}</h2>
      
      {/* Server Status Warning */}
      {!serverOnline && (
        <div style={{ 
          backgroundColor: '#fef3c7', 
          color: '#92400e', 
          padding: '15px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={24} />
          <span>Voice server is offline. Please start the server first.</span>
        </div>
      )}

      {/* Error Message */}
      {(voiceError || voiceVerificationError) && (
        <div style={{ 
          backgroundColor: '#fee2e2', 
          color: '#b91c1c', 
          padding: '15px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={24} />
          <span>{voiceError || voiceVerificationError}</span>
        </div>
      )}

      {/* Success Message */}
      {voiceVerificationResult?.authenticated && (
        <div style={{ 
          backgroundColor: '#d1fae5', 
          color: '#065f46', 
          padding: '15px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={24} />
          <span>Voice verified!</span>
        </div>
      )}
      
      <div className="upload-block" onClick={!isRecording && !isProcessing && serverOnline ? handleVoiceVerify : undefined} style={{ cursor: serverOnline ? 'pointer' : 'not-allowed', opacity: serverOnline ? 1 : 0.6 }}>
        {isRecording || isProcessing ? (
          <div className="scanning-animation">
            <div className="scan-line"></div>
            <p>{isRecording ? 'Recording... Speak now!' : t('processing')}</p>
          </div>
        ) : (
          <>
            <Mic size={64} className="plus-icon" />
            <p style={{ marginTop: '20px', fontSize: '1.2rem', textAlign: 'center', padding: '0 20px' }}>
              {t('loginVoicePrompt').replace('{name}', userData?.name || 'User')}
            </p>
            <p className="instruction-text" style={{ marginTop: '10px', color: '#666' }}>
              {serverOnline ? t('startRecording') : 'Server offline - cannot verify'}
            </p>
          </>
        )}
      </div>
      <button className="secondary-btn" onClick={() => setStep('select-method')} style={{ marginTop: '20px' }}>
        {t('back')}
      </button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="step-container">
      <div className="verification-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <CheckCircle size={80} color="#10b981" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: '#065f46', marginBottom: '10px' }}>{t('loginSuccess')}</h2>
        <p style={{ fontSize: '1.2rem', color: '#6b7280' }}>
          {t('welcomeBack').replace('{name}', userData?.name || 'User')}
        </p>
        
        <button className="primary-btn" onClick={() => navigate('/main')} style={{ marginTop: '30px' }}>
          {t('goMain')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-container login-page">
      <header className="landing-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            className="back-btn-icon" 
            onClick={() => navigate('/')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={32} />
          </button>
          <div className="logo-placeholder">{t('loginTitle')}</div>
        </div>
        <LanguageToggle />
      </header>

      <main className="page-content">
        {step === 'input-ic' && renderInputStep()}
        {step === 'select-method' && renderSelectMethodStep()}
        {step === 'verify-face' && renderFaceVerifyStep()}
        {step === 'verify-voice' && renderVoiceVerifyStep()}
        {step === 'success' && renderSuccessStep()}
      </main>
    </div>
  );
};

export default LoginPage;