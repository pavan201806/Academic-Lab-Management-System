import React, { useState } from 'react';
import { userService } from '../../services/userService';
import LoadingSpinner from '../common/LoadingSpinner';

const BulkStudentEnrollmentModal = ({ isOpen, onClose, onImportSuccess }) => {
  // Wizard steps: 1: Upload, 2: Preview & Validation, 3: Result Summary
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState('StudentTemp#2026');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  
  // Preview data state
  const [previewData, setPreviewData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'VALID' | 'ALREADY_EXISTS' | 'INVALID'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('');

  // Final result state
  const [importResult, setImportResult] = useState(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleSelectFile = (selectedFile) => {
    setError('');
    const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
    if (!['.xlsx', '.xls'].includes(ext)) {
      setError('Invalid file format. Please upload an Excel workbook (.xlsx or .xls).');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File exceeds the 10MB size limit. Please upload a smaller workbook.');
      return;
    }
    setFile(selectedFile);
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Please select an Excel workbook file first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await userService.previewBulkEnrollment(file);
      const data = res.data || res;
      setPreviewData(data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to parse and preview Excel file.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.validCount === 0) {
      setError('No valid student records found to import.');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const validRecords = previewData.records.filter((r) => r.status === 'VALID');
      const res = await userService.importBulkStudents({
        records: validRecords,
        defaultPassword: defaultPassword.trim() || 'StudentTemp#2026'
      });
      const data = res.data || res;
      setImportResult(data);
      setStep(3);
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to execute bulk student import.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError('');
    setStatusFilter('ALL');
    setSearchQuery('');
    setSelectedSectionFilter('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Filter preview records
  const filteredRecords = (previewData?.records || []).filter((r) => {
    // Status filter
    if (statusFilter !== 'ALL' && r.status !== statusFilter) {
      return false;
    }
    // Section filter
    if (selectedSectionFilter && r.section !== selectedSectionFilter && r.sheetName !== selectedSectionFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoll = (r.rollNumber || '').toLowerCase().includes(q);
      const matchName = (r.name || '').toLowerCase().includes(q);
      const matchSec = (r.section || '').toLowerCase().includes(q);
      const matchReason = (r.statusReason || '').toLowerCase().includes(q);
      if (!matchRoll && !matchName && !matchSec && !matchReason) return false;
    }
    return true;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '1.5rem',
        overflowY: 'auto'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: step === 1 ? '680px' : '1050px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-hover)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '1.35rem' }}>📊</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
                Bulk Student Enrollment from Excel
              </h2>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem', margin: 0 }}>
              Automatic multi-section student cohort extraction and account creation
            </p>
          </div>

          <button
            onClick={handleClose}
            disabled={loading || importing}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              color: 'var(--color-text-secondary)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                padding: '0.875rem 1rem',
                backgroundColor: 'var(--color-error-bg, #fee2e2)',
                color: 'var(--color-error, #b91c1c)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}
            >
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 1: UPLOAD & CONFIGURATION                       */}
          {/* ==================================================== */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Instructions Guide */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  fontSize: '0.8125rem'
                }}
              >
                <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '0.375rem' }}>
                  📁 Expected Workbook Structure:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  <li>
                    <strong>Multi-Sheet Support:</strong> Each worksheet represents one section (e.g. <code>AIDS-A</code>, <code>AIDS-B</code>).
                  </li>
                  <li>
                    <strong>Required Columns:</strong> <code>Roll No.</code> and <code>Name of the student</code>.
                  </li>
                  <li>
                    <strong>Automatic Matching:</strong> Section codes are detected directly from the sheet names &mdash; no manual entry needed.
                  </li>
                  <li>Blank rows and empty sheets are ignored automatically.</li>
                </ul>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '2.25rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: dragActive ? 'rgba(30, 58, 138, 0.04)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => document.getElementById('bulk-excel-input')?.click()}
              >
                <input
                  type="file"
                  id="bulk-excel-input"
                  accept=".xlsx, .xls"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />

                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📑</div>
                {file ? (
                  <div>
                    <strong style={{ color: 'var(--color-primary)', fontSize: '1rem', display: 'block' }}>
                      {file.name}
                    </strong>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                      ({(file.size / 1024).toFixed(1)} KB) &bull; Click or drop another file to change
                    </span>
                  </div>
                ) : (
                  <div>
                    <strong style={{ color: 'var(--color-primary)', fontSize: '0.9375rem', display: 'block' }}>
                      Click to choose or drag &amp; drop student roll list Excel file
                    </strong>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                      Supports .xlsx and .xls (Max 10MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Temporary Password Configuration */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Default Temporary Password for New Students
                </label>
                <input
                  type="text"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  placeholder="e.g. StudentTemp#2026"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid var(--color-border-input)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-family-mono)'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  🔒 All imported students must change their password on first login.
                </span>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 2: PREVIEW & VALIDATION RESULTS                 */}
          {/* ==================================================== */}
          {step === 2 && previewData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Summary Metrics Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem'
                }}
              >
                <div className="card" style={{ padding: '0.875rem', textAlign: 'center', backgroundColor: 'var(--color-surface-hover)' }}>
                  <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    Total Detected
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                    {previewData.totalStudents}
                  </div>
                </div>

                <div className="card" style={{ padding: '0.875rem', textAlign: 'center', backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#15803d', fontWeight: 600 }}>
                    Valid (Ready)
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}>
                    {previewData.validCount}
                  </div>
                </div>

                <div className="card" style={{ padding: '0.875rem', textAlign: 'center', backgroundColor: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#a16207', fontWeight: 600 }}>
                    Already Exists
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a16207', marginTop: '0.25rem' }}>
                    {previewData.alreadyExistsCount}
                  </div>
                </div>

                <div className="card" style={{ padding: '0.875rem', textAlign: 'center', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#b91c1c', fontWeight: 600 }}>
                    Invalid Rows
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.25rem' }}>
                    {previewData.invalidCount}
                  </div>
                </div>
              </div>

              {/* Sections Breakdown Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Sections Detected:
                </span>
                {previewData.sections.map((sec) => (
                  <div
                    key={sec.sheetName}
                    style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: 'var(--radius-full, 9999px)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      backgroundColor: sec.matched ? 'rgba(30, 58, 138, 0.08)' : 'rgba(239, 68, 68, 0.1)',
                      color: sec.matched ? 'var(--color-primary)' : 'var(--color-error)',
                      border: `1px solid ${sec.matched ? 'rgba(30, 58, 138, 0.2)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}
                  >
                    <span>{sec.matched ? '✓' : '⚠️'}</span>
                    <strong>{sec.sheetName}</strong>
                    <span>({sec.totalStudents} students &bull; {sec.validCount} valid)</span>
                  </div>
                ))}
              </div>

              {/* Filters & Search Toolbar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                  >
                    All ({previewData.totalStudents})
                  </button>
                  <button
                    onClick={() => setStatusFilter('VALID')}
                    className={`btn ${statusFilter === 'VALID' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                  >
                    Valid ({previewData.validCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('ALREADY_EXISTS')}
                    className={`btn ${statusFilter === 'ALREADY_EXISTS' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                  >
                    Existing ({previewData.alreadyExistsCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('INVALID')}
                    className={`btn ${statusFilter === 'INVALID' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                  >
                    Invalid ({previewData.invalidCount})
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '380px', justifyContent: 'flex-end' }}>
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: '1px solid var(--color-border-input)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-surface)'
                    }}
                  >
                    <option value="">All Sections</option>
                    {previewData.sections.map((s) => (
                      <option key={s.sheetName} value={s.sheetName}>
                        {s.sheetName}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search preview..."
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: '1px solid var(--color-border-input)',
                      borderRadius: 'var(--radius-md)',
                      width: '140px'
                    }}
                  />
                </div>
              </div>

              {/* Records Preview Table */}
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  maxHeight: '360px',
                  overflowY: 'auto'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-surface-hover)', zIndex: 10 }}>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
                      <th style={{ padding: '0.625rem 0.875rem' }}>Roll Number</th>
                      <th style={{ padding: '0.625rem 0.875rem' }}>Student Name</th>
                      <th style={{ padding: '0.625rem 0.875rem' }}>Section</th>
                      <th style={{ padding: '0.625rem 0.875rem' }}>Sheet</th>
                      <th style={{ padding: '0.625rem 0.875rem' }}>Status</th>
                      <th style={{ padding: '0.625rem 0.875rem' }}>Validation Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          No records match the active filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec, idx) => (
                        <tr
                          key={`${rec.sheetName}-${rec.rowNumber}-${idx}`}
                          style={{
                            borderBottom: '1px solid var(--color-border-subtle)',
                            backgroundColor:
                              rec.status === 'INVALID'
                                ? 'rgba(239, 68, 68, 0.04)'
                                : rec.status === 'ALREADY_EXISTS'
                                ? 'rgba(234, 179, 8, 0.04)'
                                : 'transparent'
                          }}
                        >
                          <td style={{ padding: '0.625rem 0.875rem' }}>
                            <code style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
                              {rec.rollNumber || '—'}
                            </code>
                          </td>
                          <td style={{ padding: '0.625rem 0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                            {rec.name || '—'}
                          </td>
                          <td style={{ padding: '0.625rem 0.875rem' }}>
                            <span className="badge badge-info">{rec.section}</span>
                          </td>
                          <td style={{ padding: '0.625rem 0.875rem', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                            {rec.sheetName} (Row {rec.rowNumber})
                          </td>
                          <td style={{ padding: '0.625rem 0.875rem' }}>
                            {rec.status === 'VALID' && (
                              <span className="badge badge-success">Valid</span>
                            )}
                            {rec.status === 'ALREADY_EXISTS' && (
                              <span className="badge badge-warning">Already Exists</span>
                            )}
                            {rec.status === 'INVALID' && (
                              <span className="badge badge-error">Invalid</span>
                            )}
                          </td>
                          <td style={{ padding: '0.625rem 0.875rem', fontSize: '0.75rem', color: rec.status === 'INVALID' ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                            {rec.statusReason}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 3: IMPORT SUCCESS SUMMARY                       */}
          {/* ==================================================== */}
          {step === 3 && importResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#15803d', margin: 0 }}>
                  Bulk Student Enrollment Completed Successfully!
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {importResult.createdCount} new student accounts have been provisioned and allocated to their respective cohort sections.
                </p>
              </div>

              {/* Section Breakdown Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', textAlign: 'left' }}>
                {Object.entries(importResult.bySection || {}).map(([secCode, count]) => (
                  <div key={secCode} className="card" style={{ padding: '1rem', backgroundColor: 'rgba(30, 58, 138, 0.04)', border: '1px solid rgba(30, 58, 138, 0.15)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      Section Cohort
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {secCode}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#15803d', fontWeight: 600, marginTop: '0.25rem' }}>
                      +{count} Students Enrolled
                    </div>
                  </div>
                ))}
              </div>

              {/* Onboarding Credentials Notice */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.8125rem'
                }}
              >
                <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  🔑 Student Account Credentials:
                </strong>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Username: <strong>Student Roll Number</strong> &bull; Temporary Password: <code style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-primary)' }}>{importResult.temporaryPasswordUsed}</code>
                </p>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                  Students are required to change their temporary password upon their first login to access the laboratory workspace.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-hover)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {step === 1 && (
            <>
              <button type="button" onClick={handleClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={!file || loading}
                className="btn btn-primary"
              >
                {loading ? 'Analyzing Workbook...' : 'Preview Import →'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" disabled={importing}>
                ← Choose Different File
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={importing}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!previewData || previewData.validCount === 0 || importing}
                  className="btn btn-primary"
                  style={{ backgroundColor: previewData?.validCount > 0 ? '#15803d' : undefined }}
                >
                  {importing ? (
                    'Creating Student Accounts...'
                  ) : (
                    `Import ${previewData?.validCount || 0} Valid Students`
                  )}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleClose} className="btn btn-primary">
                Done &bull; View Students Roster
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkStudentEnrollmentModal;
