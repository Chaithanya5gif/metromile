from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    rider = "rider"
    driver = "driver"

class RideStatus(str, enum.Enum):
    pending = "pending"
    matched = "matched"
    accepted = "accepted"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.rider)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    rides = relationship("Ride", back_populates="rider", foreign_keys="Ride.rider_id")
    driver_profile = relationship("Driver", back_populates="user", uselist=False)
    ratings_given = relationship("Rating", back_populates="rater", foreign_keys="Rating.rater_id")

class Driver(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    vehicle_number = Column(String, nullable=False)
    vehicle_type = Column(String, default="auto")
    is_available = Column(Boolean, default=True)
    is_busy = Column(Boolean, default=False)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    total_earnings = Column(Float, default=0.0)
    rating = Column(Float, default=5.0)
    total_rides = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="driver_profile")
    rides = relationship("Ride", back_populates="driver")

class Ride(Base):
    __tablename__ = "rides"
    id = Column(Integer, primary_key=True, autoincrement=True)
    rider_id = Column(String, ForeignKey("users.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    metro_station = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    destination_area = Column(String, nullable=False)
    seats_needed = Column(Integer, default=1)
    fare_per_person = Column(Float, nullable=True)
    total_fare = Column(Float, nullable=True)
    status = Column(Enum(RideStatus), default=RideStatus.pending)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    pickup_lat = Column(Float, nullable=True)
    pickup_lng = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    rider = relationship("User", back_populates="rides", foreign_keys=[rider_id])
    driver = relationship("Driver", back_populates="rides")
    bookings = relationship("Booking", back_populates="ride")
    payment = relationship("Payment", back_populates="ride", uselist=False)
    rating = relationship("Rating", back_populates="ride", uselist=False)

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ride_id = Column(Integer, ForeignKey("rides.id"))
    rider_id = Column(String, ForeignKey("users.id"))
    seats = Column(Integer, default=1)
    fare_share = Column(Float, nullable=True)
    payment_status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ride = relationship("Ride", back_populates="bookings")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ride_id = Column(Integer, ForeignKey("rides.id"), unique=True)
    rider_id = Column(String, ForeignKey("users.id"))
    amount = Column(Float, nullable=False)
    method = Column(String, nullable=True)
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ride = relationship("Ride", back_populates="payment")

class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ride_id = Column(Integer, ForeignKey("rides.id"), unique=True)
    rater_id = Column(String, ForeignKey("users.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    stars = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ride = relationship("Ride", back_populates="rating")
    rater = relationship("User", back_populates="ratings_given", foreign_keys=[rater_id])
