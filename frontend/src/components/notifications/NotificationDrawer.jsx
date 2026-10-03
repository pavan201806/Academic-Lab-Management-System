import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';

const NotificationDrawer = ({ isOpen, onClose, onCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' or 'UNREAD'
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications();
      const data = res.data || res;
      const notifs = data.notifications || [];
      setNotifications(notifs);
      const count = data.unreadCount !== undefined ? data.unreadCount : notifs.filter((n) => !n.isRead).length;
      setUnreadCount(count);
      if (onCountChange) onCountChange(count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (onCountChange) onCountChange(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (onCountChange) onCountChange(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'DEADLINE':
        return 'badge-warning';
      case 'EXPERIMENT':
        return 'badge-info';
      case 'LAB':
        return 'badge-primary';
      case 'ANNOUNCEMENT':
        return 'badge-error';
      default:
        return 'badge-secondary';
    }
  };

  if (!isOpen) return null;

  const filteredNotifs = filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100vh',
          backgroundColor: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-surface-hover)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📢</span>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                Notifications Hub
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {unreadCount > 0 ? `${unreadCount} unread announcements` : 'All caught up'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Filter & Bulk Actions Bar */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-canvas)',
            fontSize: '0.8125rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={() => setFilter('ALL')}
              className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`btn ${filter === 'UNREAD' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', color: 'var(--color-primary)' }}
            >
              ✓ Mark All Read
            </button>
          )}
        </div>

        {/* Notification List Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading announcements...
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--color-border)'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
                {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications available'}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>
                You are all caught up with your lab announcements.
              </p>
            </div>
          ) : (
            filteredNotifs.map((notif) => (
              <div
                key={notif._id}
                onClick={() => {
                  setSelectedNotification(notif);
                  if (!notif.isRead && notif.isRead !== undefined) {
                    handleMarkAsRead(notif._id);
                  }
                }}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: notif.isRead ? 'var(--color-surface)' : 'var(--color-primary-subtle)',
                  border: notif.isRead ? '1px solid var(--color-border)' : '1px solid var(--color-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {!notif.isRead && notif.isRead !== undefined && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-error)'
                    }}
                    title="Unread"
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <span className={`badge ${getTypeBadgeClass(notif.type)}`} style={{ fontSize: '0.6875rem' }}>
                    {notif.type}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {new Date(notif.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--color-primary)' }}>
                  {notif.title}
                </h4>

                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-primary)',
                    margin: 0,
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {notif.message}
                </p>

                <div
                  style={{
                    marginTop: '0.625rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  <span>
                    By: <strong>{notif.createdBy?.name || 'Faculty Instructor'}</strong>
                  </span>
                  {!notif.isRead && notif.isRead !== undefined && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif._id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: 0
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Notification Detail Modal Preview */}
        {selectedNotification && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
            onClick={() => setSelectedNotification(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '520px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`badge ${getTypeBadgeClass(selectedNotification.type)}`}>
                  {selectedNotification.type}
                </span>
                <button
                  onClick={() => setSelectedNotification(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>
                  {selectedNotification.title}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Published {new Date(selectedNotification.createdAt).toLocaleString()} by{' '}
                  <strong>{selectedNotification.createdBy?.name || 'Faculty'}</strong>
                </p>
              </div>

              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--color-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--color-text-primary)'
                }}
              >
                {selectedNotification.message}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedNotification(null)} className="btn btn-primary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDrawer;
