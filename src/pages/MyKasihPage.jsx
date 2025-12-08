import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Wallet, QrCode, MapPin, Store, XCircle, CheckCircle, Banknote, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import FamilyDock from '../components/FamilyDock';
import { myKasihData, myKasihShops } from '../data/mockMyKasihData';

const MyKasihPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [userData, setUserData] = useState(null);
  const [status, setStatus] = useState(null);
  const [showQR, setShowQR] = useState(false);
  
  // Family Payment State
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedPayer, setSelectedPayer] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('registeredUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
      setSelectedPayer({ name: user.name, ic: user.icNumber });
      
      // Load family members
      const members = JSON.parse(localStorage.getItem(`family_members_${user.icNumber}`) || '[]');
      setFamilyMembers(members);

      // Check eligibility
      const userMyKasihData = myKasihData[user.icNumber];
      if (userMyKasihData) {
        setStatus(userMyKasihData);
      } else {
        setStatus({ eligible: false });
      }
    }
  }, []);

  const handleSimulatePayment = () => {
    if (!selectedPayer || !userData) return;

    // If paying for someone else, send notification
    if (selectedPayer.ic !== userData.icNumber) {
      const notification = {
        id: Date.now(),
        type: 'payment_on_behalf',
        fromName: userData.name,
        amount: 'RM 50.00', // Mock amount
        timestamp: new Date().toISOString(),
        read: false
      };

      // Store in recipient's notifications
      const recipientKey = `notifications_${selectedPayer.ic}`;
      const existing = JSON.parse(localStorage.getItem(recipientKey) || '[]');
      existing.push(notification);
      localStorage.setItem(recipientKey, JSON.stringify(existing));
      
      alert(`Payment simulated! Notification sent to ${selectedPayer.name}.`);
    } else {
      alert('Payment simulated successfully!');
    }
    setShowQR(false);
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
        <h1 style={{ fontSize: '2.5rem', color: '#2563eb', marginTop: '0', marginBottom: '30px' }}>{t('myKasih')}</h1>
        
        {status && status.eligible ? (
          // Eligible View
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Balance Cards Container */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              
              {/* Card 1: MyKasih Balance */}
              <div style={{ 
                flex: '1 1 300px',
                backgroundColor: 'white', 
                padding: '25px', 
                borderRadius: '20px', 
                boxShadow: '0 10px 25px rgba(37, 99, 235, 0.1)', 
                border: '1px solid #bfdbfe',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '8px', 
                  backgroundColor: '#2563eb' 
                }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6b7280' }}>
                  <Wallet size={24} />
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{t('myKasihBalance')}</span>
                </div>
                
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#2563eb' }}>
                  {status.balance}
                </div>
                
                <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 'bold', backgroundColor: '#fee2e2', padding: '4px 12px', borderRadius: '20px' }}>
                  {t('expires')}: {status.myKasihExpiry}
                </div>

                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '5px', fontStyle: 'italic' }}>
                  {t('limitNote')}
                </div>

                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '5px' }}>
                  {t('lastTransaction')}: {status.lastTransaction}
                </div>
                
                <div style={{ marginTop: 'auto', width: '100%' }}>
                  <p style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center', marginBottom: '5px', fontStyle: 'italic' }}>
                    * Max RM50 limit when paying for family members
                  </p>
                  <button 
                    onClick={() => setShowQR(true)}
                    style={{
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50px',
                      padding: '12px 30px',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                  >
                    <QrCode size={20} />
                    {t('payNow')}
                  </button>
                </div>
              </div>

              {/* Card 2: SARA Balance */}
              <div style={{ 
                flex: '1 1 300px',
                backgroundColor: 'white', 
                padding: '25px', 
                borderRadius: '20px', 
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.1)', 
                border: '1px solid #a7f3d0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '8px', 
                  backgroundColor: '#10b981' 
                }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6b7280' }}>
                  <div style={{ backgroundColor: '#d1fae5', padding: '5px', borderRadius: '50%' }}>
                    <Banknote size={20} color="#10b981" />
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{t('saraBalance')}</span>
                </div>
                
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981' }}>
                  {status.saraBalance}
                </div>
                
                <div style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 'bold', backgroundColor: '#d1fae5', padding: '4px 12px', borderRadius: '20px' }}>
                  {t('carriesForward')}
                </div>

                <div style={{ marginTop: '15px', width: '100%', backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '10px', border: '1px dashed #86efac' }}>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center', marginBottom: '5px' }}>
                    {t('upcomingSara')}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#059669', textAlign: 'center' }}>
                    {status.saraNextPayment}
                  </div>
                </div>

                <button 
                  onClick={() => setShowQR(true)}
                  style={{
                    marginTop: 'auto',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '12px 30px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <QrCode size={20} />
                  {t('payWithSara')}
                </button>
              </div>

            </div>

            {/* Shops Map Section */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#1f2937' }}>
                <Store color="#2563eb" /> {t('nearbyMerchants')}
              </h3>
              
              {/* Mock Map Visual */}
              <div style={{ 
                width: '100%', 
                height: '250px', 
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
                  {t('interactiveMap')}
                </div>
                {/* Mock Pins */}
                <MapPin size={32} color="#2563eb" style={{ position: 'absolute', top: '20%', left: '30%' }} />
                <MapPin size={32} color="#2563eb" style={{ position: 'absolute', top: '50%', left: '60%' }} />
                <MapPin size={32} color="#2563eb" style={{ position: 'absolute', top: '70%', left: '20%' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '15px', height: '15px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
              </div>

              {/* Shop List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myKasihShops.map((shop) => (
                  <div key={shop.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                    <Store size={24} color="#4b5563" style={{ marginTop: '3px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{shop.name}</div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', margin: '3px 0' }}>{shop.address}</div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{shop.distance} {t('away')}</span>
                        <span style={{ color: '#9ca3af' }}>•</span>
                        <span style={{ color: '#4b5563' }}>{shop.type}</span>
                      </div>
                    </div>
                    <button style={{ padding: '8px 12px', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {t('navigate')}
                    </button>
                  </div>
                ))}
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
                <h2 style={{ margin: 0, color: '#be123c', fontSize: '2rem', fontWeight: 'bold' }}>{t('notEligible')}</h2>
                <p style={{ margin: '10px 0 0 0', color: '#9f1239', fontSize: '1.1rem' }}>
                  You are currently not eligible for MyKasih aid.
                </p>
              </div>
            </div>

            {/* Still show shops? Yes, per request "map of all the shops" */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#1f2937' }}>
                <Store color="#2563eb" /> {t('nearbyMerchants')}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '15px' }}>Even if you are not eligible, you can still visit these partner stores.</p>
              
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
                  {t('interactiveMap')}
                </div>
                <MapPin size={32} color="#2563eb" style={{ position: 'absolute', top: '30%', left: '40%' }} />
                <MapPin size={32} color="#2563eb" style={{ position: 'absolute', top: '60%', left: '70%' }} />
              </div>
            </div>

          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {showQR && userData && selectedPayer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setShowQR(false)}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '350px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>{t('scanToPay')}</h2>
            <p style={{ margin: 0, color: '#6b7280' }}>{t('scanInstruction')}</p>
            
            <div style={{ padding: '20px', border: '2px dashed #2563eb', borderRadius: '10px', backgroundColor: 'white' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedPayer.ic}`} 
                alt="MyKasih QR Code" 
                style={{ width: '200px', height: '200px' }}
              />
            </div>
            
            {/* Payer Selection Dropdown */}
            <div style={{ position: 'relative', width: '100%' }}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: '#2563eb',
                  background: 'none',
                  border: '1px solid #bfdbfe',
                  padding: '10px',
                  borderRadius: '10px',
                  width: '100%',
                  cursor: 'pointer',
                  backgroundColor: '#eff6ff'
                }}
              >
                {selectedPayer.name}
                {isDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  width: '100%',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  marginBottom: '5px',
                  overflow: 'hidden',
                  zIndex: 10
                }}>
                  {/* Current User Option */}
                  <div 
                    onClick={() => {
                      setSelectedPayer({ name: userData.name, ic: userData.icNumber });
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: selectedPayer.ic === userData.icNumber ? '#eff6ff' : 'white',
                      color: selectedPayer.ic === userData.icNumber ? '#2563eb' : '#374151'
                    }}
                  >
                    {userData.name} (Me)
                  </div>

                  {/* Family Members */}
                  {familyMembers.map(member => {
                    const isEligible = myKasihData[member.ic]?.eligible;
                    return (
                      <div 
                        key={member.ic}
                        onClick={() => {
                          if (isEligible) {
                            setSelectedPayer(member);
                            setIsDropdownOpen(false);
                          }
                        }}
                        style={{
                          padding: '12px',
                          cursor: isEligible ? 'pointer' : 'not-allowed',
                          borderBottom: '1px solid #f3f4f6',
                          backgroundColor: selectedPayer.ic === member.ic ? '#eff6ff' : (isEligible ? 'white' : '#f9fafb'),
                          color: selectedPayer.ic === member.ic ? '#2563eb' : (isEligible ? '#374151' : '#9ca3af'),
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{member.name}</span>
                        {!isEligible && (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            color: '#ef4444', 
                            border: '1px solid #ef4444', 
                            padding: '2px 6px', 
                            borderRadius: '10px',
                            fontWeight: 'bold'
                          }}>
                            Not Eligible
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedPayer.ic !== userData.icNumber && (
               <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: 0 }}>
                 Paying on behalf (Limit: RM50)
               </p>
            )}
            
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button 
                onClick={() => setShowQR(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {t('close')}
              </button>
              <button 
                onClick={handleSimulatePayment}
                style={{
                  flex: 1,
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Simulate Pay
              </button>
            </div>
          </div>
        </div>
      )}

      <FamilyDock />
    </div>
  );
};

export default MyKasihPage;
