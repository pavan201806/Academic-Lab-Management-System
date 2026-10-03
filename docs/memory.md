# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 0 — Foundation**

Status: Completed (Verified)

---

## Completed

- **Documentation & Rules:**
  - Project requirements documented in `docs/PRD.md`.
  - Three-tier architecture documented in `docs/Architecture.md`.
  - AI coding rules and operational constraints documented in `docs/Rules.md`.
  - Phased roadmap documented in `docs/Phases.md`.
  - Design system specifications documented in `docs/Design.md`.
  - Memory ledger initialized in `docs/memory.md`.
- **UI Reference Inspection:**
  - Inspected all 12 Stitch screen/component directories in `Stitch_files/`.
  - Analyzed design tokens (`DESIGN.md` in `academic_precision`), color palette (`#0F2D6B` primary, `#0D9488` teal secondary, `#0284C7` tertiary, `#F8FAFC` base canvas), typography (`Manrope` headings + `Hanken Grotesk` body + `JetBrains Mono` code), elevation scales, and component specifications.
- **Frontend Foundation:**
  - Initialized React 18 + Vite application in `frontend/`.
  - Installed `react-router-dom` and `axios`.
  - Created directory structure matching `docs/Architecture.md`: `assets/`, `components/`, `layouts/`, `pages/`, `routes/`, `services/`, `hooks/`, `context/`, `utils/`, `styles/`.
  - Configured global CSS design system (`designTokens.css`, `index.css`) with Stitch tokens and base reset/utility styles.
  - Implemented configured Axios API client (`services/api.js`) with request/response interceptors and base URL support.
  - Implemented React Router root layout shell (`RootLayout.jsx`), `HomePage.jsx` verification view, and `NotFoundPage.jsx`.
  - Built and verified production bundle (`vite build`) successfully.
- **Backend Foundation:**
  - Initialized Node.js + Express application in `backend/`.
  - Installed `express`, `cors`, `dotenv`, and `mongoose`.
  - Created directory structure matching `docs/Architecture.md`: `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `services/`, `validators/`, `utils/`.
  - Configured environment manager (`config/env.js`) and MongoDB connection layer with graceful offline resilience (`config/db.js`).
  - Implemented centralized error handling (`middleware/errorHandler.js`, `middleware/notFound.js`, `utils/appError.js`, `utils/apiResponse.js`).
  - Implemented and verified health check endpoint `GET /api/health`.
- **Environment & Git Hygiene:**
  - Configured `.gitignore` across root, frontend, and backend for dependencies, build artifacts, and secret files.
  - Created `.env.example` in root, `backend/`, and `frontend/` with placeholders.

---

## Currently Working On

- Phase 0 foundation is complete and verified. Ready for Phase 1 (Authentication).

---

## Next Tasks

1. **Phase 1 — Authentication:**
   - Implement `User` model with Mongoose (`name`, `rollNumber`, `passwordHash`, `role`, `mustChangePassword`, `section`, `active`).
   - Implement password hashing with `bcryptjs`.
   - Implement JWT token generation and verification middleware.
   - Implement authentication controllers/routes (`POST /api/auth/login`, `POST /api/auth/change-password`, `GET /api/auth/me`).
   - Enforce alphanumeric roll number / username validation (`^[A-Za-z0-9]+$`).
   - Implement frontend Login screen and First-Login Change Temporary Password modal matching Stitch reference `Stitch_files/lms_login_change_temporary_password_flows/`.
   - Setup React Auth Context, protected routes, and role-based redirect logic.

---

## Important Decisions

### Technology Stack
- **Frontend:** React 18 + Vite, React Router v6, Axios, Vanilla CSS with Stitch design tokens.
- **Backend:** Node.js + Express, Mongoose, JWT, CORS.
- **Database:** MongoDB Atlas (Mongoose connection layer ready).
- **Deployment Targets:** Vercel (Frontend), Render (Backend), MongoDB Atlas (Database).

### Authentication & Roles
- Exactly three roles: `ADMIN_HOD`, `TEACHER`, `STUDENT`.
- `Main Teacher` and `Assistant Teacher` are assignment types under the `TEACHER` role.
- User identifiers (roll numbers/usernames) are strictly alphanumeric (`^[A-Za-z0-9]+$`).

### Experiment Attempts & Scoring Rules
- Default official attempts: 3 (manual runs do not consume attempts).
- Highest official score is preserved.
- Scoring model: Programming (10 marks) + Viva (5 marks) = 15 marks per experiment (180 marks total for 12 experiments).

### Experiment PDF Extraction Workflow
- `Upload PDF → Extract → Review → Edit → Confirm → Save`. Extracted drafts are never committed automatically.

### UI & Styling Strategy
- Stitch files in `Stitch_files/` serve as the visual reference. Design system tokens are codified in `frontend/src/styles/designTokens.css`.

---

## Current Database Structure

- **Connection Layer:** `backend/src/config/db.js` configured with Mongoose.
- **Status:** Connection layer initialized and tested; currently reports disconnected/unconfigured when no live `MONGODB_URI` is provided in `.env`.
- **Models Registry:** `backend/src/models/index.js` prepared for Phase 1 schemas.

---

## API Status

- `GET /api/health` — Working (Returns 200 with service status, uptime, and database connection state).
- Other API routes (`/api/auth`, `/api/users`, `/api/labs`, etc.) are structured in route registry for upcoming phases.

---

## Known Issues

- None.

---

## Important Files

### Project Documentation
- `docs/PRD.md`
- `docs/Architecture.md`
- `docs/Rules.md`
- `docs/Phases.md`
- `docs/Design.md`
- `docs/memory.md`

### Stitch Design References
- `Stitch_files/` (12 modules including design tokens, layouts, auth flows, consoles, student/teacher suites)

### Backend Architecture Files
- `backend/src/server.js` (Server entry point)
- `backend/src/app.js` (Express configuration & route mounting)
- `backend/src/config/env.js` & `backend/src/config/db.js` (Config & database)
- `backend/src/routes/index.js` & `backend/src/routes/health.routes.js` (API routing)
- `backend/src/controllers/health.controller.js` (Health controller)
- `backend/src/middleware/errorHandler.js` & `backend/src/middleware/notFound.js` (Error handling)
- `backend/src/utils/apiResponse.js` & `backend/src/utils/appError.js` (Standard API formatting)

### Frontend Architecture Files
- `frontend/src/main.jsx` & `frontend/src/App.jsx` (Application root)
- `frontend/src/routes/AppRoutes.jsx` (Routing foundation)
- `frontend/src/layouts/RootLayout.jsx` (App shell layout)
- `frontend/src/styles/designTokens.css` & `frontend/src/styles/index.css` (Stitch tokens & styles)
- `frontend/src/services/api.js` & `frontend/src/services/healthService.js` (Axios client & services)

---

## Design Status

- Stitch UI references fully cataloged and mapped.
- Core design tokens (colors, typography, radii, shadows, spacing) integrated into `frontend/src/styles/designTokens.css`.

---

## Deployment Status

- Foundation prepared for:
  - Frontend: Vercel
  - Backend: Render
  - Database: MongoDB Atlas