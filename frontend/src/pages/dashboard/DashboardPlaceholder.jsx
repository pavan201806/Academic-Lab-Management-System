import React from 'react';
import { useAuth } from '../../context/AuthContext';

const DashboardPlaceholder = () => {
  const { user, logout } = useAuth();

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            Welcome, {user?.name}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', margin: 0 }}>
            Session authenticated with verified role permissions.
          </p>
        </div>

        <button onClick={logout} className="btn btn-secondary">
          <span>🚪</span> Logout
        </button>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h2 style={{ fontSize: '1.125rem' }}>Authenticated Profile Data</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>User ID / Roll Number</span>
            <strong style={{ fontSize: '1.125rem', color: 'var(--color-primary)' }}>{user?.rollNumber}</strong>
          </div>

          <div style={{ padding: '0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>Assigned System Role</span>
            <span className={`badge ${getRoleBadgeClass(user?.role)}`} style={{ marginTop: '0.25rem' }}>
              {user?.role}
            </span>
          </div>

          <div style={{ padding: '0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>Section / Group</span>
            <strong style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>{user?.section || 'Institutional Faculty / Admin'}</strong>
          </div>

          <div style={{ padding: '0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>Account Status</span>
            <span className="badge badge-success" style={{ marginTop: '0.25rem' }}>Active</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-canvas)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            fontSize: '0.8125rem',
            fontFamily: 'var(--font-family-mono)'
          }}
        >
          <pre style={{ margin: 0, overflowX: 'auto' }}>{JSON.stringify(user, null, 2)}</pre>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          Phase 1 Authentication Status
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
          JWT authentication, password hashing with bcrypt, role-based protection, and first-time temporary password flows are active.
          Role-specific academic dashboards (Admin HOD, Teacher, Student) will be implemented in subsequent phases.
        </p>
      </div>
    </div>
  );
};

export default DashboardPlaceholder;
