import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { sectionService } from '../../services/sectionService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BulkStudentEnrollmentModal from '../../components/admin/BulkStudentEnrollmentModal';

const StudentManagementPage = () => {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('');

  // Bulk Enrollment Modal
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Add Student Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    section: '',
    temporaryPassword: 'StudentTemp#2026'
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Move Section Modal
  const [editingStudent, setEditingStudent] = useState(null);
  const [targetSection, setTargetSection] = useState('');

  // Permanent Delete Modal (Individual)
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [confirmRollInput, setConfirmRollInput] = useState('');
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Bulk Student Deletion
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [loadingBulkPreview, setLoadingBulkPreview] = useState(false);
  const [bulkPreviewData, setBulkPreviewData] = useState(null);
  const [confirmDeleteWord, setConfirmDeleteWord] = useState('');
  const [bulkDeletingInProgress, setBulkDeletingInProgress] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsData, sectionsData] = await Promise.all([
        userService.getUsers({
          role: 'STUDENT',
          search: search || undefined,
          section: selectedSectionFilter || undefined
        }),
        sectionService.getSections({ active: true })
      ]);
      setStudents(studentsData || []);
      setSections(sectionsData || []);
      // Clear selection of students no longer in list
      setSelectedStudentIds((prev) => {
        const next = new Set();
        const currentIds = new Set((studentsData || []).map((s) => s._id));
        prev.forEach((id) => {
          if (currentIds.has(id)) next.add(id);
        });
        return next;
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch student records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSectionFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === students.length && students.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s._id)));
    }
  };

  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Bulk Delete Actions
  const handleOpenBulkDeleteModal = async () => {
    if (selectedStudentIds.size === 0) return;
    setShowBulkDeleteModal(true);
    setLoadingBulkPreview(true);
    setBulkDeleteError('');
    setConfirmDeleteWord('');
    setBulkPreviewData(null);

    try {
      const ids = Array.from(selectedStudentIds);
      const res = await userService.previewBulkDeleteStudents(ids);
      setBulkPreviewData(res.data || res);
    } catch (err) {
      setBulkDeleteError(err.response?.data?.message || err.message || 'Failed to fetch bulk deletion preview');
    } finally {
      setLoadingBulkPreview(false);
    }
  };

  const handleExecuteBulkDelete = async (e) => {
    e.preventDefault();
    if (confirmDeleteWord.trim() !== 'DELETE') {
      setBulkDeleteError("Please type 'DELETE' in all capital letters to confirm.");
      return;
    }

    setBulkDeletingInProgress(true);
    setBulkDeleteError('');

    try {
      const ids = Array.from(selectedStudentIds);
      const res = await userService.bulkDeleteStudents(ids);
      const data = res.data || res;

      setShowBulkDeleteModal(false);
      setSelectedStudentIds(new Set());
      setConfirmDeleteWord('');

      const deletedCount = data.deletedCount || ids.length;
      const summary = data.cascadeSummary || {};
      setSuccessBanner(
        `Bulk Student Deletion Completed: ${deletedCount} students permanently deleted. ` +
        `Submissions removed: ${summary.submissionsDeleted || 0}, Evaluations removed: ${summary.evaluationsDeleted || 0}, ` +
        `Viva evaluations: ${summary.vivaEvaluationsDeleted || 0}, Re-evaluations: ${summary.reevaluationsDeleted || 0}. ` +
        `Shared academic resources and sections were preserved.`
      );

      await fetchData();
    } catch (err) {
      setBulkDeleteError(err.response?.data?.message || err.message || 'Failed to execute bulk student deletion.');
    } finally {
      setBulkDeletingInProgress(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      await userService.createStudent(formData);
      await fetchData();
      setShowAddModal(false);
      setFormData({ name: '', rollNumber: '', section: '', temporaryPassword: 'StudentTemp#2026' });
    } catch (err) {
      setModalError(err.message || 'Failed to create student account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (student) => {
    try {
      await userService.toggleActive(student._id, !student.active);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleSaveSectionAssignment = async (e) => {
    e.preventDefault();
    try {
      await sectionService.assignStudent(editingStudent._id, targetSection);
      await fetchData();
      setEditingStudent(null);
    } catch (err) {
      alert(err.message || 'Failed to update section assignment');
    }
  };

  const handleDeleteStudent = async (e) => {
    e.preventDefault();
    if (!deletingStudent) return;

    if (confirmRollInput.trim().toUpperCase() !== deletingStudent.rollNumber.toUpperCase()) {
      setDeleteError(`Please type the exact roll number '${deletingStudent.rollNumber}' to confirm deletion.`);
      return;
    }

    setDeletingInProgress(true);
    setDeleteError('');

    try {
      await userService.deleteStudent(deletingStudent._id);
      const deletedName = deletingStudent.name;
      const deletedRoll = deletingStudent.rollNumber;
      setDeletingStudent(null);
      setConfirmRollInput('');
      setSuccessBanner(`Student ${deletedRoll} — ${deletedName} and all student-owned records have been permanently deleted.`);
      await fetchData();
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to permanently delete student.');
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
              Students Roster
            </h1>
            <span className="badge badge-info">{students.length} Enrolled</span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
            Manage collegiate student admissions, roll numbers, and section cohort assignments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleOpenBulkDeleteModal}
            disabled={selectedStudentIds.size === 0}
            className="btn btn-danger"
            style={{
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              backgroundColor: selectedStudentIds.size > 0 ? '#dc2626' : 'var(--color-surface-hover)',
              color: selectedStudentIds.size > 0 ? '#ffffff' : 'var(--color-text-secondary)',
              borderColor: selectedStudentIds.size > 0 ? '#b91c1c' : 'var(--color-border)',
              cursor: selectedStudentIds.size > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedStudentIds.size > 0 ? 1 : 0.6
            }}
            title={selectedStudentIds.size === 0 ? 'Select students using checkboxes to bulk delete' : `Delete ${selectedStudentIds.size} selected students`}
          >
            <span>🗑</span> {selectedStudentIds.size > 0 ? `Delete ${selectedStudentIds.size} Selected` : 'Bulk Delete'}
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn btn-secondary"
            style={{
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              backgroundColor: 'var(--color-surface-hover)',
              borderColor: 'var(--color-primary)',
              color: 'var(--color-primary)',
              fontWeight: 600
            }}
          >
            <span>📊</span> Bulk Student Enrollment
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
            + Enroll Student
          </button>
        </div>
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

      {/* Selected Students Action Bar */}
      {selectedStudentIds.size > 0 && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: 'var(--color-surface-hover)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-info" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.6rem' }}>
              {selectedStudentIds.size} student{selectedStudentIds.size === 1 ? '' : 's'} selected
            </span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
              from {students.length} visible in current view
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleClearSelection}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8125rem' }}
            >
              Clear Selection
            </button>
            <button
              onClick={handleOpenBulkDeleteModal}
              className="btn btn-danger"
              style={{
                padding: '0.3rem 0.75rem',
                fontSize: '0.8125rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderColor: '#b91c1c',
                fontWeight: 600
              }}
            >
              🗑 Delete {selectedStudentIds.size} Selected
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or roll number..."
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
            value={selectedSectionFilter}
            onChange={(e) => setSelectedSectionFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid var(--color-border-input)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="">All Cohort Sections</option>
            {sections.map((sec) => (
              <option key={sec._id} value={sec.sectionCode}>
                {sec.sectionCode} &mdash; {sec.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner text="Loading students roster..." />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
            {error}
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎓</span>
            <strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>No Students Found</strong>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Enroll students to assign them to academic cohort sections.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 0.75rem', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selectedStudentIds.size === students.length}
                      onChange={handleToggleSelectAll}
                      title={selectedStudentIds.size === students.length ? 'Deselect all visible students' : 'Select all visible students'}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '0.75rem 1rem' }}>Roll Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assigned Section</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr
                    key={st._id}
                    style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      backgroundColor: selectedStudentIds.has(st._id) ? 'rgba(37, 99, 235, 0.04)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(st._id)}
                        onChange={() => handleToggleSelectStudent(st._id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-primary)', fontWeight: 600 }}>
                        {st.rollNumber}
                      </code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {st.name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {st.section ? (
                        <span className="badge badge-info">{st.section}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${st.active ? 'badge-success' : 'badge-warning'}`}>
                        {st.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                        <button
                          onClick={() => {
                            setEditingStudent(st);
                            setTargetSection(st.section || '');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Assign Section
                        </button>
                        <button
                          onClick={() => handleToggleStatus(st)}
                          className={`btn ${st.active ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {st.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setDeletingStudent(st);
                            setConfirmRollInput('');
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
                          title="Permanently delete student account and all submissions"
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

      {/* Enroll Student Modal */}
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
                Enroll New Student
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  placeholder="e.g. Maya Lin"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Roll Number / Enrollment ID <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="e.g. 23341A4504 or 504"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family-mono)' }}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Alphanumeric (letters and numbers only)</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Section Cohort Allocation
                </label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                >
                  <option value="">-- Assign Later --</option>
                  {sections.map((sec) => (
                    <option key={sec._id} value={sec.sectionCode}>
                      {sec.sectionCode} &mdash; {sec.name}
                    </option>
                  ))}
                </select>
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
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Student will be required to change password on first login.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Move Section Modal */}
      {editingStudent && (
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
              Assign Section Cohort
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Assign or move student <strong>{editingStudent.name}</strong> ({editingStudent.rollNumber}).
            </p>

            <form onSubmit={handleSaveSectionAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Select Target Section
                </label>
                <select
                  value={targetSection}
                  onChange={(e) => setTargetSection(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
                >
                  <option value="">-- No Section (Unassigned) --</option>
                  {sections.map((sec) => (
                    <option key={sec._id} value={sec.sectionCode}>
                      {sec.sectionCode} &mdash; {sec.name} ({sec.department})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setEditingStudent(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Delete Student Modal (Individual) */}
      {deletingStudent && (
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
                  Delete Student Permanently?
                </h3>
              </div>
              <button
                onClick={() => {
                  setDeletingStudent(null);
                  setConfirmRollInput('');
                  setDeleteError('');
                }}
                disabled={deletingInProgress}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem', color: 'var(--color-error, #b91c1c)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleDeleteStudent} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

              {/* Student Summary Info */}
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
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Roll Number:</span>
                  <div style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                    {deletingStudent.rollNumber}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Student Name:</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {deletingStudent.name}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Section:</span>
                  <div>
                    <span className="badge badge-info">{deletingStudent.section || 'Unassigned'}</span>
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
                This action will <strong>permanently remove</strong> the student account and all student-owned data including lab submissions, source code, execution logs, automated evaluations, viva marks, and section enrollment.
                <div style={{ color: 'var(--color-error, #b91c1c)', fontWeight: 600, marginTop: '0.25rem' }}>
                  This action cannot be undone.
                </div>
              </div>

              {/* Confirmation Input Guard */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  To confirm, please type the student's roll number <code style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-primary)', backgroundColor: 'var(--color-surface-hover)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>{deletingStudent.rollNumber}</code>:
                </label>
                <input
                  type="text"
                  required
                  value={confirmRollInput}
                  onChange={(e) => {
                    setConfirmRollInput(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder={`Type ${deletingStudent.rollNumber} to confirm`}
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
                    setDeletingStudent(null);
                    setConfirmRollInput('');
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
                    confirmRollInput.trim().toUpperCase() !== deletingStudent.rollNumber.toUpperCase() ||
                    deletingInProgress
                  }
                  className="btn btn-danger"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    borderColor: '#b91c1c',
                    fontWeight: 600,
                    opacity:
                      confirmRollInput.trim().toUpperCase() === deletingStudent.rollNumber.toUpperCase() &&
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

      {/* Permanent Bulk Delete Students Modal */}
      {showBulkDeleteModal && (
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
              maxWidth: '560px',
              width: '100%',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
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
                  Permanent Bulk Student Deletion
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setConfirmDeleteWord('');
                  setBulkDeleteError('');
                }}
                disabled={bulkDeletingInProgress}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.125rem', color: 'var(--color-error, #b91c1c)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleExecuteBulkDelete} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {bulkDeleteError && (
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
                  {bulkDeleteError}
                </div>
              )}

              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  You are about to permanently delete <strong>{selectedStudentIds.size} students</strong> and all of their exclusive academic data.
                </p>
              </div>

              {/* Data Breakdown & Statistics */}
              {loadingBulkPreview ? (
                <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <LoadingSpinner text="Inspecting student records and cascade dependencies..." />
                </div>
              ) : bulkPreviewData ? (
                <>
                  <div
                    style={{
                      backgroundColor: 'var(--color-surface-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      Affected Academic Data Breakdown:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                      <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Students</div>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--color-error, #b91c1c)' }}>{bulkPreviewData.affectedData.students}</strong>
                      </div>
                      <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Submissions</div>
                        <strong style={{ fontSize: '1.1rem' }}>{bulkPreviewData.affectedData.submissions}</strong>
                      </div>
                      <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Evaluations</div>
                        <strong style={{ fontSize: '1.1rem' }}>{bulkPreviewData.affectedData.evaluations}</strong>
                      </div>
                      <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Viva Marks</div>
                        <strong style={{ fontSize: '1.1rem' }}>{bulkPreviewData.affectedData.vivaEvaluations}</strong>
                      </div>
                      {bulkPreviewData.affectedData.reevaluationRequests > 0 && (
                        <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Re-evaluations</div>
                          <strong style={{ fontSize: '1.1rem' }}>{bulkPreviewData.affectedData.reevaluationRequests}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Students Scrollable List */}
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase' }}>
                      Selected Students List ({bulkPreviewData.students.length}):
                    </span>
                    <div
                      style={{
                        maxHeight: '140px',
                        overflowY: 'auto',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface)'
                      }}
                    >
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                        <tbody>
                          {bulkPreviewData.students.map((st) => (
                            <tr key={st._id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                              <td style={{ padding: '0.375rem 0.75rem', fontFamily: 'var(--font-family-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
                                {st.rollNumber}
                              </td>
                              <td style={{ padding: '0.375rem 0.75rem', fontWeight: 500 }}>{st.name}</td>
                              <td style={{ padding: '0.375rem 0.75rem', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                                {st.section ? <span className="badge badge-info">{st.section}</span> : 'Unassigned'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}

              {/* Warning Alert */}
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
                  This action will permanently remove all <strong>{selectedStudentIds.size} student accounts</strong> and all student-owned data (code submissions, evaluations, viva grades, individual notifications).
                </div>
                <div style={{ marginTop: '0.375rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Shared academic resources (sections, labs, experiments, test cases, faculty members) will <strong>NOT</strong> be deleted.
                </div>
                <div style={{ color: 'var(--color-error, #b91c1c)', fontWeight: 600, marginTop: '0.375rem' }}>
                  This action cannot be undone.
                </div>
              </div>

              {/* Confirmation Input Guard */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  To confirm permanent deletion, please type <code style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-error, #b91c1c)', backgroundColor: 'var(--color-error-bg, #fee2e2)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>DELETE</code>:
                </label>
                <input
                  type="text"
                  required
                  value={confirmDeleteWord}
                  onChange={(e) => {
                    setConfirmDeleteWord(e.target.value);
                    setBulkDeleteError('');
                  }}
                  placeholder="Type DELETE to confirm"
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
                    setShowBulkDeleteModal(false);
                    setConfirmDeleteWord('');
                    setBulkDeleteError('');
                  }}
                  disabled={bulkDeletingInProgress}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmDeleteWord.trim() !== 'DELETE' || bulkDeletingInProgress}
                  className="btn btn-danger"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    borderColor: '#b91c1c',
                    fontWeight: 600,
                    opacity: confirmDeleteWord.trim() === 'DELETE' && !bulkDeletingInProgress ? 1 : 0.5
                  }}
                >
                  {bulkDeletingInProgress ? `Deleting ${selectedStudentIds.size} Students...` : `Delete ${selectedStudentIds.size} Students Permanently`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Student Enrollment Modal */}
      <BulkStudentEnrollmentModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onImportSuccess={fetchData}
      />
    </div>
  );
};

export default StudentManagementPage;

