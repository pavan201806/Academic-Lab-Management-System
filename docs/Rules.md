# Academic Lab Management System — AI Coding Rules

## 1. General Rule

The AI coding agent must treat:

```text
PRD.md
Architecture.md
Rules.md
Design.md
Phases.md
```

as project-level instructions.

Do not invent requirements when an existing requirement is already defined.

---

# 2. Stitch Is the UI Reference

The `stitch_files/` directory contains the approved visual references.

Before implementing a screen:

1. Inspect the corresponding Stitch screen.
2. Identify its layout.
3. Identify its components.
4. Identify colors and typography.
5. Implement the screen.
6. Connect it to real application functionality.

Do not replace Stitch designs with generic AI-generated dashboard layouts.

---

# 3. Requirements Rule

Do not add major features that are not in the PRD.

If a feature is technically necessary for an existing requirement, implement the minimum required solution.

Do not silently change business rules.

Examples:

Do not change:

```text
3 official attempts
```

to:

```text
Unlimited attempts
```

Do not change:

```text
10 automated + 5 viva
```

to another scoring model.

---

# 4. Roles

The application has exactly three authentication roles:

```text
ADMIN_HOD
TEACHER
STUDENT
```

Do not create separate authentication roles for:

```text
MAIN_TEACHER
ASSISTANT_TEACHER
```

These are teacher assignment types.

---

# 5. Roll Number / Username Rule

Student and teacher identifiers are alphanumeric.

Valid:

```text
23341A4504
504
23A1B07
CSE24A001
```

Invalid:

```text
23 341A4504
23-341A4504
23@341A4504
```

Do not create numeric-only validation.

---

# 6. Authentication Rules

Passwords must never be stored as plaintext.

Use secure password hashing.

JWT secrets must come from environment variables.

Temporary passwords must be changed on first login.

Never log:

- Passwords
- JWT secrets
- Database credentials
- Other sensitive credentials

---

# 7. Authorization

Never rely only on frontend restrictions.

Every protected backend route must verify authorization.

Example:

```text
Student → cannot create experiment
Teacher → can create experiment for assigned lab
Admin/HOD → can manage users
```

A hidden frontend button is not a security mechanism.

---

# 8. Database Rules

Use MongoDB through a clean data-access/model layer.

Do not place database queries randomly inside React components.

Do not duplicate the same data unnecessarily.

Use references where appropriate.

Preserve historical academic records.

Never delete historical submissions merely because a user/lab is deactivated.

---

# 9. API Rules

Use consistent HTTP status codes.

Use structured responses.

Example:

```json
{
  "success": true,
  "data": {}
}
```

Errors should follow a consistent structure:

```json
{
  "success": false,
  "message": "Meaningful error message"
}
```

Do not expose internal stack traces to users in production.

---

# 10. Error Handling

Every asynchronous operation must handle:

- Loading
- Success
- Failure
- Empty state

Frontend errors should display meaningful messages.

Avoid:

```text
Something went wrong
```

when a useful message can be provided.

---

# 11. No Fake Functionality

Do not create fake success responses for features that are supposed to use the backend.

Do not use permanent mock data for:

- Students
- Teachers
- Labs
- Experiments
- Submissions
- Marks
- Notifications

Mock data may be used temporarily during UI development, but it must be clearly isolated and replaced before the feature is considered complete.

---

# 12. Experiment Extraction

PDF extraction is not automatically trusted.

Always use:

```text
Extract → Review → Edit → Confirm → Save
```

Never directly insert extracted PDF content into the final experiment collection without teacher confirmation.

---

# 13. Submission Rules

Manual code runs are not official attempts.

Official attempts must be explicitly recorded.

The system must preserve attempt history.

For the default three attempts:

```text
Attempt 1
Attempt 2
Attempt 3
```

The highest official experiment score is retained.

---

# 14. Scoring Rules

Automated score:

```text
Maximum = 10
```

Viva:

```text
Maximum = 5
```

Experiment:

```text
Maximum = 15
```

12 experiments:

```text
Maximum = 180
```

Do not hard-code calculations in multiple places.

Create a centralized scoring service/function.

---

# 15. Viva Rules

Viva marks are manually entered.

Do not automatically generate viva marks.

Maximum:

```text
5
```

The system must store who entered the marks and when.

---

# 16. Notification Rules

Only teachers can delete notifications.

Students can read notifications and mark them as read.

Do not provide a student-facing delete operation.

The backend must enforce this rule even if a student manually calls the API.

---

# 17. Historical Data

Never destroy academic history through normal deactivation.

Historical records include:

- Code
- Submissions
- Marks
- Viva
- Evaluations
- Reports

Use soft deactivation where appropriate.

---

# 18. Code Execution Security

Never execute arbitrary student code directly inside the main Express server process in production.

The execution system must be isolated.

Do not give student code access to:

- Database credentials
- Environment variables
- Backend filesystem
- Host operating system
- Internal network services

---

# 19. Frontend Rules

Create reusable components.

Avoid huge components.

Prefer:

```text
Page
 ↓
Section
 ↓
Reusable Components
```

Do not duplicate the same UI implementation across multiple pages when a reusable component is appropriate.

---

# 20. Styling Rules

Do not introduce a completely new visual style.

Follow `Design.md`.

Do not randomly change:

- Primary colors
- Typography
- Border radius
- Spacing
- Button styles
- Card styles

---

# 21. Dependency Rules

Do not install a library simply because it makes one small task easier.

Before adding a dependency:

1. Check whether the existing stack can solve the problem.
2. Check whether the dependency is necessary.
3. Prefer established, maintained libraries.
4. Keep dependencies minimal.

Do not replace the established technology stack without explicit approval.

---

# 22. Environment Variables

Never commit:

```text
.env
.env.local
database passwords
JWT secrets
API keys
```

Provide `.env.example` with variable names but no secrets.

---

# 23. Code Quality

Code must be:

- Readable
- Modular
- Consistent
- Maintainable
- Properly named
- Properly validated

Avoid unnecessary abstractions.

Avoid premature optimization.

---

# 24. Before Completing a Feature

For every feature:

```text
Requirement
 ↓
UI
 ↓
Frontend logic
 ↓
API
 ↓
Backend logic
 ↓
Database
 ↓
Validation
 ↓
Error handling
 ↓
Testing
```

Do not mark a feature complete when only the UI exists.

---

# 25. Change Management

Before making major architectural changes:

- Check `PRD.md`
- Check `Architecture.md`
- Check `Rules.md`
- Check `Phases.md`
- Check `Memory.md` if it exists

Do not rewrite working architecture without a clear reason.

---

# 26. AI Agent Behavior

The AI agent must:

- Read project documentation before coding.
- Inspect existing code before modifying it.
- Reuse existing components where possible.
- Avoid unnecessary rewrites.
- Explain important architectural changes.
- Keep documentation updated when requirements change.
- Record important completed work in `Memory.md` after coding begins.

Do not fabricate completed functionality.

Do not claim a feature is tested when it has not been tested.