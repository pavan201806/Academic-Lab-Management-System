import React, { useState, useEffect } from 'react';
import { testCaseService } from '../../services/testCaseService';
import LoadingSpinner from '../common/LoadingSpinner';

const TestCaseManagementModal = ({ isOpen, onClose, experiment }) => {
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [expectedOutputVal, setExpectedOutputVal] = useState('');
  const [marksVal, setMarksVal] = useState(2);
  const [isHiddenVal, setIsHiddenVal] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && experiment?._id) {
      fetchTestCases();
      resetForm();
    }
  }, [isOpen, experiment]);

  const fetchTestCases = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await testCaseService.getTestCasesForExperiment(experiment._id);
      const data = res.data || res;
      setTestCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load test cases:', err);
      setError(err.response?.data?.message || 'Failed to load test cases');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setInputVal('');
    setExpectedOutputVal('');
    setMarksVal(2);
    setIsHiddenVal(false);
    setFormError('');
  };

  const handleStartEdit = (tc) => {
    setIsEditing(true);
    setEditingId(tc._id);
    setInputVal(tc.input || '');
    setExpectedOutputVal(tc.expectedOutput || '');
    setMarksVal(tc.marks || 2);
    setIsHiddenVal(tc.isHidden === true);
    setFormError('');
  };

  const handleSaveTestCase = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (expectedOutputVal.trim() === '') {
      setFormError('Expected output is required.');
      return;
    }

    const marksNum = Number(marksVal);
    if (isNaN(marksNum) || marksNum <= 0) {
      setFormError('Marks must be a positive number greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        await testCaseService.updateTestCase(editingId, {
          input: inputVal,
          expectedOutput: expectedOutputVal,
          marks: marksNum,
          isHidden: isHiddenVal
        });
        setSuccessMsg('Test case updated successfully.');
      } else {
        await testCaseService.createTestCase({
          experimentId: experiment._id,
          input: inputVal,
          expectedOutput: expectedOutputVal,
          marks: marksNum,
          isHidden: isHiddenVal,
          order: testCases.length + 1
        });
        setSuccessMsg('Test case created successfully.');
      }
      resetForm();
      await fetchTestCases();
    } catch (err) {
      console.error('Failed to save test case:', err);
      setFormError(err.response?.data?.message || 'Failed to save test case.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (tcId) => {
    if (!window.confirm('Are you sure you want to remove this test case? Historical evaluations will be preserved.')) {
      return;
    }

    setError('');
    setSuccessMsg('');
    try {
      await testCaseService.deactivateTestCase(tcId);
      setSuccessMsg('Test case deactivated successfully.');
      if (editingId === tcId) resetForm();
      await fetchTestCases();
    } catch (err) {
      console.error('Failed to deactivate test case:', err);
      setError(err.response?.data?.message || 'Failed to deactivate test case.');
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= testCases.length) return;

    const newItems = [...testCases];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const orders = newItems.map((item, idx) => ({
      testCaseId: item._id,
      order: idx + 1
    }));

    // Optimistic update
    setTestCases(newItems.map((item, idx) => ({ ...item, order: idx + 1 })));

    try {
      await testCaseService.reorderTestCases(experiment._id, orders);
      setSuccessMsg('Test cases reordered successfully.');
    } catch (err) {
      console.error('Failed to reorder test cases:', err);
      setError(err.response?.data?.message || 'Failed to save new order.');
      fetchTestCases();
    }
  };

  if (!isOpen || !experiment) return null;

  const totalConfiguredMarks = testCases.reduce((acc, tc) => acc + (tc.marks || 0), 0);
  const hiddenCount = testCases.filter((tc) => tc.isHidden).length;
  const visibleCount = testCases.length - hiddenCount;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
          maxWidth: '960px',
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
                Evaluation Suite
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-text-primary)' }}>
              Test Cases: {experiment.title}
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

        {/* Modal Body: Two columns (List on Left, Form on Right) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: '460px' }}>
          {/* Left Column: Test Cases List & Metric Bar */}
          <div
            style={{
              flex: '1 1 58%',
              borderRight: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '1.25rem'
            }}
          >
            {/* Metric Banner */}
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Configured Scale
                </span>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {totalConfiguredMarks} Marks Total
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Normalized proportionally to <strong>10.0 points</strong> during official evaluation
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  👁 {visibleCount} Visible
                </span>
                <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                  🔒 {hiddenCount} Hidden
                </span>
              </div>
            </div>

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
                <LoadingSpinner size={32} text="Loading test cases..." />
              </div>
            ) : testCases.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1.5rem',
                  backgroundColor: 'var(--color-surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-border)'
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧪</div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-text-primary)' }}>
                  No Test Cases Configured
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Author test cases on the right to automatically grade official student submissions.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {testCases.map((tc, idx) => (
                  <div
                    key={tc._id}
                    style={{
                      backgroundColor: editingId === tc._id ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                      border: editingId === tc._id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Order Controls */}
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, -1)}
                            disabled={idx === 0}
                            className="btn btn-secondary"
                            style={{ padding: '0.1rem 0.35rem', fontSize: '0.625rem', lineHeight: 1 }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, 1)}
                            disabled={idx === testCases.length - 1}
                            className="btn btn-secondary"
                            style={{ padding: '0.1rem 0.35rem', fontSize: '0.625rem', lineHeight: 1 }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>

                        <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, fontSize: '0.8125rem' }}>
                          Test Case #{tc.order || idx + 1}
                        </span>

                        {tc.isHidden ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem' }}>
                            🔒 Hidden
                          </span>
                        ) : (
                          <span className="badge badge-info" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem' }}>
                            👁 Public
                          </span>
                        )}

                        <span
                          style={{
                            fontFamily: 'var(--font-family-mono)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                            backgroundColor: 'var(--color-primary-subtle)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          {tc.marks} {tc.marks === 1 ? 'mark' : 'marks'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tc)}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeactivate(tc._id)}
                          className="btn btn-danger"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          title="Deactivate Test Case"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Input & Output Preview */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <div
                        style={{
                          backgroundColor: 'var(--color-surface-subtle)',
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{ color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '0.2rem' }}>
                          Standard Input (stdin):
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            fontFamily: 'var(--font-family-mono)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            maxHeight: '60px',
                            overflowY: 'auto'
                          }}
                        >
                          {tc.input ? tc.input : '<empty input>'}
                        </pre>
                      </div>

                      <div
                        style={{
                          backgroundColor: 'var(--color-surface-subtle)',
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{ color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '0.2rem' }}>
                          Expected Output:
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            fontFamily: 'var(--font-family-mono)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            maxHeight: '60px',
                            overflowY: 'auto'
                          }}
                        >
                          {tc.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Create / Edit Form */}
          <div
            style={{
              flex: '1 1 42%',
              backgroundColor: 'var(--color-surface-subtle)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--color-text-primary)' }}>
                {isEditing ? '✏️ Edit Test Case' : '➕ Add New Test Case'}
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {formError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveTestCase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Input field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Standard Input (stdin)
                </label>
                <textarea
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Enter inputs provided to stdin (e.g. 5\n1 2 3 4 5\n3)..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontFamily: 'var(--font-family-mono)',
                    fontSize: '0.8125rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical'
                  }}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                  Leave empty if program reads no standard input.
                </span>
              </div>

              {/* Expected Output field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Expected Standard Output <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <textarea
                  value={expectedOutputVal}
                  onChange={(e) => setExpectedOutputVal(e.target.value)}
                  placeholder="Exact expected standard output..."
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontFamily: 'var(--font-family-mono)',
                    fontSize: '0.8125rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical'
                  }}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                  Normalized trailing spaces and CRLF differences are handled automatically.
                </span>
              </div>

              {/* Marks & Visibility */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Marks (Weight) <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={marksVal}
                    onChange={(e) => setMarksVal(e.target.value)}
                    required
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Visibility
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isHiddenVal}
                      onChange={(e) => setIsHiddenVal(e.target.checked)}
                    />
                    <span>🔒 Hidden Test Case</span>
                  </label>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-surface)',
                  padding: '0.625rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)'
                }}
              >
                {isHiddenVal ? (
                  <span>
                    🔒 <strong>Hidden Test:</strong> Evaluated in Docker sandbox during official submission, but inputs and expected outputs are NEVER revealed to students.
                  </span>
                ) : (
                  <span>
                    👁 <strong>Public Test:</strong> Students can see this test case input and sample expected output in their experiment guide.
                  </span>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                {submitting ? 'Saving Test Case...' : isEditing ? 'Update Test Case' : '+ Create Test Case'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCaseManagementModal;
