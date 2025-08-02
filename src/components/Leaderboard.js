/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Minus
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
  const [timePeriod, setTimePeriod] = useState('month'); // 'week', 'month', 'year', 'all'
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

  useEffect(() => {
    if (currentUser) {
      fetchLeaderboardData();
      fetchUserFriends();
      fetchFriendRequests();
    }
  }, [currentUser, timePeriod]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const showNotification = (type, message) => {
    setNotification({ type, message });
  };

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
    
    // Debug logging
    console.log(`Theoretical Max Calculation for ${timePeriod}:`, {
      totalDays,
      fridayCount,
      totalMaxPoints,
      theoreticalMaxAverage: theoreticalMaxAverage.toFixed(2)
    });
    
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
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mt-6">
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
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            💡 Tip: Higher bars indicate better performance in each metric
          </p>
        </div>
      </div>
    );
  };

  const calculateCompositeScore = (stats) => {
    // Weighted Composite Score Algorithm
    // Components: Average Score (50%), Consistency (25%), Current Streak (15%), Masjid % (10%)
    
    if (stats.totalDays === 0) return 0;
    
    // 1. Average Score Component (50% weight)
    // Normalize to 0-100 scale (max possible average is 135 + 10 for Surah Al-Kahf = 145)
    const maxPossibleAverage = 145;
    const averageScoreNormalized = Math.min((stats.averageScore / maxPossibleAverage) * 100, 100);
    const averageScoreComponent = averageScoreNormalized * 0.5;
    
    // 2. Consistency Component (25% weight)
    // Already in 0-100 scale
    const consistencyComponent = (stats.consistency || 0) * 0.25;
    
    // 3. Current Streak Component (15% weight)
    // Normalize streak with diminishing returns (cap at 30 days for 100%)
    const maxStreakForFull = 30;
    const streakNormalized = Math.min((stats.currentStreak / maxStreakForFull) * 100, 100);
    const streakComponent = streakNormalized * 0.15;
    
    // 4. Masjid Percentage Component (10% weight)
    // Already in 0-100 scale
    const masjidComponent = (stats.masjidPercentage || 0) * 0.1;
    
    // Calculate final composite score
    const compositeScore = averageScoreComponent + consistencyComponent + streakComponent + masjidComponent;
    
    // Add small bonus for users with significant tracking history (minimum days bonus)
    let historyBonus = 0;
    if (stats.totalDays >= 30) historyBonus = 2;
    else if (stats.totalDays >= 14) historyBonus = 1;
    else if (stats.totalDays >= 7) historyBonus = 0.5;
    
    return Math.round((compositeScore + historyBonus) * 100) / 100; // Round to 2 decimal places
  };

  const calculateUserScore = async (userId, period) => {
    try {
      const currentDate = new Date();
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
        stats = calculatePrayerStats(prayerData);
      } else if (period === 'month') {
        // Current month
        const monthStats = await getMonthlyStats(userId, currentDate.getFullYear(), currentDate.getMonth() + 1);
        stats = monthStats;
      } else if (period === 'year') {
        // Current year
        const yearStats = await getYearlyStats(userId, currentDate.getFullYear());
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
          const yearStats = await getYearlyStats(userId, year);
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
          ((allTimeStats.prayerBreakdown['Masjid'] || 0) / allTimeStats.totalPrayers) * 100 : 0;
        
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
          previousStats = calculatePrayerStats(prevPrayerData);
        } else if (period === 'month') {
          const prevMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
          const prevYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
          previousStats = await getMonthlyStats(userId, prevYear, prevMonth);
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
        compositeScore: 0
      };
    }
  };

  const fetchLeaderboardData = async () => {
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
        })
      );

      // Sort by sophisticated composite score (descending)
      const sortedUsers = usersWithScores
        .filter(user => user.totalDays > 0) // Only show users with data
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
          // Tiebreaker 3: Total Days (more experience)
          return b.totalDays - a.totalDays;
        });

      // Find current user's rank
      const currentUserIndex = sortedUsers.findIndex(user => user.id === currentUser.uid);
      const currentUserData = sortedUsers[currentUserIndex];
      
      setCurrentUserStats(currentUserData);
      setCurrentUserRank(currentUserIndex >= 0 ? currentUserIndex + 1 : null);
      
      // Take top 100 for global leaderboard
      setLeaderboardData(sortedUsers.slice(0, 100));
      
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFriends = async () => {
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
            .filter(friend => friend && friend.totalDays > 0)
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
  };

  const fetchFriendRequests = async () => {
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
        
        // Update if we found duplicates
        if (uniqueSentRequests.length !== sentRequests.length || uniqueReceivedRequests.length !== receivedRequests.length) {
          console.log('Cleaning up friend requests:', { 
            sentOriginal: sentRequests, 
            sentCleaned: uniqueSentRequests,
            receivedOriginal: receivedRequests,
            receivedCleaned: uniqueReceivedRequests
          });
          await updateDoc(userDocRef, { 
            friendRequestsSent: uniqueSentRequests,
            friendRequestsReceived: uniqueReceivedRequests
          });
        }
        
        setFriendRequestsSent(uniqueSentRequests);
        setFriendRequestsReceived(uniqueReceivedRequests);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const searchUsers = async (searchTerm) => {
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
  };

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

  const sendFriendRequest = async (userToAdd) => {
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
  };

  const acceptFriendRequest = async (requesterId) => {
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
      
      // Update both users to be friends
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      
      await updateDoc(currentUserDocRef, {
        friends: arrayUnion(requesterNickname),
        friendRequestsReceived: arrayRemove(requesterId)
      });
      
      await updateDoc(requesterDocRef, {
        friends: arrayUnion(currentUserNickname),
        friendRequestsSent: arrayRemove(currentUser.uid)
      });
      
      fetchUserFriends();
      fetchFriendRequests();
      showNotification('success', `You and ${requesterNickname} are now friends!`);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showNotification('error', 'Failed to accept friend request. Please try again.');
    }
  };

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
      if (percent >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      if (percent >= 75) return 'bg-blue-100 text-blue-800 border-blue-200';
      if (percent >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(consistency)}`}>
        <Target className="w-3 h-3" />
        {consistency.toFixed(0)}%
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
        <div className="flex items-center justify-between p-4 rounded-lg border bg-white border-gray-200">
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
      <div className="flex items-center justify-between p-4 rounded-lg border bg-white border-gray-200">
        <div className="flex items-center gap-3">
          {getProfileIcon(requesterData.nickname)}
          <div>
            <h4 className="font-semibold text-gray-800">{requesterData.nickname}</h4>
            <p className="text-sm text-gray-500">{requesterData.email}</p>
            <p className="text-xs text-gray-400">Wants to be your friend</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => acceptFriendRequest(requesterId)}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => declineFriendRequest(requesterId)}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            Decline
          </button>
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
        <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 border-gray-200">
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
      <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 border-gray-200">
        <div className="flex items-center gap-3">
          {getProfileIcon(userData.nickname)}
          <div>
            <h4 className="font-semibold text-gray-800">{userData.nickname}</h4>
            <p className="text-sm text-gray-500">{userData.email}</p>
            <p className="text-xs text-gray-400">Request pending...</p>
          </div>
        </div>
        
        <div className="text-right">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-lg">
            Pending
          </span>
        </div>
      </div>
    );
  };

  const renderLeaderboardItem = (user, rank, isCurrentUser = false, showAddButton = false) => (
    <div 
      key={user.id} 
      className={`p-4 rounded-lg border transition-colors ${
        isCurrentUser 
          ? 'bg-primary-50 border-primary-200 shadow-md' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      {/* Main Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {getRankIcon(rank)}
          {getProfileIcon(user.nickname)}
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${
                isCurrentUser ? 'text-primary-800' : 'text-gray-800'
              }`}>
                {user.nickname}
                {isCurrentUser && <span className="text-primary-600 ml-2">(You)</span>}
              </h3>
              {user.trend && getTrendIcon(user.trend)}
            </div>
            <p className="text-sm text-gray-500">{user.totalDays} days tracked</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-2xl font-bold ${
              isCurrentUser ? 'text-primary-600' : 'text-gray-800'
            }`}>
              {user.compositeScore ? user.compositeScore.toFixed(1) : user.averageScore.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">
              {user.compositeScore ? 'composite score' : 'avg score'}
            </p>
            {user.compositeScore && (
              <p className="text-xs text-gray-400">
                avg: {user.averageScore.toFixed(1)}
              </p>
            )}
          </div>
          
          {showAddButton && !isCurrentUser && (
            <button
              onClick={() => sendFriendRequest(user)}
              className={`px-3 py-1 text-white text-sm rounded-lg transition-colors flex items-center gap-1 ${
                friendRequestsSent.includes(user.id) 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              title={friendRequestsSent.includes(user.id) ? 'Request sent' : `Send friend request to ${user.nickname}`}
              disabled={friendRequestsSent.includes(user.id)}
            >
              <UserPlus className="w-3 h-3" />
              {friendRequestsSent.includes(user.id) ? 'Sent' : 'Request'}
            </button>
          )}
        </div>
      </div>
      
      {/* Competitive Metrics Row - Always show for users with data */}
      {user.totalDays > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Always show streak (0 if no streak) */}
            {/* Competitive metrics row */}
            <div className="flex items-center gap-2 mt-1">
              {/* Current Streak - Red */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-gray-400 font-medium">Current</span>
                {user.currentStreak > 0 ? (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                    <Flame className="w-3 h-3" />
                    {user.currentStreak}d
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-full border">0d</span>
                )}
              </div>
              
              {/* Best Streak - Green (only show if different from current) */}
              {user.bestStreak > 0 && user.bestStreak !== user.currentStreak && (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs text-gray-400 font-medium">Best</span>
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                    <Trophy className="w-3 h-3" />
                    {user.bestStreak}d
                  </div>
                </div>
              )}
              
              {/* Consistency */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-gray-400 font-medium">Consistency</span>
                {getConsistencyBadge(user.consistency)}
              </div>
              
              {/* Masjid Percentage */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-gray-400 font-medium">Masjid</span>
                {user.masjidPercentage > 0 ? getMasjidBadge(user.masjidPercentage) : (
                  <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-full border">0%</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!currentUser) {
    return <div>Please log in to view the leaderboard.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                <div className="w-3 h-0.5 bg-white rounded"></div>
              </div>
            )}
            <span className="font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Leaderboard
        </h1>
        <p className="text-primary-100">See how you rank among the community</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Tab Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('global')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'global'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              Global
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'friends'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Friends ({userFriends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors relative ${
                activeTab === 'requests'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Star className="w-4 h-4" />
              Requests
              {friendRequestsReceived.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {friendRequestsReceived.length}
                </span>
              )}
            </button>
          </div>

          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Add Friend Section */}
        {activeTab === 'friends' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {!showAddFriend ? (
              <button
                onClick={() => setShowAddFriend(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => {
                      setShowAddFriend(false);
                      setAddFriendInput('');
                      setSearchResults([]);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                
                {/* Search Results */}
                {addFriendInput.trim() && (
                  <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    {searchLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2 text-sm">Searching...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Found Users:</h4>
                        {searchResults.map(user => (
                          <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
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
                                  ? 'bg-gray-500 cursor-not-allowed' 
                                  : 'bg-green-600 hover:bg-green-700'
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
                      <div className="text-center py-4 text-gray-500">
                        <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No users found with nickname "{addFriendInput}"</p>
                        <p className="text-xs mt-1">Try searching with a different nickname</p>
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
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Ranking</h3>
          {renderLeaderboardItem(currentUserStats, currentUserRank, true)}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
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
                leaderboardData.map((user, index) => {
                  const isCurrentUser = user.id === currentUser.uid;
                  const canAddFriend = !isCurrentUser && !userFriends.includes(user.nickname);
                  return renderLeaderboardItem(user, index + 1, isCurrentUser, canAddFriend);
                })
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
                      <div key={friend.id} className="p-4 rounded-lg border bg-white border-gray-200 hover:bg-gray-50">
                        {/* Main Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {getRankIcon(index + 1)}
                            {getProfileIcon(friend.nickname)}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-800">{friend.nickname}</h3>
                                {friend.trend && getTrendIcon(friend.trend)}
                              </div>
                              <p className="text-sm text-gray-500">{friend.totalDays} days tracked</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-800">
                                {friend.compositeScore ? friend.compositeScore.toFixed(1) : friend.averageScore.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {friend.compositeScore ? 'composite score' : 'avg score'}
                              </p>
                              {friend.compositeScore && (
                                <p className="text-xs text-gray-400">
                                  avg: {friend.averageScore.toFixed(1)}
                                </p>
                              )}
                            </div>
                            
                            <button
                              onClick={() => removeFriend(friend.nickname)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                              title={`Remove ${friend.nickname} from friends`}
                            >
                              <UserPlus className="w-3 h-3 rotate-45" />
                              Remove
                            </button>
                          </div>
                        </div>
                        
                        {/* Competitive Metrics Row - Always show for users with data */}
                        {friend.totalDays > 0 && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
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
                              
                              {/* Always show masjid percentage */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Masjid:</span>
                                {friend.masjidPercentage > 0 ? getMasjidBadge(friend.masjidPercentage) : (
                                  <span className="text-xs text-gray-400">0%</span>
                                )}
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
