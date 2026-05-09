from sqlalchemy import Column, String, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid
import enum

class PitchMethod(str, enum.Enum):
    AI = "ai"
    MANUAL = "manual"

class Pitch(Base):
    __tablename__ = "pitches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False)
    method = Column(Enum(PitchMethod), nullable=False)
    content = Column(Text, nullable=False)
    angles = Column(JSONB, nullable=True)   # List of AI-generated angles
    subject = Column(String, nullable=True)
    sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="pitches")
    lead = relationship("Lead", back_populates="pitches")

class OutreachLog(Base):
    __tablename__ = "outreach_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False)
    pitch_id = Column(UUID(as_uuid=True), ForeignKey("pitches.id"), nullable=True)
    method = Column(String, nullable=False)  # email, manual, dm
    status = Column(String, default="sent")  # sent, responded, no_response
    response = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    lead = relationship("Lead", back_populates="outreach")
