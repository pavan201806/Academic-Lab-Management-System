import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { experimentService } from '../../services/experimentService';
import { submissionService } from '../../services/submissionService';
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

  // Submission History
  const [submissions, setSubmissions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Active tab on page: 'workbench' | 'guide' | 'history'
  const [activeViewTab, setActiveViewTab] = useState('workbench');

  useEffect(() => {
    fetchExperimentAndHistory();
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

      // Fetch student submissions history
      fetchSubmissionHistory();
    } catch (err) {
      console.error('Failed to load experiment:', err);
      setError(err.response?.data?.message || 'Access Denied or Experiment not found.');
    } finally {
      setLoading(false);
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

  // Official Submission (consumes attempt & stores submission)
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
      setSubmitSuccessMsg(`Attempt ${data.attemptNumber} submitted successfully with status: ${data.status}`);
      setExecutionResult(data.executionOutput);
      if (data.executionOutput?.status === 'COMPILE_ERROR' || data.executionOutput?.status === 'RUNTIME_ERROR') {
        setActiveOutputTab('stderr');
      } else {
        setActiveOutputTab('stdout');
      }
      // Refresh submission history
      fetchSubmissionHistory();
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitErrorMsg(err.response?.data?.message || 'Failed to submit code.');
    } finally {
      setSubmitting(false);
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

  const attemptsUsed = submissions.length;
  const attemptsRemaining = Math.max(0, 3 - attemptsUsed);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Loading experiment workbench..." />
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
            Attempts: {attemptsUsed} / 3 ({attemptsRemaining} remaining)
          </span>
          <span className="badge badge-info">{experiment.lab?.code}</span>
        </div>
      </div>

      {/* Experiment Banner */}
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
          gap: '1rem'
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
            📜 Submissions ({submissions.length})
          </button>
        </div>
      </div>

      {/* Submit Success / Error Notifications */}
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
                ⌨️ Custom Input (stdin) {showStdin ? '▲' : '▼'}
              </button>
            </div>

            {/* Right Controls: Run & Submit Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* RUN BUTTON (Manual, 0 attempts) */}
              <button
                type="button"
                onClick={handleRunCode}
                disabled={running || submitting}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 600,
                  border: '1px solid var(--color-border)'
                }}
                title="Test and preview code execution without consuming an official attempt"
              >
                {running ? (
                  <>
                    <LoadingSpinner size={16} />
                    <span>Executing Sandbox...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Run Code</span>
                    <span style={{ fontSize: '0.6875rem', opacity: 0.8, color: 'var(--color-text-secondary)' }}>
                      (Test Run)
                    </span>
                  </>
                )}
              </button>

              {/* OFFICIAL SUBMIT BUTTON */}
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                disabled={running || submitting || attemptsRemaining <= 0}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 600
                }}
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size={16} />
                    <span>Submitting Attempt...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Official Submit</span>
                    <span
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '10px',
                        fontSize: '0.6875rem'
                      }}
                    >
                      {attemptsRemaining} left
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Standard Input (stdin) Collapsible Drawer */}
          {showStdin && (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.75rem 1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                  Standard Input (stdin)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Piped into program standard input during execution (Max 16KB)
                </span>
              </div>
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

          {/* Code Editor */}
          <CodeEditor
            value={sourceCode}
            onChange={setSourceCode}
            language={language}
            height="460px"
          />

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
                  <span>Compiling and executing in isolated sandbox...</span>
                </div>
              ) : !executionResult ? (
                <div style={{ color: '#64748B' }}>
                  No execution output. Click <strong>Run Code</strong> (Test Run) or <strong>Official Submit</strong> to test your program.
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
        </div>
      )}

      {/* TAB 3: SUBMISSION HISTORY */}
      {activeViewTab === 'history' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
                Official Submission History
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', margin: '0.25rem 0 0 0' }}>
                All recorded attempts for this experiment. Each attempt is immutable and time-stamped.
              </p>
            </div>
            <span className="badge badge-info">
              {submissions.length} / 3 Attempts Recorded
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Attempt #</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Language</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Submitted At</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Execution Status</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Runtime</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                        Attempt {sub.attemptNumber}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className="badge badge-info">{sub.language}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-secondary)' }}>
                        {new Date(sub.submittedAt || sub.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {getStatusBadge(sub.status)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                        {sub.executionOutput?.executionTimeMs !== undefined ? `${sub.executionOutput.executionTimeMs} ms` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(sub)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        >
                          👁 Inspect Code
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONFIRM OFFICIAL SUBMISSION MODAL */}
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

      {/* INSPECT SUBMISSION DETAILS MODAL */}
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
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                  Submission Record: Attempt {selectedSubmission.attemptNumber}
                </h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Submitted on {new Date(selectedSubmission.submittedAt || selectedSubmission.createdAt).toLocaleString()} &bull; Language: {selectedSubmission.language}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Status & Runtime */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {getStatusBadge(selectedSubmission.status)}
              {selectedSubmission.executionOutput?.executionTimeMs !== undefined && (
                <span className="badge badge-info">
                  ⏱ {selectedSubmission.executionOutput.executionTimeMs} ms
                </span>
              )}
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
