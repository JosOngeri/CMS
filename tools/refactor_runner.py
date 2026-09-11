import os
import sys
import json
import logging
import tarfile
import subprocess
import re
from datetime import datetime
from pathlib import Path

# --- CONFIGURATION ---
CONFIG = {
    "manifest": r"D:\Kiserian Main SDA Communications Department\KMainCMS\plans\PHASE4_REFACTORING_MANIFEST.json",
    "mappings": r"D:\Kiserian Main SDA Communications Department\KMainCMS\plans\COMPLETE_QUERY_REPLACEMENT_LIST.md",
    "backup_dir": r"D:\Kiserian Main SDA Communications Department\KMainCMS\backups",
    "approval_batch_size": 10,
    "approval_token": "./APPROVE_PHASE4.token"
}

class RefactorRunner:
    def __init__(self, execute: bool = False):
        self.execute = execute
        self.root = Path(os.getcwd())
        self.log_path = Path("refactor_session.log")
        self._setup_logging()

    def _setup_logging(self):
        logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s',
                            handlers=[logging.FileHandler(self.log_path), logging.StreamHandler(sys.stdout)])

    def _run_cmd(self, cmd, cwd=None):
        return subprocess.run(cmd, capture_output=True, text=True, cwd=cwd or self.root)

    def preflight(self):
        logging.info("--- PREFLIGHT CHECKS ---")
        status = self._run_cmd(["git", "status", "--porcelain"])
        if status.stdout.strip():
            print("ERROR: Working tree is dirty. Commit or stash changes first.")
            sys.exit(2)

        branch_res = self._run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
        if branch_res.stdout.strip() in ["main", "master"]:
            new_branch = f"refactor/PHASE4_{datetime.now().strftime('%Y%m%d_%H%M')}"
            logging.info(f"Creating branch {new_branch}")
            self._run_cmd(["git", "checkout", "-b", new_branch])

        os.makedirs(CONFIG["backup_dir"], exist_ok=True)
        backup_path = os.path.join(CONFIG["backup_dir"], f"pre_refactor_{datetime.now().strftime('%Y%m%d_%H%M')}.tar.gz")
        with tarfile.open(backup_path, "w:gz") as tar:
            tar.add(self.root, arcname="repo")
        logging.info(f"Backup: {backup_path}")

    def run(self):
        if self.execute: self.preflight()

        if not os.path.exists(CONFIG["manifest"]):
            logging.error(f"Manifest not found at {CONFIG['manifest']}")
            return

        with open(CONFIG["manifest"], 'r') as f:
            manifest = json.load(f)

        step_count = 0
        for entry in manifest["refactoring_manifest"]:
            target_file = self.root / entry["file"]
            if not target_file.exists():
                logging.warning(f"File not found: {entry['file']}")
                continue

            content = target_file.read_text(encoding='utf-8')
            new_content = content

            for rep in entry["replacements"]:
                # Use escaped regex if needed, but for direct replacement:
                new_content = new_content.replace(rep["find"], rep["replace"])

            if content != new_content:
                if self.execute:
                    logging.info(f"Updating {entry['file']}...")
                    target_file.write_text(new_content, encoding='utf-8')

                    # Syntax check
                    check = self._run_cmd(["node", "--check", str(target_file)])
                    if check.returncode != 0:
                        logging.error(f"Syntax error in {entry['file']}. Reverting.\n{check.stderr}")
                        target_file.write_text(content, encoding='utf-8')
                        continue

                    self._run_cmd(["git", "add", str(target_file)])
                    self._run_cmd(["git", "commit", "-m", f"Refactor Phase 4: {entry['file']}"])
                    logging.info(f"Committed changes for {entry['file']}")

                    step_count += 1
                    if step_count >= CONFIG["approval_batch_size"]:
                        if not os.path.exists(CONFIG["approval_token"]):
                            logging.info("Batch limit reached. Create 'APPROVE_PHASE4.token' to continue.")
                            sys.exit(4)
                        os.remove(CONFIG["approval_token"])
                        step_count = 0
                else:
                    logging.info(f"DRY RUN: Would update {entry['file']}")
            else:
                logging.info(f"No changes needed for {entry['file']}")

if __name__ == "__main__":
    exec_mode = "--execute" in sys.argv
    runner = RefactorRunner(execute=exec_mode)
    runner.run()
