---
description: Show recent GSD changes and new features
---

# /whats-new Workflow

<objective>
Display recent changes, new features, and improvements to GSD for Antigravity.
</objective>

<process>

## 1. Read CHANGELOG.md

**PowerShell:**
```powershell
if (-not (Test-Path "CHANGELOG.md")) {
        Write-Error "CHANGELOG.md not found"
        exit 1
}

$lines = Get-Content "CHANGELOG.md"
$headerIndexes = for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^##\s+\[') { $i }
}

if ($headerIndexes.Count -eq 0) {
        Write-Output "No version sections found in CHANGELOG.md"
} else {
        $maxSections = [Math]::Min(3, $headerIndexes.Count)
        for ($section = 0; $section -lt $maxSections; $section++) {
                $start = $headerIndexes[$section]
                $end = if ($section + 1 -lt $headerIndexes.Count) { $headerIndexes[$section + 1] - 1 } else { $lines.Count - 1 }
                $lines[$start..$end]
                if ($section -lt $maxSections - 1) { "" }
        }
}
```

**Bash:**
```bash
if [ ! -f "CHANGELOG.md" ]; then
    echo "CHANGELOG.md not found" >&2
    exit 1
fi

awk '
    /^## \[/ {h[++n]=NR}
    {line[NR]=$0}
    END {
        if (n==0) { print "No version sections found in CHANGELOG.md"; exit }
        max=(n<3?n:3)
        for (i=1; i<=max; i++) {
            start=h[i]
            end=(i< n ? h[i+1]-1 : NR)
            for (j=start; j<=end; j++) print line[j]
            if (i<max) print ""
        }
    }
' CHANGELOG.md
```

## 2. Display Recent Changes

Display up to the latest 3 version sections from CHANGELOG.md:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► WHAT'S NEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VERSION {latest-version} — {date}
══════════════════════════════════════

{Latest section content from CHANGELOG.md}

───────────────────────────────────────────────────────

VERSION {previous-version} — {date}
══════════════════════════════════════

{Previous section content from CHANGELOG.md}

───────────────────────────────────────────────────────

VERSION {third-version} — {date}
══════════════════════════════════════

{Third section content from CHANGELOG.md}

───────────────────────────────────────────────────────

📚 Full changelog: CHANGELOG.md

───────────────────────────────────────────────────────
```

</process>

<related>
## Related

### Workflows
| Command | Relationship |
|---------|--------------|
| `/update` | Update GSD to latest version |
| `/help` | List all commands |

</related>
