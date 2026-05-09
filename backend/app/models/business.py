from sqlalchemy import Column, String, Float, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_place_id = Column(String, unique=True, nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    review_count = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    cached_at = Column(DateTime(timezone=True), server_default=func.now())
