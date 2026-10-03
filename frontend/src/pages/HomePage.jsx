import React from 'react';
import { useHealth } from '../hooks/useHealth';
import LoadingSpinner from '../components/common/LoadingSpinner';

const HomePage = () => {
  const { data, loading, error, refetch } = useHealth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Academic Lab Management System
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
          Phase 0 Foundation verification and system health dashboard.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem' }}>Backend API Health Status</h2>
          <button onClick={refetch} className="btn btn-secondary" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
            Check Again
          </button>
        </div>

        {loading && (
          <div style={{ padding: '1rem 0' }}>
            <LoadingSpinner text="Checking API health status..." />
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-error-bg)',
              border: '1px solid var(--color-error-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)'
            }}
          >
            <strong>Connection Notice:</strong> {error}
            <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>
              Make sure the backend Express server is running on port 5000.
            </div>
          </div>
        )}

        {data && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge badge-success">API Online</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{data.service}</span>
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
              <pre style={{ margin: 0, overflowX: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem' }}>Architecture Foundation Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)'
            }}
          >
            <h3 style={{ fontSize: '0.9375rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              Frontend Stack
            </h3>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>React + Vite</li>
              <li>React Router DOM</li>
              <li>Axios with Interceptors</li>
              <li>Stitch Design System Tokens</li>
            </ul>
          </div>

          <div
            style={{
              padding: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)'
            }}
          >
            <h3 style={{ fontSize: '0.9375rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              Backend Stack
            </h3>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>Node.js + Express</li>
              <li>MongoDB + Mongoose Layer</li>
              <li>Centralized Error Handling</li>
              <li>RESTful API Architecture</li>
            </ul>
          </div>

          <div
            style={{
              padding: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)'
            }}
          >
            <h3 style={{ fontSize: '0.9375rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              System Roles
            </h3>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>ADMIN_HOD</li>
              <li>TEACHER (Main &amp; Assistant assignments)</li>
              <li>STUDENT</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
