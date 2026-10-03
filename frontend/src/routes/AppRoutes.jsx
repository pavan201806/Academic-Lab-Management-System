import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import ChangePasswordPage from '../pages/auth/ChangePasswordPage';
import DashboardPlaceholder from '../pages/dashboard/DashboardPlaceholder';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        {/* Public Landing */}
        <Route index element={<HomePage />} />

        {/* Public Auth Routes */}
        <Route
          path="login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />

        {/* First-time Temporary Password Security Gate */}
        <Route
          path="change-password"
          element={
            <ProtectedRoute allowPendingPasswordChange={true}>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        {/* Authenticated Dashboard */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPlaceholder />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
