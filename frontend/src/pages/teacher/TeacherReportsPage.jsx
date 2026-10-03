import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { labService } from '../../services/labService';
import { sectionService } from '../../services/sectionService';
import { experimentService } from '../../services/experimentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const REPORT_CATEGORIES = [
  { id: 'LAB', label: 'Laboratory Performance Summary', icon: '⚗️' },
  { id: 'SECTION', label: 'Section Academic Performance', icon: '👥' },
  { id: 'EXPERIMENT', label: 'Experiment Breakdown & Stats', icon: '🧪' },
  { id: 'MARKS', label: 'Marks Ledger (/10 + /5 = /15)', icon: '📝' },
  { id: 'VIVA', label: 'Viva Voce Assessment Records', icon: '🎙️' },
  { id: 'PROGRESS', label: 'Curriculum Progress Report', icon: '📈' },
  { id: 'STUDENT', label: 'Individual Student Report', icon: '🎓' }
];

const TeacherReportsPage = () => {
  const { user } = useAuth();

  const [category, setCategory] = useState('LAB');
  const [labs, setLabs] = useState([]);
  const [sections, setSections] = useState([]);
  const [experiments, setExperiments] = useState([]);

  // Filter values
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedExperimentId, setSelectedExperimentId] = useState('');
  const [studentSearchId, setStudentSearchId] = useState('');

  // Report and UI states
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialFilters();
  }, [user]);

  useEffect(() => {
    if (selectedLabId) {
      loadExperimentsForLab(selectedLabId);
    } else {
      setExperiments([]);
      setSelectedExperimentId('');
    }
  }, [selectedLabId]);

  const loadInitialFilters = async () => {
    try {
      const [labsRes, sectionsRes] = await Promise.all([
        labService.getAssignedLabs(),
        sectionService.getSections().catch(() => ({ data: [] }))
      ]);

      const labsData = labsRes.data || labsRes || [];
      const labsList = Array.isArray(labsData) ? labsData : [];
      setLabs(labsList);
      if (labsList.length > 0 && !selectedLabId) {
        setSelectedLabId(labsList[0]._id);
      }

      const sectionsData = sectionsRes.data || sectionsRes || [];
      setSections(Array.isArray(sectionsData) ? sectionsData : []);
      if (sectionsData.length > 0 && !selectedSectionId) {
        setSelectedSectionId(sectionsData[0]._id);
      }
    } catch (err) {
      console.warn('Initial filters fetch error:', err);
    }
  };

  const loadExperimentsForLab = async (labId) => {
    try {
      const res = await experimentService.getExperiments(labId);
      const expsData = res.data?.experiments || res.data || res || [];
      setExperiments(Array.isArray(expsData) ? expsData : []);
    } catch (err) {
      console.warn('Could not load experiments for lab:', err);
      setExperiments([]);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');
    setReport(null);

    try {
      let res;
      switch (category) {
        case 'LAB':
          if (!selectedLabId) throw new Error('Please select a Laboratory.');
          res = await reportService.getLabReport(selectedLabId, { sectionId: selectedSectionId || undefined });
          break;
        case 'SECTION':
          if (!selectedSectionId) throw new Error('Please select an Academic Section.');
          res = await reportService.getSectionReport(selectedSectionId, { labId: selectedLabId || undefined });
          break;
        case 'EXPERIMENT':
          if (!selectedExperimentId) throw new Error('Please select an Experiment.');
          res = await reportService.getExperimentReport(selectedExperimentId, { sectionId: selectedSectionId || undefined });
          break;
        case 'MARKS':
          res = await reportService.getMarksReport({
            labId: selectedLabId || undefined,
            sectionId: selectedSectionId || undefined,
            experimentId: selectedExperimentId || undefined
          });
          break;
        case 'VIVA':
          res = await reportService.getVivaReport({
            labId: selectedLabId || undefined,
            sectionId: selectedSectionId || undefined,
            experimentId: selectedExperimentId || undefined
          });
          break;
        case 'PROGRESS':
          res = await reportService.getProgressReport({
            labId: selectedLabId || undefined,
            sectionId: selectedSectionId || undefined
          });
          break;
        case 'STUDENT':
          if (!studentSearchId) throw new Error('Please specify a Student ID or Roll Number.');
          res = await reportService.getStudentReport(studentSearchId, { labId: selectedLabId || undefined });
          break;
        default:
          throw new Error('Invalid report category selected.');
      }

      setReport(res.data || res);
    } catch (err) {
      console.error('Failed to generate report preview:', err);
      setError(err.message || 'Failed to generate report. Please verify your selected filters.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setError('');
    try {
      switch (category) {
        case 'LAB':
          await reportService.downloadLabReportPdf(selectedLabId, { sectionId: selectedSectionId || undefined });
          break;
        case 'SECTION':
          await reportService.downloadSectionReportPdf(selectedSectionId, { labId: selectedLabId || undefined });
          break;
        case 'EXPERIMENT':
          await reportService.downloadExperimentReportPdf(selectedExperimentId, { sectionId: selectedSectionId || undefined });
          break;
        case 'MARKS':
          await reportService.downloadMarksReportPdf({
            labId: selectedLabId || undefined,
            sectionId: selectedSectionId || undefined,
            experimentId: selectedExperimentId || undefined
          });
          break;
        case 'VIVA':
          await reportService.downloadVivaReportPdf({
            labId: selectedLabId || undefined,
            sectionId: selectedSectionId || undefined,
            experimentId: selectedExperimentId || undefined
          });
          break;
        case 'PROGRESS':
          await reportService.downloadProgressReportPdf({
            labId: selectedLabId || undefined,
            sectionId: selectedSectionId || undefined
          });
          break;
        case 'STUDENT':
          await reportService.downloadStudentReportPdf(studentSearchId, { labId: selectedLabId || undefined });
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('PDF export failed:', err);
      setError(err.message || 'Failed to generate PDF download.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    setError('');
    try {
      switch (category) {
        case 'LAB':
          await reportService.downloadLabReportExcel(selectedLabId, { sectionId: selectedSectionId || undefined });
          break;
        case 'SECTION':
          await reportService.downloadSectionReportExcel(selectedSectionId, { labId: selectedLabId || undefined });
          break;
        case 'EXPERIMENT':
          await reportService.downloadExperimentReportExcel(selectedExperimentId, { sectionId: selectedSectionId || undefined });
          break;
        case 'MARKS':
          await reportService.downloadMarksReportExcel({
            labId: selectedLabId || undefined,
            sectionId: selectedSectionId || undefined,
            experimentId: selectedExperimentId || undefined
          });
          break;
        case 'VIVA':
          await reportService.downloadVivaReportExcel({
            labId: selectedLabId || undefined,
            sectionId: selectedSectionId || undefined,
            experimentId: selectedExperimentId || undefined
          });
          break;
        case 'PROGRESS':
          await reportService.downloadProgressReportExcel({
            labId: selectedLabId || undefined,
            sectionId: selectedSectionId || undefined
          });
          break;
        case 'STUDENT':
          await reportService.downloadStudentReportExcel(studentSearchId, { labId: selectedLabId || undefined });
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Excel export failed:', err);
      setError(err.message || 'Failed to generate Excel download.');
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
              Academic Reports & Export Console
            </h1>
            <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
              ISO 27001 COMPLIANT
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Generate official laboratory records, marks ledgers, viva assessments, and cohort analytics.
          </p>
        </div>

        {/* Global Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleDownloadPdf}
            disabled={!report || downloadingPdf}
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
            disabled={!report || downloadingExcel}
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

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem'
        }}
      >
        {REPORT_CATEGORIES.map((cat) => {
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                setReport(null);
                setError('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Control Configuration Card */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end'
          }}
        >
          {/* Lab Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>
              Laboratory Scope:
            </label>
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-canvas)',
                fontSize: '0.875rem',
                color: 'var(--color-text-primary)'
              }}
            >
              {category !== 'LAB' && <option value="">All Assigned Laboratories</option>}
              {labs.map((lab) => (
                <option key={lab._id} value={lab._id}>
                  {lab.code} - {lab.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          {(category === 'SECTION' || category === 'LAB' || category === 'MARKS' || category === 'VIVA' || category === 'PROGRESS') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>
                Academic Section:
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-canvas)',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-primary)'
                }}
              >
                {category !== 'SECTION' && <option value="">All Cohort Sections</option>}
                {sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.sectionCode} - {sec.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Experiment Selector */}
          {(category === 'EXPERIMENT' || category === 'MARKS' || category === 'VIVA') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>
                Experiment:
              </label>
              <select
                value={selectedExperimentId}
                onChange={(e) => setSelectedExperimentId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-canvas)',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-primary)'
                }}
              >
                {category !== 'EXPERIMENT' && <option value="">All Experiments (Max 12)</option>}
                {experiments.map((exp) => (
                  <option key={exp._id} value={exp._id}>
                    Exp {exp.order}: {exp.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Selector / ID Input */}
          {category === 'STUDENT' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>
                Student MongoDB ID:
              </label>
              <input
                type="text"
                placeholder="Paste Student ObjectId..."
                value={studentSearchId}
                onChange={(e) => setStudentSearchId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-canvas)',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-primary)'
                }}
              />
            </div>
          )}

          {/* Generate Button */}
          <div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.55rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{loading ? '⏳ Querying...' : '🔍 Generate / Preview'}</span>
            </button>
          </div>
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
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <LoadingSpinner message="Aggregating persisted academic performance metrics..." />
        </div>
      ) : report ? (
        <>
          {/* Metadata Context Header */}
          <div
            className="card"
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                {report.title}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>
                {report.subtitle}
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {Object.entries(report.metadata || {}).map(([mKey, mVal]) => (
                <div
                  key={mKey}
                  style={{
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <strong style={{ color: 'var(--color-text-secondary)' }}>{mKey}:</strong> {mVal}
                </div>
              ))}
            </div>
          </div>

          {/* Summary KPIs Row */}
          {report.summary && Object.keys(report.summary).length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem'
              }}
            >
              {Object.entries(report.summary)
                .filter(([k]) => typeof report.summary[k] !== 'object' && !k.startsWith('total'))
                .map(([key, val]) => (
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
                    <span style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {val}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Report Data Table */}
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
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
                Authoritative Record Entries ({report.tableRows?.length || 0})
              </h3>
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                LIVE PREVIEW
              </span>
            </div>

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
                              color: 'var(--color-text-primary)'
                            }}
                          >
                            {cell === 'COMPLETED' || cell === 'PASSED' ? (
                              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                                {cell}
                              </span>
                            ) : cell === 'PENDING' || cell === 'RETEST' ? (
                              <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                                {cell}
                              </span>
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
                        No data rows match the specified academic filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div
          className="card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--color-border)'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.5rem 0' }}>
            Ready to Generate Academic Report
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: '500px', margin: '0 auto' }}>
            Select a category above, configure your laboratory and section filters, and click <strong>Generate / Preview</strong> to inspect metrics and export to PDF or Excel.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeacherReportsPage;
