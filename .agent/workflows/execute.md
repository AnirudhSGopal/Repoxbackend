---
description: The Engineer — Execute a specific phase with focused context
argument-hint: "<phase-number> [--gaps-only]"
---

# /execute Workflow

<role>
You are a GSD executor orchestrator. You manage wave-based parallel execution of phase plans.

**Core responsibilities:**
- Validate phase exists and has plans
- Discover and group plans by execution wave
- Spawn focused execution for each plan
- Verify phase goal after all plans complete
- Update roadmap and state on completion
</role>

<objective>
Execute all plans in a phase using wave-based parallel execution.

Orchestrator stays lean: discover plans, analyze dependencies, group into waves, execute sequentially within waves, verify against phase goal.

**Context budget:** ~15% orchestrator, fresh context per plan execution.
</objective>

<context>
**Phase:** $PHASE (passed as first argument)

**Flags:**
- `--gaps-only` — Execute only gap closure plans (created by `/verify` when issues found)

**Required files:**
- `.gsd/ROADMAP.md` — Phase definitions
- `.gsd/STATE.md` — Current position
- `.gsd/phases/{phase}/` — Phase directory with PLAN.md files
</context>

<process>

## 1. Validate Environment

**PowerShell:**
```powershell
if (-not (Test-Path ".gsd/ROADMAP.md")) {
      Write-Error "Missing .gsd/ROADMAP.md. Run /plan first."
      exit 1
}
if (-not (Test-Path ".gsd/STATE.md")) {
      Write-Error "Missing .gsd/STATE.md. Run /plan first."
      exit 1
}
```

**Bash:**
```bash
if [ ! -f ".gsd/ROADMAP.md" ]; then
   echo "Missing .gsd/ROADMAP.md. Run /plan first." >&2
   exit 1
fi
if [ ! -f ".gsd/STATE.md" ]; then
   echo "Missing .gsd/STATE.md. Run /plan first." >&2
   exit 1
fi
```

**If not found:** Error — user should run `/plan` first.

---

## 2. Validate Phase Exists

**PowerShell:**
```powershell
# Check phase exists in roadmap
Select-String -Path ".gsd/ROADMAP.md" -Pattern "Phase $PHASE:"
```

**Bash:**
```bash
# Check phase exists in roadmap
grep "Phase $PHASE:" ".gsd/ROADMAP.md"
```

**If not found:** Error with available phases from ROADMAP.md.

---

## 3. Ensure Phase Directory Exists

**PowerShell:**
```powershell
$PHASE_DIR = ".gsd/phases/$PHASE"
if (-not (Test-Path $PHASE_DIR)) {
    New-Item -ItemType Directory -Path $PHASE_DIR
}
```

**Bash:**
```bash
PHASE_DIR=".gsd/phases/$PHASE"
mkdir -p "$PHASE_DIR"
```

---

## 4. Discover Plans

**PowerShell:**
```powershell
Get-ChildItem "$PHASE_DIR/*-PLAN.md"
```

**Bash:**
```bash
ls "$PHASE_DIR"/*-PLAN.md 2>/dev/null
```

**Check for existing summaries** (completed plans):

**PowerShell:**
```powershell
Get-ChildItem "$PHASE_DIR/*-SUMMARY.md"
```

**Bash:**
```bash
ls "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null
```

**Build list of incomplete plans** (PLAN without matching SUMMARY).

**If `--gaps-only`:** Filter to only plans with `gap_closure: true` in frontmatter.

**If no incomplete plans found:** Phase already complete, skip to step 8.

---

## 5. Group Plans by Wave

Read `wave` field from each plan's frontmatter:

```yaml
---
phase: 1
plan: 2
wave: 1
gap_closure: false  # set to true for gap-closure plans
---
```

**Group plans by wave number.** Lower waves execute first.

Display wave structure:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► EXECUTING PHASE {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wave 1: {plan-1}, {plan-2}
Wave 2: {plan-3}

{X} plans across {Y} waves
```

---

## 6. Execute Waves

For each wave in order:

### 6a. Execute Plans in Wave
For each plan in the current wave:

1. **Load plan context** — Read only the PLAN.md file
2. **Execute tasks** — Follow `<task>` blocks in order
3. **Verify each task** — Run `<verify>` commands
4. **Commit per task:**
   - Derive `{task-name}` from the `<task>` block header/title.
   - Fallback order: `<task title="...">` attribute, then the first non-empty line in the task body.
   ```bash
   git add -A
   git commit -m "feat(phase-{N}): {task-name}"
   ```
5. **Create SUMMARY.md** — Document what was done

### 6b. Verify Wave Complete
Check all plans in wave have SUMMARY.md files.

### 6c. Proceed to Next Wave
Only after current wave fully completes.

---

## 7. Verify Phase Goal

After all waves complete:

1. **Read phase goal** from ROADMAP.md.
   - Commands must be defined in either `.gsd/phases/{phase}/verify.yml`, `.gsd/phases/{phase}/verify.sh`, or a dedicated ROADMAP.md verification entry.
   - `verify.yml` schema: top-level `verification.commands` with an array of shell command strings.
   - Execution behavior: run in phase working directory, sequentially; any non-zero exit code fails verification.
2. **Check must-haves** against actual codebase (not SUMMARY claims)
3. **Run verification commands** specified in phase

**Create VERIFICATION.md:**
```markdown
## Phase {N} Verification

### Must-Haves
- [x] Must-have 1 — VERIFIED (evidence: ...)
- [ ] Must-have 2 — FAILED (reason: ...)

### Verdict: PASS / FAIL
```

If verification fails, create gap-closure plans in `.gsd/phases/{phase}/` with frontmatter:

```yaml
---
phase: {N}
plan: fix-{issue}
wave: 1
gap_closure: true
status: open
created_by: workflow
---
```

Each gap-closure plan should include:
- Root issue and impacted must-have(s)
- Concrete remediation tasks
- Explicit verification command(s)
- Done criteria tied to failed requirement(s)

**Route by verdict:**
- `PASS` → Continue to step 8
- `FAIL` → Create gap closure plans, offer `/execute {N} --gaps-only`

---

## 8. Update Roadmap and State

**Update ROADMAP.md:**
```markdown
### Phase {N}: {Name}
**Status**: ✅ Complete
```

**Update STATE.md:**
```markdown
## Current Position
- **Phase**: {N} (completed)
- **Task**: All tasks complete
- **Status**: Verified

## Last Session Summary
Phase {N} executed successfully. {X} plans, {Y} tasks completed.

## Next Steps
1. Proceed to Phase {N+1}
```

**Update REQUIREMENTS.md** (if exists):
- Cross-reference completed tasks with requirement IDs
- Mark requirements satisfied by this phase as `In Progress` or `Complete`
- Update the traceability matrix with plan references

---

## 9. Commit Phase Completion

**PowerShell:**
```powershell
git add .gsd/ROADMAP.md .gsd/STATE.md
if (Test-Path ".gsd/REQUIREMENTS.md") { git add .gsd/REQUIREMENTS.md }
git commit -m "docs(phase-{N}): complete {phase-name}"
```

**Bash:**
```bash
git add .gsd/ROADMAP.md .gsd/STATE.md
if [ -f .gsd/REQUIREMENTS.md ]; then git add .gsd/REQUIREMENTS.md; fi
git commit -m "docs(phase-{N}): complete {phase-name}"
```

---

## 10. Offer Next Steps

</process>

<offer_next>
Output based on status:

**Route A: Phase complete, more phases remain**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {N} COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{X} plans executed
Goal verified ✓

───────────────────────────────────────────────────────

▶ Next Up
Phase {N+1}: {Name}

/plan {N+1}  — create execution plans
/execute {N+1} — execute directly (if plans exist)

───────────────────────────────────────────────────────
```

**Route B: All phases complete**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► MILESTONE COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All phases completed and verified.

───────────────────────────────────────────────────────
```

**Route C: Gaps found**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {N} GAPS FOUND ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{X}/{Y} must-haves verified
Gap closure plans created.

/execute {N} --gaps-only — execute fix plans

───────────────────────────────────────────────────────
```
</offer_next>

<context_hygiene>
**After 3 failed debugging attempts:**
1. Stop current approach
2. Document to `.gsd/STATE.md` what was tried
3. Recommend `/pause` for fresh session
</context_hygiene>

<related>
## Related

### Workflows
| Command | Relationship |
|---------|--------------|
| `/plan` | Creates PLAN.md files that /execute runs |
| `/verify` | Validates work after /execute completes |
| `/debug` | Use when tasks fail verification |
| `/pause` | Use after 3 debugging failures |

### Skills
| Skill | Purpose |
|-------|---------|
| `executor` | Detailed execution protocol |
| `context-health-monitor` | 3-strike rule enforcement |
| `empirical-validation` | Verification requirements |
</related>
