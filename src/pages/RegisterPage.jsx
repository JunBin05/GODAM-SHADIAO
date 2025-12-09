import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft, CheckCircle, User, Mic, Plus, AlertCircle, Globe } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import ProgressBar from '../components/ProgressBar';
import CameraCapture from '../components/CameraCapture';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { 
    isRecording, 
    isProcessing, 
    error: voiceError, 
    startVoiceRegistration,
    confirmVoiceRegistration,
    cancelRegistration,
    checkServer 
  } = useVoiceRecorder();
  
  const [step, setStep] = useState(1); // 1: IC, 2: Face, 3: Voice, 4: Language, 5: Success
  const [isScanning, setIsScanning] = useState(false);
  const [activeCamera, setActiveCamera] = useState(null); // 'ic' or 'face'
  const [icData, setIcData] = useState(null);
  const [faceMatched, setFaceMatched] = useState(false);
  const [voiceRecorded, setVoiceRecorded] = useState(false);
  const [capturedFace, setCapturedFace] = useState(null);
  const [serverOnline, setServerOnline] = useState(false);
  const [voiceRegistrationError, setVoiceRegistrationError] = useState(null);
  
  // Voice registration state: 'idle' | 'first_recorded' | 'confirmed'
  const [voiceRegStep, setVoiceRegStep] = useState('idle');
  const [voiceConfirmationResult, setVoiceConfirmationResult] = useState(null);
  
  // Language preference state
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [isSavingToFirebase, setIsSavingToFirebase] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Check if voice server is online
  useEffect(() => {
    const checkVoiceServer = async () => {
      const status = await checkServer();
      setServerOnline(status.online && status.modelLoaded);
    };
    checkVoiceServer();
  }, [checkServer]);

  // Real OCR Extraction
  const processICImage = async (imageSrc) => {
    setActiveCamera(null);
    setIsScanning(true);
    
    try {
      const result = await Tesseract.recognize(
        imageSrc,
        'eng',
        { logger: m => console.log(m) }
      );
      
      const text = result.data.text;
      console.log("OCR Result:", text);
      
      // Simple regex to find IC number (e.g., 000000-00-0000)
      const icRegex = /\d{6}-\d{2}-\d{4}/;
      const icMatch = text.match(icRegex);
      
      // Heuristic to find name (lines that are all uppercase and not the IC)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
      const nameCandidate = lines.find(l => /^[A-Z\s]+$/.test(l) && !/\d/.test(l) && !l.includes('ISLAM') && !l.includes('MALAYSIA'));

      setIcData({
        name: nameCandidate || "Detected Name",
        icNumber: icMatch ? icMatch[0] : "Detected IC",
        photoUrl: imageSrc
      });
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Failed to read IC. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const processFaceImage = (imageSrc) => {
    setActiveCamera(null);
    setIsScanning(true);
    setCapturedFace(imageSrc);
    
    // Mock Face Matching (Real implementation would use face-api.js)
    setTimeout(() => {
      setFaceMatched(true);
      setIsScanning(false);
    }, 2000);
  };

  const handleScanIC = () => {
    setActiveCamera('ic');
  };

  const handleScanFace = () => {
    setActiveCamera('face');
  };

  // Two-step voice registration using FastAPI backend
  const handleRecordVoice = async () => {
    if (!icData?.icNumber) {
      setVoiceRegistrationError('IC number not found. Please complete IC scan first.');
      return;
    }

    setVoiceRegistrationError(null);
    setVoiceConfirmationResult(null);
    
    // Use IC number as user_id for voice registration
    const userId = icData.icNumber.replace(/-/g, ''); // Remove dashes from IC
    
    if (voiceRegStep === 'idle') {
      // First recording
      const result = await startVoiceRegistration(userId);
      
      if (result.success) {
        setVoiceRegStep('first_recorded');
      } else {
        setVoiceRegistrationError(result.message);
      }
    } else if (voiceRegStep === 'first_recorded') {
      // Confirmation recording
      const result = await confirmVoiceRegistration(userId);
      
      if (result.success) {
        setVoiceConfirmationResult(result);
        
        if (result.confirmed) {
          setVoiceRegStep('confirmed');
          setVoiceRecorded(true);
        } else {
          // Voice didn't match, reset to try again
          setVoiceRegStep('idle');
          setVoiceRegistrationError(`Voice recordings don't match (${(result.similarity * 100).toFixed(1)}% similarity). Please try again.`);
        }
      } else {
        setVoiceRegStep('idle');
        setVoiceRegistrationError(result.message);
      }
    }
  };

  // Reset voice registration
  const handleResetVoice = async () => {
    const userId = icData?.icNumber?.replace(/-/g, '');
    if (userId) {
      await cancelRegistration(userId);
    }
    setVoiceRegStep('idle');
    setVoiceRecorded(false);
    setVoiceRegistrationError(null);
    setVoiceConfirmationResult(null);
  };

  const handleStepClick = (clickedStep) => {
    if (clickedStep < step) {
      setStep(clickedStep);
    }
  };

  const renderICStep = () => (
    <div className="step-container">
      <h2 className="step-title">{t('scanIC')}</h2>
      
      {!icData ? (
        activeCamera === 'ic' ? (
          <div className="upload-block" style={{ border: 'none', padding: 0, overflow: 'hidden' }}>
            <CameraCapture onCapture={processICImage} label={t('scanIC')} mode="environment" />
          </div>
        ) : (
          <div className="upload-block" onClick={handleScanIC}>
            {isScanning ? (
              <div className="scanning-animation">
                <div className="scan-line"></div>
                <p>{t('processing')}</p>
              </div>
            ) : (
              <>
                <Plus size={64} className="plus-icon" />
                <p>{t('takePhoto')}</p>
              </>
            )}
          </div>
        )
      ) : (
        <div className="verification-card">
          <div className="scanned-preview-container">
            <img src={icData.photoUrl} alt="IC" className="scanned-image" />
            <div className="check-overlay">
              <CheckCircle size={48} color="#10b981" />
            </div>
          </div>
          
          <div className="result-details">
            <div className="result-item">
              <label>{t('fullName')}</label>
              <div className="result-value">{icData.name}</div>
            </div>
            <div className="result-item">
              <label>{t('icNumber')}</label>
              <div className="result-value">{icData.icNumber}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="secondary-btn" onClick={() => setIcData(null)} style={{ flex: 1 }}>
                {t('rescan')}
              </button>
              <button className="primary-btn" onClick={() => setStep(2)} style={{ flex: 1 }}>
                {t('next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFaceStep = () => (
    <div className="step-container">
      <h2 className="step-title">{t('scanFace')}</h2>
      
      {!faceMatched ? (
        activeCamera === 'face' ? (
          <div className="upload-block" style={{ border: 'none', padding: 0, overflow: 'hidden' }}>
            <CameraCapture onCapture={processFaceImage} label={t('scanFace')} mode="user" />
          </div>
        ) : (
          <div className="upload-block" onClick={handleScanFace}>
            {isScanning ? (
              <div className="scanning-animation">
                <div className="scan-line"></div>
                <p>{t('processing')}</p>
              </div>
            ) : (
              <>
                <User size={64} className="plus-icon" />
                <p>{t('takePhoto')}</p>
              </>
            )}
          </div>
        )
      ) : (
        <div className="verification-card">
          <div className="scanned-preview-container">
            <img src={capturedFace || "https://via.placeholder.com/150"} alt="Face" className="scanned-image" />
            <div className="check-overlay">
              <CheckCircle size={48} color="#10b981" />
            </div>
          </div>
          
          <div className="result-details">
            <div className="result-item" style={{ textAlign: 'center' }}>
              <div className="result-value" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                {t('faceMatchSuccess')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="secondary-btn" onClick={() => setFaceMatched(false)} style={{ flex: 1 }}>
                {t('rescan')}
              </button>
              <button className="primary-btn" onClick={() => setStep(3)} style={{ flex: 1 }}>
                {t('next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderVoiceStep = () => (
    <div className="step-container">
      <h2>{t('recordVoice')}</h2>
      
      {/* Step Indicator */}
      <div style={{ 
        backgroundColor: '#e0f2fe', 
        color: '#0369a1', 
        padding: '12px 20px', 
        borderRadius: '10px', 
        marginBottom: '20px',
        textAlign: 'center',
        fontSize: '1.1rem'
      }}>
        {voiceRegStep === 'idle' && '📢 Step 1: Record your voice'}
        {voiceRegStep === 'first_recorded' && '🔄 Step 2: Record again to confirm'}
        {voiceRegStep === 'confirmed' && '✅ Voice registration complete!'}
      </div>

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
      {(voiceError || voiceRegistrationError) && (
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
          <span>{voiceError || voiceRegistrationError}</span>
        </div>
      )}

      {/* First Recording Success Message */}
      {voiceRegStep === 'first_recorded' && (
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
          <span>First recording saved! Now record again to confirm.</span>
        </div>
      )}
      
      {!voiceRecorded ? (
        <div className="upload-block" onClick={!isRecording && !isProcessing && serverOnline ? handleRecordVoice : undefined} style={{ cursor: serverOnline ? 'pointer' : 'not-allowed', opacity: serverOnline ? 1 : 0.6 }}>
          {isRecording || isProcessing ? (
            <div className="scanning-animation">
              <div className="scan-line"></div>
              <p>{isRecording ? 'Recording... Speak now!' : t('processing')}</p>
            </div>
          ) : (
            <>
              <Mic size={64} className="plus-icon" />
              <p style={{ marginTop: '20px', fontSize: '1.2rem', textAlign: 'center', padding: '0 20px' }}>
                {voiceRegStep === 'idle' 
                  ? t('voicePrompt').replace('{name}', icData?.name || 'User')
                  : 'Repeat the same phrase to confirm your voice'}
              </p>
              <p className="instruction-text" style={{ marginTop: '10px', color: '#666' }}>
                {serverOnline 
                  ? (voiceRegStep === 'idle' ? 'Tap to start recording' : 'Tap to record confirmation') 
                  : 'Server offline - cannot record'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="verification-card">
          <div className="scanned-preview-container">
            <div className="voice-wave-visual" style={{ 
              width: '100%', 
              height: '150px', 
              background: '#f0f9ff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              borderRadius: '12px'
            }}>
              <Mic size={64} color="#2563eb" />
              {voiceConfirmationResult && (
                <p style={{ marginTop: '10px', color: '#065f46', fontWeight: 'bold' }}>
                  Match: {(voiceConfirmationResult.similarity * 100).toFixed(1)}%
                </p>
              )}
            </div>
            <div className="check-overlay">
              <CheckCircle size={48} color="#10b981" />
            </div>
          </div>
          
          <div className="result-details">
            <div className="result-item" style={{ textAlign: 'center' }}>
              <div className="result-value" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                Voice Confirmed & Registered!
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="secondary-btn" onClick={handleResetVoice} style={{ flex: 1 }}>
                Re-record
              </button>
              <button className="primary-btn" onClick={() => setStep(4)} style={{ flex: 1 }}>
                {t('next')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset button when in first_recorded state */}
      {voiceRegStep === 'first_recorded' && !isRecording && !isProcessing && (
        <button 
          className="secondary-btn" 
          onClick={handleResetVoice} 
          style={{ marginTop: '15px', width: '100%' }}
        >
          Start Over
        </button>
      )}
    </div>
  );

  // Language options with elderly-friendly labels
  const languageOptions = [
    { value: 'BM', label: 'Bahasa Melayu', icon: '🇲🇾' },
    { value: 'BI', label: 'Bahasa Inggeris (English)', icon: '🇬🇧' },
    { value: 'BC', label: '华语 (Mandarin)', icon: '🇨🇳' },
    { value: 'HK', label: '廣東話 (Cantonese)', icon: '🗣️' },
  ];

  // Save all registration data to Firebase
  const saveToFirebase = async () => {
    if (!icData?.icNumber) {
      setSaveError('IC number not found');
      return false;
    }

    setIsSavingToFirebase(true);
    setSaveError(null);

    try {
      const response = await fetch('http://localhost:8000/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          icNumber: icData.icNumber,
          name: icData.name,
          faceEmbedding: capturedFace ? [1.0] : null, // Placeholder - replace with actual face encoding
          language: selectedLanguage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to save data');
      }

      console.log('✓ Registration data saved to Firebase:', result);
      return true;
    } catch (error) {
      console.error('Firebase save error:', error);
      setSaveError(error.message);
      return false;
    } finally {
      setIsSavingToFirebase(false);
    }
  };

  // Handle language selection and proceed to success
  const handleLanguageConfirm = async () => {
    if (!selectedLanguage) {
      setSaveError('Please select a language');
      return;
    }

    const success = await saveToFirebase();
    if (success) {
      setStep(5);
    }
  };

  const renderLanguageStep = () => (
    <div className="step-container">
      <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>🗣️ Pilih Bahasa Pilihan</h2>
      <p style={{ 
        textAlign: 'center', 
        color: '#666', 
        marginBottom: '30px',
        fontSize: '1.1rem'
      }}>
        Choose your preferred language for voice assistant
      </p>

      {/* Error Message */}
      {saveError && (
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
          <span>{saveError}</span>
        </div>
      )}

      {/* Language Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {languageOptions.map((lang) => (
          <button
            key={lang.value}
            onClick={() => setSelectedLanguage(lang.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              padding: '20px',
              borderRadius: '12px',
              border: selectedLanguage === lang.value 
                ? '3px solid #2563eb' 
                : '2px solid #e5e7eb',
              backgroundColor: selectedLanguage === lang.value 
                ? '#eff6ff' 
                : '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '1.3rem',
            }}
          >
            <span style={{ fontSize: '2rem' }}>{lang.icon}</span>
            <span style={{ 
              fontWeight: selectedLanguage === lang.value ? 'bold' : 'normal',
              color: selectedLanguage === lang.value ? '#1e40af' : '#374151'
            }}>
              {lang.label}
            </span>
            {selectedLanguage === lang.value && (
              <CheckCircle size={28} color="#2563eb" style={{ marginLeft: 'auto' }} />
            )}
          </button>
        ))}
      </div>

      {/* Confirm Button */}
      <button 
        className="primary-btn" 
        onClick={handleLanguageConfirm}
        disabled={!selectedLanguage || isSavingToFirebase}
        style={{ 
          marginTop: '30px', 
          width: '100%',
          opacity: (!selectedLanguage || isSavingToFirebase) ? 0.6 : 1,
          fontSize: '1.2rem',
          padding: '18px'
        }}
      >
        {isSavingToFirebase ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div className="scan-line" style={{ width: '20px', height: '20px' }}></div>
            Saving...
          </span>
        ) : (
          'Confirm & Complete Registration'
        )}
      </button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="step-container">
      <div className="verification-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <CheckCircle size={80} color="#10b981" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: '#065f46', marginBottom: '10px' }}>{t('registerSuccess')}</h2>
        <p style={{ color: '#059669', marginBottom: '20px' }}>
          ✅ Data saved to Firebase successfully!
        </p>
        
        <div className="result-details" style={{ marginTop: '30px', textAlign: 'left' }}>
          <div className="result-item">
            <span className="result-label">{t('fullName')}</span>
            <span className="result-value">{icData?.name}</span>
          </div>
          <div className="result-item">
            <span className="result-label">{t('icNumber')}</span>
            <span className="result-value">{icData?.icNumber}</span>
          </div>
          <div className="result-item">
            <span className="result-label">🗣️ Language</span>
            <span className="result-value">
              {languageOptions.find(l => l.value === selectedLanguage)?.label || selectedLanguage}
            </span>
          </div>
        </div>

        <button 
          className="primary-btn" 
          onClick={() => {
            navigate('/login');
          }} 
          style={{ marginTop: '30px', fontSize: '1.2rem', padding: '18px' }}
        >
          {t('goToLogin')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-container register-page">
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
          <div className="logo-placeholder">{t('registerTitle')}</div>
        </div>
        <LanguageToggle />
      </header>

      <ProgressBar currentStep={step} totalSteps={5} onStepClick={handleStepClick} />

      <main className="page-content">
        {step === 1 && renderICStep()}
        {step === 2 && renderFaceStep()}
        {step === 3 && renderVoiceStep()}
        {step === 4 && renderLanguageStep()}
        {step === 5 && renderSuccessStep()}
      </main>
    </div>
  );
};

export default RegisterPage;