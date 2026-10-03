# Project Memory

> This file tracks the actual implementation state of the Academic Lab Management System.
> Update it after meaningful implementation work so future AI coding sessions can continue without losing project context.

---

## Current Phase

**Phase 0 — Foundation**

Status: Not Started

---

## Completed

- Project requirements documented.
- Architecture documented.
- Coding rules documented.
- Implementation phases documented.
- Design system documented.
- Stitch UI references collected.
- Project folder created.

---

## Currently Working On

- Preparing the project for implementation.
- Phase 0 foundation setup has not started yet.

---

## Next Tasks

1. Initialize frontend with React + Vite.
2. Initialize backend with Node.js + Express.
3. Configure MongoDB/Mongoose.
4. Configure environment variables.
5. Create initial frontend/backend folder structure.
6. Add backend health-check endpoint.
7. Verify frontend and backend startup.
8. Verify foundation against `docs/Architecture.md`.
9. Review Phase 0 before starting Phase 1.

---

## Important Decisions

### Technology Stack

- Frontend: React + Vite
- Routing: React Router
- HTTP Client: Axios
- Backend: Node.js + Express
- Database: MongoDB Atlas
- ODM: Mongoose
- Authentication: JWT
- Password Hashing: Secure password hashing
- Frontend Deployment: Vercel
- Backend Deployment: Render

### User Roles

- ADMIN_HOD
- TEACHER
- STUDENT

Main Teacher and Assistant Teacher are assignment types within the Teacher role, not separate authentication roles.

### User Identifiers

Student and teacher roll numbers/usernames are alphanumeric.

Examples:

- `23341A4504`
- `504`
- `23A1B07`

Validation must allow letters and numbers but reject spaces and special characters.

### Experiment Attempts

- Default official attempts: 3
- Manual code execution does not consume official attempts.
- Highest official experiment score is retained.

### Scoring

- Programming/automated evaluation: 10 marks
- Viva: 5 marks
- Total per experiment: 15 marks
- 12 experiments: 180 maximum marks

### PDF Experiment Extraction

The workflow is:

Upload PDF → Extract → Review → Edit → Confirm → Save

Extracted experiment information must never be automatically saved without teacher review.

### Historical Data

Academic records, submissions, evaluations, marks, viva records, and other important historical data must be preserved.

### Notifications

Only teachers can delete notifications. Backend authorization must enforce this rule.

### UI Reference

The Stitch screens in `Stitch_files/` are the primary visual reference.

The implementation should reproduce the intended Stitch design rather than replacing it with a generic dashboard.

---

## Current Database Structure

Not implemented yet.

Planned core entities are documented in:

`docs/Architecture.md`

---

## API Status

Not implemented yet.

---

## Known Issues

None currently.

---

## Important Files

### Project Documentation

- `docs/PRD.md`
- `docs/Architecture.md`
- `docs/Rules.md`
- `docs/Phases.md`
- `docs/Design.md`
- `docs/Memory.md`

### UI References

- `Stitch_files/`

---

## Design Status

Stitch UI references are available.

Implementation has not started.

---

## Deployment Status

Not started.

Target:

- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas

---

## Do Not Forget

- Read all files in `docs/` before making major architectural changes.
- Inspect relevant Stitch screens before implementing their corresponding pages.
- Do not invent requirements.
- Do not change business rules without approval.
- Do not treat Main Teacher and Assistant Teacher as separate roles.
- Roll numbers/usernames are alphanumeric.
- Do not expose hidden test cases to students.
- Manual runs do not consume official attempts.
- Preserve submission and evaluation history.
- Only teachers can delete notifications.
- Never store plaintext passwords.
- Never commit secrets.
- Student code execution must be isolated/sandboxed.
- A feature is not complete when only its UI exists; frontend, backend, database, validation, authorization, error handling, and testing must work together.
- Update this file after meaningful implementation changes.