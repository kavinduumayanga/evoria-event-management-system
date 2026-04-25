# Evoria - Event Management App

Evoria is a mobile-based event booking and management system prototype.

## Project Structure
This repository contains two main directories:
- `backend/`: Node.js Express API using MongoDB for storage
- `frontend/`: React Native Expo mobile application

## Tech Stack
- **Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose, bcryptjs, jsonwebtoken, zod
- **Frontend:** React Native, Expo, TypeScript, Zustand, React Navigation
- **Design:** Dark neon UI with custom glassmorphism components

## Note
This project has been migrated to use MongoDB via Mongoose. The JSON file storage has been fully deprecated.

## Setup Instructions

### 1. MongoDB Setup
You must have a MongoDB instance running.
- **Local Install (macOS):**
  ```bash
  brew tap mongodb/brew
  brew install mongodb-community
  brew services start mongodb-community
  ```
- Alternatively, you can use MongoDB Atlas and set your `MONGO_URI` in the `.env` file.

### 2. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env`. Ensure your `MONGO_URI` and `JWT_SECRET` are correctly configured.
4. Seed the Database:
   Populate your local MongoDB with test data (Users, Events, Venues, Tickets, Sessions):
   ```bash
   npm run seed
   ```
5. Start the backend server:
   ```bash
   npm run dev
   ```
   *The server will run on http://localhost:5000*
   *You can verify it's working by visiting http://localhost:5000/api/health*

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update API Base URL:
   Since you will be testing on a physical iPhone 11 Pro Max via Expo Go, you **must** update the `API_URL` in `frontend/src/constants/api.ts` to point to your computer's local network IP address (e.g., `http://192.168.1.100:5000/api`). 
   - On macOS, you can find your IP by running `ipconfig getifaddr en0` in the terminal.
4. Start the Expo development server:
   ```bash
   npx expo start
   ```

### 4. Running on iPhone 11 Pro Max
1. Download the **Expo Go** app from the App Store on your iPhone.
2. Make sure your iPhone and computer are on the **same Wi-Fi network**.
3. Scan the QR code displayed in the Expo terminal using your iPhone's camera.
4. Tap the prompt to open the project in Expo Go.

## Test Credentials

After running `npm run seed`, you can use the following accounts:

- **Host Admin:**
  - Email: `hostadmin@evoria.com`
  - Password: `Admin123!`

- **Attendee:**
  - Email: `attendee@evoria.com`
  - Password: `Attendee123!`

## API Smoke Testing / Postman Examples

You can test the API using standard curl commands or Postman. For example, to login and get a token:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "hostadmin@evoria.com", "password": "Admin123!"}'
```

To fetch all events:
```bash
curl -X GET http://localhost:5000/api/events
```

To fetch venues:
```bash
curl -X GET http://localhost:5000/api/venues
```

## Roles
There are two roles in the system:
- **Host Admin:** Can create and manage events, venues, sessions, tickets, and view bookings.
- **Attendee:** Can browse public events, view details, and book tickets.

# evoria-event-management-system
