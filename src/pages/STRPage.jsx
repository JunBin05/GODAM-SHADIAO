import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, CheckCircle, XCircle, MapPin, ExternalLink, Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import FamilyDock from '../components/FamilyDock';
import StoreMap from '../components/StoreMap';
import { useStoreLocator } from '../hooks/useAPI';
import { bsnBranches } from '../data/mockStrData';

const STRPage = () => {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  const [userData, setUserData] = useState(null);
  const { stores, findNearbyStores } = useStoreLocator(currentLanguage);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset loading state on mount
    setLoading(true);
    setStatus(null);
    
    const storedUser = localStorage.getItem('registeredUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
      
      // Fetch eligibility from Firebase via backend
      fetchEligibility(user.icNumber);
      
      // Get user's location for nearby stores
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            findNearbyStores(position.coords.latitude, position.coords.longitude, 5);
          },
          (err) => console.log('Location access denied:', err)
        );
      }
    }
  }, []);

  const fetchEligibility = async (icNumber) => {
    try {
      setLoading(true);
      console.log('[STR] Fetching eligibility for IC:', icNumber);
      const url = `http://localhost:8000/api/financial-aid/${encodeURIComponent(icNumber)}`;
      console.log('[STR] Fetch URL:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('[STR] API Response:', data);
      
      if (data.success && data.str_eligible) {
        // Format the date for display
        const nextPayDate = data.str_next_pay_date ? new Date(data.str_next_pay_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA';
        
        setStatus({
          eligible: true,
          upcoming: [{
            amount: `RM ${data.str_next_pay_amount || 0}`,
            phase: `Remaining: ${data.str_remaining_cycles || 0} cycles`,
            status: 'Approved',
            date: nextPayDate
          }],
          recent: data.str_history && data.str_history.length > 0 ? {
            amount: `RM ${data.str_history[0].amount}`,
            phase: 'Previous Payment',
            status: data.str_history[0].status || 'Completed',
            date: data.str_history[0].date
          } : null,
          history: data.str_history || []
        });
      } else {
        setStatus({ eligible: false });
      }
    } catch (error) {
      console.error('Error fetching STR eligibility:', error);
      setStatus({ eligible: false });
    } finally {
      setLoading(false);
    }
  };

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
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
            <div>Loading eligibility status...</div>
          </div>
        ) : status && status.eligible ? (
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
                <h2 style={{ margin: 0, color: '#15803d', fontSize: '2rem', fontWeight: 'bold' }}>{t('eligibleForStr')}</h2>
                <p style={{ margin: '10px 0 0 0', color: '#166534', fontSize: '1.1rem' }}>
                  {t('applicationApproved')}
                </p>
              </div>
            </div>

            {/* Upcoming Payments */}
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginTop: 0, color: '#4b5563', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>{t('upcomingPayments')}</h3>
              
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
                      {t('expected')}: {payment.date}
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
              <h3 style={{ marginTop: 0, color: '#4b5563', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('recentPayment')}</h3>
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
                <h2 style={{ margin: 0, color: '#be123c', fontSize: '2rem', fontWeight: 'bold' }}>{t('notEligibleStr')}</h2>
                <p style={{ margin: '10px 0 0 0', color: '#9f1239', fontSize: '1.1rem' }}>
                  {t('notEligibleMsg')}
                </p>
              </div>
              <button
                onClick={() => navigate('/str-apply')}
                style={{
                  marginTop: '10px',
                  padding: '15px 30px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
                }}
              >
                {t('newApplication')} →
              </button>
            </div>

            {/* BSN Map Section */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin color="#dc2626" /> {t('nearestBsnBranches')}
              </h3>
              
              {/* Real Map using StoreMap component */}
              <StoreMap 
                stores={bsnBranches.map(b => ({
                  ...b,
                  latitude: b.lat || 3.139,
                  longitude: b.lng || 101.6869,
                  name: b.name,
                  address: b.address,
                  distance_km: parseFloat(b.distance) || 1.0
                }))}
                userLocation={null}
                onStoreClick={(branch) => {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`, '_blank');
                }}
              />

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
                      {t('navigate')}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Registration Guide */}
            <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '15px', border: '1px solid #bfdbfe' }}>
              <h3 style={{ marginTop: 0, color: '#1e40af' }}>{t('howToRegister')}</h3>
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

      {/* Floating Application Button */}
      {status && status.eligible && (
        <button
          onClick={() => navigate('/str-apply')}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '30px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '15px 25px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 1000,
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 12px 30px rgba(37, 99, 235, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.4)';
          }}
        >
          📝 New Application
        </button>
      )}

      <FamilyDock />
    </div>
  );
};

export default STRPage;
