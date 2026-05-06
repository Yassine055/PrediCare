import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.main import app
from api.database import get_db, Base

DATABASE_TEST = "sqlite:///./test_predicare.db"


@pytest.fixture(scope="session")
def client():
    engine = create_engine(
        DATABASE_TEST, connect_args={"check_same_thread": False}
    )
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def medecin_data():
    return {
        "nom": "TestMedecin",
        "prenom": "Jean",
        "email": "jean.test@predicare.ma",
        "password": "TestPass123",
    }


@pytest.fixture
def patient_data():
    return {
        "nom": "Alaoui",
        "prenom": "Hassan",
        "age": 52,
        "imc": 28.4,
        "glycemie_jeun": 6.8,
        "hba1c": 6.2,
        "tension_systolique": 138,
        "tension_diastolique": 88,
        "hdl": 1.1,
        "ldl": 3.6,
        "creatinine": 88,
        "tabac": 0,
        "antecedents_familiaux": 1,
    }


@pytest.fixture
def token_medecin(client, medecin_data):
    client.post("/auth/register", json=medecin_data)
    response = client.post(
        "/auth/login",
        data={
            "grant_type": "password",
            "username": medecin_data["email"],
            "password": medecin_data["password"],
        },
    )
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(token_medecin):
    return {"Authorization": f"Bearer {token_medecin}"}
