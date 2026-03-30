import {BASE_WS} from './api';

type Listener = (data: any) => void;

class WSService {
  private ws: WebSocket | null = null;
  private userId: string = '';
  private listeners: Map<string, Listener[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  connect(userId: string) {
    this.userId = userId;
    this.shouldReconnect = true;
    this._createSocket();
  }

  private _createSocket() {
    const url = `${BASE_WS}/ws/${this.userId}`;
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] Connected:', url);
        this.send({type: 'ping'});
      };

      this.ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          const type: string = data.type || '';
          const list = this.listeners.get(type) || [];
          list.forEach(fn => fn(data));
          // Also fire "message" listeners for all messages
          const allListeners = this.listeners.get('*') || [];
          allListeners.forEach(fn => fn(data));
        } catch (_e) {
          // ignore parse errors
        }
      };

      this.ws.onerror = () => {
        console.log('[WS] Error');
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => this._createSocket(), 3000);
        }
      };
    } catch (e) {
      console.log('[WS] Failed to create socket:', e);
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendLocation(riderId: string, lat: number, lng: number) {
    this.send({type: 'location', rider_id: riderId, lat, lng});
  }

  on(type: string, listener: Listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  off(type: string, listener: Listener) {
    const list = this.listeners.get(type) || [];
    const filtered = list.filter(fn => fn !== listener);
    this.listeners.set(type, filtered);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

const wsService = new WSService();
export default wsService;
