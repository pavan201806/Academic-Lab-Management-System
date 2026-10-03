import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading, mustChangePassword } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingSpinner size={32} text="Loading portal..." />
      </div>
    );
  }

  if (isAuthenticated) {
    if (mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicOnlyRoute;
