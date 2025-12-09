import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import SaraPage from './pages/SaraPage';
import STRPage from './pages/STRPage';
import STRApplyPage from './pages/STRApplyPage';
import RemindersPage from './pages/RemindersPage';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/main" element={<MainPage />} />
            <Route path="/sara" element={<SaraPage />} />
            <Route path="/mykasih" element={<Navigate to="/sara" replace />} />
            <Route path="/str" element={<STRPage />} />
            <Route path="/str-apply" element={<STRApplyPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
