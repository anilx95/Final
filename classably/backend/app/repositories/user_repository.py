from sqlalchemy.orm import Session

from app.models.entities.user import User


def get_user_by_email(db: Session, email: str):
    if not email:
        return None
    clean = email.strip().lower()
    # 1. Match email case-insensitively
    user = db.query(User).filter(User.email.ilike(clean)).first()
    if user:
        return user
    
    # 2. Match exact phone number or phone digits
    phone_clean = ''.join(c for c in email if c.isdigit())
    if phone_clean and len(phone_clean) >= 6:
        user = db.query(User).filter(User.phone.like(f"%{phone_clean}%")).first()
        if user:
            return user

    return None


def create_user(db: Session, user: User):
    db.add(user)
    db.commit()
    db.refresh(user)
    return user