/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Trophy, 
  Medal, 
  Award, 
  Users, 
  Globe, 
  UserPlus,
  Search,
  Crown,
  Star,
  Calendar,
  TrendingUp,
  Flame,
  Target,
  Zap,
  BarChart3,
  TrendingDown,
  Minus,
  X,
  Clock
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getMonthlyStats, getYearlyStats, calculatePrayerStats, getPrayerDataInRange } from '../services/analyticsService';

const Leaderboard = () => {
  const { currentUser, getUserNickname } = useAuth();
  const [activeTab, setActiveTab] = useState('global'); // 'global', 'friends', or 'requests'
  const [timePeriod, setTimePeriod] = useState('all'); // Default to 'all' (All Time)
  const [masjidModeFilter, setMasjidModeFilter] = useState('all'); // 'all', 'on', 'off'
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [friendsData, setFriendsData] = useState([]);
  const [userFriends, setUserFriends] = useState([]);
  const [currentUserStats, setCurrentUserStats] = useState(null);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addFriendInput, setAddFriendInput] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);
  const [friendRequestsSent, setFriendRequestsSent] = useState([]);
  const [friendRequestsReceived, setFriendRequestsReceived] = useState([]);
  // const [showFriendRequests, setShowFriendRequests] = useState(false); // Unused for now
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', message: 'text' }

  // Load user preferences from localStorage
  useEffect(() => {
    if (currentUser) {
      const savedTimePeriod = localStorage.getItem(`leaderboard_timePeriod_${currentUser.uid}`);
      const savedMasjidModeFilter = localStorage.getItem(`leaderboard_masjidModeFilter_${currentUser.uid}`);
      
      if (savedTimePeriod) {
        setTimePeriod(savedTimePeriod);
      }
      if (savedMasjidModeFilter) {
        setMasjidModeFilter(savedMasjidModeFilter);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchLeaderboardData();
      fetchUserFriends();
      fetchFriendRequests();
    }
  }, [currentUser, timePeriod, masjidModeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showAddFriend && searchInputRef.current) {
      // Focus the input when the add friend section is shown
      // Use a short timeout to ensure the element is rendered before focusing
      setTimeout(() => searchInputRef.current.focus(), 100);
    }
  }, [showAddFriend]);

  // Auto-hide notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
  }, []);

  // Calculate theoretical maximum average score for the current time period
  const calculateTheoreticalMaxAverage = () => {
    const currentDate = new Date();
    let totalDays = 0;
    let fridayCount = 0;
    
    if (timePeriod === 'week') {
      // Last 7 days
      totalDays = 7;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);
      
      // Count Fridays in the week
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 5) fridayCount++; // Friday is day 5
      }
    } else if (timePeriod === 'month') {
      // Current month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      totalDays = new Date(year, month + 1, 0).getDate(); // Days in current month
      
      // Count Fridays in the month
      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        if (date.getDay() === 5) fridayCount++;
      }
    } else if (timePeriod === 'year') {
      // Current year
      const year = currentDate.getFullYear();
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      totalDays = isLeapYear ? 366 : 365;
      
      // Count Fridays in the year - more efficient method
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      
      for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 5) fridayCount++;
      }
    } else {
      // All time - use a reasonable estimate (2 years)
      totalDays = 730; // Approximately 2 years
      fridayCount = Math.floor(totalDays / 7); // Approximately 1 Friday per week
    }
    
    // Calculate theoretical maximum
    // Daily max: 5 prayers × 27 points = 135 points
    // Friday bonus: +10 points for Surah Al-Kahf
    const dailyMaxPoints = 135;
    const fridayBonusPoints = 10;
    const totalMaxPoints = (totalDays * dailyMaxPoints) + (fridayCount * fridayBonusPoints);
    const theoreticalMaxAverage = totalMaxPoints / totalDays;
    
    return theoreticalMaxAverage;
  };

  // Calculate theoretical maximum average for current time period
  const theoreticalMaxAverage = React.useMemo(() => {
    return calculateTheoreticalMaxAverage();
  }, [timePeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bar Graph Component for Friends Comparison
  const FriendsMetricBarGraph = ({ friends, currentUser }) => {
    if (!friends || friends.length === 0) return null;

    // Include current user in comparison if they have data
    const allUsers = currentUser && currentUser.totalDays > 0 
      ? [{ ...currentUser, nickname: `${currentUser.nickname} (You)`, isCurrentUser: true }, ...friends]
      : friends;

    const metrics = [
      {
        name: 'Composite Score',
        key: 'compositeScore',
        max: 100,
        unit: '',
        color: 'bg-purple-500',
        lightColor: 'bg-purple-100'
      },
      {
        name: 'Average Score',
        key: 'averageScore', 
        max: theoreticalMaxAverage, // Theoretical maximum for the time period
        unit: '',
        color: 'bg-blue-500',
        lightColor: 'bg-blue-100'
      },
      {
        name: 'Consistency',
        key: 'consistency',
        max: 100,
        unit: '%',
        color: 'bg-green-500',
        lightColor: 'bg-green-100'
      },
      {
        name: 'Current Streak',
        key: 'currentStreak',
        max: Math.max(...allUsers.map(u => u.currentStreak || 0), 30),
        unit: 'd',
        color: 'bg-orange-500',
        lightColor: 'bg-orange-100'
      },
      {
        name: 'Masjid %',
        key: 'masjidPercentage',
        max: 100,
        unit: '%',
        color: 'bg-amber-500',
        lightColor: 'bg-amber-100'
      }
    ];

    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100 mt-6 dark:bg-black dark:border-gray-800 glass-card">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          Friends Metrics Comparison
        </h3>
        
        <div className="space-y-6">
          {metrics.map((metric) => (
            <div key={metric.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-700">{metric.name}</h4>
                <span className="text-sm text-gray-500">Max: {metric.max.toFixed(0)}{metric.unit}</span>
              </div>
              
              <div className="space-y-2">
                {allUsers
                  .sort((a, b) => (b[metric.key] || 0) - (a[metric.key] || 0))
                  .map((user, index) => {
                    const value = user[metric.key] || 0;
                    const percentage = metric.max > 0 ? (value / metric.max) * 100 : 0;
                    
                    return (
                      <div key={user.id} className="flex items-center gap-3">
                        <div className="w-20 text-sm text-gray-600 truncate" title={user.nickname}>
                          {user.nickname}
                        </div>
                        
                        <div className="flex-1 relative">
                          <div className={`h-6 rounded-full ${metric.lightColor} relative overflow-hidden`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                user.isCurrentUser ? 'bg-primary-500' : metric.color
                              }`}
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            >
                              {percentage > 15 && (
                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                                  {value.toFixed(metric.key === 'averageScore' ? 1 : 0)}{metric.unit}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {percentage <= 15 && (
                            <div className="absolute left-2 top-0 h-6 flex items-center text-xs font-medium text-gray-600">
                              {value.toFixed(metric.key === 'averageScore' ? 1 : 0)}{metric.unit}
                            </div>
                          )}
                        </div>
                        
                        <div className="w-8 text-right">
                          {index === 0 && value > 0 && (
                            <Trophy className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-purple-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            💡 Tip: Higher bars indicate better performance in each metric
          </p>
        </div>
      </div>
    );
  };

  const calculateDaysSinceLastActivity = async (userId) => {
    try {
      // Get the most recent prayer data for this user
      const currentDate = new Date();
      const startDate = new Date();
      startDate.setDate(currentDate.getDate() - 60); // Check last 60 days
      
      const prayerData = await getPrayerDataInRange(userId, startDate, currentDate);
      
      if (!prayerData || Object.keys(prayerData).length === 0) {
        return 999; // No activity found in last 60 days
      }
      
      // Find the most recent date with any prayer data
      const dates = Object.keys(prayerData).sort().reverse();
      const mostRecentDate = dates[0];
      
      if (!mostRecentDate) {
        return 999;
      }
      
      // Calculate days since that date
      const lastActivityDate = new Date(mostRecentDate);
      const daysDiff = Math.floor((currentDate - lastActivityDate) / (1000 * 60 * 60 * 24));
      
      return Math.max(0, daysDiff);
    } catch (error) {
      console.error('Error calculating days since last activity:', error);
      return 999; // Default to inactive if error occurs
    }
  };

  const calculateCompositeScore = (stats) => {
    // New Composite Score Algorithm (100%)
    // Average 45% | Consistency 20% | Streak 10% | Masjid%/Surah 10% | Days Tracked 15%
    if (!stats) return 0;

    // 1) Average (0..145 -> 0..100) @45%
    const maxPossibleAverage = 145;
    const avgNorm = Math.min((stats.averageScore || 0) / maxPossibleAverage, 1) * 100;
    const avgComp = avgNorm * 0.45;

    // 2) Consistency (0..100) @20%
    const cons = Math.max(0, Math.min(stats.consistency || 0, 100));
    const consComp = cons * 0.20;

    // 3) Streak (cap 30 days) @10%
    const streakNorm = Math.min((stats.currentStreak || 0) / 30, 1) * 100;
    const streakComp = streakNorm * 0.10;

    // 4) Masjid% or Surah Al-Kahf @10%
    // Use local timePeriod state to choose behavior. Home Mode swaps Masjid% with Surah Al-Kahf consistency when available
    let specialMetric = stats.masjidPercentage || 0;
    if (stats.masjidMode) {
      // Prefer surahAlKahfConsistency if provided; otherwise fallback to consistency
      const surah = (stats.surahAlKahfConsistency != null) ? stats.surahAlKahfConsistency : null;
      specialMetric = (surah != null) ? surah : (stats.consistency || 0);
    }
    specialMetric = Math.max(0, Math.min(specialMetric, 100));
    const specialComp = specialMetric * 0.10;

    // 5) Days Tracked (timeframe-aware cap) @15%
    const now = new Date();
    let cap = 60; // default
    if (timePeriod === 'week') cap = 7;
    else if (timePeriod === 'month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      cap = new Date(year, month + 1, 0).getDate();
    } else if (timePeriod === 'year') cap = 60;
    else if (timePeriod === 'all') cap = 60;
    const daysTrackedNorm = Math.min((stats.totalDays || 0) / cap, 1) * 100;
    const daysTrackedComp = daysTrackedNorm * 0.15;

    const total = avgComp + consComp + streakComp + specialComp + daysTrackedComp;
    return Math.round(total * 100) / 100;
  };

  const calculateUserScore = async (userId, period) => {
    try {
      const currentDate = new Date();
      
      // Fetch user's Masjid Mode setting
      let masjidMode = false;
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          masjidMode = userDoc.data().masjidMode || false;
        }
      } catch (error) {
        console.error('Error fetching user masjid mode:', error);
        // Default to false if error occurs
      }
      
      let stats = { 
        totalScore: 0, 
        totalDays: 0, 
        averageScore: 0,
        consistency: 0,
        currentStreak: 0,
        bestStreak: 0,
        masjidPercentage: 0,
        surahAlKahfConsistency: 0,
        prayerBreakdown: {},
        trend: 'stable' // 'improving', 'declining', 'stable'
      };

      if (period === 'week') {
        // Last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
        
        const prayerData = await getPrayerDataInRange(userId, startDate, endDate);
        stats = calculatePrayerStats(prayerData, masjidMode);
      } else if (period === 'month') {
        // Current month
        const monthStats = await getMonthlyStats(userId, currentDate.getFullYear(), currentDate.getMonth() + 1, masjidMode);
        stats = monthStats;
      } else if (period === 'year') {
        // Current year
        const yearStats = await getYearlyStats(userId, currentDate.getFullYear(), masjidMode);
        stats = yearStats;
      } else {
        // All time - calculate from last 2 years
        let allTimeStats = { 
          totalScore: 0, 
          totalDays: 0, 
          consistency: 0,
          currentStreak: 0,
          bestStreak: 0,
          masjidPercentage: 0,
          surahAlKahfConsistency: 0,
          prayerBreakdown: {},
          totalPrayers: 0
        };
        
        for (let year = currentDate.getFullYear() - 1; year <= currentDate.getFullYear(); year++) {
          const yearStats = await getYearlyStats(userId, year, masjidMode);
          allTimeStats.totalScore += yearStats.totalScore;
          allTimeStats.totalDays += yearStats.totalDays;
          allTimeStats.totalPrayers += yearStats.totalPrayers;
          
          // Take the best values for streaks
          allTimeStats.bestStreak = Math.max(allTimeStats.bestStreak, yearStats.bestStreak || 0);
          allTimeStats.currentStreak = yearStats.currentStreak || 0; // Use most recent
          
          // Aggregate prayer breakdown
          Object.keys(yearStats.prayerBreakdown || {}).forEach(status => {
            allTimeStats.prayerBreakdown[status] = (allTimeStats.prayerBreakdown[status] || 0) + yearStats.prayerBreakdown[status];
          });
        }
        
        // Calculate derived metrics
        allTimeStats.averageScore = allTimeStats.totalDays > 0 ? allTimeStats.totalScore / allTimeStats.totalDays : 0;
        allTimeStats.consistency = allTimeStats.totalPrayers > 0 ? 
          ((allTimeStats.totalPrayers - (allTimeStats.prayerBreakdown['Not Prayed'] || 0)) / allTimeStats.totalPrayers) * 100 : 0;
        allTimeStats.masjidPercentage = allTimeStats.totalPrayers > 0 ? 
          ((allTimeStats.prayerBreakdown['masjid'] || 0) / allTimeStats.totalPrayers) * 100 : 0;
        
        // Debug logging for masjid percentage
        console.log('Debug - User:', userId, 'Total prayers:', allTimeStats.totalPrayers, 'Masjid prayers:', allTimeStats.prayerBreakdown['masjid'], 'Percentage:', allTimeStats.masjidPercentage);
        
        stats = allTimeStats;
      }

      // Calculate trend (compare with previous period)
      try {
        let previousStats;
        if (period === 'week') {
          const prevEndDate = new Date();
          prevEndDate.setDate(prevEndDate.getDate() - 7);
          const prevStartDate = new Date();
          prevStartDate.setDate(prevStartDate.getDate() - 13);
          const prevPrayerData = await getPrayerDataInRange(userId, prevStartDate, prevEndDate);
          previousStats = calculatePrayerStats(prevPrayerData, masjidMode);
        } else if (period === 'month') {
          const prevMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
          const prevYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
          previousStats = await getMonthlyStats(userId, prevYear, prevMonth, masjidMode);
        }
        
        if (previousStats && previousStats.averageScore > 0) {
          const improvement = ((stats.averageScore - previousStats.averageScore) / previousStats.averageScore) * 100;
          if (improvement > 5) {
            stats.trend = 'improving';
          } else if (improvement < -5) {
            stats.trend = 'declining';
          } else {
            stats.trend = 'stable';
          }
        }
      } catch (trendError) {
        // If trend calculation fails, default to stable
        stats.trend = 'stable';
      }

      // Calculate days since last activity
      stats.daysSinceLastActivity = await calculateDaysSinceLastActivity(userId);

      // Calculate composite ranking score
      stats.compositeScore = calculateCompositeScore(stats);
      
      return stats;
    } catch (error) {
      console.error('Error calculating user score:', error);
      return { 
        totalScore: 0, 
        totalDays: 0, 
        averageScore: 0,
        consistency: 0,
        currentStreak: 0,
        bestStreak: 0,
        masjidPercentage: 0,
        surahAlKahfConsistency: 0,
        prayerBreakdown: {},
        trend: 'stable',
        compositeScore: 0,
        daysSinceLastActivity: 999
      };
    }
  };

  const fetchLeaderboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersWithScores = await Promise.all(
        usersSnapshot.docs.map(async (userDoc) => {
          const userData = userDoc.data();
          const userId = userDoc.id;
          const stats = await calculateUserScore(userId, timePeriod);
          
          return {
            id: userId,
            nickname: userData.nickname || 'Anonymous',
            email: userData.email,
            isPrivate: userData.isPrivate || false,
            masjidMode: userData.masjidMode || false,
            ...stats
          };
        })
      );

      // Filter by masjid mode if needed
      let filteredUsers = usersWithScores;
      if (masjidModeFilter === 'on') {
        filteredUsers = usersWithScores.filter(user => user.masjidMode === true);
      } else if (masjidModeFilter === 'off') {
        filteredUsers = usersWithScores.filter(user => user.masjidMode === false);
      }

      // Define activity criteria - always use all-time approach to avoid marking active users as inactive
      const getActivityThreshold = () => {
        // Use consistent all-time criteria regardless of current filter
        // This prevents users from being marked inactive at the start of new periods
        return { 
          minDays: 7,      // Must have tracked at least 7 days total (all-time)
          inactiveDays: 14 // Inactive if no activity in last 14 days (regardless of filter)
        };
      };

      const { minDays, inactiveDays } = getActivityThreshold();

      // Separate active and inactive users
      const activeUsers = [];
      const inactiveUsers = [];

      // Get all-time stats for activity determination
      const usersWithAllTimeActivity = await Promise.all(
        filteredUsers.map(async (user) => {
          try {
            // Get all-time total days for this user (not filtered by current period)
            const allTimeStats = await calculateUserScore(user.id, 'all');
            return {
              ...user,
              allTimeTotalDays: allTimeStats.totalDays || 0
            };
          } catch (error) {
            console.error('Error fetching all-time stats for user:', user.id, error);
            return {
              ...user,
              allTimeTotalDays: 0
            };
          }
        })
      );

      usersWithAllTimeActivity.forEach(user => {
        // Use all-time total days for activity check, not filtered period days
        const isActive = user.allTimeTotalDays >= minDays && user.daysSinceLastActivity <= inactiveDays;
        // Store the activity status on the user object for later use in rendering
        user.isActiveUser = isActive;
        
        if (isActive) {
          activeUsers.push(user);
        } else {
          inactiveUsers.push(user);
        }
      });

      // Sort active users by composite score
      const sortedActiveUsers = activeUsers.sort((a, b) => {
        if (b.compositeScore !== a.compositeScore) {
          return b.compositeScore - a.compositeScore;
        }
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }
        if (b.currentStreak !== a.currentStreak) {
          return b.currentStreak - a.currentStreak;
        }
        return b.totalDays - a.totalDays;
      });

      // Sort inactive users by total days (to show most committed inactive users first)
      const sortedInactiveUsers = inactiveUsers.sort((a, b) => {
        if (b.totalDays !== a.totalDays) {
          return b.totalDays - a.totalDays;
        }
        return b.compositeScore - a.compositeScore;
      });

      // Combine: active users first, then inactive users
      const sortedUsers = [...sortedActiveUsers, ...sortedInactiveUsers];

      // Filter out private users for global leaderboard
      const publicUsers = sortedUsers.filter(user => !user.isPrivate);

      // Find current user's rank (in the full sorted list, including private users)
      const currentUserIndex = sortedUsers.findIndex(user => user.id === currentUser.uid);
      const currentUserData = sortedUsers[currentUserIndex];
      
      setCurrentUserStats(currentUserData);
      setCurrentUserRank(currentUserIndex >= 0 ? currentUserIndex + 1 : null);
      
      // Take top 100 for global leaderboard (filtered by privacy and masjid mode)
      setLeaderboardData(publicUsers.slice(0, 100));
      
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod, masjidModeFilter, currentUser?.uid]);


  const fetchUserFriends = useCallback(async () => {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const friends = userData.friends || [];
        
        // Remove duplicates and clean up friends array
        const uniqueFriends = [...new Set(friends)].filter(friend => friend && friend.trim());
        
        // Validate that all friends actually exist and have mutual friendship
        const validatedFriends = [];
        const currentUserNickname = await getUserNickname(currentUser.uid);
        
        for (const friendNickname of uniqueFriends) {
          try {
            // Check if friend exists
            const usersRef = collection(db, 'users');
            const friendQuery = query(usersRef, where('nickname', '==', friendNickname));
            const friendSnapshot = await getDocs(friendQuery);
            
            if (!friendSnapshot.empty) {
              const friendDoc = friendSnapshot.docs[0];
              const friendData = friendDoc.data();
              const friendFriends = friendData.friends || [];
              
              // Check if friendship is mutual
              if (friendFriends.includes(currentUserNickname)) {
                validatedFriends.push(friendNickname);
              } else {
                console.log(`Removing non-mutual friend: ${friendNickname}`);
              }
            } else {
              console.log(`Removing non-existent friend: ${friendNickname}`);
            }
          } catch (error) {
            console.error(`Error validating friend ${friendNickname}:`, error);
          }
        }
        
        // Update Firestore if we found issues
        if (validatedFriends.length !== friends.length) {
          console.log('Cleaning up friends list:', { 
            original: friends, 
            afterDedup: uniqueFriends,
            afterValidation: validatedFriends 
          });
          await updateDoc(userDocRef, { friends: validatedFriends });
        }
        
        setUserFriends(validatedFriends);
        
        // Fetch friends' data
        if (validatedFriends.length > 0) {
          const friendsWithScores = await Promise.all(
            validatedFriends.map(async (friendNickname) => {
              // Find user by nickname
              const usersRef = collection(db, 'users');
              const friendQuery = query(usersRef, where('nickname', '==', friendNickname));
              const friendSnapshot = await getDocs(friendQuery);
              
              if (!friendSnapshot.empty) {
                const friendDoc = friendSnapshot.docs[0];
                const friendData = friendDoc.data();
                const stats = await calculateUserScore(friendDoc.id, timePeriod);
                
                return {
                  id: friendDoc.id,
                  nickname: friendData.nickname,
                  averageScore: stats.averageScore,
                  totalDays: stats.totalDays,
                  totalScore: stats.totalScore,
                  consistency: stats.consistency,
                  currentStreak: stats.currentStreak,
                  bestStreak: stats.bestStreak,
                  masjidPercentage: stats.masjidPercentage,
                  trend: stats.trend,
                  compositeScore: stats.compositeScore
                };
              }
              return null;
            })
          );
          
          const validFriends = friendsWithScores
            .filter(friend => friend !== null) // Only filter out null friends, keep all others
            .sort((a, b) => {
              // Primary: Composite Score
              if (b.compositeScore !== a.compositeScore) {
                return b.compositeScore - a.compositeScore;
              }
              // Tiebreaker 1: Average Score
              if (b.averageScore !== a.averageScore) {
                return b.averageScore - a.averageScore;
              }
              // Tiebreaker 2: Current Streak
              if (b.currentStreak !== a.currentStreak) {
                return b.currentStreak - a.currentStreak;
              }
              // Tiebreaker 3: Total Days
              return b.totalDays - a.totalDays;
            });
          
          setFriendsData(validFriends);
        }
      }
    } catch (error) {
      console.error('Error fetching user friends:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, getUserNickname]);

  const fetchFriendRequests = useCallback(async () => {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const sentRequests = userData.friendRequestsSent || [];
        const receivedRequests = userData.friendRequestsReceived || [];
        
        // Remove duplicates from friend requests too
        const uniqueSentRequests = [...new Set(sentRequests)];
        const uniqueReceivedRequests = [...new Set(receivedRequests)];
        
        // Validate that all sent/received request users actually exist
        const validatedSentRequests = [];
        const validatedReceivedRequests = [];
        
        // Check sent requests
        for (const userId of uniqueSentRequests) {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              validatedSentRequests.push(userId);
            } else {
              console.log(`Removing orphaned sent request to deleted user: ${userId}`);
            }
          } catch (error) {
            console.error(`Error validating sent request user ${userId}:`, error);
          }
        }
        
        // Check received requests
        for (const userId of uniqueReceivedRequests) {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              validatedReceivedRequests.push(userId);
            } else {
              console.log(`Removing orphaned received request from deleted user: ${userId}`);
            }
          } catch (error) {
            console.error(`Error validating received request user ${userId}:`, error);
          }
        }
        
        // Update if we found issues (duplicates or orphaned requests)
        if (validatedSentRequests.length !== sentRequests.length || 
            validatedReceivedRequests.length !== receivedRequests.length) {
          console.log('Cleaning up friend requests:', { 
            sentOriginal: sentRequests, 
            sentAfterDedup: uniqueSentRequests,
            sentAfterValidation: validatedSentRequests,
            receivedOriginal: receivedRequests,
            receivedAfterDedup: uniqueReceivedRequests,
            receivedAfterValidation: validatedReceivedRequests
          });
          await updateDoc(userDocRef, { 
            friendRequestsSent: validatedSentRequests,
            friendRequestsReceived: validatedReceivedRequests
          });
        }
        
        // Set validated friend requests state
        
        setFriendRequestsSent(validatedSentRequests);
        setFriendRequestsReceived(validatedReceivedRequests);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  }, [currentUser?.uid]);

  const searchUsers = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const matchingUsers = [];
      const currentUserNickname = await getUserNickname(currentUser.uid);
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        const nickname = userData.nickname || '';
        const userId = doc.id;
        
        // Search by nickname (case insensitive) - exclude current user and existing friends
        if (nickname.toLowerCase().includes(searchTerm.toLowerCase()) && 
            userId !== currentUser.uid && 
            !userFriends.includes(nickname)) {
          matchingUsers.push({
            id: doc.id,
            nickname: userData.nickname,
            email: userData.email,
            displayName: userData.displayName
          });
        }
      });
      
      setSearchResults(matchingUsers.slice(0, 5)); // Limit to 5 results
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [currentUser?.uid, getUserNickname, userFriends]);

  // Unused function - commented out to fix ESLint warnings
  // const addFriendByUser = async (friendUser) => {
  //   try {
  //     const userDocRef = doc(db, 'users', currentUser.uid);
  //     await updateDoc(userDocRef, {
  //       friends: arrayUnion(friendUser.nickname)
  //     });
  //     setAddFriendInput('');
  //     setSearchResults([]);
  //     fetchUserFriends();
  //     alert(`Added ${friendUser.nickname} as a friend!`);
  //   } catch (error) {
  //     console.error('Error adding friend:', error);
  //     alert('Failed to add friend. Please try again.');
  //   }
  // };

  const sendFriendRequest = useCallback(async (userToAdd) => {
    try {
      const currentUserNickname = await getUserNickname(currentUser.uid);
      
      // Check if trying to add themselves
      if (userToAdd.nickname === currentUserNickname) {
        showNotification('error', 'You cannot send a friend request to yourself');
        return;
      }
      
      // Check if already friends
      if (userFriends.includes(userToAdd.nickname)) {
        showNotification('error', 'Already friends with this user');
        return;
      }
      
      // Check if request already sent
      if (friendRequestsSent.includes(userToAdd.id)) {
        showNotification('error', 'Friend request already sent to this user');
        return;
      }
      
      // Send friend request
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      const targetUserDocRef = doc(db, 'users', userToAdd.id);
      
      // Update both users' documents
      await updateDoc(currentUserDocRef, {
        friendRequestsSent: arrayUnion(userToAdd.id)
      });
      
      await updateDoc(targetUserDocRef, {
        friendRequestsReceived: arrayUnion(currentUser.uid)
      });
      
      fetchFriendRequests(); // Refresh friend requests
      showNotification('success', `Friend request sent to ${userToAdd.nickname}!`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      showNotification('error', 'Failed to send friend request. Please try again.');
    }
  }, [currentUser?.uid, getUserNickname, userFriends, friendRequestsSent, fetchFriendRequests, showNotification]);

  const acceptFriendRequest = useCallback(async (requesterId) => {
    try {
      const currentUserNickname = await getUserNickname(currentUser.uid);
      
      // Get requester's data
      const requesterDocRef = doc(db, 'users', requesterId);
      const requesterDoc = await getDoc(requesterDocRef);
      
      if (!requesterDoc.exists()) {
        showNotification('error', 'User not found');
        return;
      }
      
      const requesterData = requesterDoc.data();
      const requesterNickname = requesterData.nickname;
      
      // Update both users to be friends and clean up ALL mutual requests
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      
      // Clean up the received request and any sent request to the same user
      await updateDoc(currentUserDocRef, {
        friends: arrayUnion(requesterNickname),
        friendRequestsReceived: arrayRemove(requesterId),
        friendRequestsSent: arrayRemove(requesterId) // Remove any sent request to this user
      });
      
      // Clean up the sent request and any received request from the same user
      await updateDoc(requesterDocRef, {
        friends: arrayUnion(currentUserNickname),
        friendRequestsSent: arrayRemove(currentUser.uid),
        friendRequestsReceived: arrayRemove(currentUser.uid) // Remove any received request from this user
      });
      
      fetchUserFriends();
      fetchFriendRequests();
      showNotification('success', `You and ${requesterNickname} are now friends!`);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showNotification('error', 'Failed to accept friend request. Please try again.');
    }
  }, [currentUser?.uid, getUserNickname, fetchUserFriends, fetchFriendRequests, showNotification]);

  const declineFriendRequest = async (requesterId) => {
    try {
      // Remove request from both users
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      const requesterDocRef = doc(db, 'users', requesterId);
      
      await updateDoc(currentUserDocRef, {
        friendRequestsReceived: arrayRemove(requesterId)
      });
      
      await updateDoc(requesterDocRef, {
        friendRequestsSent: arrayRemove(currentUser.uid)
      });
      
      fetchFriendRequests();
      showNotification('success', 'Friend request declined');
    } catch (error) {
      console.error('Error declining friend request:', error);
      showNotification('error', 'Failed to decline friend request. Please try again.');
    }
  };

  const withdrawFriendRequest = async (userId) => {
    try {
      // Get the target user's data to show their nickname in the notification
      const targetUserDoc = await getDoc(doc(db, 'users', userId));
      const targetUserNickname = targetUserDoc.exists() ? targetUserDoc.data().nickname : 'user';
      
      // Remove request from both users
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      const targetUserDocRef = doc(db, 'users', userId);
      
      await updateDoc(currentUserDocRef, {
        friendRequestsSent: arrayRemove(userId)
      });
      
      await updateDoc(targetUserDocRef, {
        friendRequestsReceived: arrayRemove(currentUser.uid)
      });
      
      fetchFriendRequests();
      showNotification('success', `Friend request to ${targetUserNickname} withdrawn`);
    } catch (error) {
      console.error('Error withdrawing friend request:', error);
      showNotification('error', 'Failed to withdraw friend request. Please try again.');
    }
  };

  const removeFriend = async (friendNickname) => {
    try {
      const currentUserNickname = await getUserNickname(currentUser.uid);
      
      // Find friend's user ID
      const usersRef = collection(db, 'users');
      const friendQuery = query(usersRef, where('nickname', '==', friendNickname));
      const friendSnapshot = await getDocs(friendQuery);
      
      if (friendSnapshot.empty) {
        showNotification('error', 'Friend not found');
        return;
      }
      
      const friendDoc = friendSnapshot.docs[0];
      const friendId = friendDoc.id;
      
      // Remove from both users' friends lists
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      const friendDocRef = doc(db, 'users', friendId);
      
      await updateDoc(currentUserDocRef, {
        friends: arrayRemove(friendNickname)
      });
      
      await updateDoc(friendDocRef, {
        friends: arrayRemove(currentUserNickname)
      });
      
      fetchUserFriends();
      showNotification('success', `${friendNickname} has been removed from your friends list`);
    } catch (error) {
      console.error('Error removing friend:', error);
      showNotification('error', 'Failed to remove friend. Please try again.');
    }
  };



  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getProfileIcon = (nickname) => {
    const initials = nickname.slice(0, 2).toUpperCase();
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const colorIndex = nickname.length % colors.length;
    
    return (
      <div className={`w-10 h-10 rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-sm`}>
        {initials}
      </div>
    );
  };

  const formatTimePeriod = (period) => {
    switch (period) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'all': return 'All Time';
      default: return 'This Month';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" title="Improving performance" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" title="Declining performance" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" title="Stable performance" />;
    }
  };

  const getStreakBadge = (streak) => {
    if (streak === 0) return null;
    
    const getBadgeColor = (days) => {
      if (days >= 30) return 'bg-purple-100 text-purple-800 border-purple-200';
      if (days >= 14) return 'bg-orange-100 text-orange-800 border-orange-200';
      if (days >= 7) return 'bg-blue-100 text-blue-800 border-blue-200';
      return 'bg-green-100 text-green-800 border-green-200';
    };

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(streak)}`}>
        <Flame className="w-3 h-3" />
        {streak}d
      </div>
    );
  };

  const getConsistencyBadge = (consistency) => {
    if (consistency === 0) return null;
    
    const getBadgeColor = (percent) => {
      if (percent >= 80) return 'bg-green-100 text-green-800 border-green-200';
      if (percent >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
      if (percent >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-red-100 text-red-800 border-red-200';
    };

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(consistency)}`}>
        <Target className="w-3 h-3" />
        {consistency.toFixed(0)}%
      </div>
    );
  };

  const getLastTrackedBadge = (daysSince) => {
    if (daysSince === undefined || daysSince === null) return null;
    
    const getBadgeColor = (days) => {
      if (days === 0) return 'bg-green-100 text-green-800 border-green-200';
      if (days <= 2) return 'bg-blue-100 text-blue-800 border-blue-200';
      if (days <= 7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-red-100 text-red-800 border-red-200';
    };

    const getDisplayText = (days) => {
      if (days === 0) return 'Today';
      if (days === 1) return '1d ago';
      if (days <= 7) return `${days}d ago`;
      if (days <= 30) return `${days}d ago`;
      return '30+ days';
    };

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(daysSince)}`}>
        <Clock className="w-3 h-3" />
        {getDisplayText(daysSince)}
      </div>
    );
  };

  const getMasjidBadge = (masjidPercentage) => {
    if (masjidPercentage === 0) return null;
    
    const getBadgeColor = (percent) => {
      if (percent >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
      if (percent >= 25) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      return 'bg-slate-100 text-slate-800 border-slate-200';
    };

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(masjidPercentage)}`}>
        <Zap className="w-3 h-3" />
        {masjidPercentage.toFixed(0)}%
      </div>
    );
  };

  // Component for rendering received friend requests
  const FriendRequestItem = ({ requesterId }) => {
    const [requesterData, setRequesterData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchRequesterData = async () => {
        try {
          const requesterDoc = await getDoc(doc(db, 'users', requesterId));
          if (requesterDoc.exists()) {
            setRequesterData({ id: requesterId, ...requesterDoc.data() });
          }
        } catch (error) {
          console.error('Error fetching requester data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchRequesterData();
    }, [requesterId]);

    if (loading) {
      return (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-white border-gray-200 dark:bg-black dark:border-gray-800">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-24"></div>
              <div className="h-3 bg-gray-300 rounded w-32"></div>
            </div>
          </div>
        </div>
      );
    }

    if (!requesterData) return null;

    return (
      <div className="p-3 sm:p-4 rounded-lg border bg-white border-gray-200 dark:bg-black dark:border-gray-800">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {getProfileIcon(requesterData.nickname)}
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-gray-800 truncate">{requesterData.nickname}</h4>
              <p className="text-xs text-gray-400">Wants to be your friend</p>
            </div>
          </div>
          
          {/* Mobile: Full width buttons, Desktop: Compact buttons */}
          <div className="flex gap-2 sm:flex-shrink-0">
            <button
              onClick={() => acceptFriendRequest(requesterId)}
              className="flex-1 sm:flex-none px-4 py-2 sm:px-3 sm:py-1 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => declineFriendRequest(requesterId)}
              className="flex-1 sm:flex-none px-4 py-2 sm:px-3 sm:py-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Component for rendering sent friend requests
  const SentRequestItem = ({ userId }) => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setUserData({ id: userId, ...userDoc.data() });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }, [userId]);

    if (loading) {
      return (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-black dark:border-gray-800">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-24"></div>
              <div className="h-3 bg-gray-300 rounded w-32"></div>
            </div>
          </div>
        </div>
      );
    }

    if (!userData) return null;

    return (
      <div className="p-3 sm:p-4 rounded-lg border bg-gray-50 border-gray-200 dark:bg-black dark:border-gray-800">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {getProfileIcon(userData.nickname)}
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-gray-800 truncate">{userData.nickname}</h4>
              <p className="text-xs text-gray-400">Request pending...</p>
            </div>
          </div>
          
          {/* Mobile: Full width layout, Desktop: Compact layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3">
            <div className="text-center sm:text-right">
              <span className="px-4 py-2 sm:px-3 sm:py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-lg">
                Pending
              </span>
            </div>
            
            <button
              onClick={() => withdrawFriendRequest(userId)}
              className="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
              title="Withdraw friend request"
            >
              <X className="w-3 h-3" />
              <span className="sm:hidden">Withdraw Request</span>
              <span className="hidden sm:inline">Withdraw</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLeaderboardItem = (user, rank, isCurrentUser = false, showAddButton = false, isInactive = false) => {
    // Special styling for top 3 positions
    const getTopThreeStyle = () => {
      if (rank === 1) {
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-lg dark:from-black dark:to-black dark:border-gray-700';
      } else if (rank === 2) {
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md dark:from-black dark:to-black dark:border-gray-700';
      } else if (rank === 3) {
        return 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 shadow-md dark:from-black dark:to-black dark:border-gray-700';
      }
      return '';
    };

    const cardStyle = rank <= 3 
      ? getTopThreeStyle()
      : isCurrentUser 
        ? 'bg-primary-50 border-primary-200 shadow-md dark:bg-[#0a0a0a] dark:border-primary-900'
        : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-black dark:border-gray-800 dark:hover:bg-[#0a0a0a]';

    return (
      <div 
        key={user.id} 
        className={`p-3 sm:p-4 rounded-lg border transition-colors ${cardStyle} glass-card`}
      >
      {/* Desktop: Two-column layout with score on right */}
      <div className={`hidden sm:flex items-start justify-between ${isInactive ? 'opacity-75' : ''}`}>
        <div className="flex items-center gap-4">
          {getRankIcon(rank)}
          {getProfileIcon(user.nickname)}
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-semibold ${
                isCurrentUser ? 'text-primary-800' : 'text-gray-800'
              }`}>
                {user.nickname}
                {isCurrentUser && <span className="text-primary-600 ml-2 text-sm">(You)</span>}
              </h3>
              {user.trend && getTrendIcon(user.trend)}
            </div>
            <p className="text-sm text-gray-500">{user.totalDays} days tracked</p>
          </div>
        </div>
        
        {/* Score - Desktop */}
        <div className="text-right">
          <p className={`text-2xl font-bold ${
            isCurrentUser ? 'text-primary-600' : 'text-gray-800'
          }`}>
            {user.compositeScore ? user.compositeScore.toFixed(1) : (user.averageScore || 0).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">
            {user.compositeScore ? 'composite score' : 'avg score'}
          </p>
          {user.compositeScore && (
            <p className="text-xs text-gray-400">
              avg: {(user.averageScore || 0).toFixed(1)}
            </p>
          )}
        </div>
      </div>

      {/* Mobile: Compact single-row layout */}
      <div className={`flex sm:hidden items-center justify-between ${isInactive ? 'opacity-75' : ''}`}>
        <div className="flex items-center gap-2">
          {getRankIcon(rank)}
          {getProfileIcon(user.nickname)}
          <div>
            <div className="flex items-center gap-1">
              <h3 className={`text-sm font-semibold ${
                isCurrentUser ? 'text-primary-800' : 'text-gray-800'
              }`}>
                {user.nickname}
                {isCurrentUser && <span className="text-primary-600 ml-1 text-xs">(You)</span>}
              </h3>
              {user.trend && getTrendIcon(user.trend)}
            </div>
            <p className="text-xs text-gray-500">{user.totalDays} days</p>
          </div>
        </div>
        
        {/* Score - Mobile */}
        <div className="text-right">
          <p className={`text-lg font-bold ${
            isCurrentUser ? 'text-primary-600' : 'text-gray-800'
          }`}>
            {user.compositeScore ? user.compositeScore.toFixed(1) : (user.averageScore || 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">
            {user.compositeScore ? 'composite' : 'avg'}
          </p>
          {user.compositeScore && (
            <p className="text-xs text-gray-400">
              avg: {(user.averageScore || 0).toFixed(1)}
            </p>
          )}
        </div>
      </div>
        
      {/* Metrics Row */}
      {user.totalDays > 0 && (
        <div className={`flex items-center gap-2 sm:gap-3 mt-3 ${isInactive ? 'opacity-75' : ''}`}>
          {/* Current Streak */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-gray-400 font-medium">Current</span>
            {user.currentStreak > 0 ? (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                <Flame className="w-3 h-3" />
                {user.currentStreak}d
              </div>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-300 px-2 py-1 bg-gray-50 dark:bg-[#0a0a0a] rounded-full border border-gray-200 dark:border-gray-700">0d</span>
            )}
          </div>
          
          {/* Best Streak (only if different from current) */}
          {user.bestStreak > 0 && user.bestStreak !== user.currentStreak && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs text-gray-400 font-medium">Best</span>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                <Trophy className="w-3 h-3" />
                {user.bestStreak}d
              </div>
            </div>
          )}
          
          {/* Consistency Badge */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-gray-400 font-medium">Consistency</span>
            {getConsistencyBadge(user.consistency)}
          </div>
          
          {/* Masjid Percentage - only show for users not in masjid mode */}
          {!user.masjidMode && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs text-gray-400 font-medium">Masjid</span>
              {user.masjidPercentage > 0 ? getMasjidBadge(user.masjidPercentage) : (
                <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-full border">0%</span>
              )}
            </div>
          )}
          
          {/* Last Tracked */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-gray-400 font-medium">Last</span>
            {getLastTrackedBadge(user.daysSinceLastActivity)}
          </div>
        </div>
      )}
      
      {/* Action Buttons Row - Show for all users except current user */}
      {!isCurrentUser && (
        <div className="flex justify-center mt-3">
          {userFriends.includes(user.nickname) ? (
            // Already friends - show remove button
            <button
              onClick={() => removeFriend(user.nickname)}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
              title={`Remove ${user.nickname} from friends`}
            >
              <UserPlus className="w-3 h-3 rotate-45" />
              Remove Friend
            </button>
          ) : friendRequestsSent.includes(user.id) ? (
            // Request already sent - show withdraw button
            <button
              onClick={() => withdrawFriendRequest(user.id)}
              className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-1"
              title="Withdraw friend request"
            >
              <X className="w-3 h-3" />
              Withdraw Request
            </button>
          ) : friendRequestsReceived.includes(user.id) ? (
            // Received request from this user - show accept/decline
            <div className="flex gap-2">
              <button
                onClick={() => acceptFriendRequest(user.id)}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                title={`Accept friend request from ${user.nickname}`}
              >
                <UserPlus className="w-3 h-3" />
                Accept
              </button>
              <button
                onClick={() => declineFriendRequest(user.id)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                title={`Decline friend request from ${user.nickname}`}
              >
                <X className="w-3 h-3" />
                Decline
              </button>
            </div>
          ) : (
            // No relationship - show add friend button
            <button
              onClick={() => sendFriendRequest(user)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
              title={`Send friend request to ${user.nickname}`}
            >
              <UserPlus className="w-3 h-3" />
              Add Friend
            </button>
          )}
        </div>
      )}
    </div>
    );
  };

  if (!currentUser) {
    return <div>Please log in to view the leaderboard.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-2 sm:right-4 left-2 sm:left-auto z-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg border transition-all duration-300 text-sm sm:text-base ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-800 dark:text-green-200' 
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900 dark:border-red-800 dark:text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500 flex items-center justify-center dark:bg-green-700">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full dark:bg-black"></div>
              </div>
            ) : (
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500 flex items-center justify-center dark:bg-red-700">
                <div className="w-2.5 h-0.5 sm:w-3 sm:h-0.5 bg-white rounded dark:bg-black"></div>
              </div>
            )}
            <span className="font-medium flex-1">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-gray-400 hover:text-gray-600 text-lg sm:text-xl dark:text-gray-300 dark:hover:text-gray-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          Leaderboard
        </h1>
        <p className="text-primary-100 text-sm sm:text-base">See how you rank among the community</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-purple-100 dark:bg-black dark:border-gray-800">
        <div className="flex flex-col gap-4 items-start justify-between">
          {/* Tab Selection */}
          <div className="flex flex-wrap gap-1 sm:gap-2 w-full">
            <button
              onClick={() => setActiveTab('global')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none min-w-0 ${
                activeTab === 'global'
                  ? 'bg-primary-600 text-white dark:bg-primary-800 dark:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#0a0a0a] dark:text-gray-200 dark:hover:bg-[#111]'
              }`}
            >
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Global</span>
              <span className="sm:hidden truncate">Global</span>
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none min-w-0 ${
                activeTab === 'friends'
                  ? 'bg-primary-600 text-white dark:bg-primary-800 dark:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#0a0a0a] dark:text-gray-200 dark:hover:bg-[#111]'
              }`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Friends ({userFriends.length})</span>
              <span className="sm:hidden truncate">Friends ({userFriends.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors relative text-sm sm:text-base flex-1 sm:flex-none min-w-0 ${
                activeTab === 'requests'
                  ? 'bg-primary-600 text-white dark:bg-primary-800 dark:text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#0a0a0a] dark:text-gray-200 dark:hover:bg-[#111]'
              }`}
            >
              <Star className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Requests</span>
              <span className="sm:hidden truncate">Requests</span>
              {friendRequestsReceived.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center dark:bg-red-700">
                  {friendRequestsReceived.length}
                </span>
              )}
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Time Period Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              <select
                value={timePeriod}
                onChange={(e) => {
                  setTimePeriod(e.target.value);
                  if (currentUser) {
                    localStorage.setItem(`leaderboard_timePeriod_${currentUser.uid}`, e.target.value);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm dark:bg-black dark:text-gray-200 dark:border-gray-700"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            
            {/* Masjid Mode Filter - Only show for Global tab */}
            {activeTab === 'global' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium dark:text-gray-300">Prayer Mode:</span>
                <select
                  value={masjidModeFilter}
                  onChange={(e) => {
                    setMasjidModeFilter(e.target.value);
                    if (currentUser) {
                      localStorage.setItem(`leaderboard_masjidModeFilter_${currentUser.uid}`, e.target.value);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm dark:bg-black dark:text-gray-200 dark:border-gray-700"
                >
                  <option value="all">All Users</option>
                  <option value="off">Standard Mode</option>
                  <option value="on">Home Prayer Mode</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Add Friend Section */}
        {activeTab === 'friends' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {!showAddFriend ? (
              <button
                onClick={() => setShowAddFriend(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors dark:bg-green-800 dark:hover:bg-green-900"
              >
                <UserPlus className="w-4 h-4" />
                Add Friend
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={addFriendInput}
                    onChange={(e) => {
                      setAddFriendInput(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    placeholder="Search for friends by nickname..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-black dark:text-gray-200 dark:border-gray-700"
                  />
                  <button
                    onClick={() => {
                      setShowAddFriend(false);
                      setAddFriendInput('');
                      setSearchResults([]);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#111]"
                  >
                    Cancel
                  </button>
                </div>
                
                {/* Search Results */}
                {addFriendInput.trim() && (
                  <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto dark:bg-[#0a0a0a]">
                    {searchLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2 text-sm">Searching...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Found Users:</h4>
                        {searchResults.map(user => (
                          <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border dark:bg-[#0a0a0a] dark:border-gray-800">
                            <div className="flex items-center gap-3">
                              {getProfileIcon(user.nickname)}
                              <div>
                                <h5 className="font-semibold text-gray-800">{user.nickname}</h5>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                {user.displayName && user.displayName !== user.nickname && (
                                  <p className="text-xs text-gray-400">({user.displayName})</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => sendFriendRequest(user)}
                              className={`px-3 py-1 text-white text-sm rounded-lg transition-colors flex items-center gap-1 ${
                                friendRequestsSent.includes(user.id) 
                                  ? 'bg-gray-500 cursor-not-allowed dark:bg-gray-600' 
                                  : 'bg-green-600 hover:bg-green-700 dark:bg-green-800 dark:hover:bg-green-900'
                              }`}
                              disabled={friendRequestsSent.includes(user.id)}
                            >
                              <UserPlus className="w-3 h-3" />
                              {friendRequestsSent.includes(user.id) ? 'Request Sent' : 'Send Request'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : addFriendInput.trim() ? (
                      <div className="text-center py-6">
                        <Search className="w-6 h-6 mx-auto text-gray-400 mb-2 dark:text-gray-300" />
                        <p className="text-gray-600">No users found. Try a different nickname.</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current User Stats (if not in top list) */}
      {currentUserStats && currentUserRank && currentUserRank > 100 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Ranking</h3>
          {renderLeaderboardItem(currentUserStats, currentUserRank, true)}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {activeTab === 'global' ? 'Global Rankings' : 'Friends Rankings'} - {formatTimePeriod(timePeriod)}
          </h2>
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading rankings...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTab === 'global' ? (
              leaderboardData.length > 0 ? (
                (() => {
                  // Separate active and inactive users for display
                  const getActivityThreshold = () => {
                    // Always use consistent all-time criteria regardless of current filter
                    return { minDays: 7, inactiveDays: 14 };
                  };

                  const { minDays, inactiveDays } = getActivityThreshold();
                  const activeUsers = [];
                  const inactiveUsers = [];
                  let currentRank = 1;

                  leaderboardData.forEach(user => {
                    // Prefer previously computed all-time activity, fallback to all-time totals if present
                    const allTimeDays = (user.allTimeTotalDays !== undefined) ? user.allTimeTotalDays : user.totalDays;
                    const isActive = (user.isActiveUser !== undefined)
                      ? user.isActiveUser
                      : (allTimeDays >= minDays && user.daysSinceLastActivity <= inactiveDays);
                    if (isActive) {
                      activeUsers.push({ ...user, displayRank: currentRank++ });
                    } else {
                      inactiveUsers.push({ ...user, displayRank: currentRank++ });
                    }
                  });

                  return (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Active Users Section */}
                      {activeUsers.length > 0 && (
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-3 sm:mb-4 pb-2 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Active Users</h3>
                              <span className="text-sm text-gray-500">({activeUsers.length})</span>
                            </div>
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            {activeUsers.map(user => {
                              const isCurrentUser = user.id === currentUser.uid;
                              const canAddFriend = !isCurrentUser && !userFriends.includes(user.nickname);
                              return renderLeaderboardItem(user, user.displayRank, isCurrentUser, canAddFriend, !user.isActiveUser);
                            })}
                          </div>
                        </div>
                      )}

                      {/* Inactive Users Section */}
                      {inactiveUsers.length > 0 && (
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-3 sm:mb-4 pb-2 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                              <h3 className="text-base sm:text-lg font-semibold text-gray-600">Inactive Users</h3>
                              <span className="text-sm text-gray-500">({inactiveUsers.length})</span>
                            </div>
                            <span className="text-xs text-gray-400 sm:ml-2">
                              Less than {minDays} days tracked or inactive {inactiveDays}+ days
                            </span>
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            {inactiveUsers.map(user => {
                              const isCurrentUser = user.id === currentUser.uid;
                              const canAddFriend = !isCurrentUser && !userFriends.includes(user.nickname);
                              return renderLeaderboardItem(user, user.displayRank, isCurrentUser, canAddFriend, !user.isActiveUser);
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No users found for this time period</p>
                </div>
              )
            ) : activeTab === 'friends' ? (
              friendsData.length > 0 ? (
                <div className="space-y-6">
                  {/* Friends List */}
                  <div className="space-y-3">
                    {friendsData.map((friend, index) => (
                      <div key={friend.id} className="p-3 sm:p-4 rounded-lg border bg-white border-gray-200 hover:bg-gray-50">
                        {/* Mobile: Stack vertically, Desktop: Side by side */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className="flex-shrink-0">{getRankIcon(index + 1)}</div>
                            <div className="flex-shrink-0">{getProfileIcon(friend.nickname)}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-800 truncate">{friend.nickname}</h3>
                                {friend.trend && getTrendIcon(friend.trend)}
                              </div>
                              <p className="text-sm text-gray-500">{friend.totalDays} days tracked</p>
                            </div>
                          </div>
                          
                          {/* Mobile: Full width layout, Desktop: Compact layout */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3">
                            <div className="text-center sm:text-right">
                              <p className="text-xl sm:text-2xl font-bold text-gray-800">
                                {friend.compositeScore ? friend.compositeScore.toFixed(1) : (friend.averageScore || 0).toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {friend.compositeScore ? 'composite score' : 'avg score'}
                              </p>
                              {friend.compositeScore && (
                                <p className="text-xs text-gray-400">
                                  avg: {(friend.averageScore || 0).toFixed(1)}
                                </p>
                              )}
                            </div>
                            
                            <button
                              onClick={() => removeFriend(friend.nickname)}
                              className="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                              title={`Remove ${friend.nickname} from friends`}
                            >
                              <UserPlus className="w-3 h-3 rotate-45" />
                              <span className="sm:hidden">Remove Friend</span>
                              <span className="hidden sm:inline">Remove</span>
                            </button>
                          </div>
                        </div>
                        
                        {/* Competitive Metrics Row - Always show for users with data */}
                        {friend.totalDays > 0 && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-purple-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Always show streak (0 if no streak) */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Streak:</span>
                                {friend.currentStreak > 0 ? getStreakBadge(friend.currentStreak) : (
                                  <span className="text-xs text-gray-400">0d</span>
                                )}
                              </div>
                              
                              {/* Always show consistency */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Consistency:</span>
                                {friend.consistency > 0 ? getConsistencyBadge(friend.consistency) : (
                                  <span className="text-xs text-gray-400">0%</span>
                                )}
                              </div>
                              
                              {/* Show masjid percentage only for users not in masjid mode */}
                              {!friend.masjidMode && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Masjid:</span>
                                  {friend.masjidPercentage > 0 ? getMasjidBadge(friend.masjidPercentage) : (
                                    <span className="text-xs text-gray-400">0%</span>
                                  )}
                                </div>
                              )}
                              
                              {/* Last Tracked */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Last:</span>
                                {getLastTrackedBadge(friend.daysSinceLastActivity)}
                              </div>
                              
                              {/* Show best streak only if significantly higher than current */}
                              {friend.bestStreak > friend.currentStreak && friend.bestStreak > 7 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">Best: {friend.bestStreak}d</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Friends Metrics Bar Graph */}
                  <FriendsMetricBarGraph friends={friendsData} currentUser={currentUserStats} />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No friends added yet</p>
                  <p className="text-sm">Send friend requests to connect with others!</p>
                </div>
              )
            ) : (
              // Friend Requests Tab
              <div className="space-y-6">
                {/* Received Requests */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Friend Requests ({friendRequestsReceived.length})
                  </h3>
                  {friendRequestsReceived.length > 0 ? (
                    <div className="space-y-3">
                      {friendRequestsReceived.map(requesterId => (
                        <FriendRequestItem key={requesterId} requesterId={requesterId} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                      <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No pending friend requests</p>
                    </div>
                  )}
                </div>
                
                {/* Sent Requests */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Sent Requests ({friendRequestsSent.length})
                  </h3>
                  {friendRequestsSent.length > 0 ? (
                    <div className="space-y-3">
                      {friendRequestsSent.map(userId => (
                        <SentRequestItem key={userId} userId={userId} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No sent requests</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
