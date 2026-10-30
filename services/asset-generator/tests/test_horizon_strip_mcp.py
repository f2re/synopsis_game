from __future__ import annotations

import concurrent.futures
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from PIL import Image
import mcp.server

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core.work_storage import WorkStorage  # noqa: E402


class FakeMCP:
    def __init__(self, **_kwargs):
        pass

    def tool(self):
        return lambda function: function

    def custom_route(self, *_args, **_kwargs):
        return lambda function: function

    def streamable_http_app(self):
        async def app(_scope, _receive, _send):
            pass
        return app


with patch.object(mcp.server, "MCPServer", FakeMCP, create=True), patch.object(Path, "mkdir"):
    module_spec = importlib.util.spec_from_file_location("synopsis_test_server", ROOT / "server.py")
    server = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(server)


class HorizonStripMCPTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.work = Path(self.tmp.name)
        self.work_patch = patch.object(server, "WORK_DIR", self.work)
        self.work_patch.start()
        self.addCleanup(self.work_patch.stop)
        for name, replacement in (
            ("load_spec", lambda _path: {}),
            ("get_asset_by_id", lambda _spec, _id: {
                "id": "HUB-L2-HORIZON", "size": [480, 270], "alpha": "transparent"
            }),
            ("get_active_palette", lambda _asset: []),
        ):
            context = patch.object(server, name, replacement)
            context.start()
            self.addCleanup(context.stop)
        self.storage = WorkStorage(server.HORIZON_STRIP_ID, base_dir=self.work)
        self.source = self.storage.get_raw_path(1)
        Image.new("RGB", (1808, 128), (25, 55, 75)).save(self.source)
        self.storage.record_generation(
            {"id": server.HORIZON_STRIP_ID}, "prompt", "negative", {"creator_id": "creator"},
            [self.source], [26063], "z_image_style", "generated_raw"
        )

    def test_builds_unique_candidates_with_verified_provenance(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            first, second = list(pool.map(server.build_horizon_layer, [1, 1]))
        self.assertNotEqual(first["refined_output"], second["refined_output"])
        for result in (first, second):
            report = result["qa_report"]
            self.assertEqual(report["creator_id"], "creator")
            self.assertEqual(report["source_candidate"], str(self.source))
            self.assertEqual(report["technical_status"]["value"], "pass")
            self.assertEqual(report["art_status"]["value"], "pending")
            self.assertEqual(report["production_status"], "candidate")
            self.assertEqual(set(result["previews"]), {"1x", "2x", "4x"})
            self.assertTrue(Path(result["report_path"]).is_file())
        self.assertFalse((self.work / "HUB-L2-HORIZON" / "review" / "report.json").exists())
        self.assertEqual(self.storage.creator_for_candidate(self.source), "creator")

    def test_rejecting_strip_blocks_build_and_later_pixel_review(self):
        server.build_horizon_layer(1)
        server.reject_candidate(server.HORIZON_STRIP_ID, 1, reasons=["bad strip"])
        target_storage = WorkStorage("HUB-L2-HORIZON", base_dir=self.work)
        self.assertTrue(server._candidate_rejection(target_storage, self.source))
        with self.assertRaises(HTTPException):
            server.build_horizon_layer(1)
        with self.assertRaises(HTTPException):
            server.pixel_art_review("HUB-L2-HORIZON", "pass", "another-reviewer")

    def test_unknown_creator_is_not_buildable(self):
        Image.new("RGB", (1808, 128), (22, 55, 75)).save(self.storage.get_raw_path(2))
        with self.assertRaises(HTTPException):
            server.build_horizon_layer(2)
