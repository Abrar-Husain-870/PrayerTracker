# Prayer Tracker 🕌

A beautiful React web app to track your daily prayer habits and build spiritual discipline.

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

### Step 1: Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Authentication** with Google and Email/Password providers
4. Enable **Firestore Database** in production mode
5. Go to Project Settings → General → Your apps
6. Add a web app and copy the Firebase config
7. Update `src/firebase/config.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### Step 2: Deploy to Vercel

#### Option A: Vercel CLI (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`
3. Deploy: `vercel --prod`
4. Follow the prompts to configure your deployment

#### Option B: Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository: `https://github.com/Abrar-Husain-870/PrayerTracker.git`
4. Configure build settings:
   - **Framework Preset**: Create React App
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
5. Add environment variables if needed
6. Click "Deploy"

### Step 3: Domain Configuration (Optional)
1. In Vercel dashboard, go to your project
2. Navigate to Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed

## 🛠️ Local Development

### Installation
```bash
# Clone the repository
git clone https://github.com/Abrar-Husain-870/PrayerTracker.git
cd PrayerTracker

# Install dependencies
npm install

# Configure Firebase (update src/firebase/config.js)
# Start development server
npm start
```

### Available Scripts
- `npm start` - Development server (http://localhost:3000)
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 🏗️ Tech Stack

- **Frontend**: React 18, TailwindCSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Icons**: Lucide React
- **Deployment**: Vercel
- **Version Control**: Git/GitHub

## 📱 Features Overview

### Prayer Tracking System
- **Scoring**: Not Prayed (0), Qaza (0.5), Home (1), Masjid (27)
- **Surah Al-Kahf**: Friday bonus (10 points)
- **Calendar Integration**: Visual prayer status tracking

### Leaderboard Algorithm
- **Composite Score**: 50% Average + 25% Consistency + 15% Streak + 10% Masjid
- **Fair Ranking**: Weighted scoring prevents gaming
- **Multiple Metrics**: Comprehensive performance evaluation

### Social Features
- **Friend System**: Mutual friendship with request/accept flow
- **Privacy**: Users control their visibility
- **Motivation**: Friendly competition and comparison

## 🔒 Security & Privacy

- **Firebase Security Rules**: Proper Firestore security
- **User Data Protection**: Private prayer data
- **Authentication**: Secure login with Firebase
- **Friend Privacy**: Mutual consent for friendships

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support or questions, please open an issue on GitHub.

---

**Made with ❤️ for the Muslim community**

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
