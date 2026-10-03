import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { labService } from '../../services/labService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TeacherLabDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, MAIN, ASSISTANT

  useEffect(() => {
    fetchAssignedLabs();
  }, []);

  const fetchAssignedLabs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await labService.getAssignedLabs();
      const data = res.data || res || [];
      setLabs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch assigned labs:', err);
      setError(err.response?.data?.message || 'Failed to retrieve your assigned laboratories.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLabs = labs.filter((lab) => {
    const matchesSearch =
      lab.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.section?.sectionCode?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || lab.assignmentType === filterType;
    return matchesSearch && matchesType;
  });

  const mainCount = labs.filter((l) => l.assignmentType === 'MAIN').length;
  const assistantCount = labs.filter((l) => l.assignmentType === 'ASSISTANT').length;
  const distinctSections = new Set(labs.map((l) => l.section?._id || l.section?.sectionCode)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
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
              Faculty Laboratory Console
            </h1>
            <span className="badge badge-info" style={{ fontWeight: 700 }}>
              FACULTY WORKBENCH
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
            Welcome, <strong>{user?.name}</strong> ({user?.rollNumber}). Access your assigned laboratory workbenches and section cohorts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={fetchAssignedLabs} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            🔄 Refresh Assigned Labs
          </button>
        </div>
      </div>

      {/* Metric Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
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
            ⚗️
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.1 }}>
              {labs.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              TOTAL ASSIGNED LABS
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
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
            ⭐
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7', lineHeight: 1.1 }}>
              {mainCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              MAIN INSTRUCTOR LABS
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
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
            🤝
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', lineHeight: 1.1 }}>
              {assistantCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              ASSISTANT FACULTY LABS
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(100, 116, 139, 0.1)',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700
            }}
          >
            👥
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
              {distinctSections}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              SECTION COHORTS
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1.25rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            placeholder="🔍 Search labs by name, code, subject, or section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '0.5rem 0.875rem',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-input)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Role Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            All ({labs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('MAIN')}
            className={`btn ${filterType === 'MAIN' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            Main In-Charge ({mainCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('ASSISTANT')}
            className={`btn ${filterType === 'ASSISTANT' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            Assistant ({assistantCount})
          </button>
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
          <LoadingSpinner size={36} text="Loading your assigned laboratories..." />
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
            No Assigned Laboratories Found
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: 0 }}>
            {searchTerm || filterType !== 'ALL'
              ? 'No laboratories match your current search and filter criteria.'
              : 'You do not currently have any active laboratory assignments. Please contact your department Head of Department (HOD) or Academic Administrator to assign lab cohorts.'}
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
          {filteredLabs.map((lab) => (
            <div
              key={`${lab._id}-${lab.assignmentId}`}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                gap: '1rem',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                position: 'relative'
              }}
            >
              {/* Card Header with Assignment Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div>
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
                  <h3 style={{ fontSize: '1.125rem', color: 'var(--color-text-primary)', margin: '0.5rem 0 0.25rem 0' }}>
                    {lab.name}
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {lab.subject} &bull; {lab.department}
                  </div>
                </div>

                <span
                  className={lab.assignmentType === 'MAIN' ? 'badge badge-primary' : 'badge badge-info'}
                  style={{ whiteSpace: 'nowrap', fontSize: '0.6875rem' }}
                >
                  {lab.assignmentType === 'MAIN' ? '⭐ MAIN INSTRUCTOR' : '🤝 ASSISTANT'}
                </span>
              </div>

              {/* Lab Metadata Info Box */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.75rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>COHORT SECTION</span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '0.8125rem' }}>
                    {lab.section?.sectionCode || 'Unassigned'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>ACADEMIC TERM</span>
                  <span style={{ fontWeight: 600 }}>
                    Sem {lab.semester} &bull; {lab.academicYear}
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--color-border)'
                }}
              >
                <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                  ACTIVE LAB
                </span>

                <button
                  onClick={() =>
                    navigate(
                      lab.section?._id
                        ? `/teacher/labs/${lab._id}?sectionId=${lab.section._id}`
                        : `/teacher/labs/${lab._id}`
                    )
                  }
                  className="btn btn-primary"
                  style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem' }}
                >
                  Enter Laboratory &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scope Boundary Notice */}
      <div
        style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <span>💡</span>
        <span>
          <strong>Academic Structure Notice:</strong> Experiment management, automated grading test benches, and student submission ledgers will become accessible in future development phases.
        </span>
      </div>
    </div>
  );
};

export default TeacherLabDashboardPage;
