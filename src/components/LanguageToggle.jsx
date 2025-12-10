import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LanguageToggle = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const [isUpdating, setIsUpdating] = useState(false);

  const languages = [
    { code: 'en', label: 'English', voiceCode: 'en' },
    { code: 'ms', label: 'Bahasa Melayu', voiceCode: 'ms' },
    { code: 'zh', label: '中文 (Mandarin)', voiceCode: 'zh' }, // Mandarin Chinese
    { code: 'HK', label: '中文 (Cantonese)', voiceCode: 'HK' }, // Cantonese (Hong Kong)
    { code: 'ta', label: 'தமிழ்', voiceCode: 'ta' } // Tamil
  ];

  const currentLangLabel = languages.find(l => l.code === language)?.label || 'English';

  const handleLanguageChange = async (lang) => {
    setIsUpdating(true);
    
    try {
      // Update UI language immediately
      setLanguage(lang.code);
      
      // Get user IC from localStorage
      const storedUser = localStorage.getItem('registeredUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const ic = user.icNumber;
        
        // Update language in MongoDB via backend API
        const response = await fetch('http://localhost:8000/api/user/update-language', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ic: ic, 
            language: lang.voiceCode 
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Language updated in MongoDB:', lang.voiceCode);
        } else {
          console.error('❌ Failed to update language in MongoDB:', result.detail);
        }
      }
    } catch (error) {
      console.error('❌ Error updating language:', error);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="language-toggle-container">
      <button 
        className="language-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
      >
        <Globe size={24} />
        <span>{isUpdating ? 'Updating...' : currentLangLabel}</span>
      </button>
      
      {isOpen && (
        <div className="language-dropdown">
          {languages.map((lang) => (
            <button 
              key={lang.code} 
              className="language-option"
              onClick={() => handleLanguageChange(lang)}
              disabled={isUpdating}
              style={{ 
                opacity: isUpdating ? 0.5 : 1,
                backgroundColor: lang.code === language ? '#e0f2fe' : 'transparent'
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageToggle;