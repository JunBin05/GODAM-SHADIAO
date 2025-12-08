import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mic, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import CameraCapture from '../components/CameraCapture';
import { useAuth } from '../hooks/useAPI';

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [step, setStep] = useState('input-ic'); // input-ic, select-method, verify-face, verify-voice, success
  const [icInput, setIcInput] = useState('');
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { login, loading: authLoading } = useAuth();

  const handleCheckIC = async () => {
    // Backdoor for testing STR/SARA logic
    if (icInput === '111' || icInput === '222') {
      const mockUser = {
        name: icInput === '111' ? 'Ah Gong (Eligible)' : 'Ah Ma (Not Eligible)',
        icNumber: icInput,
        address: '123 Test Street'
      };
      localStorage.setItem('registeredUser', JSON.stringify(mockUser));
      setUserData(mockUser);
      setError('');
      setStep('select-method');
      return;
    }

    // For real authentication, use IC as username
    try {
      setError('');
      // Check if user exists locally first
      const storedUser = localStorage.getItem('registeredUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.icNumber.includes(icInput) || icInput === 'demo') {
          setUserData(user);
          setStep('select-method');
          return;
        }
      }
      setError(t('notRegistered'));
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleFaceVerify = async (imageSrc) => {
    setIsVerifying(true);
    try {
      // For demo: face verification always succeeds after 2 seconds
      // In production, send imageSrc to backend for face recognition
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Attempt real login with IC as username and dummy password
      // Backend should validate based on biometric data in production
      try {
        await login(userData.icNumber, 'demo-password');
      } catch (err) {
        console.log('Login API call failed, using local auth:', err);
      }
      
      setIsVerifying(false);
      setStep('success');
    } catch (err) {
      setIsVerifying(false);
      setError('Face verification failed');
    }
  };

  const handleVoiceVerify = async () => {
    setIsVerifying(true);
    try {
      // For demo: voice verification always succeeds after 3 seconds
      // In production, record audio and send to backend for voice recognition
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Attempt real login
      try {
        await login(userData.icNumber, 'demo-password');
      } catch (err) {
        console.log('Login API call failed, using local auth:', err);
      }
      
      setIsVerifying(false);
      setStep('success');
    } catch (err) {
      setIsVerifying(false);
      setError('Voice verification failed');
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

        <button className="primary-btn" onClick={handleCheckIC}>
          {t('check')}
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
          style={{ height: '150px', flexDirection: 'row', gap: '20px' }}
        >
          <User size={48} className="plus-icon" />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            {t('faceAuth')}
          </span>
        </button>

        <button 
          className="upload-block" 
          onClick={() => setStep('verify-voice')}
          style={{ height: '150px', flexDirection: 'row', gap: '20px' }}
        >
          <Mic size={48} className="plus-icon" />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            {t('voiceAuth')}
          </span>
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
      
      <div className="upload-block" onClick={!isVerifying ? handleVoiceVerify : undefined} style={{ cursor: 'pointer' }}>
        {isVerifying ? (
          <div className="scanning-animation">
            <div className="scan-line"></div>
            <p>{t('processing')}</p>
          </div>
        ) : (
          <>
            <Mic size={64} className="plus-icon" />
            <p style={{ marginTop: '20px', fontSize: '1.2rem', textAlign: 'center', padding: '0 20px' }}>
              {t('loginVoicePrompt').replace('{name}', userData?.name || 'User')}
            </p>
            <p className="instruction-text" style={{ marginTop: '10px', color: '#666' }}>
              {t('startRecording')}
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