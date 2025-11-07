import React from 'react';

const LoadingSpinner = ({ 
  small = false, 
  overlay = false, 
  text = "Chargement..." 
}) => {
  const spinner = (
    <div className={`d-flex justify-content-center align-items-center ${overlay ? '' : small ? '' : 'min-vh-100'}`}>
      <div className={`spinner-border ${small ? 'spinner-border-sm' : ''} text-primary`} role="status">
        <span className="visually-hidden">Chargement...</span>
      </div>
      {text && !small && <span className="ms-2">{text}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;