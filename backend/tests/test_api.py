import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.media import Media, MediaStatus
from app.models.transcript import Transcript, TranscriptSegment
from app.models.bookmark import Bookmark
from app.core.security import get_password_hash

from sqlalchemy.pool import StaticPool

# In-memory SQLite for testing with StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # Create test user
    user = User(
        email="tester@example.com",
        password_hash=get_password_hash("password123"),
        full_name="Test User"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create sample media & transcript
    media = Media(
        user_id=user.id,
        title="Product Launch Video",
        source_type="upload",
        media_type="video",
        duration=120.0,
        status=MediaStatus.COMPLETED.value
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    transcript = Transcript(
        media_id=media.id,
        language="en",
        full_text="Welcome to the product launch. Today we unveil our new feature."
    )
    db.add(transcript)
    db.commit()
    db.refresh(transcript)

    seg1 = TranscriptSegment(
        transcript_id=transcript.id,
        start_time=0.0,
        end_time=4.5,
        text="Welcome to the product launch.",
        speaker="Speaker 1",
        sequence=0
    )
    seg2 = TranscriptSegment(
        transcript_id=transcript.id,
        start_time=4.5,
        end_time=9.0,
        text="Today we unveil our new feature.",
        speaker="Speaker 1",
        sequence=1
    )
    db.add_all([seg1, seg2])
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)


def test_auth_login():
    response = client.post("/api/auth/login", json={"email": "tester@example.com", "password": "password123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "tester@example.com"


def test_get_media_list():
    login_res = client.post("/api/auth/login", json={"email": "tester@example.com", "password": "password123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/media/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["title"] == "Product Launch Video"


def test_get_transcript_and_edit_segment_preserving_timestamps():
    login_res = client.post("/api/auth/login", json={"email": "tester@example.com", "password": "password123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get media
    media_res = client.get("/api/media/", headers=headers)
    media_id = media_res.json()[0]["id"]

    # Get transcript
    t_res = client.get(f"/api/transcripts/{media_id}", headers=headers)
    assert t_res.status_code == 200
    t_data = t_res.json()
    assert len(t_data["segments"]) == 2
    segment_id = t_data["segments"][0]["id"]
    orig_start = t_data["segments"][0]["start_time"]
    orig_end = t_data["segments"][0]["end_time"]

    # Edit segment text
    edit_res = client.patch(
        f"/api/transcripts/segments/{segment_id}",
        json={"text": "Welcome to our live product launch!"},
        headers=headers
    )
    assert edit_res.status_code == 200
    edited = edit_res.json()
    assert edited["text"] == "Welcome to our live product launch!"
    assert edited["start_time"] == orig_start  # Verified preserved
    assert edited["end_time"] == orig_end      # Verified preserved


def test_create_and_list_bookmarks():
    login_res = client.post("/api/auth/login", json={"email": "tester@example.com", "password": "password123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    media_res = client.get("/api/media/", headers=headers)
    media_id = media_res.json()[0]["id"]

    # Create bookmark
    bm_res = client.post(
        f"/api/bookmarks/{media_id}",
        json={"timestamp": 4.5, "label": "Key Feature Intro", "note": "Great slide"},
        headers=headers
    )
    assert bm_res.status_code == 201
    bm_data = bm_res.json()
    assert bm_data["timestamp"] == 4.5
    assert bm_data["label"] == "Key Feature Intro"

    # List bookmarks
    list_bm = client.get(f"/api/bookmarks/{media_id}", headers=headers)
    assert list_bm.status_code == 200
    assert len(list_bm.json()) == 1


def test_global_search():
    login_res = client.post("/api/auth/login", json={"email": "tester@example.com", "password": "password123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Search for word in title
    search_res = client.get("/api/search/?q=Product", headers=headers)
    assert search_res.status_code == 200
    data = search_res.json()
    assert data["total_results"] >= 1
    assert any(r["match_type"] == "title" for r in data["results"])
