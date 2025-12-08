import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft, CheckCircle, User, Mic, Plus } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import ProgressBar from '../components/ProgressBar';
import CameraCapture from '../components/CameraCapture';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [step, setStep] = useState(1); // 1: IC, 2: Face, 3: Voice, 4: Success
  const [isScanning, setIsScanning] = useState(false);
  const [activeCamera, setActiveCamera] = useState(null); // 'ic' or 'face'
  const [icData, setIcData] = useState(null);
  const [faceMatched, setFaceMatched] = useState(false);
  const [voiceRecorded, setVoiceRecorded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedFace, setCapturedFace] = useState(null);

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

  const handleRecordVoice = () => {
    setIsRecording(true);
    setTimeout(() => {
      setVoiceRecorded(true);
      setIsRecording(false);
    }, 3000);
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
      
      {!voiceRecorded ? (
        <div className="upload-block" onClick={!isRecording ? handleRecordVoice : undefined} style={{ cursor: 'pointer' }}>
          {isRecording ? (
            <div className="scanning-animation">
              <div className="scan-line"></div>
              <p>{t('processing')}</p>
            </div>
          ) : (
            <>
              <Mic size={64} className="plus-icon" />
              <p style={{ marginTop: '20px', fontSize: '1.2rem', textAlign: 'center', padding: '0 20px' }}>
                {t('voicePrompt').replace('{name}', icData?.name || 'User')}
              </p>
              <p className="instruction-text" style={{ marginTop: '10px', color: '#666' }}>
                {t('startRecording')}
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
              borderRadius: '12px'
            }}>
              <Mic size={64} color="#2563eb" />
            </div>
            <div className="check-overlay">
              <CheckCircle size={48} color="#10b981" />
            </div>
          </div>
          
          <div className="result-details">
            <div className="result-item" style={{ textAlign: 'center' }}>
              <div className="result-value" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                {t('voiceRecorded')}
              </div>
            </div>
            <button className="primary-btn" onClick={() => setStep(4)}>
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSuccessStep = () => (
    <div className="step-container">
      <div className="verification-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <CheckCircle size={80} color="#10b981" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: '#065f46', marginBottom: '10px' }}>{t('registerSuccess')}</h2>
        
        <div className="result-details" style={{ marginTop: '30px', textAlign: 'left' }}>
          <div className="result-item">
            <span className="result-label">{t('fullName')}</span>
            <span className="result-value">{icData?.name}</span>
          </div>
          <div className="result-item">
            <span className="result-label">{t('icNumber')}</span>
            <span className="result-value">{icData?.icNumber}</span>
          </div>
        </div>

        <button 
          className="primary-btn" 
          onClick={() => {
            // Save user to localStorage for Login Page demo
            if (icData) {
              localStorage.setItem('registeredUser', JSON.stringify(icData));
            }
            navigate('/login');
          }} 
          style={{ marginTop: '30px' }}
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

      <ProgressBar currentStep={step} totalSteps={4} onStepClick={handleStepClick} />

      <main className="page-content">
        {step === 1 && renderICStep()}
        {step === 2 && renderFaceStep()}
        {step === 3 && renderVoiceStep()}
        {step === 4 && renderSuccessStep()}
      </main>
    </div>
  );
};

export default RegisterPage;