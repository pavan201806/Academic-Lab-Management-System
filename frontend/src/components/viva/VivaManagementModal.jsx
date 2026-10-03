import React, { useState, useEffect } from 'react';
import { vivaService } from '../../services/vivaService';
import { reevaluationService } from '../../services/reevaluationService';
import LoadingSpinner from '../common/LoadingSpinner';

const VivaManagementModal = ({ isOpen, onClose, experiment, labId }) => {
  const [activeTab, setActiveTab] = useState('viva'); // 'viva' | 'reevaluations'
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [reevalRequests, setReevalRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Grading State
  const [gradingStudent, setGradingStudent] = useState(null);
  const [marksInput, setMarksInput] = useState(3.5);
  const [remarksInput, setRemarksInput] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [gradeError, setGradeError] = useState('');

  // Re-evaluation Processing State
  const [processingRequest, setProcessingRequest] = useState(null);
  const [reevalAction, setReevalAction] = useState('APPROVE'); // 'APPROVE' | 'REJECT'
  const [reevalMarks, setReevalMarks] = useState(4.0);
  const [reevalRemarks, setReevalRemarks] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submittingProcess, setSubmittingProcess] = useState(false);
  const [processError, setProcessError] = useState('');

  // History Inspection State
  const [historyStudent, setHistoryStudent] = useState(null);
  const [vivaHistory, setVivaHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && experiment?._id) {
      fetchData();
      resetFormStates();
    }
  }, [isOpen, experiment, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'viva') {
        const res = await vivaService.getEligibleStudents(experiment._id);
        const data = res.data || res;
        setEligibleStudents(Array.isArray(data) ? data : []);
      } else {
        const res = await reevaluationService.getLabRequests(labId || experiment.lab?._id || experiment.lab, experiment._id);
        const data = res.data || res;
        setReevalRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.response?.data?.message || 'Failed to load Viva records.');
    } finally {
      setLoading(false);
    }
  };

  const resetFormStates = () => {
    setGradingStudent(null);
    setMarksInput(3.5);
    setRemarksInput('');
    setGradeError('');
    setProcessingRequest(null);
    setReevalAction('APPROVE');
    setReevalMarks(4.0);
    setReevalRemarks('');
    setReviewRemarks('');
    setProcessError('');
    setHistoryStudent(null);
    setVivaHistory([]);
  };

  const handleOpenGrade = (stuItem) => {
    setGradingStudent(stuItem);
    setMarksInput(stuItem.viva ? stuItem.viva.marks : 3.5);
    setRemarksInput(stuItem.viva ? stuItem.viva.remarks || '' : '');
    setGradeError('');
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    setGradeError('');
    setSuccessMsg('');

    const numMarks = Number(marksInput);
    if (isNaN(numMarks) || numMarks < 0 || numMarks > 5) {
      setGradeError('Viva marks must be between 0 and 5.');
      return;
    }

    setSubmittingGrade(true);
    try {
      await vivaService.createViva({
        studentId: gradingStudent.student._id,
        experimentId: experiment._id,
        marks: numMarks,
        remarks: remarksInput
      });
      setSuccessMsg(`Viva evaluation saved for ${gradingStudent.student.name} (${numMarks}/5).`);
      setGradingStudent(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to submit Viva grade:', err);
      setGradeError(err.response?.data?.message || 'Failed to save Viva evaluation.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  const handleOpenHistory = async (stu) => {
    setHistoryStudent(stu);
    setLoadingHistory(true);
    try {
      const res = await vivaService.getStudentVivaForFaculty(stu._id, experiment._id);
      const data = res.data || res;
      setVivaHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenProcess = (req) => {
    setProcessingRequest(req);
    setReevalAction('APPROVE');
    setReevalMarks(req.vivaEvaluation ? req.vivaEvaluation.marks : 4.0);
    setReevalRemarks('');
    setReviewRemarks('');
    setProcessError('');
  };

  const handleSubmitProcess = async (e) => {
    e.preventDefault();
    setProcessError('');
    setSuccessMsg('');

    const numMarks = Number(reevalMarks);
    if (reevalAction === 'APPROVE' && (isNaN(numMarks) || numMarks < 0 || numMarks > 5)) {
      setProcessError('New viva marks must be between 0 and 5.');
      return;
    }

    setSubmittingProcess(true);
    try {
      await reevaluationService.processRequest(processingRequest._id, {
        action: reevalAction,
        reviewRemarks,
        marks: reevalAction === 'APPROVE' ? numMarks : undefined,
        remarks: reevalAction === 'APPROVE' ? reevalRemarks : undefined
      });
      setSuccessMsg(`Re-evaluation request for ${processingRequest.student?.name} marked as ${reevalAction === 'APPROVE' ? 'COMPLETED' : 'REJECTED'}.`);
      setProcessingRequest(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to process re-evaluation:', err);
      setProcessError(err.response?.data?.message || 'Failed to process request.');
    } finally {
      setSubmittingProcess(false);
    }
  };

  if (!isOpen || !experiment) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
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
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--color-surface-subtle)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                EXP {experiment.experimentNumber}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                Oral Defense &amp; Re-evaluation Suite (/5 Marks)
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-text-primary)' }}>
              Viva Console: {experiment.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.875rem' }}
          >
            ✕ Close
          </button>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('viva');
              resetFormStates();
            }}
            className={`btn ${activeTab === 'viva' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8125rem', padding: '0.35rem 1rem' }}
          >
            🎙 Eligible Students Viva
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('reevaluations');
              resetFormStates();
            }}
            className={`btn ${activeTab === 'reevaluations' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8125rem', padding: '0.35rem 1rem' }}
          >
            🔄 Re-evaluation Requests {reevalRequests.filter(r => r.status === 'PENDING').length > 0 && `(${reevalRequests.filter(r => r.status === 'PENDING').length} Pending)`}
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: '440px' }}>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.25rem'
            }}
          >
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div className="alert alert-success" style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {successMsg}
              </div>
            )}

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <LoadingSpinner size={32} text="Loading records..." />
              </div>
            ) : activeTab === 'viva' ? (
              /* TAB 1: ELIGIBLE STUDENTS VIVA */
              eligibleStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                  No students found enrolled in your assigned sections for this laboratory.
                </div>
              ) : (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Student</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Roll No</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Section</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Auto Score / 10</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Viva Score / 5</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Status</th>
                        <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibleStudents.map((item) => (
                        <tr key={item.student._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {item.student.name}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-family-mono)' }}>
                            {item.student.rollNumber}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <span className="badge badge-info">{item.student.section}</span>
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            {item.submissionsCount > 0 ? (
                              <strong style={{ color: 'var(--color-primary)' }}>{item.highestAutomatedScore} / 10</strong>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>Not submitted</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            {item.viva ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <strong style={{ color: '#16a34a', fontSize: '0.875rem' }}>
                                  {item.viva.marks} / 5
                                </strong>
                                {item.viva.status === 'RE_EVALUATED' && (
                                  <span className="badge badge-warning" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                                    v{item.viva.evaluationVersion} Re-eval
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>— / 5</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            {item.viva ? (
                              <span className="badge badge-success">✓ Evaluated</span>
                            ) : (
                              <span className="badge badge-warning">⏳ Pending Viva</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                              {!item.viva ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenGrade(item)}
                                  className="btn btn-primary"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                >
                                  🎙 Grade Viva
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHistory(item.student)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                  >
                                    📜 History
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* TAB 2: RE-EVALUATION REQUESTS */
              reevalRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                  No re-evaluation requests submitted for this experiment.
                </div>
              ) : (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Student</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Original Marks</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Reason</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Requested At</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Status</th>
                        <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reevalRequests.map((req) => (
                        <tr key={req._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>
                            {req.student?.name} ({req.student?.rollNumber})
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            {req.vivaEvaluation ? `${req.vivaEvaluation.marks} / 5` : '—'}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.reason}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', color: 'var(--color-text-secondary)' }}>
                            {new Date(req.requestedAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            {req.status === 'PENDING' && <span className="badge badge-warning">⏳ Pending</span>}
                            {req.status === 'COMPLETED' && <span className="badge badge-success">✓ Completed</span>}
                            {req.status === 'REJECTED' && <span className="badge badge-error">✗ Rejected</span>}
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                            {req.status === 'PENDING' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenProcess(req)}
                                className="btn btn-primary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                              >
                                Process ✍
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {req.reviewedBy?.name ? `By ${req.reviewedBy.name}` : 'Processed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* RIGHT SIDE PANEL: Grade Viva Dialog */}
          {gradingStudent && (
            <div
              style={{
                width: '340px',
                borderLeft: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--color-text-primary)' }}>
                  🎙 Grade Viva
                </h3>
                <button
                  type="button"
                  onClick={() => setGradingStudent(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.15rem 0.45rem', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              </div>

              <div>
                <strong>{gradingStudent.student.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Roll: {gradingStudent.student.rollNumber} &bull; Sec: {gradingStudent.student.section}
                </div>
              </div>

              {gradeError && (
                <div className="alert alert-error" style={{ fontSize: '0.75rem' }}>
                  {gradeError}
                </div>
              )}

              <form onSubmit={handleSubmitGrade} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Viva Marks (0.0 to 5.0) <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={marksInput}
                    onChange={(e) => setMarksInput(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Teacher Remarks &amp; Feedback
                  </label>
                  <textarea
                    rows={4}
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                    placeholder="Enter oral defense notes and remarks..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.8125rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingGrade}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  {submittingGrade ? 'Saving...' : 'Submit Viva Evaluation'}
                </button>
              </form>
            </div>
          )}

          {/* RIGHT SIDE PANEL: Process Re-evaluation Dialog */}
          {processingRequest && (
            <div
              style={{
                width: '360px',
                borderLeft: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--color-text-primary)' }}>
                  ✍ Process Re-evaluation
                </h3>
                <button
                  type="button"
                  onClick={() => setProcessingRequest(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.15rem 0.45rem', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              </div>

              <div>
                <strong>{processingRequest.student?.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                  Original Score: <strong>{processingRequest.vivaEvaluation?.marks} / 5</strong>
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.75rem',
                    marginTop: '0.5rem'
                  }}
                >
                  <strong>Student Reason:</strong> {processingRequest.reason}
                </div>
              </div>

              {processError && (
                <div className="alert alert-error" style={{ fontSize: '0.75rem' }}>
                  {processError}
                </div>
              )}

              <form onSubmit={handleSubmitProcess} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Decision Action
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setReevalAction('APPROVE')}
                      className={`btn ${reevalAction === 'APPROVE' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, fontSize: '0.75rem' }}
                    >
                      ✓ Approve &amp; Re-evaluate
                    </button>
                    <button
                      type="button"
                      onClick={() => setReevalAction('REJECT')}
                      className={`btn ${reevalAction === 'REJECT' ? 'btn-danger' : 'btn-secondary'}`}
                      style={{ flex: 1, fontSize: '0.75rem' }}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>

                {reevalAction === 'APPROVE' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      New Viva Marks (0.0 to 5.0) <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.5"
                      value={reevalMarks}
                      onChange={(e) => setReevalMarks(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '0.875rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-primary)'
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Reviewer Remarks to Student
                  </label>
                  <textarea
                    rows={3}
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="Enter notes on why approved/rejected..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '0.8125rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingProcess}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  {submittingProcess ? 'Processing...' : 'Confirm Decision'}
                </button>
              </form>
            </div>
          )}

          {/* RIGHT SIDE PANEL: Viva Version History Viewer */}
          {historyStudent && (
            <div
              style={{
                width: '360px',
                borderLeft: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--color-text-primary)' }}>
                  📜 Viva History
                </h3>
                <button
                  type="button"
                  onClick={() => setHistoryStudent(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.15rem 0.45rem', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              </div>

              <div>
                <strong>{historyStudent.name}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Roll: {historyStudent.rollNumber}
                </div>
              </div>

              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <LoadingSpinner size={20} />
                </div>
              ) : vivaHistory.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>No history available.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {vivaHistory.map((item) => (
                    <div
                      key={item._id}
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: item.isCurrent ? '1px solid #16a34a' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.8125rem' }}>
                          Version #{item.evaluationVersion} {item.isCurrent && '★ (Current)'}
                        </strong>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>
                          {item.marks} / 5
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        Evaluator: {item.evaluatedBy?.name || 'Faculty'} &bull; {new Date(item.evaluatedAt).toLocaleDateString()}
                      </div>
                      {item.remarks && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-primary)' }}>
                          <em>"{item.remarks}"</em>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VivaManagementModal;
