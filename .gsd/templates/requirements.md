# Requirements Template

Template for `.gsd/REQUIREMENTS.md` — formal requirements tracking with traceability.

---

## File Template

```markdown
---
milestone: {name}
updated: [ISO timestamp]
---

# Requirements

## Overview

Requirements derived from SPEC.md for traceability and coverage tracking.

---

## Functional Requirements

| ID | Requirement | Source | Phase | Status |
|----|-------------|--------|-------|--------|
| REQ-01 | {requirement description} | SPEC Goal 1 | 1 | Pending |
| REQ-02 | {requirement description} | SPEC Goal 1 | 1 | Pending |
| REQ-03 | {requirement description} | SPEC Goal 2 | 2 | Pending |
| REQ-04 | {requirement description} | SPEC Goal 2 | 2 | Pending |
| REQ-05 | {requirement description} | SPEC Goal 3 | 3 | Pending |

---

## Non-Functional Requirements

| ID | Requirement | Category | Phase | Status |
|----|-------------|----------|-------|--------|
| NFR-01 | Response time < 200ms | Performance | 4 | Pending |
| NFR-02 | Mobile responsive | UX | All | Pending |
| NFR-03 | 99% uptime | Reliability | 4 | Pending |

---

## Constraints

| ID | Constraint | Source | Impact |
|----|------------|--------|--------|
| CON-01 | {constraint} | SPEC | {affected areas} |
| CON-02 | {constraint} | Technical | {affected areas} |

---

## Traceability Matrix

| Requirement | Plans | Summary Evidence | Tests | Verification Artifact | Status |
|-------------|-------|------------------|-------|------------------------|--------|
| REQ-01 | 1.1, 1.2 | 1-1-SUMMARY.md | TC-01 | phases/1/VERIFICATION.md | — |
| REQ-02 | 1.2 | 1-2-SUMMARY.md | TC-02, TC-03 | phases/1/VERIFICATION.md | — |
| REQ-03 | 2.1 | 2-1-SUMMARY.md | TC-04 | phases/2/VERIFICATION.md | — |

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| Pending | Not yet started |
| In Progress | Being implemented |
| Complete | Implemented and verified |
| Blocked | Cannot proceed |
| Deferred | Moved to later milestone |
```

---

## Guidelines

**Requirement IDs:**
- REQ-XX: Functional requirements
- NFR-XX: Non-functional requirements
- CON-XX: Constraints

**Good requirements are:**
- Testable
- Specific
- Traceable to SPEC goals

**Update when:**
- Phase completes (mark requirements satisfied)
- Scope changes (add/defer requirements)
- Verification passes (update status)
