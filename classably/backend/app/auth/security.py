from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ------------------------------------------------------------------
# Password Hashing
# ------------------------------------------------------------------

# Patch passlib/bcrypt compatibility for newer bcrypt releases
import bcrypt
if not hasattr(bcrypt, "__about__"):
    class __About:
        __version__ = getattr(bcrypt, "__version__", "4.3.0")
    bcrypt.__about__ = __About()

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

# ------------------------------------------------------------------
# JWT Configuration
# ------------------------------------------------------------------

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ------------------------------------------------------------------
# Password Functions
# ------------------------------------------------------------------

def hash_password(password: str) -> str:
    """
    Hash a plain-text password.
    """
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    """
    return pwd_context.verify(password, hashed_password)


# ------------------------------------------------------------------
# JWT Functions
# ------------------------------------------------------------------

def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a signed JWT access token.
    """

    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload = {
        "sub": subject,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any] | None:
    """
    Decode and validate a JWT access token.
    Returns the payload if valid, otherwise None.
    """

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        return payload

    except JWTError:
        return None