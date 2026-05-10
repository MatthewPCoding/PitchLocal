from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), unique=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_paid = Column(Boolean, default=True)
    rate = Column(Float, nullable=True)
    rate_type = Column(String, nullable=True)  # hourly, fixed
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    duration_weeks = Column(Float, nullable=True)
    status = Column(String, default="active")  # active, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="project", lazy="selectin")
