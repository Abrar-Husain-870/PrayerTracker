import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import PrayerCalendar from './components/PrayerCalendar';
import Progress from './components/Progress';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import { LogOut, User, Calendar, TrendingUp, Trophy } from 'lucide-react';
import './App.css';

function AppContent() {
  const { currentUser, logout, getUserNickname } = useAuth();
  const [currentPage, setCurrentPage] = useState('calendar');
  const [userNickname, setUserNickname] = useState('');

  // Fetch user nickname when currentUser changes
  useEffect(() => {
    const fetchUserNickname = async () => {
      if (currentUser && getUserNickname) {
        try {
          const nickname = await getUserNickname(currentUser.uid);
          setUserNickname(nickname);
        } catch (error) {
          console.error('Error fetching user nickname:', error);
          // Fallback to display name or email
          setUserNickname(currentUser.displayName || currentUser.email.split('@')[0]);
        }
      }
    };

    fetchUserNickname();
  }, [currentUser, getUserNickname]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!currentUser) {
    return <Login />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'calendar':
        return <PrayerCalendar />;
      case 'progress':
        return <Progress />;
      case 'profile':
        return <Profile />;
      case 'leaderboard':
        return <Leaderboard />;
      default:
        return <PrayerCalendar />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">🕌</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">Jamā’ah Journal</h1>
                <p className="text-xs text-gray-500">
                  Welcome, {userNickname || 'User'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-4 flex gap-2">
            <button
              onClick={() => setCurrentPage('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 'calendar'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setCurrentPage('progress')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 'progress'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Progress
            </button>
            <button
              onClick={() => setCurrentPage('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 'profile'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User className="w-4 h-4" />
              Profile
            </button>
            <button
              onClick={() => setCurrentPage('leaderboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 'leaderboard'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Leaderboard
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-6">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-gray-500">
        <p>Build your spiritual discipline, one prayer at a time</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
