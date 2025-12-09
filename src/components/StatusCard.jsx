import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const StatusCard = ({ program, icon, onClick, type }) => {
  const { t } = useLanguage();
  
  if (!program) {
    return (
      <div 
        onClick={onClick}
        style={{
          backgroundColor: '#f9fafb',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          minHeight: '200px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '12px',
            borderRadius: '12px'
          }}>
            {icon}
          </div>
          <h3 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#6b7280',
            margin: 0 
          }}>
            {type === 'str' ? t('str') : t('sara')}
          </h3>
        </div>
        
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '18px'
        }}>
          {t('loadingData')}
        </div>
      </div>
    );
  }

  const isEnrolled = program.enrollment_status === 'enrolled';
  
  // Extract STR-specific data
  const monthlyAmount = program.monthly_benefit_amount || 0;
  const nextPaymentDate = program.next_payment_date ? 
    new Date(program.next_payment_date).toLocaleDateString('en-MY', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }) : null;
  
  // Extract SARA-specific data
  const oneOffBalance = program.one_off_balance || 0;
  const regularBalance = program.balance || 0;
  
  return (
    <div 
      onClick={onClick}
      style={{
        backgroundColor: isEnrolled ? '#f0fdf4' : '#f9fafb',
        border: `2px solid ${isEnrolled ? '#10b981' : '#e5e7eb'}`,
        borderRadius: '12px',
        padding: '24px',
        minHeight: '200px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          color: isEnrolled ? '#10b981' : '#6b7280',
          backgroundColor: isEnrolled ? '#dcfce7' : '#f3f4f6',
          padding: '12px',
          borderRadius: '12px'
        }}>
          {icon}
        </div>
        <h3 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          color: isEnrolled ? '#10b981' : '#6b7280',
          margin: 0 
        }}>
          {type === 'str' ? t('str') : t('sara')}
        </h3>
      </div>

      {/* Status Badge */}
      <div style={{
        display: 'inline-block',
        width: 'fit-content',
        padding: '6px 12px',
        borderRadius: '20px',
        backgroundColor: isEnrolled ? '#10b981' : '#6b7280',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        {isEnrolled ? t('enrolled') : t('notEnrolled')}
      </div>

      {/* STR-specific content */}
      {type === 'str' && isEnrolled && (
        <>
          <div style={{ marginTop: '8px' }}>
            <p style={{ 
              fontSize: '16px', 
              color: '#6b7280', 
              margin: '0 0 4px 0' 
            }}>
              {t('monthlyBenefit')}
            </p>
            <p style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#10b981',
              margin: 0 
            }}>
              RM {monthlyAmount.toFixed(2)}
            </p>
          </div>
          
          {nextPaymentDate && (
            <div style={{ marginTop: '4px' }}>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: 0 
              }}>
                {t('nextPayment')}: <span style={{ fontWeight: '600' }}>{nextPaymentDate}</span>
              </p>
            </div>
          )}
        </>
      )}

      {/* SARA-specific content */}
      {type === 'sara' && isEnrolled && (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px',
            marginTop: '8px'
          }}>
            <div>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0 0 4px 0' 
              }}>
                {t('oneOffBalance')}
              </p>
              <p style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#10b981',
                margin: 0 
              }}>
                RM {oneOffBalance.toFixed(2)}
              </p>
            </div>
            
            <div>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0 0 4px 0' 
              }}>
                {t('regularBalance')}
              </p>
              <p style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#10b981',
                margin: 0 
              }}>
                RM {regularBalance.toFixed(2)}
              </p>
            </div>
          </div>
          
          <div style={{ marginTop: '8px' }}>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280', 
              margin: 0 
            }}>
              {t('totalStores')}: <span style={{ fontWeight: '600' }}>84,727</span>
            </p>
          </div>
        </>
      )}

      {/* Not enrolled message */}
      {!isEnrolled && (
        <div style={{ 
          marginTop: '8px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <p style={{ 
            fontSize: '16px', 
            color: '#6b7280',
            margin: 0 
          }}>
            {type === 'str' 
              ? t('strNotEnrolledMsg') || 'You are not enrolled in STR. Click to learn more.'
              : t('saraNotEnrolledMsg') || 'You are not enrolled in SARA. Click to learn more.'
            }
          </p>
        </div>
      )}

      {/* Click to view more */}
      <div style={{ 
        marginTop: 'auto',
        paddingTop: '12px',
        fontSize: '14px',
        color: isEnrolled ? '#10b981' : '#6b7280',
        fontWeight: '600',
        textAlign: 'right'
      }}>
        {t('tapToViewMore')} →
      </div>
    </div>
  );
};

export default StatusCard;
