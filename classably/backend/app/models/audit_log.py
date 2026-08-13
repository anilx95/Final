from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, ForeignKey
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    module = Column(String(100), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
