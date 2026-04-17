"""
main.py — Point d'entrée de l'API PrediCare
Démarrage : py -m uvicorn api.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import check_connection, create_tables
from api.routes.auth import router as auth_router
from api.routes.patients import router as patients_router
from api.routes.predict import load_ml_models, router as predict_router

load_dotenv()

VERSION = "1.0.0"


# ── Lifespan — démarrage et arrêt propre de l'application ────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Événements de cycle de vie FastAPI (remplace @app.on_event).
    Démarrage  : création des tables BDD + chargement des modèles ML
    Arrêt      : libération des ressources (géré par Python)
    """
    # ── Démarrage ────────────────────────────────────────────────────────────
    print("=" * 50)
    print("  PrediCare API — démarrage")
    print("=" * 50)

    # Créer les tables si elles n'existent pas encore
    create_tables()
    print("[OK] Tables BDD vérifiées / créées")

    # Charger le modèle XGBoost et le TreeExplainer SHAP une seule fois
    load_ml_models()
    print("[OK] Modèles ML chargés (XGBoost + SHAP TreeExplainer)")

    print(f"[OK] API prête — version {VERSION}")
    print("=" * 50)

    yield   # L'application tourne ici

    # ── Arrêt ────────────────────────────────────────────────────────────────
    print("PrediCare API — arrêt propre")


# ── Application FastAPI ───────────────────────────────────────────────────────
app = FastAPI(
    title       = "PrediCare API",
    description = (
        "API de détection précoce du diabète de type 2. "
        "Fournit des prédictions ML (XGBoost) avec explicabilité SHAP "
        "à destination des médecins."
    ),
    version     = VERSION,
    lifespan    = lifespan,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)


# ── Middleware CORS — autoriser le frontend ───────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # React (Create React App)
        "http://localhost:5173",   # Vite + React
    ],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)       # /auth/register, /auth/login
app.include_router(predict_router)    # /predict/
app.include_router(patients_router)   # /patients/


# ── Routes de base ────────────────────────────────────────────────────────────
@app.get("/", tags=["Général"], summary="Message de bienvenue")
def root():
    """Retourne les informations générales de l'API PrediCare."""
    return {
        "nom"          : "PrediCare API",
        "version"      : VERSION,
        "description"  : "Plateforme ML de détection précoce du diabète de type 2",
        "documentation": "/docs",
        "statut"       : "opérationnel",
    }


@app.get("/health", tags=["Général"], summary="Santé de l'API")
def health():
    """
    Vérifie l'état de l'API et de la connexion à la base de données.
    Utilisé par les outils de monitoring et les health checks de déploiement.
    """
    db_ok = check_connection()
    return {
        "api"             : "ok",
        "base_de_donnees" : "ok" if db_ok else "erreur",
        "version"         : VERSION,
    }
