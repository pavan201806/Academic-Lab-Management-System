import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 1rem',
        gap: '1rem'
      }}
    >
      <h1 style={{ fontSize: '3rem', color: 'var(--color-primary)' }}>404</h1>
      <h2 style={{ fontSize: '1.25rem' }}>Page Not Found</h2>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
        The requested page does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
