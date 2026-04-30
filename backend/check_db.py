import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

conn = psycopg2.connect(db_url)
cursor = conn.cursor()
cursor.execute("SELECT id, metro_station, destination_area, status, available_seats FROM rides;")
rows = cursor.fetchall()
print("All rides:")
for r in rows:
    print(r)
conn.close()
