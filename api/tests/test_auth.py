def test_register_success(client, medecin_data):
    r = client.post("/auth/register", json=medecin_data)
    assert r.status_code == 201
    assert r.json()["email"] == medecin_data["email"]
    assert "password" not in r.json()
    assert "hashed_password" not in r.json()


def test_register_duplicate_email(client, medecin_data):
    client.post("/auth/register", json=medecin_data)
    r = client.post("/auth/register", json=medecin_data)
    assert r.status_code == 409


def test_login_success(client, medecin_data):
    client.post("/auth/register", json=medecin_data)
    r = client.post(
        "/auth/login",
        data={
            "grant_type": "password",
            "username": medecin_data["email"],
            "password": medecin_data["password"],
        },
    )
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["token_type"] == "bearer"


def test_login_wrong_password(client, medecin_data):
    client.post("/auth/register", json=medecin_data)
    r = client.post(
        "/auth/login",
        data={
            "grant_type": "password",
            "username": medecin_data["email"],
            "password": "MauvaisMotDePasse",
        },
    )
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post(
        "/auth/login",
        data={
            "grant_type": "password",
            "username": "inconnu@test.ma",
            "password": "password",
        },
    )
    assert r.status_code == 401


def test_protected_route_without_token(client):
    r = client.get("/patients/")
    assert r.status_code == 401
