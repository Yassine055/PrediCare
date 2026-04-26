"""
test_pdf.py — Script de test pour la génération du rapport PDF PrediCare
Génère un rapport fictif et le sauvegarde dans reports/sample_report.pdf

Lancement : py reports/test_pdf.py
"""

import os
import sys

# Ajouter la racine du projet au path pour résoudre les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from reports.generate_pdf import generate_patient_report

# ── 1. Patient fictif ─────────────────────────────────────────────────────────
patient = {
    "nom"                  : "El Amrani",
    "prenom"               : "Mohammed",
    "age"                  : 58,
    "imc"                  : 31.9,
    "glycemie_jeun"        : 6.8,    # mmol/L — zone LIMITE (5.6-6.9)
    "hba1c"                : 7.8,    # % — zone ELEVE (> 6.5%)
    "tension_systolique"   : 140.0,  # mmHg — ELEVE (> 130)
    "tension_diastolique"  : 90.0,   # mmHg — ELEVE (> 85)
    "hdl"                  : 1.1,    # mmol/L — NORMAL (> 1.0)
    "ldl"                  : 3.8,    # mmol/L — ELEVE (> 3.4)
    "creatinine"           : 95.0,   # µmol/L — NORMAL (60-110)
    "tabac"                : 1,
    "antecedents_familiaux": 1,
}

# ── 2. Prédiction fictive ─────────────────────────────────────────────────────
prediction = {
    "score"      : 82,
    "niveau"     : "eleve",
    "probabilite": 0.82,
    "shap_values": {
        "hba1c"               :  1.82,
        "age"                 :  1.37,
        "glycemie_jeun"       :  1.06,
        "antecedents_familiaux":  0.50,
        "imc"                 :  0.44,
        "ldl"                 :  0.30,
        "tabac"               :  0.25,
        "tension_systolique"  :  0.22,
        "tension_diastolique" : -0.11,
        "hdl"                 :  0.05,
        "creatinine"          :  0.05,
    },
    "message": (
        "Risque élevé de diabète de type 2 (score 82/100). "
        "Une consultation spécialisée et des examens complémentaires "
        "sont fortement conseillés."
    ),
}

# ── 3. Génération du PDF ──────────────────────────────────────────────────────
print("=" * 50)
print("  PrediCare — Test génération PDF")
print("=" * 50)
print(f"\nPatient    : {patient['prenom']} {patient['nom']}, {patient['age']} ans")
print(f"Score      : {prediction['score']} / 100")
print(f"Niveau     : {prediction['niveau'].upper()}")
print("\nGénération en cours...")

pdf_bytes = generate_patient_report(
    patient     = patient,
    prediction  = prediction,
    medecin_nom = "Benali Yasmine",
)

# ── 4. Sauvegarde ─────────────────────────────────────────────────────────────
output_dir  = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(output_dir, "sample_report.pdf")

with open(output_path, "wb") as f:
    f.write(pdf_bytes)

taille_ko = len(pdf_bytes) / 1024

print(f"\nRapport généré avec succès !")
print(f"Fichier    : reports/sample_report.pdf")
print(f"Taille     : {taille_ko:.1f} Ko")
print("=" * 50)
