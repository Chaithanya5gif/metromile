from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send_to(self, user_id: str, message: dict):
        if user_id in self.active:
            try:
                await self.active[user_id].send_text(json.dumps(message))
            except:
                self.disconnect(user_id)

    async def broadcast(self, message: dict):
        for ws in list(self.active.values()):
            try:
                await ws.send_text(json.dumps(message))
            except:
                pass

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "location":
                await manager.broadcast({
                    "type": "driver_location",
                    "user_id": user_id,
                    "lat": msg.get("lat"),
                    "lng": msg.get("lng")
                })
            elif msg.get("type") == "ride_request":
                await manager.broadcast({
                    "type": "new_ride_request",
                    "ride_id": msg.get("ride_id"),
                    "station": msg.get("station"),
                    "area": msg.get("area")
                })
    except WebSocketDisconnect:
        manager.disconnect(user_id)
