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
    # Optional verification fields
    license_number: Optional[str] = None
    vehicle_rc_number: Optional[str] = None
    aadhar_number: Optional[str] = None

class DriverResponse(BaseModel):
    id: int
    user_id: str
    vehicle_number: str
    is_available: bool
    is_busy: bool
    total_earnings: float
    rating: float
    total_rides: int
    # Verification fields
    license_number: Optional[str] = None
    license_verified: bool = False
    verification_status: str = "pending"
    class Config:
        from_attributes = True

class LocationUpdate(BaseModel):
    lat: float
    lng: float

class VerificationUpdate(BaseModel):
    """Schema for updating driver verification details"""
    license_number: Optional[str] = None
    vehicle_rc_number: Optional[str] = None
    aadhar_number: Optional[str] = None

@router.post("/register", response_model=DriverResponse)
def register_driver(data: DriverRegister, db: Session = Depends(get_db)):
    existing = db.query(Driver).filter(Driver.user_id == data.user_id).first()
    if existing:
        return existing
        
    # Auto-create user if missing
    existing_user = db.query(User).filter(User.id == data.user_id).first()
    if not existing_user:
        new_user = User(id=data.user_id, email=f"{data.user_id}@metromile.app", full_name="Metro Driver", role="driver")
        db.add(new_user)
        try:
            db.commit()
        except:
            db.rollback()

    driver = Driver(
        user_id=data.user_id, 
        vehicle_number=data.vehicle_number, 
        vehicle_type=data.vehicle_type,
        license_number=data.license_number,
        vehicle_rc_number=data.vehicle_rc_number,
        aadhar_number=data.aadhar_number,
        verification_status="pending" if data.license_number else "unverified"
    )
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
import random

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
    
    # Generate 4-digit OTP
    otp = str(random.randint(1000, 9999))
    
    ride.driver_id = driver.id
    ride.status = RideStatus.accepted
    ride.ride_otp = otp
    ride.otp_verified = False
    ride.driver_arrived = False
    driver.is_busy = True
    driver.is_available = False
    db.commit()

    # Broadcast to rider with OTP info
    await manager.send_to(ride.rider_id, {
        "type": "ride_accepted",
        "ride_id": ride.id,
        "driver_id": driver.id,
        "driver_name": driver.user.full_name if driver.user and driver.user.full_name not in ["Metro Driver", "Driver"] else f"Driver {driver.id}",
        "vehicle_number": driver.vehicle_number,
        "vehicle_type": driver.vehicle_type,
        "rating": driver.rating,
        "otp": otp
    })
    
    return {
        "message": "Ride accepted!",
        "otp": otp
    }

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

# ============================================
# DRIVER VERIFICATION ENDPOINTS (NEW)
# ============================================

@router.put("/{user_id}/verification")
def update_verification(user_id: str, data: VerificationUpdate, db: Session = Depends(get_db)):
    """
    Update driver verification details
    Allows drivers to submit license, RC, and Aadhar for verification
    """
    driver = db.query(Driver).filter(Driver.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Update verification fields if provided
    if data.license_number:
        driver.license_number = data.license_number
    if data.vehicle_rc_number:
        driver.vehicle_rc_number = data.vehicle_rc_number
    if data.aadhar_number:
        driver.aadhar_number = data.aadhar_number
    
    # Set status to pending if any verification data provided
    if data.license_number or data.vehicle_rc_number or data.aadhar_number:
        driver.verification_status = "pending"
    
    db.commit()
    db.refresh(driver)
    return {
        "message": "Verification details updated",
        "verification_status": driver.verification_status,
        "license_verified": driver.license_verified
    }

@router.get("/{user_id}/verification")
def get_verification_status(user_id: str, db: Session = Depends(get_db)):
    """
    Get driver verification status
    Returns verification details and status
    """
    driver = db.query(Driver).filter(Driver.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return {
        "verification_status": driver.verification_status,
        "license_verified": driver.license_verified,
        "has_license": driver.license_number is not None,
        "has_rc": driver.vehicle_rc_number is not None,
        "has_aadhar": driver.aadhar_number is not None,
        "verified_at": driver.verified_at
    }

@router.put("/admin/verify/{driver_id}")
def admin_verify_driver(
    driver_id: int, 
    approved: bool, 
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to approve/reject driver verification
    In production, this would require admin authentication
    """
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    if approved:
        driver.verification_status = "verified"
        driver.license_verified = True
        driver.verified_at = datetime.utcnow()
    else:
        driver.verification_status = "rejected"
        driver.license_verified = False
    
    if notes:
        driver.verification_notes = notes
    
    db.commit()
    db.refresh(driver)
    
    return {
        "message": f"Driver {'verified' if approved else 'rejected'}",
        "driver_id": driver.id,
        "verification_status": driver.verification_status
    }
