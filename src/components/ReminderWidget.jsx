import React from 'react';
import { Bell, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ReminderWidget = ({ reminders, onViewAll }) => {
  const { t } = useLanguage();

  // Helper function to format date in human-readable format
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
      return <AlertCircle size={16} color="#ef4444" />;
    }
    return null;
  };

  if (!reminders || reminders.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151',
          marginTop: 0,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Bell size={24} color="#6b7280" />
          {t('upcomingReminders')}
        </h3>
        <p style={{
          color: '#9ca3af',
          fontSize: '16px',
          textAlign: 'center',
          margin: '20px 0'
        }}>
          {t('noReminders') || 'No reminders at this time'}
        </p>
      </div>
    );
  }

  // Show only top 3 reminders
  const displayReminders = reminders.slice(0, 3);

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#374151',
        marginTop: 0,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Bell size={24} color="#6b7280" />
        {t('upcomingReminders')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayReminders.map((reminder) => {
          const categoryStyle = getCategoryColor(reminder.category);
          
          return (
            <div
              key={reminder.id}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${categoryStyle.border}`,
                backgroundColor: categoryStyle.bg,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              {/* Header: Title and Priority */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: categoryStyle.color,
                  margin: 0,
                  flex: 1
                }}>
                  {reminder.title}
                </h4>
                {getPriorityIcon(reminder.priority)}
              </div>

              {/* Message */}
              <p style={{
                fontSize: '16px',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {reminder.message}
              </p>

              {/* Footer: Category, Date, Time */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '4px'
              }}>
                {/* Category Badge */}
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: categoryStyle.color,
                  backgroundColor: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  textTransform: 'capitalize'
                }}>
                  {reminder.category}
                </span>

                {/* Due Date */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  <Calendar size={14} />
                  {formatDate(reminder.due_date)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Button */}
      {reminders.length > 3 && (
        <button
          onClick={onViewAll}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '12px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#4b5563',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          {t('viewAllReminders')} ({reminders.length})
        </button>
      )}
    </div>
  );
};

export default ReminderWidget;
