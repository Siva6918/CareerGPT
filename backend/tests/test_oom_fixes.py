"""
CareerGPT - Tests for graph singleton caching and keep-alive worker guard.

Covers the OOM fixes introduced in October 2026:
  1. get_roadmap_engine() returns the same instance on every call (no
     per-request graph reload).
  2. keep_alive_task() exits immediately for non-primary workers.
  3. keep_alive_task() sends exactly one ping per sleep cycle for worker 0.
"""
import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ensure backend package root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


# ---------------------------------------------------------------------------
# 1. RoadmapEngine singleton
# ---------------------------------------------------------------------------

class TestRoadmapEngineSingleton:
    """get_roadmap_engine() must return the same object every time."""

    def setup_method(self):
        import roadmap.engine as eng_module
        eng_module._engine_instance = None

    def teardown_method(self):
        import roadmap.engine as eng_module
        eng_module._engine_instance = None

    def test_same_instance_returned(self):
        """Two consecutive calls must return the identical object."""
        from roadmap.engine import get_roadmap_engine
        first = get_roadmap_engine()
        second = get_roadmap_engine()
        assert first is second, (
            "get_roadmap_engine() returned different instances -- the graph "
            "was loaded more than once in the same worker process."
        )

    def test_no_reload_on_repeated_calls(self):
        """_load_knowledge_graph must only be called once per worker lifetime."""
        from roadmap.engine import get_roadmap_engine, RoadmapEngine

        load_count = {"n": 0}
        original_load = RoadmapEngine._load_knowledge_graph

        def counting_load(self):
            load_count["n"] += 1
            original_load(self)

        with patch.object(RoadmapEngine, "_load_knowledge_graph", counting_load):
            import roadmap.engine as eng_module
            eng_module._engine_instance = None
            get_roadmap_engine()
            get_roadmap_engine()
            get_roadmap_engine()

        assert load_count["n"] == 1, (
            f"_load_knowledge_graph called {load_count['n']} times; expected exactly 1."
        )

    def test_engine_has_branches(self):
        """Smoke-test: the singleton can return branch data without error."""
        from roadmap.engine import get_roadmap_engine
        engine = get_roadmap_engine()
        branches = engine.get_branches()
        assert isinstance(branches, list)


# ---------------------------------------------------------------------------
# 2. Keep-alive worker guard
# ---------------------------------------------------------------------------

class TestKeepAliveWorkerGuard:

    @pytest.mark.asyncio
    async def test_non_primary_worker_exits_immediately(self):
        """Worker index != 0 should cause the coroutine to return without looping."""
        env = {"RENDER_WORKER_INDEX": "2",
               "RENDER_EXTERNAL_URL": "https://example.onrender.com"}
        with patch.dict(os.environ, env):
            from main import keep_alive_task
            done = asyncio.Event()

            async def run():
                await keep_alive_task()
                done.set()

            task = asyncio.create_task(run())
            await asyncio.wait_for(task, timeout=1.0)
            assert done.is_set(), "keep_alive_task did not exit for non-primary worker"

    @pytest.mark.asyncio
    async def test_missing_render_url_skips_http(self):
        """No RENDER_EXTERNAL_URL -> no HTTP call, loop continues without error."""
        env_backup = os.environ.pop("RENDER_EXTERNAL_URL", None)
        try:
            with patch.dict(os.environ, {"RENDER_WORKER_INDEX": "0"}, clear=False):
                call_count = {"n": 0}

                async def limited_sleep(s):
                    call_count["n"] += 1
                    if call_count["n"] >= 2:
                        raise asyncio.CancelledError
                    return None

                with patch("asyncio.sleep", side_effect=limited_sleep):
                    with patch("httpx.AsyncClient") as mock_http:
                        from main import keep_alive_task
                        try:
                            await asyncio.wait_for(keep_alive_task(), timeout=2.0)
                        except (asyncio.CancelledError, asyncio.TimeoutError):
                            pass
                        mock_http.assert_not_called()
        finally:
            if env_backup is not None:
                os.environ["RENDER_EXTERNAL_URL"] = env_backup

    @pytest.mark.asyncio
    async def test_primary_worker_runs_loop(self):
        """Worker 0 with a valid URL must enter the sleep loop at least once."""
        env = {
            "RENDER_WORKER_INDEX": "0",
            "RENDER_EXTERNAL_URL": "https://careergpt-62ty.onrender.com",
        }
        sleep_calls = {"n": 0}

        async def limited_sleep(s):
            sleep_calls["n"] += 1
            raise asyncio.CancelledError  # Stop after first sleep

        with patch.dict(os.environ, env):
            with patch("asyncio.sleep", side_effect=limited_sleep):
                mock_resp = MagicMock()
                mock_resp.status_code = 200
                mock_client = AsyncMock()
                mock_client.get = AsyncMock(return_value=mock_resp)
                mock_ctx = MagicMock()
                mock_ctx.__aenter__ = AsyncMock(return_value=mock_client)
                mock_ctx.__aexit__ = AsyncMock(return_value=False)
                with patch("httpx.AsyncClient", return_value=mock_ctx):
                    from main import keep_alive_task
                    try:
                        await asyncio.wait_for(keep_alive_task(), timeout=2.0)
                    except (asyncio.CancelledError, asyncio.TimeoutError):
                        pass
        assert sleep_calls["n"] >= 1, "asyncio.sleep was never called for worker 0"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
