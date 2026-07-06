from app.scheduler import build_scheduler


def test_jobs_registered():
    s = build_scheduler()
    ids = {j.id for j in s.get_jobs()}
    assert ids == {"eipo_daily", "prices_daily"}


def test_lifespan_respects_disable_flag():
    # conftest sets DISABLE_SCHEDULER=1; entering the client context runs lifespan.
    # NOTE: plain TestClient(app) (no context manager) never runs lifespan in
    # installed Starlette, so this context-managed client is the only test that
    # actually exercises the startup/shutdown path.
    import threading
    from fastapi.testclient import TestClient
    from app import main
    with TestClient(main.app) as client:
        assert client.get("/api/health").status_code == 200
        # The check must run INSIDE the context: after a clean lifespan
        # shutdown the thread is gone even when the scheduler DID start
        # (verified empirically), so a post-context check proves nothing.
        # BackgroundScheduler's worker thread is named exactly "APScheduler"
        # (also verified empirically with the env var unset).
        assert not [t for t in threading.enumerate() if "APScheduler" in t.name]
    # And no thread lingers after shutdown either.
    assert not [t for t in threading.enumerate() if "APScheduler" in t.name]
