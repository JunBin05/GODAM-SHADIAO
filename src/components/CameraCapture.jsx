import React, { useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera } from 'lucide-react';

const videoConstraints = {
  // Request native HD or Full HD
  width: { min: 1280, ideal: 1920, max: 3840 },
  height: { min: 720, ideal: 1080, max: 2160 },
  facingMode: "user" 
};

const CameraCapture = ({ onCapture, label = "Capture", mode = "user" }) => {
  const webcamRef = useRef(null);

  const constraints = {
    ...videoConstraints,
    facingMode: mode // 'user' (front) or 'environment' (back)
  };

  const capture = useCallback(() => {
    // 1. Get the video element reference
    const video = webcamRef.current?.video;
    
    if (video) {
      // 2. Create a temporary canvas
      const canvas = document.createElement('canvas');
      
      // 3. Set canvas dimensions to the TRUE video source resolution
      // (This ignores the CSS scaling on your phone screen)
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // 4. Draw the full-resolution frame
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 5. Convert to High Quality JPEG
      const imageSrc = canvas.toDataURL('image/jpeg', 1.0);
      
    onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  return (
    <div className="camera-container" style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '20px', overflow: 'hidden' }}>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        screenshotQuality={1} // Request max quality
        videoConstraints={constraints}
        // IMPORTANT: Do not pass width/height props here, only use style.
        // Passing props like width="100%" can force the internal resolution down.
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <button 
        onClick={(e) => {
          e.stopPropagation(); 
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