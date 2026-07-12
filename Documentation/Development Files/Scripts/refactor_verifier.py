import os
import re
from pathlib import Path

def verify():
    print("--- REFACTOR VERIFICATION ---")
    root = Path(os.getcwd())
    legacy_count = 0
    repo_usage_count = 0

    # Files to check
    js_files = list(root.rglob("*.js"))

    for file in js_files:
        # Skip node_modules and repositories themselves
        if "node_modules" in str(file) or "repositories" in str(file) or "scripts" in str(file):
            continue

        try:
            content = file.read_text(encoding='utf-8')

            # Find legacy pool.query calls
            queries = re.findall(r"pool\.query\(", content)
            legacy_count += len(queries)

            # Find repository usage
            repos = re.findall(r"Repository\.", content)
            repo_usage_count += len(repos)

            if len(queries) > 0:
                print(f"LITERAL SQL DETECTED: {file.relative_to(root)} ({len(queries)} calls)")

        except Exception as e:
            # print(f"Could not read {file}: {e}")
            pass

    print("\n--- SUMMARY ---")
    print(f"Total legacy pool.query calls: {legacy_count}")
    print(f"Total Repository method calls: {repo_usage_count}")

    if legacy_count == 0:
        print("SUCCESS: No legacy pool.query calls found in application code!")
    else:
        print(f"STILL NEEDED: {legacy_count} queries to refactor.")

if __name__ == "__main__":
    verify()
