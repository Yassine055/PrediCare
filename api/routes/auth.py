"""
routes/auth.py — Endpoints d'authentification pour PrediCare
POST /auth/register — inscription médecin
POST /auth/login    — connexion et obtention du token JWT
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from api.auth import (
    authenticate_medecin,
    create_access_token,
    get_current_medecin,
    hash_password,
    verify_password,
)
from api.database import get_db
from api.models import Medecin
from api.schemas import (
    MedecinCreate,
    MedecinInfo,
    MedecinOut,
    MedecinUpdate,
    PasswordChange,
    TokenWithMedecin,
)

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
    response_model=TokenWithMedecin,
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

    access_token = create_access_token(
        data={
            "sub": medecin.email,
            "nom": medecin.nom,
            "prenom": medecin.prenom,
        }
    )
    return TokenWithMedecin(
        access_token=access_token,
        token_type="bearer",
        medecin=MedecinInfo(
            id=medecin.id,
            nom=medecin.nom,
            prenom=medecin.prenom,
            email=medecin.email,
        ),
    )


@router.get(
    "/me",
    response_model=MedecinOut,
    summary="Profil du medecin connecte",
)
def get_profile(
    current_medecin: Medecin = Depends(get_current_medecin),
):
    """Retourne le profil du medecin authentifie."""
    return current_medecin


@router.put(
    "/me",
    response_model=TokenWithMedecin,
    summary="Modifier le profil du medecin connecte",
)
def update_profile(
    body: MedecinUpdate,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """
    Met a jour le nom, le prenom et l'email du medecin.
    Retourne un nouveau token pour garder la session valide si l'email change.
    """
    existing = (
        db.query(Medecin)
        .filter(Medecin.email == body.email, Medecin.id != current_medecin.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"L'adresse email '{body.email}' est deja associee a un compte",
        )

    current_medecin.nom = body.nom
    current_medecin.prenom = body.prenom
    current_medecin.email = body.email

    db.commit()
    db.refresh(current_medecin)

    access_token = create_access_token(
        data={
            "sub": current_medecin.email,
            "nom": current_medecin.nom,
            "prenom": current_medecin.prenom,
        }
    )

    return TokenWithMedecin(
        access_token=access_token,
        token_type="bearer",
        medecin=MedecinInfo(
            id=current_medecin.id,
            nom=current_medecin.nom,
            prenom=current_medecin.prenom,
            email=current_medecin.email,
        ),
    )


@router.put(
    "/me/password",
    summary="Changer le mot de passe du medecin connecte",
)
def change_password(
    body: PasswordChange,
    current_medecin: Medecin = Depends(get_current_medecin),
    db: Session = Depends(get_db),
):
    """Change le mot de passe apres verification du mot de passe actuel."""
    if not verify_password(body.current_password, current_medecin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect",
        )

    current_medecin.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "Mot de passe mis a jour avec succes"}
