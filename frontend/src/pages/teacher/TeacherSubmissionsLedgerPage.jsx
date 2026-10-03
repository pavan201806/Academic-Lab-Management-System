import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { submissionService } from '../../services/submissionService';
import { labService } from '../../services/labService';
import { experimentService } from '../../services/experimentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CodeEditor from '../../components/code/CodeEditor';

const TeacherSubmissionsLedgerPage = () => {
  const { labId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lab, setLab] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [inspectingSubmission, setInspectingSubmission] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [labId]);

  useEffect(() => {
    fetchSubmissions();
  }, [labId, selectedExperimentId]);

  const fetchInitialData = async () => {
    try {
      const [labRes, expRes] = await Promise.all([
        labService.getLabById(labId),
        experimentService.getExperiments(labId)
      ]);
      setLab(labRes.data || labRes);
      setExperiments(Array.isArray(expRes.data) ? expRes.data : Array.isArray(expRes) ? expRes : []);
    } catch (err) {
      console.error('Failed to load lab data:', err);
      setError(err.response?.data?.message || 'Failed to load laboratory');
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await submissionService.getTeacherSubmissionsForLab(labId, selectedExperimentId);
      const data = res.data || res;
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load lab submissions ledger:', err);
      setError(err.response?.data?.message || 'Access Denied to lab submissions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="badge badge-success">✓ SUCCESS</span>;
      case 'COMPILE_ERROR':
        return <span className="badge badge-error">✗ COMPILE ERROR</span>;
      case 'RUNTIME_ERROR':
        return <span className="badge badge-error">⚡ RUNTIME ERROR</span>;
      case 'TIMEOUT':
        return <span className="badge badge-warning">⏱ TIMEOUT</span>;
      case 'OUTPUT_LIMIT':
        return <span className="badge badge-warning">⚠️ OUTPUT LIMIT</span>;
      case 'EXECUTION_ERROR':
        return <span className="badge badge-error">❗ EXECUTION ERROR</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    let match = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const studentName = sub.student?.name?.toLowerCase() || '';
      const rollNo = sub.student?.rollNumber?.toLowerCase() || '';
      const expTitle = sub.experiment?.title?.toLowerCase() || '';
      if (!studentName.includes(term) && !rollNo.includes(term) && !expTitle.includes(term)) {
        match = false;
      }
    }
    if (statusFilter && sub.status !== statusFilter) {
      match = false;
    }
    return match;
  });

  const getBackUrl = () => {
    return user?.role === 'ADMIN_HOD' ? `/admin/labs/${labId}` : `/teacher/labs/${labId}`;
  };

  if (loading && !lab) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Loading laboratory submissions ledger..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate(getBackUrl())}
          className="btn btn-secondary"
          style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <span>&larr;</span> Back to Laboratory
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="badge badge-info">{lab?.code}</span>
          <span className="badge badge-primary">{submissions.length} Total Submissions</span>
        </div>
      </div>

      {/* Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
              backgroundColor: 'var(--color-primary-subtle)',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            FACULTY LEDGER
          </span>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', margin: '0.35rem 0 0.15rem 0' }}>
            Student Submissions Ledger
          </h1>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            {lab?.name} ({lab?.code}) &bull; Phase 6 Execution &amp; Ingestion Console
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Filters Bar: Search, Experiment Filter, Status Filter */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search by student name, roll number, or experiment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem',
              fontSize: '0.8125rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>

        {/* Experiment Filter */}
        <div>
          <select
            value={selectedExperimentId}
            onChange={(e) => setSelectedExperimentId(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.8125rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="">All Experiments ({experiments.length})</option>
            {experiments.map((exp) => (
              <option key={exp._id} value={exp._id}>
                Exp {exp.experimentNumber}: {exp.title}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.8125rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="COMPILE_ERROR">Compile Error</option>
            <option value="RUNTIME_ERROR">Runtime Error</option>
            <option value="TIMEOUT">Timeout</option>
            <option value="OUTPUT_LIMIT">Output Limit</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchSubmissions}
          className="btn btn-secondary"
          style={{ fontSize: '0.8125rem' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Submissions Table */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <LoadingSpinner size={32} text="Loading submissions..." />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No student submissions found matching the criteria.
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Student</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Roll Number</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Section</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Experiment</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Attempt</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Language</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Submitted At</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub) => (
                  <tr key={sub._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {sub.student?.name || 'Unknown Student'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-family-mono)' }}>
                      {sub.student?.rollNumber || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className="badge badge-info">{sub.section?.sectionCode || sub.student?.section || '-'}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      Exp {sub.experiment?.experimentNumber}: {sub.experiment?.title}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                      #{sub.attemptNumber}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className="badge badge-primary">{sub.language}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-secondary)' }}>
                      {new Date(sub.submittedAt || sub.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {getStatusBadge(sub.status)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setInspectingSubmission(sub)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      >
                        👁 View Code
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT SUBMISSION MODAL */}
      {inspectingSubmission && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '840px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                  Submission by {inspectingSubmission.student?.name} ({inspectingSubmission.student?.rollNumber})
                </h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Exp {inspectingSubmission.experiment?.experimentNumber}: {inspectingSubmission.experiment?.title} &bull; Attempt #{inspectingSubmission.attemptNumber} &bull; Language: {inspectingSubmission.language}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSubmission(null)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Status info */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {getStatusBadge(inspectingSubmission.status)}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Submitted on {new Date(inspectingSubmission.submittedAt || inspectingSubmission.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Submitted Source Code */}
            <div>
              <strong style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Submitted Source Code ({inspectingSubmission.language}):
              </strong>
              <CodeEditor
                value={inspectingSubmission.sourceCode || '// No code stored'}
                language={inspectingSubmission.language}
                readOnly={true}
                height="300px"
              />
            </div>

            {/* Output Logs */}
            {inspectingSubmission.executionOutput?.stdout && (
              <div>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Execution Output (stdout):
                </strong>
                <pre
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {inspectingSubmission.executionOutput.stdout}
                </pre>
              </div>
            )}

            {inspectingSubmission.executionOutput?.stderr && (
              <div>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--color-error)', display: 'block', marginBottom: '0.25rem' }}>
                  Execution / Compiler Error (stderr):
                </strong>
                <pre
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#F87171',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {inspectingSubmission.executionOutput.stderr}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSubmissionsLedgerPage;
