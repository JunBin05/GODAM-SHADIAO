import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LanguageToggle = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ms', label: 'Bahasa Melayu' },
    { code: 'zh-cn', label: '简体中文' }, // Simplified Chinese
    { code: 'ta', label: 'தமிழ்' } // Tamil
  ];

  const currentLangLabel = languages.find(l => l.code === language)?.label || 'English';

  const handleLanguageChange = (lang) => {
    setLanguage(lang.code);
    setIsOpen(false);
  };

  return (
    <div className="language-toggle-container">
      <button 
        className="language-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Globe size={24} />
        <span>{currentLangLabel}</span>
      </button>
      
      {isOpen && (
        <div className="language-dropdown">
          {languages.map((lang) => (
            <button 
              key={lang.code} 
              className="language-option"
              onClick={() => handleLanguageChange(lang)}
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