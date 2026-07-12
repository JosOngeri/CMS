# Skill: Comprehensive Codebase Audit Protocol

This protocol defines the systematic process for auditing the KMainCMS codebase (2,500+ files) to ensure a lean, mobile-friendly, and functional architecture.

## 1. Operational Protocol

### Step 1: Mapping the Terrain (Indexing)
- **Goal:** Identify every directory and its weight (file count/type).
- **Command:** Use `list_files` recursively on major directories (`frontend/src`, `backend`).
- **Target:** Identify "Logic Centers" (where `.js`, `.jsx`, and `.sql` live) and "Static Noise" (assets, logs, temp files).

### Step 2: Cluster Auditing (The "Batch" Method)
Instead of reading one-by-one, files must be audited in functional clusters:
1.  **Data Layer:** All files in `backend/repositories/`. Check for raw SQL efficiency.
2.  **API Layer:** All files in `backend/controllers/`. Check for duplicate logic and stub usage.
3.  **State Layer:** All files in `frontend/src/contexts/` and `hooks/`. Check for "Kitchen Sink" providers.
4.  **UI Components:** All files in `frontend/src/components/common/`. Audit for accessibility and mobile responsiveness.

### Step 3: Optimization & "Lean" Check
- **Dependency Audit:** Cross-reference `package.json` with imports in `src/`. Identify libraries that are imported but only used in 1-2 files (Candidates for replacement).
- **Mobile Audit:** Search for hardcoded widths (`w-[500px]`) or non-flex/grid layouts that break on small screens.

---

## 2. Instructions for Updating Findings

When a "Gap" is discovered, it must be logged immediately into `DEEP_GAP_ANALYSIS.md` using the following format:

```markdown
### [ID] [Component/Module Name]
*   **Gap:** Describe the specific technical or UX debt.
*   **Complexity Weight:** (Low/Medium/High) - How much does this bloat the app?
*   **Mobile Impact:** (Yes/No) - Does this affect small screens?
*   **Fix:** Surgical instruction to resolve.
```

---

## 3. Execution Plan (Phases)

| Phase | Target Area | Objective |
| :--- | :--- | :--- |
| **P1** | `backend/repositories` | Audit SQL performance and data integrity. |
| **P2** | `backend/controllers` | Eliminate stubs and consolidate redundant logic. |
| **P3** | `frontend/src/utils` | Minimize dependencies (Native Fetch vs Axios). |
| **P4** | `frontend/src/components`| Ensure 100% Mobile responsiveness and Skeleton loading. |
| **P5** | `frontend/src/router` | Implement Role-based security guards. |

---

## 4. Current Status
- [x] **Project Indexed:** 2,568 Files identified.
- [ ] **Data Layer Audit:** Pending.
- [ ] **API Layer Audit:** 10% Complete (DashboardController analyzed).
- [ ] **State Layer Audit:** 20% Complete (Auth/ColorPalette analyzed).
- [ ] **Mobile Responsiveness Audit:** 15% Complete (Sidebar/Layout analyzed).
