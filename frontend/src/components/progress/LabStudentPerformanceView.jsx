import React, { useState, useEffect } from 'react';
import { labService } from '../../services/labService';
import LoadingSpinner from '../common/LoadingSpinner';
import VivaManagementModal from '../viva/VivaManagementModal';

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

  // Filter students
  const filteredStudents = rawStudents.filter((stu) => {
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

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
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
    if (sortBy === 'completionPercentage') {
      aVal = a.completionPercentage || 0;
      bVal = b.completionPercentage || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    if (sortBy === 'averageScore') {
      aVal = a.averageScore !== null ? a.averageScore : -1;
      bVal = b.averageScore !== null ? b.averageScore : -1;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    if (sortBy === 'pendingExperiments') {
      aVal = a.pendingExperiments || 0;
      bVal = b.pendingExperiments || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const availableSections = data?.availableSections || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ========================================================================= */}
      {/* 1. Summary Cards Strip                                                    */}
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
            Avg Completion
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#059669' }}>
            {summary.averageCompletion}%
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {summary.completedAll} completed all protocols
          </span>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Average Score
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {summary.averageScore !== null ? `${summary.averageScore}%` : '--'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Evaluated laboratory submissions
          </span>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Pending Submissions
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#d97706' }}>
            {summary.pendingSubmissions}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Remaining student experiments
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Students & Performance Section                                        */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>👥</span> Students &amp; Performance
            </h2>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Individual student progress tracking, completion status, and evaluated performance metrics.
            </span>
          </div>

          <button
            onClick={fetchPerformanceData}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <span>🔄</span> Refresh Roster
          </button>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            backgroundColor: 'var(--color-surface-hover)',
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}
        >
          {/* Search Input */}
          <div style={{ flex: '1 1 220px', minWidth: '180px' }}>
            <input
              type="text"
              className="input"
              placeholder="Search by roll number, name..."
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
                    {sec.sectionCode}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', fontSize: '0.8125rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Good">Good (75%+)</option>
              <option value="Average">Average (50-74%)</option>
              <option value="Needs Attention">Needs Attention (&lt;50%)</option>
              <option value="Not Started">Not Started</option>
            </select>
          </div>

          {/* Completion Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              className="input"
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value)}
              style={{ width: '100%', fontSize: '0.8125rem' }}
            >
              <option value="ALL">All Completion</option>
              <option value="COMPLETED">Completed (100%)</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="NOT_STARTED">Not Started (0%)</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ minWidth: '140px' }}>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: '100%', fontSize: '0.8125rem' }}
            >
              <option value="rollNumber">Sort: Roll Number</option>
              <option value="name">Sort: Student Name</option>
              <option value="completionPercentage">Sort: Completion %</option>
              <option value="averageScore">Sort: Average Score</option>
              <option value="pendingExperiments">Sort: Pending Exps</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.75rem' }}
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 3. Table / States                                                        */}
        {/* ========================================================================= */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <LoadingSpinner size={36} text="Loading student performance and academic records..." />
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
              No students are currently assigned to this lab through an active section cohort.
            </p>
          </div>
        ) : sortedStudents.length === 0 ? (
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
              No students match the current filters.
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
        ) : (
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
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Avg Score</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((stu) => (
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
                      {stu.averageScore !== null ? `${stu.averageScore}%` : '--'}
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
                        View &rarr;
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
                          Score Range
                        </span>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                          {detailData.overall?.highestScore !== null
                            ? `${detailData.overall.lowestScore}% - ${detailData.overall.highestScore}%`
                            : '--'}
                        </div>
                      </div>

                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Submissions
                        </span>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                          {detailData.overall?.totalSubmissions || 0}{' '}
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                            ({detailData.overall?.passedSubmissions || 0} passed)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Experiment-wise Breakdown Table */}
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 0.75rem 0' }}>
                      Experiment-wise Breakdown
                    </h3>
                    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.625rem 0.875rem' }}>Protocol</th>
                            <th style={{ padding: '0.625rem 0.875rem' }}>Status</th>
                            <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>Program / 10</th>
                            <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>Viva / 5</th>
                            <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>Total / 15</th>
                            <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>Attempts</th>
                            <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detailData.experiments || []).map((exp) => (
                            <tr key={exp.experimentId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.625rem 0.875rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                  Exp {exp.experimentNumber < 10 ? `0${exp.experimentNumber}` : exp.experimentNumber}: {exp.title}
                                </div>
                              </td>
                              <td style={{ padding: '0.625rem 0.875rem' }}>
                                {getExperimentStatusBadge(exp.status)}
                              </td>
                              <td style={{ padding: '0.625rem 0.875rem', textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>
                                {exp.scoreOutOf10 !== null ? `${exp.scoreOutOf10} / 10` : '--'}
                              </td>
                              <td style={{ padding: '0.625rem 0.875rem', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                                {exp.vivaScore !== null ? `${exp.vivaScore} / 5` : '-- / 5'}
                              </td>
                              <td style={{ padding: '0.625rem 0.875rem', textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>
                                {exp.totalScore !== null ? `${exp.totalScore} / 15` : '--'}
                              </td>
                              <td style={{ padding: '0.625rem 0.875rem', textAlign: 'center', fontWeight: 600 }}>
                                {exp.attempts} {exp.attempts === 1 ? 'attempt' : 'attempts'}
                              </td>
                              <td style={{ padding: '0.625rem 0.875rem', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedVivaExp({
                                      _id: exp.experimentId,
                                      title: exp.title,
                                      experimentNumber: exp.experimentNumber
                                    });
                                    setShowVivaModal(true);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#16a34a', borderColor: '#16a34a' }}
                                >
                                  {exp.vivaScore !== null ? '✏️ Edit Viva' : '🎙 Grade Viva'}
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

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.875rem 1.5rem',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: 'var(--color-surface-hover)'
              }}
            >
              <button onClick={handleCloseModal} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
                Close Performance View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIVA MANAGEMENT MODAL */}
      <VivaManagementModal
        isOpen={showVivaModal}
        onClose={async () => {
          setShowVivaModal(false);
          setSelectedVivaExp(null);
          if (selectedStudent) {
            await handleOpenStudentDetail(selectedStudent);
          }
          await fetchPerformanceData();
        }}
        experiment={selectedVivaExp}
        labId={labId}
      />
    </div>
  );
};

export default LabStudentPerformanceView;
