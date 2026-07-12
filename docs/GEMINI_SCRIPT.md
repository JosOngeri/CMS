# Phase 4 Refactoring: The "Holy Trinity" Script System

This document outlines the usage of the three specialized Python scripts designed to safely refactor the KMainCMS legacy `pool.query` calls into the modern Repository pattern (Phase 4).

## 1. Overview of the Trinity

| Script | Role | Description |
| :--- | :--- | :--- |
| `refactor_runner.py` | **The Execution Engine** | Performs the actual code replacements, git commits, and pre-flight safety checks. |
| `refactor_verifier.py` | **The Auditor** | Scans the codebase post-refactor to verify legacy calls are gone and imports are correct. |
| `refactor_cleaner.py` | **The Janitor** | Removes temporary session files, logs, and manages backup purging. |

---

## 2. Pre-Requisites

1.  **Python 3.10+**: Ensure Python is installed and accessible in your PATH.
2.  **Git Cleanliness**: Your working tree **must** be clean (no uncommitted changes).
3.  **Backup Space**: Ensure you have enough disk space for repository snapshots in `D:\Kiserian Main SDA Communications Department\KMainCMS\backups`.

---

## 3. Step-by-Step Usage Guide

### Step 1: Configuration
Open `refactor_runner.py` and verify the paths in the `CONFIG` block:
- `manifest`: Path to `PHASE4_REFACTORING_MANIFEST.json`.
- `mappings`: Path to `COMPLETE_QUERY_REPLACEMENT_LIST.md`.

### Step 2: Dry Run (Safety Check)
Run the runner without flags first. It will simulate the changes and log them to `refactor_session.log`.
```bash
python refactor_runner.py
```

### Step 3: Execution
Apply the changes to the codebase.
```bash
python refactor_runner.py --execute
```
**Transactional Execution:** The script applies one replacement, runs a syntax check, and commits it. If a change breaks syntax, it rolls back that specific file.

### Step 4: The Approval Gate
After 10 successful commits, the script will pause.
1. Create a file named `APPROVE_PHASE4.token` in the root.
2. Restart the script to proceed.

### Step 5: Post-Refactor Verification
```bash
python refactor_verifier.py
```

### Step 6: Cleanup
```bash
python refactor_cleaner.py
```

---
**Last Updated:** 2026-06-22
