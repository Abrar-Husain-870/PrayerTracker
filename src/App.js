import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Login from './components/Login';
import PrayerCalendar from './components/PrayerCalendar';
import Progress from './components/Progress';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import Rules from './components/Rules';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import UpdateNotification from './components/UpdateNotification';
import { LogOut, User, Calendar, TrendingUp, Trophy, BookOpen, Sun, Moon } from 'lucide-react';
import './App.css';

function AppContent() {
  const { currentUser, logout, userNickname } = useAuth();
  const [currentPage, setCurrentPage] = useState('calendar');
  const { resolvedTheme, toggleTheme } = useTheme();

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
      case 'rules':
        return <Rules />;
      default:
        return <PrayerCalendar />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black dark:text-gray-100">
      <UpdateNotification />
      <PWAInstallPrompt />
      {/* Header */}
      <header className="bg-white dark:bg-black shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-primary-600 flex items-center justify-center">
                <img
                  src="/LogoHeader.png"
                  alt="Jamā'ah Journal Logo"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">Jamā'ah Journal</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Welcome, {userNickname || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-3 sm:mt-4 flex gap-1 sm:gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCurrentPage('calendar')}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-base min-w-0 ${
                currentPage === 'calendar'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">Calendar</span>
            </button>
            <button
              onClick={() => setCurrentPage('progress')}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-base min-w-0 ${
                currentPage === 'progress'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">Progress</span>
            </button>
            <button
              onClick={() => setCurrentPage('profile')}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-base min-w-0 ${
                currentPage === 'profile'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">Profile</span>
            </button>
            <button
              onClick={() => setCurrentPage('leaderboard')}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-base min-w-0 ${
                currentPage === 'leaderboard'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">Leaderboards</span>
            </button>
            <button
              onClick={() => setCurrentPage('rules')}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-base min-w-0 ${
                currentPage === 'rules'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">Rules</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-3 sm:py-6 px-3 sm:px-0">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
        <p>Build your spiritual discipline, one prayer at a time</p>
      </footer>
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
