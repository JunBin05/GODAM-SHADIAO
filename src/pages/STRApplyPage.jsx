import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSTRApplication } from '../hooks/useAPI';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

function STRApplyPage() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1); // Steps 1-6
  const [childrenCount, setChildrenCount] = useState(0);
  
  const [formData, setFormData] = useState({
    applicant: {
      name: '',
      ic_number: '',
      marital_status: 'single',
      monthly_income: ''
    },
    spouse: {
      name: '',
      ic_number: ''
    },
    children: [],
    documents: {
      ic_copy: false,
      income_proof: false,
      marriage_cert: false
    },
    guardian: {
      name: '',
      relationship: '',
      phone: ''
    }
  });

  // API integration
  const { submitApplication, submitting } = useSTRApplication(currentLanguage);
  const [applicationResult, setApplicationResult] = useState(null);

  // Handle form field changes
  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleChildChange = (index, field, value) => {
    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setFormData(prev => ({ ...prev, children: newChildren }));
  };

  const handleChildrenCountChange = (count) => {
    const numCount = parseInt(count) || 0;
    setChildrenCount(numCount);
    const newChildren = Array(numCount).fill(null).map(() => ({ ic_number: '', name: '' }));
    setFormData(prev => ({ ...prev, children: newChildren }));
  };

  // Navigate between steps
  const nextStep = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const result = await submitApplication(formData);
      setApplicationResult(result);
    } catch (err) {
      console.error('Submission error:', err);
    }
  };

  // Render form content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Applicant Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Step 1: Applicant Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.applicant.name}
                onChange={(e) => handleInputChange('applicant', 'name', e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              />
              <input
                type="text"
                placeholder="IC Number (e.g., 900101-01-1234)"
                value={formData.applicant.ic_number}
                onChange={(e) => handleInputChange('applicant', 'ic_number', e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              />
              <select
                value={formData.applicant.marital_status}
                onChange={(e) => handleInputChange('applicant', 'marital_status', e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
              <input
                type="number"
                placeholder="Monthly Income (RM)"
                value={formData.applicant.monthly_income}
                onChange={(e) => handleInputChange('applicant', 'monthly_income', e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              />
            </div>
          </div>
        );

      case 2: // Spouse Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Step 2: Spouse Information</h3>
            {formData.applicant.marital_status === 'married' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                  type="text"
                  placeholder="Spouse Full Name"
                  value={formData.spouse.name}
                  onChange={(e) => handleInputChange('spouse', 'name', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
                <input
                  type="text"
                  placeholder="Spouse IC Number"
                  value={formData.spouse.ic_number}
                  onChange={(e) => handleInputChange('spouse', 'ic_number', e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
            ) : (
              <p style={{ color: '#6b7280' }}>No spouse information required for {formData.applicant.marital_status} status</p>
            )}
          </div>
        );

      case 3: // Children Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Step 3: Children Information</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', color: '#374151' }}>Number of Children (max 5):</label>
              <input
                type="number"
                min="0"
                max="5"
                value={childrenCount}
                onChange={(e) => handleChildrenCountChange(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
              />
            </div>
            {formData.children.map((child, index) => (
              <div key={index} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px', color: '#6b7280' }}>Child {index + 1}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Child Name"
                    value={child.name}
                    onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                  <input
                    type="text"
                    placeholder="Child IC Number"
                    value={child.ic_number}
                    onChange={(e) => handleChildChange(index, 'ic_number', e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 4: // Required Documents
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Step 4: Required Documents</h3>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>Please confirm you have these documents ready:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.documents.ic_copy}
                  onChange={(e) => handleInputChange('documents', 'ic_copy', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>IC Copy (MyKad)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.documents.income_proof}
                  onChange={(e) => handleInputChange('documents', 'income_proof', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>Proof of Income (Payslip/EPF Statement)</span>
              </label>
              {formData.applicant.marital_status === 'married' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.documents.marriage_cert}
                    onChange={(e) => handleInputChange('documents', 'marriage_cert', e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span>Marriage Certificate</span>
                </label>
              )}
            </div>
          </div>
        );

      case 5: // Guardian Information
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Step 5: Emergency Contact</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                type="text"
                placeholder="Guardian/Emergency Contact Name"
                value={formData.guardian.name}
                onChange={(e) => handleInputChange('guardian', 'name', e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              />
              <input
                type="text"
                placeholder="Relationship (e.g., Parent, Sibling)"
                value={formData.guardian.relationship}
                onChange={(e) => handleInputChange('guardian', 'relationship', e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.guardian.phone}
                onChange={(e) => handleInputChange('guardian', 'phone', e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
              />
            </div>
          </div>
        );

      case 6: // Review and Confirm
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Step 6: Review & Confirm</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px', color: '#374151' }}>Applicant</h4>
                <p>Name: {formData.applicant.name}</p>
                <p>IC: {formData.applicant.ic_number}</p>
                <p>Status: {formData.applicant.marital_status}</p>
                <p>Income: RM {formData.applicant.monthly_income}</p>
              </div>
              {formData.applicant.marital_status === 'married' && (
                <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#374151' }}>Spouse</h4>
                  <p>Name: {formData.spouse.name}</p>
                  <p>IC: {formData.spouse.ic_number}</p>
                </div>
              )}
              {formData.children.length > 0 && (
                <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#374151' }}>Children ({formData.children.length})</h4>
                  {formData.children.map((child, i) => (
                    <p key={i}>{i + 1}. {child.name} - {child.ic_number}</p>
                  ))}
                </div>
              )}
              {applicationResult && (
                <div style={{ padding: '20px', backgroundColor: '#d1fae5', borderRadius: '8px', border: '2px solid #10b981' }}>
                  <h4 style={{ marginBottom: '10px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Check size={24} /> Application Submitted Successfully!
                  </h4>
                  <p>Reference Number: {applicationResult.reference_number}</p>
                  <p>Status: {applicationResult.status}</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentStep / 6) * 100;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={() => navigate('/str')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--primary-color)',
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            <ChevronLeft size={20} /> Back to STR
          </button>
          <h1 style={{ fontSize: '2rem', color: '#1f2937', marginBottom: '10px' }}>STR Application</h1>
          <p style={{ color: '#6b7280' }}>Complete all 6 steps to submit your application</p>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Step {currentStep} of 6</span>
            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.3s' }}></div>
          </div>
        </div>

        {/* Form Content */}
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            style={{
              padding: '12px 24px',
              backgroundColor: currentStep === 1 ? '#e5e7eb' : 'white',
              border: '2px solid var(--primary-color)',
              borderRadius: '10px',
              color: 'var(--primary-color)',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ChevronLeft size={20} /> Previous
          </button>

          {currentStep < 6 ? (
            <button
              onClick={nextStep}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--primary-color)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Next <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || applicationResult}
              style={{
                padding: '12px 24px',
                backgroundColor: submitting || applicationResult ? '#9ca3af' : '#10b981',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: submitting || applicationResult ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Check size={20} /> {submitting ? 'Submitting...' : applicationResult ? 'Submitted' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default STRApplyPage;
