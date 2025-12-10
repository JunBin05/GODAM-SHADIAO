import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSTRApplication } from '../hooks/useAPI';
import { ChevronLeft, ChevronRight, Check, Mic, Volume2, Loader2 } from 'lucide-react';
import { authAPI } from '../services/api';
import LanguageToggle from '../components/LanguageToggle';

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
  const [awaitingChangeConfirmation, setAwaitingChangeConfirmation] = useState(false);
  const [awaitingChildrenCount, setAwaitingChildrenCount] = useState(false);
  const [childrenFieldsGenerated, setChildrenFieldsGenerated] = useState(false);
  
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
  // Base form fields (children fields will be added dynamically)
  const [formFields, setFormFields] = useState([
    // Applicant fields
    { key: 'applicant.name', label: { en: 'full name', ms: 'nama penuh', zh: '全名', hk: '全名', ta: 'முழு பெயர்' }, section: 'applicant', field: 'name' },
    { key: 'applicant.ic_number', label: { en: 'IC number', ms: 'nombor IC', zh: 'IC号码', hk: 'IC號碼', ta: 'IC எண்' }, section: 'applicant', field: 'ic_number' },
    { key: 'applicant.marital_status', label: { en: 'marital status (single, married, divorced, or widowed)', ms: 'status perkahwinan (bujang, berkahwin, bercerai, atau balu)', zh: '婚姻状况', hk: '婚姻狀況', ta: 'திருமண நிலை' }, section: 'applicant', field: 'marital_status', type: 'select' },
    { key: 'applicant.monthly_income', label: { en: 'monthly income in Ringgit', ms: 'pendapatan bulanan dalam Ringgit', zh: '月收入', hk: '月收入', ta: 'மாத வருமானம்' }, section: 'applicant', field: 'monthly_income', type: 'number' },
    // Spouse fields (conditional on married status)
    { key: 'spouse.name', label: { en: 'spouse full name', ms: 'nama penuh pasangan', zh: '配偶全名', hk: '配偶全名', ta: 'துணையின் முழு பெயர்' }, section: 'spouse', field: 'name', conditional: 'married' },
    { key: 'spouse.ic_number', label: { en: 'spouse IC number', ms: 'nombor IC pasangan', zh: '配偶IC号码', hk: '配偶IC號碼', ta: 'துணையின் IC எண்' }, section: 'spouse', field: 'ic_number', conditional: 'married' },
    // CHILDREN_PLACEHOLDER - Dynamic children fields inserted here
    { key: '__children_placeholder__', type: 'placeholder' },
    // Document confirmation (boolean fields)
    { key: 'documents.ic_copy', label: { en: 'Do you have your IC copy ready?', ms: 'Adakah anda ada salinan IC?', zh: '您有IC副本吗？', hk: '你有IC副本嗎？', ta: 'உங்களிடம் IC நகல் உள்ளதா?' }, section: 'documents', field: 'ic_copy', type: 'boolean' },
    { key: 'documents.income_proof', label: { en: 'Do you have proof of income ready?', ms: 'Adakah anda ada bukti pendapatan?', zh: '您有收入证明吗？', hk: '你有收入證明嗎？', ta: 'உங்களிடம் வருமான சான்று உள்ளதா?' }, section: 'documents', field: 'income_proof', type: 'boolean' },
    { key: 'documents.marriage_cert', label: { en: 'Do you have your marriage certificate ready?', ms: 'Adakah anda ada sijil nikah?', zh: '您有结婚证吗？', hk: '你有結婚證書嗎？', ta: 'உங்களிடம் திருமண சான்றிதழ் உள்ளதா?' }, section: 'documents', field: 'marriage_cert', type: 'boolean', conditional: 'married' },
    // Guardian/Emergency contact fields
    { key: 'guardian.name', label: { en: 'emergency contact name', ms: 'nama hubungan kecemasan', zh: '紧急联系人姓名', hk: '緊急聯絡人姓名', ta: 'அவசர தொடர்பு பெயர்' }, section: 'guardian', field: 'name' },
    { key: 'guardian.relationship', label: { en: 'relationship with emergency contact', ms: 'hubungan dengan kenalan kecemasan', zh: '与紧急联系人的关系', hk: '與緊急聯絡人嘅關係', ta: 'அவசர தொடர்பு உறவு' }, section: 'guardian', field: 'relationship' },
    { key: 'guardian.phone', label: { en: 'emergency contact phone number', ms: 'nombor telefon hubungan kecemasan', zh: '紧急联系人电话', hk: '緊急聯絡人電話', ta: 'அவசர தொடர்பு தொலைபேசி' }, section: 'guardian', field: 'phone' },
  ]);

  // API integration
  const { submitApplication, submitting } = useSTRApplication(currentLanguage);
  const [applicationResult, setApplicationResult] = useState(null);

  const getLangCode = () => {
    if (currentLanguage === 'en') return 'en';
    if (currentLanguage === 'zh') return 'zh';
    if (currentLanguage === 'hk' || currentLanguage === 'HK') return 'hk';
    return 'ms';
  };

  // Get user's preferred language from context (synced with language selector)
  const getUserLanguage = () => {
    // Use current language from context (updated by LanguageToggle)
    return currentLanguage || 'ms';
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

  // Load speech synthesis voices (they load asynchronously)
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      if (voices.length > 0) {
        console.log(`🔊 Loaded ${voices.length} TTS voices`);
      }
    };
    
    // Chrome loads voices asynchronously
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }, []);

  // Text-to-speech function with language detection and voice selection
  const speak = (text, lang = null, onComplete = null) => {
    if (synthRef.current.speaking) synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const langCode = lang || getUserLanguage();
    
    // Map to TTS language codes
    let ttsLang;
    if (langCode === 'hk') {
      ttsLang = 'zh-HK';  // Cantonese
    } else if (langCode === 'zh') {
      ttsLang = 'zh-CN';  // Mandarin
    } else if (langCode === 'en') {
      ttsLang = 'en-US';
    } else if (langCode === 'ta') {
      ttsLang = 'ta-IN';  // Tamil
    } else {
      ttsLang = 'ms-MY';  // Malay
    }
    
    utterance.lang = ttsLang;
    
    // Try to find a voice that matches the language
    const voices = synthRef.current.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(ttsLang.split('-')[0])) ||
                          voices.find(v => v.lang.includes(ttsLang.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      console.log(`🔊 Using voice: ${matchingVoice.name} (${matchingVoice.lang}) for lang: ${langCode}`);
    } else {
      console.log(`⚠️ No matching voice found for ${ttsLang}, using default`);
    }
    
    utterance.rate = 0.9;
    
    // Call onComplete callback when speech finishes
    if (onComplete) {
      utterance.onend = onComplete;
    }
    
    synthRef.current.speak(utterance);
    setVoicePrompt(text);
  };

  // Voice prompts in different languages
  const getVoicePrompts = (langCode) => {
    const prompts = {
      en: {
        welcome: "I'll help you fill the form. Press and hold the microphone button when you're ready to answer each question. You can say 'skip' to skip a field.",
        askField: "Please say your {field}.",
        askFieldWithProgress: "Question {current} of {total}. Please say your {field}.",
        confirm: 'I heard "{value}". Is this correct? Press the microphone and say Yes or No.',
        confirmed: "Got it! Moving to the next field.",
        retry: "Okay, let's try again.",
        allDone: "All fields have been filled. Please review the form.",
        alreadyFilled: "This field is already filled with: {value}. Do you want to change it?"
      },
      ms: {
        welcome: "Saya akan bantu anda mengisi borang. Tekan dan tahan butang mikrofon apabila anda sedia untuk menjawab setiap soalan. Anda boleh sebut 'langkau' untuk langkau medan.",
        askField: "Sila sebut {field} anda.",
        askFieldWithProgress: "Soalan {current} daripada {total}. Sila sebut {field} anda.",
        confirm: 'Saya dengar "{value}". Adakah betul? Tekan mikrofon dan sebut Ya atau Tidak.',
        confirmed: "Difahami! Ke medan seterusnya.",
        retry: "Baiklah, mari cuba lagi.",
        allDone: "Semua medan telah diisi. Sila semak borang.",
        alreadyFilled: "Medan ini sudah diisi dengan: {value}. Adakah anda mahu tukar?"
      },
      zh: {
        welcome: "我会帮你填写表格。准备好回答每个问题时，请按住麦克风按钮。你可以说'跳过'来跳过字段。",
        askField: "请说出你的{field}。",
        askFieldWithProgress: "第{current}个问题，共{total}个。请说出你的{field}。",
        confirm: '我听到"{value}"。这是正确的吗？按麦克风说是或否。',
        confirmed: "明白了！转到下一个字段。",
        retry: "好的，让我们再试一次。",
        allDone: "所有字段已填写。请检查表格。",
        alreadyFilled: "此字段已填写：{value}。你要更改吗？"
      },
      hk: {
        welcome: "我會幫你填寫表格。準備好回答每個問題時，請撳住麥克風按鈕。你可以講'跳過'來跳過欄位。",
        askField: "請講出你嘅{field}。",
        askFieldWithProgress: "第{current}題，共{total}題。請講出你嘅{field}。",
        confirm: '我聽到"{value}"。啱唔啱？撳麥克風講係或者唔係。',
        confirmed: "明白咗！去下一個欄位。",
        retry: "好嘅，我哋再試過。",
        allDone: "所有欄位已經填好。請檢查表格。",
        alreadyFilled: "呢個欄位已經填咗：{value}。你想改嗎？"
      },
      ta: {
        welcome: "படிவத்தை நிரப்ப உங்களுக்கு உதவுவேன். ஒவ்வொரு கேள்விக்கும் பதிலளிக்க தயாராக இருக்கும்போது மைக்ரோஃபோன் பட்டனை அழுத்திப் பிடிக்கவும். 'தவிர்' என்று சொல்லி புலத்தை தவிர்க்கலாம்.",
        askField: "உங்கள் {field} சொல்லுங்கள்.",
        askFieldWithProgress: "{total} கேள்விகளில் {current}வது. உங்கள் {field} சொல்லுங்கள்.",
        confirm: '"{value}" என்று கேட்டேன். இது சரியா? மைக்ரோஃபோனை அழுத்தி ஆமா அல்லது இல்லை என்று சொல்லுங்கள்.',
        confirmed: "புரிந்தது! அடுத்த புலத்திற்கு செல்கிறேன்.",
        retry: "சரி, மீண்டும் முயற்சிக்கலாம்.",
        allDone: "அனைத்து புலங்களும் நிரப்பப்பட்டன. படிவத்தை சரிபார்க்கவும்.",
        alreadyFilled: "இந்த புலம் ஏற்கனவே நிரப்பப்பட்டுள்ளது: {value}. மாற்ற விரும்புகிறீர்களா?"
      }
    };
    return prompts[langCode] || prompts['ms'];
  };

  // Get field value from formData
  const getFieldValue = (fieldConfig) => {
    // Handle children array fields
    if (fieldConfig.section === 'children' && fieldConfig.index !== undefined) {
      return formData.children[fieldConfig.index]?.[fieldConfig.field] || '';
    }
    return formData[fieldConfig.section]?.[fieldConfig.field] || '';
  };

  // Set field value in formData
  const setFieldValue = (fieldConfig, value) => {
    // Convert to number for number fields
    let processedValue = value;
    if (fieldConfig.type === 'number') {
      // Extract numbers only and convert to number type
      const numericString = String(value).replace(/[^0-9.]/g, '');
      processedValue = numericString ? parseFloat(numericString) || numericString : value;
    }
    
    // Handle children array fields
    if (fieldConfig.section === 'children' && fieldConfig.index !== undefined) {
      setFormData(prev => {
        const newChildren = [...prev.children];
        if (!newChildren[fieldConfig.index]) {
          newChildren[fieldConfig.index] = { name: '', ic_number: '' };
        }
        newChildren[fieldConfig.index] = {
          ...newChildren[fieldConfig.index],
          [fieldConfig.field]: processedValue
        };
        return { ...prev, children: newChildren };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldConfig.section]: {
          ...prev[fieldConfig.section],
          [fieldConfig.field]: processedValue
        }
      }));
    }
  };

  // Generate children fields dynamically
  const generateChildrenFields = (count) => {
    const childrenFields = [];
    for (let i = 0; i < count; i++) {
      childrenFields.push(
        {
          key: `children[${i}].name`,
          label: {
            en: `child ${i + 1} name`,
            ms: `nama anak ${i + 1}`,
            zh: `孩子${i + 1}的名字`,
            hk: `仔女${i + 1}嘅名`,
            ta: `குழந்தை ${i + 1} பெயர்`
          },
          section: 'children',
          field: 'name',
          index: i
        },
        {
          key: `children[${i}].ic_number`,
          label: {
            en: `child ${i + 1} IC number`,
            ms: `nombor IC anak ${i + 1}`,
            zh: `孩子${i + 1}的IC号码`,
            hk: `仔女${i + 1}嘅IC號碼`,
            ta: `குழந்தை ${i + 1} IC எண்`
          },
          section: 'children',
          field: 'ic_number',
          index: i
        }
      );
    }
    
    // Replace placeholder with actual children fields
    setFormFields(prev => {
      const placeholderIndex = prev.findIndex(f => f.key === '__children_placeholder__');
      if (placeholderIndex !== -1) {
        const newFields = [...prev];
        newFields.splice(placeholderIndex, 1, ...childrenFields);
        return newFields;
      }
      return prev;
    });
    
    setChildrenFieldsGenerated(true);
  };

  // Start voice-guided form filling
  const startVoiceGuidedFilling = () => {
    setVoiceMode(true);
    setCurrentFieldIndex(0);
    setCurrentStep(1); // Move to first form step
    
    const langCode = getUserLanguage();
    const prompts = getVoicePrompts(langCode);
    
    // Speak welcome message and wait for it to finish before asking first field
    speak(prompts.welcome, langCode, () => {
      // This callback runs when welcome message finishes
      setTimeout(() => {
        askCurrentField(0);
      }, 500); // Small 0.5s pause after welcome finishes
    });
  };

  // Get the form step number for a given field key
  const getStepForField = (fieldKey) => {
    if (fieldKey.startsWith('applicant.')) return 1;
    if (fieldKey.startsWith('spouse.')) return 2;
    if (fieldKey.startsWith('children[')) return 3;
    if (fieldKey.startsWith('documents.')) return 4;
    if (fieldKey.startsWith('guardian.')) return 5;
    return 1; // Default to step 1
  };

  // Ask the current field, with smart skipping for pre-filled fields
  const askCurrentField = (fieldIdx) => {
    let idx = fieldIdx;
    const langCode = getUserLanguage();
    const prompts = getVoicePrompts(langCode);
    
    // Find next field (check if pre-filled and conditional)
    while (idx < formFields.length) {
      const field = formFields[idx];
      
      // Check if we hit the children placeholder
      if (field.key === '__children_placeholder__') {
        if (!childrenFieldsGenerated) {
          // Ask about children count
          const childrenQuestion = {
            en: 'Do you have children? If yes, how many? You can say a number from 0 to 5.',
            ms: 'Adakah anda mempunyai anak? Jika ya, berapa ramai? Anda boleh sebut nombor dari 0 hingga 5.',
            zh: '您有孩子吗？如果有，有几个？您可以说0到5之间的数字。',
            hk: '你有仔女嗎？如果有，有幾個？你可以講0到5嘅數字。',
            ta: 'உங்களுக்கு குழந்தைகள் உள்ளனரா? இருந்தால், எத்தனை பேர்? 0 முதல் 5 வரை சொல்லலாம்.'
          };
          speak(childrenQuestion[langCode] || childrenQuestion['en'], langCode);
          setAwaitingChildrenCount(true);
          setCurrentFieldIndex(idx);
          return;
        } else {
          // Children fields already generated, skip placeholder
          idx++;
          continue;
        }
      }
      
      // Check conditional fields (e.g., spouse only if married)
      if (field.conditional) {
        if (field.conditional === 'married' && formData.applicant.marital_status !== 'married') {
          // Skip spouse fields if not married
          idx++;
          continue;
        }
      }
      
      // Skip marriage certificate if not married
      if (field.field === 'marriage_cert' && formData.applicant.marital_status !== 'married') {
        idx++;
        continue;
      }
      
      // Auto-navigate to the correct form step for this field
      const targetStep = getStepForField(field.key);
      if (currentStep !== targetStep) {
        setCurrentStep(targetStep);
      }
      
      const currentValue = getFieldValue(field);
      
      // For boolean fields (documents), check if already answered
      if (field.type === 'boolean') {
        if (currentValue !== '' && currentValue !== undefined && currentValue !== null) {
          // Already answered - skip unless user wants to change
          const fieldLabel = field.label[langCode] || field.label['en'];
          const valueText = currentValue ? 'Yes' : 'No';
          const confirmPrompt = prompts.alreadyFilled
            .replace('{field}', fieldLabel)
            .replace('{value}', valueText);
          speak(confirmPrompt, langCode);
          setAwaitingChangeConfirmation(true);
          setCurrentFieldIndex(idx);
          return;
        }
        // Ask the boolean question directly (no value confirmation needed)
        const fieldLabel = field.label[langCode] || field.label['en'];
        speak(fieldLabel, langCode); // Question is already in the label
        setAwaitingConfirmation(true); // Wait for Yes/No answer
        setCurrentFieldIndex(idx);
        return;
      }
      
      if (currentValue) {
        // Field already has value - ask if user wants to change it
        const fieldLabel = field.label[langCode] || field.label['en'];
        const confirmPrompt = prompts.alreadyFilled
          .replace('{field}', fieldLabel)
          .replace('{value}', currentValue);
        speak(confirmPrompt, langCode);
        setAwaitingChangeConfirmation(true);
        setCurrentFieldIndex(idx);
        return;
      }
      
      // Field is empty - ask for it with progress indicator
      const fieldLabel = field.label[langCode] || field.label['en'];
      const totalFields = formFields.filter(f => f.key !== '__children_placeholder__').length;
      const currentFieldNum = idx + 1;
      
      // Use progress prompt if available, otherwise fall back to basic
      let prompt;
      if (prompts.askFieldWithProgress) {
        prompt = prompts.askFieldWithProgress
          .replace('{current}', currentFieldNum.toString())
          .replace('{total}', totalFields.toString())
          .replace('{field}', fieldLabel);
      } else {
        prompt = prompts.askField.replace('{field}', fieldLabel);
      }
      speak(prompt, langCode);
      setCurrentFieldIndex(idx);
      return;
    }
    
    // All fields done - navigate to review step
    if (idx >= formFields.length) {
      setCurrentStep(6); // Move to review step
      speak(prompts.allDone, langCode);
      setCurrentFieldIndex(-1);
      setVoiceMode(false);
    }
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

        // Try to convert webm to wav for best compatibility, but fallback to webm if browser doesn't support decoding
        const convertToWav = async (blob) => {
          const arrayBuffer = await blob.arrayBuffer();
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          
          // Try to decode - this may fail on some browsers with webm/opus
          let audioBuffer;
          try {
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          } catch (decodeError) {
            console.warn('Browser cannot decode webm audio, sending as-is:', decodeError.message);
            throw decodeError; // Will be caught and fallback to webm
          }
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
        let fileName = 'recording.wav';
        try {
          wavBlob = await convertToWav(audioBlob);
        } catch (err) {
          console.warn('WAV conversion failed, sending webm directly:', err.message);
          wavBlob = audioBlob; // fallback to webm - Whisper can handle it
          fileName = 'recording.webm';
        }

        const formDataToSend = new FormData();
        formDataToSend.append('audio', wavBlob, fileName);
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
      
      // Auto-stop after 8 seconds to allow for longer answers
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, 8000);

    } catch (err) {
      console.error('Microphone error:', err);
      setIsListening(false);
    }
  };

  // Handle the transcribed voice response
  const handleVoiceResponse = async (transcribed) => {
    const langCode = getUserLanguage();
    const prompts = getVoicePrompts(langCode);
    const lowerText = transcribed.toLowerCase();
    
    // Check for Yes/No responses
    const isYes = lowerText.includes('ya') || lowerText.includes('yes') || lowerText.includes('是') || 
                  lowerText.includes('係') || lowerText.includes('betul') || lowerText.includes('correct') ||
                  lowerText.includes('ஆமா') || lowerText.includes('சரி');
    const isNo = lowerText.includes('tidak') || lowerText.includes('no') || lowerText.includes('否') || 
                 lowerText.includes('唔係') || lowerText.includes('salah') || lowerText.includes('wrong') ||
                 lowerText.includes('இல்லை') || lowerText.includes('வேண்டாம்');
    
    // Check for Skip command (multilingual)
    const isSkip = lowerText.includes('skip') || lowerText.includes('langkau') || lowerText.includes('lewat') ||
                   lowerText.includes('跳過') || lowerText.includes('跳过') || lowerText.includes('next') ||
                   lowerText.includes('seterusnya') || lowerText.includes('下一個') || lowerText.includes('下一个') ||
                   lowerText.includes('தவிர்') || lowerText.includes('அடுத்தது');
    
    // Handle skip command - move to next field
    if (isSkip && !awaitingChildrenCount) {
      const skipMsg = {
        en: 'Okay, skipping this field.',
        ms: 'Baiklah, melangkau medan ini.',
        zh: '好的，跳过这个字段。',
        hk: '好，跳過呢個欄位。',
        ta: 'சரி, இந்த புலத்தைத் தவிர்க்கிறேன்.'
      };
      speak(skipMsg[langCode] || skipMsg['en'], langCode);
      setAwaitingConfirmation(false);
      setAwaitingChangeConfirmation(false);
      setPendingValue(null);
      setTimeout(() => {
        askCurrentField(currentFieldIndex + 1);
      }, 1500);
      return;
    }
    
    if (awaitingChildrenCount) {
      // Extract number from transcription
      const numbers = {
        'zero': 0, 'kosong': 0, '零': 0, '〇': 0, 'சுழி': 0,
        'one': 1, 'satu': 1, '一': 1, 'ஒன்று': 1,
        'two': 2, 'dua': 2, '二': 2, '兩': 2, '两': 2, 'இரண்டு': 2,
        'three': 3, 'tiga': 3, '三': 3, 'மூன்று': 3,
        'four': 4, 'empat': 4, '四': 4, 'நான்கு': 4,
        'five': 5, 'lima': 5, '五': 5, 'ஐந்து': 5
      };
      
      let count = 0;
      
      // Try to extract digit
      const digitMatch = transcribed.match(/\d+/);
      if (digitMatch) {
        count = parseInt(digitMatch[0]);
      } else {
        // Try to match word
        for (const [word, num] of Object.entries(numbers)) {
          if (lowerText.includes(word) || transcribed.includes(word)) {
            count = num;
            break;
          }
        }
      }
      
      // If user says no/zero, set 0
      if (isNo || count === 0) {
        count = 0;
      }
      
      // Validate count (0-5)
      count = Math.max(0, Math.min(5, count));
      
      setChildrenCount(count);
      setAwaitingChildrenCount(false);
      
      if (count === 0) {
        // No children, skip to documents
        speak(prompts.confirmed, langCode);
        generateChildrenFields(0); // Generate empty array
        setTimeout(() => {
          askCurrentField(currentFieldIndex + 1);
        }, 1500);
      } else {
        // Generate children fields
        const childMsg = {
          en: `Okay, ${count} ${count === 1 ? 'child' : 'children'}. I'll ask for their details.`,
          ms: `Baiklah, ${count} orang anak. Saya akan tanya butiran mereka.`,
          zh: `好的，${count}个孩子。我会询问他们的详细信息。`,
          hk: `好，${count}個仔女。我會問佢哋嘅資料。`,
          ta: `சரி, ${count} குழந்தைகள். அவர்கள் விவரங்களை கேட்கிறேன்.`
        };
        speak(childMsg[langCode] || childMsg['en'], langCode);
        
        // Initialize children array in formData
        const newChildren = Array(count).fill(null).map(() => ({ name: '', ic_number: '' }));
        setFormData(prev => ({ ...prev, children: newChildren }));
        
        generateChildrenFields(count);
        
        setTimeout(() => {
          askCurrentField(currentFieldIndex + 1);
        }, 2000);
      }
      return;
    }
    
    if (awaitingChangeConfirmation) {
      // User is deciding whether to change a pre-filled field
      if (isYes) {
        // User wants to change it - ask for new value
        const field = formFields[currentFieldIndex];
        const fieldLabel = field.label[langCode] || field.label['en'];
        const prompt = prompts.askField.replace('{field}', fieldLabel);
        speak(prompt, langCode);
        setAwaitingChangeConfirmation(false);
      } else if (isNo) {
        // User doesn't want to change it - skip to next field
        speak(prompts.confirmed, langCode);
        setAwaitingChangeConfirmation(false);
        setTimeout(() => {
          askCurrentField(currentFieldIndex + 1);
        }, 1500);
      }
    } else if (awaitingConfirmation) {
      // User is confirming the value they just provided OR answering a boolean question
      const field = formFields[currentFieldIndex];
      
      // Handle boolean fields (documents) - Yes/No is the actual answer
      if (field.type === 'boolean') {
        if (isYes) {
          setFieldValue(field, true);
          speak(prompts.confirmed, langCode);
          setAwaitingConfirmation(false);
          setTimeout(() => {
            askCurrentField(currentFieldIndex + 1);
          }, 1500);
        } else if (isNo) {
          setFieldValue(field, false);
          speak(prompts.confirmed, langCode);
          setAwaitingConfirmation(false);
          setTimeout(() => {
            askCurrentField(currentFieldIndex + 1);
          }, 1500);
        }
        return;
      }
      
      // Handle regular fields - Yes/No confirms the pending value
      if (isYes && pendingValue) {
        // Confirm and save the value
        const field = formFields[currentFieldIndex];
        
        // Handle marital status specially
        if (field.type === 'select') {
          const statusMap = {
            'single': ['single', 'bujang', '单身', '單身', 'தனி'],
            'married': ['married', 'berkahwin', '已婚', '已婚', 'திருமணமானவர்'],
            'divorced': ['divorced', 'bercerai', '离婚', '離婚', 'விவாகரத்து'],
            'widowed': ['widowed', 'balu', 'duda', '丧偶', '喪偶', 'விதவை']
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
        // Retry - ask the same question again
        speak(prompts.retry, langCode);
        setAwaitingConfirmation(false);
        setPendingValue(null);
        
        setTimeout(() => {
          const field = formFields[currentFieldIndex];
          const fieldLabel = field.label[langCode] || field.label['en'];
          const prompt = prompts.askField.replace('{field}', fieldLabel);
          speak(prompt, langCode);
        }, 1500);
      }
    } else {
      // User provided a value - use Gemini to intelligently extract the field value
      const field = formFields[currentFieldIndex];
      const fieldName = field.label['en'] || field.field;
      const fieldType = field.type || 'text';
      
      try {
        // Call Gemini to extract just the relevant value
        const extractResponse = await fetch('http://localhost:8000/voice/extract-field', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: transcribed,
            field_name: fieldName,
            field_type: fieldType,
            language: langCode
          })
        });
        const extractResult = await extractResponse.json();
        
        // Use extracted value if successful, otherwise use original
        const cleanValue = extractResult.success && extractResult.extracted 
          ? extractResult.extracted 
          : transcribed;
        
        console.log(`🧠 Extracted "${fieldName}": "${transcribed}" → "${cleanValue}"`);
        
        setPendingValue(cleanValue);
        setAwaitingConfirmation(true);
        
        const confirmPrompt = prompts.confirm.replace('{value}', cleanValue);
        speak(confirmPrompt, langCode);
      } catch (err) {
        // Fallback to original transcription if extraction fails
        console.error('Field extraction error:', err);
        setPendingValue(transcribed);
        setAwaitingConfirmation(true);
        
        const confirmPrompt = prompts.confirm.replace('{value}', transcribed);
        speak(confirmPrompt, langCode);
      }
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={20} /> {getLangCode() === 'ms' ? 'Kembali ke STR' : 'Back to STR'}
            </button>
            <LanguageToggle />
          </div>
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
              ? (getLangCode() === 'ms' ? '🔴 Mendengar...' : getLangCode() === 'hk' ? '🔴 聽緊...' : getLangCode() === 'zh' ? '🔴 听着...' : '🔴 Listening...') 
              : isProcessing 
              ? (getLangCode() === 'ms' ? '⏳ Memproses...' : getLangCode() === 'hk' ? '⏳ 處理緊...' : getLangCode() === 'zh' ? '⏳ 处理中...' : '⏳ Processing...')
              : awaitingChangeConfirmation
              ? (getLangCode() === 'ms' ? '🔄 Tukar? Ya/Tidak' : getLangCode() === 'hk' ? '🔄 改? 係/唔係' : getLangCode() === 'zh' ? '🔄 改吗? 是/否' : '🔄 Change? Yes/No')
              : awaitingConfirmation
              ? (getLangCode() === 'ms' ? '✓ Betul? Ya/Tidak' : getLangCode() === 'hk' ? '✓ 啱? 係/唔係' : getLangCode() === 'zh' ? '✓ 对吗? 是/否' : '✓ Correct? Yes/No')
              : (getLangCode() === 'ms' ? '🎤 Tekan dan tahan' : getLangCode() === 'hk' ? '🎤 撳住嚟講' : getLangCode() === 'zh' ? '🎤 按住说话' : '🎤 Hold to speak')}
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
