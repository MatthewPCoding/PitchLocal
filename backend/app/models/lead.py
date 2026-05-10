from sqlalchemy import Column, String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, selectinload  # noqa: F401 — re-exported for route use
from sqlalchemy.sql import func
from app.db.database import Base
import uuid
import enum

class LeadSource(str, enum.Enum):
    local = "local"
    reddit = "reddit"
    discord = "discord"

class LeadStatus(str, enum.Enum):
    new = "new"
    pitched = "pitched"
    interested = "interested"
    rejected = "rejected"
    landed = "landed"

class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=True)
    source = Column(Enum(LeadSource), nullable=False)
    status = Column(Enum(LeadStatus), default=LeadStatus.new)
    source_url = Column(String, nullable=True)       # Reddit/Discord post URL
    source_content = Column(Text, nullable=True)     # Original post text
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    # lazy="selectin" is required for async SQLAlchemy — lazy loading raises MissingGreenlet
    user     = relationship("User",        back_populates="leads",    lazy="selectin")
    business = relationship("Business",    back_populates="leads",    lazy="selectin")
    pitches  = relationship("Pitch",       back_populates="lead",     lazy="selectin")
    outreach = relationship("OutreachLog", back_populates="lead",     lazy="selectin")
    project  = relationship("Project",     back_populates="lead",     lazy="selectin", uselist=False)
