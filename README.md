<div align="center">

<br/>

```
███╗   ███╗███████╗████████╗██████╗  ██████╗ ███╗   ███╗██╗██╗     ███████╗
████╗ ████║██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗████╗ ████║██║██║     ██╔════╝
██╔████╔██║█████╗     ██║   ██████╔╝██║   ██║██╔████╔██║██║██║     █████╗  
██║╚██╔╝██║██╔══╝     ██║   ██╔══██╗██║   ██║██║╚██╔╝██║██║██║     ██╔══╝  
██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║███████╗███████╗
╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝
```

**Smart Metro Carpooling — Match smarter. Commute cheaper. Travel greener.**

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white)](https://clerk.com/)
[![PostgreSQL](https://img.shields.io/badge/DB-Neon_PostgreSQL-00E699?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)

<br/>

</div>

---

## What is MetroMile?

**MetroMile** is a real-time carpooling platform built around metro stations. It intelligently groups commuters travelling similar routes, splits fares automatically, and coordinates pickup and drop-off — all from a mobile app.

The core problem it solves: metro stations are hubs, but the last-mile and shared-route legs of urban commutes are fragmented, expensive, and inefficient. MetroMile bridges that gap.

- **For passengers** — find a shared ride in under 60 seconds, pay automatically, track your driver live.
- **For drivers** — receive pooled trip requests in your area, accept in one tap, earn per completed trip.
- **For cities** — fewer cars, lower emissions, smarter use of existing road capacity.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [System Flows](#system-flows)
- [Matching Algorithm](#matching-algorithm)
- [Authentication](#authentication)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Category | Capability |
|---|---|
| **Matching** | Groups passengers by route proximity (2 km), time window (15 min), and capacity (max 4) |
| **Real-time** | WebSocket notifications for ride status, driver acceptance, and live location |
| **Tracking** | GPS location updates every 5 seconds during active trips |
| **OTP Verification** | 4-digit OTP for secure pickup (auto/car/suv) — bikes skip OTP for speed |
| **Smart Capacity** | 🛵 Bike (1) • 🛺 Auto (3) • 🚗 Mini (4) • ✨ Premium (6) passengers |
| **Payments** | Razorpay integration with auto-processing on trip completion |
| **Auth** | Google OAuth, GitHub OAuth, and Email OTP via Clerk |
| **Driver Verification** | License, RC, Aadhar verification system for safety |
| **Driver tools** | Availability toggle, 2-minute accept/decline window, per-trip earnings summary |
| **Ratings** | Post-trip passenger-to-driver rating system |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App                            │
│              React Native + TypeScript                   │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTP + WebSocket
          ┌────────────▼────────────┐
          │    FastAPI Backend       │
          │  Python 3.10+  │  ASGI  │
          └──┬──────────────────┬───┘
             │                  │
    ┌────────▼──────┐   ┌───────▼──────────┐
    │  Neon (Neon)  │   │  Clerk Auth API  │
    │  PostgreSQL   │   │  (JWT + webhooks)│
    └───────────────┘   └──────────────────┘
```

**Request lifecycle:**
1. Expo app authenticates via Clerk → receives JWT
2. JWT attached to every API request → FastAPI verifies with Clerk SDK
3. Business logic runs → writes to Neon PostgreSQL
4. WebSocket events broadcast to relevant clients in real time

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Mobile** | React Native / Expo (TypeScript) | Cross-platform iOS & Android app |
| **Backend** | Python + FastAPI | REST API + WebSocket server |
| **Auth** | Clerk | OAuth, Email OTP, JWT session management |
| **Database** | Neon (PostgreSQL) | Persistent storage with serverless scaling |
| **Real-time** | WebSocket (`/ws/notifications`) | Live ride status, driver location, notifications |
| **Native** | Android (Kotlin), iOS (Objective-C bridge) | Platform-specific GPS and notifications |

---

## Project Structure

```
metromile/
│
├── frontend/                   # React Native bare app
│   ├── app/                    #  Router pages
│   ├── components/             # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # API client, WebSocket client
│   ├── utils/                  # Helpers, formatters
│   ├── .env                    # ⚠️  Local only — never commit
│   ├── .env.example            # ✅  Template — commit this
│   └── package.json
│
├── backend/                    # FastAPI server
│   ├── app/
│   │   ├── routers/            # Route handlers (rides, payments, ws)
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic (matching, payments)
│   │   └── core/               # Config, database, auth middleware
│   ├── .env                    # ⚠️  Local only — never commit
│   ├── .env.example            # ✅  Template — commit this
│   └── requirements.txt
│
├── clerk-react/                # Standalone Clerk auth integration
│   ├── src/
│   ├── .env                    # ⚠️  Local only — never commit
│   └── package.json
│
├── .gitignore                  # Ensures .env files are never committed
└── README.md
```

> **Security note:** `.env` files are gitignored at the root level. Copy `.env.example` → `.env` and fill in your values. Never commit real credentials.

---

## Getting Started

### Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 18.x |
| Python | 3.10 |
| Expo CLI | latest |
| Clerk account | — |
| Neon account | — |

### 1. Clone the repository

```bash
git clone https://github.com/Chaithanya5gif/metromile.git
cd metromile
```

### 2. Backend setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Open .env and fill in DATABASE_URL, CLERK_SECRET_KEY, etc.

# Run the development server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Open .env and fill in EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_API_URL

# Start the Expo dev server
npx expo start
```

Scan the QR code with Expo Go (iOS or Android) or press `a` for Android emulator / `i` for iOS simulator.

### 4. Clerk auth setup

```bash
cd clerk-react
npm install
cp .env.example .env
# Add your Clerk publishable key to .env
```

> **India (+91) note:** SMS/phone verification requires Clerk Tier C activation. Email `support@clerk.dev` to enable, or use Email OTP as a drop-in alternative — it works out of the box.

---

## Environment Variables

### ⚠️ Security rules

- `.env` files are **gitignored** — never commit them
- `.env.example` files are committed as templates with placeholder values
- Rotate keys immediately if you suspect exposure
- Use separate dev and production keys — Clerk and Neon both provide this

## API Reference

### Base URL

| Environment | URL |
|---|---|
| Development | `http://localhost:8000` |
| Production | `https://your-domain.com` |

### Rides

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/rides/request` | Passenger creates a new ride request |
| `GET` | `/rides/match` | Trigger matching for pending requests |
| `POST` | `/rides/accept` | Driver accepts a ride offer |
| `GET` | `/rides/track/{id}` | Poll live location for a trip |
| `POST` | `/rides/complete` | Driver marks trip as complete |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payments/process` | Automatically processes fare on trip completion |

### Real-time

| Protocol | Endpoint | Description |
|---|---|---|
| `WS` | `/ws/notifications` | Ride status updates, driver acceptance, location |

> All endpoints (except `/ws`) require a valid Clerk JWT in the `Authorization: Bearer <token>` header.

---

## System Flows

### Passenger flow

```
Login → Select origin & destination → Choose vehicle type
  → See nearby drivers with capacity (🛵 1, 🛺 3, 🚗 4, ✨ 6)
  → Fare calculated → Confirm booking
  → [PENDING] Waiting for driver
  → [CONFIRMED] Driver accepted → View driver details
  → [OTP VERIFICATION] Enter 4-digit OTP (auto/car only, bikes skip)
  → [ACTIVE] Live tracking during ride
  → Arrive → Auto payment via Razorpay → Rate driver ✓
```

### Driver flow

```
Login → Register vehicle (type, license, RC, Aadhar)
  → Set status "Available"
  → Receive ride request notification (2-min window)
  → Accept → Get 4-digit OTP (auto/car) or start immediately (bike)
  → [ACCEPTED] Status → "Busy"
  → Navigate to pickup station
  → Mark as arrived → Share OTP with passenger
  → Passenger verifies OTP → Ride starts
  → Share live location every 5s
  → Pick up passengers → Drive → Drop off
  → Mark complete → Receive payment → Status → "Available" ✓
```

---

## Matching Algorithm

When a ride request is received, the system runs the following checks in order:

```
New ride request
      │
      ▼
Query pending rides with same destination
      │
      ▼
Origin within 2 km?  ──── No ──── Unmatched (create new group)
      │ Yes
      ▼
Departure within 15 min?  ──── No ──── Unmatched
      │ Yes
      ▼
Capacity < 4 passengers?  ──── No ──── Unmatched
      │ Yes
      ▼
Add to match group → Status: "matched"
      │
      ▼
Find available drivers within 5 km
      │
      ▼
Send push notification to nearby drivers
      │
      ▼
First driver to accept → Wins the trip
      │
      ▼
Notify all passengers via WebSocket ✓
```

**Key thresholds:**

| Parameter | Value |
|---|---|
| Origin proximity | 2 km radius |
| Departure window | ± 15 minutes |
| Max passengers per bike | 1 (no OTP) |
| Max passengers per auto | 3 (OTP required) |
| Max passengers per mini | 4 (OTP required) |
| Max passengers per premium | 6 (OTP required) |
| Driver search radius | 5 km |
| Driver accept timeout | 2 minutes |
| Location update interval | 5 seconds |
| OTP validity | Until ride starts |

---

## OTP Verification System

MetroMile implements industry-standard OTP verification (similar to Uber/Ola) for secure passenger pickup.

### How it works

1. **Driver accepts ride** → Backend generates random 4-digit OTP (1000-9999)
2. **OTP displayed** → Driver sees OTP in purple card on ActiveRideScreen
3. **Driver arrives** → Clicks "Mark as Arrived" button
4. **Share OTP** → Driver shares OTP verbally with passenger
5. **Passenger verifies** → Enters OTP in modal on TrackRideScreen
6. **Ride starts** → Status changes from ACCEPTED → ACTIVE

### Vehicle-specific logic

| Vehicle Type | Capacity | OTP Required | Reason |
|---|---|---|---|
| 🛵 Bike/Scooter | 1 passenger | ❌ No | Single passenger, no confusion |
| 🛺 Auto | 3 passengers | ✅ Yes | Multiple passengers, prevents wrong pickup |
| 🚗 Mini/Sedan | 4 passengers | ✅ Yes | Multiple passengers, prevents wrong pickup |
| ✨ Premium/SUV | 6 passengers | ✅ Yes | Multiple passengers, prevents wrong pickup |

### Security features

- **Server-side generation** — OTP generated by backend, not client
- **HTTPS encryption** — All API calls encrypted in transit
- **Single-use** — Each ride gets unique OTP
- **WebSocket broadcast** — Real-time OTP delivery to rider
- **No expiration (MVP)** — Production will add 10-minute timeout

### API endpoints

```
PUT  /drivers/{user_id}/accept/{ride_id}  → Generate OTP
PUT  /rides/{ride_id}/mark-arrived        → Driver marks arrival
POST /rides/{ride_id}/verify-otp          → Verify OTP
PUT  /rides/{ride_id}/start               → Start ride after verification
```

---

## Authentication

MetroMile uses [Clerk](https://clerk.com) for all authentication and session management.

### Supported sign-in methods

| Method | Status |
|---|---|
| Google OAuth | ✅ Available |
| GitHub OAuth | ✅ Available |
| Email + Password | ✅ Available |
| Email OTP | ✅ Available |
| Phone / SMS (India +91) | ⚠️ Requires Clerk Tier C — email `support@clerk.dev` |

### How it works

1. User signs in via Clerk → Clerk issues a signed JWT
2. Expo app attaches JWT to every API request header
3. FastAPI backend verifies the JWT using `CLERK_SECRET_KEY`
4. Clerk webhooks (signed with `CLERK_WEBHOOK_SECRET`) notify the backend of user events

---

## Contributing

Contributions are welcome. Please follow this workflow:

```bash
# 1. Fork and clone
git clone https://github.com/your-username/metromile.git

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes, then commit
git commit -m "feat: describe your change clearly"

# 4. Push and open a PR
git push origin feature/your-feature-name
```

### Commit message convention

| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change with no feature/fix |
| `chore:` | Build, CI, dependencies |

### Before submitting a PR

- [ ] `.env` files are not included in the commit
- [ ] `.env.example` is updated if new variables were added
- [ ] New endpoints are documented in the API Reference section
- [ ] Code runs locally without errors

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## Author

**Chaithanya** — [@Chaithanya5gif](https://github.com/Chaithanya5gif)

---

<div align="center">

Built to make metro commutes smarter, cheaper, and greener.

</div>
