import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { labService } from '../../services/labService';
import { progressService } from '../../services/progressService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const StudentLabDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [labs, setLabs] = useState([]);
  const [overallProgress, setOverallProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [labsRes, progRes] = await Promise.all([
        labService.getAssignedLabs(),
        progressService.getStudentOverallProgress().catch((err) => {
          console.warn('Could not load overall progress:', err);
          return null;
        })
      ]);

      const labsData = labsRes.data || labsRes || [];
      setLabs(Array.isArray(labsData) ? labsData : []);

      if (progRes) {
        setOverallProgress(progRes.data || progRes);
      }
    } catch (err) {
      console.error('Failed to fetch student dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to retrieve your assigned laboratories.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLabs = labs.filter((lab) => {
    return (
      lab.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getLabProgress = (labId) => {
    if (!overallProgress?.labsProgress) return null;
    return overallProgress.labsProgress.find(
      (lp) => (lp.lab?._id || lp.lab)?.toString() === labId.toString()
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Student Profile & Cohort Banner */}
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
              Assigned Laboratories Hub
            </h1>
            <span className="badge badge-success" style={{ fontWeight: 700 }}>
              STUDENT WORKBENCH
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
            Welcome, <strong>{user?.name}</strong> &bull; Roll Number:{' '}
            <code style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{user?.rollNumber}</code> &bull; Enrolled
            Section:{' '}
            <strong style={{ color: 'var(--color-primary)' }}>
              {user?.section ? user.section.toUpperCase() : 'Not Allocated'}
            </strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            🔄 Refresh Hub
          </button>
        </div>
      </div>

      {/* 4 Metric Statistic Cards (Stitch Design Matching) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* Card 1: My Labs */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
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
              fontSize: '1.25rem',
              fontWeight: 700
            }}
          >
            📚
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.1 }}>
              {labs.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              ENROLLED LABORATORIES
            </div>
          </div>
        </div>

        {/* Card 2: Total Curriculum Experiments */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
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
              fontSize: '1.25rem',
              fontWeight: 700
            }}
          >
            🔬
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7', lineHeight: 1.1 }}>
              {overallProgress?.summary?.totalExperiments || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              TOTAL EXPERIMENTS ({overallProgress?.summary?.overallCompletionPercentage || 0}% DONE)
            </div>
          </div>
        </div>

        {/* Card 3: Pending Experiments */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700
            }}
          >
            ⏳
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706', lineHeight: 1.1 }}>
              {overallProgress?.summary?.pendingExperiments || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              PENDING DELIVERABLES
            </div>
          </div>
        </div>

        {/* Card 4: Completed Submissions & Score */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
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
              fontSize: '1.25rem',
              fontWeight: 700
            }}
          >
            ✓
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', lineHeight: 1.1 }}>
              {overallProgress?.summary?.completedExperiments || 0}
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginLeft: '0.375rem' }}>
                (Avg: {overallProgress?.summary?.averageTotalScore || 0}/15)
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              COMPLETED &amp; EVALUATED
            </div>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div
        className="card"
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1.25rem'
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search enrolled laboratories by name, subject, or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '0.5rem 0.875rem',
            fontSize: '0.875rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-input)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)'
          }}
        />
        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Showing <strong>{filteredLabs.length}</strong> of {labs.length} labs
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: '0.875rem'
          }}
        >
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <LoadingSpinner size={36} text="Loading your assigned laboratories &amp; progress..." />
        </div>
      ) : filteredLabs.length === 0 ? (
        /* Empty State */
        <div
          className="card"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>🧪</div>
          <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
            No Laboratories Assigned
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: 0 }}>
            {!user?.section
              ? 'You are not currently enrolled in an academic section. Please contact your department administration to assign you to a section.'
              : 'There are currently no active laboratories assigned to your section cohort (' +
                user.section +
                '). Please check back later or consult your faculty.'}
          </p>
        </div>
      ) : (
        /* Laboratories Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {filteredLabs.map((lab) => {
            const labProg = getLabProgress(lab._id);

            return (
              <div
                key={lab._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  gap: '1rem',
                  position: 'relative'
                }}
              >
                {/* Card Header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        backgroundColor: 'var(--color-primary-subtle)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      {lab.code}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                      ACTIVE
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.125rem', color: 'var(--color-text-primary)', margin: '0.375rem 0 0.25rem 0' }}>
                    {lab.name}
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {lab.subject} &bull; {lab.department}
                  </div>
                </div>

                {/* Lab Progress Bar if available */}
                {labProg && labProg.totalExperiments > 0 && (
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--color-canvas)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.375rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        Progress: <strong>{labProg.completedExperiments}/{labProg.totalExperiments} Experiments</strong>
                      </span>
                      <strong style={{ color: '#059669' }}>{labProg.completionPercentage}%</strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${labProg.completionPercentage}%`,
                          height: '100%',
                          backgroundColor: '#059669',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                    {labProg.completedExperiments > 0 && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                        Avg Score: <strong>{labProg.averageTotalScore} / 15</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Lab Metadata Info Box */}
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-hover)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    fontSize: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Term:</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>
                      Semester {lab.semester} &bull; {lab.academicYear}
                    </strong>
                  </div>

                  {lab.teachers && lab.teachers.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Instructors:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)', textAlign: 'right' }}>
                        {lab.teachers.map((t) => `${t.name} (${t.assignmentType})`).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--color-border)'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Access Level: <strong>Full Workspace</strong>
                  </span>
                  <button
                    onClick={() => navigate(`/student/labs/${lab._id}`)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem' }}
                  >
                    Open Workbench &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentLabDashboardPage;
