from sqlalchemy import Column, String, Boolean, Enum, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid
import enum

class UserTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    tier = Column(Enum(UserTier), default=UserTier.FREE, nullable=False)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    mile_range = Column(Float, default=25.0)
    notification_preference = Column(String, default="both")  # email, in_app, both
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    leads = relationship("Lead", back_populates="user")
    pitches = relationship("Pitch", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    monitors = relationship("Monitor", back_populates="user")
