import React, { useState, useEffect } from 'react';
import { Users, Plus, X, User, Check, Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FamilyDock = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [newIc, setNewIc] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user and their data
  useEffect(() => {
    const loadData = () => {
      const storedUser = localStorage.getItem('registeredUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        
        // Load confirmed members for this specific user
        const userMembers = localStorage.getItem(`family_members_${user.icNumber}`);
        if (userMembers) {
          setMembers(JSON.parse(userMembers));
        } else {
          setMembers([]);
        }

        // Load pending requests for this user
        const allRequests = JSON.parse(localStorage.getItem('family_requests') || '[]');
        const myRequests = allRequests.filter(req => req.toIc === user.icNumber && req.status === 'pending');
        setRequests(myRequests);
      }
    };

    loadData();
    
    // Poll for changes (since we don't have real-time sockets)
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSendRequest = () => {
    if (!newIc || !currentUser) return;
    
    // Check if already a member
    if (members.some(m => m.ic === newIc)) {
      alert("This user is already in your family list.");
      return;
    }

    // Create request
    const newRequest = {
      id: Date.now(),
      fromIc: currentUser.icNumber,
      fromName: currentUser.name,
      toIc: newIc,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    const allRequests = JSON.parse(localStorage.getItem('family_requests') || '[]');
    
    // Check if request already exists
    const existing = allRequests.find(r => r.fromIc === currentUser.icNumber && r.toIc === newIc && r.status === 'pending');
    if (existing) {
      alert("Request already sent.");
      return;
    }

    allRequests.push(newRequest);
    localStorage.setItem('family_requests', JSON.stringify(allRequests));
    
    alert(`Request sent to IC: ${newIc}`);
    setNewIc('');
  };

  const handleAccept = (request) => {
    // 1. Add requester to my list
    const newMemberForMe = { name: request.fromName, ic: request.fromIc };
    const myUpdatedMembers = [...members, newMemberForMe];
    setMembers(myUpdatedMembers);
    localStorage.setItem(`family_members_${currentUser.icNumber}`, JSON.stringify(myUpdatedMembers));

    // 2. Add me to requester's list (Bidirectional)
    const requesterMembersKey = `family_members_${request.fromIc}`;
    const requesterMembers = JSON.parse(localStorage.getItem(requesterMembersKey) || '[]');
    const newMemberForThem = { name: currentUser.name, ic: currentUser.icNumber };
    
    // Avoid duplicates
    if (!requesterMembers.some(m => m.ic === currentUser.icNumber)) {
      requesterMembers.push(newMemberForThem);
      localStorage.setItem(requesterMembersKey, JSON.stringify(requesterMembers));
    }

    // 3. Remove request
    const allRequests = JSON.parse(localStorage.getItem('family_requests') || '[]');
    const updatedRequests = allRequests.filter(r => r.id !== request.id);
    localStorage.setItem('family_requests', JSON.stringify(updatedRequests));
    
    // Update local state
    setRequests(requests.filter(r => r.id !== request.id));
  };

  const handleReject = (requestId) => {
    const allRequests = JSON.parse(localStorage.getItem('family_requests') || '[]');
    const updatedRequests = allRequests.filter(r => r.id !== requestId);
    localStorage.setItem('family_requests', JSON.stringify(updatedRequests));
    
    setRequests(requests.filter(r => r.id !== requestId));
  };

  return (
    <div className="family-dock-container" style={{ position: 'fixed', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      
      {isOpen && (
        <div style={{
          marginBottom: '15px',
          backgroundColor: 'white',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          width: '320px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ padding: '15px', backgroundColor: '#2563eb', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>My Family</h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px' }}>
            
            {/* Pending Requests Section */}
            {requests.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px', paddingLeft: '5px' }}>
                  PENDING REQUESTS ({requests.length})
                </div>
                {requests.map((req) => (
                  <div key={req.id} style={{ 
                    backgroundColor: '#fef2f2', 
                    border: '1px solid #fecaca', 
                    borderRadius: '8px', 
                    padding: '10px', 
                    marginBottom: '8px' 
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '4px' }}>{req.fromName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>IC: {req.fromIc}</div>
                    <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '10px' }}>Is this your family member?</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleAccept(req)}
                        style={{ 
                          flex: 1, 
                          backgroundColor: '#22c55e', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '6px', 
                          padding: '6px', 
                          cursor: 'pointer',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <Check size={16} /> Yes
                      </button>
                      <button 
                        onClick={() => handleReject(req.id)}
                        style={{ 
                          flex: 1, 
                          backgroundColor: '#ef4444', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '6px', 
                          padding: '6px', 
                          cursor: 'pointer',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <X size={16} /> No
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '10px 0' }}></div>
              </div>
            )}

            {/* Family List */}
            {members.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', padding: '20px' }}>No family members added yet.</p>
            ) : (
              members.map((member, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ backgroundColor: '#e0f2fe', padding: '8px', borderRadius: '50%', flexShrink: 0 }}>
                    <User size={20} color="#0284c7" />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{member.ic}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '15px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Enter IC Number" 
                value={newIc}
                onChange={(e) => setNewIc(e.target.value)}
                style={{ 
                  flex: 1, 
                  padding: '8px', 
                  borderRadius: '6px', 
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <button 
                onClick={handleSendRequest}
                style={{ 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#2563eb', 
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Users size={28} />
        </button>
        
        {/* Notification Badge */}
        {requests.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            border: '2px solid white',
            animation: 'pulse 2s infinite'
          }}>
            {requests.length}
          </div>
        )}
      </div>
      
      <style>{`
        .family-dock-container {
          bottom: 50px;
          left: 30px;
        }

        @media (max-width: 768px) {
          .family-dock-container {
            bottom: 180px;
            left: 20px;
          }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default FamilyDock;
