"""Publish/recover the pinned video media using only Python's standard library.

python3 scripts/media.py fetch [--include-films]
python3 scripts/media.py verify [--include-films]
python3 scripts/media.py pack  # maintainers: snapshot the current local media
"""
import argparse
import gzip
import hashlib
import json
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "media-release.json"
TAG = "video-2026-11-15"
URL = f"https://github.com/luquiwais/IceWalk/releases/download/{TAG}"
SOURCE_DIRS = (
    "assets/mocap", "assets/nasa/3d", "assets/nasa/mars", "assets/planet",
    "assets/polyhaven", "assets/third-party", "assets/ui-plates",
    "assets/directed-voice", "assets/sfx", "assets/audio-guide",
    "assets/neural-voice", "assets/gemini-voice", "assets/gemini-dialogue",
)
FILMS = (
    "IceWalk-GlobalFilm.mp4", "IceWalk-LocalFilm.mp4",
    "IceWalk-GlobalFilm.srt", "IceWalk-LocalFilm.srt", "IceWalk-Credits.txt",
)


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def record(path, root):
    return {"path": path.relative_to(root).as_posix(),
            "bytes": path.stat().st_size, "sha256": digest(path)}


def target(root, name):
    path = root / name
    if Path(name).is_absolute() or not path.resolve().is_relative_to(root.resolve()):
        raise ValueError(f"Unsafe media path: {name}")
    return path


def matches(path, entry):
    return (path.is_file() and path.stat().st_size == entry["bytes"]
            and digest(path) == entry["sha256"])


def verify(root, entries):
    bad = [e["path"] for e in entries if not matches(target(root, e["path"]), e)]
    if bad:
        raise ValueError("Missing or changed media:\n" + "\n".join(bad))


def install_archive(archive, root, entries):
    """Validate every member before installing; never overwrite different local work."""
    expected = {e["path"]: e for e in entries}
    for entry in entries:
        path = target(root, entry["path"])
        if path.exists() and not matches(path, entry):
            raise ValueError(f"Local media differs; preserve or move it first: {path}")
    with tempfile.TemporaryDirectory() as folder:
        stage = Path(folder)
        seen = set()
        with tarfile.open(archive, "r:gz") as bundle:
            for member in bundle:
                if member.name not in expected or member.name in seen or not member.isfile():
                    raise ValueError(f"Unexpected archive member: {member.name}")
                path = target(stage, member.name)
                if member.size != expected[member.name]["bytes"]:
                    raise ValueError(f"Wrong size: {member.name}")
                path.parent.mkdir(parents=True, exist_ok=True)
                with bundle.extractfile(member) as source, path.open("wb") as dest:
                    shutil.copyfileobj(source, dest)
                seen.add(member.name)
        verify(stage, entries)
        for entry in entries:
            path = target(root, entry["path"])
            if matches(path, entry):
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            # Temporary file on the destination filesystem for an atomic rename.
            with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as tmp:
                temporary = Path(tmp.name)
                with target(stage, entry["path"]).open("rb") as source:
                    shutil.copyfileobj(source, tmp)
            temporary.replace(path)


def download(entry, dest, from_dir=None):
    if from_dir:
        shutil.copyfile(from_dir / entry["name"], dest)
    else:
        print(f"Downloading {entry['name']} ({entry['bytes'] / 1024**2:.1f} MiB)", flush=True)
        with urllib.request.urlopen(entry["url"], timeout=120) as source, dest.open("wb") as out:
            shutil.copyfileobj(source, out)
    if not matches(dest, entry):
        raise ValueError(f"Download checksum mismatch: {entry['name']}")


def fetch(root, manifest, from_dir=None, include_films=False):
    with tempfile.TemporaryDirectory() as folder:
        for entry in manifest["archives"]:
            if all(matches(target(root, f["path"]), f) for f in entry["files"]):
                print(f"Verified {entry['name']} (already installed)")
                continue
            path = Path(folder) / entry["name"]
            download(entry, path, from_dir)
            install_archive(path, root, entry["files"])
        if include_films:
            for entry in manifest["films"]:
                path = target(root, entry["path"])
                if matches(path, entry):
                    continue
                if path.exists():
                    raise ValueError(f"Local export differs; preserve or move it first: {path}")
                tmp = Path(folder) / entry["name"]
                download(entry, tmp, from_dir)
                path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(tmp, path)


def pack(root, destination):
    destination.mkdir(parents=True, exist_ok=True)
    groups = {"icewalk-video-runtime.tar.gz": ["public"],
              "icewalk-video-sources.tar.gz": list(SOURCE_DIRS)}
    manifest = {"schema_version": 1, "release_tag": TAG,
                "release_url": f"https://github.com/luquiwais/IceWalk/releases/tag/{TAG}",
                "source_ref": TAG,
                "source_base_commit": subprocess.check_output(
                    ["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
                "episode_commit": "2a633fb6b13232d9ddceb2363c507ef3dda6d272",
                "archives": [], "films": []}
    for name, directories in groups.items():
        files = {p for directory in directories for p in (root / directory).rglob("*")
                 if p.is_file() and not p.is_symlink()
                 and not any(x.startswith(".") or x == "__pycache__" for x in p.relative_to(root).parts)
                 and p.suffix not in (".pyc", ".log")}
        # This one rendered image is an input to the console's porthole material.
        if "sources" in name:
            files.add(root / "assets/renders/v2/walk-preview/still_0036.png")
        entries = [record(p, root) for p in sorted(files)]
        archive = destination / name
        with archive.open("wb") as out, gzip.GzipFile(fileobj=out, mode="wb", mtime=0) as gz:
            with tarfile.open(fileobj=gz, mode="w") as bundle:
                for entry in entries:
                    path = root / entry["path"]
                    info = bundle.gettarinfo(str(path), arcname=entry["path"])
                    info.uid = info.gid = info.mtime = 0
                    info.uname = info.gname = ""
                    with path.open("rb") as source:
                        bundle.addfile(info, source)
        item = record(archive, destination)
        item.update(name=name, url=f"{URL}/{name}", files=entries)
        del item["path"]
        manifest["archives"].append(item)
        print(f"Packed {name}: {len(entries)} files, {archive.stat().st_size / 1024**2:.1f} MiB", flush=True)
    for name in FILMS:
        source = root / "out" / name
        shutil.copyfile(source, destination / name)
        item = record(source, root)
        item.update(name=name, url=f"{URL}/{name}")
        manifest["films"].append(item)
    (root / "media-release.json").write_text(json.dumps(manifest, indent=2) + "\n")
    shutil.copyfile(root / "media-release.json", destination / "media-release.json")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("fetch", "verify", "pack"))
    parser.add_argument("--include-films", action="store_true")
    parser.add_argument("--from-dir", type=Path, help="Offline release directory (also used for QA)")
    args = parser.parse_args()
    if args.command == "pack":
        pack(ROOT, ROOT / "out/release")
        return
    manifest = json.loads(MANIFEST.read_text())
    if args.command == "fetch":
        fetch(ROOT, manifest, args.from_dir, args.include_films)
    files = [f for archive in manifest["archives"] for f in archive["files"]]
    if args.include_films:
        files += manifest["films"]
    verify(ROOT, files)
    print(f"Verified {len(files)} media files (SHA-256).")


if __name__ == "__main__":
    main()
