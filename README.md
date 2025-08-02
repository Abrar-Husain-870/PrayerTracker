# Namaaz Tracker 🕌

A beautiful React web app to track your daily Namaaz (prayer) habits and build spiritual discipline.

## Features

- **Interactive Calendar**: Large calendar view with color-coded prayer status indicators
- **Prayer Tracking**: Track 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) with different statuses:
  - ❌ Not Prayed (0 points)
  - ⏰ Qaza (0.5 points)
  - 🏠 At Home (1 point)
  - 🕌 In Masjid (27 points)
- **Scoring System**: Daily and monthly scoring with percentage tracking
- **Firebase Integration**: Secure authentication and real-time data storage
- **Mobile-First Design**: Responsive design optimized for mobile devices

## Tech Stack

- **Frontend**: React 18, TailwindCSS
- **Backend**: Firebase (Auth + Firestore)
- **Calendar**: React Calendar
- **Icons**: Lucide React

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password and Google)
4. Create a Firestore database
5. Copy your Firebase config and update `src/firebase/config.js`

### 3. Update Firebase Config

Replace the placeholder config in `src/firebase/config.js` with your actual Firebase project config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 4. Run the App

```bash
npm start
```

The app will open at `http://localhost:3000`

## Usage

1. **Sign Up/Login**: Create an account or login with email/password or Google
2. **Select Date**: Click on any date in the calendar to view/edit prayer status
3. **Update Prayers**: Use the dropdown menus to set prayer status for each prayer
4. **View Progress**: See daily scores and color-coded calendar indicators
5. **Track Monthly**: Monitor your monthly progress and build consistency

## Scoring System

- **Not Prayed**: 0 points
- **Qaza (Made up later)**: 0.5 points
- **At Home**: 1 point
- **In Masjid**: 27 points (following the hadith about congregational prayer rewards)

**Maximum Daily Score**: 135 points (27 × 5 prayers)

## Database Structure

```
users/{userId}/prayers/{date}
{
  fajr: "masjid" | "home" | "qaza" | "not_prayed",
  dhuhr: "masjid" | "home" | "qaza" | "not_prayed",
  asr: "masjid" | "home" | "qaza" | "not_prayed",
  maghrib: "masjid" | "home" | "qaza" | "not_prayed",
  isha: "masjid" | "home" | "qaza" | "not_prayed",
  lastUpdated: timestamp
}
```

## Future Enhancements

- [ ] Analytics dashboard with graphs and streaks
- [ ] Prayer time notifications
- [ ] Friends and leaderboard system
- [ ] Monthly/yearly statistics
- [ ] Export data functionality
- [ ] Dark mode support

## Contributing

Feel free to contribute to this project by submitting issues or pull requests.

## License

This project is open source and available under the MIT License.
