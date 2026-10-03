import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationDrawer from '../components/notifications/NotificationDrawer';
import { notificationService } from '../services/notificationService';

const AppShellLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  }, [user, location.pathname]);

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
        return 'badge-neutral';
    }
  };

  const getNavItemsForRole = (role) => {
    switch (role) {
      case 'ADMIN_HOD':
        return [
          { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
          { label: 'Laboratories', path: '/admin/labs', icon: 'biotech' },
          { label: 'Sections & Cohorts', path: '/admin/sections', icon: 'groups' },
          { label: 'Faculty / Teachers', path: '/admin/teachers', icon: 'school' },
          { label: 'Students Roster', path: '/admin/students', icon: 'badge' },
          { label: 'Lab Assignments', path: '/admin/assignments', icon: 'hub' },
          { label: 'Announcements', path: '/admin/notifications', icon: 'campaign' },
          { label: 'Reports & Export', path: '/admin/reports', icon: 'analytics' }
        ];
      case 'TEACHER':
        return [
          { label: 'My Laboratories', path: '/teacher/labs', icon: 'biotech' },
          { label: 'Announcements', path: '/teacher/notifications', icon: 'campaign' },
          { label: 'Reports & Export', path: '/teacher/reports', icon: 'analytics' }
        ];
      case 'STUDENT':
        return [
          { label: 'Assigned Laboratories', path: '/student/labs', icon: 'science' },
          { label: 'Academic Reports', path: '/student/reports', icon: 'analytics' }
        ];
      default:
        return [];
    }
  };

  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Overview & Analytics';
    if (path.includes('/assignments')) return 'Lab Assignments';
    if (path.includes('/sections')) return 'Sections & Cohorts';
    if (path.includes('/teachers')) return 'Faculty Management';
    if (path.includes('/students')) return 'Student Roster';
    if (path.includes('/notifications')) return 'Announcements';
    if (path.includes('/reports')) return 'Academic Reports';
    if (path.includes('/experiments/')) return 'Experiment Workspace';
    if (path.includes('/experiments')) return 'Experiment Authoring';
    if (path.includes('/pdf-extract')) return 'PDF Syllabus Ingestion';
    if (path.includes('/submissions')) return 'Submissions Ledger';
    if (path.includes('/labs/')) return 'Lab Curriculum & Details';
    if (path.includes('/labs')) return 'Assigned Laboratories';
    return user?.role === 'ADMIN_HOD' ? 'Admin Console' : user?.role === 'TEACHER' ? 'Faculty Hub' : 'Student Hub';
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
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          boxShadow: 'var(--shadow-sm)',
          flexShrink: 0
        }}
      >
        <div style={{ padding: '1rem', overflowY: 'auto' }}>
          {/* Logo & Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              marginBottom: '1.25rem',
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
                  flexShrink: 0
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>science</span>
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
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isCollapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: isCollapsed ? '0.625rem 0' : '0.625rem 0.875rem',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease'
                })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Card in Rail */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
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
              style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
              <span>Portal</span>
            </Link>
            <span>&rsaquo;</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {user?.role === 'ADMIN_HOD' ? 'Admin' : user?.role === 'TEACHER' ? 'Faculty' : 'Student'}
            </span>
            <span>&rsaquo;</span>
            <strong style={{ color: 'var(--color-primary)' }}>
              {getBreadcrumbTitle()}
            </strong>
          </div>

          {/* Right Header Cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
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
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>notifications</span>
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

            <span className="badge badge-info" style={{ fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>verified_user</span>
              ISO 27001 SECURED
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
              <span>Sign Out</span>
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
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <span>Academic Lab Management System &copy; {new Date().getFullYear()} &mdash; Collegiate Laboratory Portal</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }}></span>
            <span>Department Matrix Core v2.0 Active</span>
          </span>
        </footer>
      </div>
    </div>
  );
};

export default AppShellLayout;

