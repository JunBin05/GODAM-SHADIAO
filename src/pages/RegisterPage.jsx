import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft, CheckCircle, User, Mic, Plus, AlertCircle, Globe } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import ProgressBar from '../components/ProgressBar';
import CameraCapture from '../components/CameraCapture';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';


const API_BASE_URL = 'http://localhost:8000/api';


const processImage = (imageSource) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageSource;

    img.onload = () => {
      try {
        // --- 1. SETUP CANVAS & CROP ---
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Python: img = img[0:height, 0:int(width/2)]
        const w = Math.floor(img.width / 2);
        const h = img.height;
        canvas.width = w;
        canvas.height = h;

        // Draw only the left half
        ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);

        // Get raw pixel data
        let imageData = ctx.getImageData(0, 0, w, h);
        let data = imageData.data; // Flat array [r,g,b,a, r,g,b,a...]

        // --- 2. GRAYSCALE & OTSU THRESHOLD ---
        // Python: cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        const grayData = new Float32Array(w * h);
        const histogram = new Array(256).fill(0);

        // Convert to Grayscale and build Histogram
        for (let i = 0; i < w * h; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          grayData[i] = gray;
          histogram[Math.floor(gray)]++;
        }

        // Calculate Otsu's Threshold
        let total = w * h;
        let sum = 0;
        for (let i = 0; i < 256; i++) sum += i * histogram[i];

        let sumB = 0, wB = 0, wF = 0;
        let maxVar = 0, threshold = 0;

        for (let i = 0; i < 256; i++) {
          wB += histogram[i];
          if (wB === 0) continue;
          wF = total - wB;
          if (wF === 0) break;

          sumB += i * histogram[i];
          const mB = sumB / wB;
          const mF = (sum - sumB) / wF;
          const varBetween = wB * wF * (mB - mF) * (mB - mF);

          if (varBetween > maxVar) {
            maxVar = varBetween;
            threshold = i;
          }
        }

        // Apply Threshold to create binary map (0 or 255)
        let pixels = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
          pixels[i] = grayData[i] > threshold ? 255 : 0;
        }

        // --- 3. DILATE (2x2 Kernel) ---
        // Python: cv2.dilate(thresh, kernel, iterations=1)
        // 2x2 Kernel means checking (x, y), (x+1, y), (x, y+1), (x+1, y+1)
        // Dilate = Max value in window (if any neighbor is 255, becomes 255)

        let dilated = new Uint8Array(w * h);
        for (let y = 0; y < h - 1; y++) {
          for (let x = 0; x < w - 1; x++) {
            const i = y * w + x;
            if (pixels[i] === 255 || pixels[i + 1] === 255 ||
              pixels[i + w] === 255 || pixels[i + w + 1] === 255) {
              dilated[i] = 255;
            } else {
              dilated[i] = 0;
            }
          }
        }

        // --- 4. ERODE (2x2 Kernel) ---
        // Python: cv2.erode(thresh, kernel, iterations=1)
        // Erode = Min value in window (if all neighbors are 255, stays 255, else 0)

        let eroded = new Uint8Array(w * h);
        for (let y = 0; y < h - 1; y++) {
          for (let x = 0; x < w - 1; x++) {
            const i = y * w + x;
            if (dilated[i] === 255 && dilated[i + 1] === 255 &&
              dilated[i + w] === 255 && dilated[i + w + 1] === 255) {
              eroded[i] = 255;
            } else {
              eroded[i] = 0;
            }
          }
        }

        // --- 5. WRITE BACK TO CANVAS ---
        for (let i = 0; i < w * h; i++) {
          const val = eroded[i];
          data[i * 4] = val;     // R
          data[i * 4 + 1] = val; // G
          data[i * 4 + 2] = val; // B
          // Alpha channel remains as is (usually 255)
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));

      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
  });
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    isRecording,
    isProcessing,
    error: voiceError,
    recordAndGetWav,
    voiceRegistration,
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

  // Language preference state
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [isSavingToFirebase, setIsSavingToFirebase] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Check if voice server is online
  useEffect(() => {
    const checkVoiceServer = async () => {
      const status = await checkServer();
      setServerOnline(status);
    };
    checkVoiceServer();
  }, [checkServer]);

  // Real OCR Extraction
  const processICImage = async (imageSrc) => {
    setActiveCamera(null);
    setIsScanning(true);

    // console.log(imageSrc);  


    const container = document.querySelector('.camera-container');
    let containerSize = { width: 0, height: 0 };
    if (container) {
      const rect = container.getBoundingClientRect();
      containerSize = { width: rect.width, height: rect.height };
    }


    // Crop the image to match the container aspect ratio with height of 480
    const croppedImageSrc = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = imageSrc;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const targetHeight = 480;
          const containerAspectRatio = containerSize.width / containerSize.height;
          const targetWidth = targetHeight * containerAspectRatio;

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Calculate source dimensions to maintain aspect ratio
          const imgAspectRatio = img.width / img.height;
          let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;

          if (imgAspectRatio > containerAspectRatio) {
            // Image is wider, crop horizontally
            srcWidth = img.height * containerAspectRatio;
            srcX = (img.width - srcWidth) / 2;
          } else {
            // Image is taller, crop vertically
            srcHeight = img.width / containerAspectRatio;
            srcY = (img.height - srcHeight) / 2;
          }

          ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(err);
    });

    imageSrc = croppedImageSrc;


    // try {
    // 1. Pre-process the image (Crop -> Threshold -> Erode)
    const processedImageBlob = await processImage(imageSrc);

    // show processed image for debugging
    // console.log(processedImageBlob);
    // show it as an image




    // 2. Run Tesseract
    // We use PSM 3 (Auto) generally, or PSM 4/6 if layout is very consistent

    const worker = await Tesseract.createWorker('eng');


    await worker.setParameters({
      tessedit_char_whitelist: '0123456789-',
      tessedit_pageseg_mode: Tesseract.PSM.PSM_SINGLE_BLOCK_VERT_TEXT
    });
    const { data } = await worker.recognize(processedImageBlob);
    await worker.terminate();



    // --- LOGIC 1: Extract IC Number (Regex) ---
    // Pattern: 6 digits - 2 digits - 4 digits
    const icRegex = /\b\d{6}-\d{2}-\d{4}\b/;
    const icMatch = data.text.match(icRegex);
    const extractedIC = icMatch ? icMatch[0] : null;

    console.log("Extracted IC:", extractedIC);

    // --- LOGIC 2: Extract Name (Spatial Analysis) ---
    // We want the "highest" line (smallest Y) that is in the "bottom half" of the cropped image.

    // We need the height of the processed image to determine "bottom half"
    // Since we just processed it, we can reload it quickly or pass dimensions. 
    // For simplicity here, we assume standard aspect ratio or check bbox maxes.

    // Let's estimate image height from the words found to avoid reloading

    // console.log(processedImageBlob);

    const worker2 = await Tesseract.createWorker('eng', Tesseract.OEM.OEM_LSTM_ONLY);


    await worker2.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    });


    const { data: data2 } = await worker2.recognize(processedImageBlob, {}, { blocks: true, paragraphs: true, lines: true, words: true });
    await worker2.terminate();


    const midPointY = 240;
    let targetLineY = 999999;
    let foundLine = false;

    // Find the target Y coordinate (Top-most line in bottom half)
    data2.blocks.forEach(block => {
      const { y0 } = block.bbox;
      const confidence = block.confidence;

      // Condition: High confidence AND in bottom half
      if (confidence > 60 && y0 > midPointY) {
        // We look for the smallest Y (highest visual position) in this region
        if (y0 < targetLineY) {
          targetLineY = y0;
          foundLine = true;
        }
      }
    });

    // Collect text on that line
    let extractedName = "";
    if (foundLine) {
      data2.blocks.forEach(block => {
        const { y0 } = block.bbox;
        const confidence = block.confidence;

        // Tolerance of +/- 10 pixels for being on the "same line"
        if (confidence > 60 && y0 >= targetLineY - 10 && y0 <= targetLineY + 10) {
          extractedName += block.text + " ";
        }
      });
    }

    // Fallback if OCR fails
    const finalName = extractedName.trim() || "(Rescan Required)";
    const finalIC = extractedIC || "(Rescan Required)";

    setIcData({
      name: finalName,
      icNumber: finalIC,
      photoUrl: imageSrc // We save the original color photo for display
    });
    // } catch (error) {
    //   console.error("OCR Error:", error);
    //   alert("Failed to read IC. Please try again.");
    // } finally {
    //   setIsScanning(false);
    // }
    setIsScanning(false);
  };

  const processFaceImage = (imageSrc) => {
    setActiveCamera(null);
    setIsScanning(true);
    setCapturedFace(imageSrc);

    // Mock Face Matching (Real implementation would use face-api.js)
    // setTimeout(() => {
    //   setFaceMatched(true);
    //   setIsScanning(false);
    // }, 2000);

    // Send face image to API for processing
    fetch(`${API_BASE_URL}/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nric: icData?.icNumber,
        name: icData?.name,
        ic_image_url: icData?.photoUrl,
        face_image_url: imageSrc
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          setFaceMatched(true);
        } else if (data.user_exists) {
          alert(data.message || 'Face verification failed. Please try again.');
        } else {
          alert('Face does not match IC photo. Please try again.');
        }
        setIsScanning(false);
      })
      .catch(error => {
        console.error('Face matching error:', error);
        alert('Failed to verify face. Please try again.');
        setIsScanning(false);
      });

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

    // Use IC number as user_id for voice registration
    const userId = icData.icNumber.replace(/-/g, ''); // Remove dashes from IC

    if (voiceRegStep === 'idle') {
      // First recording
      const audioBlob = await recordAndGetWav();
      if (!audioBlob) {
        setVoiceRegistrationError('Recording failed. Please try again.');
        return;
      }

      if (audioBlob) {
        setVoiceRegStep('first_recorded');
        // write audioBlob to session storage for confirmation step
        sessionStorage.setItem('voice_first_recording', URL.createObjectURL(audioBlob));
      } else {
        setVoiceRegistrationError('Recording failed. Please try again.');
      }
    } else if (voiceRegStep === 'first_recorded') {
      // Confirmation recording
      const audioBlob2 = await recordAndGetWav();
      // Retrieve first recording from session storage
      const firstRecordingUrl = sessionStorage.getItem('voice_first_recording');

      if (!audioBlob2 || !firstRecordingUrl) {
        setVoiceRegistrationError('Recording failed. Please try again.');
        return;
      }

      const firstRecordingResponse = await fetch(firstRecordingUrl);
      const firstRecordingBlob = await firstRecordingResponse.blob();
      const result = await voiceRegistration(userId, firstRecordingBlob, audioBlob2);
      
      console.log('Voice registration result:', result);

      if (result.success) {
        if (result.matched) {
          setVoiceRegStep('confirmed');
          setVoiceRecorded(true);
        } else {
          // Voice didn't match, reset to try again
          setVoiceRegStep('idle');
          setVoiceRegistrationError(`Voice recordings don't match. Please try again.`);
        }
      } else {
        setVoiceRegStep('idle');
        setVoiceRegistrationError(result.message);
      }
    }
  };

  // Reset voice registration
  const handleResetVoice = async () => {
    setVoiceRegStep('idle');
    setVoiceRecorded(false);
    setVoiceRegistrationError(null);
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
      const response = await fetch(`${API_BASE_URL}/user/set_language`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: icData.icNumber,
          language: selectedLanguage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to save data');
      }

      console.log('✓ Registration data saved:', result);
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