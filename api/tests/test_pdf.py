def test_generate_pdf_returns_bytes():
    from reports.generate_pdf import generate_patient_report

    patient = {
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
        "tabac": 1,
        "antecedents_familiaux": 1,
    }
    prediction = {
        "score": 74,
        "niveau": "eleve",
        "probabilite": 0.74,
        "shap_values": {
            "age": 0.3,
            "imc": 0.2,
            "glycemie_jeun": 0.8,
            "hba1c": 0.5,
            "tension_systolique": 0.1,
            "tension_diastolique": -0.1,
            "hdl": -0.3,
            "ldl": 0.2,
            "creatinine": 0.05,
            "tabac": 0.2,
            "antecedents_familiaux": 0.4,
        },
        "message": "Risque élevé — consultation recommandée",
    }
    result = generate_patient_report(patient, prediction, "Dr. Test")
    assert isinstance(result, bytes)
    assert len(result) > 1000
    assert result[:4] == b"%PDF"
