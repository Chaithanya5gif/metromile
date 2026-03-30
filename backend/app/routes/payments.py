from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Payment, Ride, PaymentStatus, Driver
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter(prefix="/payments", tags=["Payments"])

FARE_PER_KM = 15
BASE_FARE = 30

class PaymentCreate(BaseModel):
    ride_id: int
    rider_id: str
    amount: float
    method: Optional[str] = "upi"

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/create")
def create_payment(data: PaymentCreate, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == data.ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    payment = Payment(
        ride_id=data.ride_id,
        rider_id=data.rider_id,
        amount=data.amount,
        method=data.method,
        status=PaymentStatus.pending
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return {
        "payment_id": payment.id,
        "amount": data.amount,
        "currency": "INR",
        "key": os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder"),
        "message": "Payment order created"
    }

@router.post("/verify/{payment_id}")
def verify_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = PaymentStatus.paid
    ride = db.query(Ride).filter(Ride.id == payment.ride_id).first()
    if ride and ride.driver_id:
        driver = db.query(Driver).filter(Driver.id == ride.driver_id).first()
        if driver:
            driver.total_earnings += payment.amount
    db.commit()
    return {"message": "Payment verified!", "status": "paid"}

@router.get("/ride/{ride_id}")
def get_ride_payment(ride_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.ride_id == ride_id).first()
    if not payment:
        return {"status": "no_payment"}
    return {"status": payment.status, "amount": payment.amount, "method": payment.method}

@router.get("/calculate/{ride_id}")
def calculate_fare(ride_id: int, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    total = BASE_FARE + (FARE_PER_KM * 3)
    per_person = round(total / max(ride.seats_needed, 1), 2)
    return {"total_fare": total, "per_person": per_person, "seats": ride.seats_needed}
