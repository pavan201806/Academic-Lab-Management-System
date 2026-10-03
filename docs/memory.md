# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 9 — Notifications and Student Progress**

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
  - **Notification Model (`backend/src/models/notification.model.js`):**
    - `title` (max 200 chars), `message` (max 2000 chars), `type` (`GENERAL`, `EXPERIMENT`, `DEADLINE`, `LAB`, `ANNOUNCEMENT`), `createdBy` (ref User), `targetType` (`ALL_STUDENTS`, `LAB`, `SECTION`, `INDIVIDUAL`), `targetStudents` (refs User), `targetSections` (refs Section), `targetLabs` (refs Lab), `readBy` (`[{ student, readAt }]`), `active` (soft deletion), timestamps.
    - Compound indexes: `{ createdBy: 1, active: 1 }`, `{ targetLabs: 1, active: 1 }`, `{ targetSections: 1, active: 1 }`, `{ targetStudents: 1, active: 1 }`, `{ targetType: 1, active: 1, createdAt: -1 }`, `{ active: 1, createdAt: -1 }`.
  - **Notification Scoping & RBAC:**
    - **Teacher:** Can broadcast notifications targeted to their assigned laboratories, sections, or students enrolled in their assigned sections. Cannot target unauthorized labs/sections/students. Can delete only notifications they authored (soft delete `active: false`).
    - **Admin (ADMIN_HOD):** Global broadcast and management across all labs and sections.
    - **Student:** Receives only notifications matching their enrolled lab, section, individual ID, or `ALL_STUDENTS`. Can view unread count, mark single notice as read, or mark all as read. Strictly prohibited from creating or deleting notifications (403 Forbidden).
  - **Student Progress Tracking (`backend/src/services/progressService.js`):**
    - Calculated using real persisted data from Phase 4–8 (published experiments, official submissions, highest automated score out of 10, active viva marks out of 5, total score out of 15).
    - Excludes unattempted/inactive records from completed count.
    - Computes `totalExperiments`, `completedExperiments`, `pendingExperiments`, `completionPercentage`, `averageAutomatedScore`, `averageVivaScore`, and `averageTotalScore` (/15).
  - **APIs:**
    - `POST /api/notifications` [TEACHER, ADMIN_HOD]
    - `GET /api/notifications` [STUDENT, TEACHER, ADMIN_HOD]
    - `GET /api/notifications/:id` [STUDENT, TEACHER, ADMIN_HOD]
    - `PATCH /api/notifications/:id/read` [STUDENT]
    - `PATCH /api/notifications/read-all` [STUDENT]
    - `DELETE /api/notifications/:id` [TEACHER, ADMIN_HOD]
    - `GET /api/progress/student` [STUDENT]
    - `GET /api/progress/student/lab/:labId` [STUDENT]
    - `GET /api/progress/lab/:labId` [TEACHER, ADMIN_HOD]
    - `GET /api/progress/lab/:labId/student/:studentId` [TEACHER, ADMIN_HOD]
  - **Frontend Integration:**
    - `frontend/src/services/notificationService.js` & `frontend/src/services/progressService.js`: Full API clients.
    - `frontend/src/components/notifications/NotificationDrawer.jsx`: Header bell drawer for reading notices, unread filtering, and marking as read/all read.
    - `frontend/src/pages/teacher/TeacherNotificationsPage.jsx`: Stitch-styled Notifications & Broadcaster console with KPI cards, announcements ledger, create drawer with live student feed preview, and teacher-only delete modal.
    - `frontend/src/components/progress/StudentProgressModal.jsx`: Teacher cohort progress tracker with student-by-student completion breakdown and experiment score inspection.
    - `frontend/src/pages/student/StudentLabDashboardPage.jsx`: Live student progress metric cards (enrolled labs, completed/pending experiments, average score /15) and per-lab progress bars.
  - **Verification & Test Results:**
    - **Phase 9 Comprehensive Tests:** 34/34 PASSED (100%)
    - **Total Backend Tests:** 246/246 PASSED across Phases 1–9 (Phase 1: 23, Phase 2: 20, Phase 3: 16, Phase 4: 20, Phase 5: 20, Phase 6: 39 + 8 config, Phase 7: 34, Phase 8: 32, Phase 9: 34)
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
  - `Notification` (`backend/src/models/notification.model.js`):
    - `title`, `message`, `type`, `createdBy`, `targetType`, `targetStudents`, `targetSections`, `targetLabs`, `readBy`, `active`

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