from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Rating, Driver, Ride
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/ratings", tags=["Ratings"])

class RatingCreate(BaseModel):
    ride_id: int
    rater_id: str
    driver_id: int
    stars: int
    comment: Optional[str] = None

@router.post("/")
def create_rating(data: RatingCreate, db: Session = Depends(get_db)):
    existing = db.query(Rating).filter(Rating.ride_id == data.ride_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already rated")
    if not 1 <= data.stars <= 5:
        raise HTTPException(status_code=400, detail="Stars must be 1-5")
    rating = Rating(
        ride_id=data.ride_id, rater_id=data.rater_id,
        driver_id=data.driver_id, stars=data.stars, comment=data.comment
    )
    db.add(rating)
    driver = db.query(Driver).filter(Driver.id == data.driver_id).first()
    if driver:
        all_ratings = db.query(Rating).filter(Rating.driver_id == data.driver_id).all()
        total = sum(r.stars for r in all_ratings) + data.stars
        driver.rating = round(total / (len(all_ratings) + 1), 1)
    db.commit()
    return {"message": "Rating submitted!", "new_rating": driver.rating if driver else None}

@router.get("/driver/{driver_id}")
def get_driver_rating(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Not found")
    return {"rating": driver.rating, "total_rides": driver.total_rides}
