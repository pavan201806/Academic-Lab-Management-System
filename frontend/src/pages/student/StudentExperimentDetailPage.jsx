import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { experimentService } from '../../services/experimentService';
import { submissionService } from '../../services/submissionService';
import { evaluationService } from '../../services/evaluationService';
import { testCaseService } from '../../services/testCaseService';
import { vivaService } from '../../services/vivaService';
import { reevaluationService } from '../../services/reevaluationService';
import { malpracticeService } from '../../services/malpracticeService';
import { useMalpracticeMonitor } from '../../hooks/useMalpracticeMonitor';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CodeEditor from '../../components/code/CodeEditor';

const STARTER_TEMPLATES = {
  Python: `# Python Solution Template
import sys

def main():
    # Read inputs from standard input if required
    # input_data = sys.stdin.read().strip()
    print("Execution output initialized.")

if __name__ == "__main__":
    main()
`,
  Java: `// Java Solution Template
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("Execution output initialized.");
    }
}
`,
  C: `/* C Solution Template */
#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("Execution output initialized.\\n");
    return 0;
}
`,
  'C++': `// C++ Solution Template
#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    cout << "Execution output initialized." << endl;
    return 0;
}
`
};

const StudentExperimentDetailPage = () => {
  const { labId, experimentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Execution & Submission State
  const [language, setLanguage] = useState('Python');
  const [sourceCode, setSourceCode] = useState(STARTER_TEMPLATES.Python);
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);

  // Run / Submit status
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [activeOutputTab, setActiveOutputTab] = useState('stdout'); // 'stdout' | 'stderr'
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');
  const [submitErrorMsg, setSubmitErrorMsg] = useState('');

  // Submissions & Evaluations State
  const [submissions, setSubmissions] = useState([]);
  const [evaluationsData, setEvaluationsData] = useState({
    evaluations: [],
    highestScore: 0,
    totalAttempts: 0,
    attemptsRemaining: 3
  });
  const [publicTestCases, setPublicTestCases] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);

  // Phase 8: Viva & Re-evaluation State
  const [vivaData, setVivaData] = useState({
    currentViva: null,
    history: [],
    reevaluationRequest: null
  });
  const [showReevalModal, setShowReevalModal] = useState(false);
  const [reevalReason, setReevalReason] = useState('');
  const [submittingReeval, setSubmittingReeval] = useState(false);
  const [reevalError, setReevalError] = useState('');
  const [reevalSuccess, setReevalSuccess] = useState('');
  const [showVivaHistoryModal, setShowVivaHistoryModal] = useState(false);

  // Active tab on page: 'workbench' | 'guide' | 'history'
  const [activeViewTab, setActiveViewTab] = useState('workbench');

  // Phase 1 & 2 Malpractice Prevention State
  const [malpracticeWarning, setMalpracticeWarning] = useState(null);
  const malpracticeTimerRef = useRef(null);

  const isExperimentActive = !loading && !error && experiment && experiment.status !== 'CLOSED';

  // Phase 2: Tab Switch, Window Blur, and Fullscreen Monitoring
  const {
    isFullscreen,
    hasEverEnteredFullscreen,
    requestFullscreen,
    exitFullscreen
  } = useMalpracticeMonitor({
    experimentId,
    labId,
    enabled: isExperimentActive,
    onWarning: (message) => {
      if (malpracticeTimerRef.current) {
        clearTimeout(malpracticeTimerRef.current);
      }
      setMalpracticeWarning(message);
      malpracticeTimerRef.current = setTimeout(() => {
        setMalpracticeWarning(null);
      }, 4000);
    }
  });

  const handleMalpracticeAttempt = (eventType, message) => {
    if (malpracticeTimerRef.current) {
      clearTimeout(malpracticeTimerRef.current);
    }
    setMalpracticeWarning(message);
    malpracticeTimerRef.current = setTimeout(() => {
      setMalpracticeWarning(null);
    }, 4000);

    malpracticeService.recordMalpracticeEvent({
      experimentId,
      labId,
      eventType,
      details: {
        language,
        codeLength: sourceCode ? sourceCode.length : 0
      }
    });
  };

  useEffect(() => {
    fetchExperimentAndHistory();
    return () => {
      if (malpracticeTimerRef.current) {
        clearTimeout(malpracticeTimerRef.current);
      }
      malpracticeService.clearCooldownCache();
    };
  }, [experimentId]);

  const fetchExperimentAndHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await experimentService.getExperimentById(experimentId);
      const data = res.data || res;
      setExperiment(data);

      // Set initial language from allowed experiment languages
      if (data.programmingLanguages && data.programmingLanguages.length > 0) {
        const defaultLang = data.programmingLanguages[0];
        setLanguage(defaultLang);
        setSourceCode(STARTER_TEMPLATES[defaultLang] || '// Write your code here');
      }

      // Fetch public test cases, submissions, evaluations, and viva data
      await Promise.all([
        fetchSubmissionHistory(),
        fetchEvaluations(),
        fetchPublicTestCases(),
        fetchVivaData()
      ]);
    } catch (err) {
      console.error('Failed to load experiment:', err);
      setError(err.response?.data?.message || 'Access Denied or Experiment not found.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicTestCases = async () => {
    try {
      const res = await testCaseService.getTestCasesForExperiment(experimentId);
      const data = res.data || res;
      setPublicTestCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load public test cases:', err);
    }
  };

  const fetchSubmissionHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await submissionService.getStudentSubmissions(experimentId);
      const data = res.data || res;
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load submissions history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchEvaluations = async () => {
    try {
      const res = await evaluationService.getStudentEvaluations(experimentId);
      const data = res.data || res;
      setEvaluationsData({
        evaluations: data.evaluations || [],
        highestScore: data.highestScore || 0,
        totalAttempts: data.totalAttempts || 0,
        attemptsRemaining: data.attemptsRemaining !== undefined ? data.attemptsRemaining : 3
      });
    } catch (err) {
      console.error('Failed to load student evaluations:', err);
    }
  };

  const fetchVivaData = async () => {
    try {
      const res = await vivaService.getStudentViva(experimentId);
      const data = res.data || res;
      setVivaData(data || { currentViva: null, history: [], reevaluationRequest: null });
    } catch (err) {
      console.error('Failed to load viva data:', err);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    // If editor has default template or empty, swap to template for new language
    if (!sourceCode.trim() || Object.values(STARTER_TEMPLATES).includes(sourceCode)) {
      setSourceCode(STARTER_TEMPLATES[newLang] || '// Write your code here');
    }
  };

  const handleResetTemplate = () => {
    if (window.confirm('Reset code editor to the default starter template for ' + language + '?')) {
      setSourceCode(STARTER_TEMPLATES[language] || '// Write your code here');
    }
  };

  // Manual Test Run (does NOT consume attempt or create submission)
  const handleRunCode = async () => {
    if (!sourceCode.trim()) {
      alert('Please enter source code before running.');
      return;
    }

    setRunning(true);
    setExecutionResult(null);
    setSubmitSuccessMsg('');
    setSubmitErrorMsg('');

    try {
      const res = await submissionService.runCode({
        experimentId,
        language,
        sourceCode,
        stdin
      });
      const data = res.data || res;
      setExecutionResult(data.executionResult);
      if (data.executionResult?.status === 'COMPILE_ERROR' || data.executionResult?.status === 'RUNTIME_ERROR') {
        setActiveOutputTab('stderr');
      } else {
        setActiveOutputTab('stdout');
      }
    } catch (err) {
      console.error('Run failed:', err);
      setExecutionResult({
        status: 'EXECUTION_ERROR',
        stderr: err.response?.data?.message || 'Failed to execute code.',
        stdout: '',
        executionTimeMs: 0
      });
      setActiveOutputTab('stderr');
    } finally {
      setRunning(false);
    }
  };

  // Official Submission (consumes attempt & triggers automated evaluation)
  const handleConfirmSubmit = async () => {
    setShowSubmitModal(false);
    setSubmitting(true);
    setSubmitSuccessMsg('');
    setSubmitErrorMsg('');

    try {
      const res = await submissionService.submitCode({
        experimentId,
        language,
        sourceCode,
        stdin
      });
      const data = res.data || res;
      setSubmitSuccessMsg(`Attempt #${data.attemptNumber} submitted & evaluated successfully!`);
      setExecutionResult(data.executionOutput);
      if (data.executionOutput?.status === 'COMPILE_ERROR' || data.executionOutput?.status === 'RUNTIME_ERROR') {
        setActiveOutputTab('stderr');
      } else {
        setActiveOutputTab('stdout');
      }
      // Refresh history & evaluations
      await Promise.all([fetchSubmissionHistory(), fetchEvaluations()]);
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitErrorMsg(err.response?.data?.message || 'Failed to submit code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Student submits re-evaluation request
  const handleRequestReevaluation = async (e) => {
    e.preventDefault();
    if (!reevalReason || reevalReason.trim().length < 5) {
      setReevalError('Please provide a reason of at least 5 characters.');
      return;
    }

    setSubmittingReeval(true);
    setReevalError('');
    setReevalSuccess('');
    try {
      await reevaluationService.requestReevaluation({
        experimentId,
        reason: reevalReason
      });
      setReevalSuccess('Re-evaluation request submitted to faculty.');
      setShowReevalModal(false);
      setReevalReason('');
      await fetchVivaData();
    } catch (err) {
      console.error('Failed to request re-evaluation:', err);
      setReevalError(err.response?.data?.message || 'Failed to submit re-evaluation request.');
    } finally {
      setSubmittingReeval(false);
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

  const latestEvaluation =
    evaluationsData.evaluations && evaluationsData.evaluations.length > 0
      ? evaluationsData.evaluations[evaluationsData.evaluations.length - 1]
      : null;

  const currentViva = vivaData.currentViva;
  const reevaluationRequest = vivaData.reevaluationRequest;

  const automatedHighest = evaluationsData.highestScore || 0;
  const vivaScore = currentViva ? currentViva.marks : 0;
  const totalScore = currentViva ? Math.round((automatedHighest + vivaScore) * 100) / 100 : null;

  const attemptsUsed = evaluationsData.totalAttempts || submissions.length;
  const attemptsRemaining = Math.max(0, 3 - attemptsUsed);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Loading experiment workbench & evaluation suite..." />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header & Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate(`/student/labs/${labId}`)}
          className="btn btn-secondary"
          style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <span>&larr;</span> Back to Laboratory Curriculum
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`badge ${attemptsRemaining > 0 ? 'badge-primary' : 'badge-error'}`}>
            Official Attempts: {attemptsUsed} / 3 ({attemptsRemaining} remaining)
          </span>
          <span className="badge badge-info">{experiment.lab?.code}</span>
        </div>
      </div>

      {/* Experiment Banner & Academic Scoring Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
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
              EXP {experiment.experimentNumber < 10 ? `0${experiment.experimentNumber}` : experiment.experimentNumber}
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              {experiment.lab?.name} &bull; Section {user?.section}
            </span>
          </div>
          <h1 style={{ fontSize: '1.375rem', color: 'var(--color-primary)', margin: 0 }}>
            {experiment.title}
          </h1>
        </div>

        {/* Phase 7 & 8 Scoring Metrics Suite */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Automated Score / 10 */}
          <div
            style={{
              padding: '0.4rem 0.85rem',
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Auto Score
            </span>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {evaluationsData.highestScore} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>/ 10</span>
            </div>
          </div>

          {/* Viva Score / 5 */}
          <div
            style={{
              padding: '0.4rem 0.85rem',
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Viva Score
            </span>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: currentViva ? '#16a34a' : 'var(--color-text-muted)' }}>
              {currentViva ? `${currentViva.marks}` : '—'} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>/ 5</span>
            </div>
          </div>

          {/* Academic Total / 15 */}
          <div
            style={{
              padding: '0.4rem 0.85rem',
              backgroundColor: currentViva ? 'var(--color-primary-subtle)' : 'var(--color-canvas)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-primary)',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Score
            </span>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {totalScore !== null ? `${totalScore}` : '—'} <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 500 }}>/ 15</span>
            </div>
          </div>

          {/* View Toggle Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--color-canvas)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setActiveViewTab('workbench')}
              className={`btn ${activeViewTab === 'workbench' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}
            >
              ⚡ Code Studio
            </button>
            <button
              onClick={() => setActiveViewTab('guide')}
              className={`btn ${activeViewTab === 'guide' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}
            >
              📋 Protocol Guide
            </button>
            <button
              onClick={() => setActiveViewTab('history')}
              className={`btn ${activeViewTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}
            >
              📜 Attempts ({submissions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {submitSuccessMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#166534',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>🎉 {submitSuccessMsg}</span>
          <button onClick={() => setSubmitSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}>✕</button>
        </div>
      )}

      {reevalSuccess && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#166534',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>📬 {reevalSuccess}</span>
          <button onClick={() => setReevalSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}>✕</button>
        </div>
      )}

      {submitErrorMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>⚠️ {submitErrorMsg}</span>
          <button onClick={() => setSubmitErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>✕</button>
        </div>
      )}

      {/* Phase 8: VIVA EVALUATION & RE-EVALUATION STATUS CARD */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🎙</span>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--color-text-primary)' }}>
              Viva Voce Assessment (Oral Defense &bull; 5 Marks)
            </h3>
            {currentViva ? (
              <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                ✓ EVALUATED ({currentViva.marks} / 5)
              </span>
            ) : (
              <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                ⏳ Awaiting Faculty Evaluation
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {vivaData.history.length > 1 && (
              <button
                type="button"
                onClick={() => setShowVivaHistoryModal(true)}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                📜 Viva History ({vivaData.history.length} versions)
              </button>
            )}

            {currentViva && !reevaluationRequest && (
              <button
                type="button"
                onClick={() => {
                  setReevalError('');
                  setShowReevalModal(true);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              >
                🔄 Request Re-evaluation
              </button>
            )}
          </div>
        </div>

        {currentViva ? (
          <div
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: '0.875rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.8125rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <strong>Evaluated By:</strong> {currentViva.evaluatedBy?.name || 'Faculty'} &bull;{' '}
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {new Date(currentViva.evaluatedAt || currentViva.createdAt).toLocaleDateString()}
                </span>
                {currentViva.evaluationVersion > 1 && (
                  <span className="badge badge-warning" style={{ marginLeft: '0.5rem', fontSize: '0.6875rem' }}>
                    Version #{currentViva.evaluationVersion} (Re-evaluated)
                  </span>
                )}
              </div>

              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#16a34a' }}>
                {currentViva.marks} / 5 Marks
              </div>
            </div>

            {currentViva.remarks && (
              <div style={{ color: 'var(--color-text-primary)' }}>
                <strong>Faculty Remarks:</strong> <em>"{currentViva.remarks}"</em>
              </div>
            )}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            After you have completed your experiment execution and official submission, present your solution to your lab faculty for oral defense evaluation.
          </p>
        )}

        {/* Re-evaluation Request Status Banner */}
        {reevaluationRequest && (
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              fontSize: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div>
              <strong>Re-evaluation Request:</strong>{' '}
              {reevaluationRequest.status === 'PENDING' && <span className="badge badge-warning">⏳ Under Review</span>}
              {reevaluationRequest.status === 'COMPLETED' && <span className="badge badge-success">✓ Approved &amp; Updated</span>}
              {reevaluationRequest.status === 'REJECTED' && <span className="badge badge-error">✗ Declined</span>}
              <div style={{ color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                <strong>Reason:</strong> {reevaluationRequest.reason}
              </div>
              {reevaluationRequest.reviewRemarks && (
                <div style={{ color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                  <strong>Faculty Feedback:</strong> {reevaluationRequest.reviewRemarks}
                </div>
              )}
            </div>

            <div style={{ color: 'var(--color-text-muted)' }}>
              Requested on {new Date(reevaluationRequest.requestedAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: CODE STUDIO WORKBENCH */}
      {activeViewTab === 'workbench' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
          {/* Top Control Bar: Language, Reset, Stdin, Run, Submit */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            {/* Left Controls: Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label htmlFor="language-select" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Language:
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8125rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-canvas)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {experiment.programmingLanguages?.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleResetTemplate}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                title="Reset to starter template"
              >
                ↺ Reset Template
              </button>

              <button
                type="button"
                onClick={() => setShowStdin(!showStdin)}
                className={`btn ${showStdin ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              >
                ⌨ Standard Input {stdin ? '●' : ''}
              </button>

              <button
                type="button"
                onClick={isFullscreen ? exitFullscreen : requestFullscreen}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Required for Monitored Sessions)'}
              >
                <span>{isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen'}</span>
              </button>
            </div>

            {/* Right Controls: Run Code & Official Submit */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRunCode}
                disabled={running || submitting}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.45rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontWeight: 600
                }}
              >
                {running ? <LoadingSpinner size={14} /> : <span>▶</span>}
                <span>Run Code (Preview)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                disabled={running || submitting || attemptsRemaining <= 0}
                className="btn btn-primary"
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.45rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontWeight: 700,
                  backgroundColor: attemptsRemaining > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)'
                }}
              >
                {submitting ? <LoadingSpinner size={14} /> : <span>🚀</span>}
                <span>Official Submit ({attemptsRemaining} left)</span>
              </button>
            </div>
          </div>

          {/* Stdin Area (Collapsible) */}
          {showStdin && (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem'
              }}
            >
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Standard Input (Custom stdin data for manual execution)
              </label>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter input values to be read by scanf(), cin, sys.stdin, or Scanner..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '0.8125rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-canvas)',
                  color: 'var(--color-text-primary)'
                }}
              />
            </div>
          )}

          {/* Malpractice Warning Banner */}
          {malpracticeWarning && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.625rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-md)',
                color: '#F87171',
                fontSize: '0.8125rem',
                fontWeight: 500,
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <span>{malpracticeWarning}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {!isFullscreen && (
                  <button
                    type="button"
                    onClick={requestFullscreen}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.25)',
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      color: '#FCA5A5',
                      borderRadius: '4px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ⛶ Return to Fullscreen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMalpracticeWarning(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#F87171',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '0.1rem 0.3rem',
                    lineHeight: 1
                  }}
                >
                  &times;
                </button>
              </div>
            </div>
          )}

          {/* Code Editor with Malpractice Protection Enabled */}
          <CodeEditor
            value={sourceCode}
            onChange={setSourceCode}
            language={language}
            height="460px"
            enableMalpracticeProtection={true}
            onMalpracticeAttempt={handleMalpracticeAttempt}
          />

          {/* Phase 7 Test Case Evaluation Results Card */}
          {latestEvaluation && (
            <div
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🧪</span>
                  <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--color-text-primary)' }}>
                    Automated Evaluation Results: Attempt #{latestEvaluation.attemptNumber}
                  </h3>
                  {latestEvaluation.isHighestScore && (
                    <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                      ★ HIGHEST SCORE
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    Earned: <strong>{latestEvaluation.earnedMarks}</strong> / {latestEvaluation.totalAvailableMarks} marks
                  </span>
                  <div
                    style={{
                      fontFamily: 'var(--font-family-mono)',
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: 'var(--color-primary)',
                      backgroundColor: 'var(--color-primary-subtle)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {latestEvaluation.score} / 10
                  </div>
                </div>
              </div>

              {/* Test Case Badges Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {latestEvaluation.testCaseResults?.map((tc, idx) => (
                  <div
                    key={tc.testCaseId || idx}
                    style={{
                      backgroundColor: tc.passed ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                      border: tc.passed ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid rgba(220, 38, 38, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.375rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, fontSize: '0.8125rem' }}>
                        Test Case #{tc.order || idx + 1}
                      </span>
                      {tc.passed ? (
                        <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>✓ Passed</span>
                      ) : (
                        <span className="badge badge-error" style={{ fontSize: '0.6875rem' }}>✗ Failed</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      <span>{tc.isHidden ? '🔒 Hidden Case' : '👁 Public Case'}</span>
                      <span style={{ fontWeight: 600, color: tc.passed ? '#16a34a' : '#dc2626' }}>
                        {tc.earnedMarks} / {tc.availableMarks} pts
                      </span>
                    </div>

                    {tc.executionTimeMs !== undefined && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                        ⏱ {tc.executionTimeMs} ms &bull; {tc.executionStatus}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execution Output Console */}
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              fontFamily: 'var(--font-family-mono, monospace)'
            }}
          >
            {/* Terminal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                backgroundColor: '#1E293B',
                borderBottom: '1px solid #334155',
                fontSize: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#38BDF8', fontWeight: 700 }}>TERMINAL CONSOLE</span>
                {executionResult && getStatusBadge(executionResult.status)}
                {executionResult?.executionTimeMs !== undefined && (
                  <span style={{ color: '#94A3B8', fontSize: '0.6875rem' }}>
                    ⏱ {executionResult.executionTimeMs} ms
                  </span>
                )}
              </div>

              {/* Console Tabs */}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('stdout')}
                  style={{
                    backgroundColor: activeOutputTab === 'stdout' ? '#334155' : 'transparent',
                    color: activeOutputTab === 'stdout' ? '#F8FAFC' : '#94A3B8',
                    border: 'none',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  Standard Output {executionResult?.stdout ? '●' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('stderr')}
                  style={{
                    backgroundColor: activeOutputTab === 'stderr' ? '#334155' : 'transparent',
                    color: activeOutputTab === 'stderr' ? '#F87171' : '#94A3B8',
                    border: 'none',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  Compiler / Error Log {executionResult?.stderr ? '●' : ''}
                </button>
              </div>
            </div>

            {/* Terminal Output Body */}
            <div
              style={{
                padding: '1rem',
                minHeight: '140px',
                maxHeight: '300px',
                overflowY: 'auto',
                fontSize: '0.8125rem',
                lineHeight: '1.4rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: activeOutputTab === 'stdout' ? '#E2E8F0' : '#F87171'
              }}
            >
              {running ? (
                <div style={{ color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LoadingSpinner size={16} />
                  <span>Compiling and executing in isolated Docker sandbox...</span>
                </div>
              ) : !executionResult ? (
                <div style={{ color: '#64748B' }}>
                  No execution output. Click <strong>Run Code</strong> (Preview) or <strong>Official Submit</strong> to evaluate your program.
                </div>
              ) : activeOutputTab === 'stdout' ? (
                executionResult.stdout || <span style={{ color: '#64748B' }}>[No standard output generated]</span>
              ) : (
                executionResult.stderr || <span style={{ color: '#64748B' }}>[No errors or compiler warnings reported]</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROTOCOL GUIDE */}
      {activeViewTab === 'guide' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Objective Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎯</span> Objective &amp; Learning Goals
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
              {experiment.objective || 'Complete the experimental procedure and verify all test outputs as outlined in the curriculum protocol.'}
            </p>
          </div>

          {/* Procedure Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋</span> Detailed Procedure &amp; Instructions
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

          {/* Sample Visible Test Cases Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🧪</span> Sample Test Cases
            </h2>

            {publicTestCases.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                No public sample test cases configured for this experiment.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {publicTestCases.map((tc, idx) => (
                  <div
                    key={tc._id || idx}
                    style={{
                      backgroundColor: 'var(--color-surface-hover)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      padding: '0.875rem 1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, fontSize: '0.8125rem' }}>
                        Sample Test Case #{tc.order || idx + 1}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                        {tc.marks} marks
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem' }}>
                      <div>
                        <strong style={{ color: 'var(--color-text-secondary)' }}>Standard Input (stdin):</strong>
                        <pre style={{ backgroundColor: 'var(--color-canvas)', padding: '0.5rem', borderRadius: '4px', margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap' }}>
                          {tc.input || '<empty input>'}
                        </pre>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--color-text-secondary)' }}>Expected Output:</strong>
                        <pre style={{ backgroundColor: 'var(--color-canvas)', padding: '0.5rem', borderRadius: '4px', margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap' }}>
                          {tc.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUBMISSION HISTORY & EVALUATION LEDGER */}
      {activeViewTab === 'history' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
                Official Attempts &amp; Evaluation Ledger
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', margin: '0.25rem 0 0 0' }}>
                All recorded attempts for this experiment. Each attempt is immutable, scored out of 10, and preserved.
              </p>
            </div>
            <span className="badge badge-info">
              {evaluationsData.totalAttempts || submissions.length} / 3 Attempts Recorded
            </span>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <LoadingSpinner size={24} text="Loading history..." />
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No official submissions recorded yet. Write your code in the <strong>Code Studio</strong> and click <strong>Official Submit</strong>.
            </div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>Attempt</th>
                    <th>Submitted At</th>
                    <th>Language</th>
                    <th>Status</th>
                    <th>Score / 10</th>
                    <th>Execution Time</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => {
                    const matchedEval = evaluationsData.evaluations?.find(
                      (ev) => ev.attemptNumber === sub.attemptNumber || ev.submission === sub._id
                    );

                    return (
                      <tr key={sub._id}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-family-mono)' }}>
                          #{sub.attemptNumber}
                        </td>
                        <td>{new Date(sub.submittedAt || sub.createdAt).toLocaleString()}</td>
                        <td>
                          <span className="badge badge-info">{sub.language}</span>
                        </td>
                        <td>{getStatusBadge(sub.status)}</td>
                        <td>
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
                        <td>{sub.executionOutput?.executionTimeMs ? `${sub.executionOutput.executionTimeMs} ms` : '—'}</td>
                        <td>
                          <button
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setSelectedEvaluation(matchedEval || null);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                          >
                            Inspect 🔍
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
      )}

      {/* CONFIRM SUBMISSION MODAL */}
      {showSubmitModal && (
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
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
              <span style={{ fontSize: '1.5rem' }}>🚀</span>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Confirm Official Submission</h3>
            </div>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              You are about to officially submit your <strong>{language}</strong> solution for <strong>{experiment.title}</strong>.
            </p>

            <div
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.8125rem'
              }}
            >
              <div><strong>Attempt Number:</strong> {attemptsUsed + 1} of 3</div>
              <div style={{ color: 'var(--color-error)', marginTop: '0.25rem' }}>
                Remaining attempts after this submission: {Math.max(0, attemptsRemaining - 1)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="btn btn-primary"
              >
                Confirm &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST RE-EVALUATION MODAL */}
      {showReevalModal && (
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
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                <span style={{ fontSize: '1.25rem' }}>🔄</span>
                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Request Viva Re-evaluation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReevalModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Current Viva Score: <strong>{currentViva?.marks} / 5</strong>. If you believe your oral defense warrants a reassessment, specify the technical justification below.
            </p>

            {reevalError && (
              <div className="alert alert-error" style={{ fontSize: '0.8125rem' }}>
                {reevalError}
              </div>
            )}

            <form onSubmit={handleRequestReevaluation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Reason for Re-evaluation Request <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  value={reevalReason}
                  onChange={(e) => setReevalReason(e.target.value)}
                  placeholder="Explain why you are requesting a reassessment of your Viva voce assessment..."
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.8125rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-canvas)',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowReevalModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReeval}
                  className="btn btn-primary"
                >
                  {submittingReeval ? 'Submitting...' : 'Submit Re-evaluation Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIVA VERSION HISTORY MODAL */}
      {showVivaHistoryModal && (
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
              maxWidth: '540px',
              width: '100%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                <span style={{ fontSize: '1.25rem' }}>📜</span>
                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Viva Evaluation History</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVivaHistoryModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {vivaData.history.map((item) => (
                <div
                  key={item._id}
                  style={{
                    backgroundColor: item.isCurrent ? 'var(--color-surface-hover)' : 'var(--color-canvas)',
                    border: item.isCurrent ? '1px solid #16a34a' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.875rem' }}>
                      Version #{item.evaluationVersion} {item.isCurrent && '★ Current Official Score'}
                    </strong>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>
                      {item.marks} / 5
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Evaluated by {item.evaluatedBy?.name || 'Faculty'} on {new Date(item.evaluatedAt).toLocaleDateString()}
                  </div>

                  {item.remarks && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
                      <em>"{item.remarks}"</em>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INSPECT SUBMISSION & EVALUATION DETAILS MODAL */}
      {selectedSubmission && (
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
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
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
                  Submission Record: Attempt #{selectedSubmission.attemptNumber}
                </h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Submitted on {new Date(selectedSubmission.submittedAt || selectedSubmission.createdAt).toLocaleString()} &bull; Language: {selectedSubmission.language}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubmission(null);
                  setSelectedEvaluation(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Evaluation Score Card */}
            {selectedEvaluation && (
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Automated Evaluation Score
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {selectedEvaluation.score} / 10
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {selectedEvaluation.earnedMarks} of {selectedEvaluation.totalAvailableMarks} marks earned
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {selectedEvaluation.isHighestScore && (
                    <span className="badge badge-success">★ Highest Attempt Score</span>
                  )}
                  {getStatusBadge(selectedSubmission.status)}
                </div>
              </div>
            )}

            {/* Test Case Breakdown */}
            {selectedEvaluation?.testCaseResults && selectedEvaluation.testCaseResults.length > 0 && (
              <div>
                <strong style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                  Test Case Results:
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {selectedEvaluation.testCaseResults.map((tc, idx) => (
                    <div
                      key={tc.testCaseId || idx}
                      style={{
                        backgroundColor: tc.passed ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                        border: tc.passed ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid rgba(220, 38, 38, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>Case #{tc.order || idx + 1}</span>
                        <span style={{ color: tc.passed ? '#16a34a' : '#dc2626' }}>
                          {tc.passed ? '✓ Pass' : '✗ Fail'}
                        </span>
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                        {tc.isHidden ? '🔒 Hidden' : '👁 Public'} &bull; {tc.earnedMarks}/{tc.availableMarks} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Code */}
            <div>
              <strong style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Submitted Source Code:
              </strong>
              <pre
                style={{
                  backgroundColor: '#0F172A',
                  color: '#E2E8F0',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  margin: 0,
                  maxHeight: '180px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {selectedSubmission.sourceCode}
              </pre>
            </div>

            {/* Output Logs */}
            {selectedSubmission.executionOutput?.stdout && (
              <div>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Standard Output:
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
                  {selectedSubmission.executionOutput.stdout}
                </pre>
              </div>
            )}

            {selectedSubmission.executionOutput?.stderr && (
              <div>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--color-error)', display: 'block', marginBottom: '0.25rem' }}>
                  Error / Compiler Log:
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
                  {selectedSubmission.executionOutput.stderr}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExperimentDetailPage;
