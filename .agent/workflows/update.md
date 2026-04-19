---
description: Update GSD to the latest version from GitHub
---

# /update Workflow

<objective>
Update GSD for Antigravity to the latest version from GitHub.
</objective>

<process>

## 1. Check Current Version

**PowerShell:**
```powershell
if (Test-Path "CHANGELOG.md") {
    $version = Select-String -Path "CHANGELOG.md" -Pattern "## \[(\d+\.\d+\.\d+)\]" | 
        Select-Object -First 1
    Write-Output "Current version: $($version.Matches.Groups[1].Value)"
}
```

**Bash:**
```bash
if [ -f "CHANGELOG.md" ]; then
    version=$(sed -n 's/^## \[\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)\].*/\1/p' CHANGELOG.md | head -1)
    echo "Current version: $version"
fi
```

---

## 2. Fetch Latest from GitHub

```bash
# Clone latest to temp directory
git clone --depth 1 https://github.com/toonight/get-shit-done-for-antigravity.git .gsd-update-temp
if [ $? -ne 0 ]; then
    echo "Clone failed" >&2
    exit 1
fi
```

---

## 3. Compare Versions

**PowerShell:**
```powershell
$remoteVersion = Select-String -Path ".gsd-update-temp/CHANGELOG.md" -Pattern "## \[(\d+\.\d+\.\d+)\]" | 
    Select-Object -First 1

Write-Output "Remote version: $($remoteVersion.Matches.Groups[1].Value)"
```

**Bash:**
```bash
remote_version=$(sed -n 's/^## \[\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)\].*/\1/p' .gsd-update-temp/CHANGELOG.md | head -1)
echo "Remote version: $remote_version"
```

**If same version:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► ALREADY UP TO DATE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Version: {version}

No updates available.

───────────────────────────────────────────────────────
```
Exit after cleanup.

**Cleanup for same-version path:**

**PowerShell:**
```powershell
if (Test-Path ".gsd-update-temp") { Remove-Item -Recurse -Force ".gsd-update-temp" }
```

**Bash:**
```bash
rm -rf .gsd-update-temp
```

---

## 4. Show Changes

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► UPDATE AVAILABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current: {current-version}
Latest:  {remote-version}

Changes:
{Extract from CHANGELOG.md}

───────────────────────────────────────────────────────

Update now?
A) Yes — Apply updates
B) No — Cancel

───────────────────────────────────────────────────────
```

---

## 5. Apply Updates

**If user confirms:**

**PowerShell:**
```powershell
# Backup current
if (Test-Path ".agent") { Copy-Item -Recurse ".agent" ".agent.backup" }
if (Test-Path ".agents") { Copy-Item -Recurse ".agents" ".agents.backup" }
if (Test-Path ".gsd/templates") { Copy-Item -Recurse ".gsd/templates" ".gsd/templates.backup" }

# Update workflows (preserve user's .gsd docs)
if (Test-Path ".gsd-update-temp/.agent") { Copy-Item -Recurse -Force ".gsd-update-temp/.agent/*" ".agent/" }

# Update skills (Agent Skills standard)
if (Test-Path ".gsd-update-temp/.agents") { Copy-Item -Recurse -Force ".gsd-update-temp/.agents/*" ".agents/" }

# Update templates only
if (Test-Path ".gsd-update-temp/.gsd/templates") { Copy-Item -Recurse -Force ".gsd-update-temp/.gsd/templates/*" ".gsd/templates/" }

# Update root files
foreach ($file in @("GSD-STYLE.md", "CHANGELOG.md", "PROJECT_RULES.md", "VERSION")) {
    $src = ".gsd-update-temp/$file"
    if (Test-Path $src) { Copy-Item -Force $src "./" }
}
```

**Bash:**
```bash
# Backup current
[ -d .agent ] && cp -r .agent .agent.backup
[ -d .agents ] && cp -r .agents .agents.backup
[ -d .gsd/templates ] && cp -r .gsd/templates .gsd/templates.backup

# Update workflows (preserve user's .gsd docs)
[ -d .gsd-update-temp/.agent ] && cp -r .gsd-update-temp/.agent/* .agent/

# Update skills (Agent Skills standard)
[ -d .gsd-update-temp/.agents ] && cp -r .gsd-update-temp/.agents/* .agents/

# Update templates only
[ -d .gsd-update-temp/.gsd/templates ] && cp -r .gsd-update-temp/.gsd/templates/* .gsd/templates/

# Update root files
for file in GSD-STYLE.md CHANGELOG.md PROJECT_RULES.md VERSION; do
    [ -f ".gsd-update-temp/$file" ] && cp ".gsd-update-temp/$file" ./
done
```

---

## 6. Cleanup

**PowerShell:**
```powershell
if (Test-Path ".gsd-update-temp") { Remove-Item -Recurse -Force ".gsd-update-temp" }
if (Test-Path ".agent.backup") { Remove-Item -Recurse -Force ".agent.backup" }
if (Test-Path ".agents.backup") { Remove-Item -Recurse -Force ".agents.backup" }
if (Test-Path ".gsd/templates.backup") { Remove-Item -Recurse -Force ".gsd/templates.backup" }
```

**Bash:**
```bash
rm -rf .gsd-update-temp
rm -rf .agent.backup
rm -rf .agents.backup
rm -rf .gsd/templates.backup
```

---

## 7. Confirm

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► UPDATED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Updated to version {remote-version}

───────────────────────────────────────────────────────

/whats-new — See what changed

───────────────────────────────────────────────────────
```

</process>

<preserved_files>
These user files are NEVER overwritten:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/STATE.md
- .gsd/ARCHITECTURE.md
- .gsd/STACK.md
- .gsd/DECISIONS.md
- .gsd/JOURNAL.md
- .gsd/TODO.md
- .gsd/phases/*
- .gemini/GEMINI.md
</preserved_files>
