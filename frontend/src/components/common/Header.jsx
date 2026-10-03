import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.875rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '1rem'
          }}
        >
          ⚗
        </div>
        <div>
          <Link
            to="/"
            style={{
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--color-primary)',
              textDecoration: 'none',
              letterSpacing: '-0.01em'
            }}
          >
            Academic Lab Management System
          </Link>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Digital College Laboratory Platform
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span className="badge badge-info">Phase 0 — Foundation</span>
      </div>
    </header>
  );
};

export default Header;
