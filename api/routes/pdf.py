"""
routes/pdf.py — Génération et téléchargement du rapport PDF patient
GET /patients/{patient_id}/pdf → retourne le PDF du dernier score enregistré
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from api.auth import get_current_medecin
from api.database import get_db
from api.models import Medecin, Patient, Score
from reports.generate_pdf import generate_patient_report

router = APIRouter(prefix="/patients", tags=["Rapports PDF"])


def _build_message(score: float, niveau: str) -> str:
    """Reconstruit le message de recommandation depuis le score et le niveau."""
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
    return messages.get(niveau.lower(), messages["faible"])


# ── GET /patients/{patient_id}/pdf ────────────────────────────────────────────
@router.get(
    "/{patient_id}/pdf",
    summary="Télécharger le rapport PDF d'un patient",
    response_class=Response,
    responses={
        200: {"content": {"application/pdf": {}},
              "description": "Rapport PDF généré avec succès"},
        404: {"description": "Patient ou prédiction introuvable"},
    },
)
def download_pdf(
    patient_id: int,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Génère et retourne le rapport PDF du dernier score enregistré pour un patient.

    Étapes :
    1. Vérifier que le patient appartient au médecin connecté
    2. Récupérer le dernier score en base (ordonné par created_at desc)
    3. Construire les dicts patient et prediction
    4. Générer le PDF avec ReportLab
    5. Retourner le fichier en téléchargement
    """
    # 1. Récupérer le patient (isolé par médecin)
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

    # 2. Récupérer le dernier score enregistré pour ce patient
    dernier_score: Score | None = (
        db.query(Score)
        .filter(Score.patient_id == patient_id)
        .order_by(Score.created_at.desc())
        .first()
    )
    if not dernier_score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Aucune prédiction trouvée pour le patient #{patient_id}. "
                "Veuillez d'abord effectuer une prédiction via POST /predict/"
            ),
        )

    # 3. Construire les dicts attendus par generate_patient_report()
    patient_dict = {
        "nom"                  : patient.nom,
        "prenom"               : patient.prenom,
        "age"                  : patient.age,
        "imc"                  : patient.imc,
        "glycemie_jeun"        : patient.glycemie_jeun,
        "hba1c"                : patient.hba1c,
        "tension_systolique"   : patient.tension_systolique,
        "tension_diastolique"  : patient.tension_diastolique,
        "hdl"                  : patient.hdl,
        "ldl"                  : patient.ldl,
        "creatinine"           : patient.creatinine,
        "tabac"                : patient.tabac,
        "antecedents_familiaux": patient.antecedents_familiaux,
    }

    prediction_dict = {
        "score"      : dernier_score.score,
        "niveau"     : dernier_score.niveau,
        "probabilite": dernier_score.probabilite,
        "shap_values": dernier_score.shap_values or {},
        "message"    : _build_message(dernier_score.score, dernier_score.niveau),
    }

    nom_medecin = f"{current_medecin.prenom} {current_medecin.nom}"

    # 4. Générer le PDF
    pdf_bytes = generate_patient_report(
        patient     = patient_dict,
        prediction  = prediction_dict,
        medecin_nom = nom_medecin,
    )

    # 5. Retourner le fichier en téléchargement
    filename = f"rapport_patient_{patient_id}.pdf"
    return Response(
        content     = pdf_bytes,
        media_type  = "application/pdf",
        headers     = {"Content-Disposition": f"attachment; filename={filename}"},
    )
