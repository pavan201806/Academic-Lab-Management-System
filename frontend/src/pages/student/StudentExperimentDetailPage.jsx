import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { experimentService } from '../../services/experimentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const StudentExperimentDetailPage = () => {
  const { labId, experimentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExperiment();
  }, [experimentId]);

  const fetchExperiment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await experimentService.getExperimentById(experimentId);
      const data = res.data || res;
      setExperiment(data);
    } catch (err) {
      console.error('Failed to load experiment:', err);
      setError(err.response?.data?.message || 'Access Denied or Experiment not found.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="badge badge-success">● PUBLISHED</span>;
      case 'REOPENED':
        return <span className="badge badge-primary">🔓 REOPENED</span>;
      case 'CLOSED':
        return <span className="badge badge-error">🔒 CLOSED</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Loading experiment protocol..." />
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div
        className="card"
        style={{
          maxWidth: '560px',
          margin: '3rem auto',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <div style={{ fontSize: '3rem' }}>🛡️</div>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--color-error)', margin: 0 }}>
          Experiment Inaccessible
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
          {error || 'This experiment is not available for your enrolled section.'}
        </p>
        <button onClick={() => navigate(`/student/labs/${labId}`)} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          &larr; Back to Laboratory
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Breadcrumbs & Back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => navigate(`/student/labs/${labId}`)}
          className="btn btn-secondary"
          style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <span>&larr;</span> Back to Laboratory Curriculum
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {getStatusBadge(experiment.status)}
          <span className="badge badge-info">{experiment.lab?.code}</span>
        </div>
      </div>

      {/* Main Experiment Header Showcase */}
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
            <span
              style={{
                fontFamily: 'var(--font-family-mono)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary-subtle)',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              EXPERIMENT {experiment.experimentNumber < 10 ? `0${experiment.experimentNumber}` : experiment.experimentNumber}
            </span>
            <h1 style={{ fontSize: '1.625rem', color: 'var(--color-primary)', margin: '0.5rem 0 0.25rem 0' }}>
              {experiment.title}
            </h1>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              {experiment.lab?.name} ({experiment.lab?.code}) &bull; Section {user?.section}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              fontSize: '0.8125rem',
              minWidth: '180px'
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>SUBMISSION DEADLINE</span>
            <strong style={{ color: experiment.deadline ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
              {experiment.deadline ? new Date(experiment.deadline).toLocaleDateString() : 'No Strict Deadline Set'}
            </strong>
          </div>
        </div>
      </div>

      {/* Grid: Objective & Programming Languages */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Objective Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎯</span> Objective &amp; Learning Goals
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
            {experiment.objective || 'Complete the experimental procedure and verify all test outputs as outlined in the curriculum protocol.'}
          </p>
        </div>

        {/* Allowed Languages */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💻</span> Supported Programming Languages
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {experiment.programmingLanguages?.map((lang) => (
              <span
                key={lang}
                style={{
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Procedure / Instructions */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📋</span> Detailed Procedure &amp; Algorithm Steps
        </h2>

        {experiment.instructions ? (
          <div
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--color-text-primary)'
            }}
          >
            {experiment.instructions}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            No specific instruction steps provided. Follow standard departmental lab manual guidelines.
          </p>
        )}
      </div>

      {/* Future Phase 6 Submission Workbench Placeholder Notice */}
      <div
        className="card"
        style={{
          border: '2px dashed var(--color-border)',
          backgroundColor: 'var(--color-canvas)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <div style={{ fontSize: '2rem' }}>⚡</div>
        <h3 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0 }}>
          Code Editor &amp; Online Submission Workspace
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', maxWidth: '500px', margin: 0, lineHeight: 1.5 }}>
          In-browser code editor, multi-language compiler execution, test case validation, and automated grading submissions will be activated in Phase 6.
        </p>
      </div>
    </div>
  );
};

export default StudentExperimentDetailPage;
