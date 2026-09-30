"""Validate GRANULAR_AUDIT_CLUSTERS.md file refs against tracked files.

Regenerates the doc with a freshness banner and marks entries whose
files were removed by the dead-code purge as ARCHIVED.
"""
import re
import subprocess
import sys
from pathlib import Path

DOC = Path("Documentation/Audit Reports/GRANULAR_AUDIT_CLUSTERS.md")
ARCHIVE_MANIFEST = Path("../_archive/dead-code/MANIFEST.md")

tracked = set(
    subprocess.check_output(["git", "ls-files"], text=True, encoding="utf-8").splitlines()
)

doc = DOC.read_text(encoding="utf-8-sig")
refs = re.findall(r"`\.\\([^`]+)`", doc)
stale = [r for r in refs if r.replace("\\", "/") not in tracked]
unique_stale = sorted(set(stale))

print(f"doc file refs : {len(refs)} ({len(set(refs))} unique)")
print(f"stale refs    : {len(stale)} ({len(unique_stale)} unique)")

if "--report-only" in sys.argv:
    for s in unique_stale:
        print("  -", s)
    sys.exit(0)

# Annotate stale refs inline: `.\path` -> `.\path` 📦 ARCHIVED
def annotate(match):
    inner = match.group(1)
    if inner.replace("\\", "/") in tracked:
        return match.group(0)
    return match.group(0) + " 📦 ARCHIVED"

new_doc = re.sub(r"`\.\\([^`]+)`", annotate, doc)

banner = (
    "> **Regenerated {date}** — file references validated against the tracked\n"
    "> repository after the Phase C dead-code purge. Entries marked\n"
    "> 📦 ARCHIVED refer to files moved to `../_archive/dead-code/` (see its\n"
    "> MANIFEST.md); their audit findings no longer apply to the live tree.\n\n"
    .format(date=__import__("datetime").date.today().isoformat())
)

if "📦 ARCHIVED" not in doc:
    new_doc = banner + new_doc
else:
    new_doc = re.sub(r"^> \*\*Regenerated.*?\n\n", banner, new_doc, flags=re.S, count=1)

DOC.write_text(new_doc, encoding="utf-8")
print(f"annotated {len(stale)} stale refs in {DOC}")
