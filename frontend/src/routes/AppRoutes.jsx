import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import AppShellLayout from '../layouts/AppShellLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import ChangePasswordPage from '../pages/auth/ChangePasswordPage';
import DashboardPlaceholder from '../pages/dashboard/DashboardPlaceholder';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';

// Phase 2 Admin Pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import LabManagementPage from '../pages/admin/LabManagementPage';
import SectionManagementPage from '../pages/admin/SectionManagementPage';
import TeacherManagementPage from '../pages/admin/TeacherManagementPage';
import StudentManagementPage from '../pages/admin/StudentManagementPage';
import LabAssignmentPage from '../pages/admin/LabAssignmentPage';

// Phase 3 Teacher & Student Pages
import TeacherLabDashboardPage from '../pages/teacher/TeacherLabDashboardPage';
import StudentLabDashboardPage from '../pages/student/StudentLabDashboardPage';
import LabDetailsPage from '../pages/common/LabDetailsPage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root / Public Pages */}
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

        {/* Authenticated Dashboard Default */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPlaceholder />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Phase 2: Admin Academic Structure Management Workspace */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN_HOD']}>
            <AppShellLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="labs" element={<LabManagementPage />} />
        <Route path="labs/:id" element={<LabDetailsPage />} />
        <Route path="sections" element={<SectionManagementPage />} />
        <Route path="teachers" element={<TeacherManagementPage />} />
        <Route path="students" element={<StudentManagementPage />} />
        <Route path="assignments" element={<LabAssignmentPage />} />
      </Route>

      {/* Phase 3: Teacher Laboratory Management & Assigned Labs Workspace */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['TEACHER']}>
            <AppShellLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/teacher/labs" replace />} />
        <Route path="labs" element={<TeacherLabDashboardPage />} />
        <Route path="labs/:id" element={<LabDetailsPage />} />
      </Route>

      {/* Phase 3: Student Laboratory Hub & Assigned Curriculum Workspace */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <AppShellLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/labs" replace />} />
        <Route path="labs" element={<StudentLabDashboardPage />} />
        <Route path="labs/:id" element={<LabDetailsPage />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;

