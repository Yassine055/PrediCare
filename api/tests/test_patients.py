def test_create_patient(client, auth_headers, patient_data):
    r = client.post("/patients/", json=patient_data, headers=auth_headers)
    assert r.status_code == 201
    assert "id" in r.json()
    assert r.json()["nom"] == patient_data["nom"]


def test_list_patients(client, auth_headers, patient_data):
    client.post("/patients/", json=patient_data, headers=auth_headers)
    r = client.get("/patients/", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


def test_get_patient(client, auth_headers, patient_data):
    create = client.post("/patients/", json=patient_data, headers=auth_headers)
    patient_id = create.json()["id"]
    r = client.get(f"/patients/{patient_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == patient_id


def test_get_patient_not_found(client, auth_headers):
    r = client.get("/patients/99999", headers=auth_headers)
    assert r.status_code == 404


def test_delete_patient(client, auth_headers, patient_data):
    create = client.post("/patients/", json=patient_data, headers=auth_headers)
    patient_id = create.json()["id"]
    r = client.delete(f"/patients/{patient_id}", headers=auth_headers)
    assert r.status_code == 200
    r2 = client.get(f"/patients/{patient_id}", headers=auth_headers)
    assert r2.status_code == 404


def test_patient_isolation(client, medecin_data, patient_data):
    # Médecin A crée un patient
    client.post("/auth/register", json=medecin_data)
    login_a = client.post(
        "/auth/login",
        data={
            "grant_type": "password",
            "username": medecin_data["email"],
            "password": medecin_data["password"],
        },
    )
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}
    create = client.post("/patients/", json=patient_data, headers=headers_a)
    patient_id = create.json()["id"]

    # Médecin B essaie d'accéder au patient de A
    medecin_b = {
        "nom": "Autre",
        "prenom": "Medecin",
        "email": "autre@predicare.ma",
        "password": "AutrePass123",
    }
    client.post("/auth/register", json=medecin_b)
    login_b = client.post(
        "/auth/login",
        data={
            "grant_type": "password",
            "username": medecin_b["email"],
            "password": medecin_b["password"],
        },
    )
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}
    r = client.get(f"/patients/{patient_id}", headers=headers_b)
    assert r.status_code == 404
