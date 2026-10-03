# Academic Lab Management System — Development Phases

## Development Strategy

The application must be developed incrementally.

Do not attempt to build the entire system in one pass.

Each phase should produce a working and testable increment.

---

# Phase 0 — Project Foundation

### Goals

- Create repository structure
- Configure frontend
- Configure backend
- Configure MongoDB
- Configure environment variables
- Configure Git
- Add project documentation
- Inspect Stitch screens

### Deliverables

```text
frontend/
backend/
stitch_files/
PRD.md
Architecture.md
Rules.md
Design.md
Phases.md
```

---

# Phase 1 — Authentication

### Features

- Login
- JWT authentication
- Password hashing
- Role detection
- Protected routes
- Logout
- Temporary password
- Mandatory first-login password change

### Roles

```text
ADMIN_HOD
TEACHER
STUDENT
```

### Validation

Test identifiers such as:

```text
23341A4504
504
23A1B07
```

---

# Phase 2 — Academic Structure

### Features

- Student management
- Teacher management
- Section management
- Lab creation
- Academic year
- Semester
- Teacher assignment
- Main Teacher assignment
- Assistant Teacher assignment
- Student-section assignment
- Section-lab assignment

### Deliverable

A complete academic structure that can be used by the rest of the system.

---

# Phase 3 — Lab Management

### Features

- Lab dashboard
- Assigned labs
- Lab details
- Teacher access control
- Student lab access
- Lab activation/deactivation
- Historical lab preservation

---

# Phase 4 — Experiment Management

### Features

- Manual experiment creation
- Experiment editing
- Experiment ordering
- Experiment publishing
- Experiment scheduling
- Deadline
- Reopening
- Programming language selection
- Experiment status

---

# Phase 5 — PDF Experiment Extraction

### Features

- PDF upload
- Experiment extraction
- Extracted experiment preview
- Teacher editing
- Teacher confirmation
- Save confirmed experiments

Required flow:

```text
PDF
 ↓
Extract
 ↓
Review
 ↓
Edit
 ↓
Confirm
 ↓
Save
```

---

# Phase 6 — Code Execution and Submission

### Features

- Code editor
- C
- C++
- Java
- Python
- Manual execution
- Execution output
- Compilation errors
- Official submission
- Submission history

Manual runs must not consume official attempts.

---

# Phase 7 — Evaluation and Scoring

### Features

- Test cases
- Automated evaluation
- Proportional scoring
- Maximum 10 automated marks
- Official attempt tracking
- Three-attempt configuration
- Highest-score retention
- Attempt cooldown
- Evaluation history

Scoring:

```text
Automated = /10
```

---

# Phase 8 — Viva and Re-evaluation

### Features

- Student selection
- Viva evaluation
- Viva marks
- Maximum 5 marks
- Viva remarks
- Re-evaluation
- Evaluation history

Final experiment score:

```text
Automated /10
+
Viva /5
=
Experiment /15
```

---

# Phase 9 — Notifications and Progress

### Features

- Teacher notifications
- Target students/sections/labs
- Read/unread state
- Notification deletion by teachers
- Student progress
- Pending experiments
- Completed experiments
- Missed experiments
- Reopened experiments

---

# Phase 10 — Reports

### Features

- Student report
- Section report
- Lab report
- Experiment report
- Marks report
- Viva report
- Progress report
- PDF export
- Excel export

For 12 experiments:

```text
Maximum = 180
Average = /15
```

---

# Phase 11 — Admin/HOD Dashboard

### Features

- Overall statistics
- Students
- Teachers
- Labs
- Sections
- Lab activity
- Performance overview
- Reports
- Historical records

---

# Phase 12 — UI Refinement

### Tasks

Compare every implemented screen with the Stitch reference.

Check:

- Layout
- Colors
- Typography
- Spacing
- Cards
- Tables
- Buttons
- Navigation
- Responsive behavior

Remove temporary mock UI.

---

# Phase 13 — Security and Validation

### Verify

- Authentication
- Authorization
- API validation
- Input validation
- Password security
- JWT security
- File upload validation
- Code execution isolation
- Environment variables
- Error handling
- Historical data preservation

---

# Phase 14 — Testing

Test:

### Authentication

- Admin login
- Teacher login
- Student login
- Temporary password
- Password change
- Invalid credentials

### Academic Structure

- Create student
- Create teacher
- Create section
- Create lab
- Assign teachers
- Assign students

### Experiments

- Manual creation
- PDF extraction
- Review
- Editing
- Ordering
- Publishing
- Scheduling
- Reopening

### Submissions

- Manual run
- Official submission
- Multiple attempts
- Highest score
- Evaluation
- Re-evaluation

### Viva

- Select student
- Enter marks
- Verify calculation

### Notifications

- Teacher sends
- Student receives
- Student reads
- Teacher deletes

### Reports

- Generate
- Download
- Verify calculations

---

# Phase 15 — Production Deployment

### Frontend

Deploy to:

```text
Vercel
```

### Backend

Deploy to:

```text
Render
```

### Database

Use:

```text
MongoDB Atlas
```

### Final checks

- Environment variables
- CORS
- Production API URL
- Database connection
- Authentication
- File uploads
- Code execution
- Reports
- Error handling

---

# Phase Completion Rule

A phase is complete only when:

```text
UI
+
Frontend Logic
+
Backend API
+
Database
+
Validation
+
Error Handling
+
Testing
```

are working together.

A screen that only looks correct is not considered a completed feature.