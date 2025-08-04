import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const PRAYER_TYPES = {
  FAJR: 'fajr',
  DHUHR: 'dhuhr',
  ASR: 'asr',
  MAGHRIB: 'maghrib',
  ISHA: 'isha'
};

export const PRAYER_STATUS = {
  NOT_PRAYED: 'not_prayed',
  QAZA: 'qaza',
  HOME: 'home',
  MASJID: 'masjid'
};

// Surah Al-Kahf (Friday special activity)
export const SURAH_ALKAHF = 'surah_alkahf';

export const SURAH_STATUS = {
  RECITED: 'recited',
  MISSED: 'missed'
};

export const PRAYER_SCORES = {
  [PRAYER_STATUS.NOT_PRAYED]: 0,
  [PRAYER_STATUS.QAZA]: 0.5,
  [PRAYER_STATUS.HOME]: 1,
  [PRAYER_STATUS.MASJID]: 27
};

// Masjid Mode scoring (for users who primarily pray at home)
export const MASJID_MODE_PRAYER_SCORES = {
  [PRAYER_STATUS.NOT_PRAYED]: 0,
  [PRAYER_STATUS.QAZA]: 13,
  [PRAYER_STATUS.HOME]: 27,
  [PRAYER_STATUS.MASJID]: 27 // Same as home since masjid option is hidden in this mode
};

// Get prayer scores based on user's Masjid Mode setting
export const getPrayerScores = (masjidMode = false) => {
  return masjidMode ? MASJID_MODE_PRAYER_SCORES : PRAYER_SCORES;
};

export const SURAH_SCORES = {
  [SURAH_STATUS.RECITED]: 10,
  [SURAH_STATUS.MISSED]: 0
};

export const PRAYER_COLORS = {
  [PRAYER_STATUS.NOT_PRAYED]: '#ef4444', // red
  [PRAYER_STATUS.QAZA]: '#f59e0b', // amber
  [PRAYER_STATUS.HOME]: '#3b82f6', // blue
  [PRAYER_STATUS.MASJID]: '#22c55e' // green
};

export const SURAH_COLORS = {
  [SURAH_STATUS.RECITED]: '#8b5cf6', // purple
  [SURAH_STATUS.MISSED]: '#ef4444' // red
};

// Save prayer status for a specific date and prayer
export const savePrayerStatus = async (userId, date, prayer, status) => {
  try {
    // Fix timezone issue by formatting date properly
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const docRef = doc(db, 'users', userId, 'prayers', dateStr);
    
    console.log('Firestore Debug - Saving to:', { userId, dateStr, prayer, status });
    
    // Get existing data for the date
    const docSnap = await getDoc(docRef);
    const existingData = docSnap.exists() ? docSnap.data() : {};
    
    console.log('Firestore Debug - Existing data:', existingData);
    
    // Update the specific prayer
    const updatedData = {
      ...existingData,
      lastUpdated: new Date()
    };
    
    // Only add the prayer key if status is not null
    if (status !== null) {
      updatedData[prayer] = status;
      console.log(`Firestore Debug - Adding key ${prayer} with value:`, status);
    } else {
      // If status is null, remove the key from the document
      delete updatedData[prayer];
      console.log(`Firestore Debug - Removing key ${prayer} from document`);
    }
    
    console.log('Firestore Debug - Updated data to save:', updatedData);
    
    // Use setDoc without merge to ensure deleted keys are actually removed
    await setDoc(docRef, updatedData);
    console.log('Firestore Debug - Successfully saved to Firestore');
    return true;
  } catch (error) {
    console.error('Error saving prayer status:', error);
    throw error;
  }
};

// Get prayer status for a specific date
export const getPrayerStatusForDate = async (userId, date) => {
  try {
    // Fix timezone issue by formatting date properly
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const docRef = doc(db, 'users', userId, 'prayers', dateStr);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Return null for unmarked dates - they remain blank
      return null;
    }
  } catch (error) {
    console.error('Error getting prayer status:', error);
    throw error;
  }
};

// Get prayer data for a month
export const getPrayerDataForMonth = async (userId, year, month) => {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const prayersRef = collection(db, 'users', userId, 'prayers');
    const q = query(
      prayersRef,
      where('__name__', '>=', startDate),
      where('__name__', '<=', endDate),
      orderBy('__name__')
    );
    
    const querySnapshot = await getDocs(q);
    const monthData = {};
    
    querySnapshot.forEach((doc) => {
      monthData[doc.id] = doc.data();
    });
    
    return monthData;
  } catch (error) {
    console.error('Error getting month data:', error);
    throw error;
  }
};

// Check if a date is Friday
export const isFriday = (date) => {
  return date.getDay() === 5; // Friday is day 5 (0=Sunday, 1=Monday, ..., 5=Friday)
};

// Calculate daily score
export const calculateDayScore = (dayData, date = null, masjidMode = false) => {
  // If dayData is null (unmarked date), return null to indicate no score
  if (!dayData) {
    return null;
  }
  
  let totalScore = 0;
  const prayers = Object.values(PRAYER_TYPES);
  const prayerScores = getPrayerScores(masjidMode);
  
  prayers.forEach(prayer => {
    const status = dayData[prayer] || PRAYER_STATUS.NOT_PRAYED;
    totalScore += prayerScores[status];
  });
  
  // Add Surah Al-Kahf score if it's Friday and the status is set
  if (date && isFriday(date) && dayData[SURAH_ALKAHF]) {
    totalScore += SURAH_SCORES[dayData[SURAH_ALKAHF]];
  }
  
  return totalScore;
};

// Calculate monthly percentage
export const calculateMonthlyPercentage = (monthData) => {
  // Only count days that have been actually tracked (not null/blank)
  const trackedDays = Object.values(monthData).filter(dayData => dayData !== null);
  
  if (trackedDays.length === 0) return 0;
  
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  trackedDays.forEach(dayData => {
    const dayScore = calculateDayScore(dayData);
    if (dayScore !== null) {
      totalScore += dayScore;
      maxPossibleScore += PRAYER_SCORES[PRAYER_STATUS.MASJID] * 5; // 5 prayers per day
    }
  });
  
  return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
};
