import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft, CheckCircle, User, Mic, Plus } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import ProgressBar from '../components/ProgressBar';
import CameraCapture from '../components/CameraCapture';

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
    const finalName = extractedName.trim() || "Detected Name (Edit Required)";
    const finalIC = extractedIC || "Detected IC (Edit Required)";

    setIcData({
      name: finalName,
      icNumber: finalIC,
      photoUrl: imageSrc // We save the original color photo for display
    });

    setIsScanning(false);

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