import React, { useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera } from 'lucide-react';

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user" // Default to front camera (selfie) for face scan
};

const CameraCapture = ({ onCapture, label = "Capture", mode = "user" }) => {
  const webcamRef = useRef(null);

  const constraints = {
    ...videoConstraints,
    facingMode: mode // 'user' (front) or 'environment' (back)
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    onCapture(imageSrc);
  }, [webcamRef, onCapture]);

  return (
    <div className="camera-container" style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '20px', overflow: 'hidden' }}>
      <Webcam
        audio={false}
        height="100%"
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width="100%"
        videoConstraints={constraints}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <button 
        onClick={(e) => {
          e.stopPropagation(); // Prevent bubbling if inside a clickable div
          capture();
        }}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          border: '4px solid var(--primary-color)',
          borderRadius: '50%',
          width: '70px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <Camera size={32} color="var(--primary-color)" />
      </button>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '0',
        width: '100%',
        textAlign: 'center',
        color: 'white',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        zIndex: 10
      }}>
        {label}
      </div>
    </div>
  );
};

export default CameraCapture;
