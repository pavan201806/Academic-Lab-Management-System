# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 5 — PDF Experiment Extraction**

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
  - **PDF Extraction Engine (`backend/src/services/pdfExtractionService.js`):**
    - Parses text-based laboratory PDF manuals using `pdf-parse`.
    - Magic byte header validation (`%PDF-`), rejection of corrupt, empty, non-PDF, or image-only scanned files.
    - Pattern recognition for experiment headings (`Experiment N:`, `EXP N`, `N.`, Roman numerals), academic objectives, descriptions, procedures, and programming language whitelist (`C`, `C++`, `Java`, `Python`).
    - Maximum 12 experiment normalization with sequential fallback numbering.
  - **Memory-Based File Upload Middleware (`backend/src/middleware/upload.js`):**
    - Secure `multer` memory storage (no orphaned temporary files on disk), 10MB size limit, MIME/extension filter.
  - **Experiment Service & Endpoints (`backend/src/services/experimentService.js`, `backend/src/controllers/experiment.controller.js`, `backend/src/routes/experiment.routes.js`):**
    - `POST /api/experiments/extract-pdf`: Accepts multipart PDF, validates lab write access, extracts candidate experiments into a temporary reviewable structure without database persistence.
    - `POST /api/experiments/confirm-pdf`: Re-authorizes faculty/admin access, strictly validates batch constraints (unique numbers, 1–12 bounds, active capacity <= 12, non-collision with existing DB experiments), creates `DRAFT` experiment documents.
  - **Backend Test Suite (`backend/src/tests/pdf.extraction.test.js`):**
    - 20 unit and RBAC tests covering PDF header validation, corrupt file handling, text extraction, numbering patterns, max 12 limits, no-persist on extract, review confirmation, duplicate number rejection, capacity rejection, teacher RBAC, and IDOR protection. 100% passing.
  - **Frontend Multi-Step Extraction Suite (`frontend/src/pages/teacher/PdfExperimentExtractionPage.jsx`):**
    - Built according to Stitch reference (`experiment_authoring_multi_step_pdf_extraction_suite`):
      - Step 1: Drag & drop PDF upload zone with size/format checks.
      - Step 2: Extraction progress and status animation.
      - Step 3: Editable review table (inline title & sequence editing, detailed properties modal, add custom row, remove row, duplicate warnings, and capacity indicators).
      - Actions: Discard & Return or Confirm & Save to persist into laboratory curriculum.
    - Integrated with `TeacherExperimentManagementPage.jsx` via "Import from PDF Manual" action button.
    - Registered routes in `AppRoutes.jsx`: `/admin/labs/:labId/experiments/import-pdf` and `/teacher/labs/:labId/experiments/import-pdf`.

---

## Currently Working On

- Phase 5 complete and verified. Ready for checkpoint review.

---

## Next Tasks

1. **Phase 6 — Code Execution & Compiler Sandbox (Future Phase):**
   - In-browser code editor (Monaco / CodeMirror).
   - Backend compiler sandbox execution engine for C, C++, Java, and Python.

---

## Important Decisions

### PDF Extraction & Review Workflow
- **No Automatic DB Persistence on Extract:**
  - `POST /api/experiments/extract-pdf` parses and returns transient JSON only.
  - Experiments are only saved to MongoDB when the teacher explicitly confirms via `POST /api/experiments/confirm-pdf`.
- **Text-Based PDF Requirement:**
  - Operates on text-based PDFs. Scanned/image-only PDFs gracefully return an informative error requesting text-based documents.
- **Strict Capacity & Collision Checks on Confirmation:**
  - Backend re-validates the entire confirmation payload: `existingActiveCount + batch.length <= 12`, distinct 1–12 numbers, and non-collision with existing active experiments.

---

## Current Database Structure

- **Models Registry (`backend/src/models/index.js`):**
  - `User` (`backend/src/models/user.model.js`)
  - `Section` (`backend/src/models/section.model.js`)
  - `Lab` (`backend/src/models/lab.model.js`)
  - `LabAssignment` (`backend/src/models/labAssignment.model.js`)
  - `Experiment` (`backend/src/models/experiment.model.js`):
    - `lab` (ref: Lab), `title`, `experimentNumber` (1-12), `description`, `objective`, `instructions`, `programmingLanguages` (`['C', 'C++', 'Java', 'Python']`), `status` (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `CLOSED`, `REOPENED`), `scheduledAt`, `deadline`, `reopenedUntil`, `order` (1-12), `publishedAt`, `active`, `createdBy` (ref: User), timestamps.

---

## API Status

- `GET /api/health` — Working (200 OK)
- **Auth:** `login`, `change-password`, `me`, `logout` — Working
- **Users:** `GET /users`, `GET /users/:id`, `POST /users/teacher`, `POST /users/student`, `PUT /users/:id`, `PATCH /users/:id/status`, `POST /users/:id/reset-password` — Working
- **Sections:** `GET /sections`, `GET /sections/:id`, `POST /sections`, `PUT /sections/:id`, `PATCH /sections/:id/status`, `GET /sections/:id/students`, `POST /sections/:id/assign-student` — Working
- **Labs:** `GET /labs/assigned`, `GET /labs/:id`, `GET /labs`, `POST /labs`, `PUT /labs/:id`, `PATCH /labs/:id/status` — Working
- **Lab Assignments:** `GET /lab-assignments`, `POST /lab-assignments`, `PATCH /lab-assignments/:id/status`, `GET /lab-assignments/lab/:labId`, `GET /lab-assignments/section/:sectionId`, `GET /lab-assignments/teacher/:teacherId` — Working
- **Experiments:**
  - `GET /api/experiments` — Working (200 OK)
  - `GET /api/experiments/:id` — Working (200 OK / 403 / 404)
  - `POST /api/experiments` — Working (201 Created / 400 / 403 / 409)
  - `PUT /api/experiments/:id` — Working (200 OK / 400 / 403 / 404)
  - `PATCH /api/experiments/:id/status` — Working (200 OK)
  - `POST /api/experiments/:id/publish` — Working (200 OK)
  - `POST /api/experiments/:id/schedule` — Working (200 OK)
  - `POST /api/experiments/:id/reopen` — Working (200 OK)
  - `POST /api/experiments/:id/close` — Working (200 OK)
  - `PUT /api/experiments/order` — Working (200 OK)
  - `PATCH /api/experiments/:id/deactivate` — Working (200 OK)
  - `POST /api/experiments/extract-pdf` — Working (200 OK with transient extracted data / 400 / 403)
  - `POST /api/experiments/confirm-pdf` — Working (201 Created with persisted DRAFT experiments / 400 / 403 / 409)

---

## Known Issues

- None.

---

## Verification & Limitations

- **Text-Based PDFs vs. Scanned Images:** Extraction uses text-layer parsing (`pdf-parse`). Pure scanned image PDFs without embedded text streams are gracefully rejected with a helpful user-facing error message asking the faculty to provide a text-based document or use manual creation.
- **Strict Scope Boundaries Maintained:** Code editor, compilation sandbox, code runner, test cases, student submissions, automated evaluations, viva, and notifications were strictly NOT implemented in Phase 5.

---

## Important Files

### Phase 5 Files
- `backend/src/services/pdfExtractionService.js` (PDF Text Extraction and Experiment Regex Parser)
- `backend/src/middleware/upload.js` (Multer memory upload middleware with PDF validation)
- `backend/src/services/experimentService.js` (Added `extractExperimentsFromPdf` and `confirmExtractedExperiments`)
- `backend/src/controllers/experiment.controller.js` (Added `extractPdfExperiments` and `confirmPdfExperiments`)
- `backend/src/routes/experiment.routes.js` (Mounted `/extract-pdf` and `/confirm-pdf`)
- `backend/src/validators/experiment.validator.js` (Added `validateConfirmPdfInput`)
- `backend/src/tests/pdf.extraction.test.js` (Phase 5 Unit and RBAC Test Suite)
- `frontend/src/services/experimentService.js` (Added `extractFromPdf` and `confirmPdfExperiments`)
- `frontend/src/pages/teacher/PdfExperimentExtractionPage.jsx` (Stitch-aligned multi-step extraction suite)
- `frontend/src/pages/teacher/TeacherExperimentManagementPage.jsx` (Linked PDF extraction action button)
- `frontend/src/routes/AppRoutes.jsx` (Registered PDF extraction routes)

---

## Design Status

- Stitch UI multi-step extraction layout, progress stepper, editable review roster, and detail modals applied.

---

## Deployment Status

- Foundation, Authentication, Academic Administration, Lab Access, Experiment Management, and PDF Experiment Extraction layers ready for deployment.

---

## Current Database Structure

- **Models Registry (`backend/src/models/index.js`):**
  - `User` (`backend/src/models/user.model.js`):
    - `name`, `rollNumber` (unique, uppercase, alphanumeric), `passwordHash` (select: false), `role` (`ADMIN_HOD`, `TEACHER`, `STUDENT`), `mustChangePassword`, `section`, `active`, timestamps.
  - `Section` (`backend/src/models/section.model.js`):
    - `name`, `sectionCode` (unique, uppercase), `academicYear`, `semester`, `department`, `active`, timestamps.
  - `Lab` (`backend/src/models/lab.model.js`):
    - `name`, `code` (unique, uppercase), `subject`, `department`, `academicYear`, `semester`, `description`, `active`, timestamps.
  - `LabAssignment` (`backend/src/models/labAssignment.model.js`):
    - `lab` (ref: Lab), `section` (ref: Section), `teacher` (ref: User), `assignmentType` (`MAIN`, `ASSISTANT`), `active`, `assignedAt`, timestamps.
  - `Experiment` (`backend/src/models/experiment.model.js`):
    - `lab` (ref: Lab), `title`, `experimentNumber` (1-12), `description`, `objective`, `instructions`, `programmingLanguages` (`['C', 'C++', 'Java', 'Python']`), `status` (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `CLOSED`, `REOPENED`), `scheduledAt`, `deadline`, `reopenedUntil`, `order` (1-12), `publishedAt`, `active`, `createdBy` (ref: User), timestamps.

---

## API Status

- `GET /api/health` — Working (200 OK)
- **Auth:**
  - `POST /api/auth/login` — Working (200 OK)
  - `POST /api/auth/change-password` — Working (200 OK)
  - `GET /api/auth/me` — Working (200 OK)
  - `POST /api/auth/logout` — Working (200 OK)
- **Users:**
  - `GET /api/users` — Working (200 OK)
  - `GET /api/users/:id` — Working (200 OK)
  - `POST /api/users/teacher` — Working (201 Created)
  - `POST /api/users/student` — Working (201 Created)
  - `PUT /api/users/:id` — Working (200 OK)
  - `PATCH /api/users/:id/status` — Working (200 OK)
  - `POST /api/users/:id/reset-password` — Working (200 OK)
- **Sections:**
  - `GET /api/sections` — Working (200 OK)
  - `GET /api/sections/:id` — Working (200 OK)
  - `POST /api/sections` — Working (201 Created)
  - `PUT /api/sections/:id` — Working (200 OK)
  - `PATCH /api/sections/:id/status` — Working (200 OK)
  - `GET /api/sections/:id/students` — Working (200 OK)
  - `POST /api/sections/:id/assign-student` — Working (200 OK)
- **Labs & Assigned Hub:**
  - `GET /api/labs/assigned` — Working (200 OK with role-filtered assigned labs)
  - `GET /api/labs/:id` — Working (200 OK with role-authorized lab details)
  - `GET /api/labs` — Working (200 OK / Admin only)
  - `POST /api/labs` — Working (201 Created / Admin only)
  - `PUT /api/labs/:id` — Working (200 OK / Admin only)
  - `PATCH /api/labs/:id/status` — Working (200 OK / Admin only)
- **Lab Assignments:**
  - `GET /api/lab-assignments` — Working (200 OK)
  - `POST /api/lab-assignments` — Working (201 Created)
  - `PATCH /api/lab-assignments/:id/status` — Working (200 OK)
  - `GET /api/lab-assignments/lab/:labId` — Working (200 OK)
  - `GET /api/lab-assignments/section/:sectionId` — Working (200 OK)
  - `GET /api/lab-assignments/teacher/:teacherId` — Working (200 OK)
- **Experiments (Phase 4):**
  - `GET /api/experiments` — Working (200 OK with role-based experiment listing)
  - `GET /api/experiments/:id` — Working (200 OK / 403 Forbidden / 404)
  - `POST /api/experiments` — Working (201 Created / 400 / 403 / 409)
  - `PUT /api/experiments/:id` — Working (200 OK / 400 / 403 / 404)
  - `PATCH /api/experiments/:id/status` — Working (200 OK / 400 / 403)
  - `POST /api/experiments/:id/publish` — Working (200 OK / 400 / 403)
  - `POST /api/experiments/:id/schedule` — Working (200 OK / 400 / 403)
  - `POST /api/experiments/:id/reopen` — Working (200 OK / 400 / 403)
  - `POST /api/experiments/:id/close` — Working (200 OK / 400 / 403)
  - `PUT /api/experiments/order` — Working (200 OK / 400 / 403)
  - `PATCH /api/experiments/:id/deactivate` — Working (200 OK / 403)

---

## Known Issues

- None.

---

## Verification & Limitations

- **Database Connectivity:** Offline unit and integration test suites validate the Mongoose schema constraints, validator logic, assignment rules, status transitions, and RBAC guards. When connected to live MongoDB Atlas via `.env`, production operations run seamlessly.
- **Strict Scope Boundaries Maintained:** PDF extraction, OCR, AI experiment parsing, code editor, compilers, test case runners, code execution, student submissions, automated grading, viva, notifications, and reports were strictly NOT implemented in Phase 4.

---

## Important Files

### Phase 4 Files
- `backend/src/models/experiment.model.js` (Mongoose Experiment Schema)
- `backend/src/validators/experiment.validator.js` (Centralized Experiment Input Validation)
- `backend/src/services/experimentService.js` (Experiment CRUD, Status Lifecycle, & RBAC Guard)
- `backend/src/controllers/experiment.controller.js` (Experiment REST Controller)
- `backend/src/routes/experiment.routes.js` (Protected Experiment Routes)
- `backend/src/tests/experiment.test.js` (Phase 4 Unit and RBAC Test Suite)
- `frontend/src/services/experimentService.js` (Frontend Experiment API Service)
- `frontend/src/pages/teacher/TeacherExperimentManagementPage.jsx` (Stitch-aligned Experiment Management Workbench)
- `frontend/src/pages/student/StudentExperimentDetailPage.jsx` (Student Experiment Protocol View)
- `frontend/src/pages/common/LabDetailsPage.jsx` (Integrated Experiment Curriculum List)
- `frontend/src/routes/AppRoutes.jsx` (Registered Experiment Routes)

---

## Design Status

- Stitch UI layouts and tokens applied across Teacher Experiment Management Console, Student Experiment Details, and Lab Details screens.

---

## Deployment Status

- Foundation, Authentication, Academic Administration, Lab Access, and Experiment Management layers ready for deployment.