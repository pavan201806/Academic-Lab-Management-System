import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { experimentService } from '../../services/experimentService';
import { labService } from '../../services/labService';
import { useAuth } from '../../context/AuthContext';

const VALID_LANGUAGES = ['C', 'C++', 'Java', 'Python'];

const PdfExperimentExtractionPage = () => {
  const { labId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lab, setLab] = useState(null);
  const [loadingLab, setLoadingLab] = useState(true);
  const [step, setStep] = useState(1); // 1: Upload, 2: Extracting, 3: Review & Edit
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [reviewedExperiments, setReviewedExperiments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Detailed edit modal for an individual extracted experiment
  const [editingExpIndex, setEditingExpIndex] = useState(null);
  const [editingExpData, setEditingExpData] = useState(null);

  useEffect(() => {
    fetchLabDetails();
  }, [labId]);

  const fetchLabDetails = async () => {
    try {
      setLoadingLab(true);
      const res = await labService.getLabById(labId);
      setLab(res.data || res);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to load laboratory context.');
    } finally {
      setLoadingLab(false);
    }
  };

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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setErrorMessage('');
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Invalid file format. Please upload a valid PDF document (.pdf).');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10MB limit. Please upload a smaller PDF file.');
      return;
    }
    setFile(selectedFile);
  };

  const handleExtract = async () => {
    if (!file) {
      setErrorMessage('Please select a PDF document first.');
      return;
    }

    try {
      setErrorMessage('');
      setExtracting(true);
      setStep(2);

      const res = await experimentService.extractFromPdf(labId, file);
      const data = res.data || res;
      setExtractedData(data);

      // Initialize review roster
      setReviewedExperiments(
        (data.experiments || []).map((exp, idx) => ({
          ...exp,
          tempId: `ext_${idx}_${Date.now()}`,
          programmingLanguages: exp.programmingLanguages || ['C', 'C++', 'Java', 'Python']
        }))
      );

      setStep(3);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to extract experiments from PDF.');
      setStep(1);
    } finally {
      setExtracting(false);
    }
  };

  const handleTitleChange = (index, newTitle) => {
    const updated = [...reviewedExperiments];
    updated[index].title = newTitle;
    setReviewedExperiments(updated);
  };

  const handleNumberChange = (index, newNum) => {
    const updated = [...reviewedExperiments];
    updated[index].experimentNumber = parseInt(newNum, 10) || '';
    setReviewedExperiments(updated);
  };

  const handleRemoveExperiment = (index) => {
    const updated = reviewedExperiments.filter((_, i) => i !== index);
    setReviewedExperiments(updated);
  };

  const handleAddCustomRow = () => {
    if (reviewedExperiments.length >= 12) {
      setErrorMessage('Cannot exceed 12 experiments in a laboratory curriculum.');
      return;
    }

    const nextNum = reviewedExperiments.length > 0
      ? Math.max(...reviewedExperiments.map((e) => parseInt(e.experimentNumber, 10) || 0)) + 1
      : 1;

    setReviewedExperiments([
      ...reviewedExperiments,
      {
        tempId: `custom_${Date.now()}`,
        experimentNumber: Math.min(nextNum, 12),
        title: 'New Custom Laboratory Exercise',
        description: '',
        objective: '',
        instructions: '',
        programmingLanguages: ['C', 'C++', 'Java', 'Python'],
        confidence: 100
      }
    ]);
  };

  const openDetailModal = (index) => {
    setEditingExpIndex(index);
    setEditingExpData({ ...reviewedExperiments[index] });
  };

  const saveDetailModal = () => {
    if (editingExpIndex !== null && editingExpData) {
      const updated = [...reviewedExperiments];
      updated[editingExpIndex] = editingExpData;
      setReviewedExperiments(updated);
      setEditingExpIndex(null);
      setEditingExpData(null);
    }
  };

  const toggleModalLanguage = (lang) => {
    if (!editingExpData) return;
    const current = editingExpData.programmingLanguages || [];
    const next = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    setEditingExpData({ ...editingExpData, programmingLanguages: next });
  };

  const validateReviewRoster = () => {
    if (reviewedExperiments.length === 0) {
      setErrorMessage('At least one experiment must be reviewed before confirming.');
      return false;
    }

    if (reviewedExperiments.length > 12) {
      setErrorMessage('You cannot save more than 12 experiments in this laboratory.');
      return false;
    }

    const seenNums = new Set();
    for (let i = 0; i < reviewedExperiments.length; i++) {
      const exp = reviewedExperiments[i];
      if (!exp.title || !exp.title.trim()) {
        setErrorMessage(`Experiment #${exp.experimentNumber || i + 1} is missing a title.`);
        return false;
      }
      const num = parseInt(exp.experimentNumber, 10);
      if (isNaN(num) || num < 1 || num > 12) {
        setErrorMessage(`Experiment #${i + 1} has an invalid experiment number (must be 1-12).`);
        return false;
      }
      if (seenNums.has(num)) {
        setErrorMessage(`Duplicate experiment number ${num} detected. Please ensure all experiment numbers are distinct.`);
        return false;
      }
      seenNums.add(num);
    }
    return true;
  };

  const handleConfirmAndSave = async () => {
    if (!validateReviewRoster()) return;

    try {
      setErrorMessage('');
      setSaving(true);

      await experimentService.confirmPdfExperiments(labId, reviewedExperiments);
      setSuccessMessage(`Successfully saved ${reviewedExperiments.length} experiments into laboratory!`);

      setTimeout(() => {
        navigate(`/teacher/labs/${labId}/experiments`);
      }, 1200);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to confirm and save experiments.');
    } finally {
      setSaving(false);
    }
  };

  const basePath = user?.role === 'ADMIN_HOD' ? '/admin' : '/teacher';

  return (
    <div className="space-y-6">
      {/* Sub-header Breadcrumb Bar */}
      <section className="bg-surface-container-lowest/60 border-b border-outline-variant/20 px-6 py-2.5 flex items-center justify-between rounded-xl">
        <nav className="flex items-center gap-1.5 text-xs text-outline overflow-x-auto whitespace-nowrap">
          <Link to={`${basePath}/labs`} className="hover:text-primary transition-colors">
            Laboratories
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link to={`${basePath}/labs/${labId}`} className="hover:text-primary transition-colors text-on-surface-variant font-medium">
            {lab ? `${lab.name} (${lab.code})` : 'Lab'}
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link to={`${basePath}/labs/${labId}/experiments`} className="hover:text-primary transition-colors">
            Experiments
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary font-semibold">PDF Extraction Suite</span>
        </nav>
        <div className="flex items-center gap-2 text-xs text-outline">
          <span className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            Max Capacity: 12 Experiments
          </span>
        </div>
      </section>

      {/* Toast Alert / Info Banners */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-error/10 border border-error/30 text-error flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-error/70 hover:text-error">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Main Multi-Step Container */}
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-xs rounded-full bg-secondary-container/40 text-on-secondary-container font-semibold uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">document_scanner</span>
                  Text-based PDF Extraction
                </span>
                <span className="text-xs text-outline font-mono">Curriculum Parser</span>
              </div>
              <h1 className="text-2xl font-bold text-primary">Import Experiments from PDF Manual</h1>
              <p className="text-sm text-on-surface-variant mt-0.5">
                Upload your laboratory manual or syllabus to automatically extract, review, and configure practical experiments.
              </p>
            </div>
            <Link
              to={`${basePath}/labs/${labId}/experiments`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-outline-variant/80 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Manual Console</span>
            </Link>
          </div>
        </div>

        {/* Multi-Step Stepper Progress Bar */}
        <div className="px-6 py-4 bg-surface-container-low/50 border-b border-outline-variant/30">
          <div className="grid grid-cols-3 gap-2">
            {/* Step 1 */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                  step > 1 ? 'bg-secondary text-white' : 'bg-primary-container text-white ring-4 ring-primary-fixed/60'
                }`}
              >
                {step > 1 ? <span className="material-symbols-outlined text-[16px]">check</span> : '1'}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Step 1</span>
                <span className="text-xs sm:text-sm font-semibold text-on-surface">Upload PDF Manual</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                  step > 2 ? 'bg-secondary text-white' : step === 2 ? 'bg-primary-container text-white ring-4 ring-primary-fixed/60' : 'bg-surface-container-high text-outline'
                }`}
              >
                {step > 2 ? <span className="material-symbols-outlined text-[16px]">check</span> : '2'}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Step 2</span>
                <span className="text-xs sm:text-sm font-semibold text-on-surface">Text Extraction</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                  step === 3 ? 'bg-primary-container text-white ring-4 ring-primary-fixed/60' : 'bg-surface-container-high text-outline'
                }`}
              >
                <span>3</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Step 3</span>
                <span className="text-xs sm:text-sm font-semibold text-on-surface">Review &amp; Confirm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-6">
          {/* STEP 1: UPLOAD ZONE */}
          {step === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto py-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
                  dragActive
                    ? 'border-primary bg-primary-fixed/20'
                    : file
                    ? 'border-secondary/60 bg-secondary/5'
                    : 'border-outline-variant/60 hover:border-primary/60 bg-surface-container-low/40'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-primary-container/10 text-primary mx-auto flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>
                <h3 className="text-lg font-bold text-primary mb-1">
                  {file ? file.name : 'Select or drag & drop laboratory manual PDF'}
                </h3>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-5">
                  Upload a standard text-based syllabus or lab manual (up to 10MB). Scanned image PDFs without text layer cannot be parsed.
                </p>

                <div className="flex items-center justify-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-primary-container hover:bg-primary text-white rounded-lg text-sm font-semibold shadow-sm transition-all inline-flex items-center gap-2 active:scale-98">
                    <span className="material-symbols-outlined text-[18px]">folder_open</span>
                    <span>Browse Files</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {file && (
                    <button
                      onClick={() => setFile(null)}
                      className="px-3 py-2 border border-outline-variant/80 rounded-lg text-sm font-medium text-outline hover:text-error transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {file && (
                  <div className="mt-5 p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 inline-flex items-center gap-3 text-left">
                    <span className="material-symbols-outlined text-error text-2xl">picture_as_pdf</span>
                    <div>
                      <div className="text-xs font-bold text-on-surface">{file.name}</div>
                      <div className="text-[11px] text-outline font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready for processing</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload CTA Button */}
              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                <Link
                  to={`${basePath}/labs/${labId}/experiments`}
                  className="text-sm font-medium text-outline hover:text-on-surface transition-colors"
                >
                  Cancel &amp; Return
                </Link>
                <button
                  onClick={handleExtract}
                  disabled={!file || extracting}
                  className="px-6 py-2.5 bg-primary-container hover:bg-primary text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">auto_read_play</span>
                  <span>Extract Experiments</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: EXTRACTING PROGRESS */}
          {step === 2 && (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-primary-container/20 border-t-primary animate-spin mx-auto"></div>
              <h3 className="text-lg font-bold text-primary">Parsing PDF Laboratory Manual...</h3>
              <p className="text-xs text-on-surface-variant">
                Extracting textual structure, identifying experiment indices, objectives, and programming constraints.
              </p>
            </div>
          )}

          {/* STEP 3: REVIEW & EDIT TABLE (Stitch Reference) */}
          {step === 3 && (
            <div className="space-y-6">
              {/* File Extraction Success Banner */}
              <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">verified</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary">
                      {reviewedExperiments.length} experiments detected from "{extractedData?.fileName || file?.name}"
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      Review, modify, or add items below. Nothing is committed to the laboratory catalog until you click Confirm &amp; Save.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStep(1);
                    setFile(null);
                  }}
                  className="text-xs font-semibold text-primary hover:text-primary-container px-2.5 py-1 rounded hover:bg-surface-container transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">sync</span>
                  <span>Upload Different PDF</span>
                </button>
              </div>

              {/* Warning disclaimer */}
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-600/30 flex items-start gap-2.5 text-amber-950 text-xs">
                <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">warning</span>
                <div>
                  <strong className="font-semibold text-amber-900">Faculty Verification Mandatory:</strong> Ensure experiment numbers (1–12) and titles comply with institutional syllabus standards. Maximum capacity is 12 experiments.
                </div>
              </div>

              {/* Review Table */}
              <div className="border border-outline-variant/40 rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm">
                <div className="bg-surface-container-low px-4 py-2.5 border-b border-outline-variant/30 grid grid-cols-12 text-xs font-semibold text-outline uppercase tracking-wider">
                  <span className="col-span-2">Seq Number</span>
                  <span className="col-span-6">Parsed Title &amp; Academic Scope</span>
                  <span className="col-span-2 text-center">Languages</span>
                  <span className="col-span-2 text-right">Actions</span>
                </div>

                <div className="divide-y divide-outline-variant/20">
                  {reviewedExperiments.map((exp, idx) => (
                    <div
                      key={exp.tempId || idx}
                      className="p-3.5 grid grid-cols-12 items-center gap-3 hover:bg-surface-container-low/40 transition-colors"
                    >
                      {/* Seq Number */}
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-outline">#</span>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={exp.experimentNumber}
                          onChange={(e) => handleNumberChange(idx, e.target.value)}
                          className="w-16 h-8 px-2 text-sm font-bold font-mono text-primary bg-white border border-outline-variant/60 rounded-lg text-center focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* Title & Scope */}
                      <div className="col-span-6 space-y-1">
                        <input
                          type="text"
                          value={exp.title}
                          onChange={(e) => handleTitleChange(idx, e.target.value)}
                          placeholder="Experiment Title..."
                          className="w-full text-sm font-semibold text-primary bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-outline-variant/40 focus:border-primary rounded px-2 py-1 transition-all"
                        />
                        {exp.objective && (
                          <p className="text-[11px] text-on-surface-variant truncate px-2">
                            <span className="font-medium text-outline">Aim:</span> {exp.objective}
                          </p>
                        )}
                      </div>

                      {/* Languages */}
                      <div className="col-span-2 flex justify-center gap-1 flex-wrap">
                        {(exp.programmingLanguages || []).map((lang) => (
                          <span
                            key={lang}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface-container text-on-surface-variant border border-outline-variant/30"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetailModal(idx)}
                          className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container transition-colors"
                          title="Edit Detailed Objective / Instructions"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit_note</span>
                        </button>
                        <button
                          onClick={() => handleRemoveExperiment(idx)}
                          className="p-1.5 text-on-surface-variant hover:text-error rounded-lg hover:bg-error-container/30 transition-colors"
                          title="Remove from Curriculum"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table Footer */}
                <div className="p-3 bg-surface-container-low/60 border-t border-outline-variant/30 flex items-center justify-between">
                  <button
                    onClick={handleAddCustomRow}
                    disabled={reviewedExperiments.length >= 12}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-container px-3 py-1.5 rounded hover:bg-surface-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>+ Add Custom Experiment Row</span>
                  </button>
                  <span className="text-xs text-outline font-mono">
                    {reviewedExperiments.length} of 12 max experiments
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setStep(1);
                    setReviewedExperiments([]);
                  }}
                  className="text-sm font-medium text-outline hover:text-on-surface transition-colors py-2 px-3"
                >
                  Discard &amp; Start Over
                </button>

                <button
                  onClick={handleConfirmAndSave}
                  disabled={saving || reviewedExperiments.length === 0}
                  className="px-6 py-2.5 bg-primary-container hover:bg-primary text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                  <span>{saving ? 'Saving Experiments...' : `Confirm & Save ${reviewedExperiments.length} Experiments`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DETAILED EXPERIMENT EDIT MODAL */}
      {editingExpIndex !== null && editingExpData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-bold font-mono bg-primary-container text-white rounded">
                  Exp {editingExpData.experimentNumber}
                </span>
                <h3 className="text-lg font-bold text-primary">Edit Experiment Details</h3>
              </div>
              <button
                onClick={() => setEditingExpIndex(null)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Experiment Title *</label>
                <input
                  type="text"
                  value={editingExpData.title}
                  onChange={(e) => setEditingExpData({ ...editingExpData, title: e.target.value })}
                  className="w-full h-9 px-3 text-sm bg-white border border-outline-variant/60 rounded-lg text-on-surface focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Objective / Academic Aim</label>
                <textarea
                  rows="2"
                  value={editingExpData.objective}
                  onChange={(e) => setEditingExpData({ ...editingExpData, objective: e.target.value })}
                  placeholder="State the academic objective..."
                  className="w-full p-2.5 text-sm bg-white border border-outline-variant/60 rounded-lg text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Detailed Instructions / Procedure</label>
                <textarea
                  rows="4"
                  value={editingExpData.instructions}
                  onChange={(e) => setEditingExpData({ ...editingExpData, instructions: e.target.value })}
                  placeholder="Step-by-step experiment instructions..."
                  className="w-full p-2.5 text-sm bg-white border border-outline-variant/60 rounded-lg text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">Allowed Programming Languages</label>
                <div className="flex gap-2 flex-wrap">
                  {VALID_LANGUAGES.map((lang) => {
                    const isSelected = (editingExpData.programmingLanguages || []).includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleModalLanguage(lang)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-primary-container text-white border-primary-container'
                            : 'bg-white text-on-surface-variant border-outline-variant/60 hover:border-primary'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-outline-variant/30 flex items-center justify-end gap-2 bg-surface-container-low/40">
              <button
                type="button"
                onClick={() => setEditingExpIndex(null)}
                className="px-4 py-2 text-xs font-medium text-outline hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDetailModal}
                className="px-4 py-2 bg-primary-container hover:bg-primary text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Save Properties
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfExperimentExtractionPage;
