import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { PRAYER_TYPES, PRAYER_STATUS, PRAYER_SCORES, SURAH_ALKAHF, SURAH_STATUS, SURAH_SCORES, isFriday } from './prayerService';

// Lightweight in-memory cache with TTL to avoid refetching on navigation
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _cache = new Map();
const _now = () => Date.now();
const _key = (name, payload) => `${name}:${JSON.stringify(payload)}`;
const _get = (k) => {
  const entry = _cache.get(k);
  if (!entry) return undefined;
  if (_now() - entry.t > entry.ttl) {
    _cache.delete(k);
    return undefined;
  }
  return entry.v;
};
const _set = (k, v, ttl = CACHE_TTL_MS) => _cache.set(k, { v, t: _now(), ttl });

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
    
    const cacheKey = _key('getPrayerDataInRange', { userId, startDateStr, endDateStr });
    const cached = _get(cacheKey);
    if (cached) return cached;

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
    _set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error getting prayer data in range:', error);
    throw error;
  }
};

// Build per-day trend series (only complete days are included)
export const getDailyTrend = async (userId, startDate, endDate, masjidMode = false) => {
  const cacheKey = _key('getDailyTrend', {
    userId,
    start: startDate?.toISOString?.() || startDate,
    end: endDate?.toISOString?.() || endDate,
    masjidMode
  });
  const cached = _get(cacheKey);
  if (cached) return cached;

  const prayerData = await getPrayerDataInRange(userId, startDate, endDate);
  const dates = Object.keys(prayerData).sort();

  // Use prayer scores according to mode
  const prayerScores = masjidMode ? 
    {
      [PRAYER_STATUS.NOT_PRAYED]: 0,
      [PRAYER_STATUS.QAZA]: 13,
      [PRAYER_STATUS.HOME]: 27,
      [PRAYER_STATUS.MASJID]: 27
    } : PRAYER_SCORES;

  const series = [];
  let runningStreak = 0; // streak across complete, all-good days

  dates.forEach(date => {
    const dayData = prayerData[date];
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    // Determine completeness
    let allFivePrayersMarked = true;
    let dayScore = 0;
    let markedCount = 0;
    let dayHasAllGoodPrayers = true; // for streak (must be Home or Masjid only)

    Object.values(PRAYER_TYPES).forEach(prayer => {
      const status = dayData[prayer];
      if (status !== undefined && status !== null && status !== '') {
        markedCount++;
        dayScore += prayerScores[status];
        if (status === PRAYER_STATUS.NOT_PRAYED || status === PRAYER_STATUS.QAZA) {
          dayHasAllGoodPrayers = false;
        }
      } else {
        allFivePrayersMarked = false;
        dayHasAllGoodPrayers = false;
      }
    });

    // Friday Surah completeness
    let fridaySurahMarked = true;
    if (isFriday(dateObj)) {
      if (dayData.hasOwnProperty(SURAH_ALKAHF) && dayData[SURAH_ALKAHF] !== null && dayData[SURAH_ALKAHF] !== '') {
        const surahStatus = dayData[SURAH_ALKAHF];
        // Add Surah score
        if (surahStatus === SURAH_STATUS.RECITED || surahStatus === SURAH_STATUS.MISSED) {
          dayScore += SURAH_SCORES[surahStatus];
        } else {
          fridaySurahMarked = false;
        }
      } else {
        fridaySurahMarked = false;
      }
    }

    const dayIsComplete = allFivePrayersMarked && (isFriday(dateObj) ? fridaySurahMarked : true);
    if (!dayIsComplete) {
      // Incomplete days are skipped from the trend
      return;
    }

    // Update streak (only if all 5 are good i.e., Home or Masjid)
    if (dayHasAllGoodPrayers && markedCount === 5) {
      runningStreak++;
    } else {
      runningStreak = 0;
    }

    // Daily consistency: percentage of non-NOT_PRAYED over total prayers (5)
    const goodOrQazaCount = Object.values(PRAYER_TYPES).reduce((acc, prayer) => {
      const status = dayData[prayer];
      if (status !== undefined && status !== null && status !== '') {
        // For consistency we consider all but NOT_PRAYED as "done"
        return acc + (status !== PRAYER_STATUS.NOT_PRAYED ? 1 : 0);
      }
      return acc;
    }, 0);
    const dayConsistency = (goodOrQazaCount / 5) * 100;

    // Masjid percentage for the day
    const masjidCount = Object.values(PRAYER_TYPES).reduce((acc, prayer) => {
      return acc + (dayData[prayer] === PRAYER_STATUS.MASJID ? 1 : 0);
    }, 0);
    const dayMasjidPct = (masjidCount / 5) * 100;

    // Composite score per day using the same weights
    // Normalize against the correct max for that day:
    // Non-Friday: 5 prayers * 27 = 135
    // Friday: 5 prayers * 27 + 10 (Surah recited) = 145
    const maxDaily = (27 * 5) + (isFriday(dateObj) ? 10 : 0);
    const averageScoreNormalized = Math.min((dayScore / maxDaily) * 100, 100);
    const compositeScore = 
      (averageScoreNormalized * 0.5) +
      (dayConsistency * 0.25) +
      (Math.min((runningStreak / 30) * 100, 100) * 0.15) +
      (dayMasjidPct * 0.1);

    series.push({
      date,
      averageScore: dayScore,
      compositeScore: Math.round(compositeScore * 100) / 100
    });
  });

  _set(cacheKey, series);
  return series;
};

// Calculate prayer statistics for a given period
export const calculatePrayerStats = (prayerData, masjidMode = false) => {
  const stats = {
    totalDays: 0, // Will be set to actual tracked days below
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
  
  // Get appropriate prayer scores based on Masjid Mode
  const prayerScores = masjidMode ? 
    {
      [PRAYER_STATUS.NOT_PRAYED]: 0,
      [PRAYER_STATUS.QAZA]: 13,
      [PRAYER_STATUS.HOME]: 27,
      [PRAYER_STATUS.MASJID]: 27
    } : PRAYER_SCORES;

  // Debug logging for Surah Al-Kahf
  console.log('Analytics Debug - Total dates in prayerData:', dates.length);
  console.log('Analytics Debug - Date range:', dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : 'No dates');
  console.log('Analytics Debug - Using Masjid Mode:', masjidMode);

  if (dates.length === 0) return stats;

  // Calculate statistics
  let currentStreakCount = 0;
  let bestStreakCount = 0;
  let tempStreak = 0;
  let completeDaysCount = 0; // Days where ALL activities are marked

  // Calculate best streak (ascending order)
  dates.forEach(date => {
    const dayData = prayerData[date];
    // Fix timezone issue by parsing date components directly
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed
    let dayScore = 0;
    let markedPrayersCount = 0;
    let allFivePrayersMarked = true;
    
    console.log(`Analytics Debug - Processing date: ${date}, dateObj: ${dateObj}, isFriday: ${isFriday(dateObj)}`);

    Object.values(PRAYER_TYPES).forEach(prayer => {
      // Only process prayers that are explicitly marked (not undefined/null/empty)
      if (dayData[prayer] !== undefined && dayData[prayer] !== null && dayData[prayer] !== '') {
        const status = dayData[prayer];
        markedPrayersCount++;
        dayScore += prayerScores[status];
      } else {
        allFivePrayersMarked = false; // at least one prayer not marked
      }
    });

    // Handle Surah Al-Kahf for Fridays
    let fridaySurahMarked = true; // default true for non-Fridays
    if (isFriday(dateObj)) {
      stats.surahAlKahfStats.totalFridays++;
      // Check if Surah Al-Kahf data exists (not undefined/null/empty)
      if (dayData.hasOwnProperty(SURAH_ALKAHF) && dayData[SURAH_ALKAHF] !== null) {
        const surahStatus = dayData[SURAH_ALKAHF];
        if (surahStatus === '') {
          stats.surahAlKahfStats.notTracked++;
          fridaySurahMarked = false;
        } else if (surahStatus === SURAH_STATUS.RECITED) {
          stats.surahAlKahfStats.recited++;
          dayScore += SURAH_SCORES[SURAH_STATUS.RECITED];
        } else if (surahStatus === SURAH_STATUS.MISSED) {
          stats.surahAlKahfStats.missed++;
          dayScore += SURAH_SCORES[SURAH_STATUS.MISSED];
        } else {
          // Unknown status, treat as not tracked
          stats.surahAlKahfStats.notTracked++;
          fridaySurahMarked = false;
        }
      } else {
        stats.surahAlKahfStats.notTracked++;
        fridaySurahMarked = false;
      }
    }

    // Determine if this day is COMPLETE: all 5 prayers marked AND (if Friday) Surah Al-Kahf marked
    const dayIsComplete = allFivePrayersMarked && (isFriday(dateObj) ? fridaySurahMarked : true);

    if (dayIsComplete) {
      // Only include complete days in composite-impacting aggregates
      completeDaysCount++;

      // Update overall breakdowns and totals for complete days
      Object.values(PRAYER_TYPES).forEach(prayer => {
        const status = dayData[prayer];
        stats.prayerBreakdown[status]++;
        stats.prayerTypeStats[prayer][status]++;
        stats.prayerTypeStats[prayer].total++;
        stats.totalPrayers++;
      });

      stats.totalScore += dayScore;

      // Use the highest possible score for the mode (27 points per prayer in both modes)
      const maxDailyScore = masjidMode ? 27 : PRAYER_SCORES[PRAYER_STATUS.MASJID];
      stats.maxPossibleScore += maxDailyScore * 5;
      
      // Add Surah Al-Kahf to max possible score for Fridays
      if (isFriday(dateObj)) {
        stats.maxPossibleScore += SURAH_SCORES[SURAH_STATUS.RECITED];
      }
    }

    // Calculate streaks (days with all 5 prayers as Home or Masjid - no Qaza, Not Prayed, or unmarked)
    let dayHasAllGoodPrayers = true;
    markedPrayersCount = 0;
    
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
    } else {
      currentStreakCount = 0;
    }
  });

  stats.bestStreak = bestStreakCount;

  // Calculate current streak (descending order)
  // Count consecutive fully completed days from most recent backwards
  tempStreak = 0;
  const todayStr = (() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();
  
  for (let i = dates.length - 1; i >= 0; i--) {
    const date = dates[i];
    const dayData = prayerData[date];
    let markedPrayersCount = 0;
    let dayHasAllGoodPrayers = true;
    
    Object.values(PRAYER_TYPES).forEach(prayer => {
      if (dayData[prayer] !== undefined && dayData[prayer] !== null && dayData[prayer] !== '') {
        const status = dayData[prayer];
        markedPrayersCount++;
        if (status === PRAYER_STATUS.NOT_PRAYED || status === PRAYER_STATUS.QAZA) {
          dayHasAllGoodPrayers = false;
        }
      } else {
        dayHasAllGoodPrayers = false;
      }
    });
    
    if (markedPrayersCount !== 5) {
      dayHasAllGoodPrayers = false;
    }
    
    // Skip today if it's incomplete (not all 5 prayers marked)
    if (date === todayStr && markedPrayersCount < 5) {
      continue;
    }
    
    if (dayHasAllGoodPrayers) {
      tempStreak++;
    } else {
      // Break immediately on first incomplete/broken day
      break;
    }
  }
  
  stats.currentStreak = tempStreak;
  
  // Set totalDays to only COMPLETE days (all activities marked)
  stats.totalDays = completeDaysCount;
  
  // Calculate average score as: total daily scores / number of COMPLETE days
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
export const getMonthlyStats = async (userId, year, month, masjidMode = false) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month

  const cacheKey = _key('getMonthlyStats', { userId, year, month, masjidMode });
  const cached = _get(cacheKey);
  if (cached) return cached;

  const prayerData = await getPrayerDataInRange(userId, startDate, endDate);
  const result = calculatePrayerStats(prayerData, masjidMode);
  _set(cacheKey, result);
  return result;
};

// Get yearly statistics
export const getYearlyStats = async (userId, year, masjidMode = false) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const cacheKey = _key('getYearlyStats', { userId, year, masjidMode });
  const cached = _get(cacheKey);
  if (cached) return cached;

  const prayerData = await getPrayerDataInRange(userId, startDate, endDate);
  const result = calculatePrayerStats(prayerData, masjidMode);
  _set(cacheKey, result);
  return result;
};

// Get last N days statistics
export const getRecentStats = async (userId, days = 30, masjidMode = false) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);

  const cacheKey = _key('getRecentStats', { userId, days, masjidMode });
  const cached = _get(cacheKey);
  if (cached) return cached;

  const prayerData = await getPrayerDataInRange(userId, startDate, endDate);
  const result = calculatePrayerStats(prayerData, masjidMode);
  _set(cacheKey, result, 2 * 60 * 1000); // 2 min TTL for recent to be a bit fresher
  return result;
};

// Get all time statistics (all historical data)
export const getAllTimeStats = async (userId, masjidMode = false) => {
  try {
    const cacheKey = _key('getAllTimeStats', { userId, masjidMode });
    const cached = _get(cacheKey);
    if (cached) return cached;

    // Fetch all prayer documents for this user without date restrictions
    const prayersRef = collection(db, 'users', userId, 'prayers');
    const querySnapshot = await getDocs(prayersRef);
    
    const allPrayerData = {};
    querySnapshot.forEach((doc) => {
      allPrayerData[doc.id] = doc.data();
    });
    
    const result = calculatePrayerStats(allPrayerData, masjidMode);
    _set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching all time stats:', error);
    // Fallback to empty stats if error occurs
    return calculatePrayerStats({}, masjidMode);
  }
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
