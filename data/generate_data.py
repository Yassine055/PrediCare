"""
Génération de 5000 patients synthétiques pour le projet PrediCare.
Les valeurs sont médicalement réalistes et cohérentes avec les facteurs de risque du diabète.
"""

import numpy as np
import pandas as pd
from faker import Faker
from pathlib import Path

fake = Faker("fr_FR")
rng = np.random.default_rng(42)

N = 5000


def generate_patients(n: int) -> pd.DataFrame:
    # --- Facteurs de base ---
    age = rng.integers(18, 80, size=n).astype(float)
    tabac = rng.binomial(1, 0.25, size=n)
    antecedents_familiaux = rng.binomial(1, 0.30, size=n)

    # IMC : distribution réaliste, légèrement asymétrique vers surpoids
    imc = rng.normal(26.5, 5.0, size=n).clip(16.0, 50.0)

    # --- Glycémie à jeun (mmol/L) ---
    # Base autour de 5.0, augmentée par IMC élevé, âge, antécédents
    glycemie_base = (
        5.0
        + 0.015 * (imc - 25)
        + 0.01 * (age - 40)
        + 0.4 * antecedents_familiaux
        + 0.2 * tabac
        + rng.normal(0, 0.5, size=n)
    )
    glycemie_jeun = glycemie_base.clip(3.5, 16.0)

    # --- HbA1c (%) ---
    # Corrélée à la glycémie (HbA1c ≈ (glycemie * 0.9) + 1.5)
    hba1c = (
        glycemie_jeun * 0.9
        + 1.5
        + rng.normal(0, 0.3, size=n)
    ).clip(4.0, 14.0)

    # --- Tension artérielle ---
    # Systolique : normale ~120, augmente avec âge et IMC
    tension_systolique = (
        110
        + 0.3 * age
        + 0.4 * (imc - 22)
        + 5 * tabac
        + rng.normal(0, 8, size=n)
    ).clip(85, 200)

    # Diastolique : corrélée à systolique
    tension_diastolique = (
        tension_systolique * 0.6
        + 10
        + rng.normal(0, 5, size=n)
    ).clip(50, 120)

    # --- Bilan lipidique ---
    # HDL (bon cholestérol, mmol/L) : baisse avec IMC élevé et tabac
    #hdl: un bon colesterol
    hdl = ( 
        1.6
        - 0.02 * (imc - 22)
        - 0.15 * tabac
        + rng.normal(0, 0.2, size=n)
    ).clip(0.5, 3.0)

    # LDL (mauvais cholestérol, mmol/L) : monte avec IMC
    ldl = (
        2.5
        + 0.03 * (imc - 22)
        + 0.1 * tabac
        + rng.normal(0, 0.5, size=n)
    ).clip(0.5, 6.0)

    # --- Créatinine (µmol/L) ---
    # Légèrement plus élevée chez hommes simulés aléatoirement via bruit
    creatinine = (
        80
        + 0.2 * age
        + 0.3 * (imc - 22)
        + rng.normal(0, 12, size=n)
    ).clip(40, 300)

    # --- Label diabète ---
    # Score de risque logistique basé sur les facteurs cliniques
    log_odds = (
        -3.0
        + 0.04 * (age - 40)
        + 0.08 * (imc - 25)
        + 0.6 * (glycemie_jeun - 5.0)
        + 0.5 * (hba1c - 5.5)
        + 0.8 * antecedents_familiaux
        + 0.3 * tabac
        + 0.01 * (tension_systolique - 120)
        - 0.5 * (hdl - 1.2)
    )
    prob_diabete = 1 / (1 + np.exp(-log_odds))
    diabete = rng.binomial(1, prob_diabete)

    df = pd.DataFrame({
        "age": age.round(0).astype(int),
        "imc": imc.round(1),
        "glycemie_jeun": glycemie_jeun.round(2),
        "hba1c": hba1c.round(2),
        "tension_systolique": tension_systolique.round(0).astype(int),
        "tension_diastolique": tension_diastolique.round(0).astype(int),
        "hdl": hdl.round(2),
        "ldl": ldl.round(2),
        "creatinine": creatinine.round(1),
        "tabac": tabac,
        "antecedents_familiaux": antecedents_familiaux,
        "diabete": diabete,
    })

    return df


if __name__ == "__main__":
    df = generate_patients(N)

    output_path = Path(__file__).parent / "patients.csv"
    df.to_csv(output_path, index=False)

    n_diabetiques = df["diabete"].sum()
    pct = n_diabetiques / N * 100

    print(f"Patients générés     : {N}")
    print(f"Diabétiques          : {n_diabetiques} ({pct:.1f}%)")
    print(f"Non diabétiques      : {N - n_diabetiques} ({100 - pct:.1f}%)")
    print(f"Fichier sauvegardé   : {output_path}")
