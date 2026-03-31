from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import models
from app.routes import users, rides, drivers, matching, payments, ratings, websocket

# Database tables should be created via migrations or manual init in production
# models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="MetroMile API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(rides.router)
app.include_router(drivers.router)
app.include_router(matching.router)
app.include_router(payments.router)
app.include_router(ratings.router)
app.include_router(websocket.router)

@app.get("/")
def root():
    return {"message": "MetroMile API v2.0 is running!", "status": "ok"}
