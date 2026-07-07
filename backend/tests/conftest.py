import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db import Base

# Disable scheduler in test environment to prevent background threads
os.environ.setdefault("DISABLE_SCHEDULER", "1")


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    # autoflush=False mirrors the production SessionLocal (app/db.py)
    with sessionmaker(bind=engine, autoflush=False)() as s:
        yield s
