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
    </div>
  );
};

export default LabManagementPage;
