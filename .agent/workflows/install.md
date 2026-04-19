---
description: Install GSD into the current project from GitHub
---

# /install Workflow

<objective>
Install GSD for Antigravity into the current project from GitHub.
</objective>

<process>

## 1. Check for Existing Installation

Look for GSD marker directories:

**PowerShell:**
```powershell
$alreadyInstalled = (Test-Path ".agents") -or (Test-Path ".agent") -or (Test-Path ".gsd")
if ($alreadyInstalled) {
    Write-Output "GSD files detected in this project."
}
```

**Bash:**
```bash
if [ -d ".agents" ] || [ -d ".agent" ] || [ -d ".gsd" ]; then
    echo "GSD files detected in this project."
fi
```

**If already installed:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► ALREADY INSTALLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GSD files already exist in this project.

───────────────────────────────────────────────────────

A) Reinstall — Overwrite with latest version
B) Cancel — Keep current installation

If you want to update instead: /update

───────────────────────────────────────────────────────
```

If user chooses Cancel, exit.
If user chooses Reinstall, continue to Step 2.

---

## 2. Clone from GitHub

```bash
git clone --depth 1 https://github.com/toonight/get-shit-done-for-antigravity.git .gsd-install-temp
if [ $? -ne 0 ]; then
    echo "Clone failed" >&2
    exit 1
fi
```

---

## 3. Copy Files

**PowerShell:**
```powershell
# Core directories
foreach ($dir in @(".agent", ".agents", ".gemini", ".gsd", "adapters", "docs", "scripts")) {
    $src = ".gsd-install-temp/$dir"
    if (Test-Path $src) {
        Copy-Item -Recurse -Force $src ".\"
    }
}

# Root files
foreach ($file in @("PROJECT_RULES.md", "GSD-STYLE.md", "model_capabilities.yaml")) {
    $src = ".gsd-install-temp/$file"
    if (Test-Path $src) {
        Copy-Item -Force $src ".\"
    }
}
```

**Bash:**
```bash
# Core directories
for dir in .agent .agents .gemini .gsd adapters docs scripts; do
    if [ -d ".gsd-install-temp/$dir" ]; then
        cp -r ".gsd-install-temp/$dir" ./
    fi
done

# Root files
for file in PROJECT_RULES.md GSD-STYLE.md model_capabilities.yaml; do
    if [ -f ".gsd-install-temp/$file" ]; then
        cp ".gsd-install-temp/$file" ./
    fi
done
```

---

## 4. Cleanup

**PowerShell:**
```powershell
if (Test-Path ".gsd-install-temp") {
    Remove-Item -Recurse -Force ".gsd-install-temp"
}
```

**Bash:**
```bash
rm -rf .gsd-install-temp
```

---

## 5. Add to .gitignore (Optional)

Check if `.gsd/STATE.md` and other session files should be gitignored:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► ADD TO .gitignore?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommended .gitignore additions for session-specific files:

.gsd/STATE.md
.gsd/JOURNAL.md
.gsd/TODO.md

───────────────────────────────────────────────────────

A) Yes — Add recommended entries
B) No — Skip

───────────────────────────────────────────────────────
```

---

## 6. Confirm Installation

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► INSTALLED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GSD for Antigravity has been installed.

Files installed:
• .agent/        (workflows)
• .agents/       (skills — Agent Skills standard)
• .gemini/       (Gemini integration)
• .gsd/          (project state templates)
• adapters/      (model-specific enhancements)
• docs/          (operational documentation)
• scripts/       (utility scripts)
• PROJECT_RULES.md
• GSD-STYLE.md
• model_capabilities.yaml

───────────────────────────────────────────────────────

Next step:

/new-project — Initialize your project with GSD

───────────────────────────────────────────────────────
```

</process>

<notes>
- This workflow is designed to work from a clean project (no prior GSD installation)
- It copies ALL necessary files, unlike manual installation which may miss some
- For updates to an existing installation, use /update instead
- The /new-project command should be run after installation to set up SPEC.md
</notes>
