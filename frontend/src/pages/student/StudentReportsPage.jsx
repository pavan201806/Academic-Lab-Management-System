import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { labService } from '../../services/labService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const StudentReportsPage = () => {
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEnrolledLabs();
  }, []);

  useEffect(() => {
    if (user?._id) {
      loadReport();
    }
  }, [user, selectedLabId]);

  const loadEnrolledLabs = async () => {
    try {
      const res = await labService.getAssignedLabs();
      const labsData = res.data || res || [];
      setLabs(Array.isArray(labsData) ? labsData : []);
    } catch (err) {
      console.warn('Could not fetch enrolled labs:', err);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = selectedLabId ? { labId: selectedLabId } : {};
      const res = await reportService.getStudentReport(user._id, params);
      const data = res.data || res;
      setReport(data);
    } catch (err) {
      console.error('Failed to load student report:', err);
      setError(err.message || 'Failed to generate academic report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!user?._id) return;
    setDownloadingPdf(true);
    setError('');
    try {
      const params = selectedLabId ? { labId: selectedLabId } : {};
      await reportService.downloadStudentReportPdf(user._id, params);
    } catch (err) {
      console.error('PDF download error:', err);
      setError(err.message || 'Failed to download PDF report');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!user?._id) return;
    setDownloadingExcel(true);
    setError('');
    try {
      const params = selectedLabId ? { labId: selectedLabId } : {};
      await reportService.downloadStudentReportExcel(user._id, params);
    } catch (err) {
      console.error('Excel export error:', err);
      setError(err.message || 'Failed to export Excel report');
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              My Academic Reports & Evaluations
            </h1>
            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
              OFFICIAL RECORD
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            {user?.name} &bull; Roll Number: <strong>{user?.rollNumber}</strong> &bull; Section: <strong>{user?.section || 'N/A'}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleDownloadPdf}
            disabled={loading || downloadingPdf}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              padding: '0.6rem 1.1rem'
            }}
          >
            <span>{downloadingPdf ? '⏳ Generating...' : '📄 Download PDF'}</span>
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={loading || downloadingExcel}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              padding: '0.6rem 1.1rem'
            }}
          >
            <span>{downloadingExcel ? '⏳ Exporting...' : '📊 Export Excel (XLSX)'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Scope Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.5rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Filter by Laboratory:
          </label>
          <select
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-canvas)',
              fontSize: '0.875rem',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="">All Enrolled Laboratories</option>
            {labs.map((lab) => (
              <option key={lab._id} value={lab._id}>
                {lab.code} - {lab.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Academic Standard: <strong>Automated (/10)</strong> + <strong>Viva (/5)</strong> = <strong>Final Score (/15)</strong>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: '0.875rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Loading Spinner */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <LoadingSpinner message="Generating academic report..." />
        </div>
      ) : report ? (
        <>
          {/* Summary KPI Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}
          >
            {Object.entries(report.summary || {}).map(([key, val]) => (
              <div
                key={key}
                className="card"
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  {key}
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {val}
                </span>
              </div>
            ))}
          </div>

          {/* Detailed Performance Table Card */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                  {report.title}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>
                  {report.subtitle}
                </p>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                {report.tableRows?.length || 0} Experiments Listed
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)' }}>
                    {(report.tableHeaders || []).map((header, idx) => (
                      <th
                        key={idx}
                        style={{
                          padding: '0.75rem 1rem',
                          textAlign: idx >= 3 ? 'right' : 'left',
                          fontWeight: 600,
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.8125rem'
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.tableRows && report.tableRows.length > 0 ? (
                    report.tableRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: rIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)'
                        }}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: '0.85rem 1rem',
                              textAlign: cIdx >= 3 ? 'right' : 'left',
                              color: 'var(--color-text-primary)',
                              fontWeight: cIdx === 5 ? 700 : 400
                            }}
                          >
                            {cIdx === 2 ? (
                              <span
                                className={`badge ${cell === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}
                                style={{ fontSize: '0.75rem' }}
                              >
                                {cell}
                              </span>
                            ) : cIdx === 5 ? (
                              <span style={{ color: 'var(--color-primary)' }}>{cell} / 15</span>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={report.tableHeaders?.length || 6}
                        style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}
                      >
                        No laboratory evaluation records available for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default StudentReportsPage;
