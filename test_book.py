import requests

url = "http://127.0.0.1:8000/rides/"
payload = {
    "rider_id": "test_user_from_curl",
    "metro_station": "Indiranagar",
    "destination": "CMH Road",
    "destination_area": "CMH Road",
    "seats_needed": 1
}

try:
    response = requests.post(url, json=payload)
    print("STATUS:", response.status_code)
    print("BODY:", response.text)
except Exception as e:
    print("ERROR:", e)
