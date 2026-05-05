from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Ride, RideStatus, Booking
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/rides", tags=["Rides"])

METRO_STATIONS = {
    "purple_line": [
        "Challaghatta","Kengeri Bus Terminal","Kengeri","Pattanagere",
        "Pantharapalya Nayandahalli","Mysuru Road","Deepanjalinagar","Attiguppe",
        "Vijayanagar","Hosahalli","Vidhana Soudha","Sir M Visveshwaraya Central College",
        "Nadaprabhu Kempegowda Majestic","Magadi Road","Shivajinagar","Cubbon Park",
        "Mahatma Gandhi Road","Trinity","Halasuru","Indiranagar","Swami Vivekananda Road",
        "Baiyappanahalli","Krishnarajapura","Benniganahalli","Hoodi","Garudacharapalya",
        "Seetharampalya","Kundalahalli","Nallurhalli","Sri Sathya Sai Hospital",
        "Pattanduru Agrahara","Kadugodi Tree Park","Hopefarm Channasandra","Whitefield Kadugodi"
    ],
    "green_line": [
        "Madavara","Chikkabidarakallu","Manjunathanagar","Nagasandra","Dasarahalli",
        "Jalahalli","Peenya Industry","Peenya","Goraguntepalya","Yeshwanthpur",
        "Sandal Soap Factory","Mahalakshmi","Rajajinagar","Kuvempu Road","Srirampura",
        "Mantri Square Sampige Road","Nadaprabhu Kempegowda Interchange","Chickpete",
        "Krishna Rajendra Market","National College","Lalbagh","South End Circle",
        "Jayanagar","Rashtreeya Vidyalaya Road","Banashankari","JP Nagar","Yelachenahalli",
        "Konanakunte Cross","Doddakallasandra","Vajarahalli","Thalaghattapura","Silk Institute"
    ],
    "yellow_line": [
        "Rashtreeya Vidyalaya Road","Ragigudda","Jayadeva Hospital","BTM Layout",
        "Central Silk Board","Bommanahalli","Hongasandra","Kudlu Gate","Singasandra",
        "Hosa Road","Beratena Agrahara","Electronic City","Konappana Agrahara",
        "Huskur Road","Hebbagodi","Delta Electronics Bommasandra"
    ]
}

DESTINATION_AREAS = {
    "Challaghatta": ["Kengeri Satellite Town", "Rajarajeshwari Nagar", "Mysuru Road shops", "Uttarahalli", "Subramanyapura", "Kengeri Bus Terminal", "Jnanabharathi Campus"],
    "Kengeri Bus Terminal": ["Kengeri Market", "Uttarahalli Cross", "Subramanyapura", "Rajarajeshwari Nagar", "Mysuru Road NH", "JP Nagar 7th Phase", "Nagarabhavi"],
    "Kengeri": ["Kengeri Satellite Town", "JP Nagar 7th Phase", "Rajarajeshwari Nagar", "Uttarahalli", "Konanakunte", "Subramanyapura", "Mysore Road NH"],
    "Pattanagere": ["Vijayanagar 4th Stage", "Nagarbhavi", "Nagarabhavi Circle", "Chord Road", "Rajajinagar West", "Kamakshipalya", "BDA Layout Vijayanagar"],
    "Pantharapalya Nayandahalli": ["Nayandahalli Market", "Kamakshipalya", "Chord Road Vijayanagar", "Vijayanagar Main Road", "Magadi Road", "BDA Complex", "Rajajinagar 6th Block"],
    "Mysuru Road": ["Vijayanagar", "Attiguppe", "Deepanjalinagar", "Magadi Road", "Chord Road", "Kamakshipalya", "Rajajinagar 4th Block"],
    "Deepanjalinagar": ["Vijayanagar 2nd Stage", "Rajajinagar", "Attiguppe", "Chord Road", "Magadi Cross", "BDA Vijayanagar", "Subramanyanagar"],
    "Attiguppe": ["Vijayanagar 1st Stage", "Rajajinagar", "Chord Road", "Magadi Road", "Kamakshipalya", "Subramanyanagar", "BDA Complex"],
    "Vijayanagar": ["Vijayanagar 4th Block", "Rajajinagar", "Chord Road", "Basaveshwaranagar", "RPC Layout", "Mahalakshmi Layout", "Nagarbhavi"],
    "Hosahalli": ["Rajajinagar", "Vijayanagar", "Mahalakshmi Layout", "Basaveshwaranagar", "Chord Road", "Nagarbhavi", "Subramanyanagar"],
    "Vidhana Soudha": ["Seshadripuram", "Malleshwaram 8th Cross", "Palace Road", "Sadashivanagar", "Vasanth Nagar", "Raj Mahal Vilas", "Jayamahal"],
    "Sir M Visveshwaraya Central College": ["Gandhinagar", "City Market", "Chickpete", "Avenue Road", "KG Road", "Majestic Bus Stand", "Cottonpete"],
    "Nadaprabhu Kempegowda Majestic": ["KSR City Railway Station", "Chickpete", "Gandhi Nagar", "Anand Rao Circle", "City Market", "Yeshwanthpur", "Majestic Bus Terminal"],
    "Magadi Road": ["Nagarbhavi", "Kamakshipalya", "Chalukya Nagar", "Nagasandra", "Kamakshipalya Cross", "BDA Layout", "Subramanyanagar"],
    "Shivajinagar": ["Frazer Town", "Cox Town", "Cleveland Town", "Halasuru", "Ulsoor", "Lingarajapuram", "Kammanahalli"],
    "Cubbon Park": ["Raj Bhavan Road", "Vittal Mallya Road", "Lavelle Road", "Kasturba Road", "Museum Road", "Infantry Road", "Cunningham Road"],
    "Mahatma Gandhi Road": ["Brigade Road", "Commercial Street", "Residency Road", "Church Street", "UB City", "Cunningham Road", "Richmond Town"],
    "Trinity": ["Richmond Road", "Langford Town", "Ashok Nagar", "Residency Road", "St Marks Road", "Shivajinagar", "Lavelle Road"],
    "Halasuru": ["Ulsoor Lake area", "Cleveland Town", "Richmond Town", "Frazer Town", "Cox Town", "Shivajinagar", "MG Road"],
    "Indiranagar": ["100 Feet Road", "CMH Road", "Domlur", "HAL 2nd Stage", "Defence Colony", "Old Airport Road", "Koramangala 5th Block"],
    "Swami Vivekananda Road": ["Indiranagar 12th Main", "Ulsoor", "Banaswadi", "Kammanahalli", "Jeevanbhima Nagar", "Halasuru", "CMH Road"],
    "Baiyappanahalli": ["Marathahalli", "Whitefield", "ITPL / TechPark", "Ramamurthy Nagar", "KR Puram", "ISRO Layout", "Banaswadi"],
    "Krishnarajapura": ["KR Puram Market", "Banaswadi", "Hoodi", "Marathahalli", "Old Madras Road", "Tin Factory", "Ramamurthy Nagar"],
    "Benniganahalli": ["Hoodi", "KR Puram", "Old Madras Road", "Tin Factory", "Banaswadi", "Indiranagar", "Mahadevapura"],
    "Hoodi": ["Hoodi Circle", "Mahadevapura", "Whitefield", "ITPL", "KR Puram", "Varthur Road", "Marathahalli"],
    "Garudacharapalya": ["Mahadevapura", "Whitefield Main Road", "ITPL", "Varthur Road", "Hoodi", "KR Puram", "Doddanekundi"],
    "Seetharampalya": ["Whitefield", "Mahadevapura", "Varthur Road", "ITPL", "Hoodi Cross", "Doddanekundi", "Sadaramangala"],
    "Kundalahalli": ["Brookefield", "Whitefield", "ITPL Road", "Mahadevapura", "Varthur", "Marathahalli", "Doddanekundi"],
    "Nallurhalli": ["Whitefield Road", "ITPL", "Brookefield", "Marathahalli", "Varthur", "Hope Farm", "Kadugodi"],
    "Sri Sathya Sai Hospital": ["Whitefield", "Kadugodi", "ITPL", "Hoskote Road", "Hope Farm", "Varthur Road", "Brookefield"],
    "Pattanduru Agrahara": ["Kadugodi", "Whitefield", "Hope Farm Junction", "ITPL Road", "Hoskote Road", "Varthur Road", "Brookefield"],
    "Kadugodi Tree Park": ["Kadugodi Market", "Hope Farm", "Whitefield", "ITPL", "Hoskote Road", "Varthur", "Sadaramangala"],
    "Hopefarm Channasandra": ["Channasandra", "Kadugodi", "Whitefield", "ITPL", "Hoskote Road", "Hope Farm Junction", "Sadaramangala"],
    "Whitefield Kadugodi": ["ITPL / Tech Park", "Whitefield Main Road", "Varthur Road", "Hoskote Road", "Hope Farm", "Kadugodi Market", "EPIP Zone"],
    "Madavara": ["BIEC Exhibition Centre", "Chikkabanavara", "Dabaspet", "Anchepalya", "Huskur", "Makali", "Madavara Village"],
    "Chikkabidarakallu": ["Jindal Naturecure Institute", "Anchipalya", "Hesaraghatta Main Road", "T. Dasarahalli", "Nagasandra Village", "Chikkabidarakallu Outer Area 6", "Chikkabidarakallu Outer Area 7"],
    "Manjunathanagar": ["Bagalagunte", "T. Dasarahalli", "Nagasandra", "HMT Layout", "Rukmini Nagar", "Manjunathanagar Outer Area 6", "Manjunathanagar Outer Area 7"],
    "Nagasandra": ["Nildhi Layout", "Nelamangala Road", "Peenya 2nd Stage", "Bagalagunte", "Hesaraghatta Road", "Nagasandra Outer Area 6", "Nagasandra Outer Area 7"],
    "Dasarahalli": ["T. Dasarahalli Market", "Peenya Industrial Area", "Chokkasandra", "SM Road", "Kalyan Nagar", "Dasarahalli Outer Area 6", "Dasarahalli Outer Area 7"],
    "Jalahalli": ["Jalahalli Village", "BEL Circle", "HMT Watch Factory", "Jalahalli Cross", "Mutyalamma Nagar", "Jalahalli Outer Area 6", "Jalahalli Outer Area 7"],
    "Peenya Industry": ["Peenya 1st Stage", "Peenya 2nd Stage", "KIADB Industrial Area", "TVS Cross", "NTTF Peenya", "Peenya Industry Outer Area 6", "Peenya Industry Outer Area 7"],
    "Peenya": ["Peenya 3rd Phase", "Kanteerava Studio", "Goraguntepalya", "Yeshwanthpur Industrial Suburb", "Srigandhada Kaval", "Peenya Outer Area 6", "Peenya Outer Area 7"],
    "Goraguntepalya": ["Taj Yeshwanthpur", "RMC Yard", "Yeshwanthpur Railway Station", "Laggere", "MEI Layout", "Goraguntepalya Outer Area 6", "Goraguntepalya Outer Area 7"],
    "Yeshwanthpur": ["Yeshwanthpur Market", "Mathikere", "Triveni Road", "BK Nagar", "IISc Campus", "Yeshwanthpur Outer Area 6", "Yeshwanthpur Outer Area 7"],
    "Sandal Soap Factory": ["Orion Mall", "Brigade Gateway", "Subramanyanagar", "Malleswaram 18th Cross", "Rajajinagar 1st Block", "Sandal Soap Factory Outer Area 6", "Sandal Soap Factory Outer Area 7"],
    "Mahalakshmi": ["Mahalakshmi Layout", "Kurubarahalli", "Kamala Nagar", "Rajajinagar 2nd Block", "ISKCON Temple", "Mahalakshmi Outer Area 6", "Mahalakshmi Outer Area 7"],
    "Rajajinagar": ["Rajajinagar 3rd Block", "Rajajinagar 5th Block", "Bashyam Circle", "Navarang Theatre", "Srirampura", "Rajajinagar Outer Area 6", "Rajajinagar Outer Area 7"],
    "Kuvempu Road": ["Gayathri Nagar", "Prakash Nagar", "Srirampura", "Malleshwaram West", "Devaiah Park", "Kuvempu Road Outer Area 6", "Kuvempu Road Outer Area 7"],
    "Srirampura": ["Srirampura Market", "Ramachandrapura", "LN Puram", "Malleswaram 8th Cross", "Obalappa Garden", "Srirampura Outer Area 6", "Srirampura Outer Area 7"],
    "Mantri Square Sampige Road": ["Mantri Mall", "Malleswaram Circle", "Sheshadripuram", "Link Road", "Central Park", "Mantri Square Sampige Road Outer Area 6", "Mantri Square Sampige Road Outer Area 7"],
    "Nadaprabhu Kempegowda Interchange": ["Majestic Bus Station", "KSR Bengaluru Station", "Gandhinagar", "Cottonpet", "Anand Rao Circle", "Nadaprabhu Kempegowda Interchange Outer Area 6", "Nadaprabhu Kempegowda Interchange Outer Area 7"],
    "Chickpete": ["Chickpete Market", "Avenue Road", "BVK Iyengar Road", "KR Market", "Kalasipalyam", "Chickpete Outer Area 6", "Chickpete Outer Area 7"],
    "Krishna Rajendra Market": ["Victoria Hospital", "KIMS", "Chamarajapet", "Tipu Sultan Palace", "Kalasipalyam Bus Stand", "Krishna Rajendra Market Outer Area 6", "Krishna Rajendra Market Outer Area 7"],
    "National College": ["Basavanagudi", "Gandhi Bazaar", "VV Puram", "Bugle Rock", "Srinagar", "National College Outer Area 6", "National College Outer Area 7"],
    "Lalbagh": ["Lalbagh Botanical Garden", "Jayanagar 1st Block", "Siddapura", "Wilson Garden", "Ashoka Pillar", "Lalbagh Outer Area 6", "Lalbagh Outer Area 7"],
    "South End Circle": ["Jayanagar 2nd Block", "Jayanagar 3rd Block", "NR Colony", "Tata Silk Farm", "Basavanagudi", "South End Circle Outer Area 6", "South End Circle Outer Area 7"],
    "Jayanagar": ["Jayanagar 4th Block", "Jayanagar 5th Block", "Pattabhirama Nagar", "Tilak Nagar", "East End", "Jayanagar Outer Area 6", "Jayanagar Outer Area 7"],
    "Rashtreeya Vidyalaya Road": ["Jayanagar 8th Block", "Banashankari 2nd Stage", "Sangam Circle", "Kanakapura Road", "Jedimara", "Rashtreeya Vidyalaya Road Outer Area 6", "Rashtreeya Vidyalaya Road Outer Area 7"],
    "Banashankari": ["BSK 2nd Stage", "BSK 3rd Stage", "Kumaraswamy Layout", "Padmanabhanagar", "Kadirenahalli", "Deve Gowda Petrol Bunk", "Banashankari Outer Area 7"],
    "JP Nagar": ["JP Nagar 1st Phase", "JP Nagar 6th Phase", "Sarakki Market", "Puttenahalli", "LIC Colony", "JP Nagar Outer Area 6", "JP Nagar Outer Area 7"],
    "Yelachenahalli": ["Yelachenahalli Village", "Kashinagar", "Jaraganahalli", "Chunchgatta Main Road", "Sarakki Lake", "Yelachenahalli Outer Area 6", "Yelachenahalli Outer Area 7"],
    "Konanakunte Cross": ["Konanakunte Village", "Chunchgatta", "Vasanthapura", "Gokulam Apartments", "RBI Layout", "Konanakunte Cross Outer Area 6", "Konanakunte Cross Outer Area 7"],
    "Doddakallasandra": ["Gubbalala", "Mantri Arena Mall", "Bikasipura", "ISRO Layout", "Prarthana School Area", "Doddakallasandra Outer Area 6", "Doddakallasandra Outer Area 7"],
    "Vajarahalli": ["Vajarahalli Village", "KSIT College", "Raghuvanahalli", "BDA Anjanapura 11th Block", "Holiday Village", "Vajarahalli Outer Area 6", "Vajarahalli Outer Area 7"],
    "Thalaghattapura": ["Vakil Garden City", "Vajramuneeswara Temple", "Narayana Nagar", "BDA Layout Thalaghattapura", "Gubbalala Gate", "Thalaghattapura Outer Area 6", "Thalaghattapura Outer Area 7"],
    "Silk Institute": ["Art of Living Center", "Udayapura", "Kaggalipura", "Tarahunise", "Salhunase", "NICE Road Junction", "Silk Institute Outer Area 7"],
    "Ragigudda": ["Ragigudda Temple area", "Jayanagar 9th Block", "BTM Layout 2nd Stage", "JP Nagar 1st Phase", "Banashankari", "Arekere", "Sarakki Market"],
    "Jayadeva Hospital": ["Jayadeva Hospital", "Bannerghatta Road", "Koramangala 4th Block", "BTM Layout", "HSR Layout 1st Sector", "JP Nagar 3rd Phase", "Dollars Colony"],
    "BTM Layout": ["BTM Layout 2nd Stage", "Koramangala 5th Block", "HSR Layout", "Madiwala", "Arekere", "Mangammanapalya", "Silk Board Junction"],
    "Central Silk Board": ["Silk Board Junction", "HSR Layout", "Bommanahalli", "Koramangala 8th Block", "BTM 2nd Stage", "Madivala", "Electronic City Phase 1"],
    "Bommanahalli": ["Bommanahalli Market", "HSR Layout 5th Sector", "Hongasandra", "Madivala", "Harlur Road", "Kudlu Gate", "Mico Layout"],
    "Hongasandra": ["Hongasandra Gate", "Bommanahalli", "Kudlu Gate", "Electronic City Phase 2", "Singasandra", "Mico Layout", "HSR Layout 6th Sector"],
    "Kudlu Gate": ["Kudlu Gate junction", "Electronic City Phase 1", "Singasandra", "Hongasandra", "Harlur Road", "Sarjapur Road", "Mico Layout"],
    "Singasandra": ["Singasandra Main Road", "Kudlu Gate", "Electronic City Phase 2", "Hongasandra", "Begur Road", "Harlur Road", "Neeladri Road"],
    "Hosa Road": ["Hosa Road junction", "Electronic City Phase 1", "Begur Road", "Singasandra", "Neeladri Road", "Neelankanahalli", "Hulimavu"],
    "Beratena Agrahara": ["Electronic City Phase 2", "Hosa Road", "Neeladri Road", "Neelankanahalli", "Begur Road", "Kudlu Gate", "Singasandra"],
    "Electronic City": ["Infosys Campus", "Electronic City Phase 1", "Electronic City Phase 2", "Wipro Campus", "Tech Mahindra", "Neeladri Road", "Konappana Agrahara"],
    "Konappana Agrahara": ["Electronic City Phase 2", "Infosys Foundation layout", "Neeladri Road", "Hosa Road", "Hebbagodi Industrial", "Bommasandra", "Marsur Road"],
    "Huskur Road": ["Hebbagodi Industrial Area", "Bommasandra", "Electronic City Phase 2", "Neeladri Road", "Marsur Road", "Veerasandra", "Attibele Road"],
    "Hebbagodi": ["Hebbagodi Industrial Estate", "Bommasandra Industrial Area", "Veerasandra", "Attibele Road", "Neeladri Nagar", "Marsur Road", "Anekal Road"],
    "Delta Electronics Bommasandra": ["Bommasandra Industrial Area", "Hebbagodi", "Attibele Road", "Jigani Road", "Veerasandra", "Anekal", "Marsur Road"],
}

class RideCreate(BaseModel):
    rider_id: str
    metro_station: str
    destination_area: str
    exact_destination: str
    seats_needed: int = 1
    vehicle_type: Optional[str] = "auto"
    fare_per_person: Optional[float] = 75.0
    scheduled_time: Optional[datetime] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    is_carpool: Optional[bool] = False

class RideResponse(BaseModel):
    id: int
    rider_id: str
    metro_station: str
    destination: str
    destination_area: str
    seats_needed: int
    vehicle_type: Optional[str]
    fare_per_person: Optional[float]
    status: str
    created_at: datetime
    is_carpool: Optional[bool] = False
    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    ride_id: int
    rider_id: str
    seats: int = 1
    pickup_station: str
    drop_station: str

@router.get("/stations")
def get_stations():
    return METRO_STATIONS

@router.get("/areas/{station_name}")
def get_areas(station_name: str):
    areas = DESTINATION_AREAS.get(station_name, ["Koramangala","Indiranagar","HSR Layout","BTM Layout","Whitefield","Electronic City","Hebbal","Yelahanka"])
    return {"areas": areas}

@router.post("/", response_model=RideResponse)
def create_ride(ride: RideCreate, db: Session = Depends(get_db)):
    # Auto-create user if not exists (avoids FK constraint failure)
    from app.models.models import User
    existing_user = db.query(User).filter(User.id == ride.rider_id).first()
    if not existing_user:
        new_user = User(id=ride.rider_id, email=f"{ride.rider_id}@metromile.app", full_name="User")
        db.add(new_user)
        try:
            db.commit()
        except Exception:
            db.rollback()

    try:
        new_ride = Ride(
            rider_id=ride.rider_id, metro_station=ride.metro_station,
            destination=ride.exact_destination, destination_area=ride.destination_area,
            seats_needed=ride.seats_needed, scheduled_time=ride.scheduled_time,
            pickup_lat=ride.pickup_lat, pickup_lng=ride.pickup_lng,
            vehicle_type=ride.vehicle_type,
            fare_per_person=ride.fare_per_person,
            is_carpool=ride.is_carpool
        )
        db.add(new_ride)
        db.commit()
        db.refresh(new_ride)
        return new_ride
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[RideResponse])
def list_rides(station: Optional[str] = None, area: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Ride).filter(Ride.status == RideStatus.pending)
    if station:
        query = query.filter(Ride.metro_station == station)
    if area:
        query = query.filter(Ride.destination_area == area)
    return query.all()

@router.get("/user/{rider_id}", response_model=List[RideResponse])
def get_user_rides(rider_id: str, db: Session = Depends(get_db)):
    return db.query(Ride).filter(Ride.rider_id == rider_id).all()

@router.get("/{ride_id}", response_model=RideResponse)
def get_ride(ride_id: int, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride

@router.post("/book")
def book_ride(booking: BookingCreate, db: Session = Depends(get_db)):
    try:
        # Use with_for_update() for pessimistic locking to prevent double booking
        ride = db.query(Ride).with_for_update().filter(Ride.id == booking.ride_id).first()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")
            
        if ride.status not in [RideStatus.pending, RideStatus.active]:
            raise HTTPException(status_code=400, detail="Ride is no longer active")
            
        if booking.seats > ride.available_seats:
            raise HTTPException(status_code=400, detail="Not enough seats available")
            
        # Atomically decrement available seats
        ride.available_seats -= booking.seats
        
        new_booking = Booking(
            ride_id=booking.ride_id, 
            rider_id=booking.rider_id, 
            seats=booking.seats,
            pickup_station=booking.pickup_station,
            drop_station=booking.drop_station,
            status="confirmed"
        )
        db.add(new_booking)
        db.commit()
        db.refresh(new_booking)
        return {"message": "Booked!", "booking_id": new_booking.id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Booking failed due to high demand, please try again")

@router.get("/{ride_id}/passengers")
def get_ride_passengers(ride_id: int, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    bookings = db.query(Booking).filter(Booking.ride_id == ride_id, Booking.status == "confirmed").all()
    
    grouped_passengers = {}
    for b in bookings:
        if b.drop_station not in grouped_passengers:
            grouped_passengers[b.drop_station] = []
        grouped_passengers[b.drop_station].append({
            "rider_id": b.rider_id,
            "seats": b.seats,
            "pickup_station": b.pickup_station,
            "booking_id": b.id
        })
        
    return {
        "ride_id": ride_id,
        "available_seats": ride.available_seats,
        "total_bookings": len(bookings),
        "grouped_by_drop_station": grouped_passengers
    }

@router.put("/{ride_id}/complete")
def complete_ride(ride_id: int, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Not found")
    ride.status = RideStatus.completed
    ride.completed_at = datetime.utcnow()
    db.commit()
    return {"message": "Ride completed"}

# ============================================
# OTP VERIFICATION ENDPOINTS (NEW)
# ============================================

class OTPVerify(BaseModel):
    """Schema for OTP verification"""
    otp: str

@router.put("/{ride_id}/mark-arrived")
def mark_driver_arrived(ride_id: int, db: Session = Depends(get_db)):
    """
    Driver marks as arrived at pickup location
    This triggers OTP verification flow for rider
    """
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status != RideStatus.accepted:
        raise HTTPException(status_code=400, detail="Ride must be in accepted status")
    
    ride.driver_arrived = True
    db.commit()
    
    return {
        "message": "Marked as arrived",
        "ride_id": ride.id,
        "otp": ride.ride_otp
    }

@router.post("/{ride_id}/verify-otp")
def verify_ride_otp(ride_id: int, data: OTPVerify, db: Session = Depends(get_db)):
    """
    Verify OTP entered by rider
    Called when rider enters OTP shown by driver
    """
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if not ride.ride_otp:
        raise HTTPException(status_code=400, detail="No OTP generated for this ride")
    
    if ride.otp_verified:
        return {"message": "OTP already verified", "verified": True}
    
    # Verify OTP
    if data.otp.strip() != ride.ride_otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    ride.otp_verified = True
    db.commit()
    
    return {
        "message": "OTP verified successfully",
        "verified": True,
        "ride_id": ride.id
    }

@router.put("/{ride_id}/start")
def start_ride(ride_id: int, db: Session = Depends(get_db)):
    """
    Start the ride after OTP verification
    Changes status from 'accepted' to 'active'
    """
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status != RideStatus.accepted:
        raise HTTPException(status_code=400, detail="Ride must be in accepted status")
    
    if not ride.otp_verified:
        raise HTTPException(status_code=400, detail="OTP must be verified before starting ride")
    
    ride.status = RideStatus.active
    db.commit()
    
    return {
        "message": "Ride started",
        "ride_id": ride.id,
        "status": ride.status
    }
