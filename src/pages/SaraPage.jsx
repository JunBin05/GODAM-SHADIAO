import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Wallet, QrCode, MapPin, Store, XCircle, CheckCircle, Banknote } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import FamilyDock from '../components/FamilyDock';
import StoreMap from '../components/StoreMap';
import { useStoreLocator } from '../hooks/useAPI';
import { myKasihShops } from '../data/mockMyKasihData';

const SaraPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [userData, setUserData] = useState(null);
  const [status, setStatus] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { stores, loading: storesLoading, error: storesError, findNearbyStores } = useStoreLocator(language);
  
  // Fallback mock stores if API fails
  const mockStores = myKasihShops || [];

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
    }
    
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          // Load nearby stores automatically
          findNearbyStores(location.lat, location.lng, 5);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError(error.message);
          // Use default location (KL) if geolocation fails
          const defaultLoc = { lat: 3.139, lng: 101.6869 };
          setUserLocation(defaultLoc);
          findNearbyStores(defaultLoc.lat, defaultLoc.lng, 5);
        }
      );
    }
  }, []);

  const fetchEligibility = async (icNumber) => {
    try {
      setLoading(true);
      console.log('[SARA] Fetching eligibility for IC:', icNumber);
      const url = `http://localhost:8000/api/financial-aid/${encodeURIComponent(icNumber)}`;
      console.log('[SARA] Fetch URL:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('[SARA] API Response:', data);
      
      if (data.success && data.mykasih_eligible) {
        // Format dates for display
        const expireDate = data.mykasih_expire_date ? new Date(data.mykasih_expire_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
        const lastTransaction = data.mykasih_history && data.mykasih_history.length > 0 
          ? data.mykasih_history[data.mykasih_history.length - 1].date 
          : 'No transactions';
        
        setStatus({
          eligible: true,
          balance: `RM ${data.mykasih_expire_balance || 0}`,
          saraBalance: `RM ${data.mykasih_balance || 0}`,
          lastTransaction: lastTransaction,
          expireDate: expireDate,
          saraNextPayment: expireDate,
          history: data.mykasih_history || []
        });
      } else {
        setStatus({ eligible: false });
      }
    } catch (error) {
      console.error('Error fetching MyKasih eligibility:', error);
      setStatus({ eligible: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ backgroundColor: '#f3f4f6' }}>
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
        <h1 style={{ fontSize: '2.5rem', color: '#2563eb', marginTop: '0', marginBottom: '30px' }}>{t('sara')}</h1>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
            <div>Loading eligibility status...</div>
          </div>
        ) : status && status.eligible ? (
          // Eligible View
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Balance Cards Container - Two Columns */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              
              {/* LEFT COLUMN: SARA Balance (one-off) */}
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
                  <Wallet size={24} />
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{t('saraBalance')}</span>
                </div>
                
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981' }}>
                  {status.balance}
                </div>
                
                <div style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 'bold', backgroundColor: '#d1fae5', padding: '4px 12px', borderRadius: '20px' }}>
                  {t('oneOff')}
                </div>

                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '5px' }}>
                  {t('lastTransaction')}: {status.lastTransaction}
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
                  {t('payNow')}
                </button>
              </div>

              {/* RIGHT COLUMN: SARA Balance (original) */}
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
                    {t('upcomingSaraPayment')}
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
                <Store color="#10b981" /> {t('nearbyStores')}
              </h3>
              
              {locationError && (
                <div style={{ padding: '10px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '15px', color: '#991b1b' }}>
                  {t('noStoresFound')}
                </div>
              )}
              
              {storesLoading && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  {t('loadingStores')}
                </div>
              )}
              
              {storesError && (
                <div style={{ padding: '15px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '15px', color: '#991b1b', textAlign: 'center' }}>
                  ⚠️ {t('noStoresFound')}
                </div>
              )}
              
              {!storesLoading && (stores.length > 0 || mockStores.length > 0) && (
                <>
                  <StoreMap 
                    stores={stores.length > 0 ? stores : mockStores}
                    userLocation={userLocation}
                    onStoreClick={(store) => {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`, '_blank');
                    }}
                  />
                  
                  {/* View All on Map Button */}
                  <button 
                    onClick={() => {
                      // Create Google Maps URL with multiple markers (red pins)
                      // Using Google Maps base URL with center and multiple markers
                      if (stores.length > 0 && userLocation) {
                        // Method 1: Use directions with waypoints (shows route through stores)
                        // const waypoints = stores.slice(0, 8).map(s => `${s.latitude},${s.longitude}`).join('|');
                        // window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${stores[0].latitude},${stores[0].longitude}&waypoints=${waypoints}`, '_blank');
                        
                        // Method 2: Open Google Maps centered on user with search for nearby SARA stores
                        const centerLat = userLocation.lat;
                        const centerLng = userLocation.lng;
                        // This will show stores as red markers around the user's location
                        window.open(`https://www.google.com/maps/search/SARA+grocery+store/@${centerLat},${centerLng},14z`, '_blank');
                      } else {
                        // Fallback: search for SARA merchants
                        window.open('https://www.google.com/maps/search/SARA+merchants+near+me', '_blank');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      marginTop: '15px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1.05rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                  >
                    <MapPin size={22} />
                    View All Stores on Google Maps
                  </button>
                  
                  {/* Shop List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '25px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingBottom: '10px',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                    <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1.15rem' }}>
                      📍 Nearest Locations
                    </h4>
                    <span style={{ 
                      backgroundColor: '#10b981', 
                      color: 'white', 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      {(stores.length > 0 ? stores : mockStores).length} found
                    </span>
                  </div>
                    {(stores.length > 0 ? stores : mockStores).slice(0, 5).map((shop, index) => (
                      <div 
                        key={shop.id || index} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '15px', 
                          padding: '18px', 
                          backgroundColor: 'white', 
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
                          e.currentTarget.style.borderColor = '#10b981';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <div style={{ 
                          backgroundColor: '#d1fae5', 
                          padding: '12px', 
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Store size={24} color="#10b981" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '1.05rem', marginBottom: '5px' }}>
                            {shop.name}
                          </div>
                          <div style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: '8px', lineHeight: '1.4' }}>
                            {shop.address}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', alignItems: 'center' }}>
                            <span style={{ 
                              color: '#10b981', 
                              fontWeight: 'bold',
                              backgroundColor: '#d1fae5',
                              padding: '3px 10px',
                              borderRadius: '6px'
                            }}>
                              📍 {(shop.distance_km || shop.distance || 0).toFixed(2)} km
                            </span>
                            <span style={{ color: '#6b7280' }}>{shop.type || 'grocery'}</span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`, '_blank');
                          }}
                          style={{ 
                            padding: '10px 16px', 
                            backgroundColor: '#10b981', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                        >
                          Navigate →
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {!storesLoading && stores.length === 0 && mockStores.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  No stores found nearby. Try again or check your location settings.
                </div>
              )}
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
                  {t('notEligibleSara')}
                </p>
              </div>
            </div>

            {/* Still show shops? Yes, per request "map of all the shops" */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#1f2937' }}>
                <Store color="#10b981" /> {t('nearbySaraMerchants')}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '15px' }}>{t('notEligibleStoreMsg')}</p>
              
              {storesLoading && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  {t('loadingStores')}
                </div>
              )}
              
              {!storesLoading && (
                <>
                  <StoreMap 
                    stores={stores.length > 0 ? stores : mockStores}
                    userLocation={userLocation}
                    onStoreClick={(store) => {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`, '_blank');
                    }}
                  />
                  
                  {/* Shop List for Non-Eligible Users */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '25px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingBottom: '10px',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1.15rem' }}>
                        📍 {t('nearbyStores')}
                      </h4>
                      <span style={{ 
                        backgroundColor: '#10b981', 
                        color: 'white', 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}>
                        {(stores.length > 0 ? stores : mockStores).length} found
                      </span>
                    </div>
                    {(stores.length > 0 ? stores : mockStores).slice(0, 5).map((shop, index) => (
                      <div 
                        key={shop.id || shop.store_id || index} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '15px', 
                          padding: '18px', 
                          backgroundColor: '#f9fafb', 
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`, '_blank');
                        }}
                      >
                        <div style={{ 
                          backgroundColor: '#10b981', 
                          color: 'white', 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '10px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          flexShrink: 0
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                            {shop.name || shop.tradingName}
                          </div>
                          <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                            {shop.address || `${shop.city}, ${shop.state}`}
                          </div>
                          {shop.distance && (
                            <div style={{ 
                              color: '#10b981', 
                              fontSize: '0.85rem', 
                              fontWeight: '600',
                              marginTop: '4px'
                            }}>
                              📍 {shop.distance.toFixed(1)} km away
                            </div>
                          )}
                        </div>
                        <div style={{ 
                          backgroundColor: '#ecfdf5', 
                          color: '#059669', 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>
                          {t('navigate')} →
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {showQR && userData && (
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
            <h2 style={{ margin: 0, color: '#1f2937' }}>Scan to Pay</h2>
            <p style={{ margin: 0, color: '#6b7280' }}>Show this QR code to the cashier to use your SARA balance.</p>
            
            <div style={{ padding: '20px', border: '2px dashed #10b981', borderRadius: '10px' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${userData.icNumber}`} 
                alt="SARA QR Code" 
                style={{ width: '200px', height: '200px' }}
              />
            </div>
            
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>
              {userData.name}
            </div>
            
            <button 
              onClick={() => setShowQR(false)}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 30px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <FamilyDock />
    </div>
  );
};

export default SaraPage;
