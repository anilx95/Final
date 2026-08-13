from datetime import datetime, timedelta
from jose import jwt

from app.core.config import settings

ALGORITHM = "HS256"


def create_access_token(data: dict, expires_minutes: int = 30):
    payload = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)

    payload.update({"exp": expire})

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str):
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[ALGORITHM],
    )