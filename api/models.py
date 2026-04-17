"""
models.py — Modèles SQLAlchemy (ORM) pour PrediCare
Tables : Medecin, Patient, Score

Style SQLAlchemy 2.0 : Mapped[T] + mapped_column() pour un typage correct
par les outils statiques (Pylance, mypy).
"""

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# ── Base déclarative SQLAlchemy 2.0 ──────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Table : Medecin ───────────────────────────────────────────────────────────
class Medecin(Base):
    """Compte utilisateur d'un médecin connecté à la plateforme."""

    __tablename__ = "medecins"

    id              : Mapped[int]      = mapped_column(primary_key=True, index=True)
    nom             : Mapped[str]      = mapped_column(String(100))
    prenom          : Mapped[str]      = mapped_column(String(100))
    email           : Mapped[str]      = mapped_column(String(255), unique=True, index=True)
    hashed_password : Mapped[str]      = mapped_column(String(255))
    is_active       : Mapped[bool]     = mapped_column(default=True)
    created_at      : Mapped[datetime] = mapped_column(server_default=func.now())

    # Relation : un médecin peut avoir plusieurs patients
    patients: Mapped[list["Patient"]] = relationship(
        back_populates="medecin",
        cascade="all, delete-orphan",
    )


# ── Table : Patient ───────────────────────────────────────────────────────────
class Patient(Base):
    """Dossier biologique d'un patient, rattaché à un médecin."""

    __tablename__ = "patients"

    id    : Mapped[int] = mapped_column(primary_key=True, index=True)

    # Données personnelles
    nom   : Mapped[str] = mapped_column(String(100))
    prenom: Mapped[str] = mapped_column(String(100))

    # Features biologiques (11 features du modèle ML)
    age                  : Mapped[int]   = mapped_column()
    imc                  : Mapped[float] = mapped_column()
    glycemie_jeun        : Mapped[float] = mapped_column()
    hba1c                : Mapped[float] = mapped_column()
    tension_systolique   : Mapped[float] = mapped_column()
    tension_diastolique  : Mapped[float] = mapped_column()
    hdl                  : Mapped[float] = mapped_column()
    ldl                  : Mapped[float] = mapped_column()
    creatinine           : Mapped[float] = mapped_column()
    tabac                : Mapped[int]   = mapped_column()   # 0 ou 1
    antecedents_familiaux: Mapped[int]   = mapped_column()   # 0 ou 1

    # Clé étrangère vers le médecin responsable
    medecin_id: Mapped[int]      = mapped_column(ForeignKey("medecins.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relations
    medecin: Mapped["Medecin"]       = relationship(back_populates="patients")
    scores : Mapped[list["Score"]]   = relationship(
        back_populates="patient",
        cascade="all, delete-orphan",
    )


# ── Table : Score ─────────────────────────────────────────────────────────────
class Score(Base):
    """Résultat de prédiction ML pour un patient, avec valeurs SHAP."""

    __tablename__ = "scores"

    id        : Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))

    # Résultat de la prédiction
    score      : Mapped[float] = mapped_column()           # 0 – 100
    niveau     : Mapped[str]   = mapped_column(String(10)) # faible | modere | eleve
    probabilite: Mapped[float] = mapped_column()           # 0.0 – 1.0

    # Valeurs SHAP sérialisées en JSON — Optional car calcul asynchrone possible
    shap_values: Mapped[Optional[Any]] = mapped_column(default=None)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relation
    patient: Mapped["Patient"] = relationship(back_populates="scores")
