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
    # Purple Line
    "Challaghatta": ["Kengeri Satellite Town","Rajarajeshwari Nagar","Mysuru Road shops","Uttarahalli","Subramanyapura","Kengeri Bus Terminal","Jnanabharathi Campus"],
    "Kengeri Bus Terminal": ["Kengeri Market","Uttarahalli Cross","Subramanyapura","Rajarajeshwari Nagar","Mysuru Road NH","JP Nagar 7th Phase","Nagarabhavi"],
    "Kengeri": ["Kengeri Satellite Town","JP Nagar 7th Phase","Rajarajeshwari Nagar","Uttarahalli","Konanakunte","Subramanyapura","Mysore Road NH"],
    "Pattanagere": ["Vijayanagar 4th Stage","Nagarbhavi","Nagarabhavi Circle","Chord Road","Rajajinagar West","Kamakshipalya","BDA Layout Vijayanagar"],
    "Pantharapalya Nayandahalli": ["Nayandahalli Market","Kamakshipalya","Chord Road Vijayanagar","Vijayanagar Main Road","Magadi Road","BDA Complex","Rajajinagar 6th Block"],
    "Mysuru Road": ["Vijayanagar","Attiguppe","Deepanjalinagar","Magadi Road","Chord Road","Kamakshipalya","Rajajinagar 4th Block"],
    "Deepanjalinagar": ["Vijayanagar 2nd Stage","Rajajinagar","Attiguppe","Chord Road","Magadi Cross","BDA Vijayanagar","Subramanyanagar"],
    "Attiguppe": ["Vijayanagar 1st Stage","Rajajinagar","Chord Road","Magadi Road","Kamakshipalya","Subramanyanagar","BDA Complex"],
    "Vijayanagar": ["Vijayanagar 4th Block","Rajajinagar","Chord Road","Basaveshwaranagar","RPC Layout","Mahalakshmi Layout","Nagarbhavi"],
    "Hosahalli": ["Rajajinagar","Vijayanagar","Mahalakshmi Layout","Basaveshwaranagar","Chord Road","Nagarbhavi","Subramanyanagar"],
    "Vidhana Soudha": ["Seshadripuram","Malleshwaram 8th Cross","Palace Road","Sadashivanagar","Vasanth Nagar","Raj Mahal Vilas","Jayamahal"],
    "Sir M Visveshwaraya Central College": ["Gandhinagar","City Market","Chickpete","Avenue Road","KG Road","Majestic Bus Stand","Cottonpete"],
    "Nadaprabhu Kempegowda Majestic": ["KSR City Railway Station","Chickpete","Gandhi Nagar","Anand Rao Circle","City Market","Yeshwanthpur","Majestic Bus Terminal"],
    "Magadi Road": ["Nagarbhavi","Kamakshipalya","Chalukya Nagar","Nagasandra","Kamakshipalya Cross","BDA Layout","Subramanyanagar"],
    "Shivajinagar": ["Frazer Town","Cox Town","Cleveland Town","Halasuru","Ulsoor","Lingarajapuram","Kammanahalli"],
    "Cubbon Park": ["Raj Bhavan Road","Vittal Mallya Road","Lavelle Road","Kasturba Road","Museum Road","Infantry Road","Cunningham Road"],
    "Mahatma Gandhi Road": ["Brigade Road","Commercial Street","Residency Road","Church Street","UB City","Cunningham Road","Richmond Town"],
    "Trinity": ["Richmond Road","Langford Town","Ashok Nagar","Residency Road","St Marks Road","Shivajinagar","Lavelle Road"],
    "Halasuru": ["Ulsoor Lake area","Cleveland Town","Richmond Town","Frazer Town","Cox Town","Shivajinagar","MG Road"],
    "Indiranagar": ["100 Feet Road","CMH Road","Domlur","HAL 2nd Stage","Defence Colony","Old Airport Road","Koramangala 5th Block"],
    "Swami Vivekananda Road": ["Indiranagar 12th Main","Ulsoor","Banaswadi","Kammanahalli","Jeevanbhima Nagar","Halasuru","CMH Road"],
    "Baiyappanahalli": ["Marathahalli","Whitefield","ITPL / TechPark","Ramamurthy Nagar","KR Puram","ISRO Layout","Banaswadi"],
    "Krishnarajapura": ["KR Puram Market","Banaswadi","Hoodi","Marathahalli","Old Madras Road","Tin Factory","Ramamurthy Nagar"],
    "Benniganahalli": ["Hoodi","KR Puram","Old Madras Road","Tin Factory","Banaswadi","Indiranagar","Mahadevapura"],
    "Hoodi": ["Hoodi Circle","Mahadevapura","Whitefield","ITPL","KR Puram","Varthur Road","Marathahalli"],
    "Garudacharapalya": ["Mahadevapura","Whitefield Main Road","ITPL","Varthur Road","Hoodi","KR Puram","Doddanekundi"],
    "Seetharampalya": ["Whitefield","Mahadevapura","Varthur Road","ITPL","Hoodi Cross","Doddanekundi","Sadaramangala"],
    "Kundalahalli": ["Brookefield","Whitefield","ITPL Road","Mahadevapura","Varthur","Marathahalli","Doddanekundi"],
    "Nallurhalli": ["Whitefield Road","ITPL","Brookefield","Marathahalli","Varthur","Hope Farm","Kadugodi"],
    "Sri Sathya Sai Hospital": ["Whitefield","Kadugodi","ITPL","Hoskote Road","Hope Farm","Varthur Road","Brookefield"],
    "Pattanduru Agrahara": ["Kadugodi","Whitefield","Hope Farm Junction","ITPL Road","Hoskote Road","Varthur Road","Brookefield"],
    "Kadugodi Tree Park": ["Kadugodi Market","Hope Farm","Whitefield","ITPL","Hoskote Road","Varthur","Sadaramangala"],
    "Hopefarm Channasandra": ["Channasandra","Kadugodi","Whitefield","ITPL","Hoskote Road","Hope Farm Junction","Sadaramangala"],
    "Whitefield Kadugodi": ["ITPL / Tech Park","Whitefield Main Road","Varthur Road","Hoskote Road","Hope Farm","Kadugodi Market","EPIP Zone"],
    # Green Line
    "Madavara": ["Hesaraghatta Main Road","Chikkabanavara","Dabaspet","BIEC Exhibition Centre","Peenya 2nd Stage","Soladevanahalli","Tumkur Road NH"],
    "Chikkabidarakallu": ["Hesaraghatta Road","Soladevanahalli","Chikkabanavara","Peenya 2nd Stage","BEL Colony","Jalahalli Cross","Nagarabhavi"],
    "Manjunathanagar": ["Nagasandra","BEL Circle","Jalahalli","Rajajinagar West","Peenya","HMT Layout","Chord Road"],
    "Nagasandra": ["Hesaraghatta Main Road","Chikkabanavara","Jalahalli Cross","BEL Colony","Peenya 2nd Stage","Soladevanahalli","Dabaspet Road"],
    "Dasarahalli": ["Peenya Industrial Area","BEL Circle","Jalahalli","HMT Layout","Chord Road","Rajajinagar West","Yeshwanthpur Industrial"],
    "Jalahalli": ["BEL Campus","AMS Colony","Jalahalli East","Yeshwanthpur","Peenya 1st Stage","DRDO Township","Air Force Station area"],
    "Peenya Industry": ["Peenya Industrial Estate","KIADB Industrial Area","Tumkur Road","HMT Works","Nelamangala Road","Sathnur","Yeshwanthpur goods yard"],
    "Peenya": ["Peenya 2nd Stage","Yeshwanthpur","Jalahalli Cross","BEL Circle","Rajajinagar","Chord Road area","Nagasandra"],
    "Goraguntepalya": ["Rajajinagar 6th Block","Chord Road","BDA Complex","Basaveshwaranagar","Vijayanagar 4th Stage","Mahalakshmi Layout","Nagarbhavi"],
    "Yeshwanthpur": ["Yeshwanthpur Market","Rajajinagar","Tumkur Road NH","Peenya Industrial","Hebbal flyover area","Malleshwaram West","Saneguruvanahalli"],
    "Sandal Soap Factory": ["Laggere","Rajajinagar West","Nagarbhavi","Mahalakshmi Layout","Chord Road","BDA Complex","Goraguntepalya"],
    "Mahalakshmi": ["Rajajinagar 1st Block","3rd Block","BDA Complex Rajajinagar","Chord Road shops","Mahalakshmi Layout","Basaveshwaranagar","Nagarbhavi Circle"],
    "Rajajinagar": ["Rajajinagar 4th Block","5th Block","Chord Road","Basaveshwaranagar","RPC Layout","Vijayanagar","Nagarbhavi"],
    "Kuvempu Road": ["Sadashivanagar","Palace Guttahalli","Gayathri Nagar","Vyalikaval","Rajmahal Vilas","Subramanyanagar","Shivajinagar"],
    "Srirampura": ["Malleshwaram 18th Cross","Vyalikaval","Subramanyanagar","Mariyappanapalya","Sheshadripuram","Palace Road","Rajajinagar"],
    "Mantri Square Sampige Road": ["Malleshwaram market","Margosa Road","15th Cross Malleshwaram","Vyalikaval","Navarang area","Sadashivanagar","Chord Road"],
    "Nadaprabhu Kempegowda Interchange": ["Majestic","KSR City Rly Station","Chickpete","Gandhi Nagar","City Market","Anand Rao Circle","Yeshwanthpur"],
    "Chickpete": ["Chickpete market","Avenue Road","OTC Road","Nagarathpete","KR Market","Gavipuram","BSK 1st Stage"],
    "Krishna Rajendra Market": ["KR Market","City Market","Upparpete","Cubbonpet","Cottonpete","Jayanagar 4th Block","Gavipuram"],
    "National College": ["Basavanagudi","Gandhi Bazaar","DVG Road","Chamrajpet","Jayanagar 3rd Block","NR Colony","Sajjan Rao Circle"],
    "Lalbagh": ["Jayanagar 4th Block","Lalbagh West Gate","BTM Layout 1st Stage","Wilson Garden","Tavarekere","Suddagunte Palya","Jayanagar 9th Block"],
    "South End Circle": ["Jayanagar 3rd Block","4th T Block","JP Nagar 1st Phase","Banashankari 1st Stage","Kanakapura Road","BTM 1st Stage","Sarakki Market"],
    "Jayanagar": ["JP Nagar 2nd Phase","BTM Layout","Bannerghatta Road","Koramangala 1st Block","HSR Layout","Arekere","Gottigere"],
    "Rashtreeya Vidyalaya Road": ["JP Nagar 3rd Phase","Banashankari 2nd Stage","Kanakapura Road","BTM Layout","Jayanagar","Gottigere","Uttarahalli"],
    "Banashankari": ["Banashankari 3rd Stage","Kathriguppe","BSK 2nd Stage","Uttarahalli Cross","Kanakapura Road shops","Kalena Agrahara","Chord Road Banashankari"],
    "JP Nagar": ["JP Nagar 6th Phase","7th Phase","Bannerghatta Road","Arekere Gate","Gottigere","Electronic City flyover","Hongasandra"],
    "Yelachenahalli": ["JP Nagar 7th Phase","Konanakunte Cross","Uttarahalli","Subramanyapura","Kanakapura Main Road","Gottigere","Bannerghatta Road end"],
    "Konanakunte Cross": ["Konanakunte","JP Nagar 7th Phase","Uttarahalli","Subramanyapura","Kanakapura Road","Gottigere","Anjanapura"],
    "Doddakallasandra": ["Kanakapura Road","Konanakunte","Anjanapura","Subramanyapura","Uttarahalli","Gottigere","Silk Board area"],
    "Vajarahalli": ["Kanakapura Road","Anjanapura","Talaghattapura","Doddakallasandra","Gottigere","JP Nagar 9th Phase","Silk Board"],
    "Thalaghattapura": ["Kanakapura Road","Anjanapura","Talaghattapura village","JP Nagar 9th Phase","Silk Board","Gottigere","Vasanthapura"],
    "Silk Institute": ["Anjanapura","Talaghattapura","Kanakapura Road","JP Nagar 9th Phase","Gottigere","Vasanthapura","Silk Board"],
    # Yellow Line
    "Ragigudda": ["Ragigudda Temple area","Jayanagar 9th Block","BTM Layout 2nd Stage","JP Nagar 1st Phase","Banashankari","Arekere","Sarakki Market"],
    "Jayadeva Hospital": ["Jayadeva Hospital","Bannerghatta Road","Koramangala 4th Block","BTM Layout","HSR Layout 1st Sector","JP Nagar 3rd Phase","Dollars Colony"],
    "BTM Layout": ["BTM Layout 2nd Stage","Koramangala 5th Block","HSR Layout","Madiwala","Arekere","Mangammanapalya","Silk Board Junction"],
    "Central Silk Board": ["Silk Board Junction","HSR Layout","Bommanahalli","Koramangala 8th Block","BTM 2nd Stage","Madivala","Electronic City Phase 1"],
    "Bommanahalli": ["Bommanahalli Market","HSR Layout 5th Sector","Hongasandra","Madivala","Harlur Road","Kudlu Gate","Mico Layout"],
    "Hongasandra": ["Hongasandra Gate","Bommanahalli","Kudlu Gate","Electronic City Phase 2","Singasandra","Mico Layout","HSR Layout 6th Sector"],
    "Kudlu Gate": ["Kudlu Gate junction","Electronic City Phase 1","Singasandra","Hongasandra","Harlur Road","Sarjapur Road","Mico Layout"],
    "Singasandra": ["Singasandra Main Road","Kudlu Gate","Electronic City Phase 2","Hongasandra","Begur Road","Harlur Road","Neeladri Road"],
    "Hosa Road": ["Hosa Road junction","Electronic City Phase 1","Begur Road","Singasandra","Neeladri Road","Neelankanahalli","Hulimavu"],
    "Beratena Agrahara": ["Electronic City Phase 2","Hosa Road","Neeladri Road","Neelankanahalli","Begur Road","Kudlu Gate","Singasandra"],
    "Electronic City": ["Infosys Campus","Electronic City Phase 1","Electronic City Phase 2","Wipro Campus","Tech Mahindra","Neeladri Road","Konappana Agrahara"],
    "Konappana Agrahara": ["Electronic City Phase 2","Infosys Foundation layout","Neeladri Road","Hosa Road","Hebbagodi Industrial","Bommasandra","Marsur Road"],
    "Huskur Road": ["Hebbagodi Industrial Area","Bommasandra","Electronic City Phase 2","Neeladri Road","Marsur Road","Veerasandra","Attibele Road"],
    "Hebbagodi": ["Hebbagodi Industrial Estate","Bommasandra Industrial Area","Veerasandra","Attibele Road","Neeladri Nagar","Marsur Road","Anekal Road"],
    "Delta Electronics Bommasandra": ["Bommasandra Industrial Area","Hebbagodi","Attibele Road","Jigani Road","Veerasandra","Anekal","Marsur Road"],
}

class RideCreate(BaseModel):
    rider_id: str
    metro_station: str
    destination_area: str
    exact_destination: str
    seats_needed: int = 1
    scheduled_time: Optional[datetime] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None

class RideResponse(BaseModel):
    id: int
    rider_id: str
    metro_station: str
    destination: str
    destination_area: str
    seats_needed: int
    fare_per_person: Optional[float]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    ride_id: int
    rider_id: str
    seats: int = 1

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
        new_user = User(id=ride.rider_id, email=f"{ride.rider_id}@metromile.app", full_name="Rider")
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
            fare_per_person=75.0
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
    ride = db.query(Ride).filter(Ride.id == booking.ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    new_booking = Booking(ride_id=booking.ride_id, rider_id=booking.rider_id, seats=booking.seats)
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return {"message": "Booked!", "booking_id": new_booking.id}

@router.put("/{ride_id}/complete")
def complete_ride(ride_id: int, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Not found")
    ride.status = RideStatus.completed
    ride.completed_at = datetime.utcnow()
    db.commit()
    return {"message": "Ride completed"}
