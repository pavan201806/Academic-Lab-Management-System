import React from 'react';

const LoadingSpinner = ({ size = 24, text, message }) => {
  const displayText = text || message || 'Loading...';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
      <svg
        style={{
          width: size,
          height: size,
          animation: 'spin 1s linear infinite'
        }}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="var(--color-border)"
          strokeWidth="3"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {displayText && <span style={{ fontSize: '0.875rem' }}>{displayText}</span>}
    </div>
  );
};

export default LoadingSpinner;

