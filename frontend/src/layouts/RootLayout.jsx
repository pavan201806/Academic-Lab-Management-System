import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header';

const RootLayout = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-canvas)' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <Outlet />
      </main>
      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          padding: '1rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)'
        }}
      >
        Academic Lab Management System &copy; {new Date().getFullYear()} &mdash; Phase 0 Foundation
      </footer>
    </div>
  );
};

export default RootLayout;
