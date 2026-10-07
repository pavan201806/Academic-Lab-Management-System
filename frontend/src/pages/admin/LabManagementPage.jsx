import React, { useState, useEffect } from 'react';
import { labService } from '../../services/labService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const LabManagementPage = () => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Drawer / Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subject: '',
    department: 'Computer Science & Engineering',
    academicYear: '2026-2027',
    semester: 'Semester 1',
    description: '',
    active: true
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Permanent Delete Modal State
  const [deletingLab, setDeletingLab] = useState(null);
  const [deletingStatus, setDeletingStatus] = useState(null);
  const [checkingDeletionStatus, setCheckingDeletionStatus] = useState(false);
  const [confirmLabNameInput, setConfirmLabNameInput] = useState('');
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const fetchLabs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await labService.getLabs({
        search: search || undefined,
        department: departmentFilter || undefined
      });
      setLabs(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch laboratories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [departmentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLabs();
  };

  const handleOpenCreate = () => {
    setEditingLab(null);
    setFormData({
      name: '',
      code: '',
      subject: '',
      department: 'Computer Science & Engineering',
      academicYear: '2026-2027',
      semester: 'Semester 1',
      description: '',
      active: true
    });
    setFormError('');
    setFormSuccess('');
    setShowDrawer(true);
  };

  const handleOpenEdit = (lab) => {
    setEditingLab(lab);
    setFormData({
      name: lab.name,
      code: lab.code,
      subject: lab.subject,
      department: lab.department,
      academicYear: lab.academicYear,
      semester: lab.semester,
      description: lab.description || '',
      active: lab.active
    });
    setFormError('');
    setFormSuccess('');
    setShowDrawer(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      if (editingLab) {
        await labService.updateLab(editingLab._id, formData);
        setFormSuccess('Laboratory updated successfully!');
      } else {
        await labService.createLab(formData);
        setFormSuccess('Laboratory created successfully!');
      }

      await fetchLabs();
      setTimeout(() => {
        setShowDrawer(false);
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(err.message || 'Failed to save laboratory.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (lab) => {
    try {
      await labService.toggleActive(lab._id, !lab.active);
      await fetchLabs();
    } catch (err) {
      alert(err.message || 'Failed to toggle laboratory status');
    }
  };

  const handleInitiateDelete = async (lab) => {
    setDeletingLab(lab);
    setDeletingStatus(null);
    setCheckingDeletionStatus(true);
    setDeleteError('');
    setConfirmLabNameInput('');

    try {
      const status = await labService.getLabDeletionStatus(lab._id);
      setDeletingStatus(status);
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to inspect laboratory dependencies');
    } finally {
      setCheckingDeletionStatus(false);
    }
  };

  const handleDeleteLab = async (e) => {
    e.preventDefault();
    if (!deletingLab) return;

    if (
      confirmLabNameInput.trim().toUpperCase() !== (deletingLab.name || '').trim().toUpperCase() &&
      confirmLabNameInput.trim().toUpperCase() !== (deletingLab.code || '').trim().toUpperCase()
    ) {
      setDeleteError(`Please type the exact laboratory name '${deletingLab.name}' to confirm deletion.`);
      return;
    }

    setDeletingInProgress(true);
    setDeleteError('');

    try {
      const res = await labService.deleteLab(deletingLab._id);
      const deletedName = deletingLab.name;
      const deletedCode = deletingLab.code;
      setDeletingLab(null);
      setDeletingStatus(null);
      setConfirmLabNameInput('');
      setSuccessBanner(
        res?.message ||
          `Laboratory '${deletedName}' (${deletedCode}) and lab-specific configuration have been permanently deleted. Shared academic resources and student records were preserved.`
      );
      await fetchLabs();
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to permanently delete laboratory.');
    } finally {
      setDeletingInProgress(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
              Laboratories
            </h1>
            <span className="badge badge-info">{labs.length} Registries</span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
            Create and manage laboratory courses, academic cohorts, and curriculum allocations.
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
          + Create Lab
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
      <div
        className="card"
        style={{
          padding: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search laboratory name, code, or subject..."
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

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid var(--color-border-input)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science &amp; Engineering</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Electronics & Communication">Electronics &amp; Communication</option>
            <option value="Electrical & Electronics">Electrical &amp; Electronics</option>
          </select>
        </div>
      </div>

      {/* Laboratories Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner text="Loading laboratories ledger..." />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
            {error}
          </div>
        ) : labs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📂</span>
            <strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>No Laboratories Found</strong>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Create a new laboratory to start configuring the curriculum.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Lab Name &amp; Subject</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Academic Year &amp; Sem</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Assigned Sections</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Assigned Teachers</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ divideY: '1px solid var(--color-border)' }}>
                {labs.map((lab) => (
                  <tr key={lab._id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <strong style={{ display: 'block', color: 'var(--color-primary)' }}>{lab.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{lab.subject}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{ padding: '0.2rem 0.4rem', backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                        {lab.code}
                      </code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-secondary)' }}>{lab.department}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div>{lab.academicYear}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{lab.semester}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <span className="badge badge-info">{lab.assignedSectionsCount || 0} Sec</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <span className="badge badge-info">{lab.assignedTeachersCount || 0} Faculty</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${lab.active ? 'badge-success' : 'badge-warning'}`}>
                        {lab.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                        <button
                          onClick={() => handleOpenEdit(lab)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(lab)}
                          className={`btn ${lab.active ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {lab.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleInitiateDelete(lab)}
                          className="btn btn-danger"
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--color-error-bg, #fee2e2)',
                            color: 'var(--color-error, #b91c1c)',
                            borderColor: 'rgba(239, 68, 68, 0.4)'
                          }}
                          title="Permanently delete laboratory"
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

      {/* Create / Edit Lab Modal/Drawer */}
      {showDrawer && (
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
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: 0,
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
                {editingLab ? 'Edit Laboratory' : 'Create New Laboratory'}
              </h2>
              <button
                onClick={() => setShowDrawer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formError && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
                  {formSuccess}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Laboratory Name <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Data Structures & Algorithms Lab"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Laboratory Code <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. CS-201P"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-mono)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Subject <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Data Structures"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Department <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                >
                  <option value="Computer Science & Engineering">Computer Science &amp; Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics &amp; Communication</option>
                  <option value="Electrical & Electronics">Electrical &amp; Electronics</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Academic Year <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    placeholder="2026-2027"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Semester <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    placeholder="Semester 1"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Description / Prerequisites
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional scope or requirements..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="labActive"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="labActive" style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>
                  Laboratory is Active for scheduling
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowDrawer(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="btn btn-primary">
                  {formSubmitting ? 'Saving...' : editingLab ? 'Update Lab' : 'Create Lab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Check Modal */}
      {checkingDeletionStatus && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
              maxWidth: '380px',
              width: '100%',
              padding: '2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <LoadingSpinner text="Checking lab academic history..." />
          </div>
        </div>
      )}

      {/* Permanent Deletion Blocked Modal (Academic History Exists) */}
      {deletingLab && deletingStatus && deletingStatus.hasAcademicHistory && (
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
                <span style={{ fontSize: '1.25rem' }}>🚫</span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-error, #b91c1c)', margin: 0 }}>
                  Permanent Deletion Blocked
                </h3>
              </div>
              <button
                onClick={() => {
                  setDeletingLab(null);
                  setDeletingStatus(null);
                  setDeleteError('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem', color: 'var(--color-error, #b91c1c)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    Laboratory:
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                    {deletingLab.name} ({deletingLab.code})
                  </div>
                </div>

                <div style={{ marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--color-error, #b91c1c)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Academic History Found:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.375rem' }}>
                    <div style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Experiments:</span>{' '}
                      <strong>{deletingStatus.experimentsCount}</strong>
                    </div>
                    <div style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Student Submissions:</span>{' '}
                      <strong style={{ color: 'var(--color-error, #b91c1c)' }}>{deletingStatus.submissionsCount}</strong>
                    </div>
                    <div style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Evaluations:</span>{' '}
                      <strong style={{ color: 'var(--color-error, #b91c1c)' }}>{deletingStatus.evaluationsCount}</strong>
                    </div>
                    <div style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Viva Evaluations:</span>{' '}
                      <strong style={{ color: 'var(--color-error, #b91c1c)' }}>{deletingStatus.vivaEvaluationsCount}</strong>
                    </div>
                    {deletingStatus.reevaluationRequestsCount > 0 && (
                      <div style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', gridColumn: 'span 2' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Re-evaluation Requests:</span>{' '}
                        <strong style={{ color: 'var(--color-error, #b91c1c)' }}>{deletingStatus.reevaluationRequestsCount}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  padding: '0.75rem 0.875rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderLeft: '3px solid var(--color-error, #b91c1c)',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
                }}
              >
                <div>
                  This Lab cannot be permanently deleted because <strong>student academic history</strong> exists.
                </div>
                <div style={{ marginTop: '0.375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Your students' academic records and evaluations are strictly protected.
                </div>
                <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem' }}>
                  You can deactivate or archive this laboratory instead to prevent further scheduling.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                {deletingLab.active && (
                  <button
                    type="button"
                    onClick={() => {
                      const labToToggle = deletingLab;
                      setDeletingLab(null);
                      setDeletingStatus(null);
                      handleToggleStatus(labToToggle);
                    }}
                    className="btn btn-secondary"
                  >
                    Archive / Deactivate Lab
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDeletingLab(null);
                    setDeletingStatus(null);
                  }}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safe Permanent Delete Confirmation Modal (No Academic History) */}
      {deletingLab && deletingStatus && !deletingStatus.hasAcademicHistory && (
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
              maxWidth: '540px',
              width: '100%',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
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
                  Delete Lab Permanently?
                </h3>
              </div>
              <button
                onClick={() => {
                  setDeletingLab(null);
                  setDeletingStatus(null);
                  setConfirmLabNameInput('');
                  setDeleteError('');
                }}
                disabled={deletingInProgress}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem', color: 'var(--color-error, #b91c1c)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeleteLab} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    Laboratory:
                  </span>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                    {deletingLab.name} ({deletingLab.code})
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Department:</span>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{deletingLab.department}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Year &amp; Semester:</span>
                    <div>{deletingLab.academicYear} &bull; {deletingLab.semester}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.375rem', marginTop: '0.25rem' }}>
                  <div style={{ padding: '0.375rem 0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Experiments</div>
                    <strong style={{ fontSize: '0.9375rem' }}>{deletingStatus.experimentsCount}</strong>
                  </div>
                  <div style={{ padding: '0.375rem 0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Test Cases</div>
                    <strong style={{ fontSize: '0.9375rem' }}>{deletingStatus.testCasesCount}</strong>
                  </div>
                  <div style={{ padding: '0.375rem 0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Submissions</div>
                    <strong style={{ fontSize: '0.9375rem', color: 'var(--color-success, #15803d)' }}>0</strong>
                  </div>
                </div>
              </div>

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
                  This lab has <strong>no student academic history</strong>. Deleting it will permanently remove:
                </div>
                <ul style={{ margin: '0.375rem 0 0.375rem 1.25rem', padding: 0, fontSize: '0.75rem' }}>
                  <li>The Laboratory registry document</li>
                  <li>Lab-owned experiments and test cases ({deletingStatus.experimentsCount} experiments, {deletingStatus.testCasesCount} test cases)</li>
                  <li>Teacher and section allocation mappings for this lab ({deletingStatus.assignmentsCount} assignments)</li>
                  <li>Lab-specific notifications</li>
                </ul>
                <div style={{ marginTop: '0.375rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Teachers, sections, student records, and other labs will <strong>NOT</strong> be affected.
                </div>
                <div style={{ color: 'var(--color-error, #b91c1c)', fontWeight: 600, marginTop: '0.375rem' }}>
                  This action cannot be undone.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  To confirm, type the exact lab name <code style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-primary)', backgroundColor: 'var(--color-surface-hover)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>{deletingLab.name}</code>:
                </label>
                <input
                  type="text"
                  required
                  value={confirmLabNameInput}
                  onChange={(e) => {
                    setConfirmLabNameInput(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder={`Type "${deletingLab.name}" or "${deletingLab.code}" to confirm`}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid var(--color-border-input)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingLab(null);
                    setDeletingStatus(null);
                    setConfirmLabNameInput('');
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
                    (confirmLabNameInput.trim().toLowerCase() !== (deletingLab.name || '').trim().toLowerCase() &&
                      confirmLabNameInput.trim().toUpperCase() !== (deletingLab.code || '').trim().toUpperCase()) ||
                    deletingInProgress
                  }
                  className="btn btn-danger"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    borderColor: '#b91c1c',
                    fontWeight: 600,
                    opacity:
                      (confirmLabNameInput.trim().toLowerCase() === (deletingLab.name || '').trim().toLowerCase() ||
                        confirmLabNameInput.trim().toUpperCase() === (deletingLab.code || '').trim().toUpperCase()) &&
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

export default LabManagementPage;
