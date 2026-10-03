# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 14 — Testing & Quality Assurance**

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
  - Report categories (Student, Section, Lab, Experiment, Marks, Viva, Progress), vector PDF (`pdfkit`) and Excel (.xlsx `exceljs`) export engines, strict RBAC, 25/25 passing tests.
- **Phase 11 — Admin/HOD Dashboard:**
  - **Admin Dashboard Service (`backend/src/services/adminDashboardService.js`):**
    - Centralized telemetry aggregator computing system statistics (active/inactive counts for students, faculty, labs, sections, and experiment states), student rosters with completion metrics, faculty deployment matrices (MAIN/ASSISTANT assignments), lab curriculum telemetries, section cohort distributions, live timestamped activity stream (submissions, evaluations, vivas, re-evaluations, announcements), and performance benchmarks adhering to the `/10 + /5 = /15` rule.
  - **Strict Server-Side Authorization (`backend/src/routes/adminDashboard.routes.js`):**
    - Authenticated via JWT, verified against database `role === 'ADMIN_HOD'`. Unauthenticated or non-admin requests (teachers/students) are strictly rejected with `403 Forbidden`.
  - **APIs:**
    - `GET /api/admin/dashboard` [ADMIN_HOD] (Full aggregated dashboard payload)
    - `GET /api/admin/dashboard/statistics` [ADMIN_HOD] (System aggregate counts)
    - `GET /api/admin/dashboard/students` [ADMIN_HOD] (Student performance overview)
    - `GET /api/admin/dashboard/teachers` [ADMIN_HOD] (Faculty deployment matrix)
    - `GET /api/admin/dashboard/labs` [ADMIN_HOD] (Laboratory telemetry overview)
    - `GET /api/admin/dashboard/sections` [ADMIN_HOD] (Section cohort overview)
    - `GET /api/admin/dashboard/activity` [ADMIN_HOD] (Live administrative activity stream)
    - `GET /api/admin/dashboard/performance` [ADMIN_HOD] (Scoring & completion telemetry)
  - **Frontend Integration:**
    - `frontend/src/services/adminDashboardService.js`: API client for telemetry endpoints.
    - `frontend/src/pages/admin/AdminDashboardPage.jsx`: Stitch-styled Administrative Command Center featuring KPI telemetry cards, scoring health banner, global filters (Academic Year, Semester, Department), multi-tab inspection views (Command Center & Activity, Laboratories, Faculty Deployment, Student Cohorts, Section Rosters, Reports & Compliance shortcuts).
  - **Verification & Test Results:**
    - **Phase 11 Comprehensive & Security Tests:** 12/12 PASSED (100%)
    - **Total Regression Baseline:** 283/283 PASSED across Phases 1–11 (Phase 1: 23, Phase 2: 20, Phase 3: 16, Phase 4: 20, Phase 5: 20, Phase 6: 39 + 8 config, Phase 7: 34, Phase 8: 32, Phase 9: 34, Phase 10: 25, Phase 11: 12)
    - **Frontend Production Build:** Built cleanly with Vite (0 errors)
    - **Docker Runtime Testing Status:**
      - Docker sandbox configuration/guardrail tests: PASSED (8/8).
      - Real Docker runtime integration testing remains pending because Docker is not currently available in the Windows development environment.

- **Phase 12 — UI Refinement & Stitch Alignment:**
  - **Status:** COMPLETE
  - **Stitch References Reviewed:**
    - `Stitch_files/academic_precision/`
    - `Stitch_files/experiment_authoring_multi_step_pdf_extraction_suite/`
    - `Stitch_files/lab_management_system_shared_ui_system_component_showcase/`
    - `Stitch_files/lms_application_shell_dashboard_layout/`
    - `Stitch_files/lms_login_change_temporary_password_flows/`
    - `Stitch_files/manage_laboratories_experiment_management_console/`
    - `Stitch_files/student_dashboard_assigned_laboratories_hub/`
    - `Stitch_files/student_experiment_details_submission_suite_teacher_feedback/`
    - `Stitch_files/student_submissions_ledger_evaluation_console/`
    - `Stitch_files/student_lab_details_experiment_curriculum/`
    - `Stitch_files/teacher_dashboard_laboratory_console/`
    - `Stitch_files/teacher_notifications_management_profile_security/`
  - **UI Areas Refined:**
    - **Shared Design System:** Comprehensive tokens in `designTokens.css` and standardized utility classes in `index.css` for `.blueprint-grid`, `.btn` variants (`.btn-primary`, `.btn-secondary`, `.btn-teal`, `.btn-danger`, `.btn-sm`), `.card`, `.badge` variants (`.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info`, `.badge-primary`, `.badge-neutral`), `.table-academic`, `.table-container`, `.score-pill` variants, `.form-group`, `.form-input`, `.form-select`, `.form-textarea`, and `.empty-state`.
    - **Application Shell (`AppShellLayout.jsx`):** Integrated Google Material Symbols Outlined, dynamic breadcrumb context, active navigation indicator, collapse/expand transition, responsive layout handling, notification indicator, and updated footer metadata.
    - **Authentication (`LoginPage.jsx`, `ChangePasswordPage.jsx`):** Stitch-aligned styling with security gate alert, role selector quick tabs, password entropy meters, and clean validation states.
    - **Admin Hub (`AdminDashboardPage.jsx`, `LabManagementPage.jsx`, `SectionManagementPage.jsx`, `TeacherManagementPage.jsx`, `StudentManagementPage.jsx`, `LabAssignmentPage.jsx`):** Standardized KPI cards, status badges, search and filter controls, modal dialogs, and table spacing.
    - **Teacher Console (`TeacherLabDashboardPage.jsx`, `TeacherExperimentManagementPage.jsx`, `PdfExperimentExtractionPage.jsx`, `TeacherSubmissionsLedgerPage.jsx`, `TeacherNotificationsPage.jsx`, `TeacherReportsPage.jsx`):** Consistent multi-step syllabus extraction, test case manager modal, viva voce grader modal, submissions ledger, and report download controls.
    - **Student Hub (`StudentLabDashboardPage.jsx`, `StudentExperimentDetailPage.jsx`, `StudentReportsPage.jsx`):** Streamlined Code Studio, test runner output tabs, official submission confirmation, authoritatively preserved `/10` Auto + `/5` Viva = `/15` Final scoring cards, and report download workflows.
    - **Shared Components:** Enhanced `LoadingSpinner.jsx` (supporting dual `text`/`message` props) and `Header.jsx`.
  - **Verification & Test Results:**
    - **Backend Regression Tests:** 283/283 PASSED across all phases.
    - **Frontend Production Build:** Built cleanly with Vite (0 errors).
    - **Docker Runtime Testing Status:** Docker sandbox configuration tests pass; real Docker runtime integration testing remains pending because Docker is not available in the Windows environment.

- **Phase 13 — Security, Validation & Hardening:**
  - **Status:** COMPLETE
  - **Security Audit & Hardening Implemented:**
    - **Authentication & Password Hardening:** Enforced account active-state checks, token expiration/signature verification, strict password entropy (minimum 8 characters, uppercase, number, symbol), temporary-password security gate, and prevention of reusing current temporary passwords as new passwords.
    - **Secret & Token Leak Protection:** Strict User schema `toJSON` sanitization stripping `passwordHash` and `__v`, secure `comparePassword` handling, and minimal non-sensitive JWT payloads (`userId`, `role`, `mustChangePassword`).
    - **Role Authorization & Spoofing Defense:** Server-authoritative role resolution ignoring client-supplied role/identity parameters in request body or queries. Verified access controls across `ADMIN_HOD`, `TEACHER`, and `STUDENT` roles.
    - **IDOR & Scope Isolation:** Enforced strict multi-tenant boundary checks across submissions, evaluations, viva voicings, re-evaluations, lab curricula, section cohorts, notifications, and reports. Students cannot view or tamper with other students' records; teachers cannot modify or grade outside assigned lab/section pairs.
    - **Mass-Assignment Defense:** Whitelisted updatable fields in user management, experiment authoring, lab management, and section allocations; protected fields (`role`, `passwordHash`, `createdBy`, `lab`, `score`, `attemptNumber`, `isHighestScore`, `version`) cannot be forged via client payloads.
    - **Input Validation & Type Guards:** Sanitized MongoDB ObjectIds via `validateObjectIdParam` returning controlled `400 Bad Request` without leaking raw Mongoose stack traces. Formatted malformed JSON `SyntaxError` instances to clean responses. Enforced numeric boundaries ($0 \le \text{viva} \le 5$, $1 \le \text{experimentNumber} \le 12$, positive marks, string scalar guards). Added `validateAssignStudentInput`.
    - **File Upload & PDF Extraction Security:** Multipart upload validations with MIME type check, 10MB file size limits, `%PDF-` magic header verification, empty file rejection, and transient memory parsing preventing filesystem path traversal.
    - **Code Execution Sandbox Audit:** Confirmed Docker container isolation parameters (`--network none`, `--user 1000:1000`, `--cap-drop ALL`, `--security-opt no-new-privileges`, `--cpus 1.0`, `--memory 256m`, `--pids-limit 64`), execution timeouts (5000ms), 64KB source code limit, 16KB stdin limit, and safe fallback reporting (`EXECUTION_ERROR`) without host execution fallback.
    - **Defensive Headers & Rate Limiting:** Added `securityHeaders` middleware (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-XSS-Protection: 0`, `X-Download-Options: noopen`, `X-Permitted-Cross-Domain-Policies: none`, `app.disable('x-powered-by')`) and sliding-window `rateLimiter` on auth, code execution, and upload routes.
  - **Verification & Test Results:**
    - **Phase 13 Dedicated Security Test Suite:** 34/34 PASSED (`backend/src/tests/security_hardening.test.js`)
    - **Total Regression Suite:** 317/317 PASSED (283 baseline + 34 Phase 13)
    - **Frontend Production Build:** Built cleanly with Vite (0 errors)
    - **Docker Runtime Testing Status:** Docker sandbox configuration and guardrail tests pass; real Docker runtime integration testing remains pending because Docker is unavailable on the current Windows development environment.

- **Phase 14 — Testing & Quality Assurance:**
  - **Status:** COMPLETE
  - **Quality Assurance Scope & Verification:**
    - **Authentication & Token Lifecycle:** Verified token signing, expiration timestamp integrity, inactive user blocking, temporary password access gate, and password complexity/reuse validations.
    - **Academic Structure & Hierarchy:** Verified section code alphanumeric rules, semester constraints, active assignment validation, single MAIN teacher invariant (409 Conflict), multiple ASSISTANT support, and uppercase section assignment normalization.
    - **Lab Access Layer & Scope Isolation:** Tested assigned laboratories hub for Student, Teacher, and Admin roles.
    - **Experiment Lifecycle State Machine:** Tested 12-experiment ceiling, duplicate experiment number rejection (409 Conflict), valid status progression (`DRAFT` $\to$ `SCHEDULED` $\to$ `PUBLISHED` $\to$ `CLOSED` $\to$ `REOPENED`), future deadline validation, and batch reordering.
    - **PDF Syllabus Extraction:** Verified non-publishing candidate extraction, capacity checks on confirmation, and default `DRAFT` status initialization.
    - **Code Execution & Submission Rigor:** Verified 3-attempt hard cap, 4th attempt rejection (400), manual run attempt-neutrality, sequential `attemptNumber` tracking, execution timeout (5000ms), and 64KB source size limits.
    - **Automated Evaluation & Scoring:** Tested proportional `/10` score formula, zero-marks division safety, student hidden test-case output redaction, and `isHighestScore` dynamic recalculation.
    - **Viva Voce & Re-evaluation:** Verified $0 \le \text{marks} \le 5$, `/10 Automated + /5 Viva = /15 Total` combined score, and version incrementing ($v_1 \to v_2$) with historical record archiving.
    - **Notifications & Progress:** Verified target matrix validation (`ALL_STUDENTS`, `LAB`, `SECTION`, `INDIVIDUAL`), idempotent read marking, zero-experiment progress safety, and cohort progress aggregation.
    - **Report Exports:** Verified binary buffer generation with `%PDF` and `PK` zip magic headers, and empty-dataset resilience.
    - **Admin Dashboard Telemetry:** Verified system aggregate counts, live telemetry stream, and role enforcement (403 Forbidden for non-admin).
  - **Verification & Test Results:**
    - **Phase 14 Dedicated QA Test Suite:** 40/40 PASSED (`backend/src/tests/qa_comprehensive.test.js`)
    - **Total Regression Suite:** 357/357 PASSED across 16 test suites (Phase 1–14: 23 + 20 + 16 + 20 + 20 + 39 + 8 + 34 + 32 + 34 + 25 + 12 + 34 + 40 = 357)
    - **Frontend Production Build:** Built cleanly with Vite in 5.54s (0 errors, 139 modules)
    - **Manual QA Status:** PASS across all functional flows
    - **Docker Runtime Testing Status:** Configuration and guardrail tests pass; real Docker container runtime testing remains pending due to Windows development environment without Docker daemon.

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
- **Admin Dashboard:** `GET /admin/dashboard`, `GET /admin/dashboard/statistics`, `GET /admin/dashboard/students`, `GET /admin/dashboard/teachers`, `GET /admin/dashboard/labs`, `GET /admin/dashboard/sections`, `GET /admin/dashboard/activity`, `GET /admin/dashboard/performance` — Working