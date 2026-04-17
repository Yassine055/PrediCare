"""
routes/auth.py — Endpoints d'authentification pour PrediCare
POST /auth/register — inscription médecin
POST /auth/login    — connexion et obtention du token JWT
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from api.auth import authenticate_medecin, create_access_token, hash_password
from api.database import get_db
from api.models import Medecin
from api.schemas import MedecinCreate, MedecinOut, Token

router = APIRouter(prefix="/auth", tags=["Authentification"])


# ── POST /auth/register ───────────────────────────────────────────────────────
@router.post(
    "/register",
    response_model=MedecinOut,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un compte médecin",
)
def register(body: MedecinCreate, db: Session = Depends(get_db)):
    """
    Enregistre un nouveau compte médecin.
    Retourne les informations publiques du compte créé (sans mot de passe).
    """
    # Vérifier que l'email n'est pas déjà utilisé
    existing = db.query(Medecin).filter(Medecin.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"L'adresse email '{body.email}' est déjà associée à un compte",
        )

    # Créer le médecin avec le mot de passe haché
    medecin = Medecin(
        nom             = body.nom,
        prenom          = body.prenom,
        email           = body.email,
        hashed_password = hash_password(body.password),
    )
    db.add(medecin)
    db.commit()
    db.refresh(medecin)
    return medecin


# ── POST /auth/login ──────────────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=Token,
    summary="Connexion médecin — obtenir un token JWT",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Authentifie un médecin et retourne un token JWT Bearer.
    Le champ `username` du formulaire OAuth2 correspond à l'email.
    """
    # OAuth2PasswordRequestForm expose le champ `username` (standard OAuth2)
    # On l'utilise comme email dans PrediCare
    medecin = authenticate_medecin(
        db,
        email    = form_data.username,
        password = form_data.password,
    )
    if not medecin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": medecin.email})
    return Token(access_token=access_token, token_type="bearer")
