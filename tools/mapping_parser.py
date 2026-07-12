#!/usr/bin/env python3
"""
mapping_parser.py - Standalone parser for COMPLETE_QUERY_REPLACEMENT_LIST.md

Demonstrates reading 663+ query mappings and validating them.
"""

import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Tuple, Dict, Any


@dataclass
class QueryMapping:
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


def parse_query_mappings(file_path: Path) -> List[QueryMapping]:
    """Parse the pipe-delimited markdown mapping file."""
    mappings: List[QueryMapping] = []
    lines = file_path.read_text(encoding="utf-8").splitlines()

    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        parts = line.split("|")
        if len(parts) < 7:
            continue

        file_part, line_part, function, sql, parameters, replacement, repository = parts[:7]
        notes = parts[7].strip() if len(parts) > 7 else ""

        try:
            line_no = int(line_part.strip())
        except ValueError:
            continue

        confidence = 1.0
        low_confidence_markers = ["manual", "review", "todo", "unsafe", "complex"]
        if any(marker in notes.lower() or marker in repository.lower() for marker in low_confidence_markers):
            confidence = 0.6
        elif "already exists" in repository.lower() or "already exists" in notes.lower():
            confidence = 1.0

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
            errs.append("missing replacement_method")
        if not m.repository:
            errs.append("missing repository")
        if not (0.0 <= m.confidence <= 1.0):
            errs.append(f"invalid confidence {m.confidence}")
        if errs:
            errors.append({"id": m.mapping_id, "errors": errs})
        else:
            valid.append(m)

    return valid, errors


def summarize(mappings: List[QueryMapping]) -> Dict[str, Any]:
    by_file: Dict[str, int] = {}
    by_repository: Dict[str, int] = {}
    confidence_buckets = {"high": 0, "medium": 0, "low": 0}

    for m in mappings:
        by_file[m.file] = by_file.get(m.file, 0) + 1
        by_repository[m.repository] = by_repository.get(m.repository, 0) + 1
        if m.confidence >= 0.9:
            confidence_buckets["high"] += 1
        elif m.confidence >= 0.7:
            confidence_buckets["medium"] += 1
        else:
            confidence_buckets["low"] += 1

    return {
        "total": len(mappings),
        "by_file": by_file,
        "by_repository": by_repository,
        "confidence_buckets": confidence_buckets,
    }


if __name__ == "__main__":
    mapping_path = Path("D:/Kiserian Main SDA Communications Department/KMainCMS/plans/COMPLETE_QUERY_REPLACEMENT_LIST.md")

    mappings = parse_query_mappings(mapping_path)
    valid, errors = validate_mappings(mappings)
    summary = summarize(valid)

    print(f"Parsed {len(mappings)} mappings")
    print(f"Valid: {len(valid)}, Invalid: {len(errors)}")
    print(json.dumps(summary, indent=2, default=str))

    if errors:
        print("\nValidation errors:")
        for e in errors:
            print(f"  {e['id']}: {', '.join(e['errors'])}")
