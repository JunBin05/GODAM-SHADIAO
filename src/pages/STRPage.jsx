import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, CheckCircle, XCircle, MapPin, ExternalLink, Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import FamilyDock from '../components/FamilyDock';
import { strData, bsnBranches } from '../data/mockStrData';

const STRPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [userData, setUserData] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('registeredUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
      
      // Check eligibility
      const userStrData = strData[user.icNumber];
      if (userStrData) {
        setStatus(userStrData);
      } else {
        // Default to not eligible if not in mock data
        setStatus({ eligible: false });
      }
    }
  }, []);

  return (
    <div className="page-container">
      <header className="landing-header" style={{ flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => navigate('/main')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={32} />
          </button>
          <div className="logo-placeholder">{t('appTitle')}</div>
          <div style={{ width: '3px', height: '40px', backgroundColor: '#9ca3af' }}></div>
        </div>

        {userData && (
          <div style={{ 
            position: 'absolute', 
            left: '50%', 
            top: '50%', 
            transform: 'translate(-50%, -50%)',
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center',
            textAlign: 'center',
            width: 'max-content',
            gap: '20px',
            pointerEvents: 'none'
          }}>
            <span style={{ fontWeight: 'bold', color: 'black', fontSize: '1.5rem' }}>{userData.name}</span>
            <span style={{ fontWeight: 'bold', color: 'black', fontSize: '1.5rem' }}>{userData.icNumber}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            <LogOut size={18} />
            {t('signOut')}
          </button>
          <LanguageToggle />
        </div>
      </header>

      <main className="page-content" style={{ justifyContent: 'flex-start', paddingTop: '30px', paddingBottom: '100px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#2563eb', marginTop: '0', marginBottom: '30px' }}>{t('str')}</h1>
        
        {status && status.eligible ? (
          // Eligible View
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Status Card */}
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              padding: '30px', 
              borderRadius: '20px', 
              border: '1px solid #86efac', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              textAlign: 'center',
              gap: '15px',
              boxShadow: '0 4px 15px rgba(22, 163, 74, 0.1)'
            }}>
              <div style={{ 
                backgroundColor: '#dcfce7', 
                padding: '15px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={48} color="#16a34a" />
              </div>
              <div>
                <h2 style={{ margin: 0, color: '#15803d', fontSize: '2rem', fontWeight: 'bold' }}>Eligible for STR</h2>
                <p style={{ margin: '10px 0 0 0', color: '#166534', fontSize: '1.1rem' }}>
                  Your application has been approved.
                </p>
              </div>
            </div>

            {/* Upcoming Payments */}
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginTop: 0, color: '#4b5563', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Upcoming Payments</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Array.isArray(status.upcoming) ? status.upcoming.map((payment, index) => (
                  <div key={index} style={{ 
                    borderBottom: index !== status.upcoming.length - 1 ? '1px solid #f3f4f6' : 'none',
                    paddingBottom: index !== status.upcoming.length - 1 ? '20px' : '0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2563eb' }}>{payment.amount}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{payment.phase}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af', backgroundColor: '#dbeafe', padding: '10px', borderRadius: '8px' }}>
                      <CheckCircle size={20} />
                      <span style={{ fontWeight: 'bold' }}>{payment.status}</span>
                    </div>
                    <div style={{ marginTop: '10px', color: '#6b7280', fontSize: '0.9rem' }}>
                      Expected: {payment.date}
                    </div>
                  </div>
                )) : (
                   <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{status.upcoming.amount}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{status.upcoming.phase}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af', backgroundColor: '#dbeafe', padding: '10px', borderRadius: '8px' }}>
                      <CheckCircle size={20} />
                      <span style={{ fontWeight: 'bold' }}>{status.upcoming.status}</span>
                    </div>
                    <div style={{ marginTop: '10px', color: '#6b7280', fontSize: '0.9rem' }}>
                      Expected: {status.upcoming.date}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Phase */}
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginTop: 0, color: '#4b5563', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Payment</h3>
              <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>{status.recent.amount}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{status.recent.phase}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#059669', backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '8px' }}>
                  <CheckCircle size={20} />
                  <span style={{ fontWeight: 'bold' }}>{status.recent.status}</span>
                </div>
                <div style={{ marginTop: '10px', color: '#6b7280', fontSize: '0.9rem' }}>
                  Date: {status.recent.date}
                </div>
              </div>
            </div>

          </div>
        ) : (
          // Not Eligible View
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Not Eligible Alert */}
            <div style={{ 
              backgroundColor: '#fff1f2', 
              padding: '30px', 
              borderRadius: '20px', 
              border: '1px solid #fda4af', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              textAlign: 'center',
              gap: '15px',
              boxShadow: '0 4px 15px rgba(225, 29, 72, 0.1)'
            }}>
              <div style={{ 
                backgroundColor: '#ffe4e6', 
                padding: '15px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <XCircle size={48} color="#e11d48" />
              </div>
              <div>
                <h2 style={{ margin: 0, color: '#be123c', fontSize: '2rem', fontWeight: 'bold' }}>Not Eligible</h2>
                <p style={{ margin: '10px 0 0 0', color: '#9f1239', fontSize: '1.1rem' }}>
                  You are currently not registered or eligible for STR.
                </p>
              </div>
            </div>

            {/* BSN Map Section */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin color="#dc2626" /> Nearest BSN Branches
              </h3>
              
              {/* Mock Map Visual */}
              <div style={{ 
                width: '100%', 
                height: '200px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '10px', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: 'linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)',
                backgroundSize: '20px 20px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#9ca3af', fontWeight: 'bold' }}>
                  Interactive Map View
                </div>
                {/* Mock Pins */}
                <MapPin size={32} color="#dc2626" style={{ position: 'absolute', top: '30%', left: '40%' }} />
                <MapPin size={32} color="#dc2626" style={{ position: 'absolute', top: '60%', left: '70%' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '15px', height: '15px', backgroundColor: '#2563eb', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
              </div>

              {/* Branch List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bsnBranches.map((branch) => (
                  <div key={branch.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                    <Building2 size={24} color="#4b5563" style={{ marginTop: '3px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{branch.name}</div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', margin: '3px 0' }}>{branch.address}</div>
                      <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 'bold' }}>{branch.distance} away</div>
                    </div>
                    <button style={{ padding: '8px 12px', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                      Navigate
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Registration Guide */}
            <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '15px', border: '1px solid #bfdbfe' }}>
              <h3 style={{ marginTop: 0, color: '#1e40af' }}>How to Register</h3>
              <p style={{ color: '#1e3a8a', marginBottom: '15px' }}>
                You can register for STR through the official MySTR portal.
              </p>
              <a 
                href="https://bantuantunai.hasil.gov.my/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '10px',
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
              >
                Go to MySTR Portal <ExternalLink size={18} />
              </a>
            </div>

          </div>
        )}
      </main>

      <FamilyDock />
    </div>
  );
};

export default STRPage;
