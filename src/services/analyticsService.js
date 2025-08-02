import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { PRAYER_TYPES, PRAYER_STATUS, PRAYER_SCORES, SURAH_ALKAHF, SURAH_STATUS, SURAH_SCORES, isFriday } from './prayerService';

// Get all prayer data for a user within a date range
export const getPrayerDataInRange = async (userId, startDate, endDate) => {
  try {
    // Fix timezone issue by using local date formatting
    const formatLocalDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const startDateStr = formatLocalDate(startDate);
    const endDateStr = formatLocalDate(endDate);
    
    console.log('Data Range Debug - Querying range:', { startDateStr, endDateStr });
    
    const prayersRef = collection(db, 'users', userId, 'prayers');
    const q = query(
      prayersRef,
      where('__name__', '>=', startDateStr),
      where('__name__', '<=', endDateStr),
      orderBy('__name__')
    );
    
    const querySnapshot = await getDocs(q);
    const data = {};
    
    querySnapshot.forEach((doc) => {
      data[doc.id] = doc.data();
      console.log(`Data Retrieval Debug - Document ${doc.id}:`, doc.data());
    });
    
    console.log('Data Retrieval Debug - All retrieved data:', data);
    return data;
  } catch (error) {
    console.error('Error getting prayer data in range:', error);
    throw error;
  }
};

// Calculate prayer statistics for a given period
export const calculatePrayerStats = (prayerData) => {
  const stats = {
    totalDays: Object.keys(prayerData).length,
    daysTracked: 0,
    totalScore: 0,
    maxPossibleScore: 0,
    totalPrayers: 0,
    prayerBreakdown: {
      [PRAYER_STATUS.NOT_PRAYED]: 0,
      [PRAYER_STATUS.QAZA]: 0,
      [PRAYER_STATUS.HOME]: 0,
      [PRAYER_STATUS.MASJID]: 0
    },
    prayerTypeStats: {},
    surahAlKahfStats: {
      totalFridays: 0,
      recited: 0,
      missed: 0,
      notTracked: 0,
      consistency: 0
    },
    currentStreak: 0,
    bestStreak: 0
  };

  // Initialize prayer type stats
  Object.values(PRAYER_TYPES).forEach(prayer => {
    stats.prayerTypeStats[prayer] = {
      [PRAYER_STATUS.MASJID]: 0,
      [PRAYER_STATUS.HOME]: 0,
      [PRAYER_STATUS.QAZA]: 0,
      [PRAYER_STATUS.NOT_PRAYED]: 0,
      total: 0
    };
  });

  const dates = Object.keys(prayerData).sort();
  stats.totalTrackedDays = dates.length;

  // Debug logging for Surah Al-Kahf
  console.log('Analytics Debug - Total dates in prayerData:', dates.length);
  console.log('Analytics Debug - Date range:', dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : 'No dates');

  if (dates.length === 0) return stats;

  // Calculate statistics
  let currentStreakCount = 0;
  let bestStreakCount = 0;
  let lastDateHadAllPrayers = false;

  dates.forEach(date => {
    const dayData = prayerData[date];
    // Fix timezone issue by parsing date components directly
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed
    let dayScore = 0;
    let dayPrayerCount = 0;
    let dayAllPrayersTracked = true;
    
    console.log(`Analytics Debug - Processing date: ${date}, dateObj: ${dateObj}, isFriday: ${isFriday(dateObj)}`);

    Object.values(PRAYER_TYPES).forEach(prayer => {
      // Only process prayers that are explicitly marked (not undefined/null)
      if (dayData[prayer] !== undefined && dayData[prayer] !== null && dayData[prayer] !== '') {
        const status = dayData[prayer];
        
        // Update overall breakdown
        stats.prayerBreakdown[status]++;
        
        // Update prayer type breakdown
        stats.prayerTypeStats[prayer][status]++;
        stats.prayerTypeStats[prayer].total++;
        
        // Update totals
        stats.totalPrayers++;
        dayScore += PRAYER_SCORES[status];
        
        if (status !== PRAYER_STATUS.NOT_PRAYED) {
          dayPrayerCount++;
        } else {
          dayAllPrayersTracked = false;
        }
      } else {
        // Prayer is unmarked - don't count it in any statistics
        dayAllPrayersTracked = false;
      }
    });

    // Handle Surah Al-Kahf for Fridays
    if (isFriday(dateObj)) {
      stats.surahAlKahfStats.totalFridays++;
      console.log(`Analytics Debug - Found Friday: ${date}, Day: ${dateObj.getDay()}, Surah Data:`, dayData[SURAH_ALKAHF]);
      console.log(`Analytics Debug - Full day data for ${date}:`, dayData);
      console.log(`Analytics Debug - SURAH_ALKAHF constant:`, SURAH_ALKAHF);
      
      // Check if Surah Al-Kahf data exists (not undefined and not null)
      if (dayData.hasOwnProperty(SURAH_ALKAHF) && dayData[SURAH_ALKAHF] !== null) {
        const surahStatus = dayData[SURAH_ALKAHF];
        
        // Handle empty string as not tracked (when user selects "-- Select --")
        if (surahStatus === '') {
          stats.surahAlKahfStats.notTracked++;
          console.log(`Analytics Debug - Surah Al-Kahf NOT TRACKED (empty string) on Friday ${date}`);
        } else if (surahStatus === SURAH_STATUS.RECITED) {
          stats.surahAlKahfStats.recited++;
          dayScore += SURAH_SCORES[SURAH_STATUS.RECITED];
          console.log(`Analytics Debug - Surah Al-Kahf RECITED on ${date}`);
        } else if (surahStatus === SURAH_STATUS.MISSED) {
          stats.surahAlKahfStats.missed++;
          dayScore += SURAH_SCORES[SURAH_STATUS.MISSED];
          console.log(`Analytics Debug - Surah Al-Kahf MISSED on ${date}`);
        } else {
          // Unknown status, treat as not tracked
          stats.surahAlKahfStats.notTracked++;
          console.log(`Analytics Debug - Surah Al-Kahf UNKNOWN STATUS (${surahStatus}) on Friday ${date}`);
        }
      } else {
        stats.surahAlKahfStats.notTracked++;
        console.log(`Analytics Debug - Surah Al-Kahf NOT TRACKED (no key) on Friday ${date}`);
      }
    }

    stats.totalScore += dayScore;
    stats.maxPossibleScore += PRAYER_SCORES[PRAYER_STATUS.MASJID] * 5;
    
    // Add Surah Al-Kahf to max possible score for Fridays
    if (isFriday(dateObj)) {
      stats.maxPossibleScore += SURAH_SCORES[SURAH_STATUS.RECITED];
    }

    // Calculate streaks (days with all 5 prayers as Home or Masjid - no Qaza, Not Prayed, or unmarked)
    let dayHasAllGoodPrayers = true;
    let markedPrayersCount = 0;
    
    Object.values(PRAYER_TYPES).forEach(prayer => {
      if (dayData[prayer] !== undefined && dayData[prayer] !== null && dayData[prayer] !== '') {
        const status = dayData[prayer];
        markedPrayersCount++;
        if (status === PRAYER_STATUS.NOT_PRAYED || status === PRAYER_STATUS.QAZA) {
          dayHasAllGoodPrayers = false;
        }
      } else {
        // Unmarked prayer breaks the streak
        dayHasAllGoodPrayers = false;
      }
    });
    
    // Streak only continues if all 5 prayers are marked AND all are Home/Masjid
    if (markedPrayersCount !== 5) {
      dayHasAllGoodPrayers = false;
    }
    
    if (dayHasAllGoodPrayers) {
      currentStreakCount++;
      bestStreakCount = Math.max(bestStreakCount, currentStreakCount);
      lastDateHadAllPrayers = true;
    } else {
      currentStreakCount = 0;
      lastDateHadAllPrayers = false;
    }
  });

  stats.bestStreak = bestStreakCount;
  stats.currentStreak = lastDateHadAllPrayers ? currentStreakCount : 0;
  // Calculate average score as: total daily scores / number of days with data
  stats.averageScore = stats.totalDays > 0 ? stats.totalScore / stats.totalDays : 0;
  stats.consistency = stats.totalPrayers > 0 ? ((stats.totalPrayers - stats.prayerBreakdown[PRAYER_STATUS.NOT_PRAYED]) / stats.totalPrayers) * 100 : 0;
  
  // Calculate masjid percentage (percentage of prayers prayed in masjid)
  stats.masjidPercentage = stats.totalPrayers > 0 ? (stats.prayerBreakdown[PRAYER_STATUS.MASJID] / stats.totalPrayers) * 100 : 0;
  
  // Calculate Surah Al-Kahf consistency
  if (stats.surahAlKahfStats.totalFridays > 0) {
    stats.surahAlKahfStats.consistency = (stats.surahAlKahfStats.recited / stats.surahAlKahfStats.totalFridays) * 100;
  }

  // Debug final Surah Al-Kahf stats
  console.log('Analytics Debug - Final Surah Al-Kahf Stats:', {
    totalFridays: stats.surahAlKahfStats.totalFridays,
    recited: stats.surahAlKahfStats.recited,
    missed: stats.surahAlKahfStats.missed,
    notTracked: stats.surahAlKahfStats.notTracked,
    consistency: stats.surahAlKahfStats.consistency
  });

  return stats;
};

// Get monthly statistics
export const getMonthlyStats = async (userId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  
  const prayerData = await getPrayerDataInRange(userId, startDate, endDate);
  return calculatePrayerStats(prayerData);
};

// Get yearly statistics
export const getYearlyStats = async (userId, year) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const prayerData = await getPrayerDataInRange(userId, startDate, endDate);
  return calculatePrayerStats(prayerData);
};

// Get last N days statistics
export const getRecentStats = async (userId, days = 30) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  
  const prayerData = await getPrayerDataInRange(userId, startDate, endDate);
  return calculatePrayerStats(prayerData);
};

// Get motivational insights
export const getMotivationalInsights = (stats) => {
  const insights = [];
  
  if (stats.totalTrackedDays === 0) {
    insights.push({
      type: 'encouragement',
      title: 'Start Your Journey! 🌟',
      message: 'Begin tracking your prayers today and watch your spiritual growth unfold!'
    });
    return insights;
  }

  // Consistency insights
  if (stats.consistency >= 90) {
    insights.push({
      type: 'praise',
      title: 'Outstanding Consistency! 🏆',
      message: `You've maintained ${stats.consistency.toFixed(1)}% prayer consistency. Keep up the excellent work!`
    });
  } else if (stats.consistency >= 70) {
    insights.push({
      type: 'encouragement',
      title: 'Great Progress! 💪',
      message: `${stats.consistency.toFixed(1)}% consistency is commendable. Aim for 90% to reach excellence!`
    });
  } else {
    insights.push({
      type: 'motivation',
      title: 'Room for Growth 🌱',
      message: `Your ${stats.consistency.toFixed(1)}% consistency shows commitment. Small improvements daily lead to big changes!`
    });
  }

  // Masjid prayer insights
  const masjidPercentage = stats.totalPrayers > 0 ? (stats.prayerBreakdown[PRAYER_STATUS.MASJID] / stats.totalPrayers) * 100 : 0;
  if (masjidPercentage >= 50) {
    insights.push({
      type: 'praise',
      title: 'Masjid Champion! 🕌',
      message: `${masjidPercentage.toFixed(1)}% of your prayers are in the masjid. The reward is 27 times greater!`
    });
  } else if (masjidPercentage >= 25) {
    insights.push({
      type: 'encouragement',
      title: 'Building the Habit 🚀',
      message: `${masjidPercentage.toFixed(1)}% masjid attendance is good. Try to increase it gradually for maximum reward!`
    });
  }

  // Streak insights
  if (stats.bestStreak >= 7) {
    insights.push({
      type: 'achievement',
      title: `${stats.bestStreak}-Day Streak! 🔥`,
      message: 'Your dedication is inspiring! Consistency is the key to spiritual growth.'
    });
  }

  if (stats.currentStreak >= 3) {
    insights.push({
      type: 'momentum',
      title: `Current Streak: ${stats.currentStreak} days! ⚡`,
      message: 'You\'re on fire! Keep this momentum going.'
    });
  }

  return insights;
};
