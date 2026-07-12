import os
from pathlib import Path

def cleanup():
    print("--- REFACTOR CLEANUP ---")
    root = Path(os.getcwd())

    files_to_remove = [
        "refactor_session.log",
        "APPROVE_PHASE4.token",
        "Approval_Request.md"
    ]

    for filename in files_to_remove:
        filepath = root / filename
        if filepath.exists():
            try:
                os.remove(filepath)
                print(f"Removed: {filename}")
            except Exception as e:
                print(f"Failed to remove {filename}: {e}")

    print("\nCleanup complete. You are now ready to merge your refactor branch.")

if __name__ == "__main__":
    cleanup()
