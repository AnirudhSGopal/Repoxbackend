---
description: Capture a todo item for later
argument-hint: "<description> [--priority high|medium|low]"
---

# /add-todo Workflow

<objective>
Quickly capture an idea, task, or issue without interrupting current work flow.
</objective>

<context>
**Item:** $ARGUMENTS (the todo description)

**Flags:**
- `--priority high|medium|low` — Set priority (default: medium)

**Output:**
- `.gsd/TODO.md` — Accumulated todo items
</context>

<process>

## 1. Parse Arguments

Extract:
- Todo description
- Priority (default: medium)

---

## 2. Ensure TODO.md Exists

```powershell
if (-not (Test-Path ".gsd/TODO.md")) {
    New-Item -ItemType Directory -Path ".gsd" -Force | Out-Null
    Set-Content -Path ".gsd/TODO.md" -Value "# TODO`n`n"
}
```

---

## 3. Add Todo Item

Append to `.gsd/TODO.md`:

```markdown
- [ ] {description} `{priority}` — {date: YYYY-MM-DD}
```

---

## 4. Confirm

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TODO ADDED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{description}
Priority: {priority}

───────────────────────────────────────────────────────

/check-todos — see all pending items

───────────────────────────────────────────────────────
```

</process>
