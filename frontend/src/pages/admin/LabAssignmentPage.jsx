import React, { useState, useEffect } from 'react';
import { labAssignmentService } from '../../services/labAssignmentService';
import { labService } from '../../services/labService';
import { sectionService } from '../../services/sectionService';
import { userService } from '../../services/userService';
import { formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const LabAssignmentPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [labs, setLabs] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    lab: '',
    section: '',
    teacher: '',
    assignmentType: 'MAIN'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Filter state
  const [labFilter, setLabFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentsData, labsData, sectionsData, teachersData] = await Promise.all([
        labAssignmentService.getAssignments({ lab: labFilter || undefined }),
        labService.getLabs({ active: true }),
        sectionService.getSections({ active: true }),
        userService.getUsers({ role: 'TEACHER', active: true })
      ]);

      setAssignments(assignmentsData || []);
      setLabs(labsData || []);
      setSections(sectionsData || []);
      setTeachers(teachersData || []);

      if (labsData?.length > 0 && !formData.lab) {
        setFormData((prev) => ({ ...prev, lab: labsData[0]._id }));
      }
      if (sectionsData?.length > 0 && !formData.section) {
        setFormData((prev) => ({ ...prev, section: sectionsData[0]._id }));
      }
      if (teachersData?.length > 0 && !formData.teacher) {
        setFormData((prev) => ({ ...prev, teacher: teachersData[0]._id }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch assignment matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [labFilter]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    if (!formData.lab || !formData.section || !formData.teacher) {
      setFormError('Please select a Laboratory, Section, and Faculty member.');
      setSubmitting(false);
      return;
    }

    try {
      await labAssignmentService.createAssignment(formData);
      setFormSuccess('Teacher assigned to lab section cohort successfully!');
      await fetchData();
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      setFormError(err.message || 'Failed to assign teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (assignment) => {
    try {
      await labAssignmentService.toggleActive(assignment._id, !assignment.active);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update assignment status');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
            Laboratory Faculty Assignments
          </h1>
          <span className="badge badge-info">{assignments.length} Active Linkages</span>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
          Assign Main Teachers and Assistant Instructors to Laboratory + Section cohorts.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Assignment Action Form Card */}
        <section className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
              + Assign Faculty Lead
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Configure teacher oversight for laboratory section
            </span>
          </div>

          {formError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
              <strong>Error:</strong> {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}>
              <strong>Success:</strong> {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 1. Select Lab */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                1. Select Laboratory <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                required
                value={formData.lab}
                onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
              >
                {labs.map((lab) => (
                  <option key={lab._id} value={lab._id}>
                    {lab.code} &mdash; {lab.name} ({lab.department})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Section */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                2. Select Section Cohort <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                required
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
              >
                {sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.sectionCode} &mdash; {sec.name} ({sec.semester})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Assignment Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                3. Assignment Responsibility <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, assignmentType: 'MAIN' })}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: formData.assignmentType === 'MAIN' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    backgroundColor: formData.assignmentType === 'MAIN' ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.8125rem'
                  }}
                >
                  ⭐ Main Teacher (Lead)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, assignmentType: 'ASSISTANT' })}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: formData.assignmentType === 'ASSISTANT' ? '2px solid var(--color-secondary)' : '1px solid var(--color-border)',
                    backgroundColor: formData.assignmentType === 'ASSISTANT' ? 'var(--color-secondary-subtle)' : 'var(--color-surface)',
                    color: 'var(--color-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.8125rem'
                  }}
                >
                  🤝 Assistant Teacher
                </button>
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                {formData.assignmentType === 'MAIN'
                  ? 'Only 1 active Main Teacher is permitted per Lab + Section cohort.'
                  : 'Multiple Assistant Teachers can be assigned to assist with supervision and evaluations.'}
              </span>
            </div>

            {/* 4. Select Teacher */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                4. Select Faculty Member <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                required
                value={formData.teacher}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border-input)', borderRadius: 'var(--radius-md)' }}
              >
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.rollNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.625rem', marginTop: '0.5rem' }}
            >
              {submitting ? 'Confirming Assignment...' : 'Confirm Assignment'}
            </button>
          </form>
        </section>

        {/* Assignment Guidelines Card */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span>📜</span> Assignment Rules &amp; Policies
            </h3>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p>
                <strong>Main Teacher:</strong> Primary lab administrator in charge of experiment publishing, deadlines, and final score approval. Exactly one Main Teacher per cohort.
              </p>
              <p>
                <strong>Assistant Teacher:</strong> Co-instructors assigned to assist with grading submissions, conducting viva examinations, and monitoring experiment attempts.
              </p>
              <p>
                <strong>Role Integrity:</strong> Main and Assistant Teacher designations are assignment types under the TEACHER role and do not alter system login authentication.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Active Assignments Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0 }}>
            Active Faculty Assignment Ledger
          </h3>
          <select
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.8125rem',
              border: '1px solid var(--color-border-input)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)'
            }}
          >
            <option value="">All Laboratories</option>
            {labs.map((l) => (
              <option key={l._id} value={l._id}>
                {l.code} &mdash; {l.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner text="Loading assignment ledger..." />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
            {error}
          </div>
        ) : assignments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No active faculty assignments recorded. Use the form above to link teachers to labs and sections.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Laboratory</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Section</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Faculty In-Charge</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assignment Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assigned Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((asg) => (
                  <tr key={asg._id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <strong style={{ display: 'block', color: 'var(--color-primary)' }}>{asg.lab?.name || '—'}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                        {asg.lab?.code}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className="badge badge-info">{asg.section?.sectionCode || '—'}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{asg.teacher?.name || '—'}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                        {asg.teacher?.rollNumber}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {asg.assignmentType === 'MAIN' ? (
                        <span className="badge badge-success" style={{ backgroundColor: 'var(--color-secondary-subtle)', color: 'var(--color-secondary)', border: '1px solid var(--color-secondary)' }}>
                          ⭐ MAIN TEACHER
                        </span>
                      ) : (
                        <span className="badge badge-info">
                          🤝 ASSISTANT TEACHER
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                      {formatDate(asg.assignedAt || asg.createdAt)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${asg.active ? 'badge-success' : 'badge-warning'}`}>
                        {asg.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleStatus(asg)}
                        className={`btn ${asg.active ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        {asg.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabAssignmentPage;
