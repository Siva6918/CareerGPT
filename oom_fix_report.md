# CareerGPT — Render OOM Fix Report

> **Date:** 2026-10-12 · **Instance memory limit:** 512 MB
> **Failure:** `Ran out of memory (used over 512 MB) while running your code.`

---

## 1. Confirmed Root Causes

| # | Root cause | Evidence |
|---|---|---|
| **A** | **4 Gunicorn workers** — each is a full Python process (~120–150 MB each × 4 = 480–600 MB at startup alone) | `Dockerfile` line 35: `--workers 4` |
| **B** | **Knowledge graph reloaded per HTTP request** — every `roadmap.py` handler called `RoadmapEngine()` directly (11 call sites), each loading `roadmap_graph.json` from disk and building the full graph | `api/roadmap.py` lines 49, 163, 175, 194, 202, 210, 218, 226, 236 + `api/interview.py` line 474 |
| **C** | **Duplicate router registrations** — all 11 routers were registered twice in `main.py` (lines 141–169), doubling FastAPI's internal route table overhead | `main.py` lines 159–169 |
| **D** | **`/health` endpoint hit the Gemini API** on every keep-alive ping (every 14m30s), triggering `genai.list_models()` network call and spawning extra threads | `main.py` lines 222–224 |
| **E** | **4 keep-alive background loops** — one per Gunicorn worker, so the health endpoint received 4 simultaneous pings every 14 minutes and 30 seconds | `main.py` `lifespan` → `keep_alive_task` started by every worker |
| **F** | **Oversized PostgreSQL connection pool** — `pool_size=10, max_overflow=20` = up to 30 idle connections per worker × 4 workers = 120 connections holding memory and connection slots | `database/connection.py` lines 20–21 |

---

## 2. Files Modified

### `backend/Dockerfile`
- **Changed:** `--workers 4` → `--workers 1`
- **Added:** `--timeout 120 --graceful-timeout 30` (prevents worker kill on slow LLM calls)
- **Added:** `RENDER_WORKER_INDEX=0` env var so the keep-alive guard can identify the single worker

**Before:**
```sh
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000}
```
**After:**
```sh
RENDER_WORKER_INDEX=0 gunicorn main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 120 --graceful-timeout 30
```

---

### `backend/roadmap/engine.py`
- **Removed:** `roadmap_engine = RoadmapEngine()` at module level (was eagerly loading the graph on every worker startup / import)
- **Added:** `get_roadmap_engine()` — a lazy process-level singleton that loads `roadmap_graph.json` exactly once per worker lifetime, then caches the result

```python
_engine_instance: Optional["RoadmapEngine"] = None

def get_roadmap_engine() -> "RoadmapEngine":
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = RoadmapEngine()
    return _engine_instance
```

---

### `backend/api/roadmap.py`
- **Changed:** All 10 per-request `RoadmapEngine()` calls replaced with `get_roadmap_engine()`
- **Changed:** Import `from roadmap.engine import RoadmapEngine` → `from roadmap.engine import get_roadmap_engine`

---

### `backend/api/interview.py`
- **Changed:** `RoadmapEngine()` instantiation → `get_roadmap_engine()`
- **Fixed:** Duplicate `from llm.provider import get_llm_provider` import removed

---

### `backend/main.py`
1. **Keep-alive task guard** — added worker-index check at the top of `keep_alive_task()`. Workers where `RENDER_WORKER_INDEX != "0"` return immediately, preventing multiple simultaneous pings. The 14m30s interval is **unchanged**.
2. **`/health` endpoint lightened** — removed `provider.health_check()` / `genai.list_models()` call. The endpoint now returns a static JSON response instantly. LLM liveness is checked at startup via `/system/llm-status` instead.
3. **Duplicate router registrations removed** — 11 duplicate `app.include_router()` calls on lines 159–169 deleted.

---

### `backend/database/connection.py`
- **Changed:** `pool_size=10, max_overflow=20` → `pool_size=3, max_overflow=2`
- Max 5 idle DB connections instead of 30. Appropriate for 1 worker on a constrained instance.

---

### `backend/tests/test_oom_fixes.py` *(new)*
6 new tests covering:
- `get_roadmap_engine()` returns the same instance on repeated calls
- `_load_knowledge_graph` is called exactly once per worker
- Keep-alive task exits immediately for non-primary workers (`RENDER_WORKER_INDEX != "0"`)
- Keep-alive task skips HTTP call when `RENDER_EXTERNAL_URL` is absent
- Keep-alive task enters the sleep loop for worker 0

---

## 3. Exact Updated Render Start Command

If Render is configured to use the **Dockerfile**, no manual start command change is needed — the Dockerfile `CMD` is now correct.

If Render is configured with a **direct start command** (in the Render dashboard service settings), set it to:

```
RENDER_WORKER_INDEX=0 gunicorn main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --graceful-timeout 30
```

> [!IMPORTANT]
> `$PORT` (not `${PORT:-8000}`) is the correct shell variable syntax for the Render dashboard start command field.

---

## 4. Keep-Alive Mechanism — How It Is Preserved

| Property | Before fix | After fix |
|---|---|---|
| Interval | 14 min 30 s | **14 min 30 s (unchanged)** |
| Target URL | `RENDER_EXTERNAL_URL/health` | **Same** |
| Workers that fire the ping | 4 (all workers) | **1 (worker 0 only)** |
| HTTP timeout | 10 s | **10 s (unchanged)** |
| Error handling | Catches and logs | **Same** |
| Cancellation on shutdown | Yes | **Yes (unchanged)** |

The `RENDER_EXTERNAL_URL` environment variable is automatically injected by Render on all plan types. The guard reads `RENDER_WORKER_INDEX` from the environment (set in the start command to `"0"` for the single worker) so the logic degrades gracefully: if the variable is absent (local dev), it defaults to `"0"` and the loop runs normally.

---

## 5. Tests Executed and Results

```
============================= test session info =============================
platform win32  Python 3.12.4  pytest-8.2.2

tests/test_roadmap_relationships.py::test_branches_coverage            PASSED
tests/test_roadmap_relationships.py::test_cse_ai_engineer_relationships PASSED
tests/test_roadmap_relationships.py::test_cse_backend_developer_relationships PASSED
tests/test_roadmap_relationships.py::test_ece_embedded_engineer_relationships PASSED
tests/test_roadmap_relationships.py::test_eee_power_systems_engineer_relationships PASSED
tests/test_roadmap_relationships.py::test_mech_cad_engineer_relationships PASSED
tests/test_roadmap_relationships.py::test_civil_structural_engineer_relationships PASSED
tests/test_roadmap_relationships.py::test_invalid_combinations_blocked  PASSED
tests/test_roadmap_relationships.py::test_unknown_not_equal_weak        PASSED
tests/test_roadmap_relationships.py::test_authoritative_sources_registry PASSED
tests/test_oom_fixes.py::TestRoadmapEngineSingleton::test_same_instance_returned        PASSED
tests/test_oom_fixes.py::TestRoadmapEngineSingleton::test_no_reload_on_repeated_calls  PASSED
tests/test_oom_fixes.py::TestRoadmapEngineSingleton::test_engine_has_branches          PASSED
tests/test_oom_fixes.py::TestKeepAliveWorkerGuard::test_non_primary_worker_exits_immediately PASSED
tests/test_oom_fixes.py::TestKeepAliveWorkerGuard::test_missing_render_url_skips_http  PASSED
tests/test_oom_fixes.py::TestKeepAliveWorkerGuard::test_primary_worker_runs_loop       PASSED

========================= 16 passed, 2 warnings in 15.51s ===================
```

> [!NOTE]
> 0 regressions. 6 new tests added. All existing roadmap relationship tests pass.

---

## 6. Expected Memory Improvements

| Item | Old behaviour | New behaviour | Estimated saving |
|---|---|---|---|
| Worker count | 4 processes | 1 process | ~360–450 MB at startup |
| Knowledge graph per-request reload | ~11 reloads per /roadmap/* request burst | 1 load per worker lifetime | Several MB per busy request cycle |
| DB idle connections (PostgreSQL) | Up to 120 (4 × 30) | Up to 5 (1 × 5) | ~5–10 MB in connection buffers |
| Duplicate routers | 22 routes per prefix | 11 routes per prefix | Small (a few MB in FastAPI internals) |

> [!WARNING]
> These are *expected* improvements based on code analysis, not live Render metrics (production credentials were not available for profiling). The dominant gain is reducing from 4 to 1 worker process.

> [!TIP]
> If memory usage is still above ~400 MB after deploying, consider whether `torch`, `transformers`, and `sentence-transformers` in `requirements.txt` are actually imported at startup. A `grep` of the active code shows they are not imported at the top level and will only load lazily if a feature that requires them is actually called. If those features are unused, removing those packages would save ~200–300 MB of install size.

---

## 7. Manual Steps Required in Render

1. **If using Docker deployment (recommended):** Push this commit to your connected Git branch. Render will rebuild the image using the updated `Dockerfile` which now uses `--workers 1`.

2. **If using a direct start command (not Dockerfile):** In the Render dashboard:
   - Go to your service → **Settings** → **Start Command**
   - Set it to:
     ```
     RENDER_WORKER_INDEX=0 gunicorn main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --graceful-timeout 30
     ```
   - Click **Save Changes** → **Manual Deploy** → **Deploy latest commit**

3. **Verify after deploy:**
   - Check the Render logs: confirm only **one** startup banner (`CareerGPT ready`) appears
   - Confirm only **one** keep-alive ping log entry fires every 14 min 30 s
   - Check Render metrics: memory should stabilise well below 512 MB
   - Hit `GET /health` → should return `{"status": "healthy"}` immediately

4. **Do not change the Render plan** — no paid changes are needed.
