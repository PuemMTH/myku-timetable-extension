"""Build the small, reproducible extension ZIP used by the online installer."""
import hashlib
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
files = {"manifest.json", "README.md"}
for script in manifest["content_scripts"]:
    files.update(script.get("js", []))
    files.update(script.get("css", []))
output = root / "dist"
output.mkdir(exist_ok=True)
archive = output / "myku-timetable-extension.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
    for name in sorted(files):
        info = zipfile.ZipInfo(f"myku-timetable-extension/{name}", (1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        bundle.writestr(info, (root / name).read_bytes())
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(output / "SHA256SUMS").write_text(f"{digest}  {archive.name}\n", encoding="utf-8")
print(json.dumps({"version": manifest["version"], "archive": str(archive), "sha256": digest}))
