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
  COPY_ATTEMPT: { label: 'Copy Attempt', icon: '📋', description: 'Copying code from editor was blocked.' },
  PASTE_ATTEMPT: { label: 'Paste Attempt', icon: '📄', description: 'Pasting code into editor was blocked.' },
  CUT_ATTEMPT: { label: 'Cut Attempt', icon: '✂️', description: 'Cutting code from editor was blocked.' },
  CONTEXT_MENU_ATTEMPT: { label: 'Context Menu Attempt', icon: '🖱️', description: 'Right-click context menu was triggered.' },
  DRAG_DROP_ATTEMPT: { label: 'Drag & Drop Attempt', icon: '📥', description: 'Drag-and-drop into editor was blocked.' },
  TAB_SWITCH: { label: 'Tab Switch', icon: '🗂️', description: 'Navigated away from active tab.' },
  WINDOW_BLUR: { label: 'Window Focus Lost', icon: '🪟', description: 'Editor window lost application focus.' },
  FULLSCREEN_EXIT: { label: 'Fullscreen Exit', icon: '⛶', description: 'Exited fullscreen examination mode.' },
  CAMERA_DISABLED: { label: 'Camera Disabled', icon: '📷', description: 'Camera stream disconnected.' },
  FACE_NOT_DETECTED: { label: 'Face Not Detected', icon: '👤', description: 'Face not detected in frame.' },
  MULTIPLE_FACES_DETECTED: { label: 'Multiple Faces', icon: '👥', description: 'Multiple individuals in frame.' }
};

const TeacherExperimentConsolePage = () => {
  const { labId, experimentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'submissions';

  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'submissions' | 'malpractice' | 'viva'
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
  const [malpracticeLoading, setMalpracticeLoading] = useState(false);

  // Viva Sub-Tab & Re-evaluations State
  const [vivaSubTab, setVivaSubTab] = useState('evaluation'); // 'evaluation' | 'reevaluations'
  const [reevalRequests, setReevalRequests] = useState([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [malpracticeStatusFilter, setMalpracticeStatusFilter] = useState('ALL');

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

  // Student Malpractice Timeline Modal State
  const [timelineStudent, setTimelineStudent] = useState(null);
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

  // Build unified student roster combining Enrollment, Submissions, Program Score, Viva Score, and Malpractice Status
  const unifiedStudentRoster = useMemo(() => {
    if (!eligibleStudents || eligibleStudents.length === 0) return [];

    const malStudentMap = new Map();
    if (malpracticeOverview?.students) {
      malpracticeOverview.students.forEach((ms) => {
        malStudentMap.set(ms.student?._id?.toString() || ms.student?.toString(), ms);
      });
    }

    return eligibleStudents.map((item) => {
      const studentObj = item.student || item;
      const studentIdStr = studentObj._id?.toString();

      // Find latest submission for this student and experiment
      const studentSubs = submissions.filter(
        (s) => (s.student?._id || s.student)?.toString() === studentIdStr
      );
      const latestSub = studentSubs.length > 0 ? studentSubs[0] : null;

      // Find highest automated evaluation score
      const studentEvals = evaluations.filter(
        (e) => (e.student?._id || e.student)?.toString() === studentIdStr
      );
      const programScore = studentEvals.length > 0 && typeof studentEvals[0].score === 'number'
        ? studentEvals[0].score
        : item.highestAutomatedScore !== undefined
        ? item.highestAutomatedScore
        : null;

      // Find current viva evaluation
      const matchedViva = vivas.find(
        (v) => (v.student?._id || v.student)?.toString() === studentIdStr
      );
      const vivaScore = matchedViva && typeof matchedViva.marks === 'number' ? matchedViva.marks : null;

      // Total Score out of 15
      const totalScore = programScore !== null || vivaScore !== null
        ? Math.round(((programScore || 0) + (vivaScore || 0)) * 100) / 100
        : null;

      // Determine Submission & Evaluation Status
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
        byType: {},
        latestEvent: null
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
        latestSubmission: latestSub,
        programScore,
        vivaScore,
        vivaRemarks: matchedViva?.remarks || '',
        vivaRecord: matchedViva || null,
        totalScore,
        malpracticeStatus: malTelemetry.status || 'NORMAL',
        malpracticeEventsCount: malTelemetry.totalEvents || 0,
        malpracticeLatestEvent: malTelemetry.latestEvent || null,
        malpracticeByType: malTelemetry.byType || {}
      };
    });
  }, [eligibleStudents, submissions, evaluations, vivas, malpracticeOverview]);

  // Unique sections list for cohort filter
  const uniqueSections = useMemo(() => {
    const set = new Set();
    unifiedStudentRoster.forEach((s) => {
      if (s.section) set.add(s.section);
    });
    return Array.from(set).sort();
  }, [unifiedStudentRoster]);

  // Filtered Roster for Submissions & Cohort Tab
  const filteredSubmissionsRoster = useMemo(() => {
    return unifiedStudentRoster.filter((row) => {
      if (sectionFilter !== 'ALL' && row.section !== sectionFilter) return false;
      if (statusFilter === 'SUBMITTED' && row.submissionStatus !== 'SUBMITTED') return false;
      if (statusFilter === 'NOT_SUBMITTED' && row.submissionStatus !== 'NOT_SUBMITTED') return false;
      if (statusFilter === 'EVALUATED' && row.evaluationStatus !== 'EVALUATED') return false;
      if (statusFilter === 'VIVA_PENDING' && row.evaluationStatus !== 'VIVA_PENDING') return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = row.name?.toLowerCase().includes(term);
        const matchRoll = row.rollNumber?.toLowerCase().includes(term);
        return matchName || matchRoll;
      }
      return true;
    });
  }, [unifiedStudentRoster, sectionFilter, statusFilter, searchTerm]);

  // Filtered Roster for Malpractice Tab
  const filteredMalpracticeRoster = useMemo(() => {
    return unifiedStudentRoster.filter((row) => {
      if (sectionFilter !== 'ALL' && row.section !== sectionFilter) return false;
      if (malpracticeStatusFilter !== 'ALL' && row.malpracticeStatus !== malpracticeStatusFilter) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = row.name?.toLowerCase().includes(term);
        const matchRoll = row.rollNumber?.toLowerCase().includes(term);
        return matchName || matchRoll;
      }
      return true;
    });
  }, [unifiedStudentRoster, sectionFilter, malpracticeStatusFilter, searchTerm]);

  // Filtered Roster for Viva Tab
  const filteredVivaRoster = useMemo(() => {
    return unifiedStudentRoster.filter((row) => {
      if (sectionFilter !== 'ALL' && row.section !== sectionFilter) return false;
      if (statusFilter === 'EVALUATED' && row.vivaScore === null) return false;
      if (statusFilter === 'PENDING' && row.vivaScore !== null) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = row.name?.toLowerCase().includes(term);
        const matchRoll = row.rollNumber?.toLowerCase().includes(term);
        return matchName || matchRoll;
      }
      return true;
    });
  }, [unifiedStudentRoster, sectionFilter, statusFilter, searchTerm]);

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

    const targetStudentId = gradingStudent?.studentId || inspectingSubmission?.student?._id || inspectingSubmission?.student;

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
      }, 1500);
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
      setProcessSuccess(`✓ Re-evaluation request ${reevalAction === 'APPROVE' ? 'approved and marks updated' : 'rejected'}.`);
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

  // Open Malpractice Student Timeline Modal (Experiment-Scoped)
  const handleOpenStudentTimeline = async (row) => {
    setTimelineStudent(row);
    setTimelineLoading(true);
    setTimelineError('');
    setTimelineEvents([]);
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

  // Filtered Timeline Events inside Modal
  const filteredTimelineEvents = useMemo(() => {
    return timelineEvents.filter((e) => {
      if (modalEventTypeFilter !== 'ALL' && e.eventType !== modalEventTypeFilter) return false;
      if (modalSeverityFilter !== 'ALL' && e.severity !== modalSeverityFilter) return false;
      return true;
    });
  }, [timelineEvents, modalEventTypeFilter, modalSeverityFilter]);

  const getMalpracticeBadge = (status) => {
    switch (status) {
      case 'CRITICAL':
        return <span className="badge badge-error">🚨 CRITICAL</span>;
      case 'REVIEW_REQUIRED':
        return <span className="badge badge-error">⚠️ REVIEW REQUIRED</span>;
      case 'ATTENTION':
        return <span className="badge badge-warning">⚡ ATTENTION</span>;
      case 'NORMAL':
      default:
        return <span className="badge badge-success">✓ NORMAL</span>;
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

    const getStatusStyle = (st) => {
      switch (st) {
        case 'SUCCESS':
        case 'SUBMITTED':
          return { bg: 'var(--color-success-subtle)', color: 'var(--color-success)', text: `✓ ${st}` };
        case 'COMPILE_ERROR':
        case 'RUNTIME_ERROR':
        case 'TIMEOUT':
        case 'OUTPUT_LIMIT':
        case 'EXECUTION_ERROR':
          return { bg: 'var(--color-error-subtle)', color: 'var(--color-error)', text: `✕ ${st}` };
        default:
          return { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)', text: st || 'COMPLETED' };
      }
    };

    const statusInfo = status ? getStatusStyle(status) : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {/* Execution Metadata Bar: Status, Exit Code, Execution Time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Status:</span>
            {statusInfo ? (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                {statusInfo.text}
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>—</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Exit Code: </span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: exitCode === 0 ? 'var(--color-success)' : exitCode !== null ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                {exitCode !== null ? exitCode : '—'}
              </span>
            </div>

            <div style={{ color: 'var(--color-border)' }}>|</div>

            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Execution Time: </span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
                {executionTimeMs !== null ? `${executionTimeMs} ms` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Standard Output (stdout) */}
        {hasStdout && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
              Standard Output (stdout):
            </div>
            <pre style={{ margin: 0, padding: '0.75rem', backgroundColor: '#0F172A', color: '#E2E8F0', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-family-mono)', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
              {stdout}
            </pre>
          </div>
        )}

        {/* Standard Error (stderr) */}
        {hasStderr && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-error)', marginBottom: '0.25rem' }}>
              Error Output (stderr):
            </div>
            <pre style={{ margin: 0, padding: '0.75rem', backgroundColor: '#0F172A', color: '#F87171', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontFamily: 'var(--font-family-mono)', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
              {stderr}
            </pre>
          </div>
        )}

        {/* Neither stdout nor stderr present */}
        {!hasStdout && !hasStderr && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
            No output generated during execution.
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Loading Experiment Evaluation Console..." />
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
  const malpracticeFlaggedCount = unifiedStudentRoster.filter(
    (r) => r.malpracticeStatus === 'REVIEW_REQUIRED' || r.malpracticeStatus === 'CRITICAL' || r.malpracticeStatus === 'ATTENTION'
  ).length;

  const validScores = unifiedStudentRoster.map((r) => r.totalScore).filter((s) => s !== null);
  const avgTotalScore = validScores.length > 0
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Breadcrumbs & Navigation Header */}
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
            to={user?.role === 'ADMIN_HOD' ? `/admin/labs/${labId}/experiments` : `/teacher/labs/${labId}/experiments`}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem' }}
          >
            ⚙️ Manage / Edit Protocol
          </Link>
        </div>
      </div>

      {/* Experiment Showcase Banner */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
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
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', margin: '0.5rem 0 0 0', maxWidth: '850px', lineHeight: 1.5 }}>
                {experiment.objective}
              </p>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              textAlign: 'right'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Cohort Context
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {lab.code} &bull; {lab.department}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Semester {lab.semester} ({lab.academicYear})
            </div>
          </div>
        </div>

        {/* Experiment Telemetry KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.875rem', marginTop: '0.5rem' }}>
          <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>ENROLLED STUDENTS</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
              {totalStudentsCount}
            </div>
          </div>

          <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>SUBMISSIONS</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-info)', marginTop: '0.25rem' }}>
              {submittedCount} <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>({totalStudentsCount > 0 ? Math.round((submittedCount / totalStudentsCount) * 100) : 0}%)</span>
            </div>
          </div>

          <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>EVALUATED (VIVA + AUTO)</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
              {evaluatedCount} <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>({totalStudentsCount > 0 ? Math.round((evaluatedCount / totalStudentsCount) * 100) : 0}%)</span>
            </div>
          </div>

          <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>MALPRACTICE FLAGGED</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: malpracticeFlaggedCount > 0 ? 'var(--color-error)' : 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              {malpracticeFlaggedCount}
            </div>
          </div>

          <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>AVG TOTAL SCORE</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
              {avgTotalScore} <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>/ 15</span>
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
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <span>📋</span> Submissions &amp; Evaluation
          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--color-canvas)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
            {submittedCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('malpractice')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'malpractice' ? '3px solid var(--color-primary)' : '3px solid transparent',
            backgroundColor: activeTab === 'malpractice' ? 'var(--color-surface)' : 'transparent',
            color: activeTab === 'malpractice' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'malpractice' ? 700 : 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🛡️</span> Malpractice Monitor
          {malpracticeFlaggedCount > 0 && (
            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--color-error-subtle)', color: 'var(--color-error)', borderRadius: '1rem', fontWeight: 700 }}>
              {malpracticeFlaggedCount}
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
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🎙️</span> Viva Evaluation
          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--color-canvas)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
            {evaluatedCount}/{totalStudentsCount}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SUBMISSIONS & EVALUATION                                           */}
      {/* ========================================================================= */}
      {activeTab === 'submissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.875rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: '1 1 320px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Search student name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: '1 1 220px', maxWidth: '360px', fontSize: '0.875rem' }}
              />

              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '170px', fontSize: '0.875rem' }}
              >
                <option value="ALL">All Submission Statuses</option>
                <option value="SUBMITTED">Submitted Only</option>
                <option value="NOT_SUBMITTED">Not Submitted</option>
                <option value="EVALUATED">Fully Evaluated</option>
                <option value="VIVA_PENDING">Viva Pending</option>
              </select>

              {uniqueSections.length > 1 && (
                <select
                  className="input"
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  style={{ width: '140px', fontSize: '0.875rem' }}
                >
                  <option value="ALL">All Sections</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button onClick={refreshTabData} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
              🔄 Refresh Ledger
            </button>
          </div>

          {/* Submissions & Cohort Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Student Details</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Section</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Submission Status</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Attempts</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Program / 10</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Viva / 5</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Total / 15</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Evaluation Status</th>
                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissionsRoster.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        No enrolled students match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissionsRoster.map((row) => (
                      <tr key={row.studentId} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>{row.name}</strong>
                          <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {row.rollNumber}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                            {row.section || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {row.submissionStatus === 'SUBMITTED' ? (
                            <div>
                              <span className="badge badge-success">✓ SUBMITTED</span>
                              {row.latestSubmission?.submittedAt && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                                  {new Date(row.latestSubmission.submittedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' }}>
                              ⏳ NOT SUBMITTED
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {row.attemptsCount > 0 ? (
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{row.attemptsCount} attempt{row.attemptsCount > 1 ? 's' : ''}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {row.programScore !== null ? (
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{row.programScore.toFixed(1)}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {row.vivaScore !== null ? (
                            <span style={{ fontWeight: 700, color: 'var(--color-info)' }}>{row.vivaScore.toFixed(1)}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {row.totalScore !== null ? (
                            <span style={{ fontWeight: 800, color: 'var(--color-success)', backgroundColor: 'var(--color-success-subtle)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                              {row.totalScore.toFixed(1)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {row.evaluationStatus === 'EVALUATED' && <span className="badge badge-success">✓ EVALUATED</span>}
                          {row.evaluationStatus === 'VIVA_PENDING' && <span className="badge badge-warning">🎙 VIVA PENDING</span>}
                          {row.evaluationStatus === 'NOT_SUBMITTED' && <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' }}>UNATTEMPTED</span>}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            {row.submissionStatus === 'SUBMITTED' ? (
                              <button
                                onClick={() => handleOpenInspection(row)}
                                className="btn btn-primary"
                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                              >
                                🔍 Inspect / Evaluate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenVivaGrade(row)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                              >
                                🎙 Grade Viva
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MALPRACTICE MONITOR (EXPERIMENT-SCOPED)                            */}
      {/* ========================================================================= */}
      {activeTab === 'malpractice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Malpractice Summary Header Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.25rem', backgroundColor: 'var(--color-primary-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>👥</div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>STUDENTS MONITORED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                  {totalStudentsCount}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.25rem', backgroundColor: 'var(--color-error-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>🚨</div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>REQUIRING REVIEW</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-error)', marginTop: '0.2rem' }}>
                  {unifiedStudentRoster.filter((r) => r.malpracticeStatus === 'REVIEW_REQUIRED' || r.malpracticeStatus === 'CRITICAL').length}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.25rem', backgroundColor: 'var(--color-warning-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>⚡</div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>ATTENTION REQUIRED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.2rem' }}>
                  {unifiedStudentRoster.filter((r) => r.malpracticeStatus === 'ATTENTION').length}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.25rem', backgroundColor: 'var(--color-success-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>🛡️</div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>EXPERIMENT EVENTS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                  {malpracticeOverview?.summary?.totalEvents || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Malpractice Filter Bar */}
          <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.875rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: '1 1 320px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Search student name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: '1 1 220px', maxWidth: '360px', fontSize: '0.875rem' }}
              />

              <select
                className="input"
                value={malpracticeStatusFilter}
                onChange={(e) => setMalpracticeStatusFilter(e.target.value)}
                style={{ width: '180px', fontSize: '0.875rem' }}
              >
                <option value="ALL">All Malpractice Statuses</option>
                <option value="REVIEW_REQUIRED">Review Required Only</option>
                <option value="ATTENTION">Attention Only</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="NORMAL">Normal Only</option>
              </select>

              {uniqueSections.length > 1 && (
                <select
                  className="input"
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  style={{ width: '140px', fontSize: '0.875rem' }}
                >
                  <option value="ALL">All Sections</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button onClick={refreshTabData} className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
              🔄 Refresh Malpractice Telemetry
            </button>
          </div>

          {/* Malpractice Student Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Student Details</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Section</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Total Events</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Event Category Breakdown</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Latest Event</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Integrity Status</th>
                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMalpracticeRoster.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        No students match the selected malpractice filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMalpracticeRoster.map((row) => (
                      <tr key={row.studentId} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>{row.name}</strong>
                          <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {row.rollNumber}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                            {row.section || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: row.malpracticeEventsCount > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                            {row.malpracticeEventsCount}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {Object.entries(row.malpracticeByType).length > 0 ? (
                              Object.entries(row.malpracticeByType).map(([type, count]) => {
                                const cfg = EVENT_CONFIG[type] || { label: type, icon: '⚠️' };
                                return (
                                  <span
                                    key={type}
                                    style={{
                                      fontSize: '0.75rem',
                                      padding: '0.15rem 0.4rem',
                                      backgroundColor: 'var(--color-surface-hover)',
                                      border: '1px solid var(--color-border)',
                                      borderRadius: 'var(--radius-sm)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    <span>{cfg.icon}</span> {count}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>No events</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {row.malpracticeLatestEvent ? (
                            <div>
                              <strong style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', display: 'block' }}>
                                {EVENT_CONFIG[row.malpracticeLatestEvent.eventType]?.label || row.malpracticeLatestEvent.eventType}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                {new Date(row.malpracticeLatestEvent.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {getMalpracticeBadge(row.malpracticeStatus)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenStudentTimeline(row)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                          >
                            📈 Activity Timeline &rarr;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VIVA EVALUATION                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'viva' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Viva Sub-Tabs Navigation */}
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
              {/* Viva Evaluation Filter Bar */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.875rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: '1 1 320px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="🔍 Search student name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: '1 1 220px', maxWidth: '360px', fontSize: '0.875rem' }}
                  />

                  <select
                    className="input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: '160px', fontSize: '0.875rem' }}
                  >
                    <option value="ALL">All Viva Statuses</option>
                    <option value="EVALUATED">Evaluated Only</option>
                    <option value="PENDING">Pending Viva Only</option>
                  </select>

                  {uniqueSections.length > 1 && (
                    <select
                      className="input"
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      style={{ width: '140px', fontSize: '0.875rem' }}
                    >
                      <option value="ALL">All Sections</option>
                      {uniqueSections.map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Viva Student Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '0.875rem 1.25rem' }}>Student</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Section</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Program / 10</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Viva / 5</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Total / 15</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Viva Status</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Evaluator Remarks</th>
                      <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVivaRoster.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          No students match the selected viva filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredVivaRoster.map((row) => (
                        <tr key={row.studentId} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>{row.name}</strong>
                            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {row.rollNumber}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                              {row.section || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {row.programScore !== null ? (
                              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{row.programScore.toFixed(1)}</span>
                            ) : (
                              <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {row.vivaScore !== null ? (
                              <span style={{ fontWeight: 800, color: 'var(--color-info)' }}>{row.vivaScore.toFixed(1)}</span>
                            ) : (
                              <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {row.totalScore !== null ? (
                              <span style={{ fontWeight: 800, color: 'var(--color-success)', backgroundColor: 'var(--color-success-subtle)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                                {row.totalScore.toFixed(1)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {row.vivaScore !== null ? (
                              <span className="badge badge-success">✓ EVALUATED</span>
                            ) : (
                              <span className="badge badge-warning">⏳ PENDING VIVA</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', maxWidth: '240px' }}>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.vivaRemarks || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleOpenVivaGrade(row)}
                              className={row.vivaScore !== null ? 'btn btn-secondary' : 'btn btn-primary'}
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                            >
                              {row.vivaScore !== null ? '✏️ Edit Viva' : '🎙️ Grade Viva'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Re-evaluations Requests Table */
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--color-primary)', margin: 0 }}>
                  Formal Student Re-evaluation Requests
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
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
      {/* MODAL 1: SUBMISSION INSPECTION & INLINE EVALUATION                        */}
      {/* ========================================================================= */}
      {inspectingSubmission && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-info)', marginTop: '0.25rem' }}>
                  {inspectingViva?.marks !== undefined ? inspectingViva.marks.toFixed(1) : '—'} <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>/ 5.0</span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--color-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>ACADEMIC TOTAL SCORE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
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
      {/* MODAL 2: DEDICATED VIVA GRADING DRAWER / MODAL                            */}
      {/* ========================================================================= */}
      {gradingStudent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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

              {/* Total Calculation Preview */}
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
      {/* MODAL 3: MALPRACTICE STUDENT ACTIVITY TIMELINE                            */}
      {/* ========================================================================= */}
      {timelineStudent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
              maxWidth: '820px',
              maxHeight: '85vh',
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
                  EXPERIMENT MALPRACTICE TIMELINE
                </span>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', margin: 0 }}>
                  {timelineStudent.name} ({timelineStudent.rollNumber})
                </h2>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                  Experiment: <strong>{experiment.title}</strong> &bull; Section: <strong>{timelineStudent.section}</strong>
                </div>
              </div>
              <button onClick={() => setTimelineStudent(null)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem' }}>
                ✕ Close
              </button>
            </div>

            {/* Timeline Filter Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

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
                {filteredTimelineEvents.map((evt) => {
                  const cfg = EVENT_CONFIG[evt.eventType] || { label: evt.eventType, icon: '⚠️', description: 'Malpractice action detected' };
                  const isHigh = evt.severity === 'HIGH' || evt.severity === 'CRITICAL';
                  return (
                    <div
                      key={evt._id}
                      style={{
                        padding: '0.875rem 1rem',
                        backgroundColor: 'var(--color-surface-hover)',
                        border: `1px solid ${isHigh ? 'var(--color-error)' : 'var(--color-border)'}`,
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
                            <span className={isHigh ? 'badge badge-error' : 'badge badge-warning'}>
                              {evt.severity}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                            {cfg.description}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-secondary)', minWidth: '120px' }}>
                        {new Date(evt.timestamp).toLocaleTimeString()}
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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
