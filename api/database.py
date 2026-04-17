"""
database.py — Connexion à la base de données pour PrediCare
Priorité : PostgreSQL (DATABASE_URL dans .env) → SQLite en développement local
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from api.models import Base

# ── Chargement des variables d'environnement ──────────────────────────────────
load_dotenv()

# ── URL de connexion ──────────────────────────────────────────────────────────
# En production  → PostgreSQL via DATABASE_URL dans .env
# En dev local   → SQLite (fichier predicare.db à la racine du projet)
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite:///./predicare.db"   # fallback développement
)

# ── Paramètres spécifiques à SQLite ──────────────────────────────────────────
# check_same_thread=False est requis par SQLite en mode multi-thread (FastAPI)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# ── Moteur SQLAlchemy ─────────────────────────────────────────────────────────
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,          # passer à True pour afficher les requêtes SQL en dev
    pool_pre_ping=True,  # vérifie la connexion avant chaque utilisation
)

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ── Dependency injection FastAPI ──────────────────────────────────────────────
def get_db():
    """
    Générateur de session SQLAlchemy.
    Utilisé via Depends(get_db) dans les routes FastAPI.
    La session est automatiquement fermée après chaque requête.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Création des tables au démarrage ─────────────────────────────────────────
def create_tables() -> None:
    """
    Crée toutes les tables définies dans models.py si elles n'existent pas.
    À appeler dans l'événement lifespan de l'application FastAPI.
    """
    Base.metadata.create_all(bind=engine)


# ── Vérification de la connexion (utilitaire) ─────────────────────────────────
def check_connection() -> bool:
    """
    Teste la connexion à la base de données.
    Retourne True si la connexion réussit, False sinon.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
