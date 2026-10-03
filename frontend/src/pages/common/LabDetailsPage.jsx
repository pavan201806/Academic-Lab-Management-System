import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { labService } from '../../services/labService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const LabDetailsPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const sectionId = searchParams.get('sectionId');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  useEffect(() => {
    fetchLabDetails();
  }, [id, sectionId]);

  const fetchLabDetails = async () => {
    setLoading(true);
    setError('');
    setIsUnauthorized(false);
    try {
      const res = await labService.getLabById(id, sectionId);
      const data = res.data || res;
      setLab(data);
    } catch (err) {
      console.error('Failed to fetch laboratory details:', err);
      if (err.response?.status === 403 || err.response?.status === 404) {
        setIsUnauthorized(true);
        setError(
          err.response?.data?.message ||
            'Access Denied: You do not have an active academic assignment or enrollment for this laboratory.'
        );
      } else {
        setError(err.response?.data?.message || 'Failed to load laboratory details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getDashboardPath = () => {
    if (user?.role === 'ADMIN_HOD') return '/admin/labs';
    if (user?.role === 'TEACHER') return '/teacher/labs';
    return '/student/labs';
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Securing and loading laboratory environment..." />
      </div>
    );
  }

  if (isUnauthorized || (!lab && error)) {
    return (
      <div
        className="card"
        style={{
          maxWidth: '640px',
          margin: '3rem auto',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem'
        }}
      >
        <div style={{ fontSize: '3rem' }}>🛡️</div>
        <h2 style={{ fontSize: '1.375rem', color: 'var(--color-error)', margin: 0 }}>
          Laboratory Access Restricted
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', margin: 0, lineHeight: 1.5 }}>
          {error}
        </p>
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-hover)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', width: '100%' }}>
          <strong>Institutional Security Policy:</strong> Access to STEM laboratories is strictly governed by verified section enrollments and active faculty assignments.
        </div>
        <button onClick={() => navigate(getDashboardPath())} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          &larr; Return to Assigned Laboratories
        </button>
      </div>
    );
  }

  if (!lab) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navigation Breadcrumb & Back Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => navigate(getDashboardPath())}
          className="btn btn-secondary"
          style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <span>&larr;</span> Back to Laboratories
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="badge badge-success">ACTIVE LABORATORY</span>
          <span className="badge badge-info">{lab.department}</span>
        </div>
      </div>

      {/* Lab Header Showcase */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  backgroundColor: 'var(--color-primary-subtle)',
                  padding: '0.25rem 0.625rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {lab.code}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                {lab.subject}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              {lab.name}
            </h1>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              textAlign: 'right'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Academic Context
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              Semester {lab.semester} &bull; {lab.academicYear}
            </div>
          </div>
        </div>

        {lab.description && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0, maxWidth: '900px', lineHeight: 1.6 }}>
            {lab.description}
          </p>
        )}
      </div>

      {/* Grid: Cohort Section Details & Faculty Instructors Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Enrolled / Assigned Section Cohort */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>👥</span> Academic Cohort Details
          </h2>

          <div
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
              fontSize: '0.875rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Cohort Section:</span>
              <strong style={{ color: 'var(--color-primary)' }}>
                {lab.enrolledSection?.sectionCode ||
                  lab.assignedSections?.map((s) => s.sectionCode).join(', ') ||
                  (lab.assignments && lab.assignments.map((a) => a.section?.sectionCode).filter(Boolean).join(', ')) ||
                  'Assigned Cohort'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Department:</span>
              <span>{lab.department}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Term:</span>
              <span>Semester {lab.semester} ({lab.academicYear})</span>
            </div>
          </div>
        </div>

        {/* Faculty Matrix */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>👨‍🏫</span> Faculty &amp; Instructor In-Charge
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {/* If student view */}
            {lab.instructors && lab.instructors.length > 0 ? (
              lab.instructors.map((ins, idx) => (
                <div
                  key={ins._id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-surface-hover)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', display: 'block' }}>
                      {ins.name}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                      {ins.rollNumber}
                    </span>
                  </div>
                  <span className={ins.assignmentType === 'MAIN' ? 'badge badge-primary' : 'badge badge-info'}>
                    {ins.assignmentType === 'MAIN' ? 'MAIN INSTRUCTOR' : 'ASSISTANT'}
                  </span>
                </div>
              ))
            ) : lab.cohortAssignments && lab.cohortAssignments.length > 0 ? (
              /* If teacher view */
              lab.cohortAssignments.map((a, idx) => (
                <div
                  key={a._id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-surface-hover)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', display: 'block' }}>
                      {a.teacher?.name}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      Section: <strong>{a.section?.sectionCode}</strong>
                    </span>
                  </div>
                  <span className={a.assignmentType === 'MAIN' ? 'badge badge-primary' : 'badge badge-info'}>
                    {a.assignmentType === 'MAIN' ? 'MAIN' : 'ASSISTANT'}
                  </span>
                </div>
              ))
            ) : lab.assignments && lab.assignments.length > 0 ? (
              /* Admin view */
              lab.assignments.map((a, idx) => (
                <div
                  key={a._id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-surface-hover)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', display: 'block' }}>
                      {a.teacher?.name}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      Section: <strong>{a.section?.sectionCode}</strong>
                    </span>
                  </div>
                  <span className={a.assignmentType === 'MAIN' ? 'badge badge-primary' : 'badge badge-info'}>
                    {a.assignmentType}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', padding: '0.5rem 0' }}>
                No faculty members actively assigned to this section yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Curriculum & Future Workbench Container */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🧪</span> Laboratory Curriculum &amp; Experiments Workbench
          </h2>
          <span className="badge badge-info">PHASE 4 UPCOMING</span>
        </div>

        <div
          style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-canvas)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>🔬</div>
          <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
            Curriculum Initialization Ready
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: '520px', margin: 0, lineHeight: 1.5 }}>
            Academic permissions and section assignments for <strong>{lab.name} ({lab.code})</strong> have been verified. Laboratory experiment authoring, multi-step PDF protocol extractions, and automated execution test cases will be enabled in Phase 4.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LabDetailsPage;
