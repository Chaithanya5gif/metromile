from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Ride, RideStatus
from typing import List
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import math

router = APIRouter(prefix="/match", tags=["Matching"])

class RideResponse(BaseModel):
    id: int
    rider_id: str
    metro_station: str
    destination: str
    destination_area: str
    seats_needed: int
    fare_per_person: Optional[float]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

@router.get("/{station}/{area}", response_model=List[RideResponse])
def find_matches(station: str, area: str, db: Session = Depends(get_db)):
    matches = db.query(Ride).filter(
        Ride.metro_station == station,
        Ride.destination_area == area,
        Ride.status == RideStatus.pending
    ).order_by(Ride.created_at).limit(4).all()
    return matches
