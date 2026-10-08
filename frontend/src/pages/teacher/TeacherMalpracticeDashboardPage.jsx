import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { labService } from '../../services/labService';
import { malpracticeService } from '../../services/malpracticeService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Event metadata configuration with icons, descriptions, and human-readable names
const EVENT_CONFIG = {
  COPY_ATTEMPT: {
    label: 'Copy Attempt',
    icon: '📋',
    description: 'Copying code from editor was attempted and blocked.'
  },
  PASTE_ATTEMPT: {
    label: 'Paste Attempt',
    icon: '📄',
    description: 'Pasting code into editor was attempted and blocked.'
  },
  CUT_ATTEMPT: {
    label: 'Cut Attempt',
    icon: '✂️',
    description: 'Cutting code from editor was attempted and blocked.'
  },
  CONTEXT_MENU_ATTEMPT: {
    label: 'Context Menu Attempt',
    icon: '🖱️',
    description: 'Right-click context menu was triggered inside editor.'
  },
  DRAG_DROP_ATTEMPT: {
    label: 'Drag & Drop Attempt',
    icon: '📥',
    description: 'Dragging and dropping content into editor was blocked.'
  },
  TAB_SWITCH: {
    label: 'Tab Switch',
    icon: '🗂️',
    description: 'Student navigated away from the active laboratory tab.'
  },
  WINDOW_BLUR: {
    label: 'Window Focus Lost',
    icon: '🪟',
    description: 'Laboratory browser window lost system or application focus.'
  },
  FULLSCREEN_EXIT: {
    label: 'Fullscreen Exit',
    icon: '⛶',
    description: 'Student exited mandatory fullscreen examination mode.'
  },
  // Extensible for future Phase 4 camera events:
  CAMERA_DISABLED: {
    label: 'Camera Disabled',
    icon: '📷',
    description: 'Proctoring camera stream was disconnected or disabled.'
  },
  FACE_NOT_DETECTED: {
    label: 'Face Not Detected',
    icon: '👤',
    description: 'Candidate face was not detected in proctoring camera frame.'
  },
  MULTIPLE_FACES_DETECTED: {
    label: 'Multiple Faces Detected',
    icon: '👥',
    description: 'Multiple individuals detected in proctoring camera frame.'
  }
};

const TeacherMalpracticeDashboardPage = () => {
  const { labId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSectionId = searchParams.get('sectionId') || '';
  const initialStudentId = searchParams.get('studentId') || '';

  const { user } = useAuth();
  const navigate = useNavigate();

  // Primary Data State
  const [labOverview, setLabOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, REVIEW_REQUIRED, ATTENTION, NORMAL, CRITICAL
  const [sectionFilter, setSectionFilter] = useState(initialSectionId);
  const [sortBy, setSortBy] = useState('STATUS_FIRST'); // STATUS_FIRST, EVENTS_DESC, RECENT_FIRST, ROLL_ASC, NAME_ASC

  // Detailed Activity Timeline Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineTotalPages, setTimelineTotalPages] = useState(1);

  // Timeline Filter State inside Modal
  const [modalEventTypeFilter, setModalEventTypeFilter] = useState('ALL');
  const [modalSeverityFilter, setModalSeverityFilter] = useState('ALL');
  const [modalDateFilter, setModalDateFilter] = useState('ALL'); // ALL, TODAY, LAST_7_DAYS, LAST_30_DAYS

  const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'ADMIN_HOD';

  useEffect(() => {
    if (labId) {
      fetchLabOverview();
    }
  }, [labId, sectionFilter]);

  const fetchLabOverview = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const res = await malpracticeService.getLabMalpracticeOverview(labId, {
        sectionId: sectionFilter || undefined
      });
      const data = res.data || res;
      setLabOverview(data);

      // Auto-open modal if studentId passed via URL query
      if (initialStudentId && data.students) {
        const targetStudent = data.students.find(
          (s) => s.studentId === initialStudentId || s._id === initialStudentId
        );
        if (targetStudent) {
          handleOpenTimeline(targetStudent);
        }
      }
    } catch (err) {
      console.error('Failed to load lab malpractice telemetry:', err);
      setError(err.response?.data?.message || err.message || 'Failed to retrieve malpractice telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenTimeline = async (student) => {
    setSelectedStudent(student);
    setTimelineLoading(true);
    setTimelineError('');
    setTimelineEvents([]);
    setTimelinePage(1);

    try {
      await fetchTimelineEventsForStudent(student.studentId || student._id, 1);
    } catch (err) {
      console.error('Failed to load student activity timeline:', err);
      setTimelineError(err.response?.data?.message || 'Failed to retrieve student activity events');
    } finally {
      setTimelineLoading(false);
    }
  };

  const fetchTimelineEventsForStudent = async (studentId, page = 1) => {
    setTimelineLoading(true);
    try {
      const queryParams = {
        labId,
        studentId,
        page,
        limit: 25
      };

      if (modalEventTypeFilter !== 'ALL') {
        queryParams.eventType = modalEventTypeFilter;
      }
      if (modalSeverityFilter !== 'ALL') {
        queryParams.severity = modalSeverityFilter;
      }

      if (modalDateFilter === 'TODAY') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        queryParams.startDate = start.toISOString();
      } else if (modalDateFilter === 'LAST_7_DAYS') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        queryParams.startDate = start.toISOString();
      } else if (modalDateFilter === 'LAST_30_DAYS') {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        queryParams.startDate = start.toISOString();
      }

      const res = await malpracticeService.getMalpracticeEvents(queryParams);
      const data = res.data || res;
      setTimelineEvents(data.events || []);
      setTimelineTotalPages(data.totalPages || 1);
      setTimelinePage(data.page || 1);
    } catch (err) {
      console.error('Failed to query timeline events:', err);
      setTimelineError(err.response?.data?.message || 'Failed to retrieve activity timeline');
    } finally {
      setTimelineLoading(false);
    }
  };

  // Re-fetch timeline when modal filters change
  useEffect(() => {
    if (selectedStudent) {
      const studentId = selectedStudent.studentId || selectedStudent._id;
      fetchTimelineEventsForStudent(studentId, 1);
    }
  }, [modalEventTypeFilter, modalSeverityFilter, modalDateFilter]);

  const handleCloseTimeline = () => {
    setSelectedStudent(null);
    setTimelineEvents([]);
    setTimelineError('');
    setModalEventTypeFilter('ALL');
    setModalSeverityFilter('ALL');
    setModalDateFilter('ALL');
  };

  // Status Badge UI Component
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'CRITICAL':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#F87171',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            <span>🔴</span> Critical
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(249, 115, 22, 0.15)',
              color: '#FB923C',
              border: '1px solid rgba(249, 115, 22, 0.35)',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            <span>🟠</span> Review Required
          </span>
        );
      case 'ATTENTION':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#FACC15',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            <span>🟡</span> Attention
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              color: '#4ADE80',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            <span>🟢</span> Normal
          </span>
        );
    }
  };

  const renderSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#F87171',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.6875rem',
              fontWeight: 700
            }}
          >
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span
            style={{
              backgroundColor: 'rgba(249, 115, 22, 0.2)',
              color: '#FB923C',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.6875rem',
              fontWeight: 600
            }}
          >
            MEDIUM
          </span>
        );
      case 'LOW':
      default:
        return (
          <span
            style={{
              backgroundColor: 'rgba(148, 163, 184, 0.15)',
              color: '#CBD5E1',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.6875rem',
              fontWeight: 500
            }}
          >
            LOW
          </span>
        );
    }
  };

  // Filter and Sort Students List
  const filteredStudents = useMemo(() => {
    if (!labOverview || !labOverview.students) return [];

    return labOverview.students
      .filter((stu) => {
        // Search term filter (Name or Roll Number)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchName = stu.name?.toLowerCase().includes(term);
          const matchRoll = stu.rollNumber?.toLowerCase().includes(term);
          const matchSection = stu.section?.toLowerCase().includes(term);
          if (!matchName && !matchRoll && !matchSection) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'REVIEW_REQUIRED') {
            if (stu.status !== 'REVIEW_REQUIRED' && stu.status !== 'CRITICAL') return false;
          } else if (stu.status !== statusFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'STATUS_FIRST') {
          const score = (s) => (s === 'CRITICAL' ? 4 : s === 'REVIEW_REQUIRED' ? 3 : s === 'ATTENTION' ? 2 : 1);
          const diff = score(b.status) - score(a.status);
          if (diff !== 0) return diff;
          return (b.totalEvents || 0) - (a.totalEvents || 0);
        }
        if (sortBy === 'EVENTS_DESC') {
          return (b.totalEvents || 0) - (a.totalEvents || 0);
        }
        if (sortBy === 'RECENT_FIRST') {
          if (!a.latestEventTimestamp) return 1;
          if (!b.latestEventTimestamp) return -1;
          return new Date(b.latestEventTimestamp) - new Date(a.latestEventTimestamp);
        }
        if (sortBy === 'ROLL_ASC') {
          return (a.rollNumber || '').localeCompare(b.rollNumber || '');
        }
        if (sortBy === 'NAME_ASC') {
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });
  }, [labOverview, searchTerm, statusFilter, sortBy]);

  // Back path to lab hub
  const getBackPath = () => {
    if (user?.role === 'ADMIN_HOD') return `/admin/labs/${labId}`;
    return `/teacher/labs/${labId}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Loading laboratory malpractice telemetry & integrity logs..." />
      </div>
    );
  }

  if (error || !labOverview) {
    return (
      <div style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            Unable to Load Malpractice Dashboard
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            {error || 'The requested laboratory malpractice telemetry could not be loaded.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to={getBackPath()} className="btn btn-secondary">
              &larr; Back to Laboratory
            </Link>
            <button type="button" onClick={() => fetchLabOverview(true)} className="btn btn-primary">
              ↺ Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { lab, summary } = labOverview;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Top Header Navigation & Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button
            type="button"
            onClick={() => navigate(getBackPath())}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>&larr;</span> Back to Laboratory
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-family-mono)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary-subtle)',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px'
              }}
            >
              {lab.code}
            </span>
            <h1 style={{ fontSize: '1.625rem', margin: 0, color: 'var(--color-primary)', letterSpacing: '-0.01em' }}>
              {lab.name} &bull; Integrity Monitoring
            </h1>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Real-time telemetry and student malpractice event logs for academic evaluation.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => fetchLabOverview(true)}
            disabled={refreshing}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Refresh malpractice telemetry"
          >
            {refreshing ? <LoadingSpinner size={14} /> : <span>↺</span>}
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Total Students Monitored */}
        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Students Monitored
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
            {summary.studentsMonitored || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Enrolled in active laboratory sections
          </div>
        </div>

        {/* Students Requiring Review */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            border: summary.studentsRequiringReview > 0 ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid var(--color-border)',
            backgroundColor: summary.studentsRequiringReview > 0 ? 'rgba(249, 115, 22, 0.04)' : 'var(--color-surface)'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#FB923C', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>⚠️</span> Students Requiring Review
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FB923C', marginTop: '0.25rem' }}>
            {summary.studentsRequiringReview || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Flagged with multiple or significant events
          </div>
        </div>

        {/* Total Events Recorded */}
        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Malpractice Events
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
            {summary.totalEvents || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Across {summary.studentsWithEvents || 0} students with incidents
          </div>
        </div>

        {/* High Severity Events */}
        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            High Severity Events
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: (summary.bySeverity?.HIGH || 0) > 0 ? '#F87171' : 'var(--color-text-primary)',
              marginTop: '0.25rem'
            }}
          >
            {summary.bySeverity?.HIGH || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Critical anomalies &amp; future camera flags
          </div>
        </div>
      </div>

      {/* Lab-Level Malpractice Breakdown Card */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📊</span> Laboratory Event Breakdown
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(EVENT_CONFIG).map(([eventType, config]) => {
            const count = summary.byType?.[eventType] || 0;
            return (
              <div
                key={eventType}
                style={{
                  padding: '0.75rem',
                  backgroundColor: count > 0 ? 'var(--color-surface-hover)' : 'var(--color-canvas)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  opacity: count > 0 ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <span>{config.icon}</span>
                  <span style={{ fontWeight: 600 }}>{config.label}</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: count > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.875rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search student by name, roll number, or section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8125rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                fontSize: '0.8125rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-canvas)',
                color: 'var(--color-text-primary)',
                fontWeight: 600
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="REVIEW_REQUIRED">Review Required / Critical</option>
              <option value="ATTENTION">Attention</option>
              <option value="NORMAL">Normal Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Order:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                fontSize: '0.8125rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-canvas)',
                color: 'var(--color-text-primary)',
                fontWeight: 600
              }}
            >
              <option value="STATUS_FIRST">Review Status First</option>
              <option value="EVENTS_DESC">Highest Event Count</option>
              <option value="RECENT_FIRST">Most Recent Event</option>
              <option value="ROLL_ASC">Roll Number (A-Z)</option>
              <option value="NAME_ASC">Student Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Malpractice Ledger Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        {filteredStudents.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {summary.totalEvents === 0 ? '🟢' : '🔍'}
            </div>
            <h3 style={{ fontSize: '1.0625rem', color: 'var(--color-primary)', margin: 0, marginBottom: '0.35rem' }}>
              {summary.totalEvents === 0
                ? 'No Malpractice Events Recorded'
                : 'No Students Match the Selected Filters'}
            </h3>
            <p style={{ fontSize: '0.8125rem', maxWidth: '420px', margin: '0 auto' }}>
              {summary.totalEvents === 0
                ? 'Students in this laboratory cohort have completed their coding sessions with standard integrity.'
                : 'Try adjusting your search criteria or clearing active status filters.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-surface-hover)',
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.04em'
                  }}
                >
                  <th style={{ padding: '0.875rem 1rem' }}>Student / Candidate</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Section</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Integrity Status</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Total Incidents</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Top Event Breakdown</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Last Recorded Incident</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((stu) => {
                  const hasEvents = stu.totalEvents > 0;
                  return (
                    <tr
                      key={stu.studentId}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: stu.status === 'CRITICAL' || stu.status === 'REVIEW_REQUIRED'
                          ? 'rgba(249, 115, 22, 0.03)'
                          : 'transparent'
                      }}
                    >
                      {/* Student Info */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <strong style={{ display: 'block', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                          {stu.name}
                        </strong>
                        <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem' }}>
                          {stu.rollNumber}
                        </span>
                      </td>

                      {/* Section */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span className="badge" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                          {stu.section || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {renderStatusBadge(stu.status)}
                      </td>

                      {/* Total Events */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <strong style={{ fontSize: '0.9375rem', color: hasEvents ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                          {stu.totalEvents || 0}
                        </strong>
                      </td>

                      {/* Event Breakdown Badges */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {hasEvents ? (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {Object.entries(stu.byType || {}).map(([type, count]) => {
                              if (!count) return null;
                              const cfg = EVENT_CONFIG[type] || { icon: '⚠️', label: type };
                              return (
                                <span
                                  key={type}
                                  title={`${count} ${cfg.label}`}
                                  style={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    fontSize: '0.6875rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <span>{cfg.icon}</span>
                                  <strong>{count}</strong>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>None</span>
                        )}
                      </td>

                      {/* Last Recorded Incident */}
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                        {stu.latestEventTimestamp
                          ? new Date(stu.latestEventTimestamp).toLocaleString()
                          : 'No incidents'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenTimeline(stu)}
                          className={`btn ${hasEvents ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                        >
                          View Activity &rarr;
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

      {/* ========================================================================= */}
      {/* DETAILED ACTIVITY TIMELINE MODAL                                          */}
      {/* ========================================================================= */}
      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem'
          }}
          onClick={handleCloseTimeline}
        >
          <div
            className="card"
            style={{
              maxWidth: '840px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-hover)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                  <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
                    Malpractice Activity Timeline &bull; {selectedStudent.name}
                  </h3>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Roll: <strong style={{ fontFamily: 'var(--font-family-mono)' }}>{selectedStudent.rollNumber}</strong> &bull; Section: <strong>{selectedStudent.section || '—'}</strong> &bull; Status: {renderStatusBadge(selectedStudent.status)}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseTimeline}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Filters Bar */}
            <div
              style={{
                padding: '0.75rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                flexWrap: 'wrap',
                backgroundColor: 'var(--color-canvas)',
                fontSize: '0.75rem'
              }}
            >
              {/* Event Type Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Event Type:</span>
                <select
                  value={modalEventTypeFilter}
                  onChange={(e) => setModalEventTypeFilter(e.target.value)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="ALL">All Event Types</option>
                  <option value="TAB_SWITCH">Tab Switch</option>
                  <option value="WINDOW_BLUR">Window Focus Lost</option>
                  <option value="FULLSCREEN_EXIT">Fullscreen Exit</option>
                  <option value="PASTE_ATTEMPT">Paste Attempt</option>
                  <option value="COPY_ATTEMPT">Copy Attempt</option>
                  <option value="CUT_ATTEMPT">Cut Attempt</option>
                  <option value="CONTEXT_MENU_ATTEMPT">Context Menu</option>
                  <option value="DRAG_DROP_ATTEMPT">Drag &amp; Drop</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Severity:</span>
                <select
                  value={modalSeverityFilter}
                  onChange={(e) => setModalSeverityFilter(e.target.value)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="ALL">All Severities</option>
                  <option value="HIGH">High Only</option>
                  <option value="MEDIUM">Medium Only</option>
                  <option value="LOW">Low Only</option>
                </select>
              </div>

              {/* Time Range Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Time:</span>
                <select
                  value={modalDateFilter}
                  onChange={(e) => setModalDateFilter(e.target.value)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Modal Body: Timeline */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {timelineLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <LoadingSpinner size={30} text="Loading student activity history..." />
                </div>
              ) : timelineError ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#F87171' }}>
                  <p>{timelineError}</p>
                </div>
              ) : timelineEvents.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🟢</div>
                  <h4 style={{ color: 'var(--color-primary)', margin: 0, marginBottom: '0.25rem' }}>
                    No Activity Events Recorded
                  </h4>
                  <p style={{ fontSize: '0.8125rem', margin: 0 }}>
                    No malpractice incidents matching the selected criteria exist for this student.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {timelineEvents.map((evt, idx) => {
                    const cfg = EVENT_CONFIG[evt.eventType] || {
                      label: evt.eventType,
                      icon: '⚠️',
                      description: 'Prohibited action detected.'
                    };
                    const dateObj = new Date(evt.timestamp || evt.createdAt);

                    return (
                      <div
                        key={evt._id || idx}
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          padding: '1rem',
                          backgroundColor: 'var(--color-canvas)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        {/* Event Icon */}
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.125rem',
                            flexShrink: 0
                          }}
                        >
                          {cfg.icon}
                        </div>

                        {/* Event Details */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                                {cfg.label}
                              </strong>
                              {renderSeverityBadge(evt.severity)}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>
                              {dateObj.toLocaleTimeString()} &bull; {dateObj.toLocaleDateString()}
                            </span>
                          </div>

                          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                            {cfg.description}
                          </p>

                          {/* Context Tags */}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.6875rem' }}>
                            {evt.experiment && (
                              <span
                                style={{
                                  backgroundColor: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '3px',
                                  color: 'var(--color-text-secondary)'
                                }}
                              >
                                Exp {evt.experiment.experimentNumber || ''}: {evt.experiment.title || 'Experiment Protocol'}
                              </span>
                            )}

                            {evt.details && Object.keys(evt.details).length > 0 && (
                              <span
                                style={{
                                  backgroundColor: 'var(--color-surface)',
                                  border: '1px solid var(--color-border)',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '3px',
                                  color: 'var(--color-text-muted)'
                                }}
                              >
                                {evt.details.language ? `Lang: ${evt.details.language}` : ''}
                                {evt.details.source ? ` Source: ${evt.details.source}` : ''}
                                {evt.details.visibilityState ? ` State: ${evt.details.visibilityState}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer: Pagination */}
            {timelineTotalPages > 1 && (
              <div
                style={{
                  padding: '0.875rem 1.5rem',
                  borderTop: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-hover)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem'
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Page {timelinePage} of {timelineTotalPages}
                </span>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={timelinePage <= 1}
                    onClick={() => {
                      const studentId = selectedStudent.studentId || selectedStudent._id;
                      fetchTimelineEventsForStudent(studentId, timelinePage - 1);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    &larr; Prev
                  </button>
                  <button
                    type="button"
                    disabled={timelinePage >= timelineTotalPages}
                    onClick={() => {
                      const studentId = selectedStudent.studentId || selectedStudent._id;
                      fetchTimelineEventsForStudent(studentId, timelinePage + 1);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherMalpracticeDashboardPage;
