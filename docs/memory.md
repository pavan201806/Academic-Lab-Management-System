# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 3 — Lab Management**

Status: Completed & Verified (Ready for Review)

---

## Completed

- **Phase 0 — Foundation:**
  - Project documentation (`PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `memory.md`).
  - Frontend React 18 + Vite foundation with Stitch tokens in `designTokens.css`.
  - Backend Node.js + Express + Mongoose connection layer and centralized error handling.
  - Verification endpoint `GET /api/health`.
- **Phase 1 — Authentication:**
  - **User Model (`backend/src/models/user.model.js`):**
    - Fields: `name`, `rollNumber` (alphanumeric `^[A-Za-z0-9]+$`, uppercase normalization, unique), `passwordHash` (`select: false`), `role` (`ADMIN_HOD`, `TEACHER`, `STUDENT`), `mustChangePassword`, `section`, `active`.
    - Methods: `comparePassword(candidatePassword)` using `bcryptjs`, safe `toJSON` serialization omitting `passwordHash`.
  - **Password Security & JWT:**
    - Integrated `bcryptjs` (salt cost factor 10) for secure password hashing.
    - Integrated `jsonwebtoken` for stateless token signing with configurable expiration and secret (`backend/src/utils/token.js`).
  - **Authentication API (`backend/src/controllers/auth.controller.js` & `backend/src/routes/auth.routes.js`):**
    - `POST /api/auth/login`: Validates credentials, checks active status, returns JWT and user payload with `mustChangePassword` state.
    - `POST /api/auth/change-password`: Validates current password, enforces complexity rules (min 8 chars, 1 uppercase, 1 digit, 1 special symbol), updates hash, sets `mustChangePassword = false`, issues fresh token.
    - `GET /api/auth/me`: Authenticated endpoint returning safe profile.
    - `POST /api/auth/logout`: Stateless acknowledgement endpoint.
  - **Authorization & Gate Middleware (`backend/src/middleware/auth.js`):**
    - `authenticate`: Extracts Bearer token, verifies JWT, checks database for active user.
    - `requirePasswordChangeCompleted`: Blocks access to application resources if `mustChangePassword === true`.
    - `authorize(...roles)`: Reusable RBAC middleware enforcing `ADMIN_HOD`, `TEACHER`, and `STUDENT` permissions.
  - **Dev Seeding Utility (`backend/src/utils/seed.js`):**
    - Seed script creating test accounts for `ADMIN_HOD` (`ADMIN01`), `TEACHER` (`PROFVANCE`), `STUDENT` with temporary password (`202301001`), `STUDENT` (`202301002`), and inactive student (`202301099`).
  - **Frontend Authentication State (`frontend/src/context/AuthContext.jsx`):**
    - Provides `user`, `token`, `isAuthenticated`, `mustChangePassword`, `loading`, `login`, `changePassword`, and `logout`.
    - Syncs with `localStorage` and automatically validates sessions on startup via `GET /api/auth/me`.
  - **Route Guards (`frontend/src/routes/`):**
    - `ProtectedRoute.jsx`: Enforces authentication, redirects users with temporary passwords to `/change-password`, and handles role access denial.
    - `PublicOnlyRoute.jsx`: Redirects already authenticated users to `/dashboard` or `/change-password`.
  - **Stitch UI Authentication Pages (`frontend/src/pages/auth/`):**
    - `LoginPage.jsx`: Built directly from `Stitch_files/lms_login_change_temporary_password_flows/code.html`, with role selector tabs, alphanumeric validation, password toggle, loading spinner, and compliance footers.
    - `ChangePasswordPage.jsx`: First-time temporary password gate with live entropy/strength meter, real-time criteria checklist, match verification, and automatic redirect upon update.
    - `DashboardPlaceholder.jsx`: Authenticated landing view displaying active user role and profile details.
  - **Security & Integration Verification Performed:**
    - Role selector privilege escalation test: Verified that client-supplied `role` is never trusted; role is exclusively loaded from MongoDB and embedded into the JWT payload.
    - Data sanitization verification: Verified `passwordHash` is never leaked in login, change-password, or `GET /api/auth/me` endpoints.
    - Temporary password enforcement verification: Verified that `mustChangePassword=true` returns 403 on protected routes, redirects to `/change-password`, updates hash, sets flag to false, and grants access with a fresh token.
    - All unit, integration, and security verification test suites passing (`backend/src/tests/auth.test.js`, `backend/src/tests/api.auth.test.js`, `backend/src/tests/security.verification.test.js`).
    - Frontend production bundle build verified with 0 compilation errors.
- **Phase 2 — Academic Structure & Administration:**
  - **Data Models Created / Updated (`backend/src/models/`):**
    - `Section` (`backend/src/models/section.model.js`): `name`, `sectionCode` (unique, uppercase), `academicYear`, `semester`, `department`, `active`.
    - `Lab` (`backend/src/models/lab.model.js`): `name`, `code` (unique, uppercase), `subject`, `department`, `academicYear`, `semester`, `description`, `active`.
    - `LabAssignment` (`backend/src/models/labAssignment.model.js`): `lab`, `section`, `teacher`, `assignmentType` (`MAIN` | `ASSISTANT`), `active`, `assignedAt`.
    - `User` (`backend/src/models/user.model.js`): Preserved Phase 1 schema; added support for admin creation of `TEACHER` and `STUDENT` users.
    - Models registered in `backend/src/models/index.js`.
  - **Backend Validation Layer (`backend/src/validators/academic.validator.js`):**
    - Centralized validators for section input, lab input, lab assignment input, user creation input, and MongoDB ObjectId parameters.
  - **Backend Services Layer (`backend/src/services/`):**
    - `userService.js`: Manage faculty and student lifecycle, role enforcement (client cannot override role), password resets, and section allocations.
    - `sectionService.js`: Section CRUD, uniqueness checks, student membership fetching, soft deactivation.
    - `labService.js`: Lab CRUD, unique code enforcement, active status toggling.
    - `labAssignmentService.js`: Assigns teachers to Lab + Section cohorts. Enforces strict rules:
      - Validates teacher role (`TEACHER`).
      - Validates active state for Lab, Section, and Teacher.
      - Exactly **one active `MAIN` teacher** per Lab + Section cohort (blocks secondary MAIN assignments).
      - Allows multiple active `ASSISTANT` teachers.
      - Prevents duplicate active assignments (409 Conflict).
      - Deactivates instead of hard-deleting to preserve audit and assignment history.
  - **Backend Controllers & Routes (`backend/src/controllers/`, `backend/src/routes/`):**
    - User Management: `GET /api/users`, `GET /api/users/:id`, `POST /api/users/teacher`, `POST /api/users/student`, `PUT /api/users/:id`, `PATCH /api/users/:id/status`, `POST /api/users/:id/reset-password`.
    - Section Management: `GET /api/sections`, `GET /api/sections/:id`, `POST /api/sections`, `PUT /api/sections/:id`, `PATCH /api/sections/:id/status`, `GET /api/sections/:id/students`, `POST /api/sections/:id/assign-student`.
    - Lab Management: `GET /api/labs`, `GET /api/labs/:id`, `POST /api/labs`, `PUT /api/labs/:id`, `PATCH /api/labs/:id/status`.
    - Lab Assignments: `GET /api/lab-assignments`, `GET /api/lab-assignments/:id`, `POST /api/lab-assignments`, `PATCH /api/lab-assignments/:id/status`, `GET /api/lab-assignments/lab/:labId`, `GET /api/lab-assignments/section/:sectionId`, `GET /api/lab-assignments/teacher/:teacherId`.
  - **Backend Authorization & RBAC:**
    - All Phase 2 academic management endpoints are strictly guarded by `authenticate` and `authorize('ADMIN_HOD')`.
    - Teachers and students are blocked with 403 Forbidden on academic administrative operations.
  - **Backend Test Suite (`backend/src/tests/academic.test.js`):**
    - Comprehensive unit and integration test suite covering input validation, model constraints, assignment rules, single MAIN teacher enforcement, and RBAC access checks. All passing 100%.
  - **Frontend Services (`frontend/src/services/`):**
    - `userService.js`, `sectionService.js`, `labService.js`, `labAssignmentService.js`.
  - **Frontend Stitch-Aligned UI (`frontend/src/layouts/`, `frontend/src/pages/admin/`):**
    - `AppShellLayout.jsx`: Collapsible navigation rail, responsive header, breadcrumb trail, user profile pill, and secure sign-out.
    - `AdminDashboardPage.jsx`: Top-level academic overview with live counters, system health metrics, and quick action cards.
    - `LabManagementPage.jsx`: Laboratory catalogue inspired by Stitch experiment management console (with experiments disabled for Phase 2), modal for adding/editing labs, active status toggles.
    - `SectionManagementPage.jsx`: Academic section and cohort management, student roster viewer per section.
    - `TeacherManagementPage.jsx`: Faculty roster, temporary password generation, creation and editing modals.
    - `StudentManagementPage.jsx`: Student roster with section assignments, search filtering, and student onboarding modals.
    - `LabAssignmentPage.jsx`: 4-step interactive allocation wizard (Select Lab → Select Cohort Section → Select Role [MAIN/ASSISTANT] → Select Teacher) with active assignments directory and soft-deactivation controls.
  - **Frontend Routing & Guards:**
    - Updated `AppRoutes.jsx`, `ProtectedRoute.jsx`, `PublicOnlyRoute.jsx`, and `LoginPage.jsx` to route `ADMIN_HOD` users into `/admin/dashboard`.
  - **Frontend Build:**
    - Verified production bundle compilation via `npm run build` (0 warnings, 0 errors).
- **Phase 3 — Lab Management & Access Layer:**
  - **Role-Aware Lab Access Control Layer (`backend/src/services/labService.js`):**
    - `getAssignedLabs(user)`:
      - **ADMIN_HOD**: Returns all active labs with comprehensive cohort metadata.
      - **TEACHER**: Returns only labs where authenticated teacher has an active `LabAssignment` (`MAIN` or `ASSISTANT`) for an active section and active lab.
      - **STUDENT**: Resolves student's active section (`user.section`), returns only active labs assigned to that section via active `LabAssignment`.
    - `getLabDetailsForUser(labId, user)`:
      - **ADMIN_HOD**: Full administrative access to lab details and all cohort assignments.
      - **TEACHER**: Verifies teacher has an active assignment to this lab. Blocks unassigned teachers with `403 Forbidden` (mitigating IDOR).
      - **STUDENT**: Verifies student is enrolled in an active section and that this lab is actively assigned to that section. Blocks unauthorized access with `403 Forbidden`.
      - **Deactivated Labs / Inactive Users**: Strictly denied with `403 Forbidden`.
  - **Backend Routes & Controllers (`backend/src/routes/lab.routes.js`, `backend/src/controllers/lab.controller.js`):**
    - `GET /api/labs/assigned`: Role-aware assigned laboratories endpoint for `ADMIN_HOD`, `TEACHER`, `STUDENT`.
    - `GET /api/labs/:id`: Protected role-aware lab details endpoint.
    - `GET /api/labs`, `POST /api/labs`, `PUT /api/labs/:id`, `PATCH /api/labs/:id/status`: Restricted to `ADMIN_HOD`.
  - **Backend Test Suite (`backend/src/tests/lab.access.test.js`):**
    - Added dedicated test suite covering:
      - Teacher active `MAIN` and `ASSISTANT` lab retrieval.
      - IDOR rejection when unassigned teacher requests lab details.
      - Student cohort-only lab visibility (Section A student gets Lab 1; Section B student gets 0 labs).
      - IDOR rejection when student attempts to access a lab from another section.
      - Inactive student and deactivated lab blocking.
      - Historical preservation verification (deactivating lab updates `active: false` without deleting records or assignments).
    - Added to `npm test` runner. All tests passing 100%.
  - **Frontend Workspaces & Stitch-Aligned Pages:**
    - `TeacherLabDashboardPage.jsx` (`frontend/src/pages/teacher/TeacherLabDashboardPage.jsx`): Teacher console showcasing assigned labs, MAIN/ASSISTANT badges, section cohort tags, metric counters, search/filter, and navigation to Lab Details.
    - `StudentLabDashboardPage.jsx` (`frontend/src/pages/student/StudentLabDashboardPage.jsx`): Student hub displaying enrolled section laboratories, faculty instructors, active term details, and direct access to Lab Curriculum view.
    - `LabDetailsPage.jsx` (`frontend/src/pages/common/LabDetailsPage.jsx`): Role-aware laboratory details view displaying academic synopsis, cohort details, faculty instructor matrix, future experiment placeholder container, and strict unauthorized error interceptor.
  - **Frontend Navigation & Routing (`frontend/src/layouts/AppShellLayout.jsx`, `frontend/src/routes/AppRoutes.jsx`):**
    - Dynamic sidebar navigation tailored to role (`ADMIN_HOD`, `TEACHER`, `STUDENT`).
    - Dedicated routes `/teacher/labs`, `/teacher/labs/:id`, `/student/labs`, `/student/labs/:id`, `/admin/labs/:id`.
    - Role-aware login & public route redirection.
  - **Frontend Build:**
    - Production bundle compilation verified via `npm run build` (0 warnings, 0 errors).

---

## Currently Working On

- Phase 3 complete. Ready for checkpoint commit.

---

## Next Tasks

1. **Phase 4 — Experiment Management:**
   - Manual experiment creation & configuration.
   - Experiment ordering & curriculum organization.
   - Programming language selection, test cases, and deadlines.
   - Teacher experiment authoring workbench.

---

## Important Decisions

### Lab Access & Access Control Matrix
- **Identity Enforcement:**
  - `teacherId`, `studentId`, `sectionId`, and `role` provided in client request bodies or query params are **never** trusted for authorization.
  - The backend strictly uses `req.user` verified from the JWT session.
- **IDOR Protection:**
  - Access to `GET /api/labs/:id` verifies that teachers have an active `LabAssignment` for that lab, and students belong to an active `Section` assigned to that lab.
  - Unauthorized direct URL access returns `403 Forbidden`.
- **Soft Deactivation & Historical Preservation:**
  - Deactivating a lab sets `active = false` on the `Lab` document.
  - Associated `LabAssignment` records are preserved intact to safeguard future audit and reporting integrity.
  - Deactivated labs are omitted from active assigned lab listings for faculty and students.

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

---

## API Status

- `GET /api/health` — Working (200 OK)
- **Auth:**
  - `POST /api/auth/login` — Working (200 OK)
  - `POST /api/auth/change-password` — Working (200 OK)
  - `GET /api/auth/me` — Working (200 OK)
  - `POST /api/auth/logout` — Working (200 OK)
- **Users:**
  - `GET /api/users` — Working (200 OK / 401 / 403)
  - `GET /api/users/:id` — Working (200 OK / 404)
  - `POST /api/users/teacher` — Working (201 Created / 400 / 409)
  - `POST /api/users/student` — Working (201 Created / 400 / 409)
  - `PUT /api/users/:id` — Working (200 OK / 400 / 404)
  - `PATCH /api/users/:id/status` — Working (200 OK)
  - `POST /api/users/:id/reset-password` — Working (200 OK)
- **Sections:**
  - `GET /api/sections` — Working (200 OK)
  - `GET /api/sections/:id` — Working (200 OK / 404)
  - `POST /api/sections` — Working (201 Created / 400 / 409)
  - `PUT /api/sections/:id` — Working (200 OK / 400 / 404)
  - `PATCH /api/sections/:id/status` — Working (200 OK)
  - `GET /api/sections/:id/students` — Working (200 OK)
  - `POST /api/sections/:id/assign-student` — Working (200 OK)
- **Labs & Assigned Hub:**
  - `GET /api/labs/assigned` — Working (200 OK with role-filtered assigned labs)
  - `GET /api/labs/:id` — Working (200 OK with role-authorized lab details / 403 Forbidden / 404)
  - `GET /api/labs` — Working (200 OK / Admin only)
  - `POST /api/labs` — Working (201 Created / Admin only)
  - `PUT /api/labs/:id` — Working (200 OK / Admin only)
  - `PATCH /api/labs/:id/status` — Working (200 OK / Admin only)
- **Lab Assignments:**
  - `GET /api/lab-assignments` — Working (200 OK)
  - `POST /api/lab-assignments` — Working (201 Created / 400 / 404 / 409)
  - `PATCH /api/lab-assignments/:id/status` — Working (200 OK)
  - `GET /api/lab-assignments/lab/:labId` — Working (200 OK)
  - `GET /api/lab-assignments/section/:sectionId` — Working (200 OK)
  - `GET /api/lab-assignments/teacher/:teacherId` — Working (200 OK)

---

## Known Issues

- None.

---

## Verification & Limitations

- **Database Connectivity:** Offline unit/integration test suites mock and validate the Mongoose schema constraints, validator logic, assignment rules, and RBAC guards. When running in a live production environment with MongoDB Atlas, configured `.env` values will connect seamlessly.
- **Strict Scope Boundaries Maintained:** Experiments, PDF extractions, test cases, code runners, submissions, evaluations, and reports were NOT implemented in Phase 3.

---

## Important Files

### Phase 3 Files
- `backend/src/services/labService.js` (Role-aware lab access and assigned labs retrieval)
- `backend/src/controllers/lab.controller.js` (Lab controller with `getAssignedLabs` and role-aware `getLabById`)
- `backend/src/routes/lab.routes.js` (Lab routes with `GET /assigned` and RBAC guards)
- `backend/src/tests/lab.access.test.js` (Phase 3 unit and access control test suite)
- `frontend/src/services/labService.js` (Frontend lab service with `getAssignedLabs`)
- `frontend/src/pages/teacher/TeacherLabDashboardPage.jsx` (Stitch-aligned Teacher Lab Console)
- `frontend/src/pages/student/StudentLabDashboardPage.jsx` (Stitch-aligned Student Assigned Labs Hub)
- `frontend/src/pages/common/LabDetailsPage.jsx` (Role-aware Lab Details view with IDOR protection)
- `frontend/src/layouts/AppShellLayout.jsx` (Role-dynamic sidebar navigation)
- `frontend/src/routes/AppRoutes.jsx` (Protected routes for Teacher and Student workspaces)

---

## Design Status

- Stitch UI layouts and tokens applied across Teacher Console, Student Hub, and Lab Details screens.

---

## Deployment Status

- Foundation, Authentication, Academic Administration, and Lab Access layers ready for deployment.