import { X, QrCode, Download, Share2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

const QRCodeModal = ({ isOpen, onClose, userId }) => {
  const { t } = useLanguage();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const timerRef = useRef(null);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    if (isOpen && userId) {
      generateQRCode();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [isOpen, userId]);

  useEffect(() => {
    if (qrData && isOpen) {
      // Start countdown timer
      setTimeRemaining(60);
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            return 60; // Reset to 60 when it reaches 0
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-refresh QR code every 60 seconds
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        generateQRCode();
      }, 60000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [qrData, isOpen]);

  const generateQRCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/payment/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      
      // Generate actual QR code image from the data
      const qrCodeDataUrl = await QRCodeLib.toDataURL(
        data.qr_code || `SARA-PAY:${userId}:${Date.now()}`,
        {
          width: 280,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }
      );
      
      setQrData({
        ...data,
        qr_code: qrCodeDataUrl,
        transaction_id: data.transaction_id || `TXN${Date.now()}`,
        expires_at: new Date(Date.now() + 60 * 1000).toISOString(), // 60 seconds
      });
    } catch (err) {
      console.error('QR generation error:', err);
      setError(err.message);
      
      // Generate mock QR code for offline mode
      const qrString = `SARA-PAY:${userId}:${Date.now()}`;
      const qrCodeDataUrl = await QRCodeLib.toDataURL(qrString, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrData({
        success: true,
        qr_code: qrCodeDataUrl,
        transaction_id: `TXN${Date.now()}`,
        expires_at: new Date(Date.now() + 60 * 1000).toISOString(), // 60 seconds
        amount_limit: 500.00,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrData?.qr_code) return;
    
    const link = document.createElement('a');
    link.href = qrData.qr_code;
    link.download = `sara-qr-${qrData.transaction_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!qrData?.qr_code) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: t('saraPaymentQR'),
          text: t('scanToPayWithSARA'),
          url: qrData.qr_code,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(qrData.qr_code);
        alert(t('qrCodeCopied'));
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const formatExpiryTime = () => {
    if (timeRemaining <= 5) {
      return (
        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
          {timeRemaining} {t('secondsRemaining')}
        </span>
      );
    }
    return `${timeRemaining} ${t('secondsRemaining')}`;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <QrCode size={32} color="#3b82f6" />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
              {t('saraPaymentQR')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
              color: '#6b7280',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
              e.target.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#6b7280';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '32px', textAlign: 'center' }}>
          {loading ? (
            <div style={{ padding: '40px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto',
              }} />
              <p style={{ marginTop: '20px', fontSize: '18px', color: '#6b7280' }}>
                {t('generatingQR')}
              </p>
            </div>
          ) : error && !qrData ? (
            <div style={{ padding: '40px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <X size={40} color="#ef4444" />
              </div>
              <p style={{ fontSize: '18px', color: '#ef4444', marginBottom: '20px' }}>
                {t('qrGenerationFailed')}
              </p>
              <button
                onClick={generateQRCode}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {t('tryAgain')}
              </button>
            </div>
          ) : qrData ? (
            <>
              {/* QR Code Image */}
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px',
              }}>
                <img
                  src={qrData.qr_code}
                  alt="QR Code"
                  style={{
                    width: '280px',
                    height: '280px',
                    margin: '0 auto',
                    display: 'block',
                  }}
                />
              </div>

              {/* Instructions */}
              <div style={{
                backgroundColor: '#eff6ff',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                <p style={{ fontSize: '16px', color: '#1e40af', fontWeight: '600', marginBottom: '8px' }}>
                  {t('scanToPayWithSARA')}
                </p>
                <ul style={{ 
                  fontSize: '14px', 
                  color: '#3b82f6', 
                  margin: 0, 
                  paddingLeft: '20px',
                  lineHeight: '1.6',
                }}>
                  <li>{t('qrInstruction1')}</li>
                  <li>{t('qrInstruction2')}</li>
                  <li>{t('qrInstruction3')}</li>
                </ul>
              </div>

              {/* Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '24px',
                textAlign: 'left',
              }}>
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '12px',
                  borderRadius: '8px',
                }}>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    {t('transactionID')}
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: '600', margin: '4px 0 0 0' }}>
                    {qrData.transaction_id}
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '12px',
                  borderRadius: '8px',
                }}>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    {t('validFor')}
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: '600', margin: '4px 0 0 0' }}>
                    {formatExpiryTime()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={generateQRCode}
                  style={{
                    flex: 1,
                    padding: '16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                >
                  <RefreshCw size={20} />
                  {t('refresh')}
                </button>
                <button
                  onClick={handleDownload}
                  style={{
                    flex: 1,
                    padding: '16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                >
                  <Download size={20} />
                  {t('download')}
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    flex: 1,
                    padding: '16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                >
                  <Share2 size={20} />
                  {t('share')}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default QRCodeModal;
