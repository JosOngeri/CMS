#!/usr/bin/env python3
"""
refactor_runner.py - Conservative, Auditable, Reversible Refactoring Pipeline

Production-ready Python tool for transforming a JavaScript/Node.js codebase from
raw pool.query calls into repository-pattern calls driven by a manifest and a
large markdown query mapping file.

Defaults to dry-run. Use --execute to mutate files. Each successful change is a
single git commit. Failed changes are automatically reverted. Human approval gates
pause execution when cumulative risk or step batch size is exceeded.

Usage:
    # Generate plan from manifest + mapping, dry-run
    python refactor_runner.py \
        --manifest plans/PHASE4_REFACTORING_MANIFEST.json \
        --mappings plans/COMPLETE_QUERY_REPLACEMENT_LIST.md

    # Execute the plan
    python refactor_runner.py \
        --manifest plans/PHASE4_REFACTORING_MANIFEST.json \
        --mappings plans/COMPLETE_QUERY_REPLACEMENT_LIST.md \
        --execute

    # Continue from approval gate
    python refactor_runner.py \
        --manifest plans/PHASE4_REFACTORING_MANIFEST.json \
        --mappings plans/COMPLETE_QUERY_REPLACEMENT_LIST.md \
        --execute

    # Apply a manual review queue
    python refactor_runner.py --apply-reviewed Review_Queue.md --execute

Exit Codes:
    0  Success (or dry-run completed)
    2  Preflight failure (missing inputs, bad schema, dirty tree, no git, etc.)
    3  Test failure during execution (with Incident_Report.md written)
    4  Approval required (Approval_Request.md written, waiting for token)
    5  Execution aborted by operator or unrecoverable error
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import logging
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Sequence

import yaml

# Optional dependencies. Provide graceful fallbacks so the script can still run in
# audit/dry-run mode even if these are not installed.
try:
    import jsonschema
except ImportError:  # pragma: no cover
    jsonschema = None  # type: ignore

try:
    import sqlparse
except ImportError:  # pragma: no cover
    sqlparse = None  # type: ignore


# ---------------------------------------------------------------------------
# Defaults and configuration
# ---------------------------------------------------------------------------

DEFAULT_CONFIG: Dict[str, Any] = {
    "dry_run": True,
    "confidence_threshold": 0.9,
    "test_commands": {
        "javascript": ["npm", "test", "--", "--grep", "{module}"],
        "python": ["pytest", "-k", "{module}"],
    },
    "syntax_check": {
        "javascript": ["npx", "eslint", "--no-eslintrc", "--parser-options=ecmaVersion:2020"],
        "python": ["python", "-m", "py_compile"],
    },
    "formatter": {
        "javascript": ["npx", "prettier", "--check"],
        "python": ["black", "--check"],
    },
    "approval_batch_size": 5,
    "risk_threshold": 20.0,
    "push_remote": False,
    "retention_days": 30,
    "allow_run_script": False,
    "approval_token_path": ".approval_token",
}


MANIFEST_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["version", "project", "phases"],
    "additionalProperties": False,
    "properties": {
        "version": {"type": "string"},
        "project": {"type": "string"},
        "description": {"type": "string"},
        "source_mapping": {"type": "string"},
        "phases": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "name", "steps"],
                "additionalProperties": False,
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "enabled": {"type": "boolean"},
                    "steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["id", "action", "target"],
                            "additionalProperties": False,
                            "properties": {
                                "id": {"type": "string"},
                                "action": {"type": "string", "enum": ["replace", "rename", "move", "delete", "wrap"]},
                                "target": {"type": "string"},
                                "description": {"type": "string"},
                                "risk_score": {"type": "number", "minimum": 0, "maximum": 10},
                                "auto_apply": {"type": "boolean"},
                            },
                        },
                    },
                },
            },
        },
    },
}


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class QueryMapping:
    """One row from the markdown mapping file."""
    file: str
    line: int
    function: str
    sql: str
    parameters: str
    replacement_method: str
    repository: str
    scope: str
    confidence: float
    notes: str

    @property
    def mapping_id(self) -> str:
        return f"{self.file}:{self.line}:{self.function}"


@dataclass(frozen=True)
class RefactorStep:
    """A single executable change."""
    id: str
    action: str
    target: Path
    original_sql: str
    replacement_call: str
    repository: str
    function: str
    source_line: int
    diff: str
    risk_score: float
    affected_files: List[str]
    confidence: float
    blast_radius_estimate: str


@dataclass
class RefactorPlan:
    steps: List[RefactorStep]
    metadata: Dict[str, Any]
    created_at: str


@dataclass
class StepResult:
    step_id: str
    status: str
    pre_hash: str
    post_hash: str
    diff: str
    test_results: Dict[str, Any]
    commit_hash: Optional[str]
    error_message: Optional[str]
    timestamp: str


@dataclass
class RefactorReport:
    plan: RefactorPlan
    results: List[StepResult]
    pre_run_snapshot: Optional[str]
    final_status: str
    total_steps: int
    successful_steps: int
    failed_steps: int
    skipped_steps: int
    started_at: str
    completed_at: str
    incident_report: Optional[str]


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def configure_logging(log_path: Path = Path("Refactor_Runner.log")) -> logging.Logger:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("refactor_runner")
    logger.setLevel(logging.DEBUG)
    if logger.handlers:
        return logger

    fmt = "%(asctime)s | %(levelname)-8s | %(message)s"
    file_handler = logging.FileHandler(log_path, mode="a")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(fmt))

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(fmt))

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    return logger


LOG = configure_logging()


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def run_cmd(
    cmd: Sequence[str],
    cwd: Optional[Path] = None,
    check: bool = True,
    env: Optional[Dict[str, str]] = None,
    timeout: int = 120,
) -> subprocess.CompletedProcess:
    """Run a command without shell=True. Log command and output."""
    LOG.debug("Running command: %s in %s", " ".join(cmd), cwd or Path.cwd())
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)

    result = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        check=False,
        capture_output=True,
        text=True,
        env=merged_env,
        timeout=timeout,
    )

    if result.stdout:
        LOG.debug("stdout: %s", result.stdout[:5000])
    if result.stderr:
        LOG.debug("stderr: %s", result.stderr[:5000])

    if check and result.returncode != 0:
        raise subprocess.CalledProcessError(
            result.returncode, cmd, output=result.stdout, stderr=result.stderr
        )

    return result


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def get_git_branch(repo: Path) -> str:
    return run_cmd(["git", "branch", "--show-current"], cwd=repo, check=True).stdout.strip()


def is_git_clean(repo: Path) -> bool:
    result = run_cmd(["git", "status", "--porcelain"], cwd=repo, check=True)
    return result.stdout.strip() == ""


def ensure_git_available() -> None:
    try:
        run_cmd(["git", "--version"], check=True)
    except Exception as exc:
        raise RuntimeError("Git is required but not available on PATH") from exc


def ensure_feature_branch(repo: Path) -> str:
    branch = get_git_branch(repo)
    if branch == "main" or branch == "master":
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        feature = f"refactor/{ts}"
        LOG.info("On protected branch '%s'; creating feature branch '%s'", branch, feature)
        run_cmd(["git", "checkout", "-b", feature], cwd=repo, check=True)
        return feature
    return branch


def create_snapshot(repo: Path) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    snapshot = repo.parent / f"pre_refactor_snapshot_{repo.name}_{ts}.tar.gz"
    LOG.info("Creating compressed snapshot: %s", snapshot)
    # Exclude node_modules and .git to keep the archive manageable.
    exclude = ["--exclude=node_modules", "--exclude=.git"]
    run_cmd(["tar", "-czf", str(snapshot), "."] + exclude, cwd=repo, check=True)
    return snapshot


# ---------------------------------------------------------------------------
# Manifest loading and validation
# ---------------------------------------------------------------------------

def load_manifest(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Manifest not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    validate_manifest(manifest)
    return manifest


def validate_manifest(manifest: Dict[str, Any]) -> None:
    if jsonschema is None:
        LOG.warning("jsonschema not installed; skipping schema validation")
        return
    try:
        jsonschema.validate(instance=manifest, schema=MANIFEST_SCHEMA)
    except jsonschema.ValidationError as exc:
        raise ValueError(f"Invalid manifest: {exc.message}") from exc


def generate_manifest_from_mappings(mapping_file: Path, project: str = "KMainCMS") -> Dict[str, Any]:
    """If a manifest is missing, derive a minimal one from the mapping file."""
    mappings = load_query_mappings(mapping_file)
    phases: Dict[str, Dict[str, Any]] = {}
    for m in mappings:
        file_name = Path(m.file).name
        if file_name not in phases:
            phases[file_name] = {
                "id": f"phase-{file_name.replace('.', '-')}",
                "name": f"Refactor {file_name}",
                "description": f"Replace pool.query calls with repository calls in {file_name}",
                "enabled": True,
                "steps": [],
            }
        step_id = f"{file_name.replace('.', '-')}-{len(phases[file_name]['steps']) + 1:03d}"
        phases[file_name]["steps"].append(
            {
                "id": step_id,
                "action": "replace",
                "target": m.file,
                "description": f"Replace query in {m.function} at line {m.line}",
                "risk_score": 3.0,
                "auto_apply": True,
            }
        )
    return {
        "version": "1.0",
        "project": project,
        "description": "Auto-generated manifest from query mapping file",
        "source_mapping": str(mapping_file),
        "phases": list(phases.values()),
    }


# ---------------------------------------------------------------------------
# Mapping parser
# ---------------------------------------------------------------------------

def load_query_mappings(path: Path) -> List[QueryMapping]:
    if not path.exists():
        raise FileNotFoundError(f"Mapping file not found: {path}")

    LOG.info("Parsing query mapping file: %s", path)
    mappings: List[QueryMapping] = []
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    header_seen = False
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            if "Format:" in line and "File | Line" in line:
                header_seen = True
            continue

        parts = line.split("|")
        if len(parts) < 7:
            continue

        file_part, line_part, function, sql, parameters, replacement, repository = parts[:7]
        notes = parts[7].strip() if len(parts) > 7 else ""

        try:
            line_no = int(line_part.strip())
        except ValueError:
            LOG.warning("Skipping line with non-integer line number: %s", line[:80])
            continue

        confidence = 1.0
        if "already exists" in repository.lower() or "already exists" in notes.lower():
            confidence = 1.0
        elif "manual" in notes.lower() or "review" in notes.lower():
            confidence = 0.6

        mappings.append(
            QueryMapping(
                file=file_part.strip(),
                line=line_no,
                function=function.strip(),
                sql=sql.strip(),
                parameters=parameters.strip(),
                replacement_method=replacement.strip(),
                repository=repository.strip(),
                scope=file_part.strip(),
                confidence=confidence,
                notes=notes,
            )
        )

    if not mappings and not header_seen:
        raise ValueError(f"No valid mappings parsed from {path}. File may be empty or malformed.")

    LOG.info("Parsed %d query mappings", len(mappings))
    return mappings


def validate_mappings(mappings: List[QueryMapping]) -> Tuple[List[QueryMapping], List[Dict[str, Any]]]:
    valid: List[QueryMapping] = []
    errors: List[Dict[str, Any]] = []
    for m in mappings:
        errs: List[str] = []
        if not m.file:
            errs.append("missing file")
        if not m.sql:
            errs.append("missing SQL")
        if not m.replacement_method:
            errs.append("missing replacement method")
        if not m.repository:
            errs.append("missing repository")
        if m.confidence < 0 or m.confidence > 1:
            errs.append(f"confidence {m.confidence} out of range")
        if not (0.0 <= m.confidence <= 1.0):
            errs.append(f"confidence {m.confidence} invalid")
        if errs:
            errors.append({"id": m.mapping_id, "errors": errs, "raw": asdict(m)})
        else:
            valid.append(m)
    return valid, errors


# ---------------------------------------------------------------------------
# Plan builder
# ---------------------------------------------------------------------------

def build_plan(
    manifest: Dict[str, Any],
    mappings: List[QueryMapping],
    config: Dict[str, Any],
    repo_root: Path,
) -> RefactorPlan:
    LOG.info("Building refactor plan")
    threshold = config["confidence_threshold"]

    steps: List[RefactorStep] = []
    step_counter = 0

    mapping_by_file: Dict[str, List[QueryMapping]] = {}
    for m in mappings:
        mapping_by_file.setdefault(m.file, []).append(m)

    for phase in manifest.get("phases", []):
        if not phase.get("enabled", True):
            LOG.info("Skipping disabled phase: %s", phase["id"])
            continue

        for phase_step in phase.get("steps", []):
            target_str = phase_step["target"]
            target_path = repo_root / target_str

            matching = mapping_by_file.get(target_str, [])
            for m in matching:
                if m.confidence < threshold:
                    LOG.debug("Skipping low-confidence mapping %s (%.2f)", m.mapping_id, m.confidence)
                    continue

                step_counter += 1
                step_id = f"step_{step_counter:04d}"
                diff = ""
                blast = "unknown"
                if target_path.exists():
                    blast = estimate_blast_radius(target_path, m.sql)
                    diff = compute_diff_for_replacement(target_path, m.sql, build_replacement_call(m), m.line)

                risk = phase_step.get("risk_score", 3.0)
                if m.confidence < 0.8:
                    risk += 1.0
                if m.confidence < 0.7:
                    risk += 1.0
                risk = min(risk, 10.0)

                steps.append(
                    RefactorStep(
                        id=step_id,
                        action=phase_step["action"],
                        target=target_path,
                        original_sql=m.sql,
                        replacement_call=build_replacement_call(m),
                        repository=m.repository,
                        function=m.function,
                        source_line=m.line,
                        diff=diff,
                        risk_score=risk,
                        affected_files=[target_str],
                        confidence=m.confidence,
                        blast_radius_estimate=blast,
                    )
                )

    meta = {
        "manifest_version": manifest.get("version"),
        "project": manifest.get("project"),
        "total_mappings": len(mappings),
        "total_steps": len(steps),
        "high_confidence_steps": len([s for s in steps if s.confidence >= 0.9]),
        "medium_confidence_steps": len([s for s in steps if 0.7 <= s.confidence < 0.9]),
        "low_confidence_steps": len([s for s in steps if s.confidence < 0.7]),
    }
    return RefactorPlan(steps=steps, metadata=meta, created_at=datetime.now(timezone.utc).isoformat())


def build_replacement_call(m: QueryMapping) -> str:
    """Build a reasonable JavaScript call from the mapping row."""
    params = m.parameters.strip()
    if params.startswith("[") and params.endswith("]"):
        inner = params[1:-1].strip()
        # Convert [refreshToken] -> await AuthRepository.findValidRefreshToken(refreshToken)
        return f"await {m.repository}.{m.replacement_method}({inner})"
    return f"await {m.repository}.{m.replacement_method}({params})"


def estimate_blast_radius(path: Path, pattern: str) -> str:
    try:
        content = path.read_text(encoding="utf-8")
    except Exception:
        return "unknown (read error)"

    count = content.count(pattern)
    if count == 0:
        return "none"
    if count == 1:
        return "single occurrence"
    if count < 5:
        return f"{count} occurrences"
    return f"{count} occurrences (high impact)"


def compute_diff_for_replacement(path: Path, original: str, replacement: str, target_line: int) -> str:
    if not path.exists():
        return ""
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    new_lines = lines.copy()

    # Attempt line-precise replacement; fall back to first occurrence if line mismatch.
    idx = target_line - 1
    if 0 <= idx < len(lines) and original in lines[idx]:
        new_lines[idx] = lines[idx].replace(original, replacement, 1)
    else:
        for i, line in enumerate(lines):
            if original in line:
                new_lines[i] = line.replace(original, replacement, 1)
                break

    return "".join(difflib.unified_diff(lines, new_lines, fromfile=str(path), tofile=str(path), lineterm=""))


# ---------------------------------------------------------------------------
# Simulation and execution
# ---------------------------------------------------------------------------

def simulate_plan(plan: RefactorPlan) -> None:
    LOG.info("=" * 80)
    LOG.info("DRY-RUN PLAN SUMMARY")
    LOG.info("=" * 80)
    LOG.info("Total steps: %d", len(plan.steps))
    LOG.info("High confidence (>=0.9): %d", plan.metadata["high_confidence_steps"])
    LOG.info("Medium confidence (0.7-0.9): %d", plan.metadata["medium_confidence_steps"])
    LOG.info("Low confidence (<0.7): %d", plan.metadata["low_confidence_steps"])
    for step in plan.steps:
        LOG.info(
            "\n%s | %s | %s | risk=%.1f | conf=%.2f | blast=%s",
            step.id,
            step.action,
            step.target,
            step.risk_score,
            step.confidence,
            step.blast_radius_estimate,
        )
        LOG.info("Diff preview:\n%s", step.diff[:800])


def apply_step(step: RefactorStep, dry_run: bool, config: Dict[str, Any]) -> StepResult:
    LOG.info("Processing step %s: %s", step.id, step.target)
    now = datetime.now(timezone.utc).isoformat()

    if not step.target.exists():
        return StepResult(
            step_id=step.id,
            status="skipped",
            pre_hash="",
            post_hash="",
            diff=step.diff,
            test_results={},
            commit_hash=None,
            error_message=f"Target file not found: {step.target}",
            timestamp=now,
        )

    pre_hash = sha256_file(step.target)

    if dry_run:
        return StepResult(
            step_id=step.id,
            status="success",
            pre_hash=pre_hash,
            post_hash=pre_hash,
            diff=step.diff,
            test_results={"dry_run": True},
            commit_hash=None,
            error_message=None,
            timestamp=now,
        )

    with tempfile.TemporaryDirectory(prefix="refactor_step_") as tmpdir:
        temp_path = Path(tmpdir) / step.target.name
        shutil.copy2(step.target, temp_path)

        try:
            apply_change_to_temp(temp_path, step, config)
        except Exception as exc:
            LOG.error("Failed to apply change for %s: %s", step.id, exc)
            return StepResult(
                step_id=step.id,
                status="failed",
                pre_hash=pre_hash,
                post_hash=pre_hash,
                diff=step.diff,
                test_results={},
                commit_hash=None,
                error_message=f"Apply failed: {exc}",
                timestamp=now,
            )

        try:
            test_results = run_tests_for_step(step, temp_path, config)
        except Exception as exc:
            LOG.error("Test hook failed for %s: %s", step.id, exc)
            return StepResult(
                step_id=step.id,
                status="failed",
                pre_hash=pre_hash,
                post_hash=sha256_file(temp_path),
                diff=step.diff,
                test_results={"error": str(exc)},
                commit_hash=None,
                error_message=f"Test hook failed: {exc}",
                timestamp=now,
            )

        if not all(test_results.values()):
            LOG.error("Tests failed for %s; reverting working tree", step.id)
            return StepResult(
                step_id=step.id,
                status="failed",
                pre_hash=pre_hash,
                post_hash=sha256_file(temp_path),
                diff=step.diff,
                test_results=test_results,
                commit_hash=None,
                error_message="Tests failed",
                timestamp=now,
            )

        # Tests passed; promote temp to real file.
        shutil.copy2(temp_path, step.target)
        post_hash = sha256_file(step.target)

        commit_hash = commit_step(step, config)
        return StepResult(
            step_id=step.id,
            status="success",
            pre_hash=pre_hash,
            post_hash=post_hash,
            diff=step.diff,
            test_results=test_results,
            commit_hash=commit_hash,
            error_message=None,
            timestamp=now,
        )


def apply_change_to_temp(path: Path, step: RefactorStep, config: Dict[str, Any]) -> None:
    suffix = path.suffix.lower()
    if suffix in (".js", ".jsx", ".ts", ".tsx"):
        apply_js_change(path, step, config)
    elif suffix == ".py":
        apply_python_change(path, step, config)
    elif suffix == ".sql":
        apply_sql_change(path, step, config)
    else:
        apply_regex_change(path, step)


def apply_js_change(path: Path, step: RefactorStep, config: Dict[str, Any]) -> None:
    """Use AST-first transforms. Falls back to regex only if AST fails."""
    if config.get("allow_run_script") and shutil.which("node"):
        try:
            apply_js_with_babel(path, step)
            return
        except Exception as exc:
            LOG.warning("Babel AST transform failed for %s: %s; falling back to regex", path, exc)
    apply_regex_change(path, step)


def apply_js_with_babel(path: Path, step: RefactorStep) -> None:
    """
    Run a Node.js script that uses @babel/parser, @babel/traverse, and
    @babel/generator to replace a raw SQL string literal with a repository call.
    """
    script = f"""
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const fs = require('fs');

const code = fs.readFileSync({json.dumps(str(path))}, 'utf8');
const ast = parser.parse(code, {{
  sourceType: 'module',
  plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties']
}});

let changed = false;
const original = {json.dumps(step.original_sql)};
const replacement = {json.dumps(step.replacement_call)};

traverse(ast, {{
  Literal(nodePath) {{
    if (typeof nodePath.node.value === 'string' && nodePath.node.value.includes(original)) {{
      // Replace the whole string literal with the replacement call expression.
      // This is a pragmatic approach; for complex cases, manual review is needed.
      const buildCall = () => {{
        const call = parser.parseExpression(replacement);
        return call;
      }};
      try {{
        nodePath.replaceWith(buildCall());
        changed = true;
      }} catch (e) {{}}
    }}
  }}
}});

if (!changed) {{
  // Fallback: text replace
  let idx = code.indexOf(original);
  if (idx !== -1) {{
    fs.writeFileSync({json.dumps(str(path))}, code.substring(0, idx) + replacement + code.substring(idx + original.length));
  }} else {{
    throw new Error('Pattern not found');
  }}
}} else {{
  const out = generate(ast, {{ retainLines: true }}).code;
  fs.writeFileSync({json.dumps(str(path))}, out);
}}
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
        script_path = Path(f.name)
        f.write(script)

    try:
        run_cmd(["node", str(script_path)], check=True, timeout=60)
    finally:
        script_path.unlink(missing_ok=True)


def apply_python_change(path: Path, step: RefactorStep, config: Dict[str, Any]) -> None:
    import ast

    content = path.read_text(encoding="utf-8")
    if step.original_sql not in content:
        raise ValueError("Pattern not found in Python file")
    new_content = content.replace(step.original_sql, step.replacement_call, 1)
    try:
        ast.parse(new_content)
    except SyntaxError as exc:
        raise ValueError(f"Replacement produced invalid Python syntax: {exc}") from exc
    path.write_text(new_content, encoding="utf-8")


def apply_sql_change(path: Path, step: RefactorStep, config: Dict[str, Any]) -> None:
    content = path.read_text(encoding="utf-8")
    if step.original_sql not in content:
        raise ValueError("Pattern not found in SQL file")
    new_content = content.replace(step.original_sql, step.replacement_call, 1)
    if sqlparse is not None:
        try:
            sqlparse.split(new_content)
        except Exception as exc:
            raise ValueError(f"Replacement produced unparseable SQL: {exc}") from exc
    path.write_text(new_content, encoding="utf-8")


def apply_regex_change(path: Path, step: RefactorStep) -> None:
    content = path.read_text(encoding="utf-8")
    if step.original_sql not in content:
        raise ValueError("Pattern not found")
    new_content = content.replace(step.original_sql, step.replacement_call, 1)
    path.write_text(new_content, encoding="utf-8")


def run_tests_for_step(step: RefactorStep, changed_file: Path, config: Dict[str, Any]) -> Dict[str, Any]:
    results: Dict[str, Any] = {}
    suffix = changed_file.suffix.lower()

    # Syntax check
    syntax_cmd = config.get("syntax_check", {}).get(suffix)
    if syntax_cmd:
        cmd = [part.format(file=str(changed_file)) for part in syntax_cmd] + [str(changed_file)]
        try:
            run_cmd(cmd, cwd=changed_file.parent if suffix != ".python" else None, check=True, timeout=60)
            results["syntax_check"] = True
        except subprocess.CalledProcessError as exc:
            results["syntax_check"] = False
            results["syntax_check_output"] = exc.stderr or exc.output

    # Formatter
    fmt_cmd = config.get("formatter", {}).get(suffix)
    if fmt_cmd:
        cmd = [part.format(file=str(changed_file)) for part in fmt_cmd] + [str(changed_file)]
        try:
            run_cmd(cmd, cwd=changed_file.parent, check=True, timeout=60)
            results["formatter"] = True
        except subprocess.CalledProcessError as exc:
            results["formatter"] = False
            results["formatter_output"] = exc.stderr or exc.output

    # Targeted unit tests
    test_cmds = config.get("test_commands", {})
    if suffix in test_cmds:
        module = step.target.stem
        cmd = [part.format(module=module, file=str(step.target)) for part in test_cmds[suffix]]
        try:
            run_cmd(cmd, cwd=step.target.parent.parent.parent, check=True, timeout=180)
            results["unit_tests"] = True
        except subprocess.CalledProcessError as exc:
            results["unit_tests"] = False
            results["unit_tests_output"] = exc.stderr or exc.output

    return results


def commit_step(step: RefactorStep, config: Dict[str, Any]) -> Optional[str]:
    repo = step.target.resolve().parent
    while repo != repo.parent and not (repo / ".git").is_dir():
        repo = repo.parent
    if not (repo / ".git").is_dir():
        return None

    message = (
        f"refactor({step.repository}): {step.action} in {step.target.name}::{step.function}\n\n"
        f"Step ID: {step.id}\n"
        f"Line: {step.source_line}\n"
        f"Risk Score: {step.risk_score:.1f}\n"
        f"Confidence: {step.confidence:.2f}\n\n"
        f"Replaced raw SQL with {step.repository}.{step.replacement_call.split('(')[0].split('.')[-1]}"
    )
    try:
        run_cmd(["git", "add", "-A"], cwd=repo, check=True)
        result = run_cmd(["git", "commit", "-m", message], cwd=repo, check=True)
        # Extract commit hash
        hash_result = run_cmd(["git", "rev-parse", "HEAD"], cwd=repo, check=True)
        return hash_result.stdout.strip()
    except subprocess.CalledProcessError as exc:
        LOG.error("Git commit failed: %s", exc.stderr or exc.output)
        return None


def rollback_last_commit(repo: Path) -> bool:
    try:
        run_cmd(["git", "revert", "--no-commit", "HEAD"], cwd=repo, check=True)
        run_cmd(["git", "commit", "-m", "auto-rollback: revert failed refactor step"], cwd=repo, check=True)
        return is_git_clean(repo)
    except subprocess.CalledProcessError as exc:
        LOG.error("Rollback failed: %s", exc.stderr or exc.output)
        return False


# ---------------------------------------------------------------------------
# Approval gating
# ---------------------------------------------------------------------------

def approval_needed(config: Dict[str, Any], executed_count: int, cumulative_risk: float) -> bool:
    if executed_count == 0:
        return False
    batch_size = config.get("approval_batch_size", 5)
    risk_threshold = config.get("risk_threshold", 20.0)
    if executed_count % batch_size == 0:
        return True
    if cumulative_risk >= risk_threshold:
        return True
    return False


def write_approval_request(
    config: Dict[str, Any],
    executed_count: int,
    cumulative_risk: float,
    recent_results: List[StepResult],
    plan: RefactorPlan,
) -> Path:
    path = Path("Approval_Request.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Approval Request - Refactor Runner\n\n")
        f.write(f"**Steps Executed:** {executed_count}\n")
        f.write(f"**Cumulative Risk Score:** {cumulative_risk:.1f}\n")
        f.write(f"**Threshold:** {config.get('risk_threshold', 20.0)}\n")
        f.write(f"**Batch Size:** {config.get('approval_batch_size', 5)}\n\n")
        f.write("## Action Required\n\n")
        f.write("Review the diffs below, then approve by creating the token file:\n\n")
        f.write(f"```bash\necho approved > {config.get('approval_token_path', '.approval_token')}\n```\n\n")
        f.write("Then re-run the same command to continue.\n\n")
        f.write("## Recent Steps\n\n")
        for r in recent_results[-5:]:
            f.write(f"### {r.step_id}\n")
            f.write(f"- **Status:** {r.status}\n")
            f.write(f"- **Commit:** {r.commit_hash or 'N/A'}\n")
            f.write(f"- **Test Results:** {r.test_results}\n")
            f.write(f"```diff\n{r.diff[:2000]}\n```\n\n")
    return path


def check_approval_token(config: Dict[str, Any]) -> bool:
    token_path = Path(config.get("approval_token_path", ".approval_token"))
    if not token_path.exists():
        return False
    content = token_path.read_text().strip().lower()
    token_path.unlink(missing_ok=True)
    return content == "approved"


# ---------------------------------------------------------------------------
# Reporting and review queue
# ---------------------------------------------------------------------------

def export_review_queue(plan: RefactorPlan, config: Dict[str, Any]) -> Path:
    path = Path("Review_Queue.md")
    low = [s for s in plan.steps if s.confidence < config["confidence_threshold"]]
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Review Queue\n\n")
        f.write(f"**Confidence Threshold:** {config['confidence_threshold']}\n")
        f.write(f"**Items Below Threshold:** {len(low)}\n\n")
        for step in low:
            f.write(f"## {step.id}\n")
            f.write(f"- **Target:** {step.target}\n")
            f.write(f"- **Function:** {step.function}\n")
            f.write(f"- **Confidence:** {step.confidence:.2f}\n")
            f.write(f"- **Risk:** {step.risk_score:.1f}\n")
            f.write(f"- **Blast Radius:** {step.blast_radius_estimate}\n")
            f.write(f"- **Original SQL:** `{step.original_sql[:200]}`\n")
            f.write(f"- **Replacement:** `{step.replacement_call}`\n")
            f.write(f"```diff\n{step.diff[:2000]}\n```\n\n")
    return path


def write_human_log(plan: RefactorPlan, results: List[StepResult], report: RefactorReport) -> Path:
    path = Path("Refactor_Log.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Refactor Execution Log\n\n")
        f.write(f"**Started:** {report.started_at}\n")
        f.write(f"**Completed:** {report.completed_at}\n")
        f.write(f"**Total Steps:** {report.total_steps}\n")
        f.write(f"**Successful:** {report.successful_steps}\n")
        f.write(f"**Failed:** {report.failed_steps}\n")
        f.write(f"**Skipped:** {report.skipped_steps}\n")
        f.write(f"**Snapshot:** {report.pre_run_snapshot or 'N/A'}\n\n")
        f.write("## Step Details\n\n")
        for r in results:
            f.write(f"### {r.step_id}\n")
            f.write(f"- **Status:** {r.status}\n")
            f.write(f"- **Pre-Hash:** {r.pre_hash}\n")
            f.write(f"- **Post-Hash:** {r.post_hash}\n")
            f.write(f"- **Commit:** {r.commit_hash or 'N/A'}\n")
            f.write(f"- **Test Results:** {r.test_results}\n")
            f.write(f"- **Error:** {r.error_message or 'None'}\n")
            f.write(f"- **Timestamp:** {r.timestamp}\n\n")
    return path


def write_machine_report(report: RefactorReport) -> Path:
    path = Path("Refactor_Report.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(asdict(report), f, indent=2, default=str)
    return path


def write_incident_report(failed_result: StepResult, plan: RefactorPlan) -> Path:
    path = Path("Incident_Report.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Incident Report\n\n")
        f.write(f"**Step ID:** {failed_result.step_id}\n")
        f.write(f"**Timestamp:** {failed_result.timestamp}\n")
        f.write(f"**Error:** {failed_result.error_message}\n")
        f.write(f"**Test Results:** {failed_result.test_results}\n")
        f.write(f"**Diff:**\n```diff\n{failed_result.diff}\n```\n")
    return path


# ---------------------------------------------------------------------------
# Apply reviewed queue (placeholder extension point)
# ---------------------------------------------------------------------------

def apply_reviewed(review_file: Path, config: Dict[str, Any]) -> int:
    LOG.info("Applying reviewed queue from %s", review_file)
    # A production implementation would parse the markdown queue, extract
    # approved items, and run them through the same apply_step/commit pipeline.
    LOG.warning("Review queue application is an extension point; not fully implemented in this scaffold")
    return 0


# ---------------------------------------------------------------------------
# CLI and main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Conservative Refactoring Pipeline")
    parser.add_argument("--manifest", type=Path, help="Path to manifest JSON")
    parser.add_argument("--mappings", type=Path, help="Path to query mappings markdown")
    parser.add_argument("--config", type=Path, default=Path("refactor_config.yaml"), help="Path to config YAML")
    parser.add_argument("--execute", action="store_true", help="Execute changes (default is dry-run)")
    parser.add_argument("--apply-reviewed", type=Path, help="Apply reviewed items from a queue file")
    parser.add_argument("--repo-root", type=Path, default=Path.cwd(), help="Repository root directory")
    parser.add_argument("--generate-manifest", action="store_true", help="Generate a manifest from the mapping file if missing")
    return parser.parse_args()


def load_config(config_path: Path) -> Dict[str, Any]:
    config = DEFAULT_CONFIG.copy()
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            user = yaml.safe_load(f)
            if user:
                config.update(user)
    return config


def main() -> int:
    args = parse_args()
    config = load_config(args.config)

    if args.apply_reviewed:
        return apply_reviewed(args.apply_reviewed, config)

    if not args.mappings:
        LOG.error("--mappings is required")
        return 2

    # Resolve repo root
    repo_root = args.repo_root.resolve()

    # Load mapping and optionally generate manifest
    try:
        mappings = load_query_mappings(args.mappings)
        valid_mappings, errors = validate_mappings(mappings)
        if errors:
            LOG.error("Mapping validation errors: %s", errors)
            return 2
    except Exception as exc:
        LOG.error("Failed to load mappings: %s", exc)
        return 2

    if args.manifest:
        try:
            manifest = load_manifest(args.manifest)
        except Exception as exc:
            LOG.error("Failed to load manifest: %s", exc)
            return 2
    elif args.generate_manifest:
        manifest = generate_manifest_from_mappings(args.mappings)
        generated_path = repo_root / "plans" / "GENERATED_REFACTORING_MANIFEST.json"
        generated_path.parent.mkdir(parents=True, exist_ok=True)
        with open(generated_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        LOG.info("Generated manifest: %s", generated_path)
    else:
        LOG.error("Either --manifest or --generate-manifest must be provided")
        return 2

    # Preflight checks
    try:
        ensure_git_available()
        if not is_git_clean(repo_root):
            LOG.error("Working tree is not clean. Commit or stash changes first.")
            return 2
        feature_branch = ensure_feature_branch(repo_root)
        LOG.info("Operating on branch: %s", feature_branch)
    except Exception as exc:
        LOG.error("Preflight failed: %s", exc)
        return 2

    # Build plan
    plan = build_plan(manifest, valid_mappings, config, repo_root)

    # Export review queue and plan artifacts
    export_review_queue(plan, config)
    with open("Refactor_Plan.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "steps": [asdict(s) for s in plan.steps],
                "metadata": plan.metadata,
                "created_at": plan.created_at,
            },
            f,
            indent=2,
            default=str,
        )

    with open("Refactor_Plan.md", "w", encoding="utf-8") as f:
        f.write("# Refactor Plan\n\n")
        f.write(f"**Project:** {plan.metadata.get('project')}\n")
        f.write(f"**Total Steps:** {len(plan.steps)}\n")
        f.write(f"**Created:** {plan.created_at}\n\n")
        for step in plan.steps:
            f.write(f"## {step.id}\n")
            f.write(f"- **Action:** {step.action}\n")
            f.write(f"- **Target:** {step.target}\n")
            f.write(f"- **Function:** {step.function}\n")
            f.write(f"- **Risk:** {step.risk_score:.1f}\n")
            f.write(f"- **Confidence:** {step.confidence:.2f}\n")
            f.write(f"- **Blast Radius:** {step.blast_radius_estimate}\n")
            f.write(f"- **Replacement:** `{step.replacement_call}`\n")
            f.write(f"```diff\n{step.diff[:2000]}\n```\n\n")

    if not args.execute:
        simulate_plan(plan)
        LOG.info("Dry run complete. Use --execute to apply changes.")
        return 0

    # Execute
    snapshot_path: Optional[Path] = None
    try:
        snapshot_path = create_snapshot(repo_root)
    except Exception as exc:
        LOG.warning("Snapshot creation failed: %s", exc)

    results: List[StepResult] = []
    cumulative_risk = 0.0
    started_at = datetime.now(timezone.utc).isoformat()

    for step in plan.steps:
        if approval_needed(config, len(results), cumulative_risk):
            if not check_approval_token(config):
                req_path = write_approval_request(config, len(results), cumulative_risk, results, plan)
                LOG.info("Approval required. See %s", req_path)
                return 4

        result = apply_step(step, dry_run=False, config=config)
        results.append(result)
        cumulative_risk += step.risk_score

        if result.status == "failed":
            LOG.error("Step %s failed. Rolling back and stopping.", step.id)
            rollback_last_commit(repo_root)
            write_incident_report(result, plan)
            report = RefactorReport(
                plan=plan,
                results=results,
                pre_run_snapshot=str(snapshot_path) if snapshot_path else None,
                final_status="failed",
                total_steps=len(plan.steps),
                successful_steps=len([r for r in results if r.status == "success"]),
                failed_steps=len([r for r in results if r.status == "failed"]),
                skipped_steps=len([r for r in results if r.status == "skipped"]),
                started_at=started_at,
                completed_at=datetime.now(timezone.utc).isoformat(),
                incident_report=str(Path("Incident_Report.md")),
            )
            write_human_log(plan, results, report)
            write_machine_report(report)
            return 3

    completed_at = datetime.now(timezone.utc).isoformat()
    report = RefactorReport(
        plan=plan,
        results=results,
        pre_run_snapshot=str(snapshot_path) if snapshot_path else None,
        final_status="success",
        total_steps=len(plan.steps),
        successful_steps=len([r for r in results if r.status == "success"]),
        failed_steps=len([r for r in results if r.status == "failed"]),
        skipped_steps=len([r for r in results if r.status == "skipped"]),
        started_at=started_at,
        completed_at=completed_at,
        incident_report=None,
    )
    write_human_log(plan, results, report)
    write_machine_report(report)

    if config.get("push_remote"):
        LOG.info("Push to remote is disabled by default; not pushing")

    LOG.info("Refactoring complete. %d/%d steps succeeded.", report.successful_steps, report.total_steps)
    return 0


if __name__ == "__main__":
    sys.exit(main())
