import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationDrawer from '../components/notifications/NotificationDrawer';
import { notificationService } from '../services/notificationService';

const AppShellLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      notificationService.getNotifications()
        .then((res) => {
          const data = res.data || res;
          const count = data.unreadCount !== undefined ? data.unreadCount : (data.notifications || []).filter((n) => !n.isRead).length;
          setUnreadCount(count);
        })
        .catch((err) => console.warn('Notification fetch warning:', err));
    }
  }, [user]);

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

  const getNavItemsForRole = (role) => {
    switch (role) {
      case 'ADMIN_HOD':
        return [
          { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
          { label: 'Laboratories', path: '/admin/labs', icon: '⚗️' },
          { label: 'Sections & Cohorts', path: '/admin/sections', icon: '👥' },
          { label: 'Faculty / Teachers', path: '/admin/teachers', icon: '👨‍🏫' },
          { label: 'Students Roster', path: '/admin/students', icon: '🎓' },
          { label: 'Lab Assignments', path: '/admin/assignments', icon: '🔗' },
          { label: 'Announcements', path: '/admin/notifications', icon: '📢' },
          { label: 'Reports & Export', path: '/admin/reports', icon: '📄' }
        ];
      case 'TEACHER':
        return [
          { label: 'My Laboratories', path: '/teacher/labs', icon: '⚗️' },
          { label: 'Announcements', path: '/teacher/notifications', icon: '📢' },
          { label: 'Reports & Export', path: '/teacher/reports', icon: '📄' }
        ];
      case 'STUDENT':
        return [
          { label: 'Assigned Laboratories', path: '/student/labs', icon: '📚' },
          { label: 'Academic Reports', path: '/student/reports', icon: '📄' }
        ];
      default:
        return [];
    }
  };


  const navItems = getNavItemsForRole(user?.role);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-canvas)' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: isCollapsed ? '72px' : '260px',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 0.25s ease',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ padding: '1rem' }}>
          {/* Logo & Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              marginBottom: '1.5rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--color-border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
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
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                ⚗
              </div>
              {!isCollapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)', display: 'block', lineHeight: 1.2 }}>
                    Apex STEM Labs
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                    Academic Console
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                padding: '0.25rem',
                borderRadius: 'var(--radius-sm)'
              }}
              title="Toggle Navigation"
            >
              {isCollapsed ? '▶' : '◀'}
            </button>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease'
                })}
              >
                <span style={{ fontSize: '1.125rem' }}>{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Card in Rail */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            {!isCollapsed && (
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.name}
                </span>
                <span className={`badge ${getRoleBadgeClass(user?.role)}`} style={{ fontSize: '0.625rem' }}>
                  {user?.role}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            height: '56px',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {/* Breadcrumb / Section context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            <Link
              to={user?.role === 'ADMIN_HOD' ? '/admin/dashboard' : user?.role === 'TEACHER' ? '/teacher/labs' : '/student/labs'}
              style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
            >
              Portal
            </Link>
            <span>&rsaquo;</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Laboratories</span>
            <span>&rsaquo;</span>
            <strong style={{ color: 'var(--color-primary)' }}>
              {user?.role === 'ADMIN_HOD' ? 'Administration Console' : user?.role === 'TEACHER' ? 'Faculty Hub' : 'Student Hub'}
            </strong>
          </div>

          {/* Right Header Cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Notification Bell Action */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              style={{
                position: 'relative',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.375rem 0.625rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: 'var(--color-primary)',
                fontSize: '0.875rem'
              }}
              title="View Announcements & Notifications"
            >
              <span>🔔</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--color-error)',
                    color: '#fff',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
              ISO 27001 SECURED
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main style={{ flex: 1, padding: '1.5rem', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>

        {/* Notification Drawer Modal */}
        <NotificationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onCountChange={(newCount) => setUnreadCount(newCount)}
        />

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            padding: '0.75rem 1.5rem',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>Academic Lab Management System &copy; {new Date().getFullYear()} &mdash; Phase 2 Academic Administration</span>
          <span>Department Matrix Core v2.0</span>
        </footer>
      </div>
    </div>
  );
};

export default AppShellLayout;
