from sqlalchemy import Column, String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid
import enum

class LeadSource(str, enum.Enum):
    LOCAL = "local"
    REDDIT = "reddit"
    DISCORD = "discord"

class LeadStatus(str, enum.Enum):
    NEW = "new"
    PITCHED = "pitched"
    INTERESTED = "interested"
    REJECTED = "rejected"
    LANDED = "landed"

class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=True)
    source = Column(Enum(LeadSource), nullable=False)
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    source_url = Column(String, nullable=True)       # Reddit/Discord post URL
    source_content = Column(Text, nullable=True)     # Original post text
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="leads")
    business = relationship("Business")
    pitches = relationship("Pitch", back_populates="lead")
    outreach = relationship("OutreachLog", back_populates="lead")
    project = relationship("Project", back_populates="lead", uselist=False)
