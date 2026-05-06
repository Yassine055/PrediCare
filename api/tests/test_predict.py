def test_predict_success(client, auth_headers, patient_data):
    features = {k: v for k, v in patient_data.items() if k not in ["nom", "prenom"]}
    r = client.post("/predict/", json=features, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "score" in data
    assert "niveau" in data
    assert "probabilite" in data
    assert "shap_values" in data
    assert "message" in data
    assert 0 <= data["score"] <= 100
    assert data["niveau"] in ["faible", "modere", "eleve"]
    assert len(data["shap_values"]) == 11


def test_predict_unauthorized(client, patient_data):
    features = {k: v for k, v in patient_data.items() if k not in ["nom", "prenom"]}
    r = client.post("/predict/", json=features)
    assert r.status_code == 401


def test_predict_invalid_age(client, auth_headers, patient_data):
    features = {k: v for k, v in patient_data.items() if k not in ["nom", "prenom"]}
    features["age"] = 200
    r = client.post("/predict/", json=features, headers=auth_headers)
    assert r.status_code == 422


def test_predict_low_risk(client, auth_headers):
    data = {
        "age": 25,
        "imc": 20.0,
        "glycemie_jeun": 4.5,
        "hba1c": 4.8,
        "tension_systolique": 110,
        "tension_diastolique": 70,
        "hdl": 2.0,
        "ldl": 2.0,
        "creatinine": 65,
        "tabac": 0,
        "antecedents_familiaux": 0,
    }
    r = client.post("/predict/", json=data, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["niveau"] == "faible"


def test_predict_high_risk(client, auth_headers):
    data = {
        "age": 70,
        "imc": 36.0,
        "glycemie_jeun": 8.5,
        "hba1c": 9.0,
        "tension_systolique": 165,
        "tension_diastolique": 105,
        "hdl": 0.7,
        "ldl": 4.8,
        "creatinine": 125,
        "tabac": 1,
        "antecedents_familiaux": 1,
    }
    r = client.post("/predict/", json=data, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["niveau"] == "eleve"
