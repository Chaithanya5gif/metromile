from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Driver, Ride, RideStatus, User
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import asyncio

router = APIRouter(prefix="/drivers", tags=["Drivers"])

class DriverRegister(BaseModel):
    user_id: str
    vehicle_number: str
    vehicle_type: Optional[str] = "auto"

class DriverResponse(BaseModel):
    id: int
    user_id: str
    vehicle_number: str
    is_available: bool
    is_busy: bool
    total_earnings: float
    rating: float
    total_rides: int
    class Config:
        from_attributes = True

class LocationUpdate(BaseModel):
    lat: float
    lng: float

@router.post("/register", response_model=DriverResponse)
def register_driver(data: DriverRegister, db: Session = Depends(get_db)):
    existing = db.query(Driver).filter(Driver.user_id == data.user_id).first()
    if existing:
        return existing
        
    # Auto-create user if missing
    existing_user = db.query(User).filter(User.id == data.user_id).first()
    if not existing_user:
        new_user = User(id=data.user_id, email=f"{data.user_id}@metromile.app", full_name="Driver", role="driver")
        db.add(new_user)
        try:
            db.commit()
        except:
            db.rollback()

    driver = Driver(user_id=data.user_id, vehicle_number=data.vehicle_number, vehicle_type=data.vehicle_type)
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver

@router.get("/{user_id}", response_model=DriverResponse)
def get_driver(user_id: str, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver

@router.put("/{user_id}/availability")
def toggle_availability(user_id: str, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.is_available = not driver.is_available
    db.commit()
    return {"is_available": driver.is_available}

@router.put("/{user_id}/location")
def update_location(user_id: str, location: LocationUpdate, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.current_lat = location.lat
    driver.current_lng = location.lng
    db.commit()
    return {"message": "Location updated"}

@router.get("/{user_id}/rides")
def get_driver_rides(user_id: str, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    rides = db.query(Ride).filter(
        Ride.metro_station != None,
        Ride.status == RideStatus.pending
    ).order_by(Ride.created_at.desc()).limit(10).all()
    return rides

from app.routes.websocket import manager

@router.put("/{user_id}/accept/{ride_id}")
async def accept_ride(user_id: str, ride_id: int, db: Session = Depends(get_db)):
    if user_id.isdigit():
        driver = db.query(Driver).filter(Driver.id == int(user_id)).first()
    else:
        driver = db.query(Driver).filter(Driver.user_id == user_id).first()
        
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    print(f"DEBUG accept_ride: ride_id={ride_id}, status={ride.status}")
    if ride.status != RideStatus.pending and ride.status != "pending":
        raise HTTPException(status_code=400, detail="Ride no longer available")
    
    ride.driver_id = driver.id
    ride.status = RideStatus.accepted
    driver.is_busy = True
    driver.is_available = False
    db.commit()

    # Broadcast to rider
    await manager.send_to(ride.rider_id, {
        "type": "ride_accepted",
        "ride_id": ride.id,
        "driver_id": driver.id,
        "driver_name": f"Driver {driver.id}",
        "vehicle_number": driver.vehicle_number,
        "vehicle_type": driver.vehicle_type,
        "rating": driver.rating
    })
    
    return {"message": "Ride accepted!"}

@router.put("/{user_id}/complete/{ride_id}")
async def driver_complete_ride(user_id: str, ride_id: int, db: Session = Depends(get_db)):
    if user_id.isdigit():
        driver = db.query(Driver).filter(Driver.id == int(user_id)).first()
    else:
        driver = db.query(Driver).filter(Driver.user_id == user_id).first()
        
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not driver or not ride:
        raise HTTPException(status_code=404, detail="Not found")
    
    ride.status = RideStatus.completed
    ride.completed_at = datetime.utcnow()
    driver.is_busy = False
    driver.is_available = True
    driver.total_rides += 1
    if ride.total_fare:
        driver.total_earnings += ride.total_fare
    db.commit()

    # Broadcast to rider
    await manager.send_to(ride.rider_id, {
        "type": "ride_completed",
        "ride_id": ride.id
    })

    return {"message": "Ride completed!"}
