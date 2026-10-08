import React, { useState, useEffect, useMemo } from 'react';
import { labService } from '../../services/labService';
import LoadingSpinner from '../common/LoadingSpinner';
import VivaManagementModal from '../viva/VivaManagementModal';

/**
 * Calculates the individual Best-N final average for a student.
 * 
 * Logic:
 * 1. Collects valid numeric experiment marks for the student.
 * 2. Sorts the marks in descending order (highest to lowest).
 * 3. Takes the top N marks (where N = bestNCount).
 * 4. If student has >= N valid marks, computes average of the top N marks.
 * 5. If student has 0 < validMarks < N, computes average of all available valid marks.
 * 6. If student has 0 valid marks, returns null.
 * 7. Identifies the exact experiment IDs included in the Best-N set.
 */
export const calculateStudentBestNAverage = (expList, bestNCount = 12) => {
  if (!expList || !Array.isArray(expList) || expList.length === 0) {
    return {
      finalAverage: null,
      effectiveCount: 0,
      includedExpIds: new Set(),
      validMarksCount: 0,
      totalSum: 0
    };
  }

  const validEntries = [];
  expList.forEach((exp, idx) => {
    const mark = typeof exp.marks === 'number'
      ? exp.marks
      : typeof exp.totalScore === 'number'
      ? exp.totalScore
      : typeof exp.scoreOutOf10 === 'number'
      ? exp.scoreOutOf10
      : null;

    if (mark !== null && !isNaN(mark)) {
      validEntries.push({
        id: (exp.experimentId || exp._id || exp.id || `exp_${idx}`).toString(),
        mark: Number(mark),
        order: exp.experimentNumber || exp.order || (idx + 1)
      });
    }
  });

  const validMarksCount = validEntries.length;
  if (validMarksCount === 0) {
    return {
      finalAverage: null,
      effectiveCount: 0,
      includedExpIds: new Set(),
      validMarksCount: 0,
      totalSum: 0
    };
  }

  // Sort descending by mark (tie-break deterministically by experiment order)
  validEntries.sort((a, b) => {
    if (b.mark !== a.mark) return b.mark - a.mark;
    return a.order - b.order;
  });

  const N = Number(bestNCount) || 12;
  const effectiveCount = Math.min(N, validMarksCount);
  const topN = validEntries.slice(0, effectiveCount);

  const includedExpIds = new Set(topN.map((e) => e.id));
  const totalSum = topN.reduce((acc, curr) => acc + curr.mark, 0);
  const finalAverage = Number((totalSum / effectiveCount).toFixed(2));

  return {
    finalAverage,
    effectiveCount,
    includedExpIds,
    validMarksCount,
    totalSum
  };
};

const LabStudentPerformanceView = ({ labId, labName, labCode, defaultSectionId = null }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSection, setSelectedSection] = useState(defaultSectionId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [completionFilter, setCompletionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rollNumber');
  const [sortOrder, setSortOrder] = useState('asc');

  // Active View Tab: 'matrix' (Experiment Marks Matrix) | 'roster' (Cohort Progress Ledger)
  const [activeViewTab, setActiveViewTab] = useState('matrix');

  // Best-N Selection Configuration: Default 12 (Allowed: 12, 13, 14, 15, 16)
  const [bestN, setBestN] = useState(12);

  // Detail Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Viva Modal Trigger State
  const [showVivaModal, setShowVivaModal] = useState(false);
  const [selectedVivaExp, setSelectedVivaExp] = useState(null);

  useEffect(() => {
    if (labId) {
      fetchPerformanceData();
    }
  }, [labId, selectedSection]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await labService.getLabStudentsPerformance(labId, {
        sectionId: selectedSection || undefined
      });
      setData(res.data || res);
    } catch (err) {
      console.error('Failed to load lab students performance:', err);
      setError(err.response?.data?.message || 'Failed to retrieve student performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStudentDetail = async (student) => {
    setSelectedStudent(student);
    setDetailLoading(true);
    setDetailError('');
    setDetailData(null);
    try {
      const studentId = student.studentId || student._id;
      const res = await labService.getStudentLabPerformanceDetail(labId, studentId);
      setDetailData(res.data || res);
    } catch (err) {
      console.error('Failed to load student performance detail:', err);
      setDetailError(err.response?.data?.message || 'Failed to retrieve detailed performance record');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
    setDetailData(null);
    setDetailError('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <span className="badge badge-success">✓ Completed</span>;
      case 'Good':
        return <span className="badge badge-primary">★ Good</span>;
      case 'Average':
        return <span className="badge badge-warning">⚡ Average</span>;
      case 'Needs Attention':
        return <span className="badge badge-error">⚠️ Needs Attention</span>;
      case 'Not Started':
      default:
        return (
          <span
            className="badge"
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)'
            }}
          >
            ⏳ Not Started
          </span>
        );
    }
  };

  const getExperimentStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <span className="badge badge-success">✓ Completed</span>;
      case 'Awaiting Evaluation':
        return <span className="badge badge-info">📝 Awaiting Evaluation</span>;
      case 'In Progress':
        return <span className="badge badge-warning">⚡ In Progress</span>;
      case 'Pending':
      default:
        return (
          <span
            className="badge"
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)'
            }}
          >
            Pending
          </span>
        );
    }
  };

  const summary = data?.summary || {
    totalStudents: 0,
    activeStudents: 0,
    completedAll: 0,
    averageCompletion: 0,
    averageScore: null,
    pendingSubmissions: 0
  };

  const rawStudents = data?.students || [];
  const allExperiments = useMemo(() => {
    if (data?.experiments && Array.isArray(data.experiments) && data.experiments.length > 0) {
      return [...data.experiments].sort((a, b) => (a.experimentNumber || a.order || 0) - (b.experimentNumber || b.order || 0));
    }
    // Fallback if experiments array is in the first student
    if (rawStudents.length > 0 && rawStudents[0].experiments) {
      return rawStudents[0].experiments.map((e) => ({
        _id: e.experimentId || e._id,
        id: e.experimentId || e._id,
        experimentNumber: e.experimentNumber || e.order,
        order: e.order,
        title: e.title
      }));
    }
    return [];
  }, [data, rawStudents]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return rawStudents.filter((stu) => {
      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const name = (stu.name || '').toLowerCase();
        const roll = (stu.rollNumber || '').toLowerCase();
        const sec = (stu.section || '').toLowerCase();
        if (!name.includes(term) && !roll.includes(term) && !sec.includes(term)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL' && stu.status !== statusFilter) {
        return false;
      }

      // Completion filter
      if (completionFilter === 'COMPLETED' && stu.completionPercentage < 100) {
        return false;
      }
      if (completionFilter === 'IN_PROGRESS' && (stu.completionPercentage === 0 || stu.completionPercentage === 100)) {
        return false;
      }
      if (completionFilter === 'NOT_STARTED' && stu.completedExperiments > 0) {
        return false;
      }

      return true;
    });
  }, [rawStudents, searchTerm, statusFilter, completionFilter]);

  // Compute Best-N calculation for each student in the filtered list
  const matrixStudents = useMemo(() => {
    return filteredStudents.map((stu) => {
      const studentExpList = stu.experiments || [];
      const expMap = new Map();
      studentExpList.forEach((e) => {
        const expIdStr = (e.experimentId || e._id || e.id)?.toString();
        if (expIdStr) {
          expMap.set(expIdStr, e);
        }
      });

      const bestNCalc = calculateStudentBestNAverage(studentExpList, bestN);

      return {
        ...stu,
        expMap,
        bestNCalc
      };
    });
  }, [filteredStudents, bestN]);

  // Sort matrix students
  const sortedMatrixStudents = useMemo(() => {
    return [...matrixStudents].sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'rollNumber') {
        aVal = a.rollNumber || '';
        bVal = b.rollNumber || '';
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (sortBy === 'name') {
        aVal = a.name || '';
        bVal = b.name || '';
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (sortBy === 'finalAvg' || sortBy === 'averageScore') {
        aVal = a.bestNCalc.finalAverage !== null ? a.bestNCalc.finalAverage : -1;
        bVal = b.bestNCalc.finalAverage !== null ? b.bestNCalc.finalAverage : -1;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (sortBy === 'completionPercentage') {
        aVal = a.completionPercentage || 0;
        bVal = b.completionPercentage || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (sortBy === 'pendingExperiments') {
        aVal = a.pendingExperiments || 0;
        bVal = b.pendingExperiments || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [matrixStudents, sortBy, sortOrder]);

  // Class Summary KPIs for Best-N
  const bestNClassSummary = useMemo(() => {
    const validStudentAverages = matrixStudents
      .map((s) => s.bestNCalc.finalAverage)
      .filter((avg) => avg !== null && !isNaN(avg));

    const count = validStudentAverages.length;
    const avgScore = count > 0 ? Number((validStudentAverages.reduce((a, b) => a + b, 0) / count).toFixed(2)) : null;
    const highestScore = count > 0 ? Math.max(...validStudentAverages) : null;
    const lowestScore = count > 0 ? Math.min(...validStudentAverages) : null;

    return {
      evaluatedCount: count,
      avgScore,
      highestScore,
      lowestScore
    };
  }, [matrixStudents]);

  const availableSections = data?.availableSections || [];

  // Export Matrix to CSV
  const handleExportCSV = () => {
    if (!sortedMatrixStudents || sortedMatrixStudents.length === 0) return;

    const expHeaders = allExperiments.map((e, idx) => {
      const expNum = e.experimentNumber < 10 ? `0${e.experimentNumber}` : e.experimentNumber || idx + 1;
      const cleanTitle = (e.title || `Experiment ${expNum}`).replace(/,/g, ' ');
      return `"Exp ${expNum}: ${cleanTitle}"`;
    });

    const headerRow = [
      '"Roll Number"',
      '"Student Name"',
      '"Section"',
      ...expHeaders,
      `"Best-${bestN} Final Average (/15)"`,
      '"Evaluated Experiments Used"'
    ];

    const dataRows = sortedMatrixStudents.map((row) => {
      const expCells = allExperiments.map((e) => {
        const expIdStr = (e._id || e.id || e.experimentId)?.toString();
        const studentExp = row.expMap.get(expIdStr);
        if (!studentExp || studentExp.marks === null || studentExp.marks === undefined) return '"—"';
        const isInc = row.bestNCalc.includedExpIds.has(expIdStr);
        return `"${studentExp.marks}${isInc ? ' [Best]' : ''}"`;
      });

      return [
        `"${row.rollNumber || ''}"`,
        `"${row.name || ''}"`,
        `"${row.section || ''}"`,
        ...expCells,
        `"${row.bestNCalc.finalAverage !== null ? row.bestNCalc.finalAverage.toFixed(2) : '—'}"`,
        `"${row.bestNCalc.effectiveCount} of ${row.bestNCalc.validMarksCount}"`
      ];
    });

    const csvContent = [headerRow.join(','), ...dataRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${labCode || 'Lab'}_Experiment_Marks_Matrix_Best_${bestN}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ========================================================================= */}
      {/* 1. Overall Summary Cards Strip                                            */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}
      >
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Total Students
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {summary.totalStudents}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {summary.activeStudents} active in roster
          </span>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Curriculum Protocols
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {allExperiments.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Configured lab practicals (up to 16)
          </span>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Best-{bestN} Class Average
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#059669' }}>
            {bestNClassSummary.avgScore !== null ? `${bestNClassSummary.avgScore}` : '--'}
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}> / 15</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Calculated from top {bestN} marks
          </span>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Score Range (Best {bestN})
          </span>
          <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span style={{ color: '#059669' }}>{bestNClassSummary.highestScore !== null ? bestNClassSummary.highestScore : '--'}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>to</span>
            <span style={{ color: bestNClassSummary.lowestScore !== null && bestNClassSummary.lowestScore < 9 ? '#d97706' : 'var(--color-primary)' }}>
              {bestNClassSummary.lowestScore !== null ? bestNClassSummary.lowestScore : '--'}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Highest to lowest final score
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Main Performance & Marks Dashboard Card                                 */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Header & Tab Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📑</span> Student Marks Matrix &amp; Performance
              </h2>
              <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                {labCode} &bull; {labName}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.35rem 0 0 0' }}>
              Inspect student marks for every experiment in this laboratory, dynamically configure Best-N criteria, and review final averages.
            </p>
          </div>

          {/* View Tab Switcher */}
          <div style={{ display: 'flex', backgroundColor: 'var(--color-surface-hover)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', gap: '0.25rem' }}>
            <button
              onClick={() => setActiveViewTab('matrix')}
              style={{
                padding: '0.4rem 0.85rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: activeViewTab === 'matrix' ? 700 : 500,
                backgroundColor: activeViewTab === 'matrix' ? 'var(--color-surface)' : 'transparent',
                color: activeViewTab === 'matrix' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                boxShadow: activeViewTab === 'matrix' ? 'var(--shadow-xs)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📑</span> Experiment Marks Matrix (Best-N)
            </button>

            <button
              onClick={() => setActiveViewTab('roster')}
              style={{
                padding: '0.4rem 0.85rem',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: activeViewTab === 'roster' ? 700 : 500,
                backgroundColor: activeViewTab === 'roster' ? 'var(--color-surface)' : 'transparent',
                color: activeViewTab === 'roster' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                boxShadow: activeViewTab === 'roster' ? 'var(--shadow-xs)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
            >
              <span>👥</span> Cohort Progress Ledger
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Filter & Control Bar                                                     */}
        {/* ========================================================================= */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-surface-hover)',
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 500px' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 200px', minWidth: '170px' }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Search roll number or student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', fontSize: '0.8125rem' }}
              />
            </div>

            {/* Section Filter */}
            {availableSections.length > 1 && (
              <div style={{ minWidth: '130px' }}>
                <select
                  className="input"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                >
                  <option value="">All Sections ({availableSections.length})</option>
                  {availableSections.map((sec) => (
                    <option key={sec._id} value={sec._id}>
                      Section {sec.sectionCode}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Best-N Control Dropdown (Prominent for Marks Matrix) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface)', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <label htmlFor="best-n-select" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                ⭐ Best Experiments:
              </label>
              <select
                id="best-n-select"
                className="input"
                value={bestN}
                onChange={(e) => setBestN(Number(e.target.value))}
                style={{
                  width: '90px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  padding: '0.25rem 0.5rem',
                  cursor: 'pointer'
                }}
              >
                <option value={12}>12</option>
                <option value={13}>13</option>
                <option value={14}>14</option>
                <option value={15}>15</option>
                <option value={16}>16</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div style={{ minWidth: '140px' }}>
              <select
                className="input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%', fontSize: '0.8125rem' }}
              >
                <option value="rollNumber">Sort: Roll Number</option>
                <option value="name">Sort: Student Name</option>
                <option value="finalAvg">Sort: Best-{bestN} Final Avg</option>
                <option value="completionPercentage">Sort: Completion %</option>
              </select>
            </div>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.45rem 0.65rem' }}
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleExportCSV}
              disabled={sortedMatrixStudents.length === 0}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Export Experiment Marks Matrix with Best-N averages to CSV"
            >
              <span>📥</span> Export Matrix (CSV)
            </button>

            <button
              onClick={fetchPerformanceData}
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. Table Views & States                                                  */}
        {/* ========================================================================= */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <LoadingSpinner size={36} text="Loading student performance and academic experiment marks..." />
          </div>
        ) : error ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)'
            }}
          >
            ⚠️ {error}
          </div>
        ) : rawStudents.length === 0 ? (
          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--color-canvas)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>🎓</div>
            <h3 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0 }}>
              No Students Assigned to Laboratory
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', maxWidth: '480px', margin: 0 }}>
              No enrolled student records found for this laboratory section cohort.
            </p>
          </div>
        ) : sortedMatrixStudents.length === 0 ? (
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--color-canvas)'
            }}
          >
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.875rem' }}>
              No students match the current search filter.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setCompletionFilter('ALL');
              }}
              className="btn btn-secondary"
              style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}
            >
              Clear Filters
            </button>
          </div>
        ) : activeViewTab === 'matrix' ? (
          /* ========================================================================= */
          /* TAB 1: EXPERIMENT MARKS MATRIX (BEST-N TABLE)                              */
          /* ========================================================================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Matrix Help & Legend Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-canvas)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>Legend:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ backgroundColor: 'var(--color-success-subtle)', color: 'var(--color-success)', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
                    8.5 ✓
                  </span>{' '}
                  Included in Best-{bestN}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)', padding: '0.1rem 0.35rem', borderRadius: '3px', opacity: 0.75 }}>
                    5.0 (excl)
                  </span>{' '}
                  Excluded
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>—</span> Unattempted
                </span>
              </div>

              <div style={{ fontStyle: 'italic' }}>
                * Final Average is computed per-student across their highest {bestN} experiment scores.
              </div>
            </div>

            {/* Horizontally Scrollable Matrix Table */}
            <div
              style={{
                overflowX: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                maxHeight: '70vh'
              }}
            >
              <table
                className="table"
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  fontSize: '0.8125rem'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-canvas)', position: 'sticky', top: 0, zIndex: 10 }}>
                    {/* Sticky Left Header: Student */}
                    <th
                      style={{
                        padding: '0.75rem 1rem',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: 'var(--color-canvas)',
                        zIndex: 12,
                        minWidth: '220px',
                        borderBottom: '2px solid var(--color-border)',
                        borderRight: '2px solid var(--color-border)',
                        textAlign: 'left'
                      }}
                    >
                      Student Details
                    </th>

                    {/* Experiment Column Headers (Up to 16) */}
                    {allExperiments.map((exp, idx) => {
                      const expNum = exp.experimentNumber < 10 ? `0${exp.experimentNumber}` : exp.experimentNumber || idx + 1;
                      return (
                        <th
                          key={exp._id || idx}
                          style={{
                            padding: '0.625rem 0.75rem',
                            minWidth: '95px',
                            textAlign: 'center',
                            borderBottom: '2px solid var(--color-border)',
                            borderRight: '1px solid var(--color-border)',
                            whiteSpace: 'nowrap'
                          }}
                          title={`EXP ${expNum}: ${exp.title || ''}`}
                        >
                          <div
                            style={{
                              fontFamily: 'var(--font-family-mono)',
                              fontWeight: 700,
                              color: 'var(--color-primary)',
                              fontSize: '0.75rem'
                            }}
                          >
                            EXP {expNum}
                          </div>
                          <div
                            style={{
                              fontSize: '0.6875rem',
                              color: 'var(--color-text-secondary)',
                              fontWeight: 500,
                              maxWidth: '85px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              margin: '0 auto'
                            }}
                          >
                            {exp.title || `Protocol ${expNum}`}
                          </div>
                        </th>
                      );
                    })}

                    {/* Sticky Right Header: Final Avg (Best N) */}
                    <th
                      style={{
                        padding: '0.75rem 1rem',
                        position: 'sticky',
                        right: 0,
                        backgroundColor: 'var(--color-canvas)',
                        zIndex: 12,
                        minWidth: '130px',
                        borderBottom: '2px solid var(--color-border)',
                        borderLeft: '2px solid var(--color-border)',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '0.8125rem' }}>
                        Final Avg
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 700 }}>
                        Best {bestN}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedMatrixStudents.map((row, rowIdx) => {
                    const studentId = row.studentId || row._id;
                    const finalAvg = row.bestNCalc.finalAverage;
                    const includedSet = row.bestNCalc.includedExpIds;

                    return (
                      <tr
                        key={studentId || rowIdx}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: rowIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)'
                        }}
                      >
                        {/* Sticky Left Cell: Student Name & Roll Number */}
                        <td
                          style={{
                            padding: '0.625rem 1rem',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: rowIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)',
                            zIndex: 5,
                            borderRight: '2px solid var(--color-border)',
                            borderBottom: '1px solid var(--color-border)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div>
                              <strong style={{ color: 'var(--color-text-primary)', display: 'block', fontSize: '0.8125rem' }}>
                                {row.name}
                              </strong>
                              <span
                                style={{
                                  fontFamily: 'var(--font-family-mono)',
                                  fontSize: '0.75rem',
                                  color: 'var(--color-text-secondary)'
                                }}
                              >
                                {row.rollNumber}
                              </span>
                            </div>
                            <span className="badge" style={{ backgroundColor: 'var(--color-canvas)', fontSize: '0.6875rem', border: '1px solid var(--color-border)' }}>
                              {row.section || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Experiment Mark Cells */}
                        {allExperiments.map((exp, expIdx) => {
                          const expIdStr = (exp._id || exp.id || exp.experimentId)?.toString();
                          const studentExp = row.expMap.get(expIdStr);
                          const mark = studentExp && typeof studentExp.marks === 'number' ? studentExp.marks : null;
                          const isIncluded = expIdStr ? includedSet.has(expIdStr) : false;
                          const hasMark = mark !== null && !isNaN(mark);

                          const tooltipText = hasMark
                            ? `EXP ${exp.experimentNumber || expIdx + 1}: ${exp.title || ''}\n• Program Score: ${studentExp.programScore !== null ? studentExp.programScore : '--'}/10\n• Viva Score: ${studentExp.vivaScore !== null ? studentExp.vivaScore : '--'}/5\n• Total Mark: ${mark}/15\n• Best-${bestN} Status: ${isIncluded ? `Included in top ${bestN}` : 'Excluded (lower score)'}`
                            : `EXP ${exp.experimentNumber || expIdx + 1}: ${exp.title || ''}\n• Unattempted / No evaluation recorded`;

                          return (
                            <td
                              key={expIdStr || expIdx}
                              style={{
                                padding: '0.5rem 0.625rem',
                                textAlign: 'center',
                                borderRight: '1px solid var(--color-border)',
                                borderBottom: '1px solid var(--color-border)',
                                backgroundColor: isIncluded ? 'rgba(5, 150, 105, 0.04)' : 'transparent'
                              }}
                              title={tooltipText}
                            >
                              {hasMark ? (
                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-family-mono)',
                                      fontSize: '0.8125rem',
                                      fontWeight: isIncluded ? 800 : 500,
                                      color: isIncluded ? '#059669' : 'var(--color-text-secondary)',
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      backgroundColor: isIncluded ? 'var(--color-success-subtle)' : 'transparent',
                                      border: isIncluded ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid transparent',
                                      opacity: isIncluded ? 1 : 0.65
                                    }}
                                  >
                                    {mark.toFixed(mark % 1 === 0 ? 0 : 1)}
                                    {isIncluded && <span style={{ fontSize: '0.6875rem', marginLeft: '0.2rem' }}>✓</span>}
                                  </span>
                                  {!isIncluded && (
                                    <span style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)', opacity: 0.6 }}>
                                      excl
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-secondary)', opacity: 0.4, fontSize: '0.875rem' }}>
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Sticky Right Cell: Final Avg */}
                        <td
                          style={{
                            padding: '0.625rem 0.75rem',
                            position: 'sticky',
                            right: 0,
                            backgroundColor: rowIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)',
                            zIndex: 5,
                            borderLeft: '2px solid var(--color-border)',
                            borderBottom: '1px solid var(--color-border)',
                            textAlign: 'center'
                          }}
                        >
                          {finalAvg !== null ? (
                            <div>
                              <div
                                style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  fontWeight: 800,
                                  fontSize: '0.875rem',
                                  fontFamily: 'var(--font-family-mono)',
                                  backgroundColor: finalAvg >= 12 ? 'var(--color-success-subtle)' : finalAvg >= 9 ? 'var(--color-primary-subtle)' : 'var(--color-warning-subtle)',
                                  color: finalAvg >= 12 ? 'var(--color-success)' : finalAvg >= 9 ? 'var(--color-primary)' : 'var(--color-warning)',
                                  border: `1px solid ${finalAvg >= 12 ? 'rgba(5, 150, 105, 0.3)' : 'var(--color-border)'}`
                                }}
                              >
                                {finalAvg.toFixed(2)}
                              </div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                                {row.bestNCalc.validMarksCount < bestN ? `(${row.bestNCalc.validMarksCount} avail.)` : `(Top ${bestN})`}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                              No Marks
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* TAB 2: COHORT PROGRESS ROSTER TABLE                                       */
          /* ========================================================================= */
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Roll Number</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Section</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Done</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Pending</th>
                  <th style={{ padding: '0.75rem 1rem', minWidth: '150px' }}>Completion</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Best-{bestN} Avg</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatrixStudents.map((stu) => (
                  <tr
                    key={stu.studentId || stu._id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-family-mono)',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--color-surface-hover)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        {stu.rollNumber}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>{stu.name}</strong>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-info">{stu.section || 'N/A'}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>
                      {stu.totalExperiments}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                      {stu.completedExperiments}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: stu.pendingExperiments > 0 ? '#d97706' : 'var(--color-text-secondary)' }}>
                      {stu.pendingExperiments}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {stu.completedExperiments}/{stu.totalExperiments}
                        </span>
                        <strong style={{ color: stu.completionPercentage >= 75 ? '#059669' : 'var(--color-primary)' }}>
                          {stu.completionPercentage}%
                        </strong>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: 'var(--color-surface-hover)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, stu.completionPercentage)}%`,
                            height: '100%',
                            backgroundColor:
                              stu.completionPercentage === 100
                                ? '#059669'
                                : stu.completionPercentage >= 50
                                ? 'var(--color-primary)'
                                : '#d97706',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {stu.bestNCalc.finalAverage !== null ? `${stu.bestNCalc.finalAverage.toFixed(2)}` : '--'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {getStatusBadge(stu.status)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenStudentDetail(stu)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.625rem' }}
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. Student Performance Detail Modal                                      */}
      {/* ========================================================================= */}
      {selectedStudent && (
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
          onClick={handleCloseModal}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '840px',
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
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--color-surface-hover)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-family-mono)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      backgroundColor: 'var(--color-primary-subtle)',
                      color: 'var(--color-primary)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {selectedStudent.rollNumber}
                  </span>
                  <span className="badge badge-info">{selectedStudent.section || 'Section'}</span>
                  {getStatusBadge(selectedStudent.status)}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                  {selectedStudent.name}
                </h2>
              </div>

              <button
                onClick={handleCloseModal}
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

            {/* Modal Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {detailLoading ? (
                <div style={{ padding: '3.5rem', textAlign: 'center' }}>
                  <LoadingSpinner size={36} text="Retrieving detailed student submission record..." />
                </div>
              ) : detailError ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  ⚠️ {detailError}
                </div>
              ) : detailData ? (
                <>
                  {/* Overall Performance Metric Cards */}
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 0.75rem 0' }}>
                      Overall Performance Summary
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '0.75rem'
                      }}
                    >
                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Experiments Done
                        </span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                          {detailData.overall?.completedExperiments} / {detailData.overall?.totalExperiments}
                        </div>
                      </div>

                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Completion Rate
                        </span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
                          {detailData.overall?.completionPercentage}%
                        </div>
                      </div>

                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Average Score
                        </span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                          {detailData.overall?.averageScore !== null ? `${detailData.overall?.averageScore}%` : '--'}
                        </div>
                      </div>

                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Submissions
                        </span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                          {detailData.overall?.totalSubmissionsCount || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Experiments List Breakdown */}
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 0.75rem 0' }}>
                      Experiment-wise Breakdown
                    </h3>
                    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.625rem 0.75rem' }}>#</th>
                            <th style={{ padding: '0.625rem 0.75rem' }}>Experiment Title</th>
                            <th style={{ padding: '0.625rem 0.75rem' }}>Status</th>
                            <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>Program / 10</th>
                            <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>Viva / 5</th>
                            <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>Total / 15</th>
                            <th style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>Attempts</th>
                            <th style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.experiments?.map((exp) => (
                            <tr key={exp.experimentId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'var(--font-family-mono)', fontWeight: 700 }}>
                                EXP {exp.experimentNumber < 10 ? `0${exp.experimentNumber}` : exp.experimentNumber}
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem' }}>
                                <strong>{exp.title}</strong>
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem' }}>
                                {getExperimentStatusBadge(exp.status)}
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>
                                {exp.programScore !== null ? exp.programScore.toFixed(1) : '--'}
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-info)' }}>
                                {exp.vivaScore !== null ? exp.vivaScore.toFixed(1) : '--'}
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#059669' }}>
                                {exp.totalScore !== null ? exp.totalScore.toFixed(1) : '--'}
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                                {exp.attempts}
                              </td>
                              <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => {
                                    setSelectedVivaExp(exp);
                                    setShowVivaModal(true);
                                  }}
                                  className="btn btn-primary"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                >
                                  🎙️ Viva &rarr;
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Viva Management Modal */}
      {showVivaModal && selectedVivaExp && selectedStudent && (
        <VivaManagementModal
          experimentId={selectedVivaExp.experimentId}
          experimentTitle={selectedVivaExp.title}
          labId={labId}
          studentId={selectedStudent.studentId || selectedStudent._id}
          studentName={selectedStudent.name}
          studentRollNumber={selectedStudent.rollNumber}
          currentScore={selectedVivaExp.vivaScore}
          currentRemarks={selectedVivaExp.vivaRemarks}
          onClose={() => {
            setShowVivaModal(false);
            setSelectedVivaExp(null);
          }}
          onSaved={async () => {
            setShowVivaModal(false);
            setSelectedVivaExp(null);
            if (selectedStudent) {
              await handleOpenStudentDetail(selectedStudent);
            }
            await fetchPerformanceData();
          }}
        />
      )}
    </div>
  );
};

export default LabStudentPerformanceView;
