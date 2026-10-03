import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { labService } from '../../services/labService';
import { experimentService } from '../../services/experimentService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TestCaseManagementModal from '../../components/testcases/TestCaseManagementModal';
import VivaManagementModal from '../../components/viva/VivaManagementModal';
import StudentProgressModal from '../../components/progress/StudentProgressModal';

const PROGRAMMING_LANGUAGES = ['C', 'C++', 'Java', 'Python'];

const TeacherExperimentManagementPage = () => {
  const { labId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lab, setLab] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingExp, setSchedulingExp] = useState(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopeningExp, setReopeningExp] = useState(null);
  const [showTestCasesModal, setShowTestCasesModal] = useState(false);
  const [selectedTestCasesExp, setSelectedTestCasesExp] = useState(null);
  const [showVivaModal, setShowVivaModal] = useState(false);
  const [selectedVivaExp, setSelectedVivaExp] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    experimentNumber: 1,
    description: '',
    objective: '',
    instructions: '',
    programmingLanguages: ['C', 'C++'],
    scheduledAt: '',
    deadline: '',
    status: 'DRAFT'
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Schedule form
  const [scheduleData, setScheduleData] = useState({ scheduledAt: '', deadline: '' });
  // Reopen form
  const [reopenUntil, setReopenUntil] = useState('');

  useEffect(() => {
    fetchData();
  }, [labId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [labRes, expRes] = await Promise.all([
        labService.getLabById(labId),
        experimentService.getExperiments(labId)
      ]);
      setLab(labRes.data || labRes);
      const exps = expRes.data || expRes || [];
      setExperiments(Array.isArray(exps) ? exps : []);
    } catch (err) {
      console.error('Failed to load lab experiments:', err);
      setError(err.response?.data?.message || 'Failed to load laboratory experiments.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    // Next available experiment number
    const usedNumbers = experiments.map((e) => e.experimentNumber);
    let nextNum = 1;
    for (let i = 1; i <= 12; i++) {
      if (!usedNumbers.includes(i)) {
        nextNum = i;
        break;
      }
    }

    setEditingExp(null);
    setFormData({
      title: '',
      experimentNumber: nextNum,
      description: '',
      objective: '',
      instructions: '',
      programmingLanguages: ['C', 'C++'],
      scheduledAt: '',
      deadline: '',
      status: 'DRAFT'
    });
    setFormError('');
    setShowAuthorModal(true);
  };

  const openEditModal = (exp) => {
    setEditingExp(exp);
    setFormData({
      title: exp.title || '',
      experimentNumber: exp.experimentNumber || 1,
      description: exp.description || '',
      objective: exp.objective || '',
      instructions: exp.instructions || '',
      programmingLanguages: exp.programmingLanguages || ['C'],
      scheduledAt: exp.scheduledAt ? new Date(exp.scheduledAt).toISOString().slice(0, 16) : '',
      deadline: exp.deadline ? new Date(exp.deadline).toISOString().slice(0, 16) : '',
      status: exp.status || 'DRAFT'
    });
    setFormError('');
    setShowAuthorModal(true);
  };

  const handleLanguageToggle = (lang) => {
    setFormData((prev) => {
      const exists = prev.programmingLanguages.includes(lang);
      if (exists) {
        if (prev.programmingLanguages.length === 1) return prev; // Keep at least one
        return { ...prev, programmingLanguages: prev.programmingLanguages.filter((l) => l !== lang) };
      }
      return { ...prev, programmingLanguages: [...prev.programmingLanguages, lang] };
    });
  };

  const handleSaveExperiment = async (publishImmediate = false) => {
    setFormError('');
    if (!formData.title.trim()) {
      setFormError('Please enter an experiment title.');
      return;
    }
    if (formData.programmingLanguages.length === 0) {
      setFormError('Please select at least one programming language.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        lab: labId,
        title: formData.title.trim(),
        experimentNumber: parseInt(formData.experimentNumber, 10),
        description: formData.description.trim(),
        objective: formData.objective.trim(),
        instructions: formData.instructions.trim(),
        programmingLanguages: formData.programmingLanguages,
        status: publishImmediate ? 'PUBLISHED' : editingExp ? formData.status : 'DRAFT',
        scheduledAt: formData.scheduledAt || null,
        deadline: formData.deadline || null
      };

      if (editingExp) {
        await experimentService.updateExperiment(editingExp._id, payload);
        if (publishImmediate && editingExp.status !== 'PUBLISHED') {
          await experimentService.publishExperiment(editingExp._id);
        }
        setSuccessMsg(`Experiment #${payload.experimentNumber} updated successfully.`);
      } else {
        await experimentService.createExperiment(payload);
        setSuccessMsg(`Experiment #${payload.experimentNumber} created successfully.`);
      }

      setShowAuthorModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save experiment protocol.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (expId) => {
    if (!window.confirm('Are you sure you want to publish this experiment for student access?')) return;
    try {
      await experimentService.publishExperiment(expId);
      setSuccessMsg('Experiment published successfully.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish experiment.');
    }
  };

  const handleClose = async (expId) => {
    if (!window.confirm('Are you sure you want to close this experiment? Students will no longer be able to submit once closed.')) return;
    try {
      await experimentService.closeExperiment(expId);
      setSuccessMsg('Experiment closed successfully.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close experiment.');
    }
  };

  const openScheduleModal = (exp) => {
    setSchedulingExp(exp);
    setScheduleData({
      scheduledAt: exp.scheduledAt ? new Date(exp.scheduledAt).toISOString().slice(0, 16) : '',
      deadline: exp.deadline ? new Date(exp.deadline).toISOString().slice(0, 16) : ''
    });
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleData.scheduledAt) {
      alert('Scheduled publication date is required.');
      return;
    }
    try {
      await experimentService.scheduleExperiment(
        schedulingExp._id,
        scheduleData.scheduledAt,
        scheduleData.deadline || null
      );
      setShowScheduleModal(false);
      setSuccessMsg('Experiment scheduled successfully.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule experiment.');
    }
  };

  const openReopenModal = (exp) => {
    setReopeningExp(exp);
    setReopenUntil(exp.reopenedUntil ? new Date(exp.reopenedUntil).toISOString().slice(0, 16) : '');
    setShowReopenModal(true);
  };

  const handleSaveReopen = async () => {
    try {
      await experimentService.reopenExperiment(reopeningExp._id, reopenUntil || null);
      setShowReopenModal(false);
      setSuccessMsg('Experiment reopened successfully.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reopen experiment.');
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= experiments.length) return;

    const newExps = [...experiments];
    const temp = newExps[index];
    newExps[index] = newExps[targetIndex];
    newExps[targetIndex] = temp;

    const orders = newExps.map((exp, idx) => ({
      experimentId: exp._id,
      order: idx + 1
    }));

    try {
      await experimentService.reorderExperiments(labId, orders);
      setExperiments(newExps);
    } catch (err) {
      alert('Failed to reorder experiments.');
      fetchData();
    }
  };

  const handleToggleActive = async (expId, currentActive) => {
    try {
      await experimentService.toggleActive(expId, !currentActive);
      setSuccessMsg(`Experiment ${!currentActive ? 'activated' : 'deactivated'} successfully.`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change experiment active status.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="badge badge-success">● PUBLISHED</span>;
      case 'SCHEDULED':
        return <span className="badge badge-info">⏳ SCHEDULED</span>;
      case 'REOPENED':
        return <span className="badge badge-primary">🔓 REOPENED</span>;
      case 'CLOSED':
        return <span className="badge badge-error">🔒 CLOSED</span>;
      case 'DRAFT':
      default:
        return <span className="badge" style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>📝 DRAFT</span>;
    }
  };

  const filteredExperiments = experiments.filter((exp) => {
    const matchesStatus = statusFilter === 'ALL' || exp.status === statusFilter;
    const matchesSearch =
      exp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.objective?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `exp ${exp.experimentNumber}`.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const publishedCount = experiments.filter((e) => e.status === 'PUBLISHED').length;
  const draftCount = experiments.filter((e) => e.status === 'DRAFT').length;
  const scheduledCount = experiments.filter((e) => e.status === 'SCHEDULED').length;
  const closedCount = experiments.filter((e) => e.status === 'CLOSED' || e.status === 'REOPENED').length;

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <LoadingSpinner size={40} text="Loading laboratory experiments..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Breadcrumb Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--color-surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            <Link to="/teacher/labs" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
              My Laboratories
            </Link>
            <span>&rsaquo;</span>
            <Link to={`/teacher/labs/${labId}`} style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
              {lab?.code || 'Lab'}
            </Link>
            <span>&rsaquo;</span>
            <strong style={{ color: 'var(--color-primary)' }}>Experiment Curriculum</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-primary)' }}>
              {lab?.name} &mdash; Experiment Management
            </h1>
            <span className="badge badge-primary">{lab?.code}</span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            Author, sequence, schedule, and publish laboratory curriculum exercises (Max 12 experiments).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowProgressModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <span>📊</span> Cohort Progress Tracker
          </button>
          <Link
            to={user?.role === 'ADMIN_HOD' ? `/admin/labs/${labId}/experiments/import-pdf` : `/teacher/labs/${labId}/experiments/import-pdf`}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}
          >
            <span>📄</span> Import from PDF Manual
          </Link>
          <button
            onClick={openCreateModal}
            disabled={experiments.length >= 12}
            className="btn btn-primary"
            style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <span>+</span> Add New Experiment ({experiments.length}/12)
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div
          style={{
            padding: '0.875rem 1rem',
            backgroundColor: 'var(--color-success-bg, #f0fdf4)',
            border: '1px solid var(--color-success-border, #bbf7d0)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-success, #16a34a)',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: '0.875rem'
          }}
        >
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* Metrics Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}
      >
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>TOTAL CURRICULUM</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {experiments.length} <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 400 }}>/ 12 Max</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>PUBLISHED TO STUDENTS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{publishedCount}</div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>SCHEDULED</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7' }}>{scheduledCount}</div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>DRAFTS IN-PROGRESS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{draftCount}</div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>CLOSED / REOPENED</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{closedCount}</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1.25rem'
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search experiments by title, objective, or number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '0.5rem 0.875rem',
            fontSize: '0.875rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-input)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)'
          }}
        />

        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {['ALL', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'CLOSED', 'REOPENED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.625rem' }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Experiment List */}
      {filteredExperiments.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>📑</div>
          <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
            No Experiments Found
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: '440px', margin: 0 }}>
            {searchTerm || statusFilter !== 'ALL'
              ? 'No experiments match your search or filter.'
              : 'This laboratory does not have any experiments authored yet. Click below to add the first experiment protocol.'}
          </p>
          {!searchTerm && statusFilter === 'ALL' && (
            <button onClick={openCreateModal} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              + Add Experiment #1
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredExperiments.map((exp, index) => (
            <div
              key={exp._id}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderLeft: exp.status === 'PUBLISHED' ? '4px solid #16a34a' : exp.status === 'SCHEDULED' ? '4px solid #0284c7' : '4px solid var(--color-border)'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                  {/* Sequence Order Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      onClick={() => handleMoveOrder(index, -1)}
                      disabled={index === 0}
                      className="btn btn-secondary"
                      style={{ padding: '0.15rem 0.4rem', fontSize: '0.6875rem', lineHeight: 1 }}
                      title="Move Up in Sequence"
                    >
                      ▲
                    </button>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      #{exp.order || index + 1}
                    </span>
                    <button
                      onClick={() => handleMoveOrder(index, 1)}
                      disabled={index === filteredExperiments.length - 1}
                      className="btn btn-secondary"
                      style={{ padding: '0.15rem 0.4rem', fontSize: '0.6875rem', lineHeight: 1 }}
                      title="Move Down in Sequence"
                    >
                      ▼
                    </button>
                  </div>

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
                        EXP {exp.experimentNumber < 10 ? `0${exp.experimentNumber}` : exp.experimentNumber}
                      </span>
                      {getStatusBadge(exp.status)}
                      {!exp.active && <span className="badge badge-error">INACTIVE</span>}
                    </div>

                    <h3 style={{ fontSize: '1.125rem', color: 'var(--color-text-primary)', margin: '0.25rem 0' }}>
                      {exp.title}
                    </h3>

                    {exp.objective && (
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', margin: '0.25rem 0 0 0', maxWidth: '800px', lineHeight: 1.4 }}>
                        <strong>Objective:</strong> {exp.objective}
                      </p>
                    )}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => openEditModal(exp)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={() => {
                      setSelectedTestCasesExp(exp);
                      setShowTestCasesModal(true);
                    }}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.75rem',
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)',
                      fontWeight: 600
                    }}
                  >
                    🧪 Test Cases & Scoring
                  </button>

                  <button
                    onClick={() => {
                      setSelectedVivaExp(exp);
                      setShowVivaModal(true);
                    }}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.75rem',
                      borderColor: '#16a34a',
                      color: '#16a34a',
                      fontWeight: 600
                    }}
                  >
                    🎙 Viva &amp; Re-eval (/5)
                  </button>

                  {exp.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => handlePublish(exp._id)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', backgroundColor: '#16a34a' }}
                      >
                        🚀 Publish Now
                      </button>
                      <button
                        onClick={() => openScheduleModal(exp)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        ⏳ Schedule
                      </button>
                    </>
                  )}

                  {exp.status === 'SCHEDULED' && (
                    <>
                      <button
                        onClick={() => handlePublish(exp._id)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', backgroundColor: '#16a34a' }}
                      >
                        🚀 Publish Immediately
                      </button>
                      <button
                        onClick={() => openScheduleModal(exp)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        Edit Schedule
                      </button>
                    </>
                  )}

                  {exp.status === 'PUBLISHED' && (
                    <button
                      onClick={() => handleClose(exp._id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#dc2626' }}
                    >
                      🔒 Close Experiment
                    </button>
                  )}

                  {exp.status === 'CLOSED' && (
                    <button
                      onClick={() => openReopenModal(exp)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      🔓 Reopen Protocol
                    </button>
                  )}

                  {exp.status === 'REOPENED' && (
                    <button
                      onClick={() => handleClose(exp._id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#dc2626' }}
                    >
                      🔒 Close Protocol
                    </button>
                  )}
                </div>
              </div>

              {/* Languages & Metadata Strip */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  fontSize: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Allowed Languages:</span>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {exp.programmingLanguages?.map((lang) => (
                      <span
                        key={lang}
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          padding: '0.1rem 0.4rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          color: 'var(--color-primary)'
                        }}
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-secondary)' }}>
                  {exp.scheduledAt && (
                    <span>
                      Scheduled:{' '}
                      <strong style={{ color: 'var(--color-text-primary)' }}>
                        {new Date(exp.scheduledAt).toLocaleDateString()}
                      </strong>
                    </span>
                  )}
                  {exp.deadline && (
                    <span>
                      Deadline:{' '}
                      <strong style={{ color: 'var(--color-text-primary)' }}>
                        {new Date(exp.deadline).toLocaleDateString()}
                      </strong>
                    </span>
                  )}
                  {exp.reopenedUntil && (
                    <span>
                      Reopened Until:{' '}
                      <strong style={{ color: '#0284c7' }}>
                        {new Date(exp.reopenedUntil).toLocaleDateString()}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTHOR / EDIT MODAL (Based on Stitch Experiment Authoring Suite)           */}
      {/* ========================================================================= */}
      {showAuthorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: 0 }}>
                  {editingExp ? `Edit Experiment — Exp ${editingExp.experimentNumber}` : 'Author New Experiment Protocol'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {lab?.name} ({lab?.code})
                </span>
              </div>
              <button
                onClick={() => setShowAuthorModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={(e) => { e.preventDefault(); handleSaveExperiment(false); }} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              {formError && (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-error)',
                    fontSize: '0.8125rem'
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Row: Experiment Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Experiment Number (1 - 12) <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={formData.experimentNumber}
                    onChange={(e) => setFormData({ ...formData, experimentNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-input)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Status Stage
                  </label>
                  <div style={{ paddingTop: '0.5rem' }}>
                    {getStatusBadge(editingExp ? formData.status : 'DRAFT')}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Experiment Title <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implementation of Red-Black Tree Balancing Protocols"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-input)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>

              {/* Objective */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Objective &amp; Learning Outcomes
                </label>
                <textarea
                  rows="2"
                  placeholder="Understand self-balancing search trees and left/right rotation rules on insertion."
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-input)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Programming Languages Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Allowed Programming Languages <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {PROGRAMMING_LANGUAGES.map((lang) => {
                    const isChecked = formData.programmingLanguages.includes(lang);
                    return (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => handleLanguageToggle(lang)}
                        style={{
                          padding: '0.4rem 0.875rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isChecked ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: isChecked ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                          color: isChecked ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem'
                        }}
                      >
                        <span>{isChecked ? '✓' : '○'}</span>
                        <span>{lang}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instructions / Procedure */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Detailed Procedure &amp; Instructions
                </label>
                <textarea
                  rows="4"
                  placeholder="1. Formulate BST structure.&#10;2. Implement node rotation.&#10;3. Validate balancing conditions."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-input)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-family-mono)',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Dates Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Scheduled Publication Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.625rem',
                      fontSize: '0.8125rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-input)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Submission Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.625rem',
                      fontSize: '0.8125rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-input)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--color-border)',
                  marginTop: '0.5rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAuthorModal(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8125rem' }}
                  >
                    {isSubmitting ? 'Saving...' : 'Save as Draft'}
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveExperiment(true)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8125rem', backgroundColor: '#16a34a' }}
                  >
                    Save &amp; Publish
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCHEDULE MODAL                                                            */}
      {/* ========================================================================= */}
      {showScheduleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: '0 0 1rem 0' }}>
              Schedule Publication: Exp {schedulingExp?.experimentNumber}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Publication Date &amp; Time <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleData.scheduledAt}
                  onChange={(e) => setScheduleData({ ...scheduleData, scheduledAt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-input)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Deadline Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleData.deadline}
                  onChange={(e) => setScheduleData({ ...scheduleData, deadline: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-input)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REOPEN MODAL                                                              */}
      {/* ========================================================================= */}
      {showReopenModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', margin: '0 0 1rem 0' }}>
              Reopen Protocol: Exp {reopeningExp?.experimentNumber}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem 0' }}>
              Reopening will reactivate this experiment for students until the specified date.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Reopened Deadline (Optional future date)
                </label>
                <input
                  type="datetime-local"
                  value={reopenUntil}
                  onChange={(e) => setReopenUntil(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-input)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReopen}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Reopen Experiment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEST CASES & SCORING MODAL                                                */}
      {/* ========================================================================= */}
      <TestCaseManagementModal
        isOpen={showTestCasesModal}
        onClose={() => {
          setShowTestCasesModal(false);
          setSelectedTestCasesExp(null);
        }}
        experiment={selectedTestCasesExp}
      />

      {/* ========================================================================= */}
      {/* VIVA & RE-EVALUATION MODAL                                                */}
      {/* ========================================================================= */}
      <VivaManagementModal
        isOpen={showVivaModal}
        onClose={() => {
          setShowVivaModal(false);
          setSelectedVivaExp(null);
        }}
        experiment={selectedVivaExp}
        labId={labId}
      />

      {/* ========================================================================= */}
      {/* STUDENT COHORT PROGRESS TRACKER MODAL                                     */}
      {/* ========================================================================= */}
      <StudentProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        labId={labId}
        labName={lab?.name}
        labCode={lab?.code}
      />
    </div>
  );
};

export default TeacherExperimentManagementPage;
