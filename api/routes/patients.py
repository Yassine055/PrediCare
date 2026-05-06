"""
routes/patients.py — CRUD patients pour PrediCare
GET    /patients          — liste des patients avec leur dernier score
POST   /patients          — créer un nouveau patient
GET    /patients/{id}     — détails d'un patient
DELETE /patients/{id}     — supprimer un patient
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from api.auth import get_current_medecin
from api.database import get_db
from api.models import Medecin, Patient, Score
from api.schemas import PatientCreate, PatientOut, PatientUpdate, PatientWithScore, ScoreOut

router = APIRouter(prefix="/patients", tags=["Patients"])


# ── GET /patients/ ────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=List[PatientWithScore],
    summary="Lister les patients du médecin connecté avec leur dernier score",
)
def list_patients(
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Retourne la liste des patients avec le dernier score de prédiction ML.
    La relation scores est chargée en une seule requête (joinedload).
    """
    patients = (
        db.query(Patient)
        .filter(Patient.medecin_id == current_medecin.id)
        .options(joinedload(Patient.scores))
        .order_by(Patient.created_at.desc())
        .all()
    )

    result = []
    for patient in patients:
        # Construire la base PatientOut depuis l'ORM
        base = PatientOut.model_validate(patient).model_dump()

        # Récupérer le score le plus récent (par id croissant)
        last_score = max(patient.scores, key=lambda s: s.id) if patient.scores else None

        base["last_score"]      = last_score.score      if last_score else None
        base["last_niveau"]     = last_score.niveau     if last_score else None
        base["last_score_date"] = last_score.created_at if last_score else None

        result.append(PatientWithScore(**base))

    return result


# ── POST /patients/ ───────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=PatientOut,
    status_code=status.HTTP_201_CREATED,
    summary="Ajouter un nouveau patient",
)
def create_patient(
    body: PatientCreate,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Enregistre un nouveau dossier patient associé au médecin connecté.
    Retourne le patient créé avec son identifiant en base.
    """
    patient = Patient(**body.model_dump(), medecin_id=current_medecin.id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


# ── GET /patients/{patient_id} ────────────────────────────────────────────────
@router.get(
    "/{patient_id}",
    response_model=PatientOut,
    summary="Détails d'un patient",
)
def get_patient(
    patient_id: int,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Retourne les informations complètes d'un patient.
    Lève une 404 si le patient n'existe pas ou n'appartient pas au médecin connecté.
    """
    patient = (
        db.query(Patient)
        .filter(
            Patient.id         == patient_id,
            Patient.medecin_id == current_medecin.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient #{patient_id} introuvable",
        )
    return patient


@router.put(
    "/{patient_id}",
    response_model=PatientOut,
    summary="Modifier un patient",
)
def update_patient(
    patient_id: int,
    body: PatientUpdate,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Met a jour les informations personnelles et cliniques d'un patient.
    Le patient doit appartenir au medecin connecte.
    """
    patient = (
        db.query(Patient)
        .filter(
            Patient.id         == patient_id,
            Patient.medecin_id == current_medecin.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient #{patient_id} introuvable",
        )

    for field, value in body.model_dump().items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient


# ── GET /patients/{patient_id}/scores ─────────────────────────────────────────
@router.get(
    "/{patient_id}/scores",
    response_model=List[ScoreOut],
    summary="Historique des scores d'un patient",
)
def list_patient_scores(
    patient_id: int,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Retourne toutes les analyses ML d'un patient, de la plus recente a la plus ancienne.
    Le patient doit appartenir au medecin connecte.
    """
    patient = (
        db.query(Patient)
        .filter(
            Patient.id         == patient_id,
            Patient.medecin_id == current_medecin.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient #{patient_id} introuvable",
        )

    return (
        db.query(Score)
        .filter(Score.patient_id == patient_id)
        .order_by(Score.created_at.desc(), Score.id.desc())
        .all()
    )


# ── DELETE /patients/{patient_id} ─────────────────────────────────────────────
@router.delete(
    "/{patient_id}",
    summary="Supprimer un patient",
)
def delete_patient(
    patient_id: int,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Supprime définitivement un patient et tous ses scores associés (cascade).
    Lève une 404 si le patient n'existe pas ou n'appartient pas au médecin connecté.
    """
    patient = (
        db.query(Patient)
        .filter(
            Patient.id         == patient_id,
            Patient.medecin_id == current_medecin.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient #{patient_id} introuvable",
        )

    nom_complet = f"{patient.prenom} {patient.nom}"
    db.delete(patient)
    db.commit()
    return {"message": f"Patient #{patient_id} ({nom_complet}) supprimé avec succès"}
