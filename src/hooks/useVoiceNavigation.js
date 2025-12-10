import { useState, useRef } from 'react';

/**
 * Custom hook for advanced voice navigation using backend Python AI
 * Integrates with voice_navigation_local.py via API
 */
export const useVoiceNavigation = (userIcNumber, onNavigate) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const synthRef = useRef(window.speechSynthesis);

  const API_URL = 'http://localhost:8000'; // Using main backend

  // Start recording audio
  const startListening = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      // Request microphone access with specific settings for voice
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Try to use wav format if supported, fallback to webm
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')) {
        mimeType = 'audio/webm;codecs=pcm';
      }
      
      console.log('🎙️ Using MIME type:', mimeType);
      
      // Create MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      // Collect audio chunks
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('📦 Audio chunk received, size:', event.data.size);
        }
      };

      // When recording stops, send to backend
      mediaRecorderRef.current.onstop = async () => {
        const totalSize = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
        console.log('🔊 Total audio size:', totalSize, 'bytes');
        
        if (totalSize < 1000) {
          console.warn('⚠️ Audio too small, likely empty recording');
          setError('Recording too short. Please hold the button and speak.');
          return;
        }
        
        await processAudio();
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording - request data every 100ms for smoother chunks
      mediaRecorderRef.current.start(100);
      setIsListening(true);
      console.log('🎙️ Recording started...');

    } catch (err) {
      console.error('Microphone error:', err);
      setError('Could not access microphone: ' + err.message);
    }
  };

  // Stop recording
  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      console.log('🛑 Recording stopped');
    }
  };

  // Process recorded audio via backend API
  const processAudio = async () => {
    try {
      setIsProcessing(true);

      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert webm to wav for backend processing
      const wavBlob = await convertToWav(audioBlob);

      // Send to backend API
      const formData = new FormData();
      formData.append('audio', wavBlob, 'audio.wav');
      formData.append('user_ic', userIcNumber || '900101012345');

      console.log('📤 Sending audio to backend...');
      const response = await fetch(`${API_URL}/voice/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Backend response:', result);

      // Update state
      setTranscript(result.transcript || '');
      setAiResponse(result.reply || '');
      setSessionState(result.session_state || null);

      // Speak response
      if (result.reply) {
        speak(result.reply, result.lang || 'BM');
      }

      // Handle navigation - actually navigate after TTS finishes
      if (result.navigate_to) {
        console.log(`🧭 Navigating to: ${result.navigate_to}`);
        // Wait for TTS to finish, then navigate
        const checkAndNavigate = () => {
          if (!synthRef.current.speaking) {
            console.log(`🚀 Executing navigation to: ${result.navigate_to}`);
            if (onNavigate) {
              onNavigate(result.navigate_to);
            }
          } else {
            setTimeout(checkAndNavigate, 200);
          }
        };
        setTimeout(checkAndNavigate, 500);
      }

      // Continue conversation if needed
      if (result.continue_conversation) {
        console.log('🔄 Conversation continues...');
        // Auto-restart listening after AI finishes speaking
        setTimeout(() => {
          if (!synthRef.current.speaking) {
            startListening();
          }
        }, 1000);
      }

      return result;

    } catch (err) {
      console.error('❌ Processing error:', err);
      setError('Failed to process audio: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert audio blob to WAV format
  const convertToWav = async (blob) => {
    // For simplicity, we'll use the browser's AudioContext
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Convert to WAV
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  // Convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer) => {
    const numChannels = 1; // Mono
    const sampleRate = 16000; // Match backend SAMPLE_RATE
    const format = 1; // PCM
    const bitDepth = 16;

    // Resample to 16kHz if needed using linear interpolation
    let audioData;
    const originalData = buffer.getChannelData(0);
    
    if (buffer.sampleRate !== sampleRate) {
      const ratio = buffer.sampleRate / sampleRate;
      const newLength = Math.round(buffer.length / ratio);
      const result = new Float32Array(newLength);
      
      for (let i = 0; i < newLength; i++) {
        // Linear interpolation for better quality
        const srcIndex = i * ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, originalData.length - 1);
        const fraction = srcIndex - srcIndexFloor;
        
        result[i] = originalData[srcIndexFloor] * (1 - fraction) + originalData[srcIndexCeil] * fraction;
      }
      audioData = result;
      console.log(`🔄 Resampled from ${buffer.sampleRate}Hz to ${sampleRate}Hz (${originalData.length} -> ${result.length} samples)`);
    } else {
      audioData = originalData;
    }
    
    // Debug: Check audio levels
    let maxVal = 0;
    for (let i = 0; i < audioData.length; i++) {
      maxVal = Math.max(maxVal, Math.abs(audioData[i]));
    }
    console.log(`🔊 Audio max level: ${maxVal.toFixed(4)}, duration: ${(audioData.length / sampleRate).toFixed(2)}s`);

    const dataLength = audioData.length * (bitDepth / 8);
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const volume = 0.8;
    let offset = 44;
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return arrayBuffer;
  };

  // Text-to-speech
  const speak = (text, langCode = 'BM') => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map language codes to speech synthesis voices
    // HK = Cantonese (zh-HK), BC = Mandarin Chinese (zh-CN)
    const langMap = {
      'BM': 'ms-MY',
      'BC': 'zh-CN',
      'BI': 'en-US',
      'HK': 'zh-HK',  // Cantonese
      'ms': 'ms-MY',
      'zh': 'zh-CN',
      'en': 'en-US',
      'yue': 'zh-HK'  // Alternative Cantonese code
    };
    
    utterance.lang = langMap[langCode] || 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    // Try to find a specific voice for Cantonese if available
    if (langCode === 'HK' || langCode === 'yue') {
      const voices = synthRef.current.getVoices();
      const cantoneseVoice = voices.find(v => 
        v.lang === 'zh-HK' || 
        v.lang.includes('yue') || 
        v.name.toLowerCase().includes('cantonese') ||
        v.name.toLowerCase().includes('hong kong')
      );
      if (cantoneseVoice) {
        utterance.voice = cantoneseVoice;
        console.log('🗣️ Using Cantonese voice:', cantoneseVoice.name);
      }
    }

    synthRef.current.speak(utterance);
  };

  // Reset conversation
  const resetConversation = async () => {
    try {
      await fetch(`${API_URL}/voice/reset`, { method: 'POST' });
      setTranscript('');
      setAiResponse('');
      setSessionState(null);
      setError(null);
      console.log('🔄 Conversation reset');
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  return {
    isListening,
    isProcessing,
    transcript,
    aiResponse,
    error,
    sessionState,
    startListening,
    stopListening,
    resetConversation,
  };
};
