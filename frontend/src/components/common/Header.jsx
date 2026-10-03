import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN_HOD':
        return 'badge-error';
      case 'TEACHER':
        return 'badge-info';
      case 'STUDENT':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

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
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '1.25rem'
          }}
        >
          ⚗
        </div>
        <div>
          <Link
            to="/"
            style={{
              fontWeight: 700,
              fontSize: '1.0625rem',
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
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {user.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>
                <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                  {user.rollNumber}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-info">Phase 1 Auth Active</span>
            <Link to="/login" className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}>
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
