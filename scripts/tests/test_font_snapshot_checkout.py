"""Exercise real Git checkout conversion against the original release source."""
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import tempfile
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/release.yml"


class FontSnapshotCheckoutTests(unittest.TestCase):
    def checkout(self, directory, preserve_bytes):
        # Emulate the Windows runner without touching the developer's Git config.
        config = directory / "gitconfig"
        config.write_text("[core]\n\tautocrlf = true\n", encoding="utf-8")
        env = {**os.environ, "GIT_CONFIG_GLOBAL": str(config), "GIT_CONFIG_NOSYSTEM": "1"}
        if preserve_bytes:
            workflow = WORKFLOW.read_text(encoding="utf-8")
            match = re.search(r"&configure-checkout\n.*?run: \|\n((?:          [^\n]*\n)+)", workflow, re.DOTALL)
            self.assertIsNotNone(match, "Missing checkout configuration step")
            for line in textwrap.dedent(match[1]).strip().splitlines():
                subprocess.run(shlex.split(line), env=env, check=True, capture_output=True)
        repository = directory / "checkout"
        subprocess.run(["git", "clone", "--quiet", "--no-checkout", "--local", str(ROOT), str(repository)],
                       env=env, check=True, capture_output=True)
        # Keep v0.0.50 unchanged: the repaired workflow must build this exact tag.
        subprocess.run(["git", "-C", str(repository), "checkout", "--quiet", "v0.0.50"],
                       env=env, check=True, capture_output=True)
        source = repository / "tools/font-patch"
        manifest = json.loads((source / "source-manifest.json").read_text(encoding="utf-8"))
        mismatches = []
        for name, expected in manifest.items():
            actual = hashlib.sha256((source / "dn_ui_patch" / name).read_bytes()).hexdigest()
            if actual != expected:
                mismatches.append(name)
        return mismatches

    def test_windows_default_reproduces_reported_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertIn("__init__.py", self.checkout(Path(directory), False))

    def test_workflow_preserves_original_tag_hashes_on_windows_checkout(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(self.checkout(Path(directory), True), [])

    def test_every_job_configures_git_before_checkout(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        jobs = re.split(r"(?m)^  [a-z][a-z-]*:\n", workflow.split("\njobs:\n", 1)[1])[1:]
        self.assertEqual(len(jobs), 4)
        for job in jobs:
            config = job.find("configure-checkout")
            checkout = job.find("checkout-release")
            if checkout < 0:
                checkout = job.find("Check out source")
            self.assertGreaterEqual(config, 0)
            self.assertGreater(checkout, config)


if __name__ == "__main__":
    unittest.main()
