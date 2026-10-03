# Academic Lab Management System — Product Requirements Document

## 1. Project Overview

The Academic Lab Management System is a web-based platform for managing college laboratory activities digitally.

The system centralizes:

- Student and teacher management
- Lab and section management
- Teacher assignments
- Experiment creation and ordering
- PDF-based experiment extraction
- Manual experiment creation
- Experiment scheduling and reopening
- Online code submission and execution
- Test-case based evaluation
- Multiple official attempts
- Viva marks
- Re-evaluation
- Student progress tracking
- Teacher notifications
- Reports and marks
- Historical lab records

The system is designed around the **Lab** as the central academic unit.

Example:

```text
Subject/Lab: C Programming Lab

Section A
├── Main Teacher
├── Assistant Teacher
├── Students
└── 12 Experiments
    ├── Experiment 1
    ├── Experiment 2
    ├── ...
    └── Experiment 12
```

---

# 2. Target Users

The system has exactly three application roles:

1. Admin/HOD
2. Teacher
3. Student

Teachers can have an assignment type:

- Main Teacher
- Assistant Teacher

Main Teacher and Assistant Teacher are responsibilities within the Teacher role, not separate authentication roles.

---

# 3. User Identification

Student and teacher roll numbers/usernames must support alphanumeric values.

Examples:

```text
23341A4504
504
23A1B07
CSE24A001
```

The system must NOT restrict identifiers to numbers only.

Validation requirement:

```text
Only letters and numbers are allowed.
No spaces.
No special characters.
```

Recommended validation pattern:

```regex
^[A-Za-z0-9]+$
```

The identifier must be unique within the relevant user records.

---

# 4. Authentication

## 4.1 Login

All users authenticate using:

- Roll number / username
- Password

## 4.2 Initial Password

When an account is created by Admin/HOD:

- A temporary password is generated/assigned.
- The user can log in using the temporary password.
- On the first successful login, the user must change the password.
- The temporary password must not remain usable after the required password change.

## 4.3 Authentication Requirements

The system must implement:

- Secure password hashing
- JWT-based authentication
- Role-based authorization
- Protected API routes
- Protected frontend routes
- Logout
- First-login password-change state

---

# 5. Roles and Permissions

## 5.1 Admin/HOD

Admin/HOD manages the academic structure and users.

Responsibilities:

- Create/manage teacher accounts
- Create/manage student accounts
- Manage sections
- Manage labs
- Assign teachers to labs
- Assign Main Teacher
- Assign Assistant Teacher
- Assign student groups/sections to labs
- View lab activity
- View student performance
- View teacher performance/activity
- Manage academic configuration
- Conduct/select students for viva
- Enter viva marks
- View reports
- Download reports
- Preserve access to historical records

Admin/HOD should not automatically receive permissions that belong exclusively to teachers, such as deleting teacher-managed notifications, unless that permission is explicitly implemented later.

---

# 5.2 Teacher

Teachers manage the labs assigned to them.

Teacher responsibilities:

- View assigned labs
- View assigned sections
- View assigned students
- Create/manage experiments
- Upload experiment PDF
- Extract experiment names from PDF
- Manually enter experiments
- Edit extracted experiment information
- Reorder experiments
- Publish experiments
- Schedule experiments
- Reopen experiments
- Configure official attempts
- Configure attempt cooldown where applicable
- Configure test cases
- Review submissions
- Evaluate/re-evaluate submissions
- View marks
- Monitor student progress
- Manage notifications
- Create/send notifications
- Delete notifications
- View/download reports

Only teachers can delete notifications.

---

# 5.3 Student

Students can:

- Log in
- Change temporary password
- View assigned labs
- View assigned experiments
- View experiment instructions
- View experiment status
- View schedules/deadlines
- Run code manually
- Submit official attempts
- View attempt history
- View scores
- View best score
- View viva marks
- View total marks
- View notifications
- Mark notifications as read
- View personal progress
- View returned/re-evaluation information

Students cannot:

- Create experiments
- Modify experiment configuration
- Modify test cases
- Modify marks
- Delete notifications
- Manage users
- Assign teachers
- Assign students to labs

---

# 6. Academic Structure

The core hierarchy is:

```text
Academic Year
    ↓
Semester
    ↓
Subject / Lab
    ↓
Section
    ↓
Students
```

A section is a fixed group of students.

A section can be enrolled in multiple labs concurrently.

A teacher can handle multiple:

- Sections
- Labs
- Academic years

A lab is the central unit connecting:

- Subject
- Semester
- Academic year
- Section
- Teachers
- Experiments
- Students
- Submissions
- Marks
- Reports

---

# 7. Lab Management

A lab contains:

- Lab name
- Subject name
- Academic year
- Semester
- Sections
- Main Teacher
- Assistant Teacher(s)
- Experiments
- Schedule
- Student submissions
- Evaluation records

Example:

```text
C Programming Lab
2026–27
Semester 1

Section A
Main Teacher: Teacher A
Assistant Teacher: Teacher B

Experiments:
1. Basic C Programs
2. Conditional Statements
3. Loops
...
12. Final Experiment
```

Teachers may manage multiple labs.

---

# 8. Experiment Management

Teachers have two ways to create experiments.

## Method 1 — PDF Extraction

Teacher uploads a laboratory manual/PDF.

The system extracts experiment names/details from the PDF.

For example:

```text
Experiment 1
Experiment 2
...
Experiment 12
```

The extracted information must NOT be saved blindly.

Workflow:

```text
Upload PDF
   ↓
Extract experiment information
   ↓
Display extracted experiments
   ↓
Teacher reviews
   ↓
Teacher edits if required
   ↓
Teacher confirms
   ↓
Save experiments
```

The teacher must always have an opportunity to review and modify extracted content.

## Method 2 — Manual Entry

Teacher can manually create experiments.

Fields may include:

- Experiment number
- Experiment title
- Description
- Problem statement
- Instructions
- Input format
- Output format
- Constraints
- Example input
- Example output
- Programming language
- Test cases
- Marks
- Schedule
- Deadline
- Attempt configuration

---

# 9. Experiment Ordering

Experiments must have an explicit order.

Example:

```text
1 → Experiment 1
2 → Experiment 2
3 → Experiment 3
...
12 → Experiment 12
```

Teachers can reorder experiments when appropriate.

The ordering must be preserved consistently for teachers and students.

---

# 10. Programming Languages

The initial system must support:

- C
- C++
- Java
- Python

The architecture should allow additional languages to be added later without redesigning the experiment model.

---

# 11. Code Execution

Students can manually execute code before submitting.

Manual runs are not counted as official attempts.

Example:

```text
Student writes code
       ↓
Run
       ↓
Test against available test input
       ↓
See output/result
       ↓
Modify code
       ↓
Run again
```

Manual execution should not consume an official submission attempt.

---

# 12. Official Attempts

Official submissions are separate from manual runs.

The system supports configurable official attempt limits.

The default academic configuration may use:

```text
3 official attempts
```

For the official attempts:

```text
Attempt 1
Attempt 2
Attempt 3
```

The system retains the highest experiment score across the official attempts.

Example:

```text
Attempt 1 → 6/10
Attempt 2 → 8/10
Attempt 3 → 7/10

Best Score → 8/10
```

Attempt configuration should be stored per experiment/lab rather than hard-coded throughout the application.

---

# 13. Attempt Cooldown

The system may enforce a configurable cooldown between official attempts.

Example:

```text
Attempt 1 submitted
       ↓
Cooldown
       ↓
Attempt 2 becomes available
```

The cooldown must be configurable by the teacher/lab configuration.

---

# 14. Test Cases

Experiments can contain test cases.

Test cases may be:

- Teacher-defined
- AI-assisted/generated where explicitly enabled

Test cases must be controlled by the authorized teacher.

Students must not be able to access hidden test cases.

---

# 15. Automated Evaluation

Official submissions are evaluated using test cases.

The evaluation should determine:

- Compilation success/failure
- Runtime status
- Test case results
- Passed test cases
- Failed test cases
- Score

Scoring should be proportional to successful test cases where applicable.

Example:

```text
10 test cases
8 passed

Score = 8/10
```

The final scoring implementation must be deterministic and stored with the submission result.

---

# 16. Experiment Marks

Each experiment has:

```text
Automated / Programming Score = 10 marks
Viva = 5 marks
Total = 15 marks
```

Therefore:

```text
Experiment Total = /15
```

For 12 experiments:

```text
12 × 15 = 180 marks
```

The system should continuously calculate:

- Experiment score
- Viva score
- Experiment total
- Lab total
- Average

---

# 17. Viva

Viva is manually evaluated.

The viva carries:

```text
5 marks
```

Admin/HOD can select a submitted student for viva and enter the viva marks digitally.

The viva record must contain:

- Student
- Lab
- Experiment
- Evaluator
- Marks
- Timestamp
- Optional remarks

Viva marks must not be automatically generated.

---

# 18. Re-evaluation

Authorized teachers can re-evaluate submissions when required.

Re-evaluation must:

- Preserve the original submission
- Preserve the previous evaluation record
- Record the new evaluation
- Record evaluator
- Record timestamp
- Update the effective score according to the configured rules

Students should be able to see the updated result where permitted.

---

# 19. Missed Work and Reopening

If a student misses an experiment/deadline:

- The system records the missed status.
- The applicable score may become zero according to the lab rules.
- An authorized teacher can reopen the experiment for the student when required.

Reopening should be recorded.

The system must not silently overwrite historical status.

---

# 20. Submission Status

Submission states may include:

```text
Pending
Submitted
Evaluated
Returned
Re-evaluation
```

The system must maintain submission history.

---

# 21. Notifications

Teachers can create/send notifications to:

- Individual students
- Sections
- Labs
- Relevant student groups

Notifications may contain:

- Title
- Message
- Lab
- Target audience
- Created by
- Created time
- Read/unread state

Students can:

- View notifications
- Mark notifications as read

Only teachers can delete notifications.

---

# 22. Reports

The system must support report generation.

Reports should include:

- Student performance
- Experiment marks
- Viva marks
- Total marks
- Average
- Attempt information
- Lab progress
- Section performance

Export formats:

- PDF
- Excel

Reports must respect role-based access.

---

# 23. Historical Records

Deactivating a user, lab, section, or related entity must not destroy historical academic records.

Historical records include:

- Previous submissions
- Submitted code
- Marks
- Viva records
- Evaluation history
- Reports

Authorized HOD/teachers must be able to access appropriate historical information.

---

# 24. Lab Completion

After all required experiments are completed/evaluated:

```text
Lab Status → Completed
```

For a 12-experiment lab:

```text
Total = /180
Average = /15
```

The dashboard should continuously show the current progress before completion.

---

# 25. Non-Functional Requirements

The application must provide:

- Responsive web interface
- Secure authentication
- Role-based authorization
- Input validation
- API validation
- Error handling
- Loading states
- Empty states
- Success/error feedback
- Maintainable code
- Reusable UI components
- Scalable database structure
- Secure environment-variable handling

---

# 26. Technology

## Frontend

- React
- Vite
- JavaScript/TypeScript as established by implementation
- React Router
- Axios
- CSS/component system based on the Stitch design

## Backend

- Node.js
- Express.js
- REST API

## Database

- MongoDB
- MongoDB Atlas

## Deployment

```text
Frontend → Vercel
Backend  → Render
Database → MongoDB Atlas
```

---

# 27. Stitch Design Requirement

The provided Stitch screens are the primary visual reference.

The implementation must reproduce the intended:

- Layout
- Navigation
- Visual hierarchy
- Cards
- Tables
- Buttons
- Forms
- Dashboard structure
- Colors
- Typography
- Spacing
- Responsive behavior

Functional requirements take priority over visual imitation when the two conflict.

---

# 28. Success Criteria

The project is successful when:

1. Admin/HOD can manage the academic structure.
2. Teachers can manage assigned labs.
3. Students can access only their assigned labs.
4. Experiments can be created manually or extracted from PDFs.
5. Teachers can review extracted experiments before saving.
6. Students can run and submit code.
7. Official attempts are tracked separately from manual runs.
8. Highest official experiment score is retained.
9. Automated marks and viva marks are handled separately.
10. Teachers can re-evaluate submissions.
11. Missed experiments can be reopened by authorized teachers.
12. Notifications are teacher-managed and only teachers can delete them.
13. Reports can be generated.
14. Historical academic records are preserved.
15. The implemented UI follows the Stitch reference screens.