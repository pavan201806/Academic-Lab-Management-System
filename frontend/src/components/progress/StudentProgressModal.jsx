import React, { useState, useEffect } from 'react';
import { progressService } from '../../services/progressService';
import LoadingSpinner from '../common/LoadingSpinner';

const StudentProgressModal = ({ isOpen, onClose, labId, labName, labCode }) => {
  const [cohortProgress, setCohortProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentProgress, setSelectedStudentProgress] = useState(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);

  useEffect(() => {
    if (isOpen && labId) {
      fetchCohortProgress();
    }
  }, [isOpen, labId]);

  const fetchCohortProgress = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await progressService.getLabCohortProgress(labId);
      const data = res.data || res;
      setCohortProgress(data);
    } catch (err) {
      console.error('Failed to load lab cohort progress:', err);
      setError(err.response?.data?.message || 'Failed to retrieve cohort progress');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectStudent = async (studentId) => {
    setStudentDetailLoading(true);
    try {
      const res = await progressService.getStudentProgressForTeacher(labId, studentId);
      setSelectedStudentProgress(res.data || res);
    } catch (err) {
      console.error('Failed to load student progress detail:', err);
    } finally {
      setStudentDetailLoading(false);
    }
  };

  if (!isOpen) return null;

  const studentsList = cohortProgress?.studentsProgress || [];
  const filteredStudents = studentsList.filter((sp) => {
    const term = searchTerm.toLowerCase();
    const name = sp.student?.name?.toLowerCase() || '';
    const roll = sp.student?.rollNumber?.toLowerCase() || '';
    const sec = sp.student?.section?.toLowerCase() || '';
    return name.includes(term) || roll.includes(term) || sec.includes(term);
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-surface-hover)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.125rem'
              }}
            >
              📊
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                  Student Progress &amp; Completion Tracker
                </h2>
                <span className="badge badge-primary">{labCode || 'Lab'}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.125rem 0 0 0' }}>
                {labName} &bull; Academic Cohort Benchmarking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '0.25rem 0.5rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <LoadingSpinner size={36} text="Calculating cohort completion and academic scores..." />
            </div>
          ) : error ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
              ⚠️ {error}
            </div>
          ) : (
            <>
              {/* Summary Metric Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}
              >
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    TOTAL ENROLLED STUDENTS
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                    {cohortProgress?.cohortSummary?.totalEnrolledStudents || 0}
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    COHORT COMPLETION RATE
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.25rem' }}>
                    {cohortProgress?.cohortSummary?.averageCompletionPercentage || 0}%
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    AVERAGE COMBINED SCORE
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                    {cohortProgress?.cohortSummary?.averageScore || 0} <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>/ 15</span>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Search student by name, roll number, section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ maxWidth: '380px' }}
                />
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Showing {filteredStudents.length} of {studentsList.length} students
                </span>
              </div>

              {/* Students Progress Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Student Roster</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Section</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Completion Progress</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Automated (/10)</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Viva (/5)</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Total (/15)</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                            No students found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((sp) => (
                          <tr key={sp.student?._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                {sp.student?.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                <code>{sp.student?.rollNumber}</code>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span className="badge badge-secondary">{sp.student?.section || 'N/A'}</span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', minWidth: '160px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                <span>{sp.completedExperiments} / {sp.totalExperiments} Completed</span>
                                <strong style={{ color: '#059669' }}>{sp.completionPercentage}%</strong>
                              </div>
                              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${sp.completionPercentage}%`,
                                    height: '100%',
                                    backgroundColor: '#059669',
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease'
                                  }}
                                />
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                              {sp.averageAutomatedScore}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0284c7' }}>
                              {sp.averageVivaScore}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                              {sp.averageTotalScore}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleInspectStudent(sp.student?._id)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              >
                                Breakdown 👁
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Student Detailed Breakdown Inspection Sub-Modal */}
        {selectedStudentProgress && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
            onClick={() => setSelectedStudentProgress(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '700px',
                maxHeight: '85vh',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                    {selectedStudentProgress.student?.name} &mdash; Curriculum Progress Breakdown
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Roll No: <code>{selectedStudentProgress.student?.rollNumber}</code> &bull; Section: {selectedStudentProgress.student?.section}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStudentProgress(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>COMPLETED</span>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {selectedStudentProgress.completedExperiments} / {selectedStudentProgress.totalExperiments}
                    </div>
                  </div>
                  <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>AVG SCORE (/15)</span>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#059669' }}>
                      {selectedStudentProgress.averageTotalScore}
                    </div>
                  </div>
                  <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>PROGRESS</span>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {selectedStudentProgress.completionPercentage}%
                    </div>
                  </div>
                </div>

                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Experiment</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Auto (/10)</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Viva (/5)</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Total (/15)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedStudentProgress.experiments || []).map((exp) => (
                      <tr key={exp.experimentId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{ fontWeight: 600 }}>Exp {exp.order}: {exp.title}</span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          {exp.isCompleted ? (
                            <span className="badge badge-success">✓ COMPLETED</span>
                          ) : (
                            <span className="badge badge-warning">PENDING</span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>
                          {exp.automatedScore}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#0284c7' }}>
                          {exp.vivaScore}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {exp.totalScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                <button onClick={() => setSelectedStudentProgress(null)} className="btn btn-primary">
                  Close Breakdown
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProgressModal;
