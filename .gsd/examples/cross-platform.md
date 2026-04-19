# Cross-Platform Commands Reference

> PowerShell ↔ Bash equivalents for GSD workflows

## Common Operations

| Operation | PowerShell | Bash |
|-----------|------------|------|
| **Test file exists** | `Test-Path "file.md"` | `test -f "file.md"` |
| **Test directory exists** | `Test-Path "dir" -PathType Container` | `test -d "dir"` |
| **Create directory** | `New-Item -ItemType Directory -Path "dir"` | `mkdir -p "dir"` |
| **List files** | `Get-ChildItem "*.md"` | `ls *.md` |
| **List recursively** | `Get-ChildItem -Recurse` | `find . -type f` |
| **Read file** | `Get-Content "file.md"` | `cat "file.md"` |
| **Search in files** | `Get-ChildItem -Recurse -File \| Select-String -Pattern "TODO"` | `rg "TODO" .` |
| **Count lines** | `(Get-Content file).Count` | `wc -l < file` |
| **Copy files** | `Copy-Item -Recurse src dest` | `cp -r src dest` |
| **Delete files** | `Remove-Item -Recurse -Force dir` | `rm -rf dir` |

## Git Operations (Same on Both)

```bash
git add -A
git commit -m "message"
git push
git status --short
```

## Workflow-Specific Examples

### /map — Analyze Codebase

**PowerShell:**
```powershell
Get-ChildItem -Recurse -Directory | 
    Where-Object { $_.FullName -notmatch "[\\/](node_modules|\.git)([\\/]|$)" }
```

**Bash:**
```bash
find . -type d ! -path "*/node_modules/*" ! -path "*/.git/*"
```

---

### /plan — Check SPEC Status

**PowerShell:**
```powershell
$spec = Get-Content ".gsd/SPEC.md" -Raw
if ($spec -match "FINALIZED") { "Ready" }
```

**Bash:**
```bash
if grep -q "FINALIZED" .gsd/SPEC.md; then echo "Ready"; fi
```

---

### /execute — Discover Plans

**PowerShell:**
```powershell
Get-ChildItem ".gsd/phases/1/*-PLAN.md"
```

**Bash:**
```bash
ls .gsd/phases/1/*-PLAN.md 2>/dev/null
```

---

### /verify — Search TODOs

**PowerShell:**
```powershell
Get-ChildItem -Path "src" -Recurse -File | Select-String -Pattern "TODO|FIXME"
```

**Bash:**
```bash
rg -n "TODO|FIXME" src/
```

---

## Environment Detection

Add this to workflows for cross-platform commands:

```markdown
**Note:** Include both PowerShell and Bash variants in workflow docs for portability.
```

---

*Reference for PowerShell and Bash users*
