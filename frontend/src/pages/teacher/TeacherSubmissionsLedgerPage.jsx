import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { submissionService } from '../../services/submissionService';
import { evaluationService } from '../../services/evaluationService';
import { vivaService } from '../../services/vivaService';
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
  const [evaluations, setEvaluations] = useState([]);
  const [vivas, setVivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [inspectingSubmission, setInspectingSubmission] = useState(null);
  const [inspectingEvaluation, setInspectingEvaluation] = useState(null);
  const [inspectingViva, setInspectingViva] = useState(null);

  // In-modal viva grading state
  const [vivaInputMarks, setVivaInputMarks] = useState(4.0);
  const [vivaInputRemarks, setVivaInputRemarks] = useState('');
  const [savingViva, setSavingViva] = useState(false);
  const [vivaSaveSuccess, setVivaSaveSuccess] = useState('');
  const [vivaSaveError, setVivaSaveError] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [labId]);

  useEffect(() => {
    fetchSubmissionsAndEvaluations();
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

  const fetchSubmissionsAndEvaluations = async () => {
    setLoading(true);
    try {
      const [subRes, evalRes, vivaRes] = await Promise.all([
        submissionService.getTeacherSubmissionsForLab(labId, selectedExperimentId),
        evaluationService.getLabEvaluations(labId, selectedExperimentId),
        vivaService.getLabVivaEvaluations(labId, selectedExperimentId).catch(() => ({ data: [] }))
      ]);
      const subData = subRes.data || subRes;
      const evalData = evalRes.data || evalRes;
      const vivaData = vivaRes.data || vivaRes;
      setSubmissions(Array.isArray(subData) ? subData : []);
      setEvaluations(Array.isArray(evalData) ? evalData : []);
      setVivas(Array.isArray(vivaData) ? vivaData : []);
    } catch (err) {
      console.error('Failed to load lab submissions and evaluations ledger:', err);
      setError(err.response?.data?.message || 'Access Denied to lab submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInspection = (sub, matchedEval) => {
    const studentId = (sub.student?._id || sub.student)?.toString();
    const experimentId = (sub.experiment?._id || sub.experiment)?.toString();
    const matchedViva = vivas.find(
      (v) => (v.student?._id || v.student)?.toString() === studentId && (v.experiment?._id || v.experiment)?.toString() === experimentId
    );

    setInspectingSubmission(sub);
    setInspectingEvaluation(matchedEval || null);
    setInspectingViva(matchedViva || null);
    setVivaInputMarks(matchedViva ? matchedViva.marks : 4.0);
    setVivaInputRemarks(matchedViva ? matchedViva.remarks || '' : '');
    setVivaSaveSuccess('');
    setVivaSaveError('');
  };

  const handleSaveViva = async (e) => {
    e.preventDefault();
    if (!inspectingSubmission) return;

    const numMarks = Number(vivaInputMarks);
    if (isNaN(numMarks) || numMarks < 0 || numMarks > 5) {
      setVivaSaveError('Viva marks must be a valid number between 0 and 5.');
      return;
    }

    setSavingViva(true);
    setVivaSaveError('');
    setVivaSaveSuccess('');

    try {
      const studentId = (inspectingSubmission.student?._id || inspectingSubmission.student)?.toString();
      const experimentId = (inspectingSubmission.experiment?._id || inspectingSubmission.experiment)?.toString();

      const res = await vivaService.updateViva({
        studentId,
        experimentId,
        marks: numMarks,
        remarks: vivaInputRemarks
      });

      const updatedViva = res.data || res;
      setInspectingViva(updatedViva);

      // Refresh or update vivas list
      setVivas((prev) => {
        const idx = prev.findIndex(
          (v) => (v.student?._id || v.student)?.toString() === studentId && (v.experiment?._id || v.experiment)?.toString() === experimentId
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = updatedViva;
          return updated;
        }
        return [...prev, updatedViva];
      });

      const progScore = inspectingEvaluation ? inspectingEvaluation.score : 0;
      const totalScoreCalc = Math.round((progScore + numMarks) * 100) / 100;
      setVivaSaveSuccess(`✓ Viva score updated successfully (${numMarks}/5) — Total: ${totalScoreCalc}/15.`);
    } catch (err) {
      console.error('Failed to save viva evaluation:', err);
      setVivaSaveError(err.response?.data?.message || 'Failed to save Viva score.');
    } finally {
      setSavingViva(false);
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
        <LoadingSpinner size={40} text="Loading laboratory submissions & evaluation ledger..." />
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
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {lab?.code} &bull; {lab?.department}
          </span>
          <h1 style={{ fontSize: '1.5rem', margin: '0.375rem 0 0.125rem 0', color: 'var(--color-text-primary)' }}>
            Evaluation Ledger &amp; Submissions
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {lab?.name} &bull; Automated test case results, Viva Voce scores, and official submissions
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '1rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          backgroundColor: 'var(--color-surface)'
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="text"
            placeholder="Search student name, roll number, or experiment..."
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
          onClick={fetchSubmissionsAndEvaluations}
          className="btn btn-secondary"
          style={{ fontSize: '0.8125rem' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Submissions & Evaluations Table */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <LoadingSpinner size={32} text="Loading submissions & evaluations..." />
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
                  <th style={{ padding: '0.75rem 0.5rem' }}>Program / 10</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Viva / 5</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Total / 15</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub) => {
                  const studentId = (sub.student?._id || sub.student)?.toString();
                  const experimentId = (sub.experiment?._id || sub.experiment)?.toString();

                  const matchedEval = evaluations.find(
                    (ev) => ev.submission?._id === sub._id || ev.submission === sub._id
                  );

                  const matchedViva = vivas.find(
                    (v) => (v.student?._id || v.student)?.toString() === studentId && (v.experiment?._id || v.experiment)?.toString() === experimentId
                  );

                  const autoScore = matchedEval && typeof matchedEval.score === 'number' ? matchedEval.score : null;
                  const vivaMarks = matchedViva && typeof matchedViva.marks === 'number' ? matchedViva.marks : null;
                  const totalScore = (autoScore !== null || vivaMarks !== null)
                    ? Math.round(((autoScore || 0) + (vivaMarks || 0)) * 100) / 100
                    : null;

                  return (
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
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {matchedEval ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <strong style={{ color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                              {matchedEval.score} / 10
                            </strong>
                            {matchedEval.isHighestScore && (
                              <span className="badge badge-success" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                                ★ High
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {matchedViva ? (
                          <strong style={{ color: '#16a34a', fontSize: '0.875rem' }}>
                            {matchedViva.marks} / 5
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>— / 5</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {totalScore !== null ? (
                          <strong style={{ color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                            {totalScore} / 15
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>— / 15</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {getStatusBadge(sub.status)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenInspection(sub, matchedEval)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        >
                          👁 Inspect &amp; Grade
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT SUBMISSION & EVALUATION MODAL */}
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
              maxWidth: '900px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                  Evaluation Snapshot: {inspectingSubmission.student?.name} ({inspectingSubmission.student?.rollNumber})
                </h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Exp {inspectingSubmission.experiment?.experimentNumber}: {inspectingSubmission.experiment?.title} &bull; Attempt #{inspectingSubmission.attemptNumber} &bull; Language: {inspectingSubmission.language}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectingSubmission(null);
                  setInspectingEvaluation(null);
                  setInspectingViva(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Score & Evaluation Overview Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem'
              }}
            >
              {/* Automated Program Score Card */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Program Score
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                  {inspectingEvaluation ? `${inspectingEvaluation.score} / 10` : '— / 10'}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {inspectingEvaluation ? `${inspectingEvaluation.earnedMarks} of ${inspectingEvaluation.totalAvailableMarks} marks earned` : 'No automated evaluation'}
                </span>
              </div>

              {/* Viva Score Card */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Viva Voce Score
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
                  {inspectingViva ? `${inspectingViva.marks} / 5` : 'Pending / 5'}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Oral defense evaluation
                </span>
              </div>

              {/* Total Aggregate Score Card */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Total Evaluation
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                  {Math.round(((inspectingEvaluation?.score || 0) + (inspectingViva?.marks || 0)) * 100) / 100} / 15
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Combined Program &amp; Viva
                </span>
              </div>
            </div>

            {/* TEACHER VIVA GRADING SECTION */}
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                  🎙 Viva Score &amp; Oral Defense Assessment
                </h4>
                {inspectingViva && (
                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                    ✓ Current Viva: {inspectingViva.marks} / 5
                  </span>
                )}
              </div>

              {vivaSaveSuccess && (
                <div className="alert alert-success" style={{ fontSize: '0.8125rem' }}>
                  {vivaSaveSuccess}
                </div>
              )}

              {vivaSaveError && (
                <div className="alert alert-error" style={{ fontSize: '0.8125rem' }}>
                  {vivaSaveError}
                </div>
              )}

              <form onSubmit={handleSaveViva} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Viva Score (0.0 - 5.0) <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={vivaInputMarks}
                        onChange={(e) => setVivaInputMarks(e.target.value)}
                        required
                        style={{
                          width: '100px',
                          padding: '0.45rem 0.6rem',
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-primary)'
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>/ 5 Marks</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Teacher Remarks &amp; Feedback
                    </label>
                    <input
                      type="text"
                      value={vivaInputRemarks}
                      onChange={(e) => setVivaInputRemarks(e.target.value)}
                      placeholder="Optional notes regarding student oral defense..."
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.6rem',
                        fontSize: '0.8125rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-primary)'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    Total after saving: <strong style={{ color: 'var(--color-primary)' }}>{Math.round(((inspectingEvaluation?.score || 0) + (Number(vivaInputMarks) || 0)) * 100) / 100} / 15</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={savingViva}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8125rem', padding: '0.4rem 1rem' }}
                  >
                    {savingViva ? 'Saving Viva Score...' : '💾 Save Viva Score'}
                  </button>
                </div>
              </form>
            </div>

            {/* Test Case Evaluation Results Table for Teacher */}
            {inspectingEvaluation?.testCaseResults && inspectingEvaluation.testCaseResults.length > 0 && (
              <div>
                <strong style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                  Detailed Test Case Results ({inspectingEvaluation.testCaseResults.length} cases):
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {inspectingEvaluation.testCaseResults.map((tc, idx) => (
                    <div
                      key={tc.testCaseId || idx}
                      style={{
                        backgroundColor: tc.passed ? 'rgba(22, 163, 74, 0.06)' : 'rgba(220, 38, 38, 0.06)',
                        border: tc.passed ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid rgba(220, 38, 38, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.375rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, fontSize: '0.8125rem' }}>
                            Test Case #{tc.order || idx + 1}
                          </span>
                          {tc.isHidden ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>🔒 Hidden</span>
                          ) : (
                            <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>👁 Public</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: tc.passed ? '#16a34a' : '#dc2626' }}>
                            {tc.earnedMarks} / {tc.availableMarks} marks
                          </span>
                          {tc.passed ? (
                            <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>✓ PASS</span>
                          ) : (
                            <span className="badge badge-error" style={{ fontSize: '0.6875rem' }}>✗ FAIL</span>
                          )}
                        </div>
                      </div>

                      {tc.actualOutput && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Actual Output:</span>
                          <pre style={{ backgroundColor: '#0F172A', color: '#E2E8F0', padding: '0.4rem', borderRadius: '4px', margin: '0.2rem 0 0 0', maxHeight: '60px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                            {tc.actualOutput}
                          </pre>
                        </div>
                      )}

                      {tc.errorSummary && !tc.passed && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>
                          <strong>Failure Reason:</strong> {tc.errorSummary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted Source Code */}
            <div>
              <strong style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Submitted Source Code ({inspectingSubmission.language}):
              </strong>
              <CodeEditor
                value={inspectingSubmission.sourceCode || '// No code stored'}
                language={inspectingSubmission.language}
                readOnly={true}
                height="280px"
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
