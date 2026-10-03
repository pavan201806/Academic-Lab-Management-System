import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProtectedRoute = ({ children, allowedRoles = null, allowPendingPasswordChange = false }) => {
  const { user, isAuthenticated, loading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingSpinner size={32} text="Verifying authentication session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user has a temporary password, block access to regular pages and force redirect to /change-password
  if (mustChangePassword && !allowPendingPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  // Role authorization check
  if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '2.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⛔</div>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>
          403 — Unauthorized Access
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Your account role (<strong style={{ color: 'var(--color-primary)' }}>{user.role}</strong>) does not have permission to view this resource.
        </p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
