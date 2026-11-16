"""Offline behavioral checks for restoring published media without losing local work."""
import io
import tarfile
import tempfile
import unittest
from pathlib import Path

import media


class MediaTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        source = self.root / "source" / "public" / "clip.mp4"
        source.parent.mkdir(parents=True)
        source.write_bytes(b"published clip")
        self.entry = media.record(source, self.root / "source")
        self.archive = self.root / "runtime.tar.gz"
        with tarfile.open(self.archive, "w:gz") as bundle:
            bundle.add(source, arcname=self.entry["path"])
        self.dest = self.root / "clone"
        self.dest.mkdir()

    def test_restores_and_verifies_media_idempotently(self):
        media.install_archive(self.archive, self.dest, [self.entry])
        media.install_archive(self.archive, self.dest, [self.entry])
        media.verify(self.dest, [self.entry])

    def test_preserves_different_local_work(self):
        path = self.dest / self.entry["path"]
        path.parent.mkdir()
        path.write_bytes(b"local edit")
        with self.assertRaisesRegex(ValueError, "Local media differs"):
            media.install_archive(self.archive, self.dest, [self.entry])
        self.assertEqual(path.read_bytes(), b"local edit")

    def test_corrupt_member_is_not_installed(self):
        self.entry["sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "Missing or changed"):
            media.install_archive(self.archive, self.dest, [self.entry])
        self.assertFalse((self.dest / self.entry["path"]).exists())

    def test_rejects_unexpected_paths_and_links(self):
        for name, kind in (("../escape", tarfile.REGTYPE),
                           (self.entry["path"], tarfile.SYMTYPE)):
            with self.subTest(name=name, kind=kind):
                with tarfile.open(self.archive, "w:gz") as bundle:
                    info = tarfile.TarInfo(name)
                    info.type = kind
                    bundle.addfile(info, io.BytesIO())
                with self.assertRaisesRegex(ValueError, "Unexpected archive member"):
                    media.install_archive(self.archive, self.dest, [self.entry])

    def test_rejects_corrupt_download(self):
        entry = media.record(self.archive, self.root)
        entry.update(name=self.archive.name, sha256="0" * 64)
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            media.download(entry, self.root / "download", self.root)


if __name__ == "__main__":
    unittest.main()
