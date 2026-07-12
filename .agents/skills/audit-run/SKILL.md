---
name: audit-run
description: Orchestrate the full audit workflow — runs audit-cluster to inspect files, then optionally runs audit-apply to fix them, cluster by cluster
argument-hint: "[cluster range, e.g. '01-05' or 'all' or '03']"
allowed-tools:
  - read
  - grep
  - glob
---

You are the audit orchestrator for the KMainCMS project. You coordinate the full audit workflow across clusters.

## Audit Map Location
`D:\VIbeCode\KMainCMS\GRANULAR_AUDIT_CLUSTERS.md`

## How to Use This Skill
The user will tell you which clusters to process. Examples:
- "Cluster 01" — audit and optionally fix a single cluster
- "Clusters 01 to 05" — audit clusters 01 through 05 in order
- "all" — work through every cluster in the audit map
- "just audit Cluster 03, don't fix" — audit only, skip the fix step

## Your Workflow

### Step 0 — Discover Clusters (if range is "all")
Read `GRANULAR_AUDIT_CLUSTERS.md` and count all `### Cluster XX:` headings to know the full list.

### For Each Cluster in the Requested Range:

#### Phase A — Audit
Use the `/audit-cluster` skill to inspect the cluster:
- Tell it exactly which cluster number to audit
- Wait for the audit report
- Summarize the key findings: how many files, how many gaps confirmed, top issues

#### Phase B — Fix Decision
Present the summary to the user and ask:
> "Cluster XX audit complete. Found [N] gaps across [M] files. Apply fixes now? (yes / no / skip to next)"

If the user says **yes**: use the `/audit-apply` skill for this cluster, then continue to the next cluster.
If the user says **no** or **skip**: move on without fixing.
If the user says **stop**: halt the entire run and give a final summary.

### Running Tally
After each cluster, maintain and display a running scoreboard:

```
AUDIT PROGRESS
==============
Clusters done:    X / Y
Files audited:    N
Gaps confirmed:   G
Fixes applied:    F
Clusters skipped: S
```

### Final Summary
When all clusters are done (or the user stops), output:

```
AUDIT RUN COMPLETE
==================
Total clusters processed: X
Total files audited:      N
Total gaps confirmed:     G
Total fixes applied:      F

TOP ISSUES ACROSS ALL CLUSTERS:
  1. <most common gap type and affected files>
  2. <second most common>
  3. <third most common>

RECOMMENDED NEXT STEPS:
  1. <highest priority action>
  2. <second priority action>
  3. <third priority action>
```

## Rules
- Always audit before fixing — never apply fixes without seeing the audit report first
- Process clusters in order (01, 02, 03...) unless the user specifies otherwise
- Never skip the fix-decision question — always ask the user before applying changes
- If a cluster has 0 confirmed gaps, report it as clean and move on automatically without asking
- Keep your summaries concise — the user should not have to read walls of text to follow progress
