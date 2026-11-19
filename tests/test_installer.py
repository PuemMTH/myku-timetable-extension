import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class InstallerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(["python3", "scripts/package.py"], cwd=ROOT, check=True, capture_output=True)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.assets = self.base / "assets"
        self.assets.mkdir()
        for name in ("myku-timetable-extension.zip", "SHA256SUMS"):
            shutil.copyfile(ROOT / "dist" / name, self.assets / name)
        fake_bin = self.base / "bin"
        fake_bin.mkdir()
        fake_curl = fake_bin / "curl"
        fake_curl.write_text("""#!/usr/bin/env python3
import os, pathlib, shutil, sys
if os.environ.get('MYKU_TEST_DOWNLOAD_FAIL'):
    sys.exit(22)
args = sys.argv[1:]
url = next(arg for arg in args if arg.startswith('https://'))
assert url.startswith('https://github.com/PuemMTH/myku-timetable-extension/releases/latest/download/')
shutil.copyfile(pathlib.Path(os.environ['MYKU_TEST_ASSETS']) / url.rsplit('/', 1)[1], args[args.index('--output') + 1])
""")
        fake_curl.chmod(0o755)
        self.env = {**os.environ, "PATH": str(fake_bin) + os.pathsep + os.environ["PATH"],
                    "XDG_DATA_HOME": str(self.base / "data"), "MYKU_TEST_ASSETS": str(self.assets)}
        self.destination = self.base / "data" / "myku-timetable-extension"

    def run_installer(self):
        return subprocess.run(["bash", str(ROOT / "install.sh")], env=self.env, text=True, capture_output=True)

    def test_install_and_update_preserve_other_files(self):
        first = self.run_installer()
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual((self.destination / "manifest.json").read_bytes(), (ROOT / "manifest.json").read_bytes())
        self.assertIn("Load unpacked", first.stdout)
        (self.destination / "my-note.txt").write_text("keep me")
        second = self.run_installer()
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual((self.destination / "my-note.txt").read_text(), "keep me")

    def test_bad_checksum_does_not_touch_existing_installation(self):
        self.destination.mkdir(parents=True)
        (self.destination / "manifest.json").write_text("original")
        (self.assets / "SHA256SUMS").write_text("0" * 64 + "  myku-timetable-extension.zip\n")
        result = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Checksum mismatch", result.stderr)
        self.assertEqual((self.destination / "manifest.json").read_text(), "original")

    def test_unsafe_archive_is_rejected_even_with_matching_checksum(self):
        archive = self.assets / "myku-timetable-extension.zip"
        with zipfile.ZipFile(archive, "a") as bundle:
            bundle.writestr("myku-timetable-extension/../../outside.txt", "must not be written")
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        (self.assets / "SHA256SUMS").write_text(digest + "  " + archive.name + "\n")
        result = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unexpected package files", result.stderr)
        self.assertFalse(self.destination.exists())
        self.assertFalse((self.base / "outside.txt").exists())

    def test_network_failure_does_not_create_installation(self):
        self.env["MYKU_TEST_DOWNLOAD_FAIL"] = "1"
        self.assertNotEqual(self.run_installer().returncode, 0)
        self.assertFalse(self.destination.exists())

    def test_symlink_installation_is_not_followed(self):
        elsewhere = self.base / "elsewhere"
        elsewhere.mkdir()
        self.destination.parent.mkdir(parents=True)
        self.destination.symlink_to(elsewhere, target_is_directory=True)
        result = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlink", result.stderr)
        self.assertEqual(list(elsewhere.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
