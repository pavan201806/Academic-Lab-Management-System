import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { labService } from '../../services/labService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TeacherNotificationsPage = () => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [assignedLabs, setAssignedLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('GENERAL');
  const [targetType, setTargetType] = useState('LAB');
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Deletion Modal State
  const [deletingNotification, setDeletingNotification] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Inspection Modal State
  const [inspectingNotification, setInspectingNotification] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [notifsRes, labsRes] = await Promise.all([
        notificationService.getNotifications(),
        labService.getAssignedLabs()
      ]);

      const notifsData = notifsRes.data?.notifications || notifsRes.notifications || notifsRes.data || [];
      setNotifications(Array.isArray(notifsData) ? notifsData : []);

      const labsData = labsRes.data || labsRes || [];
      const labsList = Array.isArray(labsData) ? labsData : [];
      setAssignedLabs(labsList);
      if (labsList.length > 0 && !selectedLabId) {
        setSelectedLabId(labsList[0]._id);
      }
    } catch (err) {
      console.error('Failed to load notifications or labs:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type,
        targetType
      };

      if (targetType === 'LAB') {
        payload.targetLabs = selectedLabId ? [selectedLabId] : assignedLabs.map((l) => l._id);
      } else if (targetType === 'SECTION') {
        if (selectedSectionId) {
          payload.targetSections = [selectedSectionId];
        } else {
          payload.targetType = 'LAB';
          payload.targetLabs = selectedLabId ? [selectedLabId] : assignedLabs.map((l) => l._id);
        }
      }

      await notificationService.createNotification(payload);

      setSuccessMsg('Notification published successfully to enrolled student cohort.');
      setTitle('');
      setMessage('');
      setIsCreating(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create notification:', err);
      setError(err.response?.data?.message || 'Failed to broadcast notification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotification = async () => {
    if (!deletingNotification) return;
    setDeleting(true);
    setError('');
    try {
      await notificationService.deleteNotification(deletingNotification._id);
      setSuccessMsg('Notification deleted successfully.');
      setDeletingNotification(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError(err.response?.data?.message || 'Failed to delete notification');
    } finally {
      setDeleting(false);
    }
  };

  const getTypeBadge = (nType) => {
    switch (nType) {
      case 'DEADLINE':
        return <span className="badge badge-warning">⏱ DEADLINE</span>;
      case 'EXPERIMENT':
        return <span className="badge badge-info">🔬 EXPERIMENT</span>;
      case 'LAB':
        return <span className="badge badge-primary">⚗ LAB NOTICE</span>;
      case 'ANNOUNCEMENT':
        return <span className="badge badge-error">📢 ANNOUNCEMENT</span>;
      default:
        return <span className="badge badge-secondary">GENERAL</span>;
    }
  };

  const getTargetSummary = (notif) => {
    if (notif.targetType === 'ALL_STUDENTS') return 'All Students';
    if (notif.targetType === 'LAB') {
      const labNames = (notif.targetLabs || []).map((l) => l.name || l.code || 'Assigned Lab').join(', ');
      return labNames || 'Assigned Laboratories';
    }
    if (notif.targetType === 'SECTION') {
      const secNames = (notif.targetSections || []).map((s) => s.sectionCode || s.name || 'Section').join(', ');
      return secNames || 'Assigned Sections';
    }
    if (notif.targetType === 'INDIVIDUAL') {
      return `${(notif.targetStudents || []).length} Individual Students`;
    }
    return notif.targetType;
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Loading notifications and broadcasting ledger..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Banner */}
      {successMsg && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#e6f4ea',
            border: '1px solid rgba(52, 168, 83, 0.3)',
            color: '#137333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', color: '#137333', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-error-subtle)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem'
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--color-surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-primary)' }}>
              Notifications Management &amp; Broadcaster
            </h1>
            <span className="badge badge-info" style={{ fontWeight: 700 }}>
              FACULTY CONSOLE
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
            Author, broadcast, and audit academic notices for laboratory student cohorts.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>{isCreating ? '✕ Close Form' : '+ Create Notification'}</span>
        </button>
      </div>

      {/* KPI Metric Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            📢
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {notifications.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              ACTIVE NOTICES
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            ⚗
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7' }}>
              {assignedLabs.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              AUTHORIZED LABS
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(5, 150, 105, 0.1)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            👥
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>
              All Enrolled Cohorts
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              BROADCAST REACH
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Ledger & Optional Create Drawer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCreating ? '1.2fr 1fr' : '1fr',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* Ledger Table Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-surface-hover)'
            }}
          >
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
              Active Announcements Ledger
            </h2>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Showing {notifications.length} records
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Notification Title</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Target Audience</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Created Date</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No announcements posted yet. Click <strong>+ Create Notification</strong> to broadcast one.
                    </td>
                  </tr>
                ) : (
                  notifications.map((notif) => (
                    <tr
                      key={notif._id}
                      style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s' }}
                      className="hover-row"
                    >
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {notif.title}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {notif.message}
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {getTypeBadge(notif.type)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span
                          className="badge badge-secondary"
                          style={{ fontSize: '0.75rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {getTargetSummary(notif)}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                        {new Date(notif.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setInspectingNotification(notif)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            title="View Details"
                          >
                            👁 View
                          </button>
                          <button
                            onClick={() => setDeletingNotification(notif)}
                            className="btn btn-danger"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            title="Delete Notification (Teacher Only)"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Notification Drawer Panel */}
        {isCreating && (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                  Create Notification
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Author and broadcast laboratory bulletins
                </span>
              </div>
              <span className="badge badge-info">Faculty Mode</span>
            </div>

            <form onSubmit={handleCreateNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Notification Title <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Midterm Practical Schedule..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              {/* Category & Audience */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Category Type
                  </label>
                  <select
                    className="input"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="EXPERIMENT">EXPERIMENT</option>
                    <option value="DEADLINE">DEADLINE</option>
                    <option value="LAB">LAB</option>
                    <option value="ANNOUNCEMENT">ANNOUNCEMENT</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Target Audience
                  </label>
                  <select
                    className="input"
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                  >
                    <option value="LAB">Selected Laboratory</option>
                    <option value="ALL_STUDENTS">All Assigned Labs</option>
                  </select>
                </div>
              </div>

              {/* Target Laboratory Dropdown */}
              {targetType === 'LAB' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Target Laboratory
                  </label>
                  <select
                    className="input"
                    value={selectedLabId}
                    onChange={(e) => setSelectedLabId(e.target.value)}
                  >
                    {assignedLabs.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Message Body */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Message Body <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Write the full announcement details..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  required
                />
              </div>

              {/* Live Student Feed Preview */}
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--color-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.375rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Live Student Feed Preview
                  </span>
                  <span className={`badge ${getTypeBadge(type).props.className}`}>
                    {type}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-primary)' }}>
                  {title || 'Announcement Title Preview'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                  {message || 'Announcement content will appear here as shown to enrolled students.'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Posted by: {user?.name} (Faculty)
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Broadcasting...' : '📢 Broadcast Notification'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingNotification && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setDeletingNotification(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid rgba(186, 26, 26, 0.4)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-error)' }}>
                Delete Notification?
              </h3>
              <span className="badge badge-error" style={{ fontSize: '0.6875rem' }}>
                Teacher Privilege Only
              </span>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to delete this notification? This will immediately remove the notice from all student feeds and dashboards.
            </p>

            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--color-canvas)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.8125rem'
              }}
            >
              Target Notice: <strong>"{deletingNotification.title}"</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDeletingNotification(null)}
                className="btn btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNotification}
                className="btn btn-danger"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : '🗑 Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {inspectingNotification && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setInspectingNotification(null)}
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
              {getTypeBadge(inspectingNotification.type)}
              <button
                onClick={() => setInspectingNotification(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--color-primary)' }}>
                {inspectingNotification.title}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Target: <strong>{getTargetSummary(inspectingNotification)}</strong> &bull; Posted on{' '}
                {new Date(inspectingNotification.createdAt).toLocaleString()}
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
              {inspectingNotification.message}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setInspectingNotification(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherNotificationsPage;
