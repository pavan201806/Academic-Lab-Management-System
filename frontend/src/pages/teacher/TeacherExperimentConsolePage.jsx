import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { labService } from '../../services/labService';
import { experimentService } from '../../services/experimentService';
import { submissionService } from '../../services/submissionService';
import { evaluationService } from '../../services/evaluationService';
import { vivaService } from '../../services/vivaService';
import { reevaluationService } from '../../services/reevaluationService';
import { malpracticeService } from '../../services/malpracticeService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CodeEditor from '../../components/code/CodeEditor';

const EVENT_CONFIG = {
  COPY_ATTEMPT: { label: 'Copy Attempt', icon: '📋', description: 'Copying code from editor was blocked.', defaultSeverity: 'LOW' },
  PASTE_ATTEMPT: { label: 'Paste Attempt', icon: '📄', description: 'Pasting code into editor was blocked.', defaultSeverity: 'MEDIUM' },
  CUT_ATTEMPT: { label: 'Cut Attempt', icon: '✂️', description: 'Cutting code from editor was blocked.', defaultSeverity: 'LOW' },
  CONTEXT_MENU_ATTEMPT: { label: 'Context Menu Attempt', icon: '🖱️', description: 'Right-click context menu was triggered in editor.', defaultSeverity: 'LOW' },
  DRAG_DROP_ATTEMPT: { label: 'Drag & Drop Attempt', icon: '📥', description: 'Drag-and-drop into editor was blocked.', defaultSeverity: 'MEDIUM' },
  TAB_SWITCH: { label: 'Tab Switch', icon: '🗂️', description: 'Navigated away from active laboratory tab.', defaultSeverity: 'MEDIUM' },
  WINDOW_BLUR: { label: 'Window Focus Lost', icon: '🪟', description: 'Editor window lost system application focus.', defaultSeverity: 'MEDIUM' },
  FULLSCREEN_EXIT: { label: 'Fullscreen Exit', icon: '⛶', description: 'Exited mandatory fullscreen examination mode.', defaultSeverity: 'MEDIUM' },
  CAMERA_DISABLED: { label: 'Camera Disabled', icon: '📷', description: 'Proctoring camera stream disconnected.', defaultSeverity: 'HIGH' },
  FACE_NOT_DETECTED: { label: 'Face Not Detected', icon: '👤', description: 'Candidate face not detected in camera frame.', defaultSeverity: 'HIGH' },
  MULTIPLE_FACES_DETECTED: { label: 'Multiple Faces', icon: '👥', description: 'Multiple individuals detected in camera frame.', defaultSeverity: 'HIGH' }
};

const TeacherExperimentConsolePage = () => {
  const { labId, experimentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'submissions';

  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'submissions' | 'analytics' | 'viva'
  const [activeTab, setActiveTab] = useState(initialTab);

  // Core Data States
  const [lab, setLab] = useState(null);
  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Submissions & Cohort State
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [vivas, setVivas] = useState([]);

  // Malpractice Telemetry State (Experiment-scoped)
  const [malpracticeOverview, setMalpracticeOverview] = useState(null);

  // Viva Sub-Tab & Re-evaluations State
  const [vivaSubTab, setVivaSubTab] = useState('evaluation'); // 'evaluation' | 'reevaluations'
  const [reevalRequests, setReevalRequests] = useState([]);

  // Unified Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('ALL');
  const [integrityFilter, setIntegrityFilter] = useState('ALL'); // ALL, CLEAN, ATTENTION, REVIEW_REQUIRED, CRITICAL
  const [riskLevelFilter, setRiskLevelFilter] = useState('ALL'); // ALL, HIGH, MEDIUM, LOW, NONE
  const [sortBy, setSortBy] = useState('RISK_FIRST'); // RISK_FIRST, INCIDENTS_DESC, SCORE_DESC, SCORE_ASC, ROLL_ASC, NAME_ASC

  // Modal / Inspection States
  const [inspectingSubmission, setInspectingSubmission] = useState(null);
  const [inspectingEvaluation, setInspectingEvaluation] = useState(null);
  const [inspectingViva, setInspectingViva] = useState(null);

  // Inline / In-Modal Viva Grading State
  const [gradingStudent, setGradingStudent] = useState(null);
  const [vivaInputMarks, setVivaInputMarks] = useState(3.5);
  const [vivaInputRemarks, setVivaInputRemarks] = useState('');
  const [savingViva, setSavingViva] = useState(false);
  const [vivaSaveSuccess, setVivaSaveSuccess] = useState('');
  const [vivaSaveError, setVivaSaveError] = useState('');

  // Re-evaluation Processing Modal State
  const [processingRequest, setProcessingRequest] = useState(null);
  const [reevalAction, setReevalAction] = useState('APPROVE');
  const [reevalMarks, setReevalMarks] = useState(4.0);
  const [reevalRemarks, setReevalRemarks] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submittingProcess, setSubmittingProcess] = useState(false);
  const [processError, setProcessError] = useState('');
  const [processSuccess, setProcessSuccess] = useState('');

  // Student Malpractice Investigation Modal State
  const [investigatingStudent, setInvestigatingStudent] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const [modalEventTypeFilter, setModalEventTypeFilter] = useState('ALL');
  const [modalSeverityFilter, setModalSeverityFilter] = useState('ALL');

  useEffect(() => {
    if (labId && experimentId) {
      fetchCoreData();
    }
  }, [labId, experimentId]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const fetchCoreData = async () => {
    setLoading(true);
    setError('');
    setIsUnauthorized(false);
    try {
      const [labRes, expRes, stuRes, subRes, evalRes, vivaRes, malRes, reevalRes] = await Promise.all([
        labService.getLabById(labId),
        experimentService.getExperimentById(experimentId, user),
        vivaService.getEligibleStudents(experimentId).catch(() => ({ data: [] })),
        submissionService.getTeacherSubmissionsForLab(labId, experimentId),
        evaluationService.getLabEvaluations(labId, experimentId).catch(() => ({ data: [] })),
        vivaService.getLabVivaEvaluations(labId, experimentId).catch(() => ({ data: [] })),
        malpracticeService.getLabMalpracticeOverview(labId, { experimentId }).catch(() => null),
        reevaluationService.getLabRequests(labId, experimentId).catch(() => ({ data: [] }))
      ]);

      setLab(labRes.data || labRes);
      setExperiment(expRes.data || expRes);

      const stuData = stuRes.data || stuRes || [];
      setEligibleStudents(Array.isArray(stuData) ? stuData : []);

      const subData = subRes.data || subRes || [];
      setSubmissions(Array.isArray(subData) ? subData : []);

      const evalData = evalRes.data || evalRes || [];
      setEvaluations(Array.isArray(evalData) ? evalData : []);

      const vivaData = vivaRes.data || vivaRes || [];
      setVivas(Array.isArray(vivaData) ? vivaData : []);

      setMalpracticeOverview(malRes?.data || malRes || null);

      const reevalData = reevalRes.data || reevalRes || [];
      setReevalRequests(Array.isArray(reevalData) ? reevalData : []);
    } catch (err) {
      console.error('Failed to load experiment console data:', err);
      if (err.response?.status === 403 || err.response?.status === 404) {
        setIsUnauthorized(true);
        setError(err.response?.data?.message || 'Access Denied: You are not authorized for this laboratory experiment.');
      } else {
        setError(err.response?.data?.message || 'Failed to load experiment console.');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshTabData = async () => {
    try {
      const [stuRes, subRes, evalRes, vivaRes, malRes, reevalRes] = await Promise.all([
        vivaService.getEligibleStudents(experimentId).catch(() => ({ data: [] })),
        submissionService.getTeacherSubmissionsForLab(labId, experimentId),
        evaluationService.getLabEvaluations(labId, experimentId).catch(() => ({ data: [] })),
        vivaService.getLabVivaEvaluations(labId, experimentId).catch(() => ({ data: [] })),
        malpracticeService.getLabMalpracticeOverview(labId, { experimentId }).catch(() => null),
        reevaluationService.getLabRequests(labId, experimentId).catch(() => ({ data: [] }))
      ]);

      const stuData = stuRes.data || stuRes || [];
      setEligibleStudents(Array.isArray(stuData) ? stuData : []);

      const subData = subRes.data || subRes || [];
      setSubmissions(Array.isArray(subData) ? subData : []);

      const evalData = evalRes.data || evalRes || [];
      setEvaluations(Array.isArray(evalData) ? evalData : []);

      const vivaData = vivaRes.data || vivaRes || [];
      setVivas(Array.isArray(vivaData) ? vivaData : []);

      setMalpracticeOverview(malRes?.data || malRes || null);

      const reevalData = reevalRes.data || reevalRes || [];
      setReevalRequests(Array.isArray(reevalData) ? reevalData : []);
    } catch (err) {
      console.warn('Failed to refresh tab telemetry:', err);
    }
  };

  // Build unified student roster combining Enrollment, Submissions, Scores, and Malpractice Telemetry
  const unifiedStudentRoster = useMemo(() => {
    if (!eligibleStudents || eligibleStudents.length === 0) return [];

    const malStudentMap = new Map();
    if (malpracticeOverview?.students) {
      malpracticeOverview.students.forEach((ms) => {
        const key = ms.studentId?.toString() || ms.student?._id?.toString() || ms.student?.toString();
        if (key) malStudentMap.set(key, ms);
      });
    }

    return eligibleStudents.map((item) => {
      const studentObj = item.student || item;
      const studentIdStr = studentObj._id?.toString();

      // Submissions for this student
      const studentSubs = submissions.filter(
        (s) => (s.student?._id || s.student)?.toString() === studentIdStr
      );
      const latestSub = studentSubs.length > 0 ? studentSubs[0] : null;

      // Automated evaluation
      const studentEvals = evaluations.filter(
        (e) => (e.student?._id || e.student)?.toString() === studentIdStr
      );
      const programScore =
        studentEvals.length > 0 && typeof studentEvals[0].score === 'number'
          ? studentEvals[0].score
          : item.highestAutomatedScore !== undefined
          ? item.highestAutomatedScore
          : null;

      // Viva evaluation
      const matchedViva = vivas.find(
        (v) => (v.student?._id || v.student)?.toString() === studentIdStr
      );
      const vivaScore = matchedViva && typeof matchedViva.marks === 'number' ? matchedViva.marks : null;

      // Total Score out of 15
      const totalScore =
        programScore !== null || vivaScore !== null
          ? Math.round(((programScore || 0) + (vivaScore || 0)) * 100) / 100
          : null;

      let submissionStatus = 'NOT_SUBMITTED';
      if (studentSubs.length > 0) {
        submissionStatus = 'SUBMITTED';
      }

      let evaluationStatus = 'NOT_SUBMITTED';
      if (studentSubs.length > 0) {
        if (vivaScore !== null) {
          evaluationStatus = 'EVALUATED';
        } else {
          evaluationStatus = 'VIVA_PENDING';
        }
      }

      // Malpractice telemetry
      const malTelemetry = malStudentMap.get(studentIdStr) || {
        totalEvents: 0,
        status: 'NORMAL',
        riskScore: 0,
        riskLevel: 'NONE',
        byType: {},
        bySeverity: {},
        latestEvent: null,
        latestEventTimestamp: null
      };

      return {
        student: studentObj,
        studentId: studentIdStr,
        name: studentObj.name,
        rollNumber: studentObj.rollNumber,
        section: studentObj.section,
        submissionStatus,
        evaluationStatus,
        attemptsCount: studentSubs.length,
        studentSubmissions: studentSubs,
        latestSubmission: latestSub,
        programScore,
        vivaScore,
        vivaRemarks: matchedViva?.remarks || '',
        vivaRecord: matchedViva || null,
        totalScore,
        malpracticeStatus: malTelemetry.status || 'NORMAL',
        riskScore: malTelemetry.riskScore || 0,
        riskLevel: malTelemetry.riskLevel || 'NONE',
        malpracticeEventsCount: malTelemetry.totalEvents || 0,
        malpracticeLatestEvent: malTelemetry.latestEvent || null,
        malpracticeLatestTimestamp: malTelemetry.latestEventTimestamp || malTelemetry.latestEvent?.timestamp || null,
        malpracticeByType: malTelemetry.byType || {},
        malpracticeBySeverity: malTelemetry.bySeverity || {}
      };
    });
  }, [eligibleStudents, submissions, evaluations, vivas, malpracticeOverview]);

  // Unique sections list
  const uniqueSections = useMemo(() => {
    const set = new Set();
    unifiedStudentRoster.forEach((s) => {
      if (s.section) set.add(s.section);
    });
    return Array.from(set).sort();
  }, [unifiedStudentRoster]);

  // Filtered & Sorted Roster for Main View
  const filteredMainRoster = useMemo(() => {
    return unifiedStudentRoster
      .filter((row) => {
        if (sectionFilter !== 'ALL' && row.section !== sectionFilter) return false;

        // Submission Status Filter
        if (submissionStatusFilter === 'SUBMITTED' && row.submissionStatus !== 'SUBMITTED') return false;
        if (submissionStatusFilter === 'NOT_SUBMITTED' && row.submissionStatus !== 'NOT_SUBMITTED') return false;
        if (submissionStatusFilter === 'EVALUATED' && row.evaluationStatus !== 'EVALUATED') return false;
        if (submissionStatusFilter === 'VIVA_PENDING' && row.evaluationStatus !== 'VIVA_PENDING') return false;

        // Integrity Status Filter
        if (integrityFilter === 'CLEAN' && row.malpracticeStatus !== 'NORMAL') return false;
        if (integrityFilter === 'ATTENTION' && row.malpracticeStatus !== 'ATTENTION') return false;
        if (integrityFilter === 'REVIEW_REQUIRED' && row.malpracticeStatus !== 'REVIEW_REQUIRED') return false;
        if (integrityFilter === 'CRITICAL' && row.malpracticeStatus !== 'CRITICAL') return false;
        if (integrityFilter === 'FLAGGED' && row.malpracticeStatus === 'NORMAL') return false;

        // Risk Level Filter
        if (riskLevelFilter !== 'ALL' && row.riskLevel !== riskLevelFilter) return false;

        // Search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchName = row.name?.toLowerCase().includes(term);
          const matchRoll = row.rollNumber?.toLowerCase().includes(term);
          if (!matchName && !matchRoll) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'RISK_FIRST') {
          // Critical/Review first, then highest risk score, then incidents
          const getStatusRank = (s) => (s === 'CRITICAL' ? 4 : s === 'REVIEW_REQUIRED' ? 3 : s === 'ATTENTION' ? 2 : 1);
          const rankDiff = getStatusRank(b.malpracticeStatus) - getStatusRank(a.malpracticeStatus);
          if (rankDiff !== 0) return rankDiff;
          const scoreDiff = (b.riskScore || 0) - (a.riskScore || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return (b.malpracticeEventsCount || 0) - (a.malpracticeEventsCount || 0);
        }
        if (sortBy === 'INCIDENTS_DESC') {
          return (b.malpracticeEventsCount || 0) - (a.malpracticeEventsCount || 0);
        }
        if (sortBy === 'SCORE_DESC') {
          return (b.totalScore || 0) - (a.totalScore || 0);
        }
        if (sortBy === 'SCORE_ASC') {
          return (a.totalScore || 0) - (b.totalScore || 0);
        }
        if (sortBy === 'ROLL_ASC') {
          return (a.rollNumber || '').localeCompare(b.rollNumber || '');
        }
        if (sortBy === 'NAME_ASC') {
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });
  }, [unifiedStudentRoster, sectionFilter, submissionStatusFilter, integrityFilter, riskLevelFilter, searchTerm, sortBy]);

  // Open Inspection Modal for Submissions
  const handleOpenInspection = (row) => {
    const matchedEval = evaluations.find(
      (e) => (e.student?._id || e.student)?.toString() === row.studentId
    );
    setInspectingSubmission(row.latestSubmission);
    setInspectingEvaluation(matchedEval || null);
    setInspectingViva(row.vivaRecord || null);
    setVivaInputMarks(row.vivaScore !== null ? row.vivaScore : 3.5);
    setVivaInputRemarks(row.vivaRemarks || '');
    setVivaSaveSuccess('');
    setVivaSaveError('');
  };

  // Open Viva Grade Drawer / Modal
  const handleOpenVivaGrade = (row) => {
    setGradingStudent(row);
    setVivaInputMarks(row.vivaScore !== null ? row.vivaScore : 3.5);
    setVivaInputRemarks(row.vivaRemarks || '');
    setVivaSaveSuccess('');
    setVivaSaveError('');
  };

  // Save Viva Score Handler
  const handleSaveVivaScore = async (e) => {
    if (e) e.preventDefault();
    setSavingViva(true);
    setVivaSaveSuccess('');
    setVivaSaveError('');

    const targetStudentId =
      gradingStudent?.studentId || inspectingSubmission?.student?._id || inspectingSubmission?.student;

    const numMarks = Number(vivaInputMarks);
    if (isNaN(numMarks) || numMarks < 0 || numMarks > 5) {
      setVivaSaveError('Viva marks must be a numeric score between 0.0 and 5.0.');
      setSavingViva(false);
      return;
    }

    try {
      await vivaService.updateViva({
        studentId: targetStudentId,
        experimentId,
        marks: numMarks,
        remarks: vivaInputRemarks
      });
      setVivaSaveSuccess('✓ Viva score updated successfully!');
      await refreshTabData();
      setTimeout(() => {
        setVivaSaveSuccess('');
        if (gradingStudent) setGradingStudent(null);
      }, 1400);
    } catch (err) {
      console.error('Failed to save viva evaluation:', err);
      setVivaSaveError(err.response?.data?.message || 'Failed to save Viva score.');
    } finally {
      setSavingViva(false);
    }
  };

  // Process Re-evaluation Request Handler
  const handleProcessReevaluation = async (e) => {
    e.preventDefault();
    setSubmittingProcess(true);
    setProcessError('');
    setProcessSuccess('');

    if (reevalAction === 'APPROVE') {
      const numMarks = Number(reevalMarks);
      if (isNaN(numMarks) || numMarks < 0 || numMarks > 5) {
        setProcessError('Updated Viva score must be between 0.0 and 5.0.');
        setSubmittingProcess(false);
        return;
      }
    }

    try {
      await reevaluationService.processRequest(processingRequest._id, {
        action: reevalAction,
        reviewRemarks,
        marks: reevalAction === 'APPROVE' ? Number(reevalMarks) : undefined,
        remarks: reevalAction === 'APPROVE' ? reevalRemarks : undefined
      });
      setProcessSuccess(
        `✓ Re-evaluation request ${reevalAction === 'APPROVE' ? 'approved and marks updated' : 'rejected'}.`
      );
      await refreshTabData();
      setTimeout(() => {
        setProcessSuccess('');
        setProcessingRequest(null);
      }, 1400);
    } catch (err) {
      console.error('Failed to process re-evaluation:', err);
      setProcessError(err.response?.data?.message || 'Failed to process request.');
    } finally {
      setSubmittingProcess(false);
    }
  };

  // Open Malpractice Student Investigation Modal
  const handleOpenStudentInvestigation = async (row) => {
    setInvestigatingStudent(row);
    setTimelineLoading(true);
    setTimelineError('');
    setTimelineEvents([]);
    setModalEventTypeFilter('ALL');
    setModalSeverityFilter('ALL');

    try {
      const res = await malpracticeService.getMalpracticeEvents({
        studentId: row.studentId,
        experimentId,
        limit: 100
      });
      const eventsData = res.data?.events || res.events || res.data || res;
      setTimelineEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (err) {
      console.error('Failed to load student malpractice timeline:', err);
      setTimelineError('Failed to load detailed timeline events.');
    } finally {
      setTimelineLoading(false);
    }
  };

  // Filtered Timeline Events inside Investigation Modal
  const filteredTimelineEvents = useMemo(() => {
    return timelineEvents.filter((e) => {
      if (modalEventTypeFilter !== 'ALL' && e.eventType !== modalEventTypeFilter) return false;
      if (modalSeverityFilter !== 'ALL' && e.severity !== modalSeverityFilter) return false;
      return true;
    });
  }, [timelineEvents, modalEventTypeFilter, modalSeverityFilter]);

  const renderIntegrityBadge = (status) => {
    switch (status) {
      case 'CRITICAL':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
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
              gap: '0.3rem',
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
              gap: '0.3rem',
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
              gap: '0.3rem',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              color: '#4ADE80',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            <span>🟢</span> Clean
          </span>
        );
    }
  };

  const getDashboardPath = () => {
    return user?.role === 'ADMIN_HOD' ? `/admin/labs/${labId}` : `/teacher/labs/${labId}`;
  };

  const renderExecutionDetails = (output) => {
    if (!output) {
      return (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          No execution output recorded for this submission.
        </div>
      );
    }

    if (typeof output === 'string') {
      return (
        <pre style={{ margin: 0, padding: '0.75rem', backgroundColor: '#0F172A', color: '#E2E8F0', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-family-mono)', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
          {output}
        </pre>
      );
    }

    const stdout = typeof output.stdout === 'string' ? output.stdout : '';
    const stderr = typeof output.stderr === 'string' ? output.stderr : '';
    const executionTimeMs = typeof output.executionTimeMs === 'number' ? output.executionTimeMs : (output.executionTimeMs || null);
    const exitCode = output.exitCode !== undefined && output.exitCode !== null ? output.exitCode : null;
    const status = typeof output.status === 'string' ? output.status : null;

    const hasStdout = Boolean(stdout && stdout.length > 0);
    const hasStderr = Boolean(stderr && stderr.length > 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status:</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: status === 'SUCCESS' ? 'var(--color-success)' : 'var(--color-error)' }}>
              {status || 'COMPLETED'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
            <span>Exit Code: <strong>{exitCode !== null ? exitCode : '—'}</strong></span>
            <span>Execution Time: <strong>{executionTimeMs !== null ? `${executionTimeMs} ms` : '—'}</strong></span>
          </div>
        </div>

        {hasStdout && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Standard Output (stdout):</div>
            <pre style={{ margin: 0, padding: '0.75rem', backgroundColor: '#0F172A', color: '#E2E8F0', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-family-mono)', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
              {stdout}
            </pre>
          </div>
        )}

        {hasStderr && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-error)', marginBottom: '0.25rem' }}>Error Output (stderr):</div>
            <pre style={{ margin: 0, padding: '0.75rem', backgroundColor: '#0F172A', color: '#F87171', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-family-mono)', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
              {stderr}
            </pre>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Loading Experiment Evaluation Console & Integrity Suite..." />
      </div>
    );
  }

  if (isUnauthorized || error || !experiment || !lab) {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '3rem auto', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
        <h2 style={{ fontSize: '1.375rem', color: 'var(--color-error)', margin: '0 0 0.75rem 0' }}>
          Experiment Access Restricted
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', margin: '0 0 1.5rem 0' }}>
          {error || 'You do not have active authorization to access this laboratory experiment console.'}
        </p>
        <button onClick={() => navigate(getDashboardPath())} className="btn btn-primary">
          &larr; Return to Laboratory
        </button>
      </div>
    );
  }

  // Summary Metrics calculations
  const totalStudentsCount = unifiedStudentRoster.length;
  const submittedCount = unifiedStudentRoster.filter((r) => r.submissionStatus === 'SUBMITTED').length;
  const evaluatedCount = unifiedStudentRoster.filter((r) => r.evaluationStatus === 'EVALUATED').length;

  const cleanStudentsCount = unifiedStudentRoster.filter((r) => r.malpracticeStatus === 'NORMAL').length;
  const attentionStudentsCount = unifiedStudentRoster.filter((r) => r.malpracticeStatus === 'ATTENTION').length;
  const reviewRequiredCount = unifiedStudentRoster.filter((r) => r.malpracticeStatus === 'REVIEW_REQUIRED').length;
  const criticalCount = unifiedStudentRoster.filter((r) => r.malpracticeStatus === 'CRITICAL').length;
  const totalFlaggedCount = attentionStudentsCount + reviewRequiredCount + criticalCount;

  const totalIncidentsCount = malpracticeOverview?.summary?.totalEvents || 0;
  const highSeverityIncidentsCount = malpracticeOverview?.summary?.highSeverityEvents || malpracticeOverview?.summary?.bySeverity?.HIGH || 0;

  // Experiment Integrity Health
  const experimentHealth = malpracticeOverview?.health || {
    score: totalStudentsCount > 0 ? Math.round((cleanStudentsCount / totalStudentsCount) * 100) : 100,
    status: totalFlaggedCount === 0 ? 'EXCELLENT' : reviewRequiredCount + criticalCount > 2 ? 'REVIEW_REQUIRED' : 'GOOD',
    cleanPercentage: totalStudentsCount > 0 ? Math.round((cleanStudentsCount / totalStudentsCount) * 100) : 100
  };

  const validScores = unifiedStudentRoster.map((r) => r.totalScore).filter((s) => s !== null);
  const avgTotalScore =
    validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Top Breadcrumbs & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <Link to={user?.role === 'ADMIN_HOD' ? '/admin/labs' : '/teacher/labs'} style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
            Laboratories
          </Link>
          <span style={{ color: 'var(--color-text-secondary)' }}>/</span>
          <Link to={getDashboardPath()} style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
            {lab.name}
          </Link>
          <span style={{ color: 'var(--color-text-secondary)' }}>/</span>
          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            EXP {experiment.experimentNumber < 10 ? `0${experiment.experimentNumber}` : experiment.experimentNumber}: {experiment.title}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => navigate(getDashboardPath())} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            &larr; Back to Lab Details
          </button>
          <Link
            to={user?.role === 'ADMIN_HOD' ? `/admin/labs/${labId}/malpractice?experimentId=${experimentId}` : `/teacher/labs/${labId}/malpractice?experimentId=${experimentId}`}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem' }}
          >
            📊 Lab Malpractice Dashboard
          </Link>
          <button onClick={refreshTabData} className="btn btn-primary" style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>🔄</span> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 1: EXPERIMENT IDENTITY & INTEGRITY HEALTH BANNER                    */}
      {/* ========================================================================= */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  backgroundColor: 'var(--color-primary-subtle)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                EXPERIMENT {experiment.experimentNumber < 10 ? `0${experiment.experimentNumber}` : experiment.experimentNumber}
              </span>
              <span className="badge badge-success">● {experiment.status}</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                {experiment.programmingLanguages?.join(' • ')}
              </span>
            </div>

            <h1 style={{ fontSize: '1.625rem', color: 'var(--color-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              {experiment.title}
            </h1>

            {experiment.objective && (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: '0.4rem 0 0 0', maxWidth: '850px', lineHeight: 1.5 }}>
                {experiment.objective}
              </p>
            )}
          </div>

          {/* Experiment Integrity Health Score Meter */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              minWidth: '260px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Experiment Integrity Health
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  backgroundColor:
                    experimentHealth.score >= 90
                      ? 'rgba(34, 197, 94, 0.15)'
                      : experimentHealth.score >= 75
                      ? 'rgba(234, 179, 8, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  color:
                    experimentHealth.score >= 90
                      ? '#4ADE80'
                      : experimentHealth.score >= 75
                      ? '#FACC15'
                      : '#F87171'
                }}
              >
                {experimentHealth.status}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-primary)' }}>
                {experimentHealth.score}%
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                ({cleanStudentsCount}/{totalStudentsCount} students clean)
              </span>
            </div>

            {/* Health Bar */}
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-surface)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${experimentHealth.score}%`,
                  height: '100%',
                  backgroundColor:
                    experimentHealth.score >= 90
                      ? '#22C55E'
                      : experimentHealth.score >= 75
                      ? '#EAB308'
                      : '#EF4444',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        </div>

        {/* LEVEL 2: DECISION-ORIENTED EXPERIMENT KPIS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.75rem' }}>
          {/* Enrolled */}
          <div style={{ padding: '0.75rem 0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Enrolled</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.15rem' }}>{totalStudentsCount}</div>
          </div>

          {/* Submissions */}
          <div style={{ padding: '0.75rem 0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Submissions</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38BDF8', marginTop: '0.15rem' }}>
              {submittedCount} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>({totalStudentsCount > 0 ? Math.round((submittedCount / totalStudentsCount) * 100) : 0}%)</span>
            </div>
          </div>

          {/* Evaluated */}
          <div style={{ padding: '0.75rem 0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Evaluated</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ADE80', marginTop: '0.15rem' }}>
              {evaluatedCount} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>({totalStudentsCount > 0 ? Math.round((evaluatedCount / totalStudentsCount) * 100) : 0}%)</span>
            </div>
          </div>

          {/* Clean Students */}
          <div style={{ padding: '0.75rem 0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.6875rem', color: '#4ADE80', fontWeight: 700, textTransform: 'uppercase' }}>Clean Students</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ADE80', marginTop: '0.15rem' }}>
              {cleanStudentsCount}
            </div>
          </div>

          {/* Review Required / Critical */}
          <div
            style={{
              padding: '0.75rem 0.875rem',
              backgroundColor: reviewRequiredCount + criticalCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-canvas)',
              borderRadius: 'var(--radius-md)',
              border: reviewRequiredCount + criticalCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--color-border)'
            }}
          >
            <div style={{ fontSize: '0.6875rem', color: reviewRequiredCount + criticalCount > 0 ? '#F87171' : 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Flagged Review
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: reviewRequiredCount + criticalCount > 0 ? '#F87171' : 'var(--color-text-muted)', marginTop: '0.15rem' }}>
              {reviewRequiredCount + criticalCount}
            </div>
          </div>

          {/* Total Incidents */}
          <div style={{ padding: '0.75rem 0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Incidents</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: totalIncidentsCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)', marginTop: '0.15rem' }}>
              {totalIncidentsCount}
            </div>
          </div>

          {/* High Severity */}
          <div style={{ padding: '0.75rem 0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>High Severity</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: highSeverityIncidentsCount > 0 ? '#F87171' : 'var(--color-text-muted)', marginTop: '0.15rem' }}>
              {highSeverityIncidentsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Experiment Console Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.125rem' }}>
        <button
          onClick={() => handleTabChange('submissions')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'submissions' ? '3px solid var(--color-primary)' : '3px solid transparent',
            backgroundColor: activeTab === 'submissions' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'submissions' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'submissions' ? 700 : 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>📋</span> Unified Student Evaluation &amp; Integrity Matrix
          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--color-canvas)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
            {totalStudentsCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('analytics')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '3px solid var(--color-primary)' : '3px solid transparent',
            backgroundColor: activeTab === 'analytics' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'analytics' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'analytics' ? 700 : 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>📊</span> Experiment Integrity Analytics
          {totalIncidentsCount > 0 && (
            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)', borderRadius: '1rem', fontWeight: 700 }}>
              {totalIncidentsCount} events
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('viva')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'viva' ? '3px solid var(--color-primary)' : '3px solid transparent',
            backgroundColor: activeTab === 'viva' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'viva' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'viva' ? 700 : 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>🎙️</span> Viva Voce &amp; Appeals
          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--color-canvas)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
            {evaluatedCount}/{totalStudentsCount}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UNIFIED EVALUATION & INTEGRITY MATRIX                              */}
      {/* ========================================================================= */}
      {activeTab === 'submissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Unified Filter & Sort Bar */}
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.875rem'
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: '1 1 340px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Search name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: '1 1 200px', maxWidth: '300px', fontSize: '0.8125rem' }}
              />

              {/* Section Filter */}
              {uniqueSections.length > 1 && (
                <select
                  className="input"
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  style={{ width: '130px', fontSize: '0.8125rem' }}
                >
                  <option value="ALL">All Sections</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              )}

              {/* Submission Status Filter */}
              <select
                className="input"
                value={submissionStatusFilter}
                onChange={(e) => setSubmissionStatusFilter(e.target.value)}
                style={{ width: '150px', fontSize: '0.8125rem' }}
              >
                <option value="ALL">All Submissions</option>
                <option value="SUBMITTED">Submitted Only</option>
                <option value="NOT_SUBMITTED">Not Submitted</option>
                <option value="EVALUATED">Fully Evaluated</option>
                <option value="VIVA_PENDING">Viva Pending</option>
              </select>

              {/* Integrity Status Filter */}
              <select
                className="input"
                value={integrityFilter}
                onChange={(e) => setIntegrityFilter(e.target.value)}
                style={{ width: '160px', fontSize: '0.8125rem', fontWeight: 600 }}
              >
                <option value="ALL">All Integrity States</option>
                <option value="CLEAN">🟢 Clean Only (0 Events)</option>
                <option value="FLAGGED">⚠️ Flagged (Attention/Review)</option>
                <option value="ATTENTION">🟡 Attention Required</option>
                <option value="REVIEW_REQUIRED">🟠 Review Required</option>
                <option value="CRITICAL">🔴 Critical Only</option>
              </select>

              {/* Sort By Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Sort:</span>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ width: '160px', fontSize: '0.8125rem', fontWeight: 600 }}
                >
                  <option value="RISK_FIRST">Review Status First</option>
                  <option value="INCIDENTS_DESC">Highest Incidents</option>
                  <option value="SCORE_DESC">Highest Total Score</option>
                  <option value="SCORE_ASC">Lowest Total Score</option>
                  <option value="ROLL_ASC">Roll Number (A-Z)</option>
                  <option value="NAME_ASC">Student Name (A-Z)</option>
                </select>
              </div>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Showing <strong>{filteredMainRoster.length}</strong> of {totalStudentsCount} students
            </div>
          </div>

          {/* Clean State Banner if 0 incidents across experiment */}
          {totalIncidentsCount === 0 && (
            <div
              style={{
                padding: '0.875rem 1.25rem',
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.8125rem',
                color: '#166534'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <div>
                <strong>Clean Academic Record:</strong> All {totalStudentsCount} students currently have zero recorded integrity incidents during this experiment.
              </div>
            </div>
          )}

          {/* Main Integrated Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--color-surface-hover)',
                      borderBottom: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    <th style={{ padding: '0.875rem 1rem' }}>Student Details</th>
                    <th style={{ padding: '0.875rem 0.75rem' }}>Sec</th>
                    <th style={{ padding: '0.875rem 0.75rem' }}>Submission</th>
                    <th style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>Auto / 10</th>
                    <th style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>Viva / 5</th>
                    <th style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>Total / 15</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Integrity Status &amp; Risk</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Incident Telemetry</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMainRoster.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                        <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>No students match active filters</h4>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem' }}>Try clearing filters or search terms.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMainRoster.map((row) => {
                      const isFlagged = row.malpracticeStatus === 'REVIEW_REQUIRED' || row.malpracticeStatus === 'CRITICAL';
                      return (
                        <tr
                          key={row.studentId}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            backgroundColor: isFlagged ? 'rgba(249, 115, 22, 0.03)' : 'transparent',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          {/* Student Info */}
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <strong style={{ color: 'var(--color-text-primary)', display: 'block', fontSize: '0.875rem' }}>
                              {row.name}
                            </strong>
                            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {row.rollNumber}
                            </span>
                          </td>

                          {/* Section */}
                          <td style={{ padding: '0.875rem 0.75rem' }}>
                            <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', fontSize: '0.75rem' }}>
                              {row.section || '—'}
                            </span>
                          </td>

                          {/* Submission Status */}
                          <td style={{ padding: '0.875rem 0.75rem' }}>
                            {row.submissionStatus === 'SUBMITTED' ? (
                              <div>
                                <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                                  ✓ Att #{row.attemptsCount}
                                </span>
                                {row.latestSubmission?.submittedAt && (
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                                    {new Date(row.latestSubmission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                Unattempted
                              </span>
                            )}
                          </td>

                          {/* Program Score */}
                          <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                            {row.programScore !== null ? (
                              <strong style={{ color: 'var(--color-primary)' }}>{row.programScore.toFixed(1)}</strong>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* Viva Score */}
                          <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                            {row.vivaScore !== null ? (
                              <strong style={{ color: '#16a34a' }}>{row.vivaScore.toFixed(1)}</strong>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* Total Score */}
                          <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                            {row.totalScore !== null ? (
                              <span style={{ fontWeight: 800, color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-subtle)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                                {row.totalScore.toFixed(1)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* Integrity Status & Risk Score */}
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {renderIntegrityBadge(row.malpracticeStatus)}
                              {row.riskScore > 0 && (
                                <span
                                  title="Explainable Risk Score (0-100)"
                                  style={{
                                    fontFamily: 'var(--font-family-mono)',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    color: row.riskScore >= 70 ? '#F87171' : row.riskScore >= 30 ? '#FB923C' : '#94A3B8'
                                  }}
                                >
                                  Risk: {row.riskScore}/100
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Incident Telemetry Tags */}
                          <td style={{ padding: '0.875rem 1rem' }}>
                            {row.malpracticeEventsCount > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                  {Object.entries(row.malpracticeByType).map(([type, count]) => {
                                    const cfg = EVENT_CONFIG[type] || { label: type, icon: '⚠️' };
                                    return (
                                      <span
                                        key={type}
                                        title={`${count} ${cfg.label}`}
                                        style={{
                                          fontSize: '0.6875rem',
                                          padding: '0.1rem 0.35rem',
                                          backgroundColor: 'var(--color-surface)',
                                          border: '1px solid var(--color-border)',
                                          borderRadius: '3px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.2rem'
                                        }}
                                      >
                                        <span>{cfg.icon}</span>
                                        <strong>{count}</strong>
                                      </span>
                                    );
                                  })}
                                </div>
                                {row.malpracticeLatestTimestamp && (
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                                    Last: {new Date(row.malpracticeLatestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>0 incidents</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              {row.malpracticeEventsCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStudentInvestigation(row)}
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderColor: isFlagged ? 'rgba(249, 115, 22, 0.4)' : 'var(--color-border)' }}
                                  title="Inspect complete incident timeline and details"
                                >
                                  🛡️ Inspect
                                </button>
                              )}

                              {row.submissionStatus === 'SUBMITTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInspection(row)}
                                  className="btn btn-primary"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                                >
                                  🔍 Code
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenVivaGrade(row)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                              >
                                🎙️ Viva
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXPERIMENT INTEGRITY ANALYTICS                                     */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Analytics Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Event Category Distribution */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                Incident Category Breakdown
              </div>
              {Object.keys(malpracticeOverview?.summary?.byType || {}).length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                  No infractions recorded during this experiment.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.entries(malpracticeOverview.summary.byType).map(([type, count]) => {
                    const cfg = EVENT_CONFIG[type] || { label: type, icon: '⚠️' };
                    const pct = totalIncidentsCount > 0 ? Math.round((count / totalIncidentsCount) * 100) : 0;
                    return (
                      <div key={type} style={{ fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                            <span>{cfg.icon}</span> {cfg.label}
                          </span>
                          <span><strong>{count}</strong> ({pct}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--color-canvas)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--color-primary)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Severity Distribution */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                Severity Distribution
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 700 }}>LOW</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
                    {malpracticeOverview?.summary?.bySeverity?.LOW || 0}
                  </div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#FB923C', fontWeight: 700 }}>MEDIUM</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FB923C', marginTop: '0.2rem' }}>
                    {malpracticeOverview?.summary?.bySeverity?.MEDIUM || 0}
                  </div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#F87171', fontWeight: 700 }}>HIGH</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F87171', marginTop: '0.2rem' }}>
                    {malpracticeOverview?.summary?.bySeverity?.HIGH || 0}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                <strong>Normalized Metrics:</strong><br />
                &bull; Incidents per 10 Students: <strong>{malpracticeOverview?.summary?.incidentsPer10Students || 0}</strong><br />
                &bull; Cohort Infraction Rate: <strong>{malpracticeOverview?.summary?.studentsAffectedPercentage || 0}%</strong>
              </div>
            </div>

            {/* Integrity Status Roster Summary */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                Student Integrity Risk Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', backgroundColor: 'rgba(34, 197, 94, 0.08)', borderRadius: '4px' }}>
                  <span>🟢 Clean (0 incidents)</span>
                  <strong>{cleanStudentsCount} students</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', backgroundColor: 'rgba(234, 179, 8, 0.08)', borderRadius: '4px' }}>
                  <span>🟡 Attention Required (1-2 events)</span>
                  <strong>{attentionStudentsCount} students</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', backgroundColor: 'rgba(249, 115, 22, 0.08)', borderRadius: '4px' }}>
                  <span>🟠 Review Required (&ge;3 events)</span>
                  <strong>{reviewRequiredCount} students</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '4px' }}>
                  <span>🔴 Critical (&ge;8 events or High Severity)</span>
                  <strong>{criticalCount} students</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VIVA VOCE EVALUATION & APPEALS                                     */}
      {/* ========================================================================= */}
      {activeTab === 'viva' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setVivaSubTab('evaluation')}
                className={vivaSubTab === 'evaluation' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: '0.8125rem' }}
              >
                🎙️ Viva Oral Defense Ledger
              </button>
              <button
                onClick={() => setVivaSubTab('reevaluations')}
                className={vivaSubTab === 'reevaluations' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                🔄 Re-evaluation Requests
                {reevalRequests.filter((r) => r.status === 'PENDING').length > 0 && (
                  <span style={{ backgroundColor: 'var(--color-error)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700 }}>
                    {reevalRequests.filter((r) => r.status === 'PENDING').length}
                  </span>
                )}
              </button>
            </div>

            <button onClick={refreshTabData} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
              🔄 Refresh Viva Records
            </button>
          </div>

          {vivaSubTab === 'evaluation' ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Student</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Section</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Program / 10</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Viva / 5</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Total / 15</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Viva Status</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Remarks</th>
                      <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unifiedStudentRoster.map((row) => (
                      <tr key={row.studentId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.875rem 1.25rem' }}>
                          <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>{row.name}</strong>
                          <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {row.rollNumber}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                            {row.section || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          {row.programScore !== null ? <strong>{row.programScore.toFixed(1)}</strong> : '—'}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          {row.vivaScore !== null ? <strong style={{ color: '#16a34a' }}>{row.vivaScore.toFixed(1)}</strong> : '—'}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          {row.totalScore !== null ? (
                            <span style={{ fontWeight: 800, color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-subtle)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              {row.totalScore.toFixed(1)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          {row.vivaScore !== null ? <span className="badge badge-success">✓ EVALUATED</span> : <span className="badge badge-warning">⏳ PENDING</span>}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', maxWidth: '200px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.vivaRemarks || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenVivaGrade(row)}
                            className={row.vivaScore !== null ? 'btn btn-secondary' : 'btn btn-primary'}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                          >
                            {row.vivaScore !== null ? '✏️ Edit' : '🎙️ Grade'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Re-evaluations Requests Table */
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Student</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Original Score</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Reason for Appeal</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Submitted At</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reevalRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          No formal re-evaluation requests submitted for this experiment.
                        </td>
                      </tr>
                    ) : (
                      reevalRequests.map((req) => (
                        <tr key={req._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>{req.student?.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{req.student?.rollNumber}</span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{req.originalMarks?.toFixed(1) || '—'} / 5.0</span>
                          </td>
                          <td style={{ padding: '1rem', maxWidth: '300px' }}>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{req.reason}</span>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {req.status === 'PENDING' && <span className="badge badge-warning">⏳ PENDING</span>}
                            {req.status === 'APPROVED' && <span className="badge badge-success">✓ APPROVED</span>}
                            {req.status === 'REJECTED' && <span className="badge badge-error">✕ REJECTED</span>}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            {req.status === 'PENDING' ? (
                              <button
                                onClick={() => {
                                  setProcessingRequest(req);
                                  setReevalAction('APPROVE');
                                  setReevalMarks(req.originalMarks || 4.0);
                                  setReevalRemarks('');
                                  setReviewRemarks('');
                                  setProcessError('');
                                  setProcessSuccess('');
                                }}
                                className="btn btn-primary"
                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                              >
                                ⚖️ Process Appeal
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Completed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SUBMISSION INSPECTION & EVALUATION                               */}
      {/* ========================================================================= */}
      {inspectingSubmission && (
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
            padding: '1.5rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '960px',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              padding: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '0.35rem' }}>
                  SUBMISSION INSPECTION
                </span>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
                  {inspectingSubmission.student?.name} ({inspectingSubmission.student?.rollNumber})
                </h2>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                  Submitted: {new Date(inspectingSubmission.submittedAt).toLocaleString()} &bull; Language: <strong>{inspectingSubmission.language}</strong>
                </div>
              </div>
              <button onClick={() => setInspectingSubmission(null)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem' }}>
                ✕ Close
              </button>
            </div>

            {/* Test Results & Program Score Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>AUTOMATED PROGRAM SCORE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                  {inspectingEvaluation?.score !== undefined ? inspectingEvaluation.score.toFixed(1) : '—'} <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>/ 10.0</span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>VIVA ORAL SCORE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
                  {inspectingViva?.marks !== undefined ? inspectingViva.marks.toFixed(1) : '—'} <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>/ 5.0</span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>ACADEMIC TOTAL SCORE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                  {inspectingEvaluation?.score !== undefined || inspectingViva?.marks !== undefined
                    ? ((inspectingEvaluation?.score || 0) + (inspectingViva?.marks || 0)).toFixed(1)
                    : '—'}{' '}
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>/ 15.0</span>
                </div>
              </div>
            </div>

            {/* Submitted Source Code Viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Submitted Source Code:</div>
              <div style={{ height: '240px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <CodeEditor
                  value={inspectingSubmission.sourceCode || '// No code submitted'}
                  language={inspectingSubmission.language?.toLowerCase() || 'c'}
                  readOnly={true}
                />
              </div>
            </div>

            {/* Execution Output & Diagnostics Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Execution Output &amp; Diagnostics:
              </div>
              {renderExecutionDetails(inspectingSubmission?.executionOutput)}
            </div>

            {/* Inline Viva Evaluation Section */}
            <div
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem'
              }}
            >
              <h3 style={{ fontSize: '1rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎙️</span> Viva Score &amp; Oral Defense Assessment
              </h3>

              {vivaSaveSuccess && <div className="badge badge-success" style={{ padding: '0.5rem 0.75rem' }}>{vivaSaveSuccess}</div>}
              {vivaSaveError && <div className="badge badge-error" style={{ padding: '0.5rem 0.75rem' }}>{vivaSaveError}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Viva Marks (0.0 to 5.0):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    className="input"
                    value={vivaInputMarks}
                    onChange={(e) => setVivaInputMarks(e.target.value)}
                    style={{ width: '100%', fontSize: '1.125rem', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Live Score Calculation:
                  </label>
                  <div style={{ padding: '0.625rem 0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
                    Program: <strong>{inspectingEvaluation?.score ? inspectingEvaluation.score.toFixed(1) : '0.0'} / 10</strong> + Viva: <strong>{Number(vivaInputMarks || 0).toFixed(1)} / 5</strong> = Total:{' '}
                    <strong style={{ color: 'var(--color-success)' }}>{((inspectingEvaluation?.score || 0) + Number(vivaInputMarks || 0)).toFixed(1)} / 15</strong>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Oral Defense Remarks:
                </label>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="Enter specific comments on algorithmic understanding, approach, complexity analysis..."
                  value={vivaInputRemarks}
                  onChange={(e) => setVivaInputRemarks(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleSaveVivaScore}
                  disabled={savingViva}
                  className="btn btn-primary"
                  style={{ minWidth: '150px' }}
                >
                  {savingViva ? 'Saving Viva Score...' : '💾 Save Viva Evaluation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DEDICATED VIVA GRADING MODAL                                     */}
      {/* ========================================================================= */}
      {gradingStudent && (
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
            padding: '1.5rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              padding: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎙️</span> {gradingStudent.vivaScore !== null ? 'Edit Viva Evaluation' : 'Grade Viva Oral Defense'}
              </h2>
              <button onClick={() => setGradingStudent(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.65rem' }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{gradingStudent.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                Roll No: {gradingStudent.rollNumber} &bull; Section: {gradingStudent.section}
              </div>
            </div>

            {vivaSaveSuccess && <div className="badge badge-success" style={{ padding: '0.5rem 0.75rem' }}>{vivaSaveSuccess}</div>}
            {vivaSaveError && <div className="badge badge-error" style={{ padding: '0.5rem 0.75rem' }}>{vivaSaveError}</div>}

            <form onSubmit={handleSaveVivaScore} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Viva Marks (0.0 to 5.0):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  className="input"
                  value={vivaInputMarks}
                  onChange={(e) => setVivaInputMarks(e.target.value)}
                  style={{ width: '100%', fontSize: '1.25rem', fontWeight: 800 }}
                  required
                />
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>FINAL SCORE PREVIEW:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Program: <strong>{gradingStudent.programScore !== null ? gradingStudent.programScore.toFixed(1) : '0.0'} / 10</strong></span>
                  <span>+</span>
                  <span>Viva: <strong>{Number(vivaInputMarks || 0).toFixed(1)} / 5</strong></span>
                  <span>=</span>
                  <span style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '1.125rem' }}>
                    {((gradingStudent.programScore || 0) + Number(vivaInputMarks || 0)).toFixed(1)} / 15
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Evaluation Remarks:
                </label>
                <textarea
                  className="input"
                  rows="3"
                  placeholder="Enter feedback regarding understanding of code structure, edge cases, theoretical concepts..."
                  value={vivaInputRemarks}
                  onChange={(e) => setVivaInputRemarks(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setGradingStudent(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingViva} className="btn btn-primary" style={{ minWidth: '140px' }}>
                  {savingViva ? 'Saving...' : '💾 Save Viva Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: STUDENT INTEGRITY INVESTIGATION & TIMELINE                       */}
      {/* ========================================================================= */}
      {investigatingStudent && (
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
            padding: '1.5rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '860px',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              padding: '1.75rem'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
                    Student Integrity Investigation &bull; {investigatingStudent.name}
                  </h2>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Roll Number: <strong style={{ fontFamily: 'var(--font-family-mono)' }}>{investigatingStudent.rollNumber}</strong> &bull; Section: <strong>{investigatingStudent.section}</strong> &bull; Experiment: <strong>{experiment.title}</strong>
                </div>
              </div>
              <button onClick={() => setInvestigatingStudent(null)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem' }}>
                ✕ Close
              </button>
            </div>

            {/* Student Risk Score & Status Summary Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.875rem',
                padding: '1rem',
                backgroundColor: 'var(--color-surface-hover)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)'
              }}
            >
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Explainable Risk Score
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: investigatingStudent.riskScore >= 70 ? '#F87171' : investigatingStudent.riskScore >= 30 ? '#FB923C' : '#4ADE80', marginTop: '0.2rem' }}>
                  {investigatingStudent.riskScore} <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>/ 100</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Integrity Status
                </div>
                <div style={{ marginTop: '0.3rem' }}>
                  {renderIntegrityBadge(investigatingStudent.malpracticeStatus)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Academic Total Score
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                  {investigatingStudent.totalScore !== null ? `${investigatingStudent.totalScore} / 15` : 'Not Evaluated'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Official Submissions
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-info)', marginTop: '0.2rem' }}>
                  {investigatingStudent.attemptsCount} attempt{investigatingStudent.attemptsCount > 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Submissions & Incidents Correlation Box */}
            {investigatingStudent.studentSubmissions?.length > 0 && (
              <div style={{ padding: '0.875rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.8125rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
                  Submission Milestones Correlation
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {investigatingStudent.studentSubmissions.map((sub) => (
                    <div key={sub._id} style={{ padding: '0.4rem 0.65rem', backgroundColor: 'var(--color-surface)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                      <strong>Attempt #{sub.attemptNumber}</strong> ({sub.language}) &bull; {new Date(sub.submittedAt).toLocaleTimeString()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Filter Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Filters:</span>
              <select
                className="input"
                value={modalEventTypeFilter}
                onChange={(e) => setModalEventTypeFilter(e.target.value)}
                style={{ fontSize: '0.8125rem', width: '180px' }}
              >
                <option value="ALL">All Event Types</option>
                {Object.keys(EVENT_CONFIG).map((k) => (
                  <option key={k} value={k}>
                    {EVENT_CONFIG[k].label}
                  </option>
                ))}
              </select>

              <select
                className="input"
                value={modalSeverityFilter}
                onChange={(e) => setModalSeverityFilter(e.target.value)}
                style={{ fontSize: '0.8125rem', width: '150px' }}
              >
                <option value="ALL">All Severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Timeline Body */}
            {timelineLoading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                <LoadingSpinner size={32} text="Loading student experiment activity timeline..." />
              </div>
            ) : timelineError ? (
              <div className="badge badge-error" style={{ padding: '1rem', textAlign: 'center' }}>
                {timelineError}
              </div>
            ) : filteredTimelineEvents.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
                <h4 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Clean Academic Record</h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  No malpractice events recorded for this student during this experiment session.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredTimelineEvents.map((evt, idx) => {
                  const cfg = EVENT_CONFIG[evt.eventType] || { label: evt.eventType, icon: '⚠️', description: 'Malpractice action detected' };
                  const isHigh = evt.severity === 'HIGH';
                  return (
                    <div
                      key={evt._id || idx}
                      style={{
                        padding: '0.875rem 1rem',
                        backgroundColor: 'var(--color-canvas)',
                        border: `1px solid ${isHigh ? 'rgba(239, 68, 68, 0.4)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ fontSize: '1.5rem' }}>{cfg.icon}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                              {cfg.label}
                            </strong>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.4rem',
                                borderRadius: '3px',
                                backgroundColor: isHigh ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.15)',
                                color: isHigh ? '#F87171' : '#FB923C'
                              }}
                            >
                              {evt.severity}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                            {cfg.description}
                          </div>
                          {evt.details && Object.keys(evt.details).length > 0 && (
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                              {evt.details.language ? `Language: ${evt.details.language} ` : ''}
                              {evt.details.codeLength ? `• Code Length: ${evt.details.codeLength} chars ` : ''}
                              {evt.details.visibilityState ? `• State: ${evt.details.visibilityState}` : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-secondary)', minWidth: '110px' }}>
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RE-EVALUATION APPEAL PROCESSING                                  */}
      {/* ========================================================================= */}
      {processingRequest && (
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
            padding: '1.5rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              padding: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚖️</span> Process Re-evaluation Appeal
              </h2>
              <button onClick={() => setProcessingRequest(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.65rem' }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
              <div><strong>Student:</strong> {processingRequest.student?.name} ({processingRequest.student?.rollNumber})</div>
              <div style={{ marginTop: '0.25rem' }}><strong>Original Score:</strong> {processingRequest.originalMarks?.toFixed(1) || '—'} / 5.0</div>
              <div style={{ marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}><strong>Reason:</strong> {processingRequest.reason}</div>
            </div>

            {processSuccess && <div className="badge badge-success" style={{ padding: '0.5rem 0.75rem' }}>{processSuccess}</div>}
            {processError && <div className="badge badge-error" style={{ padding: '0.5rem 0.75rem' }}>{processError}</div>}

            <form onSubmit={handleProcessReevaluation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Decision Action:
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="radio"
                      name="action"
                      value="APPROVE"
                      checked={reevalAction === 'APPROVE'}
                      onChange={() => setReevalAction('APPROVE')}
                    />
                    Approve &amp; Update Viva Marks
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="radio"
                      name="action"
                      value="REJECT"
                      checked={reevalAction === 'REJECT'}
                      onChange={() => setReevalAction('REJECT')}
                    />
                    Reject Appeal
                  </label>
                </div>
              </div>

              {reevalAction === 'APPROVE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    New Viva Marks (0.0 to 5.0):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    className="input"
                    value={reevalMarks}
                    onChange={(e) => setReevalMarks(e.target.value)}
                    style={{ width: '100%', fontSize: '1.125rem', fontWeight: 700 }}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Faculty Review Remarks:
                </label>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="Enter justification for appeal approval/rejection..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setProcessingRequest(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submittingProcess} className="btn btn-primary">
                  {submittingProcess ? 'Processing...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherExperimentConsolePage;
