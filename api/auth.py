"""
auth.py — Sécurité et authentification JWT pour PrediCare
Fonctions : hachage bcrypt, création/vérification de tokens JWT
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import Medecin
from api.schemas import TokenData

load_dotenv()

# ── Configuration JWT depuis les variables d'environnement ────────────────────
SECRET_KEY                 = os.getenv("SECRET_KEY", "dev-secret-key-CHANGE-in-production")
ALGORITHM                  = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# ── Contexte de hachage bcrypt ────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Schéma OAuth2 — l'URL tokenUrl doit correspondre à la route de login ─────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ─────────────────────────────────────────────────────────────────────────────
# Hachage des mots de passe
# ─────────────────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hache un mot de passe en clair avec bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie qu'un mot de passe en clair correspond au hash bcrypt stocké."""
    return pwd_context.verify(plain_password, hashed_password)


# ─────────────────────────────────────────────────────────────────────────────
# Tokens JWT
# ─────────────────────────────────────────────────────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Crée et signe un token JWT.

    Args:
        data          : payload à encoder (doit contenir {"sub": email})
        expires_delta : durée de validité personnalisée (par défaut : .env)

    Returns:
        Token JWT signé en chaîne de caractères
    """
    to_encode = data.copy()
    expire    = datetime.now(timezone.utc) + (
        expires_delta if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ─────────────────────────────────────────────────────────────────────────────
# Authentification
# ─────────────────────────────────────────────────────────────────────────────

def authenticate_medecin(
    db: Session,
    email: str,
    password: str,
) -> Optional[Medecin]:
    """
    Vérifie l'email et le mot de passe d'un médecin en base.

    Returns:
        L'objet Medecin si les identifiants sont corrects, None sinon.
    """
    medecin = db.query(Medecin).filter(Medecin.email == email).first()
    if not medecin:
        return None
    if not verify_password(password, medecin.hashed_password):
        return None
    return medecin


async def get_current_medecin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Medecin:
    """
    Dependency FastAPI : décode le token JWT et retourne le médecin connecté.
    Lève une HTTPException 401 si le token est invalide ou expiré.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré — veuillez vous reconnecter",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    medecin = db.query(Medecin).filter(Medecin.email == token_data.email).first()
    if medecin is None:
        raise credentials_exception

    if not medecin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte médecin est désactivé",
        )

    return medecin
