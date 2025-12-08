import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const ProgressBar = ({ currentStep, totalSteps = 4, onStepClick }) => {
  const { t } = useLanguage();
  
  const stepLabels = [
    t('scanIC'),
    t('scanFace'),
    t('recordVoice'),
    t('confirmation')
  ];

  return (
    <div className="progress-bar-container">
      <div className="progress-line-bg"></div>
      <div 
        className="progress-line-fill" 
        style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
      ></div>
      
      <div className="steps-wrapper">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          const isClickable = stepNum < currentStep;
          
          return (
            <div 
              key={stepNum} 
              className={`step-item ${isClickable ? 'clickable' : ''}`}
              onClick={() => isClickable && onStepClick && onStepClick(stepNum)}
            >
              <div 
                className={`step-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                {isCompleted ? '✓' : stepNum}
              </div>
              <div className={`step-label ${isActive ? 'active' : ''}`}>
                {stepLabels[index]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;