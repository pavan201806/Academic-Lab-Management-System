import React, { useState, useEffect } from 'react';
import { sectionService } from '../../services/sectionService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SectionManagementPage = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Drawer & Modal State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sectionCode: '',
    academicYear: '2026-2027',
    semester: 'Semester 1',
    department: 'Computer Science & Engineering',
    active: true
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // View Students Modal State
  const [viewingStudentsSection, setViewingStudentsSection] = useState(null);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Permanent Delete Section Modal State
  const [deletingSection, setDeletingSection] = useState(null);
  const [confirmSectionNameInput, setConfirmSectionNameInput] = useState('');
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const fetchSections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sectionService.getSections({ search: search || undefined });
      setSections(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSections();
  };

  const handleOpenCreate = () => {
    setEditingSection(null);
    setFormData({
      name: '',
      sectionCode: '',
      academicYear: '2026-2027',
      semester: 'Semester 1',
      department: 'Computer Science & Engineering',
      active: true
    });
    setFormError('');
    setFormSuccess('');
    setShowDrawer(true);
  };

  const handleOpenEdit = (sec) => {
    setEditingSection(sec);
    setFormData({
      name: sec.name,
      sectionCode: sec.sectionCode,
      academicYear: sec.academicYear,
      semester: sec.semester,
      department: sec.department,
      active: sec.active
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
      if (editingSection) {
        await sectionService.updateSection(editingSection._id, formData);
        setFormSuccess('Section updated successfully!');
      } else {
        await sectionService.createSection(formData);
        setFormSuccess('Section created successfully!');
      }

      await fetchSections();
      setTimeout(() => {
        setShowDrawer(false);
        setFormSuccess('');
      }, 1000);
    } catch (err) {
      setFormError(err.message || 'Failed to save section.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (sec) => {
    try {
      await sectionService.toggleActive(sec._id, !sec.active);
      await fetchSections();
    } catch (err) {
      alert(err.message || 'Failed to update section status');
    }
  };

  const handleViewStudents = async (sec) => {
    setViewingStudentsSection(sec);
    setStudentsLoading(true);
    try {
      const students = await sectionService.getSectionStudents(sec.sectionCode);
      setSectionStudents(students || []);
    } catch (err) {
      alert(err.message || 'Failed to load section students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleDeleteSection = async (e) => {
    e.preventDefault();
    if (!deletingSection) return;

    if (
      confirmSectionNameInput.trim().toUpperCase() !== (deletingSection.sectionCode || '').toUpperCase() &&
      confirmSectionNameInput.trim().toUpperCase() !== (deletingSection.name || '').toUpperCase()
    ) {
      setDeleteError(`Please type the exact section code '${deletingSection.sectionCode}' to confirm deletion.`);
      return;
    }

    setDeletingInProgress(true);
    setDeleteError('');

    try {
      const res = await sectionService.deleteSection(deletingSection._id);
      const deletedCode = deletingSection.sectionCode;
      setDeletingSection(null);
      setConfirmSectionNameInput('');
      setSuccessBanner(
        res?.message ||
          `Section '${deletedCode}' and section-specific assignments have been permanently deleted. Shared academic resources and student records were preserved.`
      );
      await fetchSections();
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to permanently delete section.');
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
              Sections &amp; Cohorts
            </h1>
            <span className="badge badge-info">{sections.length} Active Cohorts</span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
            Manage student sections, academic years, semesters, and group allocations.
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
          + Create Section
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search section name, code, or department..."
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

      {/* Sections Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner text="Loading sections..." />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
            {error}
          </div>
        ) : sections.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>👥</span>
            <strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>No Sections Created</strong>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Create a section to organize students into laboratory cohorts.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Section Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Academic Year &amp; Sem</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Enrolled Students</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec) => (
                  <tr key={sec._id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {sec.name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{ padding: '0.2rem 0.4rem', backgroundColor: 'var(--color-secondary-subtle)', color: 'var(--color-secondary)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                        {sec.sectionCode}
                      </code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-secondary)' }}>
                      {sec.department}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div>{sec.academicYear}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{sec.semester}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleViewStudents(sec)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          color: 'var(--color-primary)',
                          fontWeight: 600
                        }}
                      >
                        {sec.studentCount || 0} Students
                      </button>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${sec.active ? 'badge-success' : 'badge-warning'}`}>
                        {sec.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                        <button
                          onClick={() => handleOpenEdit(sec)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(sec)}
                          className={`btn ${sec.active ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {sec.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setDeletingSection(sec);
                            setConfirmSectionNameInput('');
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
                          title="Permanently delete section/cohort"
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

      {/* Create / Edit Section Modal */}
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
              maxWidth: '520px',
              width: '100%',
              padding: 0,
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
                {editingSection ? 'Edit Section' : 'Create New Section'}
              </h2>
              <button
                onClick={() => setShowDrawer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  Section Name <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Section A"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Section Code <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.sectionCode}
                  onChange={(e) => setFormData({ ...formData, sectionCode: e.target.value })}
                  placeholder="e.g. CSE-A"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-mono)' }}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="secActive"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="secActive" style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>
                  Section is Active
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowDrawer(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="btn btn-primary">
                  {formSubmitting ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Enrolled Students Modal */}
      {viewingStudentsSection && (
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
              maxWidth: '600px',
              width: '100%',
              padding: 0,
              overflow: 'hidden',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
                  Enrolled Students in {viewingStudentsSection.sectionCode}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {viewingStudentsSection.name} &bull; {viewingStudentsSection.academicYear}
                </span>
              </div>
              <button
                onClick={() => setViewingStudentsSection(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
              {studentsLoading ? (
                <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
                  <LoadingSpinner text="Fetching students..." />
                </div>
              ) : sectionStudents.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No students currently assigned to this section code.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                      <th style={{ padding: '0.5rem' }}>Roll Number</th>
                      <th style={{ padding: '0.5rem' }}>Student Name</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionStudents.map((st) => (
                      <tr key={st._id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <td style={{ padding: '0.5rem', fontFamily: 'var(--font-family-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {st.rollNumber}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{st.name}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span className={`badge ${st.active ? 'badge-success' : 'badge-warning'}`}>
                            {st.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--color-border)', textAlign: 'right' }}>
              <button onClick={() => setViewingStudentsSection(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Section Modal (Blocked if students > 0, Confirm if students === 0) */}
      {deletingSection && (deletingSection.studentCount || 0) > 0 ? (
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
              maxWidth: '480px',
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
                  Cannot Delete Section
                </h3>
              </div>
              <button
                onClick={() => setDeletingSection(null)}
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
                  gap: '0.375rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Section:</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                    {deletingSection.sectionCode} &mdash; {deletingSection.name}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Enrolled Students:</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-error, #b91c1c)', fontSize: '1.05rem' }}>
                    {deletingSection.studentCount} Assigned Student{deletingSection.studentCount === 1 ? '' : 's'}
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
                <strong>{deletingSection.sectionCode}</strong> currently has <strong>{deletingSection.studentCount}</strong> student{deletingSection.studentCount === 1 ? '' : 's'} assigned.
                <div style={{ marginTop: '0.5rem', color: 'var(--color-text-primary)' }}>
                  Please reassign or remove all students from this section before deleting the section.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const sec = deletingSection;
                    setDeletingSection(null);
                    handleViewStudents(sec);
                  }}
                  className="btn btn-secondary"
                >
                  View Students
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSection(null)}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : deletingSection ? (
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
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-error, #b91c1c)', margin: 0 }}>
                  Delete Section?
                </h3>
              </div>
              <button
                onClick={() => {
                  setDeletingSection(null);
                  setConfirmSectionNameInput('');
                  setDeleteError('');
                }}
                disabled={deletingInProgress}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem', color: 'var(--color-error, #b91c1c)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeleteSection} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  gap: '0.375rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Section:</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                    {deletingSection.sectionCode} &mdash; {deletingSection.name}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Department:</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {deletingSection.department}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Year &amp; Semester:</span>
                  <div>
                    {deletingSection.academicYear} &bull; {deletingSection.semester}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Students Assigned:</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-success, #15803d)' }}>
                    0 Students
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
                  This action will permanently remove this <strong>section</strong> and its <strong>section-specific assignment records</strong>.
                </div>
                <div style={{ marginTop: '0.5rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Shared labs, experiments, test cases, student records, teacher accounts, and academic history will <strong>NOT</strong> be deleted.
                </div>
                <div style={{ color: 'var(--color-error, #b91c1c)', fontWeight: 600, marginTop: '0.5rem' }}>
                  This action cannot be undone.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  To confirm, type the exact section code <code style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-primary)', backgroundColor: 'var(--color-surface-hover)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>{deletingSection.sectionCode}</code>:
                </label>
                <input
                  type="text"
                  required
                  value={confirmSectionNameInput}
                  onChange={(e) => {
                    setConfirmSectionNameInput(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder={`Type ${deletingSection.sectionCode} to confirm`}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingSection(null);
                    setConfirmSectionNameInput('');
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
                    (confirmSectionNameInput.trim().toUpperCase() !== (deletingSection.sectionCode || '').toUpperCase() &&
                      confirmSectionNameInput.trim().toUpperCase() !== (deletingSection.name || '').toUpperCase()) ||
                    deletingInProgress
                  }
                  className="btn btn-danger"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    borderColor: '#b91c1c',
                    fontWeight: 600,
                    opacity:
                      (confirmSectionNameInput.trim().toUpperCase() === (deletingSection.sectionCode || '').toUpperCase() ||
                        confirmSectionNameInput.trim().toUpperCase() === (deletingSection.name || '').toUpperCase()) &&
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
      ) : null}
    </div>
  );
};

export default SectionManagementPage;
