import json
import tempfile
import unittest
from pathlib import Path

from tools.validate_site import validate_site


class SiteValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.site = Path(self.tmp.name) / "site"
        self.site.mkdir()
        self.write("index.html", '<canvas></canvas><script src="./game.js"></script>')
        self.write("game.js", "/* test fixture, not the game */")
        self.write("sw.js", "/* test fixture */")
        self.write("manifest.webmanifest", json.dumps({"start_url": "./", "scope": "./"}))

    def write(self, name, text):
        (self.site / name).write_text(text, encoding="utf-8")

    def test_complete_fixture(self):
        self.assertEqual(validate_site(self.site), [])

    def test_absent_game_blocks_deployment(self):
        (self.site / "index.html").unlink()
        self.assertTrue(any("Import the real game" in e for e in validate_site(self.site)))

    def test_missing_offline_files(self):
        (self.site / "sw.js").unlink()
        (self.site / "manifest.webmanifest").unlink()
        self.assertEqual(len(validate_site(self.site)), 2)

    def test_missing_module(self):
        (self.site / "game.js").unlink()
        self.assertTrue(validate_site(self.site))

    def test_root_absolute_asset(self):
        self.write("index.html", '<script src="/game.js"></script>')
        self.assertTrue(validate_site(self.site))

    def test_remote_runtime_dependency(self):
        self.write("index.html", '<script src="https://example.com/game.js"></script>')
        self.assertTrue(validate_site(self.site))

    def test_base_tag(self):
        self.write("index.html", '<base href="/">')
        self.assertTrue(validate_site(self.site))

    def test_missing_icon(self):
        self.write("manifest.webmanifest", '{"icons":[{"src":"icon.png"}]}')
        self.assertTrue(validate_site(self.site))

    def test_manifest_scope_escape(self):
        self.write("manifest.webmanifest", '{"scope":"../"}')
        self.assertTrue(validate_site(self.site))

    def test_malformed_manifest(self):
        self.write("manifest.webmanifest", "not json")
        self.assertTrue(validate_site(self.site))

    def test_query_string_and_fragment(self):
        self.write("index.html", '<script src="./game.js?v=4#module"></script>')
        self.assertEqual(validate_site(self.site), [])

    def test_symlink(self):
        (self.site / "linked.js").symlink_to(self.site / "game.js")
        self.assertTrue(validate_site(self.site))


if __name__ == "__main__":
    unittest.main()
