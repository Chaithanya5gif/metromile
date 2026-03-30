import axios from 'axios';

// Android emulator: http://10.0.2.2:8000
// iOS simulator:    http://localhost:8000
const BASE_URL = 'http://10.0.2.2:8000';
const BASE_WS = 'ws://10.0.2.2:8000';

export {BASE_WS};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {'Content-Type': 'application/json'},
});

// ─── AUTH TOKEN INJECTION ─────────────────────────────────────────────────
let _authToken = '';
export const setAuthToken = (token: string) => {
  _authToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// ─── USERS ────────────────────────────────────────────────────────────────
export const createOrUpdateUser = (data: {
  id?: string;
  email: string;
  full_name: string;
  phone?: string;
  role?: string;
}) => api.post('/users/', data).then(r => r.data);

export const getUser = (userId: string) =>
  api.get(`/users/${userId}`).then(r => r.data);

export const updateUserRole = (userId: string, role: string) =>
  api.put(`/users/${userId}/role?role=${role}`).then(r => r.data);

// ─── RIDES ────────────────────────────────────────────────────────────────
export const getStations = () => api.get('/rides/stations').then(r => r.data);

export const getAreas = (station: string) =>
  api.get(`/rides/areas/${encodeURIComponent(station)}`).then(r => r.data);

export const createRide = (data: {
  rider_id: string;
  metro_station: string;
  destination: string;
  destination_area: string;
  seats_needed: number;
  scheduled_time?: string;
}) => api.post('/rides/', data).then(r => r.data);

export const getRide = (rideId: string) =>
  api.get(`/rides/${rideId}`).then(r => r.data);

export const getUserRides = (userId: string) =>
  api.get(`/rides/user/${userId}`).then(r => r.data);

export const completeRide = (rideId: string) =>
  api.post(`/rides/${rideId}/complete`).then(r => r.data);

export const cancelRide = (rideId: string) =>
  api.delete(`/rides/${rideId}/cancel`).then(r => r.data);

// ─── MATCHING ─────────────────────────────────────────────────────────────
export const findMatches = (station: string, area: string) =>
  api
    .get(`/match/${encodeURIComponent(station)}/${encodeURIComponent(area)}`)
    .then(r => r.data);

// ─── DRIVERS ──────────────────────────────────────────────────────────────
export const registerDriver = (data: {
  user_id: string;
  vehicle_number: string;
  vehicle_type?: string;
}) => api.post('/drivers/register', data).then(r => r.data);

export const getDriverByUser = (userId: string) =>
  api.get(`/drivers/user/${userId}`).then(r => r.data);

export const getDriver = (driverId: string) =>
  api.get(`/drivers/${driverId}`).then(r => r.data);

export const toggleDriverAvailability = (
  driverId: string,
  isAvailable: boolean,
) =>
  api
    .put(`/drivers/${driverId}/availability?is_available=${isAvailable}`)
    .then(r => r.data);

export const updateDriverLocation = (
  driverId: string,
  lat: number,
  lng: number,
) => api.put(`/drivers/${driverId}/location`, {lat, lng}).then(r => r.data);

export const acceptRide = (driverId: string, rideId: string) =>
  api.post(`/drivers/${driverId}/accept/${rideId}`).then(r => r.data);

export const driverCompleteRide = (driverId: string, rideId: string) =>
  api.post(`/drivers/${driverId}/complete/${rideId}`).then(r => r.data);

// ─── PAYMENTS ─────────────────────────────────────────────────────────────
export const getFare = (passengers: number = 1, km: number = 3) =>
  api.get(`/payments/fare?passengers=${passengers}&km=${km}`).then(r => r.data);

export const createPaymentOrder = (data: {
  ride_id: string;
  rider_id: string;
  method?: string;
}) => api.post('/payments/create-order', data).then(r => r.data);

export const verifyPayment = (data: {
  payment_id: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
}) => api.post('/payments/verify', data).then(r => r.data);

export const getRidePayment = (rideId: string) =>
  api.get(`/payments/ride/${rideId}`).then(r => r.data);

// ─── RATINGS ──────────────────────────────────────────────────────────────
export const submitRating = (data: {
  ride_id: string;
  rater_id: string;
  driver_id: string;
  stars: number;
  comment?: string;
}) => api.post('/ratings/', data).then(r => r.data);

export const getDriverRatings = (driverId: string) =>
  api.get(`/ratings/driver/${driverId}`).then(r => r.data);

export default api;
