import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminDashboardService } from '../../services/adminDashboardService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const TABS = [
  { id: 'OVERVIEW', label: 'Command Center & Activity', icon: '⚡' },
  { id: 'LABS', label: 'Laboratories Telemetry', icon: '⚗️' },
  { id: 'TEACHERS', label: 'Faculty Deployment', icon: '👨‍🏫' },
  { id: 'STUDENTS', label: 'Student Cohorts', icon: '🎓' },
  { id: 'SECTIONS', label: 'Sections & Rosters', icon: '👥' },
  { id: 'REPORTS', label: 'Reports & Compliance', icon: '📄' }
];

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Global Filter State
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async (filters = {}) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        academicYear: filters.academicYear || academicYear || undefined,
        semester: filters.semester || semester || undefined,
        department: filters.department || department || undefined
      };
      const res = await adminDashboardService.getFullDashboard(params);
      setDashboardData(res.data || res);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError(err.message || 'Failed to aggregate administrative telemetry.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchDashboard({ academicYear, semester, department });
  };

  const handleResetFilters = () => {
    setAcademicYear('');
    setSemester('');
    setDepartment('');
    fetchDashboard({ academicYear: '', semester: '', department: '' });
  };

  if (loading && !dashboardData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingSpinner size={36} message="Aggregating institutional laboratory telemetry..." />
      </div>
    );
  }

  const stats = dashboardData?.statistics || {};
  const perf = dashboardData?.performance || {};
  const activity = dashboardData?.activity || [];
  const labs = dashboardData?.labs || [];
  const teachers = dashboardData?.teachers || [];
  const students = dashboardData?.students || [];
  const sections = dashboardData?.sections || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Quick Management Actions */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Administration &amp; HOD Command Center
            </h1>
            <span className="badge badge-error" style={{ fontSize: '0.75rem' }}>
              INSTITUTIONAL ROOT
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Unified real-time oversight of laboratory infrastructure, curriculum matrices, student progress, and faculty assignments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchDashboard()}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Refresh Telemetry"
          >
            <span>🔄</span> Refresh
          </button>
          <Link to="/admin/reports" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
            📄 Reports &amp; Exports
          </Link>
          <Link to="/admin/assignments" className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            🔗 Lab Assignments
          </Link>
        </div>
      </div>

      {/* Global Filter Bar */}
      <form
        onSubmit={handleApplyFilters}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Academic Year:
            </label>
            <input
              type="text"
              placeholder="e.g. 2025-2026"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-canvas)',
                fontSize: '0.8125rem',
                color: 'var(--color-text-primary)',
                width: '130px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Semester:
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-canvas)',
                fontSize: '0.8125rem',
                color: 'var(--color-text-primary)'
              }}
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Department:
            </label>
            <input
              type="text"
              placeholder="e.g. CSE"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-canvas)',
                fontSize: '0.8125rem',
                color: 'var(--color-text-primary)',
                width: '100px'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8125rem' }}
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8125rem' }}
          >
            Reset
          </button>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          System Standard: <strong>12 Max Experiments/Lab</strong> &bull; <strong>/10 Auto + /5 Viva = /15 Final</strong>
        </div>
      </form>

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

      {/* Primary Aggregate Statistics Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* Students Tile */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Students
            </span>
            <span style={{ fontSize: '1.25rem' }}>🎓</span>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {stats.students?.total || 0}
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{stats.students?.active || 0} Active</span> &bull; {stats.students?.inactive || 0} Inactive
            </div>
          </div>
          <Link to="/admin/students" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Manage Roster &rarr;
          </Link>
        </div>

        {/* Teachers Tile */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Faculty Members
            </span>
            <span style={{ fontSize: '1.25rem' }}>👨‍🏫</span>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {stats.teachers?.total || 0}
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{stats.teachers?.active || 0} Active</span> &bull; {stats.teachers?.inactive || 0} Inactive
            </div>
          </div>
          <Link to="/admin/teachers" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Manage Faculty &rarr;
          </Link>
        </div>

        {/* Labs Tile */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Laboratories
            </span>
            <span style={{ fontSize: '1.25rem' }}>⚗️</span>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {stats.labs?.total || 0}
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{stats.labs?.active || 0} Active</span> &bull; {stats.labs?.inactive || 0} Inactive
            </div>
          </div>
          <Link to="/admin/labs" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Inspect Labs &rarr;
          </Link>
        </div>

        {/* Sections Tile */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Academic Sections
            </span>
            <span style={{ fontSize: '1.25rem' }}>👥</span>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {stats.sections?.total || 0}
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{stats.sections?.active || 0} Active</span> &bull; {stats.sections?.inactive || 0} Inactive
            </div>
          </div>
          <Link to="/admin/sections" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Manage Cohorts &rarr;
          </Link>
        </div>

        {/* Experiments Tile */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Experiments
            </span>
            <span style={{ fontSize: '1.25rem' }}>🧪</span>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {stats.experiments?.total || 0}
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{stats.experiments?.published || 0} Published</span> &bull; {stats.experiments?.closed || 0} Closed
            </div>
          </div>
          <Link to="/admin/labs" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Curriculum Authoring &rarr;
          </Link>
        </div>
      </div>

      {/* Performance & Scoring Health Banner */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          alignItems: 'center'
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Average Final Score
          </span>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
            {perf.averageFinalScore || 0} <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)' }}>/ 15</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Auto: {perf.averageAutomatedScore || 0}/10 &bull; Viva: {perf.averageVivaScore || 0}/5
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Curriculum Completion Rate
          </span>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '0.2rem' }}>
            {perf.overallCompletionPercentage || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Total Graded Units: <strong>{perf.totalGradedUnits || 0}</strong>
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Submissions &amp; Evaluations
          </span>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
            {stats.evaluations?.submissions || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Vivas: <strong>{stats.evaluations?.vivaEvaluations || 0}</strong> &bull; Pending Re-evals: <strong>{stats.evaluations?.pendingReevaluations || 0}</strong>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.5rem'
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.1rem',
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
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREAS */}

      {/* 1. OVERVIEW & ACTIVITY FEED */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Recent Activity Feed */}
          <div
            className="card"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              padding: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                Live Academic Activity Stream
              </h2>
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                {activity.length} Recent Events
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activity.length > 0 ? (
                activity.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-canvas)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${ev.badgeColor}`} style={{ fontSize: '0.6875rem' }}>
                        {ev.badge}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(ev.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {ev.title}
                    </div>
                    <div
                      style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}
                      dangerouslySetInnerHTML={{ __html: ev.details }}
                    />
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                  No recent laboratory activity records.
                </p>
              )}
            </div>
          </div>

          {/* Quick Management Navigation Shortcuts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              className="card"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: '1.5rem'
              }}
            >
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
                Administrative Navigation Hub
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <Link
                  to="/admin/labs"
                  className="card"
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    textDecoration: 'none',
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>⚗️</div>
                  <strong style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', display: 'block' }}>Laboratories</strong>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Curriculum &amp; Setup</span>
                </Link>

                <Link
                  to="/admin/sections"
                  className="card"
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    textDecoration: 'none',
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>👥</div>
                  <strong style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', display: 'block' }}>Sections</strong>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Cohorts &amp; Terms</span>
                </Link>

                <Link
                  to="/admin/teachers"
                  className="card"
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    textDecoration: 'none',
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>👨‍🏫</div>
                  <strong style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', display: 'block' }}>Teachers</strong>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Faculty Roster</span>
                </Link>

                <Link
                  to="/admin/students"
                  className="card"
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    textDecoration: 'none',
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎓</div>
                  <strong style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', display: 'block' }}>Students</strong>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Roster &amp; Allocation</span>
                </Link>

                <Link
                  to="/admin/assignments"
                  className="card"
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    textDecoration: 'none',
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🔗</div>
                  <strong style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', display: 'block' }}>Assignments</strong>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Lab &amp; Faculty Matrix</span>
                </Link>

                <Link
                  to="/admin/reports"
                  className="card"
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    textDecoration: 'none',
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📄</div>
                  <strong style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', display: 'block' }}>Reports</strong>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>PDF &amp; Excel Export</span>
                </Link>
              </div>
            </div>

            {/* Academic Structure Matrix Card */}
            <div
              className="card"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                padding: '1.5rem'
              }}
            >
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>
                System Policy &amp; Security Compliance
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem 0' }}>
                Enforcing strict role-based access control, Docker runtime code isolation, automated test verification, and authoritative viva voce scoring.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>JWT STATELESS AUTH</span>
                <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>SANDBOX CONTAINER ISOLATION</span>
                <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>12-EXPERIMENT RULE</span>
                <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>HISTORICAL PRESERVATION</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LABORATORIES TELEMETRY */}
      {activeTab === 'LABS' && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Laboratories Telemetry ({labs.length})
            </h2>
            <Link to="/admin/labs" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              + Manage Laboratories
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Code</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Laboratory Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Subject / Dept</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Academic Term</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Experiments</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sections</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Faculty</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((l, idx) => (
                  <tr
                    key={l._id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)'
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{l.code}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{l.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)' }}>{l.subject} ({l.department})</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)' }}>Sem {l.semester} &bull; {l.academicYear}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {l.publishedExperiments} / {l.totalExperiments}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>{l.assignedSectionsCount}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>{l.assignedTeachersCount}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span className={`badge ${l.active ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.6875rem' }}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. FACULTY DEPLOYMENT */}
      {activeTab === 'TEACHERS' && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Faculty Deployment Overview ({teachers.length})
            </h2>
            <Link to="/admin/assignments" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              + Modify Assignments
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Teacher Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Teacher ID / Roll</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Assigned Laboratories</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Assigned Sections</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Role Permissions</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, idx) => (
                  <tr
                    key={t._id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)'
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)' }}>{t.rollNumber}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-primary)' }}>
                      {t.assignedLabs.length > 0 ? t.assignedLabs.join(', ') : <span style={{ color: 'var(--color-text-secondary)' }}>None</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-primary)' }}>
                      {t.assignedSections.length > 0 ? t.assignedSections.join(', ') : <span style={{ color: 'var(--color-text-secondary)' }}>None</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {t.assignmentRoles.map((r) => (
                        <span key={r} className="badge badge-info" style={{ fontSize: '0.6875rem', marginRight: '0.25rem' }}>
                          {r}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span className={`badge ${t.active ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.6875rem' }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. STUDENT COHORTS */}
      {activeTab === 'STUDENTS' && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Student Cohorts Overview ({students.length})
            </h2>
            <Link to="/admin/students" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              + Manage Student Roster
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Roll Number</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Student Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Section</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Academic Term</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Completed Exps</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Avg Score (/15)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr
                    key={s._id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)'
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{s.rollNumber}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)' }}>{s.section}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)' }}>Sem {s.semester} &bull; {s.academicYear}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {s.completedExperiments}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {s.averageFinalScore} / 15
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span className={`badge ${s.active ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.6875rem' }}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SECTIONS OVERVIEW */}
      {activeTab === 'SECTIONS' && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Academic Sections &amp; Cohorts ({sections.length})
            </h2>
            <Link to="/admin/sections" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              + Manage Sections
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Section Code</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Section Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Academic Term</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Students</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Assigned Labs</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Faculty</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec, idx) => (
                  <tr
                    key={sec._id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)'
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{sec.sectionCode}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{sec.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)' }}>{sec.department}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-secondary)' }}>Sem {sec.semester} &bull; {sec.academicYear}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>{sec.studentCount}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{sec.assignedLabsCount}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{sec.assignedTeachersCount}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span className={`badge ${sec.active ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.6875rem' }}>
                        {sec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. REPORTS & COMPLIANCE SHORTCUTS */}
      {activeTab === 'REPORTS' && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '2rem'
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 0.5rem 0' }}>
              Institutional Reports &amp; Export Center
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Direct access to comprehensive academic report generation across all categories with vector PDF printing and Excel (.xlsx) export capabilities.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div
              className="card"
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--color-primary)', display: 'block' }}>
                  ⚗️ Laboratory Performance Reports
                </strong>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                  Comprehensive overview of laboratory cohorts, experiment progress, score distributions, and averages.
                </p>
              </div>
              <Link to="/admin/reports" className="btn btn-primary" style={{ fontSize: '0.8125rem', textAlign: 'center' }}>
                Generate Lab Report &rarr;
              </Link>
            </div>

            <div
              className="card"
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--color-primary)', display: 'block' }}>
                  👥 Section Cohort Ledgers
                </strong>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                  Academic section ledgers containing student rosters, completed units, and cumulative average marks.
                </p>
              </div>
              <Link to="/admin/reports" className="btn btn-primary" style={{ fontSize: '0.8125rem', textAlign: 'center' }}>
                Generate Section Report &rarr;
              </Link>
            </div>

            <div
              className="card"
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--color-primary)', display: 'block' }}>
                  📝 Full Marks Ledgers (/10 + /5 = /15)
                </strong>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                  Authoritative student marks breakdown showing highest automated evaluation and active viva voce scores.
                </p>
              </div>
              <Link to="/admin/reports" className="btn btn-primary" style={{ fontSize: '0.8125rem', textAlign: 'center' }}>
                Generate Marks Ledger &rarr;
              </Link>
            </div>

            <div
              className="card"
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--color-primary)', display: 'block' }}>
                  📈 Curriculum Progress Telemetry
                </strong>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                  Term-wide curriculum completion metrics tracking 1–12 experiments per lab across all sections.
                </p>
              </div>
              <Link to="/admin/reports" className="btn btn-primary" style={{ fontSize: '0.8125rem', textAlign: 'center' }}>
                Generate Progress Telemetry &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
