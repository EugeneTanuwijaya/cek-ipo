from app.scheduler import build_scheduler


def test_jobs_registered():
    s = build_scheduler()
    ids = {j.id for j in s.get_jobs()}
    assert ids == {"eipo_daily", "prices_daily"}
