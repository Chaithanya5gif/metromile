"""
Database Configuration Module
==============================
Configures SQLAlchemy engine, session factory, and base model class.

Key Components:
- Engine: Database connection pool manager
- SessionLocal: Factory for creating database sessions
- Base: Declarative base class for all ORM models
- get_db(): Dependency injection function for FastAPI routes

Database: PostgreSQL (production) / SQLite (fallback)
ORM: SQLAlchemy 2.0
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Fix for older postgres:// URLs (Heroku, Render compatibility)
# SQLAlchemy 1.4+ requires postgresql:// prefix
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create database engine with fallback to SQLite for development
if not DATABASE_URL:
    # Fallback: Use SQLite if no PostgreSQL URL provided
    # Allows app to start even without database configuration
    engine = create_engine("sqlite:///./temp.db")
else:
    # Production: Use PostgreSQL from environment variable
    engine = create_engine(DATABASE_URL)

# Session factory: Creates new database sessions for each request
# autocommit=False: Explicit commit required (transaction safety)
# autoflush=False: Manual control over when changes are flushed to DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
# All database models inherit from this to enable SQLAlchemy mapping
Base = declarative_base()

def get_db():
    """
    Database session dependency for FastAPI routes
    
    Provides a database session to route handlers via dependency injection.
    Ensures the session is properly closed after request completion.
    
    Usage in routes:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            # Use db here
            pass
    
    Yields:
        Session: SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db  # Provide session to route handler
    finally:
        db.close()  # Always close session, even on errors
