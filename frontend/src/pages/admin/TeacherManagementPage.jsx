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
    </div>
  );
};

export default TeacherManagementPage;
