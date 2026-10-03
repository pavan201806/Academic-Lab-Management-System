# Academic Lab Management System — Design System

## 1. Design Source

The primary visual reference for the application is the Stitch screen collection located in:

```text
/stitch_files/
```

The implementation should follow those screens as closely as practical.

The Stitch screens define the visual direction.

The PRD defines the functional behavior.

---

# 2. Design Goals

The interface should feel:

- Professional
- Academic
- Clean
- Modern
- Easy to navigate
- Information-dense without feeling crowded
- Suitable for college laboratory management

The UI must prioritize usability over decorative effects.

---

# 3. Design Principles

## Consistency

The same component should look and behave the same throughout the application.

## Hierarchy

Important information must be visually prominent.

Examples:

```text
Lab Name
   ↓
Experiment
   ↓
Status
   ↓
Action
```

## Clarity

Students should immediately understand:

- What experiment they need to complete
- Its status
- Deadline/schedule
- Attempts
- Score
- Required action

Teachers should immediately understand:

- Which labs they manage
- Which students have submitted
- Which submissions require evaluation
- Which experiments are pending

---

# 4. Layout

Use a consistent application shell.

```text
┌──────────────────────────────────────────┐
│ Header                                   │
├────────────┬─────────────────────────────┤
│ Sidebar    │ Main Content                │
│            │                             │
│ Navigation │ Page                        │
│            │                             │
└────────────┴─────────────────────────────┘
```

Responsive behavior must support:

- Desktop
- Laptop
- Tablet
- Smaller screens where practical

---

# 5. Navigation

Navigation must be role-specific.

Admin/HOD:

```text
Dashboard
Users
Teachers
Students
Sections
Labs
Reports
Notifications
Settings
```

Teacher:

```text
Dashboard
My Labs
Experiments
Submissions
Evaluation
Viva
Notifications
Reports
```

Student:

```text
Dashboard
My Labs
Experiments
Submissions
Results
Notifications
Profile
```

The final navigation must match the implemented Stitch screens.

---

# 6. Color System

The exact colors should be extracted from the Stitch reference screens.

Create centralized design tokens rather than hard-coding colors throughout components.

Example:

```text
Primary
Primary Hover
Secondary
Background
Surface
Border
Text Primary
Text Secondary
Success
Warning
Error
Info
```

Do not randomly introduce additional colors.

---

# 7. Typography

Use a clean modern sans-serif font consistent with the Stitch reference.

Typography hierarchy:

```text
Page Title
Section Heading
Card Heading
Body
Secondary Text
Caption
```

Maintain consistent:

- Font sizes
- Font weights
- Line heights
- Letter spacing

---

# 8. Buttons

Buttons must communicate hierarchy.

Primary:

```text
Create
Submit
Save
Publish
Evaluate
```

Secondary:

```text
Cancel
Back
View
Edit
```

Danger:

```text
Delete
Deactivate
```

Destructive actions must require confirmation where appropriate.

---

# 9. Cards

Cards should be used for:

- Lab summaries
- Experiment summaries
- Statistics
- Notifications
- Student performance
- Teacher dashboards

Avoid excessive card nesting.

---

# 10. Tables

Tables are appropriate for:

- Students
- Teachers
- Experiments
- Submissions
- Marks
- Reports

Tables should support clear:

- Headers
- Status indicators
- Actions
- Empty states

---

# 11. Status Indicators

Use consistent status badges.

Examples:

```text
Pending
Submitted
Evaluated
Returned
Missed
Reopened
Completed
Active
Inactive
```

Status should be understandable without relying only on color.

---

# 12. Forms

Forms should provide:

- Clear labels
- Helpful placeholders
- Validation
- Error messages
- Required-field indication
- Save/cancel actions

Validation errors should appear close to the relevant field.

---

# 13. Experiment UI

Experiment pages should clearly present:

```text
Experiment Number
Experiment Title
Problem Statement
Instructions
Input
Output
Constraints
Examples
Language
Test Cases
Attempts
Schedule
Deadline
Submission
Score
```

Student code editor and execution results should have a clear visual separation.

---

# 14. Dashboard

Dashboard content should be role-specific.

## Student Dashboard

Possible information:

```text
Assigned Labs
Current Experiments
Pending Work
Completed Work
Upcoming Deadlines
Recent Scores
Notifications
Overall Progress
```

## Teacher Dashboard

Possible information:

```text
Assigned Labs
Active Experiments
Pending Evaluations
Student Progress
Recent Submissions
Notifications
Lab Statistics
```

## Admin/HOD Dashboard

Possible information:

```text
Total Students
Total Teachers
Total Labs
Sections
Active Labs
Overall Academic Activity
Reports
```

---

# 15. Notifications

Notifications should clearly distinguish:

```text
Unread
Read
```

Display:

- Title
- Message
- Sender
- Date/time
- Related lab when applicable

Teacher notification management should expose deletion controls only to teachers.

---

# 16. Accessibility

The UI should provide:

- Sufficient contrast
- Readable text
- Keyboard-friendly controls
- Visible focus states
- Clear labels
- Meaningful error messages

Do not rely exclusively on color to communicate status.

---

# 17. Loading States

Use appropriate loading indicators for:

- API calls
- PDF extraction
- Code execution
- Submission
- Report generation

Do not freeze the interface without feedback.

---

# 18. Empty States

Every major data screen should have a useful empty state.

Example:

```text
No experiments have been created yet.

Create an experiment manually or upload a laboratory PDF.
```

---

# 19. Responsive Design

Desktop is the primary environment for teachers and administrators.

Student screens must remain usable on smaller displays.

Tables may become:

- Horizontally scrollable
- Condensed
- Card-based

depending on the Stitch design.

---

# 20. Visual Rule

The application should look like one coherent product.

Avoid:

- Random gradients
- Excessive animations
- Unnecessary glassmorphism
- Inconsistent icons
- Random colors
- Different button styles on different pages
- Generic AI dashboard designs unrelated to Stitch