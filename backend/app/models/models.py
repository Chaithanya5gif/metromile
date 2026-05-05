"""
Database Models Module
======================
Defines all SQLAlchemy ORM models for the MetroMile application.

Tables:
1. users - User accounts (riders and drivers)
2. drivers - Driver-specific information and stats
3. rides - Ride requests and bookings
4. bookings - Individual seat bookings within rides (carpool)
5. payments - Payment records with Razorpay integration
6. ratings - Driver ratings and reviews

Enums:
- UserRole: rider, driver
- RideStatus: pending, matched, accepted, active, completed, cancelled
- PaymentStatus: pending, paid, failed

Relationships:
- User 1:1 Driver (optional)
- User 1:N Rides (as rider)
- Driver 1:N Rides (as driver)
- Ride 1:N Bookings
- Ride 1:1 Payment
- Ride 1:1 Rating
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

# Enums for type-safe status fields
class UserRole(str, enum.Enum):
    """User role enumeration - determines app interface and permissions"""
    rider = "rider"
    driver = "driver"

class RideStatus(str, enum.Enum):
    """
    Ride lifecycle status enumeration
    
    Flow: pending -> matched -> accepted -> active -> completed/cancelled
    - pending: Ride created, waiting for driver
    - matched: Co-riders found (carpool)
    - accepted: Driver accepted the ride
    - active: Ride in progress
    - completed: Ride finished successfully
    - cancelled: Ride cancelled by rider or system
    """
    pending = "pending"
    matched = "matched"
    accepted = "accepted"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"

class PaymentStatus(str, enum.Enum):
    """Payment transaction status"""
    pending = "pending"
    paid = "paid"
    failed = "failed"

class User(Base):
    """
    User Model - Represents all app users (both riders and drivers)
    
    Key Features:
    - String ID from Clerk authentication (not auto-increment)
    - Role-based access (rider or driver)
    - One-to-one relationship with Driver profile (optional)
    - One-to-many relationship with Rides
    """
    __tablename__ = "users"
    id = Column(String, primary_key=True)  # Clerk user ID (string format)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.rider)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    rides = relationship("Ride", back_populates="rider", foreign_keys="Ride.rider_id")
    driver_profile = relationship("Driver", back_populates="user", uselist=False)
    ratings_given = relationship("Rating", back_populates="rater", foreign_keys="Rating.rater_id")

class Driver(Base):
    """
    Driver Model - Extended profile for users with driver role
    
    Key Features:
    - One-to-one with User (via unique user_id)
    - Real-time GPS location tracking (current_lat, current_lng)
    - Availability status (is_available, is_busy)
    - Performance metrics (rating, total_rides, total_earnings)
    - Verification system (license, documents, approval status)
    """
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    vehicle_number = Column(String, nullable=False)
    vehicle_type = Column(String, default="auto")  # auto, cab, bike
    is_available = Column(Boolean, default=True)   # Accepting new rides
    is_busy = Column(Boolean, default=False)       # Currently on a ride
    current_lat = Column(Float, nullable=True)     # Real-time GPS latitude
    current_lng = Column(Float, nullable=True)     # Real-time GPS longitude
    total_earnings = Column(Float, default=0.0)    # Lifetime earnings
    rating = Column(Float, default=5.0)            # Average rating (1-5)
    total_rides = Column(Integer, default=0)       # Completed rides count
    
    # Verification fields (MVP: optional, Production: required)
    license_number = Column(String, nullable=True)        # Driving license number
    license_verified = Column(Boolean, default=False)     # License verification status
    vehicle_rc_number = Column(String, nullable=True)     # Vehicle registration
    aadhar_number = Column(String, nullable=True)         # Aadhar for KYC
    verification_status = Column(String, default="pending")  # pending, verified, rejected
    verified_at = Column(DateTime(timezone=True), nullable=True)  # Verification timestamp
    verification_notes = Column(Text, nullable=True)      # Admin notes
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="driver_profile")
    rides = relationship("Ride", back_populates="driver")

class Ride(Base):
    """
    Ride Model - Central entity connecting riders, drivers, and bookings
    
    Lifecycle:
    1. Rider creates ride (status=pending)
    2. System finds co-riders (status=matched, optional)
    3. Driver accepts (status=accepted)
    4. Ride starts (status=active)
    5. Ride completes (status=completed) or cancelled
    
    Key Features:
    - Metro station as pickup point
    - Destination area for drop-off
    - Carpool support (multiple bookings per ride)
    - Fare calculation (per person and total)
    """
    __tablename__ = "rides"
    id = Column(Integer, primary_key=True, autoincrement=True)
    rider_id = Column(String, ForeignKey("users.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    metro_station = Column(String, nullable=False)      # Pickup: Metro station name
    destination = Column(String, nullable=False)        # Drop: Exact destination
    destination_area = Column(String, nullable=False)   # Drop: General area
    seats_needed = Column(Integer, default=1)           # Number of passengers
    vehicle_type = Column(String, default="auto")
    fare_per_person = Column(Float, nullable=True)      # Individual fare
    total_fare = Column(Float, nullable=True)           # Total ride fare
    available_seats = Column(Integer, default=4)        # Remaining seats for carpool
    status = Column(Enum(RideStatus), default=RideStatus.pending)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    pickup_lat = Column(Float, nullable=True)           # Metro station coordinates
    pickup_lng = Column(Float, nullable=True)
    is_carpool = Column(Boolean, default=False)         # Shared ride flag
    ride_otp = Column(String, nullable=True)            # 4-digit OTP for pickup verification
    otp_verified = Column(Boolean, default=False)       # OTP verification status
    driver_arrived = Column(Boolean, default=False)     # Driver marked as arrived
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    rider = relationship("User", back_populates="rides", foreign_keys=[rider_id])
    driver = relationship("Driver", back_populates="rides")
    bookings = relationship("Booking", back_populates="ride")
    payment = relationship("Payment", back_populates="ride", uselist=False)
    rating = relationship("Rating", back_populates="ride", uselist=False)

class Booking(Base):
    """
    Booking Model - Individual seat bookings within a shared ride
    
    Enables carpool functionality where multiple riders book seats
    on the same ride going to the same destination area.
    """
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ride_id = Column(Integer, ForeignKey("rides.id"))
    rider_id = Column(String, ForeignKey("users.id"))
    seats = Column(Integer, default=1)
    pickup_station = Column(String, nullable=True)
    drop_station = Column(String, nullable=True)
    fare_share = Column(Float, nullable=True)           # This rider's fare portion
    payment_status = Column(String, default="pending")
    status = Column(String, default="confirmed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ride = relationship("Ride", back_populates="bookings")

class Payment(Base):
    """
    Payment Model - Payment records with Razorpay integration
    
    Key Features:
    - One-to-one with Ride
    - Razorpay order and payment ID tracking
    - Multiple payment methods (UPI, Card, Cash)
    - Driver earnings updated on payment verification
    """
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ride_id = Column(Integer, ForeignKey("rides.id"), unique=True)
    rider_id = Column(String, ForeignKey("users.id"))
    amount = Column(Float, nullable=False)
    method = Column(String, nullable=True)              # upi, card, cash
    razorpay_order_id = Column(String, nullable=True)   # Razorpay order reference
    razorpay_payment_id = Column(String, nullable=True) # Razorpay payment reference
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ride = relationship("Ride", back_populates="payment")

class Rating(Base):
    """
    Rating Model - Driver ratings and reviews
    
    Key Features:
    - One rating per ride (unique constraint on ride_id)
    - Star rating (1-5 scale)
    - Optional text comment
    - Updates driver's average rating on submission
    """
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ride_id = Column(Integer, ForeignKey("rides.id"), unique=True)
    rater_id = Column(String, ForeignKey("users.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    stars = Column(Integer, nullable=False)             # 1-5 rating
    comment = Column(Text, nullable=True)               # Optional review text
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ride = relationship("Ride", back_populates="rating")
    rater = relationship("User", back_populates="ratings_given", foreign_keys=[rater_id])
