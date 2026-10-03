# Academic Lab Management System — Architecture

## 1. Architecture Overview

The application follows a three-tier web architecture:

```text
┌───────────────────────────────┐
│           Frontend            │
│      React + Vite             │
│                               │
│  Pages / Components / State   │
└───────────────┬───────────────┘
                │ HTTPS / REST API
                ▼
┌───────────────────────────────┐
│           Backend             │
│       Node.js + Express       │
│                               │
│ Auth / Business Logic / API   │
│ Validation / Evaluation       │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          MongoDB Atlas        │
│                               │
│ Users / Labs / Experiments   │
│ Submissions / Marks / etc.   │
└───────────────────────────────┘
```

---

# 2. Technology Stack

## Frontend

- React
- Vite
- React Router
- Axios
- Reusable component architecture
- Stitch-based UI implementation

## Backend

- Node.js
- Express.js
- REST API
- JWT authentication
- Password hashing
- Validation middleware
- Centralized error handling

## Database

- MongoDB
- MongoDB Atlas
- Mongoose

## Deployment

```text
React/Vite frontend → Vercel

Node/Express backend → Render

MongoDB → MongoDB Atlas
```

---

# 3. Repository Structure

Recommended structure:

```text
academic-lab-management-system/
│
├── stitch_files/
│   ├── ...
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── utils/
│   │   └── styles/
│   ├── public/
│   ├── package.json
│   └── vite.config.*
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── app.*
│   ├── package.json
│   └── ...
│
├── PRD.md
├── Architecture.md
├── Rules.md
├── Phases.md
├── Design.md
└── Memory.md
```

---

# 4. Backend Layers

The backend should follow separation of responsibilities.

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Model
  ↓
MongoDB
```

## Routes

Responsible for API endpoints.

## Middleware

Responsible for:

- Authentication
- Authorization
- Validation
- Error handling

## Controllers

Responsible for handling HTTP requests/responses.

## Services

Responsible for business logic.

Examples:

```text
ExperimentService
SubmissionService
EvaluationService
NotificationService
ReportService
LabService
UserService
```

## Models

Represent MongoDB collections/documents.

---

# 5. Core Data Models

The initial data model should include:

```text
User
Lab
Section
LabAssignment
Experiment
ExperimentTestCase
Submission
Evaluation
Viva
Notification
Report
ActivityLog
```

---

# 6. User Model

Conceptually:

```text
User
├── name
├── rollNumber
├── passwordHash
├── role
├── mustChangePassword
├── section
├── active
├── createdAt
└── updatedAt
```

Role:

```text
ADMIN_HOD
TEACHER
STUDENT
```

Teacher assignment type should not become a separate role.

---

# 7. Lab Model

```text
Lab
├── name
├── subject
├── academicYear
├── semester
├── sections
├── teachers
├── experiments
├── status
├── active
├── createdAt
└── updatedAt
```

Teacher assignment should identify:

```text
Teacher
├── teacherId
└── assignmentType
       ├── MAIN
       └── ASSISTANT
```

---

# 8. Experiment Model

```text
Experiment
├── labId
├── experimentNumber
├── title
├── description
├── instructions
├── language
├── inputFormat
├── outputFormat
├── constraints
├── examples
├── testCases
├── maxOfficialAttempts
├── cooldown
├── schedule
├── deadline
├── status
└── order
```

---

# 9. Submission Model

A submission must preserve:

```text
student
lab
experiment
attemptNumber
sourceCode
language
executionResult
score
status
submittedAt
```

Submission history must never be overwritten simply because another attempt exists.

---

# 10. Evaluation Model

Evaluation should preserve:

```text
submissionId
evaluator
testCasesPassed
testCasesTotal
score
remarks
evaluatedAt
evaluationType
```

Evaluation types may include:

```text
AUTOMATED
MANUAL
RE_EVALUATION
```

---

# 11. Viva Model

```text
Viva
├── studentId
├── labId
├── experimentId
├── evaluatorId
├── marks
├── remarks
└── createdAt
```

Maximum:

```text
5 marks
```

---

# 12. Notification Model

```text
Notification
├── title
├── message
├── senderId
├── targetType
├── targetIds
├── labId
├── createdAt
└── recipients/readState
```

Only authorized teachers can delete notifications.

---

# 13. API Structure

Base API:

```text
/api
```

Suggested modules:

```text
/api/auth
/api/users
/api/labs
/api/sections
/api/experiments
/api/submissions
/api/evaluations
/api/viva
/api/notifications
/api/reports
```

Examples:

```text
POST   /api/auth/login
POST   /api/auth/change-password

GET    /api/labs
POST   /api/labs
GET    /api/labs/:id
PUT    /api/labs/:id

POST   /api/experiments
POST   /api/experiments/extract-pdf
PUT    /api/experiments/:id

POST   /api/submissions
GET    /api/submissions/:id

POST   /api/evaluations
POST   /api/evaluations/:id/re-evaluate

POST   /api/viva
GET    /api/reports/...
```

The exact endpoint design may evolve during implementation, but must remain RESTful and role-protected.

---

# 14. Authentication Flow

```text
User
 ↓
Login
 ↓
Backend validates credentials
 ↓
JWT generated
 ↓
Frontend stores authentication state
 ↓
Protected route
 ↓
Role authorization
 ↓
Dashboard
```

First login:

```text
Login
 ↓
mustChangePassword = true
 ↓
Force password change
 ↓
Update password
 ↓
mustChangePassword = false
 ↓
Dashboard
```

---

# 15. Authorization

Authorization must be enforced on the backend.

Frontend hiding a button is not sufficient security.

Example:

```text
Student
  ✗ Create Experiment

Teacher
  ✓ Create Experiment

Admin/HOD
  ✓ Manage Users
```

Every protected API operation must verify:

1. Authentication
2. Role
3. Resource ownership/assignment where applicable

---

# 16. PDF Experiment Extraction

Architecture:

```text
Teacher
 ↓
Upload PDF
 ↓
Backend receives file
 ↓
PDF extraction service
 ↓
Extract experiment information
 ↓
Return draft experiments
 ↓
Teacher reviews/edits
 ↓
Teacher confirms
 ↓
Database
```

Extracted content is always considered a draft until teacher confirmation.

---

# 17. Code Evaluation Architecture

```text
Student
 ↓
Write Code
 ↓
Manual Run
 ↓
Execution Service
 ↓
Result
```

Official submission:

```text
Student
 ↓
Submit
 ↓
Create Submission
 ↓
Execution/Evaluation
 ↓
Run Test Cases
 ↓
Calculate Score
 ↓
Store Evaluation
 ↓
Update Best Score
```

Arbitrary student code must not be executed directly inside the main API process.

The execution layer must be isolated/sandboxed before production use.

---

# 18. Scoring Flow

```text
Submission
     ↓
Test Cases
     ↓
Automated Score /10
     ↓
Best Official Attempt
     ↓
Viva /5
     ↓
Experiment Total /15
```

For 12 experiments:

```text
12 × 15 = 180
```

---

# 19. Frontend Architecture

Pages should be organized around roles.

```text
pages/
├── auth/
│   ├── Login
│   └── ChangePassword
│
├── admin/
│   ├── Dashboard
│   ├── Users
│   ├── Teachers
│   ├── Students
│   ├── Sections
│   ├── Labs
│   └── Reports
│
├── teacher/
│   ├── Dashboard
│   ├── Labs
│   ├── Experiments
│   ├── Submissions
│   ├── Evaluations
│   ├── Viva
│   ├── Notifications
│   └── Reports
│
└── student/
    ├── Dashboard
    ├── Labs
    ├── Experiments
    ├── Submission
    ├── Results
    └── Notifications
```

---

# 20. Deployment Architecture

```text
                  Internet
                     │
          ┌──────────┴──────────┐
          │                     │
       Vercel                 Render
      Frontend                Backend
          │                     │
          └──────────┬──────────┘
                     │
                MongoDB Atlas
```

Environment variables must contain:

```text
DATABASE_URL
JWT_SECRET
API_URL
other required secrets
```

Secrets must never be committed to Git.

---

# 21. Stitch Integration

The `stitch_files/` directory is reference material.

The coding agent must inspect the relevant Stitch screen before implementing its corresponding page.

The intended process is:

```text
Stitch Screen
     ↓
Identify UI structure
     ↓
Map to PRD functionality
     ↓
Implement React component
     ↓
Connect real API
     ↓
Test
```

The Stitch design must not be replaced by an unrelated generic dashboard design.
