"""
MetroMile Backend API
=====================
FastAPI-based REST API for the MetroMile carpooling application.

Features:
- User authentication and role management (Rider/Driver)
- Real-time ride matching and booking with carpool support
- WebSocket-based live GPS tracking
- Payment processing with Razorpay integration
- Driver rating and review system

Tech Stack:
- FastAPI (async Python web framework)
- PostgreSQL (relational database via SQLAlchemy ORM)
- WebSocket (real-time bidirectional communication)
- Pydantic (request/response validation)

Author: MetroMile Team
Version: 2.0.0
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import models
from app.routes import users, rides, drivers, matching, payments, ratings, websocket

# Database tables should be created via migrations or manual init in production
# Uncomment below for auto-creation in development (not recommended for production)
# models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI application with metadata for auto-generated docs
app = FastAPI(
    title="MetroMile API",
    version="2.0.0",
    description="Carpooling service connecting Bengaluru metro commuters with shared rides"
)

# Configure CORS (Cross-Origin Resource Sharing) middleware
# Allows the React Native mobile app to make requests to this API
# Note: allow_origins=["*"] is permissive for development
# TODO: In production, restrict to specific mobile app origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Accept requests from any origin
    allow_credentials=True,     # Allow cookies and auth headers
    allow_methods=["*"],        # Allow all HTTP methods (GET, POST, PUT, DELETE)
    allow_headers=["*"],        # Allow all request headers
)

# Register API route modules
# Each router handles a specific domain of the application
app.include_router(users.router)       # User management and authentication
app.include_router(rides.router)       # Ride creation, booking, and management
app.include_router(drivers.router)     # Driver registration and ride acceptance
app.include_router(matching.router)    # Carpool matching algorithm
app.include_router(payments.router)    # Payment processing and fare calculation
app.include_router(ratings.router)     # Driver rating and review system
app.include_router(websocket.router)   # Real-time WebSocket communication

@app.get("/")
def root():
    """
    Health check endpoint
    Returns API status and version information
    """
    return {"message": "MetroMile API v2.0 is running!", "status": "ok"}
