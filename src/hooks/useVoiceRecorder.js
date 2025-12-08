/**
 * Custom React Hook for Voice Recording
 * Uses MediaRecorder API to capture audio and send to FastAPI backend
 */

import { useState, useRef, useCallback } from 'react';

// Configuration
const API_BASE_URL = 'http://localhost:8000';
const RECORD_DURATION = 5000; // 5 seconds in milliseconds

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after duration
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, RECORD_DURATION);

    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Could not access microphone. Please allow microphone permissions.');
    }
  }, []);

  /**
   * Stop recording and return audio blob
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  /**
   * Record audio for a set duration and return WAV blob
   * This is a complete recording cycle that handles start, wait, stop, and convert
   */
  const recordAndGetWav = useCallback(() => {
    return new Promise(async (resolve, reject) => {
      try {
        setError(null);
        audioChunksRef.current = [];

        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          } 
        });

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);

          if (audioChunksRef.current.length === 0) {
            reject(new Error('No audio data captured'));
            return;
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          try {
            const wavBlob = await convertToWav(audioBlob);
            resolve(wavBlob);
          } catch (err) {
            reject(new Error('Failed to convert audio: ' + err.message));
          }
        };

        mediaRecorder.onerror = (event) => {
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          reject(new Error('Recording error: ' + event.error));
        };

        // Start recording
        mediaRecorder.start();
        setIsRecording(true);

        // Auto-stop after duration
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, RECORD_DURATION);

      } catch (err) {
        setIsRecording(false);
        reject(new Error('Microphone access denied: ' + err.message));
      }
    });
  }, []);

  /**
   * Start voice registration (first recording)
   * @param {string} userId - User's IC number or unique ID
   * @returns {Promise<{success: boolean, message: string, step: string}>}
   */
  const startVoiceRegistration = useCallback(async (userId) => {
    setError(null);
    setIsProcessing(true);

    try {
      const wavBlob = await recordAndGetWav();

      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('audio', wavBlob, 'voice_registration_1.wav');

      const response = await fetch(`${API_BASE_URL}/voice/register/start`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setIsProcessing(false);

      if (response.ok) {
        return { 
          success: true, 
          message: result.message,
          step: 'awaiting_confirmation'
        };
      } else {
        throw new Error(result.detail || 'Registration start failed');
      }

    } catch (err) {
      console.error('Voice registration start error:', err);
      setError(err.message);
      setIsProcessing(false);
      return { success: false, message: err.message, step: 'failed' };
    }
  }, [recordAndGetWav]);

  /**
   * Confirm voice registration (second recording)
   * @param {string} userId - User's IC number or unique ID
   * @returns {Promise<{success: boolean, confirmed: boolean, similarity: number, message: string}>}
   */
  const confirmVoiceRegistration = useCallback(async (userId) => {
    setError(null);
    setIsProcessing(true);

    try {
      const wavBlob = await recordAndGetWav();

      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('audio', wavBlob, 'voice_registration_2.wav');

      const response = await fetch(`${API_BASE_URL}/voice/register/confirm`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setIsProcessing(false);

      if (response.ok) {
        return { 
          success: true, 
          confirmed: result.confirmed,
          similarity: result.similarity_score,
          message: result.message
        };
      } else {
        throw new Error(result.detail || 'Registration confirmation failed');
      }

    } catch (err) {
      console.error('Voice registration confirm error:', err);
      setError(err.message);
      setIsProcessing(false);
      return { success: false, confirmed: false, message: err.message };
    }
  }, [recordAndGetWav]);

  /**
   * Cancel pending registration
   * @param {string} userId - User's IC number or unique ID
   */
  const cancelRegistration = useCallback(async (userId) => {
    try {
      await fetch(`${API_BASE_URL}/voice/register/cancel/${userId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Cancel registration error:', err);
    }
  }, []);

  /**
   * Register voice with the backend (legacy - single step)
   * @param {string} userId - User's IC number or unique ID
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const registerVoice = useCallback(async (userId) => {
    setError(null);
    setIsProcessing(true);

    try {
      const wavBlob = await recordAndGetWav();

      // Create form data
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('audio', wavBlob, 'voice_registration.wav');

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/voice/register`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setIsProcessing(false);
        return { success: true, message: 'Voice registered successfully!' };
      } else {
        throw new Error(result.detail || 'Registration failed');
      }

    } catch (err) {
      console.error('Voice registration error:', err);
      setError(err.message);
      setIsProcessing(false);
      return { success: false, message: err.message };
    }
  }, [recordAndGetWav]);

  /**
   * Verify voice with the backend (login)
   * @param {string} userId - User's IC number or unique ID
   * @returns {Promise<{success: boolean, authenticated: boolean, similarity: number, message: string}>}
   */
  const verifyVoice = useCallback(async (userId) => {
    setError(null);
    setIsProcessing(true);

    try {
      const wavBlob = await recordAndGetWav();

      // Create form data
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('audio', wavBlob, 'voice_verification.wav');

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/voice/login`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      setIsProcessing(false);

      if (response.ok) {
        return {
          success: true,
          authenticated: result.authenticated,
          similarity: result.similarity_score,
          threshold: result.threshold,
          message: result.message
        };
      } else {
        throw new Error(result.detail || 'Verification failed');
      }

    } catch (err) {
      console.error('Voice verification error:', err);
      setError(err.message);
      setIsProcessing(false);
      return { success: false, authenticated: false, message: err.message };
    }
  }, [recordAndGetWav]);

  /**
   * Check if backend server is running
   */
  const checkServer = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        return { online: true, modelLoaded: data.model_loaded };
      }
      return { online: false, modelLoaded: false };
    } catch {
      return { online: false, modelLoaded: false };
    }
  }, []);

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    registerVoice,
    startVoiceRegistration,
    confirmVoiceRegistration,
    cancelRegistration,
    verifyVoice,
    checkServer,
  };
};

/**
 * Convert WebM audio blob to WAV format
 * This is necessary because the backend expects WAV files
 */
async function convertToWav(webmBlob) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Decode the webm audio
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Convert to 16kHz mono WAV
  const targetSampleRate = 16000;
  const numChannels = 1;
  const length = audioBuffer.length * (targetSampleRate / audioBuffer.sampleRate);
  
  // Create offline context for resampling
  const offlineContext = new OfflineAudioContext(numChannels, length, targetSampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  
  const resampledBuffer = await offlineContext.startRendering();
  
  // Encode to WAV
  const wavBuffer = encodeWAV(resampledBuffer);
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Encode AudioBuffer to WAV format
 */
function encodeWAV(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const samples = audioBuffer.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  // Write samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export default useVoiceRecorder;
