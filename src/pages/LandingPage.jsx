import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogIn } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="page-container landing-page">
      <header className="landing-header">
        <div className="logo-placeholder">{t('appTitle')} - <b>TOLONGLAH</b></div>
        <LanguageToggle />
      </header>
      
      <main className="landing-content">
        <div className="action-card register-card" onClick={() => navigate('/register')}>
          <UserPlus size={100} />
          <h2>{t('registerTitle')}</h2>
          <p>{t('registerDesc')}</p>
        </div>

        <div className="action-card login-card" onClick={() => navigate('/login')}>
          <LogIn size={100} />
          <h2>{t('loginTitle')}</h2>
          <p>{t('loginDesc')}</p>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;