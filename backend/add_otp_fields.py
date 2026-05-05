"""
Database Migration: Add OTP fields to Ride table
=================================================
Adds ride_otp, otp_verified, and driver_arrived fields for pickup verification

Run this script to update the database schema:
    python add_otp_fields.py
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env")
    exit(1)

# Fix postgres:// to postgresql:// for SQLAlchemy 1.4+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def migrate():
    """Add OTP fields to rides table"""
    print("🔄 Adding OTP fields to rides table...")
    
    with engine.connect() as conn:
        try:
            # Add ride_otp field (4-digit string)
            conn.execute(text("""
                ALTER TABLE rides 
                ADD COLUMN IF NOT EXISTS ride_otp VARCHAR(4) NULL
            """))
            print("✅ Added ride_otp field")
            
            # Add otp_verified field (boolean)
            conn.execute(text("""
                ALTER TABLE rides 
                ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE
            """))
            print("✅ Added otp_verified field")
            
            # Add driver_arrived field (boolean)
            conn.execute(text("""
                ALTER TABLE rides 
                ADD COLUMN IF NOT EXISTS driver_arrived BOOLEAN DEFAULT FALSE
            """))
            print("✅ Added driver_arrived field")
            
            conn.commit()
            print("\n🎉 Migration completed successfully!")
            print("\nNew fields added:")
            print("  - ride_otp: 4-digit OTP for pickup verification")
            print("  - otp_verified: Boolean flag for OTP verification status")
            print("  - driver_arrived: Boolean flag for driver arrival status")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()

if __name__ == "__main__":
    migrate()
