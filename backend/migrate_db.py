import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("No DATABASE_URL found.")
    exit(1)

print(f"Connecting to {db_url}")

# psycopg2 expects postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE rides ADD COLUMN available_seats INTEGER DEFAULT 4;")
        print("Added available_seats to rides.")
    except psycopg2.errors.DuplicateColumn:
        print("available_seats already exists.")
    except Exception as e:
        print(f"Error adding available_seats: {e}")

    try:
        cursor.execute("ALTER TABLE rides ADD COLUMN vehicle_type VARCHAR DEFAULT 'auto';")
        print("Added vehicle_type to rides.")
    except psycopg2.errors.DuplicateColumn:
        print("vehicle_type already exists.")
    except Exception as e:
        print(f"Error adding vehicle_type: {e}")

    try:
        cursor.execute("ALTER TABLE rides ADD COLUMN fare_per_person FLOAT DEFAULT 75.0;")
        print("Added fare_per_person to rides.")
    except psycopg2.errors.DuplicateColumn:
        print("fare_per_person already exists.")
    except Exception as e:
        print(f"Error adding fare_per_person: {e}")

    try:
        cursor.execute("ALTER TABLE bookings ADD COLUMN pickup_station VARCHAR;")
        print("Added pickup_station to bookings.")
    except psycopg2.errors.DuplicateColumn:
        print("pickup_station already exists.")
    except Exception as e:
        print(f"Error adding pickup_station: {e}")

    try:
        cursor.execute("ALTER TABLE bookings ADD COLUMN drop_station VARCHAR;")
        print("Added drop_station to bookings.")
    except psycopg2.errors.DuplicateColumn:
        print("drop_station already exists.")
    except Exception as e:
        print(f"Error adding drop_station: {e}")
        
    try:
        cursor.execute("ALTER TABLE bookings ADD COLUMN status VARCHAR DEFAULT 'confirmed';")
        print("Added status to bookings.")
    except psycopg2.errors.DuplicateColumn:
        print("status already exists.")
    except Exception as e:
        print(f"Error adding status: {e}")

    print("Migration complete!")
    conn.close()

except Exception as e:
    print(f"Connection failed: {e}")
