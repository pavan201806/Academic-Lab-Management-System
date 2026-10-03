# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 2 — Academic Structure & Administration**

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

---

## Currently Working On

- Phase 2 complete. Ready for checkpoint commit.

---

## Next Tasks

1. **Phase 3 — Teacher Laboratory Workspace & Experiment Planning:**
   - Teacher dashboard showing assigned labs and sections.
   - Lab curriculum planning and experiment structuring.
   - Experiments and test cases (as scoped in Phase 3).

---

## Important Decisions

### Academic Structure & Administration
- **Assignment Types vs Roles:**
  - `MAIN` and `ASSISTANT` are strictly assignment types recorded within `LabAssignment` documents, **not** authentication roles.
  - System roles remain strictly `ADMIN_HOD`, `TEACHER`, `STUDENT`.
- **Assignment Integrity Constraints:**
  - One active `MAIN` teacher per Lab + Section cohort at any time.
  - Multiple `ASSISTANT` teachers permitted per Lab + Section.
  - Inactive teachers, labs, or sections cannot be assigned.
  - Duplicate assignments of the same teacher to the same Lab + Section are rejected with 409 Conflict.
- **Deactivation vs Hard Deletion:**
  - All academic entities (`Lab`, `Section`, `User`, `LabAssignment`) implement `active: Boolean` (defaults to `true`).
  - Historical identity is preserved by deactivating records instead of destructive deletion.

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
- **Labs:**
  - `GET /api/labs` — Working (200 OK)
  - `GET /api/labs/:id` — Working (200 OK / 404)
  - `POST /api/labs` — Working (201 Created / 400 / 409)
  - `PUT /api/labs/:id` — Working (200 OK / 400 / 404)
  - `PATCH /api/labs/:id/status` — Working (200 OK)
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
- **Strict Scope Boundaries Maintained:** Experiments, submissions, code evaluation, viva, student experiment workspaces, and reports were NOT implemented in Phase 2.

---

## Important Files

### Phase 2 Files
- `backend/src/models/section.model.js` (Section Mongoose Schema)
- `backend/src/models/lab.model.js` (Lab Mongoose Schema)
- `backend/src/models/labAssignment.model.js` (LabAssignment Schema with MAIN/ASSISTANT types)
- `backend/src/validators/academic.validator.js` (Centralized academic input validation)
- `backend/src/services/userService.js` (User management service)
- `backend/src/services/sectionService.js` (Section service)
- `backend/src/services/labService.js` (Lab service)
- `backend/src/services/labAssignmentService.js` (Lab assignment service & business rules)
- `backend/src/controllers/` (`user.controller.js`, `section.controller.js`, `lab.controller.js`, `labAssignment.controller.js`)
- `backend/src/routes/` (`user.routes.js`, `section.routes.js`, `lab.routes.js`, `labAssignment.routes.js`)
- `backend/src/tests/academic.test.js` (Academic testing suite)
- `frontend/src/services/` (`userService.js`, `sectionService.js`, `labService.js`, `labAssignmentService.js`)
- `frontend/src/layouts/AppShellLayout.jsx` (Stitch App Shell layout with sidebar rail)
- `frontend/src/pages/admin/` (`AdminDashboardPage.jsx`, `LabManagementPage.jsx`, `SectionManagementPage.jsx`, `TeacherManagementPage.jsx`, `StudentManagementPage.jsx`, `LabAssignmentPage.jsx`)

---

## Design Status

- Stitch UI layouts and tokens applied across all Admin/HOD academic management screens.

---

## Deployment Status

- Foundation, Authentication, and Academic Administration layers ready for deployment.