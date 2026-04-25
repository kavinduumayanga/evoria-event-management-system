# Evoria - Event Management App

Evoria is a mobile-based event booking and management system prototype.

## Project Structure
This repository contains two main directories:
- `backend/`: Node.js Express API using JSON files for storage
- `frontend/`: React Native Expo mobile application

## Tech Stack
- **Backend:** Node.js, Express, TypeScript, bcryptjs, jsonwebtoken, zod
- **Frontend:** React Native, Expo, TypeScript, Zustand, React Navigation
- **Design:** Dark neon UI with custom glassmorphism components

## Note
This is a prototype. It currently uses JSON files for storage (`backend/data/*.json`) so that it can be tested easily without a database setup. The repository layer is abstracted so that MongoDB can be seamlessly integrated in the future. The backend is structured to be easily deployable to Azure App Service later.

## Setup Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env`. Ensure your `JWT_SECRET` is set.
4. Start the backend server:
   ```bash
   npm run dev
   ```
   *The server will run on http://localhost:5000*
   *You can verify it's working by visiting http://localhost:5000/api/health*

### 2. Frontend Setup
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

### 3. Running on iPhone 11 Pro Max
1. Download the **Expo Go** app from the App Store on your iPhone.
2. Make sure your iPhone and computer are on the **same Wi-Fi network**.
3. Scan the QR code displayed in the Expo terminal using your iPhone's camera.
4. Tap the prompt to open the project in Expo Go.

## Roles
There are two roles in the system:
- **Host Admin:** Can create and manage events, venues, sessions, tickets, and view bookings.
- **Attendee:** Can browse public events, view details, and book tickets.

You can register two separate accounts to test the full flow.
