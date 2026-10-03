# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 8 — Viva and Re-evaluation**

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
  - **VivaEvaluation Model (`backend/src/models/vivaEvaluation.model.js`):**
    - `student` (ref User), `experiment` (ref Experiment), `lab` (ref Lab), `section` (ref Section), `evaluatedBy` (ref User), `marks` ($0 \le \text{marks} \le 5$, with max 2 decimal precision), `remarks` (max 1000 chars), `status` (`EVALUATED`, `RE_EVALUATED`), `evaluationVersion` (default 1, increments on re-evaluation), `isCurrent` (Boolean, true for active score), `reevaluationRequest` (ref ReevaluationRequest), `evaluatedAt` (Date), timestamps.
    - Compound indexes: `{ student: 1, experiment: 1, isCurrent: 1 }`, `{ experiment: 1, section: 1 }`, `{ lab: 1, experiment: 1 }`, `{ evaluatedBy: 1 }`.
  - **ReevaluationRequest Model (`backend/src/models/reevaluationRequest.model.js`):**
    - `student` (ref User), `experiment` (ref Experiment), `lab` (ref Lab), `section` (ref Section), `vivaEvaluation` (ref VivaEvaluation), `reason` (string, max 1000 chars), `status` (`PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`), `requestedAt` (Date), `reviewedBy` (ref User), `reviewedAt` (Date), `reviewRemarks` (max 1000 chars), `newVivaEvaluation` (ref VivaEvaluation), timestamps.
    - Compound indexes: `{ student: 1, experiment: 1, status: 1 }`, `{ experiment: 1, status: 1 }`, `{ lab: 1, status: 1 }`.
  - **Business Rules & Scoring:**
    - **Viva Marks:** $0 \le \text{marks} \le 5$. Validated strictly on backend (e.g., 0, 2.5, 5 are valid; >5, <0, or NaN rejected).
    - **Scoring Boundary:** Automated evaluation score (/10) from Phase 7 + Viva score (/5) = Conceptual academic score (/15).
    - **Current Score Rule:** Exactly one valid completed Viva evaluation has `isCurrent: true` per student + experiment. When a re-evaluation is completed, the previous evaluation is marked `isCurrent: false` (preserved immutably in history) and the new evaluation is created with `evaluationVersion: previousVersion + 1` and `isCurrent: true`. The latest valid completed evaluation is the active Viva score.
    - **Re-evaluation Workflow:**
      - Eligible student can submit a re-evaluation request for their own completed Viva if no pending request exists.
      - Assigned faculty (`MAIN` or `ASSISTANT`) or `ADMIN_HOD` reviews the request.
      - Faculty can **Reject** (status `REJECTED`, requires review remarks) or **Approve & Re-evaluate** (status `COMPLETED`, records review remarks, archives old evaluation, creates new `VivaEvaluation` version).
  - **APIs & Authorization:**
    - `GET /api/viva/experiment/:experimentId/eligible-students` [TEACHER, ADMIN_HOD]
    - `POST /api/viva` [TEACHER, ADMIN_HOD]
    - `GET /api/viva/experiment/:experimentId/student` [STUDENT, TEACHER, ADMIN_HOD]
    - `GET /api/viva/experiment/:experimentId/history` [STUDENT, TEACHER, ADMIN_HOD]
    - `GET /api/viva/lab/:labId` [TEACHER, ADMIN_HOD]
    - `GET /api/viva/:id` [STUDENT, TEACHER, ADMIN_HOD]
    - `POST /api/reevaluations` [STUDENT]
    - `GET /api/reevaluations/experiment/:experimentId/my-request` [STUDENT]
    - `GET /api/reevaluations/experiment/:experimentId` [TEACHER, ADMIN_HOD]
    - `GET /api/reevaluations/lab/:labId` [TEACHER, ADMIN_HOD]
    - `POST /api/reevaluations/:id/process` [TEACHER, ADMIN_HOD]
  - **Frontend Integration:**
    - `frontend/src/services/vivaService.js` & `frontend/src/services/reevaluationService.js`: Full API clients.
    - `frontend/src/components/viva/VivaManagementModal.jsx`: Teacher Viva Management modal supporting Student selection, Live grading, Remarks entry, Re-evaluation queue processing with Approve/Reject actions, and Version history inspection.
    - `frontend/src/pages/student/StudentExperimentDetailPage.jsx`: Score summary card displaying Automated Score (/10), Viva Score (/5), Total Score (/15), Viva status & evaluator remarks, "Request Re-evaluation" action modal, pending request status banner, and historical versions timeline.
    - `frontend/src/pages/teacher/TeacherExperimentManagementPage.jsx`: Integrated "Viva Assessment" launch button with live badge counter.
  - **Verification & Test Results:**
    - **Phase 8 Comprehensive Tests:** 32/32 PASSED (100%)
    - **Total Backend Tests:** 212/212 PASSED across Phases 1–8 (Phase 1: 23, Phase 2: 20, Phase 3: 16, Phase 4: 20, Phase 5: 20, Phase 6: 39 + 8 config, Phase 7: 34, Phase 8: 32)
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
  - `VivaEvaluation` (`backend/src/models/vivaEvaluation.model.js`):
    - `student`, `experiment`, `lab`, `section`, `evaluatedBy`, `marks` ($[0, 5]$), `remarks`, `status`, `evaluationVersion`, `isCurrent`, `reevaluationRequest`, `evaluatedAt`
  - `ReevaluationRequest` (`backend/src/models/reevaluationRequest.model.js`):
    - `student`, `experiment`, `lab`, `section`, `vivaEvaluation`, `reason`, `status`, `requestedAt`, `reviewedBy`, `reviewedAt`, `reviewRemarks`, `newVivaEvaluation`

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