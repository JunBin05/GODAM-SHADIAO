import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Bell, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';
import FamilyDock from '../components/FamilyDock';
import { useReminders } from '../hooks/useAPI';

const RemindersPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [userData, setUserData] = useState(null);
  const [userId, setUserId] = useState(null);
  
  const { reminders, loading, markAsRead } = useReminders(userId, language);

  // Mock reminders for demonstration (same as MainPage)
  const mockReminders = [
    {
      id: 'REM001',
      title: 'STR Payment Incoming',
      message: 'Your STR monthly payment of RM 350 will be deposited to your bank account soon.',
      category: 'payment',
      priority: 'high',
      due_date: '2025-12-15T00:00:00',
      is_read: false
    },
    {
      id: 'REM002',
      title: 'Document Renewal Required',
      message: 'Your MyKad needs to be renewed. Please visit the nearest JPN branch.',
      category: 'document',
      priority: 'medium',
      due_date: '2025-12-20T00:00:00',
      is_read: false
    },
    {
      id: 'REM003',
      title: 'BSN Branch Appointment',
      message: 'Your appointment at BSN Kuala Lumpur branch is scheduled.',
      category: 'appointment',
      priority: 'medium',
      due_date: '2025-12-10T10:00:00',
      is_read: true
    },
    {
      id: 'REM004',
      title: 'SARA Balance Expiring',
      message: 'You have RM 50 in SARA balance that will expire at the end of the month.',
      category: 'payment',
      priority: 'medium',
      due_date: '2025-12-31T00:00:00',
      is_read: false
    }
  ];

  const displayReminders = reminders && reminders.length > 0 ? reminders : mockReminders;

  useEffect(() => {
    const storedUser = localStorage.getItem('registeredUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
      setUserId('USR001');
    }
  }, []);

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('today') || 'Today';
    if (diffDays === 1) return t('tomorrow') || 'Tomorrow';
    if (diffDays < 0) return t('overdue') || 'Overdue';
    if (diffDays <= 7) return `${t('in') || 'In'} ${diffDays} ${t('days') || 'days'}`;
    
    return date.toLocaleDateString('en-MY', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Category colors
  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'payment':
        return { bg: '#dbeafe', color: '#1e40af', border: '#3b82f6' };
      case 'document':
        return { bg: '#fef3c7', color: '#92400e', border: '#f59e0b' };
      case 'appointment':
        return { bg: '#ede9fe', color: '#5b21b6', border: '#8b5cf6' };
      default:
        return { bg: '#f3f4f6', color: '#374151', border: '#9ca3af' };
    }
  };

  // Priority indicator
  const getPriorityIcon = (priority) => {
    if (priority === 'high') {
      return <AlertCircle size={20} color="#ef4444" />;
    }
    return null;
  };

  const handleMarkAsRead = async (reminderId) => {
    try {
      await markAsRead(reminderId);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header className="landing-header" style={{ flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => navigate('/main')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '8px'
            }}
          >
            <ArrowLeft size={24} color="black" />
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

      {/* Main Content */}
      <main className="page-content" style={{ 
        justifyContent: 'flex-start', 
        paddingTop: '30px', 
        paddingBottom: '100px', 
        width: '100%', 
        maxWidth: '1000px', 
        margin: '0 auto',
        overflowY: 'auto'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '30px'
        }}>
          <Bell size={32} color="#6b7280" />
          <h1 style={{ fontSize: '2.5rem', color: '#2563eb', marginTop: '0', marginBottom: '0' }}>
            {t('upcomingReminders')}
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            <p style={{ fontSize: '1.2rem' }}>{t('loadingData')}</p>
          </div>
        ) : displayReminders.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <Bell size={64} color="#d1d5db" style={{ marginBottom: '20px' }} />
            <p style={{ fontSize: '1.5rem', color: '#9ca3af', margin: 0 }}>
              {t('noReminders')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayReminders.map((reminder) => {
              const categoryStyle = getCategoryColor(reminder.category);
              
              return (
                <div
                  key={reminder.id}
                  style={{
                    padding: '24px',
                    borderRadius: '12px',
                    border: `2px solid ${categoryStyle.border}`,
                    backgroundColor: reminder.is_read ? '#f9fafb' : categoryStyle.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    opacity: reminder.is_read ? 0.7 : 1
                  }}
                >
                  {/* Header: Title, Priority, Status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <h3 style={{
                        fontSize: '22px',
                        fontWeight: '600',
                        color: categoryStyle.color,
                        margin: 0
                      }}>
                        {reminder.title}
                      </h3>
                      {getPriorityIcon(reminder.priority)}
                    </div>
                    {reminder.is_read && (
                      <CheckCircle size={24} color="#10b981" />
                    )}
                  </div>

                  {/* Message */}
                  <p style={{
                    fontSize: '18px',
                    color: '#4b5563',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    {reminder.message}
                  </p>

                  {/* Footer: Category, Date, Actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginTop: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Category Badge */}
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: categoryStyle.color,
                        backgroundColor: 'white',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        textTransform: 'capitalize',
                        border: `1px solid ${categoryStyle.border}`
                      }}>
                        {reminder.category}
                      </span>

                      {/* Due Date */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '16px',
                        color: '#6b7280'
                      }}>
                        <Calendar size={16} />
                        {formatDate(reminder.due_date)}
                      </div>
                    </div>

                    {/* Mark as Read Button */}
                    {!reminder.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(reminder.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'white',
                          border: `1px solid ${categoryStyle.border}`,
                          borderRadius: '8px',
                          color: categoryStyle.color,
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = categoryStyle.bg;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                        }}
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Family Dock */}
      <FamilyDock />
    </div>
  );
};

export default RemindersPage;
