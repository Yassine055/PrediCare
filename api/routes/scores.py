"""
routes/scores.py — Gestion des scores de prédiction ML
POST /scores/ — enregistrer un score lié à un patient
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.auth import get_current_medecin
from api.database import get_db
from api.models import Medecin, Patient, Score
from api.schemas import ScoreCreate, ScoreOut

router = APIRouter(prefix="/scores", tags=["Scores ML"])


# ── POST /scores/ ─────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=ScoreOut,
    status_code=status.HTTP_201_CREATED,
    summary="Enregistrer un score de prédiction ML",
)
def create_score(
    body: ScoreCreate,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Sauvegarde le résultat d'une prédiction ML pour un patient.
    Vérifie que le patient appartient bien au médecin connecté.
    """
    # Vérifier que le patient appartient au médecin connecté
    patient = (
        db.query(Patient)
        .filter(
            Patient.id         == body.patient_id,
            Patient.medecin_id == current_medecin.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient #{body.patient_id} introuvable ou non autorisé",
        )

    score = Score(
        patient_id  = body.patient_id,
        score       = body.score,
        niveau      = body.niveau,
        probabilite = body.probabilite,
        shap_values = body.shap_values,
    )
    db.add(score)
    db.commit()
    db.refresh(score)
    return score
