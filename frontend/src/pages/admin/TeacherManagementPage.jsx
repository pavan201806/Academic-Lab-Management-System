import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TeacherManagementPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Add Teacher Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    temporaryPassword: 'TeacherTemp#2026'
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState(null);
  const [newTempPassword, setNewTempPassword] = useState('TeacherReset#2026');

  // Permanent Delete Modal
  const [deletingTeacher, setDeletingTeacher] = useState(null);
  const [confirmUsernameInput, setConfirmUsernameInput] = useState('');
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getUsers({ role: 'TEACHER', search: search || undefined });
      setTeachers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTeachers();
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      await userService.createTeacher(formData);
      await fetchTeachers();
      setShowAddModal(false);
      setFormData({ name: '', rollNumber: '', temporaryPassword: 'TeacherTemp#2026' });
    } catch (err) {
      setModalError(err.message || 'Failed to create teacher account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (teacher) => {
    try {
      await userService.toggleActive(teacher._id, !teacher.active);
      await fetchTeachers();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await userService.resetPassword(resettingUser._id, newTempPassword);
      alert(`Temporary password reset successfully for ${resettingUser.name}.`);
      setResettingUser(null);
    } catch (err) {
      alert(err.message || 'Failed to reset temporary password');
    }
  };

  const handleDeleteTeacher = async (e) => {
    e.preventDefault();
    if (!deletingTeacher) return;

    if (confirmUsernameInput.trim().toUpperCase() !== (deletingTeacher.rollNumber || '').toUpperCase()) {
      setDeleteError(`Please type the exact username '${deletingTeacher.rollNumber}' to confirm deletion.`);
      return;
    }

    setDeletingInProgress(true);
    setDeleteError('');

    try {
      await userService.deleteTeacher(deletingTeacher._id);
      const deletedName = deletingTeacher.name;
      const deletedUsername = deletingTeacher.rollNumber;
      setDeletingTeacher(null);
      setConfirmUsernameInput('');
      setSuccessBanner(`Teacher Deleted Successfully: ${deletedName} (${deletedUsername}). The teacher account and teacher-specific assignments have been permanently removed. Academic resources and student records were preserved.`);
      await fetchTeachers();
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to permanently delete teacher.');
    } finally {
      setDeletingInProgress(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
              Faculty / Teachers
            </h1>
            <span className="badge badge-info">{teachers.length} Members</span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
            Manage departmental professors, instructors, and lab faculty accounts.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
          + Add Faculty
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            color: '#15803d',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>✓</span>
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by faculty name or username / ID..."
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid var(--color-border-input)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)'
            }}
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>
      </div>

      {/* Faculty Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner text="Loading faculty members..." />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
            {error}
          </div>
        ) : teachers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>👨‍🏫</span>
            <strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>No Faculty Members Found</strong>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Add teachers to assign them as Main or Assistant laboratory leads.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Faculty Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Username / ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assigned Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {t.name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-primary)', fontWeight: 600 }}>
                        {t.rollNumber}
                      </code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className="badge badge-info">TEACHER</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${t.active ? 'badge-success' : 'badge-warning'}`}>
                        {t.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                        <button
                          onClick={() => setResettingUser(t)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`btn ${t.active ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {t.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setDeletingTeacher(t);
                            setConfirmUsernameInput('');
                            setDeleteError('');
                          }}
                          className="btn btn-danger"
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--color-error-bg, #fee2e2)',
                            color: 'var(--color-error, #b91c1c)',
                            borderColor: 'rgba(239, 68, 68, 0.4)'
                          }}
                          title="Permanently delete teacher account and assignments"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
                Add Faculty Member
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {modalError && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
                  {modalError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Full Name <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Prof. Eleanor Lin"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Username / Faculty ID <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="e.g. PROFLIN or 504"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-mono)' }}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Alphanumeric (letters and numbers only)</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Temporary Onboarding Password <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.temporaryPassword}
                  onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-mono)' }}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Faculty member will be forced to change this upon first sign in.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
              Reset Temporary Password
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Issue a new temporary password for <strong>{resettingUser.name}</strong> ({resettingUser.rollNumber}).
            </p>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  New Temporary Password
                </label>
                <input
                  type="text"
                  required
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-mono)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setResettingUser(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Delete Teacher Modal */}
      {deletingTeacher && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-error-bg, #fee2e2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-error, #b91c1c)', margin: 0 }}>
                  Delete Teacher?
                </h3>
              </div>
              <button
                onClick={() => {
                  setDeletingTeacher(null);
                  setConfirmUsernameInput('');
                  setDeleteError('');
                }}
                disabled={deletingInProgress}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem', color: 'var(--color-error, #b91c1c)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleDeleteTeacher} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {deleteError && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--color-error-bg, #fee2e2)',
                    color: 'var(--color-error, #b91c1c)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  {deleteError}
                </div>
              )}

              {/* Teacher Summary Info */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.375rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Teacher:</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {deletingTeacher.name}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Username / ID:</span>
                  <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                    {deletingTeacher.rollNumber}
                  </div>
                </div>
              </div>

              {/* Warning Text */}
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  padding: '0.75rem 0.875rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderLeft: '3px solid var(--color-error, #b91c1c)',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
                }}
              >
                <div>
                  This action will permanently remove the <strong>teacher account</strong> and <strong>teacher-specific assignments and data</strong>.
                </div>
                <div style={{ marginTop: '0.5rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Academic resources, student records, submissions, evaluations, labs, experiments, and test cases will <strong>NOT</strong> be deleted because of this action.
                </div>
                <div style={{ color: 'var(--color-error, #b91c1c)', fontWeight: 600, marginTop: '0.5rem' }}>
                  This action cannot be undone.
                </div>
              </div>

              {/* Confirmation Input Guard */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  To confirm, type the teacher username <code style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-primary)', backgroundColor: 'var(--color-surface-hover)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>{deletingTeacher.rollNumber}</code>:
                </label>
                <input
                  type="text"
                  required
                  value={confirmUsernameInput}
                  onChange={(e) => {
                    setConfirmUsernameInput(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder={`Type ${deletingTeacher.rollNumber} to confirm`}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid var(--color-border-input)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-family-mono)',
                    textTransform: 'uppercase'
                  }}
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingTeacher(null);
                    setConfirmUsernameInput('');
                    setDeleteError('');
                  }}
                  disabled={deletingInProgress}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    confirmUsernameInput.trim().toUpperCase() !== (deletingTeacher.rollNumber || '').toUpperCase() ||
                    deletingInProgress
                  }
                  className="btn btn-danger"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    borderColor: '#b91c1c',
                    fontWeight: 600,
                    opacity:
                      confirmUsernameInput.trim().toUpperCase() === (deletingTeacher.rollNumber || '').toUpperCase() &&
                      !deletingInProgress
                        ? 1
                        : 0.5
                  }}
                >
                  {deletingInProgress ? 'Deleting Permanently...' : 'Delete Permanently'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagementPage;
