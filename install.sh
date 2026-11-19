#!/usr/bin/env bash
# Prepare a verified unpacked extension. Chrome still requires Load unpacked.
set -euo pipefail

for task_command in curl python3; do
  if ! command -v "$task_command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$task_command" >&2
    exit 1
  fi
done

case "$(uname -s)" in
  Linux) task_install_dir="${XDG_DATA_HOME:-$HOME/.local/share}/myku-timetable-extension" ;;
  Darwin) task_install_dir="$HOME/Library/Application Support/MyKU Timetable" ;;
  *) printf 'Use the ZIP installation instructions for this operating system.\n' >&2; exit 1 ;;
esac

task_release_url='https://github.com/PuemMTH/myku-timetable-extension/releases/latest/download'
task_temp_dir="$(mktemp -d)"
trap 'rm -rf "$task_temp_dir"' EXIT
for task_file in myku-timetable-extension.zip SHA256SUMS; do
  curl --fail --show-error --silent --location --proto '=https' --proto-redir '=https' \
    --retry 2 --connect-timeout 15 --max-time 120 \
    "$task_release_url/$task_file" --output "$task_temp_dir/$task_file"
done

python3 - "$task_temp_dir" "$task_install_dir" <<'PY'
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import zipfile

download, destination = map(Path, sys.argv[1:])
archive = download / "myku-timetable-extension.zip"
checksums = [line.split() for line in (download / "SHA256SUMS").read_text().splitlines()]
expected = [parts[0] for parts in checksums if len(parts) == 2 and parts[1] == archive.name]
if len(expected) != 1 or hashlib.sha256(archive.read_bytes()).hexdigest() != expected[0]:
    raise SystemExit("Checksum mismatch; nothing was installed.")

allowed = {"manifest.json", "schedule.js", "artwork.js", "content.js", "content.css", "README.md"}
prefix = "myku-timetable-extension/"
with zipfile.ZipFile(archive) as bundle:
    members = bundle.infolist()
    if len(members) != len(allowed) or {item.filename for item in members} != {prefix + name for name in allowed}:
        raise SystemExit("Unexpected package files; nothing was installed.")
    if any(stat.S_ISLNK(item.external_attr >> 16) or item.file_size > 5 * 1024 * 1024 for item in members):
        raise SystemExit("Invalid package entry; nothing was installed.")
    contents = {name: bundle.read(prefix + name) for name in allowed}
manifest = json.loads(contents["manifest.json"])
if manifest.get("manifest_version") != 3 or not isinstance(manifest.get("version"), str):
    raise SystemExit("Invalid extension manifest; nothing was installed.")
if destination.is_symlink():
    raise SystemExit("The installation directory is a symlink; nothing was installed.")

destination.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix=".myku-install-", dir=destination.parent) as staging:
    staging = Path(staging)
    for name, data in contents.items():
        (staging / name).write_bytes(data)
    destination.mkdir(exist_ok=True)
    for name in sorted(allowed - {"manifest.json"}) + ["manifest.json"]:
        os.replace(staging / name, destination / name)
print(f"MyKU Timetable {manifest['version']} is ready at:\n{destination}")
PY

printf '\nOpen chrome://extensions in Chrome.\n'
printf 'First installation: enable Developer mode, click Load unpacked, and select:\n%s\n' "$task_install_dir"
printf 'Updating: click Reload on the existing extension, then refresh MyKU.\n'
printf 'This script does not change Chrome profiles, policies, or security settings.\n'
