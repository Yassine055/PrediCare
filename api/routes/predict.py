"""
routes/predict.py — Endpoint de prédiction ML pour PrediCare
POST /predict — calcule le score de risque diabète + valeurs SHAP
"""

import os
from typing import Any

import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.auth import get_current_medecin
from api.database import get_db
from api.models import Medecin
from api.schemas import PredictionRequest, PredictionResponse

router = APIRouter(prefix="/predict", tags=["Prédiction ML"])

# ── Chemins vers les artefacts ML ─────────────────────────────────────────────
# api/routes/predict.py → 3 niveaux au-dessus = racine PrediCare/
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_ML_DIR   = os.path.join(_THIS_DIR, "..", "..", "ml")

FEATURES = [
    "age", "imc", "glycemie_jeun", "hba1c",
    "tension_systolique", "tension_diastolique",
    "hdl", "ldl", "creatinine", "tabac", "antecedents_familiaux",
]

# ── Conteneur pour les modèles ML (chargés une seule fois au démarrage) ───────
_ml: dict[str, Any] = {}


def load_ml_models() -> None:
    """
    Charge model.pkl, scaler.pkl et initialise le TreeExplainer SHAP.
    Appelé depuis le lifespan de api/main.py au démarrage du serveur.
    """
    model_path  = os.path.join(_ML_DIR, "model.pkl")
    scaler_path = os.path.join(_ML_DIR, "scaler.pkl")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Modèle ML introuvable : {model_path}")
    if not os.path.exists(scaler_path):
        raise FileNotFoundError(f"Scaler introuvable : {scaler_path}")

    _ml["model"]     = joblib.load(model_path)
    _ml["scaler"]    = joblib.load(scaler_path)
    _ml["explainer"] = shap.TreeExplainer(_ml["model"])


# ── Fonctions utilitaires ─────────────────────────────────────────────────────

def _get_niveau(score: float) -> str:
    """Convertit un score numérique en niveau de risque texte."""
    if score < 31:
        return "faible"
    if score < 61:
        return "modere"
    return "eleve"


def _get_message(niveau: str, score: float) -> str:
    """Génère un message explicatif adapté au niveau de risque."""
    messages = {
        "faible": (
            f"Risque faible de diabète de type 2 (score {score:.0f}/100). "
            "Aucune intervention urgente requise. Maintenir un mode de vie sain."
        ),
        "modere": (
            f"Risque modéré de diabète de type 2 (score {score:.0f}/100). "
            "Un suivi régulier et des ajustements du mode de vie sont recommandés."
        ),
        "eleve": (
            f"Risque élevé de diabète de type 2 (score {score:.0f}/100). "
            "Une consultation spécialisée et des examens complémentaires "
            "sont fortement conseillés."
        ),
    }
    return messages[niveau]


# ── POST /predict/ ────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=PredictionResponse,
    summary="Calculer le score de risque diabète d'un patient",
)
def predict(
    body: PredictionRequest,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Calcule le score de risque de diabète de type 2 à partir des 11 features
    biologiques du patient.

    Étapes :
    1. Normalisation des données avec le MinMaxScaler entraîné
    2. Prédiction de probabilité via XGBoost
    3. Calcul des valeurs SHAP (TreeExplainer)
    4. Retour du score (0-100), niveau, probabilité et contributions SHAP
    """
    # Vérifier que les modèles sont bien chargés
    if not _ml:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Modèle ML non disponible — réessayez dans quelques secondes",
        )

    # 1. Construire le DataFrame dans l'ordre exact des features d'entraînement
    data_dict = body.model_dump()
    data_raw  = pd.DataFrame([[data_dict[f] for f in FEATURES]], columns=FEATURES)

    # 2. Normaliser avec le scaler MinMaxScaler
    data_scaled = pd.DataFrame(
        _ml["scaler"].transform(data_raw),
        columns=FEATURES,
    )

    # 3. Probabilité brute du modèle XGBoost (classe positive = diabète)
    probabilite = float(_ml["model"].predict_proba(data_scaled)[0, 1])
    score       = round(probabilite * 100, 1)

    # 4. Niveau de risque
    niveau = _get_niveau(score)

    # 5. Valeurs SHAP — TreeExplainer retourne un tableau ou une liste selon la version
    shap_raw = _ml["explainer"].shap_values(data_scaled)
    if isinstance(shap_raw, list):
        # Anciennes versions de shap : [valeurs_classe_0, valeurs_classe_1]
        shap_raw = shap_raw[1]
    shap_dict = {
        feat: round(float(val), 6)
        for feat, val in zip(FEATURES, shap_raw[0])
    }

    # 6. Message explicatif
    message = _get_message(niveau, score)

    return PredictionResponse(
        score       = score,
        niveau      = niveau,
        probabilite = round(probabilite, 6),
        shap_values = shap_dict,
        message     = message,
    )
