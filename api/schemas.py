"""
schemas.py — Schémas Pydantic v2 pour PrediCare
Validation des entrées / sérialisation des sorties de l'API
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ═══════════════════════════════════════════════════════════════════════════════
# MEDECIN
# ═══════════════════════════════════════════════════════════════════════════════

class MedecinCreate(BaseModel):
    """Données requises pour créer un compte médecin."""
    nom    : str = Field(..., min_length=2, max_length=100, examples=["Benali"])
    prenom : str = Field(..., min_length=2, max_length=100, examples=["Yasmine"])
    email  : EmailStr = Field(..., examples=["y.benali@chu.dz"])
    password: str = Field(..., min_length=8, examples=["motdepasse123"])


class MedecinOut(BaseModel):
    """Représentation publique d'un médecin (sans mot de passe)."""
    model_config = ConfigDict(from_attributes=True)

    id         : int
    nom        : str
    prenom     : str
    email      : EmailStr
    is_active  : bool
    created_at : datetime


# ═══════════════════════════════════════════════════════════════════════════════
class MedecinUpdate(BaseModel):
    """Donnees modifiables du profil medecin."""
    nom    : str = Field(..., min_length=2, max_length=100)
    prenom : str = Field(..., min_length=2, max_length=100)
    email  : EmailStr


class PasswordChange(BaseModel):
    """Donnees requises pour changer le mot de passe."""
    current_password: str = Field(..., min_length=1)
    new_password    : str = Field(..., min_length=8)


# PATIENT
# ═══════════════════════════════════════════════════════════════════════════════

class PatientCreate(BaseModel):
    """Données requises pour enregistrer un nouveau patient."""
    nom    : str = Field(..., min_length=2, max_length=100)
    prenom : str = Field(..., min_length=2, max_length=100)

    # Features biologiques (mêmes que le modèle ML)
    age                  : int   = Field(..., ge=18,  le=120)
    imc                  : float = Field(..., ge=10.0, le=60.0)
    glycemie_jeun        : float = Field(..., ge=2.0,  le=20.0)
    hba1c                : float = Field(..., ge=4.0,  le=15.0)
    tension_systolique   : float = Field(..., ge=60.0, le=250.0)
    tension_diastolique  : float = Field(..., ge=40.0, le=150.0)
    hdl                  : float = Field(..., ge=0.2,  le=3.0)
    ldl                  : float = Field(..., ge=0.5,  le=10.0)
    creatinine           : float = Field(..., ge=30.0, le=2000.0)
    tabac                : int   = Field(..., ge=0,    le=1)
    antecedents_familiaux: int   = Field(..., ge=0,    le=1)


class PatientUpdate(PatientCreate):
    """Donnees modifiables d'un dossier patient."""


class PatientOut(BaseModel):
    """Représentation complète d'un patient retournée par l'API."""
    model_config = ConfigDict(from_attributes=True)

    id                   : int
    nom                  : str
    prenom               : str
    age                  : int
    imc                  : float
    glycemie_jeun        : float
    hba1c                : float
    tension_systolique   : float
    tension_diastolique  : float
    hdl                  : float
    ldl                  : float
    creatinine           : float
    tabac                : int
    antecedents_familiaux: int
    medecin_id           : int
    created_at           : datetime


# ═══════════════════════════════════════════════════════════════════════════════
# PREDICTION ML
# ═══════════════════════════════════════════════════════════════════════════════

class PredictionRequest(BaseModel):
    """
    Les 11 features biologiques nécessaires au modèle ML.
    Chaque champ est validé avec des bornes cliniquement réalistes.
    """
    age: int = Field(
        ..., ge=18, le=120,
        description="Âge du patient (années)",
        examples=[52]
    )
    imc: float = Field(
        ..., ge=10.0, le=60.0,
        description="Indice de Masse Corporelle (kg/m²)",
        examples=[28.4]
    )
    glycemie_jeun: float = Field(
        ..., ge=2.0, le=20.0,
        description="Glycémie à jeun (g/L)",
        examples=[1.26]
    )
    hba1c: float = Field(
        ..., ge=4.0, le=15.0,
        description="Hémoglobine glyquée HbA1c (%)",
        examples=[6.8]
    )
    tension_systolique: float = Field(
        ..., ge=60.0, le=250.0,
        description="Tension artérielle systolique (mmHg)",
        examples=[138.0]
    )
    tension_diastolique: float = Field(
        ..., ge=40.0, le=150.0,
        description="Tension artérielle diastolique (mmHg)",
        examples=[88.0]
    )
    hdl: float = Field(
        ..., ge=0.2, le=3.0,
        description="Cholestérol HDL (g/L)",
        examples=[0.45]
    )
    ldl: float = Field(
        ..., ge=0.5, le=10.0,
        description="Cholestérol LDL (g/L)",
        examples=[1.60]
    )
    creatinine: float = Field(
        ..., ge=30.0, le=2000.0,
        description="Créatinine sérique (µmol/L)",
        examples=[85.0]
    )
    tabac: int = Field(
        ..., ge=0, le=1,
        description="Tabagisme actif (0 = non, 1 = oui)",
        examples=[0]
    )
    antecedents_familiaux: int = Field(
        ..., ge=0, le=1,
        description="Antécédents familiaux de diabète (0 = non, 1 = oui)",
        examples=[1]
    )


class PredictionResponse(BaseModel):
    """Résultat complet d'une prédiction ML retourné au frontend."""
    score      : float = Field(..., ge=0.0, le=100.0,
                               description="Score de risque sur 100")
    niveau     : str   = Field(..., description="faible | modere | eleve")
    probabilite: float = Field(..., ge=0.0, le=1.0,
                               description="Probabilité brute du modèle (0–1)")
    shap_values: dict  = Field(...,
                               description="Contributions SHAP par feature {feature: valeur}")
    message    : str   = Field(...,
                               description="Message explicatif pour le médecin")


# ═══════════════════════════════════════════════════════════════════════════════
# SCORE ML
# ═══════════════════════════════════════════════════════════════════════════════

class ScoreCreate(BaseModel):
    """Données requises pour enregistrer un score de prédiction ML."""
    patient_id  : int
    score       : float = Field(..., ge=0.0, le=100.0)
    niveau      : str   = Field(..., description="faible | modere | eleve")
    probabilite : float = Field(..., ge=0.0, le=1.0)
    shap_values : Optional[dict] = None


class ScoreOut(BaseModel):
    """Représentation publique d'un score de prédiction."""
    model_config = ConfigDict(from_attributes=True)

    id          : int
    patient_id  : int
    score       : float
    niveau      : str
    probabilite : float
    shap_values : Optional[dict]
    created_at  : datetime


class PatientWithScore(PatientOut):
    """Patient enrichi avec les données du dernier score de prédiction."""
    last_score      : Optional[float]    = None
    last_niveau     : Optional[str]      = None
    last_score_date : Optional[datetime] = None


# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTIFICATION JWT
# ═══════════════════════════════════════════════════════════════════════════════

class Token(BaseModel):
    """Token JWT retourné après une connexion réussie."""
    access_token: str
    token_type  : str = "bearer"


class TokenData(BaseModel):
    """Payload extrait du token JWT lors de la vérification."""
    email: Optional[str] = None


class MedecinInfo(BaseModel):
    """Informations publiques du médecin connecté."""
    id    : int
    nom   : str
    prenom: str
    email : str


class TokenWithMedecin(BaseModel):
    """Token JWT + informations du médecin connecté."""
    access_token: str
    token_type  : str = "bearer"
    medecin     : MedecinInfo
