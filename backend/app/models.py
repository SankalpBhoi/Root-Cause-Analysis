"""Database table. Important columns are separate (easy to search),
the full form (root causes, CAPA, 5 Whys...) is stored as JSON."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from .database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)
    deviation_id = Column(String(100))
    title = Column(String(300))
    product_name = Column(String(200))
    batch_number = Column(String(100))
    severity = Column(String(50))
    status = Column(String(50), default="Saved")
    data = Column(JSON)  # the whole RCA form
    created_at = Column(DateTime, default=datetime.utcnow)
