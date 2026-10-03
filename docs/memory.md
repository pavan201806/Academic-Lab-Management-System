# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 1 — Authentication**

Status: Completed & Security Verified (Ready for Checkpoint Commit)

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

---

## Currently Working On

- Ready for Checkpoint Commit for Phase 1.
- Next phase to begin after confirmation: **Phase 2 — Academic Structure**.

---

## Next Tasks

1. **Phase 2 — Academic Structure:**
   - Define data models: `Section`, `Lab`, `LabAssignment` (Main Teacher & Assistant Teacher assignment types).
   - Implement Admin user management APIs (Create/List/Update Teachers and Students).
   - Implement Section management (Create sections, assign students to sections).
   - Implement Lab creation and configuration (Academic Year, Semester, Subject, Sections, Teacher assignments).
   - Wire backend authorization to allow `ADMIN_HOD` to manage academic entities.
   - Build UI management consoles based on Stitch references (`manage_laboratories_experiment_management_console`).

---

## Important Decisions

### Authentication & Authorization
- **Roles:** Exactly three system roles: `ADMIN_HOD`, `TEACHER`, `STUDENT`. `Main Teacher` and `Assistant Teacher` are designated within lab assignments, never as separate user roles.
- **Roll Number & Identifier Handling:**
  - Pattern: `^[A-Za-z0-9]+$` (strictly letters and numbers; no spaces, hyphens, or symbols).
  - Storage & Query Normalization: Stored in uppercase (`uppercase: true` in schema) and normalized in validators (`cleanRoll.toUpperCase()`). This ensures seamless, case-insensitive login matching across both `23341a4504` and `23341A4504`.
- **Role Security & Non-Escalation:**
  - The role tab selector in the frontend login UI exists strictly as a client convenience for pre-filling sample usernames for demonstration.
  - The frontend `authService.login` strictly sends `{ rollNumber, password }`.
  - The backend `auth.controller.js` finds the user record by `rollNumber` in MongoDB and assigns `user.role` from the database. Any body-injected role is ignored.
- **Password Policy:**
  - Minimum 8 characters.
  - At least 1 uppercase letter (`[A-Z]`).
  - At least 1 numerical digit (`[0-9]`).
  - At least 1 special symbol (`[!@#$%^&*(),.?":{}|<>_~... ]`).
  - Cannot be identical to current/temporary password.
  - Hashed using `bcryptjs` with salt rounds = 10.
- **JWT Storage & Session Management:**
  - Token signed with `JWT_SECRET` and `JWT_EXPIRES_IN` (default 7 days).
  - Stored in browser `localStorage` as `auth_token` and sent in HTTP requests via `Authorization: Bearer <token>` header.
  - On 401 or token expiration, client automatically clears token and redirects to `/login`.
- **Logout Strategy:**
  - Client-side token removal and state reset, backed by a stateless acknowledgement endpoint (`POST /api/auth/logout`).
- **Temporary Password Enforcement:**
  - Accounts initialized by admin have `mustChangePassword = true`.
  - Frontend: `ProtectedRoute` intercepts navigation and redirects to `/change-password`.
  - Backend: `requirePasswordChangeCompleted` middleware blocks protected endpoints with 403 Forbidden (`{ requiresPasswordChange: true }`) if bypassed.
  - On successful update via `POST /api/auth/change-password`, `mustChangePassword` is set to `false` and a fresh token is issued.

---

## Current Database Structure

- **Models Registry (`backend/src/models/index.js`):**
  - `User` (`backend/src/models/user.model.js`):
    - `name` (String, required)
    - `rollNumber` (String, required, unique, uppercase, alphanumeric regex)
    - `passwordHash` (String, required, select: false)
    - `role` (String, enum: `ADMIN_HOD`, `TEACHER`, `STUDENT`)
    - `mustChangePassword` (Boolean, default: true)
    - `section` (String, default: '')
    - `active` (Boolean, default: true)
    - `createdAt`, `updatedAt` (Timestamps)

---

## API Status

- `GET /api/health` — Working (200 OK)
- `POST /api/auth/login` — Working (200 OK with JWT & user data / 400 Bad Request / 401 Unauthorized / 403 Deactivated)
- `POST /api/auth/change-password` — Working (200 OK with fresh JWT / 400 Validation Error / 401 Unauthorized)
- `GET /api/auth/me` — Working (200 OK with authenticated user profile / 401 Unauthorized)
- `POST /api/auth/logout` — Working (200 OK)

---

## Known Issues

- None.

---

## Verification & Limitations

- **Database Connectivity:** A live MongoDB Atlas / local MongoDB instance was tested via connection probe. The local daemon is currently offline (`ECONNREFUSED 127.0.0.1:27017`), and production Atlas credentials are not yet configured in local `.env` (kept as placeholder in `.env.example`).
- **Logic & Security Testing:** All Mongoose schemas, cryptographic hashing (`bcryptjs`), JWT lifecycle, input validators, middleware gates, and HTTP endpoints were verified using isolated unit tests (`auth.test.js`), API HTTP integration tests (`api.auth.test.js`), and a dedicated security verification suite (`security.verification.test.js`).

---

## Important Files

### Authentication Files
- `backend/src/models/user.model.js` (User schema & password comparison)
- `backend/src/controllers/auth.controller.js` (Login, change password, get profile, logout)
- `backend/src/routes/auth.routes.js` (Auth route definitions)
- `backend/src/middleware/auth.js` (JWT authentication, role authorization, password change gate)
- `backend/src/validators/auth.validator.js` (Login & change password validation rules)
- `backend/src/utils/token.js` (JWT token generation & verification)
- `backend/src/utils/seed.js` (Development test user seeding script)
- `backend/src/tests/auth.test.js`, `backend/src/tests/api.auth.test.js`, `backend/src/tests/security.verification.test.js` (Auth test suites)
- `frontend/src/context/AuthContext.jsx` (Global auth context provider)
- `frontend/src/services/authService.js` (Frontend auth API calls)
- `frontend/src/routes/ProtectedRoute.jsx` & `frontend/src/routes/PublicOnlyRoute.jsx` (Route guards)
- `frontend/src/pages/auth/LoginPage.jsx` (Stitch-based Login UI)
- `frontend/src/pages/auth/ChangePasswordPage.jsx` (Stitch-based Temporary Password UI)
- `frontend/src/pages/dashboard/DashboardPlaceholder.jsx` (Authenticated verification dashboard)

---

## Design Status

- Stitch UI login and temporary password flows implemented with pixel-level fidelity using design system tokens.

---

## Deployment Status

- Foundation and Authentication layers ready for Vercel (Frontend), Render (Backend), and MongoDB Atlas.