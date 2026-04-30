import axios from 'axios';
import {Platform} from 'react-native';

// Android emulator: http://10.0.2.2:8000
// iOS simulator:    http://localhost:8000
const BASE_URL = 'https://backend-five-cyan-91.vercel.app';
const BASE_WS = 'wss://backend-five-cyan-91.vercel.app';

export {BASE_WS};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {'Content-Type': 'application/json'},
});

// ─── AUTH ────────────────────────────────────────────────────────────────
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
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role?: string;
}) => api.post('/users/', data).then(r => r.data);

export const getUser = (userId: string) =>
  api.get(`/users/${userId}`).then(r => r.data);

export const updateUserRole = (userId: string, role: string) =>
  api.put(`/users/${userId}/role?role=${role}`).then(r => r.data);

// ─── RIDES ────────────────────────────────────────────────────────────────
export const getStations = () => api.get('/rides/stations/').then(r => r.data);

export const getAreas = (station: string) =>
  api.get(`/rides/areas/${encodeURIComponent(station)}/`).then(r => r.data);

export const createRide = (data: {
  rider_id: string;
  metro_station: string;
  destination_area: string;
  exact_destination: string;
  seats_needed?: number;
  scheduled_time?: string;
  vehicle_type?: string;
  fare_per_person?: number;
}) => api.post('/rides/', data).then(r => r.data);

export const getRide = (rideId: string | number) =>
  api.get(`/rides/${rideId}`).then(r => r.data);

export const getUserRides = (userId: string) =>
  api.get(`/rides/user/${userId}`).then(r => r.data);

export const completeRide = (rideId: string | number) =>
  api.put(`/rides/${rideId}/complete`).then(r => r.data);

export const bookRide = (rideId: number, riderId: string, seats: number, pickup_station: string, drop_station: string) =>
  api.post('/rides/book', {ride_id: rideId, rider_id: riderId, seats, pickup_station, drop_station}).then(r => r.data);

export const findAvailableRides = (station: string, area: string) =>
  api.get(`/rides/?station=${encodeURIComponent(station)}&area=${encodeURIComponent(area)}`).then(r => r.data);

// ─── MATCHING ─────────────────────────────────────────────────────────────
export const findMatches = (station: string, area: string) =>
  api.get(`/match/${encodeURIComponent(station)}/${encodeURIComponent(area)}`).then(r => r.data);

// ─── DRIVERS ──────────────────────────────────────────────────────────────
export const registerDriver = (data: {
  user_id: string;
  vehicle_number: string;
  vehicle_type?: string;
}) => api.post('/drivers/register', data).then(r => r.data);

export const getDriverByUser = (userId: string) =>
  api.get(`/drivers/${userId}`).then(r => r.data);

export const toggleDriverAvailability = (userId: string) =>
  api.put(`/drivers/${userId}/availability`).then(r => r.data);

export const updateDriverLocation = (userId: string, lat: number, lng: number) =>
  api.put(`/drivers/${userId}/location`, {lat, lng}).then(r => r.data);

export const getDriverRides = (userId: string) =>
  api.get(`/drivers/${userId}/rides`).then(r => r.data);

export const acceptRide = (userId: string, rideId: number) =>
  api.put(`/drivers/${userId}/accept/${rideId}`).then(r => r.data);

export const driverCompleteRide = (userId: string, rideId: number) =>
  api.put(`/drivers/${userId}/complete/${rideId}`).then(r => r.data);

// ─── PAYMENTS ─────────────────────────────────────────────────────────────
export const calculateFare = (rideId: number) =>
  api.get(`/payments/calculate/${rideId}`).then(r => r.data);

export const createPayment = (data: {
  ride_id: number;
  rider_id: string;
  amount: number;
  method?: string;
}) => api.post('/payments/create', data).then(r => r.data);

export const verifyPayment = (paymentId: number) =>
  api.post(`/payments/verify/${paymentId}`).then(r => r.data);

export const getRidePayment = (rideId: number) =>
  api.get(`/payments/ride/${rideId}`).then(r => r.data);

// ─── RATINGS ──────────────────────────────────────────────────────────────
export const submitRating = (data: {
  ride_id: number;
  rater_id: string;
  driver_id: number;
  stars: number;
  comment?: string;
}) => api.post('/ratings/', data).then(r => r.data);

export const getDriverRatingStats = (driverId: number) =>
  api.get(`/ratings/driver/${driverId}`).then(r => r.data);

export default api;
