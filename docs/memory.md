# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 10 — Reports**

Status: Completed & Verified (Ready for Review)

---

## Completed

- **Phase 0 — Foundation:**
  - Project documentation (`PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `memory.md`).
  - Frontend React 18 + Vite foundation with Stitch tokens in `designTokens.css`.
  - Backend Node.js + Express + Mongoose connection layer and centralized error handling.
  - Verification endpoint `GET /api/health`.
- **Phase 1 — Authentication:**
  - User model, bcrypt password hashing, JWT stateless token signing, protected routes, role RBAC (`ADMIN_HOD`, `TEACHER`, `STUDENT`), temporary password gate, Stitch UI login and password change flows, seed utility.
- **Phase 2 — Academic Structure & Administration:**
  - Section, Lab, LabAssignment models, admin administration APIs, single MAIN teacher rule, multi-ASSISTANT support, Stitch administrative console, allocation wizard.
- **Phase 3 — Lab Management & Access Layer:**
  - Role-aware assigned laboratories hub (`GET /api/labs/assigned`), IDOR protection on lab details, Section cohort isolation for students, soft-deactivation preservation.
- **Phase 4 — Experiment Management:**
  - Experiment Mongoose model, 1–12 capacity limit, controlled lifecycle (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `CLOSED`, `REOPENED`), deadline and extension validation, batch reordering, Stitch authoring console and student protocol viewer.
- **Phase 5 — PDF Experiment Extraction:**
  - PDF parser (`pdf-parse`) and heuristic recognition engine, multipart upload middleware, transient extraction preview endpoint (`POST /api/experiments/extract-pdf`), atomic confirmation endpoint (`POST /api/experiments/confirm-pdf`), Stitch-based 3-step extraction UI, 20/20 passing tests.
- **Phase 6 — Code Execution and Submission:**
  - Submission model, Docker container execution engine, isolated ephemeral runner image (`docker/runner.Dockerfile`), security guardrails (`--network none`, unprivileged user, cap-drop ALL, no-new-privileges), official 3-attempt lifecycle, code studio UI, faculty submissions ledger, 39 submission tests + 8 sandbox configuration tests.
- **Phase 7 — Evaluation and Scoring:**
  - TestCase model (visible & hidden cases), Evaluation model (proportional score out of 10), deterministic output matcher with CRLF/LF normalization, 3-attempt hard cap, highest score retention, test case authoring modal, student evaluation history, 34/34 passing tests.
- **Phase 8 — Viva and Re-evaluation:**
  - VivaEvaluation model ($0 \le \text{marks} \le 5$), ReevaluationRequest model (`PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`), latest valid completed evaluation current-score rule (`isCurrent: true`), immutable history preservation, 32/32 passing tests.
- **Phase 9 — Notifications and Student Progress:**
  - Notification model, broadcast targeting (`ALL_STUDENTS`, `LAB`, `SECTION`, `INDIVIDUAL`), read/unread lifecycle, teacher-only soft-deletion, student progress tracker using real persisted evaluation data, 34/34 passing tests.
- **Phase 10 — Reports:**
  - **Report Categories Implemented (`backend/src/services/reportService.js`):**
    1. **Student Report (`getStudentReport`):** Official individual academic record showing enrolled labs, completed/pending experiments, highest automated score (/10), authoritative viva score (/5), final score (/15), and completion percentage.
    2. **Section Report (`getSectionReport`):** Cohort academic overview showing enrolled student rosters, individual progress, average scores, and cumulative section metrics.
    3. **Lab Report (`getLabReport`):** Aggregated laboratory performance summary across sections, cohort progress %, average combined score (/15), highest score, lowest score, and student-by-student breakdown.
    4. **Experiment Report (`getExperimentReport`):** Experiment-level submission stats, eligible students count, completed count, average auto score (/10), average viva score (/5), average final score (/15), highest and lowest scores.
    5. **Marks Report (`getMarksReport`):** Complete marks ledger strictly adhering to the scoring standard ($/10 + /5 = /15$, max 12 experiments per lab = 180 total), filtered by lab, section, experiment, or student.
    6. **Viva Report (`getVivaReport`):** Authoritative current viva voce assessment records ($/5$), remarks, versions, evaluating faculty, and evaluation dates.
    7. **Progress Report (`getProgressReport`):** Term-wide curriculum progress reports leveraging established `progressService` calculations.
  - **Export Engines:**
    - **PDF Generation (`backend/src/utils/pdfGenerator.js`):** Built with `pdfkit` featuring clean typography, institutional headers, metadata context pills, summary KPI blocks, striped data tables with auto-wrapping, pagination, and security-cleared footers.
    - **Excel Generation (`backend/src/utils/excelGenerator.js`):** Built with `exceljs` featuring styled header bars, metadata blocks, KPI summary rows, alternating table styling, and auto-computed column widths.
  - **Strict Server-Side Authorization & IDOR Protection:**
    - Identity derived strictly from JWT authentication (`req.user`).
    - **Student:** Can only view/download their own reports (attempts to view other student IDs or cohort reports return `403 Forbidden`).
    - **Teacher:** Restricted strictly to active assigned laboratories and sections (`MAIN` or `ASSISTANT`). Access to unassigned labs/sections rejected with `403 Forbidden`.
    - **Admin/HOD:** System-wide reporting access across all labs, sections, and cohorts.
  - **APIs:**
    - `GET /api/reports/student/:studentId` [STUDENT, TEACHER, ADMIN_HOD] (supports `?format=pdf|excel|json&labId=...`)
    - `GET /api/reports/section/:sectionId` [TEACHER, ADMIN_HOD] (supports `?format=pdf|excel|json&labId=...`)
    - `GET /api/reports/lab/:labId` [TEACHER, ADMIN_HOD] (supports `?format=pdf|excel|json&sectionId=...`)
    - `GET /api/reports/experiment/:experimentId` [TEACHER, ADMIN_HOD] (supports `?format=pdf|excel|json&sectionId=...`)
    - `GET /api/reports/marks` [STUDENT, TEACHER, ADMIN_HOD] (supports `?format=pdf|excel|json&labId=...&sectionId=...&experimentId=...&studentId=...`)
    - `GET /api/reports/viva` [STUDENT, TEACHER, ADMIN_HOD] (supports `?format=pdf|excel|json&labId=...&sectionId=...&experimentId=...&studentId=...`)
    - `GET /api/reports/progress` [STUDENT, TEACHER, ADMIN_HOD] (supports `?format=pdf|excel|json&labId=...&sectionId=...&studentId=...`)
  - **Frontend Integration:**
    - `frontend/src/services/reportService.js`: Unified API client with Blob download handlers for PDF and Excel files.
    - `frontend/src/pages/student/StudentReportsPage.jsx`: Student-facing reports hub with lab filter, KPI summary cards, performance table with score pill indicators, and one-click PDF / Excel downloads.
    - `frontend/src/pages/teacher/TeacherReportsPage.jsx`: Stitch-styled Faculty & Admin Reports Console with category tabs, dynamic filter controls (lab, section, experiment, student), live metadata inspection, KPI summary row, preview table, and one-click PDF / Excel exports.
    - `frontend/src/layouts/AppShellLayout.jsx`: Added "Reports & Export" / "Academic Reports" navigation links to the sidebar for all roles.
    - `frontend/src/routes/AppRoutes.jsx`: Registered `/student/reports`, `/teacher/reports`, and `/admin/reports`.
  - **Verification & Test Results:**
    - **Phase 10 Comprehensive & Security Tests:** 25/25 PASSED (100%)
    - **Total Regression Baseline:** 271/271 PASSED across Phases 1–10 (Phase 1: 23, Phase 2: 20, Phase 3: 16, Phase 4: 20, Phase 5: 20, Phase 6: 39 + 8 config, Phase 7: 34, Phase 8: 32, Phase 9: 34, Phase 10: 25)
    - **Frontend Production Build:** Built cleanly with Vite (0 errors)
    - **Docker Runtime Testing Status:**
      - Docker sandbox configuration/guardrail tests: PASSED (8/8).
      - Real Docker runtime integration testing remains pending because Docker is not currently available in the Windows development environment.

---

## Current Database Structure

- **Models Registry (`backend/src/models/index.js`):**
  - `User` (`backend/src/models/user.model.js`)
  - `Section` (`backend/src/models/section.model.js`)
  - `Lab` (`backend/src/models/lab.model.js`)
  - `LabAssignment` (`backend/src/models/labAssignment.model.js`)
  - `Experiment` (`backend/src/models/experiment.model.js`)
  - `Submission` (`backend/src/models/submission.model.js`)
  - `TestCase` (`backend/src/models/testCase.model.js`)
  - `Evaluation` (`backend/src/models/evaluation.model.js`)
  - `VivaEvaluation` (`backend/src/models/vivaEvaluation.model.js`)
  - `ReevaluationRequest` (`backend/src/models/reevaluationRequest.model.js`)
  - `Notification` (`backend/src/models/notification.model.js`)

---

## API Status

- `GET /api/health` — Working (200 OK)
- **Auth:** `login`, `change-password`, `me`, `logout` — Working
- **Users:** `GET /users`, `GET /users/:id`, `POST /users/teacher`, `POST /users/student`, `PUT /users/:id`, `PATCH /users/:id/status`, `POST /users/:id/reset-password` — Working
- **Sections:** `GET /sections`, `GET /sections/:id`, `POST /sections`, `PUT /sections/:id`, `PATCH /sections/:id/status`, `GET /sections/:id/students`, `POST /sections/:id/assign-student` — Working
- **Labs:** `GET /labs/assigned`, `GET /labs/:id`, `GET /labs`, `POST /labs`, `PUT /labs/:id`, `PATCH /labs/:id/status` — Working
- **Lab Assignments:** `GET /lab-assignments`, `POST /lab-assignments`, `DELETE /lab-assignments/:id` — Working
- **Experiments:** `GET /experiments`, `GET /experiments/:id`, `POST /experiments`, `PUT /experiments/:id`, `POST /experiments/:id/publish`, `POST /experiments/:id/schedule`, `POST /experiments/:id/reopen`, `POST /experiments/:id/close`, `PUT /experiments/reorder/batch`, `PATCH /experiments/:id/status`, `POST /experiments/extract-pdf`, `POST /experiments/confirm-pdf` — Working
- **Submissions:** `POST /submissions/run`, `POST /submissions/submit`, `GET /submissions/experiment/:experimentId`, `GET /submissions/lab/:labId`, `GET /submissions/:id` — Working
- **Test Cases:** `GET /test-cases/experiment/:experimentId`, `GET /test-cases/:id`, `POST /test-cases`, `PUT /test-cases/:id`, `PATCH /test-cases/:id/status`, `PUT /test-cases/order` — Working
- **Evaluations:** `GET /evaluations/experiment/:experimentId/student`, `GET /evaluations/submission/:submissionId`, `GET /evaluations/:id`, `GET /evaluations/lab/:labId` — Working
- **Viva Evaluations:** `GET /viva/experiment/:experimentId/eligible-students`, `POST /viva`, `GET /viva/experiment/:experimentId/student`, `GET /viva/experiment/:experimentId/history`, `GET /viva/lab/:labId`, `GET /viva/:id` — Working
- **Re-evaluations:** `POST /reevaluations`, `GET /reevaluations/experiment/:experimentId/my-request`, `GET /reevaluations/experiment/:experimentId`, `GET /reevaluations/lab/:labId`, `POST /reevaluations/:id/process` — Working
- **Notifications:** `POST /notifications`, `GET /notifications`, `GET /notifications/:id`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id` — Working
- **Progress:** `GET /progress/student`, `GET /progress/student/lab/:labId`, `GET /progress/lab/:labId`, `GET /progress/lab/:labId/student/:studentId` — Working
- **Reports:** `GET /reports/student/:studentId`, `GET /reports/section/:sectionId`, `GET /reports/lab/:labId`, `GET /reports/experiment/:experimentId`, `GET /reports/marks`, `GET /reports/viva`, `GET /reports/progress` — Working (JSON, PDF, Excel)