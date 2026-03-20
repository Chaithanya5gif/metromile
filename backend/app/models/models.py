from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    rider = "rider"
    driver = "driver"

class RideStatus(str, enum.Enum):
    waiting = "waiting"
    matched = "matched"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"

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

class Driver(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    vehicle_number = Column(String, nullable=False)
    vehicle_type = Column(String, default="auto")
    is_available = Column(Boolean, default=True)
    total_earnings = Column(Float, default=0.0)
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
    status = Column(Enum(RideStatus), default=RideStatus.waiting)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    rider = relationship("User", back_populates="rides", foreign_keys=[rider_id])
    driver = relationship("Driver", back_populates="rides")
    bookings = relationship("Booking", back_populates="ride")

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