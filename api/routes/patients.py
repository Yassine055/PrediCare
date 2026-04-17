"""
routes/patients.py — CRUD patients pour PrediCare
GET    /patients          — liste des patients du médecin connecté
POST   /patients          — créer un nouveau patient
GET    /patients/{id}     — détails d'un patient
DELETE /patients/{id}     — supprimer un patient
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.auth import get_current_medecin
from api.database import get_db
from api.models import Medecin, Patient
from api.schemas import PatientCreate, PatientOut

router = APIRouter(prefix="/patients", tags=["Patients"])


# ── GET /patients/ ────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=List[PatientOut],
    summary="Lister les patients du médecin connecté",
)
def list_patients(
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Retourne la liste complète des patients rattachés au médecin connecté.
    Un médecin ne peut voir que ses propres patients.
    """
    return (
        db.query(Patient)
        .filter(Patient.medecin_id == current_medecin.id)
        .order_by(Patient.created_at.desc())
        .all()
    )


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
    # Associer automatiquement le patient au médecin connecté
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
    Supprime définitivement un patient et tous ses scores associés.
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
