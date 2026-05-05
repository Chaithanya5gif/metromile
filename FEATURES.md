# MetroMile - Feature Documentation

**Version:** 2.0.0 (MVP)  
**Last Updated:** May 5, 2026

---

## ✅ IMPLEMENTED FEATURES

### 1. Real-Time GPS Tracking
- **Technology:** React Native Geolocation API + WebSocket
- **Update Frequency:** 3 seconds / 5 meters
- **Implementation:** 
  - Driver location tracked via `Geolocation.watchPosition()`
  - Broadcast to rider via WebSocket
  - Displayed on Leaflet.js map with live marker updates
- **Files:** 
  - `frontend/src/screens/driver/DriverHomeScreen.tsx`
  - `frontend/src/screens/driver/ActiveRideScreen.tsx`
  - `frontend/src/screens/rider/TrackRideScreen.tsx`

### 2. Carpool Matching Algorithm
- **Logic:** Match rides by source station + destination area
- **Concurrency:** Pessimistic locking (`with_for_update()`) prevents double-booking
- **Capacity:** Tracks available seats atomically
- **Implementation:**
  - Find pending rides with same station + area
  - Decrement available seats on booking
  - Group passengers by drop station
- **Files:**
  - `backend/app/routes/matching.py`
  - `backend/app/routes/rides.py` (book endpoint)

### 3. Payment Integration
- **Gateway:** Razorpay
- **Methods:** UPI, Card, Cash
- **Flow:** Create order → Collect payment → Verify → Update driver earnings
- **Features:**
  - Fare calculation (Base ₹30 + Distance ₹45 = ₹75)
  - Per-person fare splitting
  - Driver earnings tracking
- **Files:**
  - `backend/app/routes/payments.py`
  - `frontend/src/screens/rider/PaymentScreen.tsx`

### 4. WebSocket Real-Time Communication
- **Events:** 
  - `ride_accepted` - Driver accepts ride
  - `ride_completed` - Ride finished
  - `location` - GPS updates
  - `ride_request` - New ride broadcast
- **Reliability:** Auto-reconnect after 3 seconds
- **Pattern:** Singleton ConnectionManager
- **Files:**
  - `backend/app/routes/websocket.py`
  - `frontend/src/services/websocket.ts`

### 5. Role-Based Navigation
- **Roles:** Rider, Driver
- **Switching:** Instant role toggle with AsyncStorage persistence
- **Navigation:** Separate tab stacks for each role
- **Screens:**
  - **Rider:** Home, BookRide, FindPool, Track, Payment, Rating, History
  - **Driver:** Dashboard, Rides, ActiveRide, Earnings
  - **Shared:** Login, Profile, Splash
- **Files:**
  - `frontend/src/navigation/RiderNavigator.tsx`
  - `frontend/src/navigation/DriverNavigator.tsx`
  - `frontend/src/context/AuthContext.tsx`

### 6. Authentication System
- **Provider:** Clerk (via WebView bridge)
- **Method:** OAuth with JWT tokens
- **Persistence:** AsyncStorage for session management
- **Features:**
  - Auto-login on app restart
  - Secure token storage
  - Role-based access control
- **Files:**
  - `frontend/src/screens/shared/LoginScreen.tsx`
  - `frontend/src/context/AuthContext.tsx`
  - `clerk-react/` (separate Vite app)

### 7. Database Design
- **Tables:** 6 (Users, Drivers, Rides, Bookings, Payments, Ratings)
- **Relationships:** Proper foreign keys and constraints
- **Enums:** Type-safe status fields (UserRole, RideStatus, PaymentStatus)
- **Features:**
  - One-to-one: User ↔ Driver
  - One-to-many: User → Rides, Driver → Rides
  - Cascade deletes where appropriate
- **Files:**
  - `backend/app/models/models.py`
  - `backend/app/database.py`

### 8. Metro Station Coverage
- **Lines:** 3 (Purple, Green, Yellow)
- **Stations:** 82 total
  - Purple Line: 34 stations
  - Green Line: 32 stations
  - Yellow Line: 16 stations
- **Destinations:** 7 areas per station (574 total destinations)
- **Implementation:** Hardcoded dictionary for reliability
- **Files:**
  - `backend/app/routes/rides.py` (METRO_STATIONS, DESTINATION_AREAS)

### 9. Driver Rating System
- **Scale:** 1-5 stars
- **Features:**
  - Optional text comments
  - Running average calculation
  - One rating per ride (unique constraint)
  - Updates driver's overall rating
- **Formula:** `(sum_of_all_ratings) / (total_count)`
- **Files:**
  - `backend/app/routes/ratings.py`
  - `frontend/src/screens/rider/RatingScreen.tsx`

### 10. Ride Lifecycle Management
- **States:** pending → matched → accepted → active → completed/cancelled
- **Features:**
  - Automatic status transitions
  - Timestamp tracking (created_at, completed_at)
  - Driver assignment
  - Seat availability tracking
- **Files:**
  - `backend/app/models/models.py` (RideStatus enum)
  - `backend/app/routes/rides.py`
  - `backend/app/routes/drivers.py`

---

## 🚧 KNOWN LIMITATIONS & FUTURE IMPROVEMENTS

### 1. Metro Station Data
- **Current:** Hardcoded dictionary (82 stations)
- **Future:** Integrate with official BMRCL API or GTFS feeds
- **Reason:** No public API available at development time
- **Impact:** Manual updates needed for new stations

### 2. Map Tiles & Navigation
- **Current:** OpenStreetMap (free, no API key)
- **Future:** Google Maps API for better accuracy and routing
- **Reason:** Cost optimization for MVP
- **Impact:** No turn-by-turn navigation or traffic data

### 3. Scalability Testing
- **Current:** Single-server deployment on Vercel
- **Tested:** 10-20 concurrent users
- **Future:** Load balancing, Redis caching, CDN
- **Reason:** MVP deployment for demonstration
- **Impact:** Unknown performance at 1000+ users

### 4. Offline Mode
- **Current:** Basic caching of static data (stations, profile)
- **Future:** Full offline queue with background sync
- **Reason:** MVP focused on online experience
- **Impact:** Requires internet for ride booking

### 5. Automated Testing
- **Current:** Manual testing of all user flows
- **Future:** Unit tests, integration tests, E2E tests, CI/CD
- **Reason:** Time constraints for MVP
- **Impact:** No automated regression testing

### 6. Authentication Method
- **Current:** Clerk via WebView bridge
- **Future:** Native Clerk SDK or Firebase Auth
- **Reason:** React Native SDK compatibility issues
- **Impact:** Slight UX overhead from WebView

---

## 📊 PERFORMANCE METRICS

| Metric | Current Performance |
|--------|---------------------|
| API Response Time | < 200ms average |
| WebSocket Latency | < 100ms |
| GPS Update Frequency | 3 seconds |
| Database Query Time | < 50ms (indexed queries) |
| Mobile App Size | ~25MB |
| Concurrent Users Tested | 10-20 |
| Backend Deployment | Vercel Serverless |
| Database | PostgreSQL on Vercel |

---

## 🔒 SECURITY FEATURES

### 1. Authentication & Authorization
- ✅ Third-party auth via Clerk (OAuth, JWT)
- ✅ Role-based access control (Rider/Driver)
- ✅ Session persistence with secure storage
- ✅ Token-based API authentication

### 2. Data Protection
- ✅ SQL injection protection (SQLAlchemy ORM)
- ✅ Input validation (Pydantic schemas)
- ✅ CORS configuration for mobile app
- ✅ Environment variables for secrets
- ✅ HTTPS for all API communication

### 3. Concurrency Control
- ✅ Pessimistic locking for ride booking
- ✅ Atomic seat decrement
- ✅ Transaction rollback on errors
- ✅ Database constraints (unique, foreign keys)

---

## 🧪 TESTING APPROACH

### Manual Testing (Completed)
- ✅ All user flows tested on Android device
- ✅ Ride booking end-to-end
- ✅ Driver acceptance and completion
- ✅ Payment flow (test mode)
- ✅ Rating submission
- ✅ Role switching
- ✅ WebSocket connection stability
- ✅ GPS tracking in real-world driving

### API Testing
- ✅ Postman collection for all 30+ endpoints
- ✅ Error handling verification
- ✅ Input validation testing
- ✅ Database constraint testing

### Future Testing
- ⏳ Unit tests (Jest, pytest)
- ⏳ Integration tests
- ⏳ E2E tests (Detox)
- ⏳ Load testing
- ⏳ Security testing

---

## 🎨 USER INTERFACE FEATURES

### Design System
- **Color Scheme:** Purple primary (#581C87), Green accent (#059669)
- **Typography:** System fonts with weight variations
- **Icons:** MaterialCommunityIcons
- **Animations:** React Native Animated API
- **Layout:** SafeAreaView for notch compatibility

### Key UI Components
1. **Custom Tab Bar** - Elevated with focused state animation
2. **Status Badges** - Color-coded ride status indicators
3. **Map Component** - Leaflet.js with custom markers
4. **Pull-to-Refresh** - All list screens
5. **Loading States** - ActivityIndicator for async operations
6. **Empty States** - Friendly messages with emojis
7. **Network Status** - Banner for offline mode

---

## 📱 PLATFORM SUPPORT

### Current
- ✅ Android (tested on Android 11+)
- ✅ React Native 0.73+
- ✅ TypeScript for type safety

### Future
- ⏳ iOS support (requires Mac for testing)
- ⏳ Tablet optimization
- ⏳ Web version (React Native Web)

---

## 🔄 API ENDPOINTS (30+ Total)

### Users (4 endpoints)
- `POST /users/` - Create or get user
- `GET /users/{id}` - Get user by ID
- `PUT /users/{id}/role` - Update role
- `PUT /users/{id}` - Update profile

### Rides (9 endpoints)
- `GET /rides/stations` - List metro stations
- `GET /rides/areas/{station}` - Get destination areas
- `POST /rides/` - Create ride
- `GET /rides/` - List pending rides
- `GET /rides/user/{id}` - User's rides
- `GET /rides/{id}` - Get single ride
- `POST /rides/book` - Book seats
- `GET /rides/{id}/passengers` - Get passengers
- `PUT /rides/{id}/complete` - Complete ride

### Drivers (7 endpoints)
- `POST /drivers/register` - Register driver
- `GET /drivers/{id}` - Get driver profile
- `PUT /drivers/{id}/availability` - Toggle availability
- `PUT /drivers/{id}/location` - Update GPS
- `GET /drivers/{id}/rides` - Get available rides
- `PUT /drivers/{id}/accept/{rideId}` - Accept ride
- `PUT /drivers/{id}/complete/{rideId}` - Complete ride

### Payments (4 endpoints)
- `POST /payments/create` - Create payment
- `POST /payments/verify/{id}` - Verify payment
- `GET /payments/ride/{id}` - Get ride payment
- `GET /payments/calculate/{id}` - Calculate fare

### Ratings (2 endpoints)
- `POST /ratings/` - Submit rating
- `GET /ratings/driver/{id}` - Get driver rating

### Matching (1 endpoint)
- `GET /match/{station}/{area}` - Find carpool matches

### WebSocket (1 endpoint)
- `WS /ws/{user_id}` - WebSocket connection

### Health (1 endpoint)
- `GET /` - API health check

---

## 🚀 DEPLOYMENT

### Backend
- **Platform:** Vercel Serverless
- **URL:** https://backend-five-cyan-91.vercel.app
- **Database:** PostgreSQL (Vercel Postgres)
- **Environment:** Production

### Frontend
- **Platform:** React Native (Android APK)
- **Build:** Release build with ProGuard
- **Size:** ~25MB
- **Min SDK:** Android 21 (Lollipop)

### Clerk Auth
- **Platform:** Vercel (separate Vite app)
- **Integration:** WebView bridge
- **Security:** OAuth + JWT

---

## 📈 FUTURE ROADMAP

### Phase 1: Core Improvements (Next 2 months)
- [ ] Integrate Google Maps Directions API
- [ ] Add automated testing suite
- [ ] Implement comprehensive offline support
- [ ] Migrate to native authentication

### Phase 2: Scale & Performance (Months 3-4)
- [ ] Redis for caching and WebSocket management
- [ ] Database read replicas
- [ ] Load balancing
- [ ] CDN integration
- [ ] Performance monitoring (New Relic/DataDog)

### Phase 3: New Features (Months 5-6)
- [ ] In-app chat between rider and driver
- [ ] Ride scheduling (book for future)
- [ ] Favorite locations
- [ ] Ride sharing with friends
- [ ] Driver verification system
- [ ] Emergency SOS button
- [ ] Ride insurance integration

### Phase 4: Business Features (Ongoing)
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Dynamic pricing based on demand
- [ ] Promotional codes and discounts
- [ ] Referral system
- [ ] Customer support chat system

---

## 🎯 PROJECT STATISTICS

| Metric | Count |
|--------|-------|
| Total Lines of Code | ~8,000+ |
| Backend Files | 10 |
| Frontend Files | 25+ |
| Database Tables | 6 |
| API Endpoints | 30+ |
| Screens | 14+ |
| Git Commits | 12 |
| Development Time | 3 months |
| Technologies Used | 15+ |

---

## 💡 KEY TECHNICAL DECISIONS

### 1. Why FastAPI over Django?
- Async/await support for WebSocket
- Automatic API documentation
- Better performance for real-time features
- Modern Python type hints

### 2. Why React Native over Flutter?
- JavaScript/TypeScript familiarity
- Large ecosystem and community
- Better debugging tools
- Easier web deployment path

### 3. Why PostgreSQL over MongoDB?
- Relational data (rides, users, bookings)
- ACID compliance for payments
- Better for complex queries
- Foreign key constraints

### 4. Why WebSocket over Polling?
- Lower latency for GPS updates
- Reduced server load
- True bidirectional communication
- Better battery efficiency on mobile

### 5. Why Clerk over Custom Auth?
- Production-ready OAuth flows
- Security best practices built-in
- Reduced development time
- Easy social login integration

---

## 📚 DOCUMENTATION

### Available Documentation
- ✅ README.md - Project overview
- ✅ FEATURES.md - This file
- ✅ LIMITATIONS_AND_IMPROVEMENTS.md - Honest assessment
- ✅ Viva guides (4 parts) - Complete technical documentation
- ✅ Inline code comments - All major files

### API Documentation
- ✅ Auto-generated Swagger UI at `/docs`
- ✅ ReDoc at `/redoc`
- ✅ Postman collection available

---

**Built with ❤️ for Bengaluru Metro Commuters**

*MetroMile - Making metro commutes affordable through carpooling*
