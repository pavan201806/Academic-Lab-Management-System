# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 6 — Code Execution and Submission**

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
  - **Submission Model (`backend/src/models/submission.model.js`):**
    - Fields: `student` (ref User), `experiment` (ref Experiment), `lab` (ref Lab), `section` (ref Section), `attemptNumber` (1, 2, or 3), `language` (`['C', 'C++', 'Java', 'Python']`), `sourceCode` (max 64KB), `stdin` (max 16KB), `status` (`SUBMITTED`, `SUCCESS`, `COMPILE_ERROR`, `RUNTIME_ERROR`, `TIMEOUT`, `OUTPUT_LIMIT`, `EXECUTION_ERROR`), `executionOutput` (stdout, stderr, exitCode, executionTimeMs), `submittedAt`, `active`, compound indexes for student/experiment attempt lookups and lab submissions ledger.
  - **Dedicated Execution Runner Image (`docker/runner.Dockerfile`):**
    - Ubuntu 22.04 base with Python 3, OpenJDK 21, GCC, and G++.
    - Unprivileged `runner` user (`1000:1000`).
    - Ephemeral workspace mounted at `/workspace`.
  - **Docker Container Execution Engine (`backend/src/services/codeExecutionService.js`):**
    - Ephemeral isolated Docker container spawned for every execution (`docker run --rm --name lab_runner_<id>`).
    - Security options: `--network none`, `--user 1000:1000`, `--cap-drop ALL`, `--security-opt no-new-privileges`.
    - Resource controls: `--cpus 1.0`, `--memory 256m`, `--pids-limit 64`.
    - Host mounts: ONLY the ephemeral temporary directory is mounted at `/workspace:rw`. No backend source code, `.env` secrets, or host filesystem is mounted.
    - Strict Limits: 5000ms hard timeout (dispatches `SIGKILL` and `docker kill`), 64KB max output buffer (`OUTPUT_LIMIT`), 64KB max source code, 16KB max stdin.
    - Zero shell string concatenation (all invocations use structured argument arrays).
    - Teardown: Ephemeral temporary directories are removed in `finally` blocks.
  - **Submission Business Logic (`backend/src/services/submissionService.js`):**
    - `validateStudentAccess`: Verifies active student account, enrolled section, active lab assignment to section, and experiment status (`PUBLISHED` or `REOPENED`). Prevents cross-cohort and cross-lab IDOR.
    - `runCode`: Manual test execution. Runs student code in sandbox with custom stdin, returning execution result without saving to MongoDB or consuming attempts.
    - `submitCode`: Official submission. Re-validates student access and experiment allowed languages, enforces strict 3-attempt limit (`Submission.countDocuments < 3`), increments `attemptNumber`, executes code, and persists immutable `Submission` record.
    - `getStudentSubmissions`: Returns chronological list of student's attempts for an experiment.
    - `getSubmissionById`: Strict authorization allowing student to view own submission, and assigned teacher/admin to view student submissions in assigned lab.
    - `getTeacherSubmissionsForLab`: Faculty ledger of all submissions for a laboratory with optional experiment filtering.
  - **Validation & Routing (`backend/src/validators/submission.validator.js`, `backend/src/routes/submission.routes.js`, `backend/src/controllers/submission.controller.js`):**
    - `POST /api/submissions/run` [STUDENT]
    - `POST /api/submissions/submit` [STUDENT]
    - `GET /api/submissions/experiment/:experimentId` [STUDENT]
    - `GET /api/submissions/lab/:labId` [TEACHER, ADMIN_HOD]
    - `GET /api/submissions/:id` [STUDENT, TEACHER, ADMIN_HOD]
  - **Frontend Components & Pages:**
    - `frontend/src/services/submissionService.js`: API client methods for run, submit, student history, and teacher lab ledger.
    - `frontend/src/components/code/CodeEditor.jsx`: Modern syntax-styled code editor with line numbers gutter, tab key handling (inserts 2 spaces, avoids focus blur), character & line count gauges, and dark theme matching Stitch.
    - `frontend/src/pages/student/StudentExperimentDetailPage.jsx`:
      - Code Studio tab with language selector (filtered to allowed languages), starter template reset, collapsible custom stdin drawer, "Run Code" test run button, "Official Submit" button with confirmation modal & attempt counter, interactive terminal output console with stdout/stderr tabs, execution time badge, and status badges.
      - Protocol Guide tab with objective, instructions, and procedure details.
      - Official Submissions History tab with attempt breakdown, status badges, and source code / output inspection modal.
    - `frontend/src/pages/teacher/TeacherSubmissionsLedgerPage.jsx`:
      - Faculty Submissions Ledger for labs with search, experiment filters, status filters, table view of student attempts, and code inspection modal.
    - Registered routes in `AppRoutes.jsx`: `/teacher/labs/:labId/submissions` and `/admin/labs/:labId/submissions`.
  - **Test Suite (`backend/src/tests/submission.test.js`, `backend/src/tests/sandbox.security.test.js`):**
    - 39 Phase 6 submission & RBAC tests covering experiment access, allowed languages, execution lifecycle, attempt increments, 3-attempt limits, immutability, and faculty ledger.
    - 8 Sandbox Security Configuration & Guardrail tests verifying Docker command arguments (`--network none`, `--user 1000:1000`, `--cap-drop ALL`, `--security-opt no-new-privileges`, `--memory 256m`, `--cpus 1.0`, `--pids-limit 64`), direct host execution fallback rejection, payload limits, and ephemeral workspace isolation.
    - **Regression Suite Result:** **125/125 unit, RBAC, and configuration tests passing (100%)** across Phases 1 through 6.
    - **Important Runtime Testing Status:**
      - Phase 6 Docker-based execution isolation has been implemented in `backend/src/services/codeExecutionService.js`.
      - Direct host execution fallback is strictly disabled (when Docker is unavailable, safe `EXECUTION_ERROR` is returned without host process execution).
      - Docker configuration and security guardrail tests pass cleanly.
      - Full Phase 1–6 regression tests pass cleanly.
      - **Real Docker runtime integration tests have NOT been executed on the current Windows development machine because Docker is unavailable in PATH.**
      - Real Docker integration testing remains pending for an environment with Docker available.

---

## Currently Working On

- Phase 6 Docker execution isolation implemented and verified against unit/RBAC/configuration suites. Real Docker runtime integration testing pending an environment with Docker available. Ready for review.

---

## Next Tasks

1. **Phase 7 — Automated Grading & Evaluation (Future Phase):**
   - Test cases (visible + hidden) engine.
   - Proportional marks calculation.
   - Attempt scoring logic.

---

## Important Decisions

### Manual Run vs. Official Submission
- **Manual Run (`POST /api/submissions/run`):**
  - Designed solely for student testing and debugging.
  - Does NOT persist anything to MongoDB.
  - Does NOT consume any official attempt.
  - Does NOT affect evaluation scores.
- **Official Submit (`POST /api/submissions/submit`):**
  - Consumes an official attempt (strictly maximum 3 attempts per experiment).
  - Creates an immutable `Submission` record in MongoDB.
  - Captures execution status, stdout, stderr, and runtime metrics.

### Security Isolation
- **Environment Sanitization:** Strips all process environment variables (`MONGO_URI`, `JWT_SECRET`, etc.) before spawning child compilers and runtimes.
- **Filesystem Isolation:** Every execution occurs in an ephemeral `os.tmpdir()/lab_sandbox_<uuid>` folder, wiped after execution.
- **Resource Capping:** 5000ms hard timeout, 64KB max output buffer, 64KB max source code, 16KB max stdin.
- **Path Sanitization:** Replaces internal host filesystem paths from stderr output with `/sandbox`.

---

## Current Database Structure

- **Models Registry (`backend/src/models/index.js`):**
  - `User` (`backend/src/models/user.model.js`)
  - `Section` (`backend/src/models/section.model.js`)
  - `Lab` (`backend/src/models/lab.model.js`)
  - `LabAssignment` (`backend/src/models/labAssignment.model.js`)
  - `Experiment` (`backend/src/models/experiment.model.js`)
  - `Submission` (`backend/src/models/submission.model.js`):
    - `student` (ref User), `experiment` (ref Experiment), `lab` (ref Lab), `section` (ref Section), `attemptNumber` (1-3), `language` (`['C', 'C++', 'Java', 'Python']`), `sourceCode`, `stdin`, `status` (`SUBMITTED`, `SUCCESS`, `COMPILE_ERROR`, `RUNTIME_ERROR`, `TIMEOUT`, `OUTPUT_LIMIT`, `EXECUTION_ERROR`), `executionOutput`, `submittedAt`, `active`, timestamps.

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