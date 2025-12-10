import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSTRApplication } from '../hooks/useAPI';
import { ChevronLeft, ChevronRight, Check, Mic, Volume2, Loader2 } from 'lucide-react';
import { authAPI } from '../services/api';

function STRApplyPage() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0); // Step 0 = voice assistance prompt
  const [childrenCount, setChildrenCount] = useState(0);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Voice-guided form filling state
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voicePrompt, setVoicePrompt] = useState('');
  const [currentFieldIndex, setCurrentFieldIndex] = useState(-1);
  const [pendingValue, setPendingValue] = useState(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const synthRef = useRef(window.speechSynthesis);
  
  const [formData, setFormData] = useState({
    applicant: {
      name: '',
      ic_number: '',
      marital_status: 'single',
      monthly_income: ''
    },
    spouse: {
      name: '',
      ic_number: ''
    },
    children: [],
    documents: {
      ic_copy: false,
      income_proof: false,
      marriage_cert: false
    },
    guardian: {
      name: '',
      relationship: '',
      phone: ''
    }
  });

  // Define the voice form fields in order
  const formFields = [
    { key: 'applicant.name', label: { en: 'full name', ms: 'nama penuh', zh: '全名', hk: '全名' }, section: 'applicant', field: 'name' },
    { key: 'applicant.ic_number', label: { en: 'IC number', ms: 'nombor IC', zh: 'IC号码', hk: 'IC號碼' }, section: 'applicant', field: 'ic_number' },
    { key: 'applicant.marital_status', label: { en: 'marital status (single, married, divorced, or widowed)', ms: 'status perkahwinan (bujang, berkahwin, bercerai, atau balu)', zh: '婚姻状况', hk: '婚姻狀況' }, section: 'applicant', field: 'marital_status', type: 'select' },
    { key: 'applicant.monthly_income', label: { en: 'monthly income in Ringgit', ms: 'pendapatan bulanan dalam Ringgit', zh: '月收入', hk: '月收入' }, section: 'applicant', field: 'monthly_income' },
    { key: 'guardian.name', label: { en: 'emergency contact name', ms: 'nama hubungan kecemasan', zh: '紧急联系人姓名', hk: '緊急聯絡人姓名' }, section: 'guardian', field: 'name' },
    { key: 'guardian.relationship', label: { en: 'relationship with emergency contact', ms: 'hubungan dengan kenalan kecemasan', zh: '与紧急联系人的关系', hk: '與緊急聯絡人嘅關係' }, section: 'guardian', field: 'relationship' },
    { key: 'guardian.phone', label: { en: 'emergency contact phone number', ms: 'nombor telefon hubungan kecemasan', zh: '紧急联系人电话', hk: '緊急聯絡人電話' }, section: 'guardian', field: 'phone' },
  ];

  // API integration
  const { submitApplication, submitting } = useSTRApplication(currentLanguage);
  const [applicationResult, setApplicationResult] = useState(null);

  const getLangCode = () => {
    if (currentLanguage === 'en') return 'en';
    if (currentLanguage === 'zh') return 'zh';
    if (currentLanguage === 'hk' || currentLanguage === 'HK') return 'hk';
    return 'ms';
  };

  // Get user's preferred language from stored user or database
  const getUserLanguage = () => {
    try {
      const storedUser = localStorage.getItem('registeredUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const lang = user.language || user.preferred_language || 'ms';
        if (lang === 'HK' || lang === 'hk') return 'hk';
        if (lang === 'BC' || lang === 'zh') return 'zh';
        if (lang === 'BI' || lang === 'en') return 'en';
        return 'ms';
      }
    } catch (e) {}
    return getLangCode();
  };

  // Fetch user data from MongoDB on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedUser = localStorage.getItem('registeredUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          const icNumber = user.icNumber;
          
          // Accept any IC that's stored (including "Detected IC")
          if (!icNumber) {
            console.warn('No IC number in localStorage');
            setLoading(false);
            return;
          }
          
          console.log('📋 Fetching user data for IC:', icNumber);
          
          const response = await authAPI.getUserByIC(icNumber);
          console.log('📋 API Response:', response);
          
          if (response.success && response.data) {
            const data = response.data;
            setUserData(data);
            
            // Pre-fill form data from MongoDB including family fields
            setFormData(prev => ({
              ...prev,
              applicant: {
                ...prev.applicant,
                name: data.name || '',
                ic_number: data.ic || icNumber || '',  // Use IC from database or localStorage
                monthly_income: data.monthly_income?.toString() || '',
                marital_status: data.marital_status || 'single'
              },
              spouse: {
                name: data.spouse?.name || '',
                ic_number: data.spouse?.ic_number || ''
              },
              children: data.children?.length > 0 
                ? data.children.map(child => ({
                    name: child.name || '',
                    ic_number: child.ic_number || ''
                  }))
                : [],
              guardian: {
                name: data.guardian?.name || '',
                relationship: data.guardian?.relationship || '',
                phone: data.guardian?.phone || ''
              }
            }));
            
            // Set children count if there are children
            if (data.children?.length > 0) {
              setChildrenCount(data.children.length);
            }
          } else {
            // If API fails, still pre-fill IC from localStorage
            setFormData(prev => ({
              ...prev,
              applicant: {
                ...prev.applicant,
                ic_number: icNumber
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Still try to get IC from localStorage on error
        try {
          const storedUser = localStorage.getItem('registeredUser');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            setFormData(prev => ({
              ...prev,
              applicant: {
                ...prev.applicant,
                ic_number: user.icNumber || ''
              }
            }));
          }
        } catch (e) {}
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Text-to-speech function with language detection
  const speak = (text, lang = null) => {
    if (synthRef.current.speaking) synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const langCode = lang || getUserLanguage();
    
    // Map to TTS language codes
    if (langCode === 'hk') {
      utterance.lang = 'zh-HK';  // Cantonese
    } else if (langCode === 'zh') {
      utterance.lang = 'zh-CN';  // Mandarin
    } else if (langCode === 'en') {
      utterance.lang = 'en-US';
    } else {
      utterance.lang = 'ms-MY';  // Malay
    }
    
    utterance.rate = 0.9;
    synthRef.current.speak(utterance);
    setVoicePrompt(text);
  };

  // Voice prompts in different languages
  const getVoicePrompts = (langCode) => {
    const prompts = {
      en: {
        welcome: "I'll help you fill the form. Press the microphone button when you're ready to answer each question.",
        askField: "Please say your {field}.",
        confirm: 'I heard "{value}". Is this correct? Press the microphone and say Yes or No.',
        confirmed: "Got it! Moving to the next field.",
        retry: "Okay, let's try again.",
        allDone: "All fields have been filled. Please review the form.",
        alreadyFilled: "This field is already filled with: {value}. Do you want to change it?"
      },
      ms: {
        welcome: "Saya akan bantu anda mengisi borang. Tekan butang mikrofon apabila anda sedia untuk menjawab setiap soalan.",
        askField: "Sila sebut {field} anda.",
        confirm: 'Saya dengar "{value}". Adakah betul? Tekan mikrofon dan sebut Ya atau Tidak.',
        confirmed: "Difahami! Ke medan seterusnya.",
        retry: "Baiklah, mari cuba lagi.",
        allDone: "Semua medan telah diisi. Sila semak borang.",
        alreadyFilled: "Medan ini sudah diisi dengan: {value}. Adakah anda mahu tukar?"
      },
      zh: {
        welcome: "我会帮你填写表格。准备好回答每个问题时，请按麦克风按钮。",
        askField: "请说出你的{field}。",
        confirm: '我听到"{value}"。这是正确的吗？按麦克风说是或否。',
        confirmed: "明白了！转到下一个字段。",
        retry: "好的，让我们再试一次。",
        allDone: "所有字段已填写。请检查表格。",
        alreadyFilled: "此字段已填写：{value}。你要更改吗？"
      },
      hk: {
        welcome: "我會幫你填寫表格。準備好回答每個問題時，請撳麥克風按鈕。",
        askField: "請講出你嘅{field}。",
        confirm: '我聽到"{value}"。啱唔啱？撳麥克風講係或者唔係。',
        confirmed: "明白咗！去下一個欄位。",
        retry: "好嘅，我哋再試過。",
        allDone: "所有欄位已經填好。請檢查表格。",
        alreadyFilled: "呢個欄位已經填咗：{value}。你想改嗎？"
      }
    };
    return prompts[langCode] || prompts['ms'];
  };

  // Get field value from formData
  const getFieldValue = (fieldConfig) => {
    return formData[fieldConfig.section]?.[fieldConfig.field] || '';
  };

  // Set field value in formData
  const setFieldValue = (fieldConfig, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldConfig.section]: {
        ...prev[fieldConfig.section],
        [fieldConfig.field]: value
      }
    }));
  };

  // Start voice-guided form filling
  const startVoiceGuidedFilling = () => {
    setVoiceMode(true);
    setCurrentFieldIndex(0);
    setCurrentStep(1); // Move to first form step
    
    const langCode = getUserLanguage();
    const prompts = getVoicePrompts(langCode);
    
    speak(prompts.welcome, langCode);
    
    // After welcome, ask the first field
    setTimeout(() => {
      askCurrentField(0);
    }, 3000);
  };

  // Ask the current field, skipping already-filled fields
  const askCurrentField = (fieldIdx) => {
    let idx = fieldIdx;
    while (idx < formFields.length && getFieldValue(formFields[idx])) {
      idx++;
    }
    if (idx >= formFields.length) {
      // All fields done
      const langCode = getUserLanguage();
      const prompts = getVoicePrompts(langCode);
      speak(prompts.allDone, langCode);
      setCurrentFieldIndex(-1);
      setVoiceMode(false);
      return;
    }

    const field = formFields[idx];
    const langCode = getUserLanguage();
    const prompts = getVoicePrompts(langCode);
    const fieldLabel = field.label[langCode] || field.label['en'];

    const prompt = prompts.askField.replace('{field}', fieldLabel);
    speak(prompt, langCode);
    setCurrentFieldIndex(idx);
  };

  // Handle mic button press (single button for all fields)
  const handleMicPress = async () => {
    if (isListening || isProcessing) return;
    
    setIsListening(true);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } 
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
        setIsProcessing(true);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Convert webm to wav for backend compatibility
        const convertToWav = async (blob) => {
          const arrayBuffer = await blob.arrayBuffer();
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          // Mono, 16kHz, PCM
          const numChannels = 1;
          const sampleRate = 16000;
          const bitDepth = 16;
          let audioData = audioBuffer.getChannelData(0);
          // Resample if needed
          if (audioBuffer.sampleRate !== sampleRate) {
            const ratio = audioBuffer.sampleRate / sampleRate;
            const newLength = Math.round(audioBuffer.length / ratio);
            const result = new Float32Array(newLength);
            for (let i = 0; i < newLength; i++) {
              const srcIndex = i * ratio;
              const srcIndexFloor = Math.floor(srcIndex);
              const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
              const fraction = srcIndex - srcIndexFloor;
              result[i] = audioData[srcIndexFloor] * (1 - fraction) + audioData[srcIndexCeil] * fraction;
            }
            audioData = result;
          }
          const dataLength = audioData.length * (bitDepth / 8);
          const headerLength = 44;
          const totalLength = headerLength + dataLength;
          const buffer = new ArrayBuffer(totalLength);
          const view = new DataView(buffer);
          const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
          };
          writeString(0, 'RIFF');
          view.setUint32(4, totalLength - 8, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, numChannels, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
          view.setUint16(32, numChannels * (bitDepth / 8), true);
          view.setUint16(34, bitDepth, true);
          writeString(36, 'data');
          view.setUint32(40, dataLength, true);
          let offset = 44;
          for (let i = 0; i < audioData.length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
          }
          return new Blob([buffer], { type: 'audio/wav' });
        };

        let wavBlob;
        try {
          wavBlob = await convertToWav(audioBlob);
        } catch (err) {
          console.error('WAV conversion error:', err);
          wavBlob = audioBlob; // fallback to webm if conversion fails
        }

        const formDataToSend = new FormData();
        formDataToSend.append('audio', wavBlob, 'recording.wav');
        formDataToSend.append('language', getUserLanguage());

        try {
          const response = await fetch('http://localhost:8000/voice/transcribe', {
            method: 'POST',
            body: formDataToSend,
          });
          const result = await response.json();
          
          if (result.success && result.transcription) {
            const transcribed = result.transcription.trim();
            handleVoiceResponse(transcribed);
          } else {
            const langCode = getUserLanguage();
            const errorPrompt = langCode === 'ms' ? 'Maaf, saya tidak faham. Cuba lagi.' 
              : langCode === 'hk' ? '對唔住，我聽唔明。請再試。'
              : langCode === 'zh' ? '抱歉，我没听懂。请再试。'
              : 'Sorry, I didn\'t understand. Please try again.';
            speak(errorPrompt, langCode);
          }
        } catch (err) {
          console.error('Transcription error:', err);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      
      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, 5000);

    } catch (err) {
      console.error('Microphone error:', err);
      setIsListening(false);
    }
  };

  // Handle the transcribed voice response
  const handleVoiceResponse = (transcribed) => {
    const langCode = getUserLanguage();
    const prompts = getVoicePrompts(langCode);
    
    if (awaitingConfirmation) {
      // User is confirming or denying
      const lowerText = transcribed.toLowerCase();
      const isYes = lowerText.includes('ya') || lowerText.includes('yes') || lowerText.includes('是') || 
                    lowerText.includes('係') || lowerText.includes('betul') || lowerText.includes('correct');
      const isNo = lowerText.includes('tidak') || lowerText.includes('no') || lowerText.includes('否') || 
                   lowerText.includes('唔係') || lowerText.includes('salah') || lowerText.includes('wrong');
      
      if (isYes && pendingValue) {
        // Confirm and save the value
        const field = formFields[currentFieldIndex];
        
        // Handle marital status specially
        if (field.type === 'select') {
          const statusMap = {
            'single': ['single', 'bujang', '单身', '單身'],
            'married': ['married', 'berkahwin', '已婚', '已婚'],
            'divorced': ['divorced', 'bercerai', '离婚', '離婚'],
            'widowed': ['widowed', 'balu', 'duda', '丧偶', '喪偶']
          };
          let normalizedValue = 'single';
          for (const [status, keywords] of Object.entries(statusMap)) {
            if (keywords.some(k => pendingValue.toLowerCase().includes(k))) {
              normalizedValue = status;
              break;
            }
          }
          setFieldValue(field, normalizedValue);
        } else {
          setFieldValue(field, pendingValue);
        }
        
        speak(prompts.confirmed, langCode);
        setAwaitingConfirmation(false);
        setPendingValue(null);
        
        // Move to next field
        setTimeout(() => {
          askCurrentField(currentFieldIndex + 1);
        }, 1500);
      } else if (isNo) {
        // Retry
        speak(prompts.retry, langCode);
        setAwaitingConfirmation(false);
        setPendingValue(null);
        
        setTimeout(() => {
          askCurrentField(currentFieldIndex);
        }, 1500);
      }
    } else {
      // User provided a value, ask for confirmation
      setPendingValue(transcribed);
      setAwaitingConfirmation(true);
      
      const confirmPrompt = prompts.confirm.replace('{value}', transcribed);
      speak(confirmPrompt, langCode);
    }
  };

  // Handle form field changes (manual)
  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleChildChange = (index, field, value) => {
    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setFormData(prev => ({ ...prev, children: newChildren }));
  };

  const handleChildrenCountChange = (count) => {
    const numCount = parseInt(count) || 0;
    setChildrenCount(numCount);
    const newChildren = Array(numCount).fill(null).map((_, i) => 
      formData.children[i] || { ic_number: '', name: '' }
    );
    setFormData(prev => ({ ...prev, children: newChildren }));
  };

  // Navigate between steps
  const nextStep = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const result = await submitApplication(formData);
      setApplicationResult(result);
    } catch (err) {
      console.error('Submission error:', err);
    }
  };

  // Render voice assistance prompt (Step 0)
  const renderVoicePrompt = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <h2 style={{ marginBottom: '30px', color: 'var(--primary-color)' }}>
        {getLangCode() === 'ms' ? 'Bantuan Suara' : getLangCode() === 'hk' ? '語音輔助' : getLangCode() === 'zh' ? '语音辅助' : 'Voice Assistance'}
      </h2>
      
      <div style={{ 
        width: '120px', 
        height: '120px', 
        borderRadius: '50%', 
        backgroundColor: voiceMode ? '#10b981' : 'var(--primary-color)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        margin: '0 auto 30px',
        cursor: 'pointer',
        transition: 'all 0.3s'
      }}
        onClick={startVoiceGuidedFilling}
      >
        <Mic size={48} color="white" />
      </div>

      {voicePrompt && (
        <div style={{ 
          backgroundColor: '#f0f9ff', 
          padding: '20px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          maxWidth: '500px',
          margin: '0 auto 20px'
        }}>
          <p style={{ color: '#0369a1', fontStyle: 'italic' }}>"{voicePrompt}"</p>
        </div>
      )}

      <p style={{ color: '#6b7280', marginBottom: '30px' }}>
        {getLangCode() === 'ms' 
          ? 'Tekan butang untuk mula bantuan suara, atau isi secara manual' 
          : getLangCode() === 'hk'
          ? '撳按鈕開始語音輔助，或者手動填寫'
          : getLangCode() === 'zh'
          ? '点击按钮开始语音辅助，或手动填写'
          : 'Click the button for voice assistance, or fill manually'}
      </p>

      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={startVoiceGuidedFilling}
          style={{
            padding: '15px 30px',
            backgroundColor: 'var(--primary-color)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Mic size={20} />
          {getLangCode() === 'ms' ? 'Guna Bantuan Suara' : getLangCode() === 'hk' ? '使用語音輔助' : getLangCode() === 'zh' ? '使用语音辅助' : 'Use Voice Assistance'}
        </button>
        
        <button
          onClick={() => setCurrentStep(1)}
          style={{
            padding: '15px 30px',
            backgroundColor: 'white',
            border: '2px solid var(--primary-color)',
            borderRadius: '10px',
            color: 'var(--primary-color)',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {getLangCode() === 'ms' ? 'Isi Secara Manual' : getLangCode() === 'hk' ? '手動填寫' : getLangCode() === 'zh' ? '手动填写' : 'Fill Manually'}
        </button>
      </div>

      {/* Show pre-filled data from MongoDB */}
      {userData && (
        <div style={{ 
          marginTop: '40px', 
          padding: '20px', 
          backgroundColor: '#f0fdf4', 
          borderRadius: '10px',
          border: '1px solid #86efac'
        }}>
          <h4 style={{ color: '#166534', marginBottom: '15px' }}>
            ✓ {getLangCode() === 'ms' ? 'Data Dari Profil Anda' : getLangCode() === 'hk' ? '你嘅個人資料' : getLangCode() === 'zh' ? '您的个人资料' : 'Data From Your Profile'}
          </h4>
          <p><strong>{getLangCode() === 'ms' ? 'Nama' : 'Name'}:</strong> {userData.name || '-'}</p>
          <p><strong>IC:</strong> {userData.ic || formData.applicant.ic_number || '-'}</p>
          {userData.monthly_income && (
            <p><strong>{getLangCode() === 'ms' ? 'Pendapatan' : 'Income'}:</strong> RM {userData.monthly_income}</p>
          )}
          {userData.state && (
            <p><strong>{getLangCode() === 'ms' ? 'Negeri' : 'State'}:</strong> {userData.state}</p>
          )}
        </div>
      )}
    </div>
  );

  // Render form content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderVoicePrompt();
        
      case 1: // Applicant Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
              {getLangCode() === 'ms' ? 'Langkah 1: Maklumat Pemohon' : getLangCode() === 'hk' ? '步驟 1：申請人資料' : getLangCode() === 'zh' ? '步骤 1：申请人信息' : 'Step 1: Applicant Information'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#374151', fontWeight: '500' }}>
                  {getLangCode() === 'ms' ? 'Nama Penuh' : 'Full Name'} {currentFieldIndex === 0 && voiceMode && <span style={{ color: '#10b981' }}>← 🎤</span>}
                </label>
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Nama Penuh' : 'Full Name'}
                  value={formData.applicant.name}
                  onChange={(e) => handleInputChange('applicant', 'name', e.target.value)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: currentFieldIndex === 0 && voiceMode ? '2px solid #10b981' : '1px solid #ddd', 
                    fontSize: '1rem', 
                    width: '100%',
                    backgroundColor: currentFieldIndex === 0 && voiceMode ? '#f0fdf4' : 'white'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#374151', fontWeight: '500' }}>
                  {getLangCode() === 'ms' ? 'Nombor IC' : 'IC Number'} {currentFieldIndex === 1 && voiceMode && <span style={{ color: '#10b981' }}>← 🎤</span>}
                </label>
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Nombor IC (cth: 900101-01-1234)' : 'IC Number (e.g., 900101-01-1234)'}
                  value={formData.applicant.ic_number}
                  onChange={(e) => handleInputChange('applicant', 'ic_number', e.target.value)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: currentFieldIndex === 1 && voiceMode ? '2px solid #10b981' : '1px solid #ddd', 
                    fontSize: '1rem', 
                    width: '100%',
                    backgroundColor: currentFieldIndex === 1 && voiceMode ? '#f0fdf4' : 'white'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#374151', fontWeight: '500' }}>
                  {getLangCode() === 'ms' ? 'Status Perkahwinan' : 'Marital Status'} {currentFieldIndex === 2 && voiceMode && <span style={{ color: '#10b981' }}>← 🎤</span>}
                </label>
                <select
                  value={formData.applicant.marital_status}
                  onChange={(e) => handleInputChange('applicant', 'marital_status', e.target.value)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: currentFieldIndex === 2 && voiceMode ? '2px solid #10b981' : '1px solid #ddd', 
                    fontSize: '1rem', 
                    width: '100%',
                    backgroundColor: currentFieldIndex === 2 && voiceMode ? '#f0fdf4' : 'white'
                  }}
                >
                  <option value="single">{getLangCode() === 'ms' ? 'Bujang' : 'Single'}</option>
                  <option value="married">{getLangCode() === 'ms' ? 'Berkahwin' : 'Married'}</option>
                  <option value="divorced">{getLangCode() === 'ms' ? 'Bercerai' : 'Divorced'}</option>
                  <option value="widowed">{getLangCode() === 'ms' ? 'Balu/Duda' : 'Widowed'}</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#374151', fontWeight: '500' }}>
                  {getLangCode() === 'ms' ? 'Pendapatan Bulanan (RM)' : 'Monthly Income (RM)'} {currentFieldIndex === 3 && voiceMode && <span style={{ color: '#10b981' }}>← 🎤</span>}
                </label>
                <input
                  type="number"
                  placeholder={getLangCode() === 'ms' ? 'Pendapatan Bulanan (RM)' : 'Monthly Income (RM)'}
                  value={formData.applicant.monthly_income}
                  onChange={(e) => handleInputChange('applicant', 'monthly_income', e.target.value)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: currentFieldIndex === 3 && voiceMode ? '2px solid #10b981' : '1px solid #ddd', 
                    fontSize: '1rem', 
                    width: '100%',
                    backgroundColor: currentFieldIndex === 3 && voiceMode ? '#f0fdf4' : 'white'
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 2: // Spouse Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
              {getLangCode() === 'ms' ? 'Langkah 2: Maklumat Pasangan' : 'Step 2: Spouse Information'}
            </h3>
            {formData.applicant.marital_status === 'married' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Nama Penuh Pasangan' : 'Spouse Full Name'}
                  value={formData.spouse.name}
                  onChange={(e) => handleInputChange('spouse', 'name', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
                />
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Nombor IC Pasangan' : 'Spouse IC Number'}
                  value={formData.spouse.ic_number}
                  onChange={(e) => handleInputChange('spouse', 'ic_number', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
                />
              </div>
            ) : (
              <p style={{ color: '#6b7280' }}>
                {getLangCode() === 'ms' 
                  ? `Maklumat pasangan tidak diperlukan untuk status ${formData.applicant.marital_status}` 
                  : `No spouse information required for ${formData.applicant.marital_status} status`}
              </p>
            )}
          </div>
        );

      case 3: // Children Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
              {getLangCode() === 'ms' ? 'Langkah 3: Maklumat Anak' : 'Step 3: Children Information'}
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', color: '#374151' }}>
                {getLangCode() === 'ms' ? 'Bilangan Anak (maksimum 5)' : 'Number of Children (max 5)'}:
              </label>
              <input
                type="number"
                min="0"
                max="5"
                value={childrenCount}
                onChange={(e) => handleChildrenCountChange(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
              />
            </div>
            {formData.children.map((child, index) => (
              <div key={index} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px', color: '#6b7280' }}>
                  {getLangCode() === 'ms' ? `Anak ${index + 1}` : `Child ${index + 1}`}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder={getLangCode() === 'ms' ? 'Nama Anak' : 'Child Name'}
                    value={child.name}
                    onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                  <input
                    type="text"
                    placeholder={getLangCode() === 'ms' ? 'Nombor IC Anak' : 'Child IC Number'}
                    value={child.ic_number}
                    onChange={(e) => handleChildChange(index, 'ic_number', e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 4: // Required Documents
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
              {getLangCode() === 'ms' ? 'Langkah 4: Dokumen Diperlukan' : 'Step 4: Required Documents'}
            </h3>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>
              {getLangCode() === 'ms' ? 'Sila sahkan anda mempunyai dokumen ini:' : 'Please confirm you have these documents ready:'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.documents.ic_copy}
                  onChange={(e) => handleInputChange('documents', 'ic_copy', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>{getLangCode() === 'ms' ? 'Salinan IC (MyKad)' : 'IC Copy (MyKad)'}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.documents.income_proof}
                  onChange={(e) => handleInputChange('documents', 'income_proof', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>{getLangCode() === 'ms' ? 'Bukti Pendapatan (Slip Gaji/Penyata EPF)' : 'Proof of Income (Payslip/EPF Statement)'}</span>
              </label>
              {formData.applicant.marital_status === 'married' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.documents.marriage_cert}
                    onChange={(e) => handleInputChange('documents', 'marriage_cert', e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span>{getLangCode() === 'ms' ? 'Sijil Nikah' : 'Marriage Certificate'}</span>
                </label>
              )}
            </div>
          </div>
        );

      case 5: // Guardian Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
              {getLangCode() === 'ms' ? 'Langkah 5: Hubungan Kecemasan' : getLangCode() === 'hk' ? '步驟 5：緊急聯絡人' : 'Step 5: Emergency Contact'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#374151', fontWeight: '500' }}>
                  {getLangCode() === 'ms' ? 'Nama Waris' : 'Emergency Contact Name'} {currentFieldIndex === 4 && voiceMode && <span style={{ color: '#10b981' }}>← 🎤</span>}
                </label>
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Nama Waris/Hubungan Kecemasan' : 'Guardian/Emergency Contact Name'}
                  value={formData.guardian.name}
                  onChange={(e) => handleInputChange('guardian', 'name', e.target.value)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: currentFieldIndex === 4 && voiceMode ? '2px solid #10b981' : '1px solid #ddd', 
                    fontSize: '1rem', 
                    width: '100%',
                    backgroundColor: currentFieldIndex === 4 && voiceMode ? '#f0fdf4' : 'white'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#374151', fontWeight: '500' }}>
                  {getLangCode() === 'ms' ? 'Hubungan' : 'Relationship'} {currentFieldIndex === 5 && voiceMode && <span style={{ color: '#10b981' }}>← 🎤</span>}
                </label>
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Hubungan (cth: Ibu Bapa, Adik-beradik)' : 'Relationship (e.g., Parent, Sibling)'}
                  value={formData.guardian.relationship}
                  onChange={(e) => handleInputChange('guardian', 'relationship', e.target.value)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: currentFieldIndex === 5 && voiceMode ? '2px solid #10b981' : '1px solid #ddd', 
                    fontSize: '1rem', 
                    width: '100%',
                    backgroundColor: currentFieldIndex === 5 && voiceMode ? '#f0fdf4' : 'white'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#374151', fontWeight: '500' }}>
                  {getLangCode() === 'ms' ? 'Nombor Telefon' : 'Phone Number'} {currentFieldIndex === 6 && voiceMode && <span style={{ color: '#10b981' }}>← 🎤</span>}
                </label>
                <input
                  type="tel"
                  placeholder={getLangCode() === 'ms' ? 'Nombor Telefon' : 'Phone Number'}
                  value={formData.guardian.phone}
                  onChange={(e) => handleInputChange('guardian', 'phone', e.target.value)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: currentFieldIndex === 6 && voiceMode ? '2px solid #10b981' : '1px solid #ddd', 
                    fontSize: '1rem', 
                    width: '100%',
                    backgroundColor: currentFieldIndex === 6 && voiceMode ? '#f0fdf4' : 'white'
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 6: // Review and Confirm
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
              {getLangCode() === 'ms' ? 'Langkah 6: Semak & Sahkan' : 'Step 6: Review & Confirm'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px', color: '#374151' }}>
                  {getLangCode() === 'ms' ? 'Pemohon' : 'Applicant'}
                </h4>
                <p><strong>{getLangCode() === 'ms' ? 'Nama' : 'Name'}:</strong> {formData.applicant.name}</p>
                <p><strong>IC:</strong> {formData.applicant.ic_number}</p>
                <p><strong>{getLangCode() === 'ms' ? 'Status' : 'Status'}:</strong> {formData.applicant.marital_status}</p>
                <p><strong>{getLangCode() === 'ms' ? 'Pendapatan' : 'Income'}:</strong> RM {formData.applicant.monthly_income}</p>
              </div>
              {formData.applicant.marital_status === 'married' && formData.spouse.name && (
                <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#374151' }}>
                    {getLangCode() === 'ms' ? 'Pasangan' : 'Spouse'}
                  </h4>
                  <p><strong>{getLangCode() === 'ms' ? 'Nama' : 'Name'}:</strong> {formData.spouse.name}</p>
                  <p><strong>IC:</strong> {formData.spouse.ic_number}</p>
                </div>
              )}
              {formData.children.length > 0 && (
                <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#374151' }}>
                    {getLangCode() === 'ms' ? `Anak (${formData.children.length})` : `Children (${formData.children.length})`}
                  </h4>
                  {formData.children.map((child, i) => (
                    <p key={i}>{i + 1}. {child.name} - {child.ic_number}</p>
                  ))}
                </div>
              )}
              {formData.guardian.name && (
                <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#374151' }}>
                    {getLangCode() === 'ms' ? 'Hubungan Kecemasan' : 'Emergency Contact'}
                  </h4>
                  <p><strong>{getLangCode() === 'ms' ? 'Nama' : 'Name'}:</strong> {formData.guardian.name}</p>
                  <p><strong>{getLangCode() === 'ms' ? 'Hubungan' : 'Relationship'}:</strong> {formData.guardian.relationship}</p>
                  <p><strong>{getLangCode() === 'ms' ? 'Telefon' : 'Phone'}:</strong> {formData.guardian.phone}</p>
                </div>
              )}
              {applicationResult && (
                <div style={{ padding: '20px', backgroundColor: '#d1fae5', borderRadius: '8px', border: '2px solid #10b981' }}>
                  <h4 style={{ marginBottom: '10px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Check size={24} /> {getLangCode() === 'ms' ? 'Permohonan Berjaya Dihantar!' : 'Application Submitted Successfully!'}
                  </h4>
                  <p>{getLangCode() === 'ms' ? 'Nombor Rujukan' : 'Reference Number'}: {applicationResult.reference_number}</p>
                  <p>{getLangCode() === 'ms' ? 'Status' : 'Status'}: {applicationResult.status}</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = currentStep === 0 ? 0 : (currentStep / 6) * 100;

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px', paddingBottom: '120px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={() => navigate('/str')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--primary-color)',
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            <ChevronLeft size={20} /> {getLangCode() === 'ms' ? 'Kembali ke STR' : 'Back to STR'}
          </button>
          <h1 style={{ fontSize: '2rem', color: '#1f2937', marginBottom: '10px' }}>
            {getLangCode() === 'ms' ? 'Permohonan STR' : 'STR Application'}
          </h1>
          <p style={{ color: '#6b7280' }}>
            {getLangCode() === 'ms' ? 'Lengkapkan semua 6 langkah untuk hantar permohonan anda' : 'Complete all 6 steps to submit your application'}
          </p>
        </div>

        {/* Progress Bar */}
        {currentStep > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                {getLangCode() === 'ms' ? `Langkah ${currentStep} dari 6` : `Step ${currentStep} of 6`}
              </span>
              <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.3s' }}></div>
            </div>
          </div>
        )}

        {/* Voice Prompt Display */}
        {voiceMode && voicePrompt && currentStep > 0 && (
          <div style={{ 
            backgroundColor: '#f0f9ff', 
            padding: '15px', 
            borderRadius: '10px', 
            marginBottom: '20px',
            border: '1px solid #bae6fd'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Volume2 size={20} color="#0369a1" />
              <p style={{ color: '#0369a1', fontStyle: 'italic', margin: 0 }}>"{voicePrompt}"</p>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {currentStep > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              style={{
                padding: '12px 24px',
                backgroundColor: currentStep === 1 ? '#e5e7eb' : 'white',
                border: '2px solid var(--primary-color)',
                borderRadius: '10px',
                color: 'var(--primary-color)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ChevronLeft size={20} /> {getLangCode() === 'ms' ? 'Sebelum' : 'Previous'}
            </button>

            {currentStep < 6 ? (
              <button
                onClick={nextStep}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'var(--primary-color)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {getLangCode() === 'ms' ? 'Seterusnya' : 'Next'} <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || applicationResult}
                style={{
                  padding: '12px 24px',
                  backgroundColor: submitting || applicationResult ? '#9ca3af' : '#10b981',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: submitting || applicationResult ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Check size={20} /> {submitting ? (getLangCode() === 'ms' ? 'Menghantar...' : 'Submitting...') : applicationResult ? (getLangCode() === 'ms' ? 'Dihantar' : 'Submitted') : (getLangCode() === 'ms' ? 'Hantar Permohonan' : 'Submit Application')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Voice Mic Button - Single button for all fields */}
      {voiceMode && currentStep > 0 && currentFieldIndex >= 0 && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000
        }}>
          <button
            onMouseDown={handleMicPress}
            onTouchStart={handleMicPress}
            onMouseUp={() => {
              if (isListening) {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                  mediaRecorderRef.current.stop();
                }
              }
            }}
            onTouchEnd={() => {
              if (isListening) {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                  mediaRecorderRef.current.stop();
                }
              }
            }}
            disabled={isProcessing}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#ef4444' : isProcessing ? '#f59e0b' : '#10b981',
              border: 'none',
              color: 'white',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              transition: 'all 0.3s'
            }}
          >
            {isProcessing ? (
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Mic size={36} />
            )}
          </button>
          <p style={{ 
            textAlign: 'center', 
            marginTop: '10px', 
            color: '#374151',
            backgroundColor: 'white',
            padding: '5px 15px',
            borderRadius: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            fontSize: '0.9rem'
          }}>
            {isListening 
              ? (getLangCode() === 'ms' ? '🔴 Mendengar...' : getLangCode() === 'hk' ? '🔴 聽緊...' : '🔴 Listening...') 
              : isProcessing 
              ? (getLangCode() === 'ms' ? '⏳ Memproses...' : getLangCode() === 'hk' ? '⏳ 處理緊...' : '⏳ Processing...')
              : awaitingConfirmation
              ? (getLangCode() === 'ms' ? '🎤 Ya / Tidak?' : getLangCode() === 'hk' ? '🎤 係 / 唔係?' : '🎤 Yes / No?')
              : (getLangCode() === 'ms' ? '🎤 Tekan untuk bercakap' : getLangCode() === 'hk' ? '🎤 撳嚟講嘢' : '🎤 Press to speak')}
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default STRApplyPage;
