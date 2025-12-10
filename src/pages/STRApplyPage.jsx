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
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voicePrompt, setVoicePrompt] = useState('');
  const [currentVoiceField, setCurrentVoiceField] = useState(null);
  
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

  // API integration
  const { submitApplication, submitting } = useSTRApplication(currentLanguage);
  const [applicationResult, setApplicationResult] = useState(null);

  // Voice prompts in different languages
  const voicePrompts = {
    en: {
      welcome: "Welcome to STR Application. I can help you fill in the form. Do you want me to fill in your details automatically?",
      filledFromDB: "I have filled in your details from your profile. Your name is {name} and IC is {ic}. Is this correct?",
      filledFamily: "I also found your family information. {familyInfo}. Is this correct?",
      askIncome: "What is your monthly income in Ringgit?",
      askMaritalStatus: "What is your marital status? Single, married, divorced, or widowed?",
      confirmed: "Confirmed. Moving to next step.",
      cancelled: "Okay, you can edit manually.",
      allFilled: "I have pre-filled all your information from the database. Please review and submit."
    },
    ms: {
      welcome: "Selamat datang ke Permohonan STR. Saya boleh bantu anda mengisi borang. Adakah anda mahu saya isikan maklumat anda secara automatik?",
      filledFromDB: "Saya telah isikan maklumat anda dari profil. Nama anda ialah {name} dan IC ialah {ic}. Adakah ini betul?",
      filledFamily: "Saya juga jumpa maklumat keluarga anda. {familyInfo}. Adakah ini betul?",
      askIncome: "Berapakah pendapatan bulanan anda dalam Ringgit?",
      askMaritalStatus: "Apakah status perkahwinan anda? Bujang, berkahwin, bercerai, atau balu?",
      confirmed: "Difahami. Ke langkah seterusnya.",
      cancelled: "Baiklah, anda boleh edit secara manual.",
      allFilled: "Saya telah isikan semua maklumat anda dari pangkalan data. Sila semak dan hantar."
    }
  };

  const getLangCode = () => currentLanguage === 'en' ? 'en' : 'ms';
  const getPrompts = () => voicePrompts[getLangCode()] || voicePrompts['ms'];

  // Fetch user data from MongoDB on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedUser = localStorage.getItem('registeredUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          // Validate IC number - must be a proper format (not "Detected IC" or empty)
          const icNumber = user.icNumber;
          if (!icNumber || icNumber === 'Detected IC' || icNumber.length < 6) {
            console.warn('Invalid IC number in localStorage:', icNumber);
            setLoading(false);
            return;
          }
          
          const response = await authAPI.getUserByIC(icNumber);
          if (response.success) {
            const data = response.data;
            setUserData(data);
            
            // Pre-fill form data from MongoDB including family fields
            setFormData(prev => ({
              ...prev,
              applicant: {
                ...prev.applicant,
                name: data.name || '',
                ic_number: icNumber || '',
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
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Text-to-speech function
  const speak = (text, lang = 'ms') => {
    if (synthRef.current.speaking) synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ms' ? 'ms-MY' : 'en-US';
    utterance.rate = 0.9;
    synthRef.current.speak(utterance);
    setVoicePrompt(text);
  };

  // Start voice assistance
  const startVoiceAssistance = () => {
    const prompts = getPrompts();
    const lang = getLangCode();
    
    // Build a comprehensive message about pre-filled data
    if (userData) {
      let message = prompts.filledFromDB
        .replace('{name}', userData.name || '')
        .replace('{ic}', userData.ic || '');
      
      // Add family info if available
      if (userData.marital_status === 'married' && userData.spouse?.name) {
        const spouseInfo = lang === 'ms' 
          ? `Pasangan anda: ${userData.spouse.name}` 
          : `Your spouse: ${userData.spouse.name}`;
        message += ' ' + spouseInfo + '.';
      }
      
      if (userData.children?.length > 0) {
        const childCount = userData.children.length;
        const childInfo = lang === 'ms'
          ? `Anda mempunyai ${childCount} anak`
          : `You have ${childCount} children`;
        message += ' ' + childInfo + '.';
      }
      
      message += ' ' + prompts.allFilled;
      
      speak(message, lang);
    } else {
      speak(prompts.welcome, lang);
    }
    
    setVoiceMode(true);
    setCurrentVoiceField('welcome');
  };

  // Handle form field changes
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
    const newChildren = Array(numCount).fill(null).map(() => ({ ic_number: '', name: '' }));
    setFormData(prev => ({ ...prev, children: newChildren }));
  };

  // Voice recording for form fields
  const [pendingValue, setPendingValue] = useState(null);
  const [pendingField, setPendingField] = useState(null);
  const [confirmationMode, setConfirmationMode] = useState(false);

  const startVoiceInput = async (fieldName, section, field) => {
    setIsListening(true);
    setCurrentVoiceField(fieldName);
    audioChunksRef.current = [];
    
    const lang = getLangCode();
    const askPrompt = lang === 'ms' 
      ? `Sila sebut ${fieldName} anda.`
      : `Please say your ${fieldName}.`;
    speak(askPrompt, lang);

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
        const formDataToSend = new FormData();
        formDataToSend.append('audio', audioBlob, 'recording.webm');

        try {
          const response = await fetch('http://localhost:8000/voice/transcribe', {
            method: 'POST',
            body: formDataToSend,
          });
          const result = await response.json();
          
          if (result.success && result.transcription) {
            const transcribed = result.transcription.trim();
            setPendingValue(transcribed);
            setPendingField({ section, field, fieldName });
            setConfirmationMode(true);
            
            const confirmPrompt = lang === 'ms'
              ? `Saya dengar "${transcribed}". Adakah betul? Sebut "Ya" atau "Tidak".`
              : `I heard "${transcribed}". Is this correct? Say "Yes" or "No".`;
            speak(confirmPrompt, lang);
          } else {
            const errorPrompt = lang === 'ms' ? 'Maaf, saya tidak faham. Cuba lagi.' : 'Sorry, I didn\'t understand. Please try again.';
            speak(errorPrompt, lang);
          }
        } catch (err) {
          console.error('Transcription error:', err);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, 5000);

    } catch (err) {
      console.error('Microphone error:', err);
      setIsListening(false);
    }
  };

  const confirmVoiceInput = async (confirmed) => {
    if (confirmed && pendingField && pendingValue) {
      handleInputChange(pendingField.section, pendingField.field, pendingValue);
      const lang = getLangCode();
      const successPrompt = lang === 'ms' ? 'Difahami. Maklumat telah diisi.' : 'Confirmed. Information has been filled.';
      speak(successPrompt, lang);
    }
    setPendingValue(null);
    setPendingField(null);
    setConfirmationMode(false);
  };

  // Voice input button component
  const VoiceMicButton = ({ fieldName, section, field }) => (
    <button
      type="button"
      onClick={() => startVoiceInput(fieldName, section, field)}
      disabled={isListening || isProcessing}
      style={{
        padding: '8px',
        backgroundColor: isListening ? '#ef4444' : 'var(--primary-color)',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        cursor: isListening || isProcessing ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '40px',
        height: '40px'
      }}
      title={getLangCode() === 'ms' ? 'Guna suara' : 'Use voice'}
    >
      {isProcessing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Mic size={18} />}
    </button>
  );

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
        {getLangCode() === 'ms' ? 'Bantuan Suara' : 'Voice Assistance'}
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
        onClick={startVoiceAssistance}
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
          : 'Click the button for voice assistance, or fill manually'}
      </p>

      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={startVoiceAssistance}
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
          {getLangCode() === 'ms' ? 'Guna Bantuan Suara' : 'Use Voice Assistance'}
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
          {getLangCode() === 'ms' ? 'Isi Secara Manual' : 'Fill Manually'}
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
            ✓ {getLangCode() === 'ms' ? 'Data Dari Profil Anda' : 'Data From Your Profile'}
          </h4>
          <p><strong>{getLangCode() === 'ms' ? 'Nama' : 'Name'}:</strong> {userData.name}</p>
          <p><strong>IC:</strong> {userData.ic}</p>
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
      case 0: // Voice Assistance Prompt
        return renderVoicePrompt();
        
      case 1: // Applicant Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
              {getLangCode() === 'ms' ? 'Langkah 1: Maklumat Pemohon' : 'Step 1: Applicant Information'}
            </h3>
            
            {/* Voice confirmation popup */}
            {confirmationMode && (
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#fef3c7', 
                borderRadius: '10px', 
                marginBottom: '20px',
                border: '2px solid #f59e0b'
              }}>
                <p style={{ marginBottom: '10px', fontWeight: '600' }}>
                  {getLangCode() === 'ms' ? 'Pengesahan' : 'Confirmation'}
                </p>
                <p style={{ marginBottom: '15px' }}>
                  {getLangCode() === 'ms' 
                    ? `"${pendingValue}" - Adakah betul?` 
                    : `"${pendingValue}" - Is this correct?`}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => confirmVoiceInput(true)}
                    style={{ padding: '8px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    {getLangCode() === 'ms' ? 'Ya' : 'Yes'}
                  </button>
                  <button 
                    onClick={() => confirmVoiceInput(false)}
                    style={{ padding: '8px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    {getLangCode() === 'ms' ? 'Tidak' : 'No'}
                  </button>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Nama Penuh' : 'Full Name'}
                  value={formData.applicant.name}
                  onChange={(e) => handleInputChange('applicant', 'name', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', flex: 1 }}
                />
                <VoiceMicButton fieldName={getLangCode() === 'ms' ? 'nama' : 'name'} section="applicant" field="name" />
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Nombor IC (cth: 900101-01-1234)' : 'IC Number (e.g., 900101-01-1234)'}
                  value={formData.applicant.ic_number}
                  onChange={(e) => handleInputChange('applicant', 'ic_number', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', flex: 1 }}
                />
                <VoiceMicButton fieldName={getLangCode() === 'ms' ? 'nombor IC' : 'IC number'} section="applicant" field="ic_number" />
              </div>
              <select
                value={formData.applicant.marital_status}
                onChange={(e) => handleInputChange('applicant', 'marital_status', e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              >
                <option value="single">{getLangCode() === 'ms' ? 'Bujang' : 'Single'}</option>
                <option value="married">{getLangCode() === 'ms' ? 'Berkahwin' : 'Married'}</option>
                <option value="divorced">{getLangCode() === 'ms' ? 'Bercerai' : 'Divorced'}</option>
                <option value="widowed">{getLangCode() === 'ms' ? 'Balu/Duda' : 'Widowed'}</option>
              </select>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder={getLangCode() === 'ms' ? 'Pendapatan Bulanan (RM)' : 'Monthly Income (RM)'}
                  value={formData.applicant.monthly_income}
                  onChange={(e) => handleInputChange('applicant', 'monthly_income', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', flex: 1 }}
                />
                <VoiceMicButton fieldName={getLangCode() === 'ms' ? 'pendapatan bulanan' : 'monthly income'} section="applicant" field="monthly_income" />
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
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={getLangCode() === 'ms' ? 'Nama Penuh Pasangan' : 'Spouse Full Name'}
                    value={formData.spouse.name}
                    onChange={(e) => handleInputChange('spouse', 'name', e.target.value)}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', flex: 1 }}
                  />
                  <VoiceMicButton fieldName={getLangCode() === 'ms' ? 'nama pasangan' : 'spouse name'} section="spouse" field="name" />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={getLangCode() === 'ms' ? 'Nombor IC Pasangan' : 'Spouse IC Number'}
                    value={formData.spouse.ic_number}
                    onChange={(e) => handleInputChange('spouse', 'ic_number', e.target.value)}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', flex: 1 }}
                  />
                  <VoiceMicButton fieldName={getLangCode() === 'ms' ? 'nombor IC pasangan' : 'spouse IC number'} section="spouse" field="ic_number" />
                </div>
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
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Step 3: Children Information</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', color: '#374151' }}>Number of Children (max 5):</label>
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
                <h4 style={{ marginBottom: '10px', color: '#6b7280' }}>Child {index + 1}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Child Name"
                    value={child.name}
                    onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                  <input
                    type="text"
                    placeholder="Child IC Number"
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
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Step 4: Required Documents</h3>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>Please confirm you have these documents ready:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.documents.ic_copy}
                  onChange={(e) => handleInputChange('documents', 'ic_copy', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>IC Copy (MyKad)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.documents.income_proof}
                  onChange={(e) => handleInputChange('documents', 'income_proof', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>Proof of Income (Payslip/EPF Statement)</span>
              </label>
              {formData.applicant.marital_status === 'married' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.documents.marriage_cert}
                    onChange={(e) => handleInputChange('documents', 'marriage_cert', e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span>Marriage Certificate</span>
                </label>
              )}
            </div>
          </div>
        );

      case 5: // Guardian Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
              {getLangCode() === 'ms' ? 'Langkah 5: Hubungan Kecemasan' : 'Step 5: Emergency Contact'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Nama Waris/Hubungan Kecemasan' : 'Guardian/Emergency Contact Name'}
                  value={formData.guardian.name}
                  onChange={(e) => handleInputChange('guardian', 'name', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', flex: 1 }}
                />
                <VoiceMicButton fieldName={getLangCode() === 'ms' ? 'nama waris' : 'guardian name'} section="guardian" field="name" />
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={getLangCode() === 'ms' ? 'Hubungan (cth: Ibu Bapa, Adik-beradik)' : 'Relationship (e.g., Parent, Sibling)'}
                  value={formData.guardian.relationship}
                  onChange={(e) => handleInputChange('guardian', 'relationship', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', flex: 1 }}
                />
                <VoiceMicButton fieldName={getLangCode() === 'ms' ? 'hubungan' : 'relationship'} section="guardian" field="relationship" />
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="tel"
                  placeholder={getLangCode() === 'ms' ? 'Nombor Telefon' : 'Phone Number'}
                  value={formData.guardian.phone}
                  onChange={(e) => handleInputChange('guardian', 'phone', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', flex: 1 }}
                />
                <VoiceMicButton fieldName={getLangCode() === 'ms' ? 'nombor telefon' : 'phone number'} section="guardian" field="phone" />
              </div>
            </div>
          </div>
        );

      case 6: // Review and Confirm
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Step 6: Review & Confirm</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px', color: '#374151' }}>Applicant</h4>
                <p>Name: {formData.applicant.name}</p>
                <p>IC: {formData.applicant.ic_number}</p>
                <p>Status: {formData.applicant.marital_status}</p>
                <p>Income: RM {formData.applicant.monthly_income}</p>
              </div>
              {formData.applicant.marital_status === 'married' && (
                <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#374151' }}>Spouse</h4>
                  <p>Name: {formData.spouse.name}</p>
                  <p>IC: {formData.spouse.ic_number}</p>
                </div>
              )}
              {formData.children.length > 0 && (
                <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#374151' }}>Children ({formData.children.length})</h4>
                  {formData.children.map((child, i) => (
                    <p key={i}>{i + 1}. {child.name} - {child.ic_number}</p>
                  ))}
                </div>
              )}
              {applicationResult && (
                <div style={{ padding: '20px', backgroundColor: '#d1fae5', borderRadius: '8px', border: '2px solid #10b981' }}>
                  <h4 style={{ marginBottom: '10px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Check size={24} /> Application Submitted Successfully!
                  </h4>
                  <p>Reference Number: {applicationResult.reference_number}</p>
                  <p>Status: {applicationResult.status}</p>
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px' }}>
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
            <ChevronLeft size={20} /> Back to STR
          </button>
          <h1 style={{ fontSize: '2rem', color: '#1f2937', marginBottom: '10px' }}>STR Application</h1>
          <p style={{ color: '#6b7280' }}>Complete all 6 steps to submit your application</p>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Step {currentStep} of 6</span>
            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.3s' }}></div>
          </div>
        </div>

        {/* Form Content */}
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
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
            <ChevronLeft size={20} /> Previous
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
              Next <ChevronRight size={20} />
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
              <Check size={20} /> {submitting ? 'Submitting...' : applicationResult ? 'Submitted' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default STRApplyPage;
