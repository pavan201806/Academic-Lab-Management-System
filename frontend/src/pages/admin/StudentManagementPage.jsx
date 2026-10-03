import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { sectionService } from '../../services/sectionService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const StudentManagementPage = () => {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('');

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

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
          + Enroll Student
        </button>
      </div>

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
                  <th style={{ padding: '0.75rem 1rem' }}>Roll Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assigned Section</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st._id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
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
    </div>
  );
};

export default StudentManagementPage;
