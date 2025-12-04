import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import { ChevronLeft, ChevronRight, Church, Home, Clock, X, Book, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  PRAYER_TYPES, 
  PRAYER_STATUS, 
  PRAYER_COLORS,
  SURAH_ALKAHF,
  SURAH_STATUS,
  SURAH_COLORS,
  savePrayerStatus,
  calculateDayScore,
  isFriday
} from '../services/prayerService';
import { getPrayerDataInRange } from '../services/analyticsService';
import PrayerStatusTile from './PrayerStatusTile'; // Import the new component
import 'react-calendar/dist/Calendar.css';
import './PrayerCalendar.css'; // Import custom styles
import { useOnlineStatus } from '../contexts/OnlineStatusContext';

const PrayerCalendar = () => {
  const { currentUser } = useAuth();
  const { online } = useOnlineStatus();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const monthChangeTimer = useRef(null);
  const [selectedDayData, setSelectedDayData] = useState({});
  const [masjidMode, setMasjidMode] = useState(false);

  // Fetch user's Masjid Mode setting
  useEffect(() => {
    const fetchMasjidMode = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setMasjidMode(userDoc.data().masjidMode || false);
          }
        } catch (error) {
          console.error('Error fetching masjid mode:', error);
        }
      }
    };
    fetchMasjidMode();
  }, [currentUser]);

  // Load calendar-range data when user or visible month changes (debounced)
  useEffect(() => {
    if (!currentUser) return;
    if (monthChangeTimer.current) clearTimeout(monthChangeTimer.current);
    monthChangeTimer.current = setTimeout(() => {
      loadMonthData();
    }, 150);
    return () => {
      if (monthChangeTimer.current) clearTimeout(monthChangeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentMonth]);

  // When selectedDate or monthData changes, update the selectedDayData
  useEffect(() => {
    if (selectedDate) {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      setSelectedDayData(monthData[dateStr] || {});
    }
  }, [selectedDate, monthData]);

  const loadMonthData = async () => {
    if (!currentUser) return;
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startOfCalendarView = new Date(firstDayOfMonth);
      startOfCalendarView.setDate(startOfCalendarView.getDate() - firstDayOfMonth.getDay());
      const endOfCalendarView = new Date(lastDayOfMonth);
      endOfCalendarView.setDate(endOfCalendarView.getDate() + (6 - lastDayOfMonth.getDay()));

      // Single ranged fetch over the visible calendar window (TTL-cached in analyticsService)
      const data = await getPrayerDataInRange(currentUser.uid, startOfCalendarView, endOfCalendarView);
      setMonthData(data || {});
    } catch (error) {
      console.error('Error loading month data:', error);
    }
  };

  const handlePrayerStatusChange = async (prayer, status) => {
    if (!currentUser) return;
    if (!online) return; // guard writes when offline

    try {
      const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const dateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      
      const statusToSave = (status === '' || status === 'clear') ? null : status;
      
      await savePrayerStatus(currentUser.uid, localDate, prayer, statusToSave);
      
      const newDayData = { ...selectedDayData };
      if (statusToSave !== null) {
        newDayData[prayer] = statusToSave;
      } else {
        delete newDayData[prayer];
      }
      setSelectedDayData(newDayData);
      
      setMonthData(prevData => ({
        ...prevData,
        [dateStr]: newDayData
      }));

    } catch (error) {
      console.error('Error updating prayer status:', error);
    }
  };

  const getPrayerIcon = (status) => {
    switch (status) {
      case PRAYER_STATUS.MASJID:
        return <Church className="w-4 h-4" />;
      case PRAYER_STATUS.HOME:
        return <Home className="w-4 h-4" />;
      case PRAYER_STATUS.QAZA:
        return <Clock className="w-4 h-4" />;
      case PRAYER_STATUS.NOT_PRAYED:
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case PRAYER_STATUS.MASJID:
        return 'Masjid';
      case PRAYER_STATUS.HOME:
        return masjidMode ? 'Prayed' : 'Home';
      case PRAYER_STATUS.QAZA:
        return 'Qaza';
      case PRAYER_STATUS.NOT_PRAYED:
        return 'Not Prayed';
      default:
        return '';
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const dayData = monthData[dateStr];
      return <PrayerStatusTile date={date} dayData={dayData} />;
    }
    return null;
  };

  const formatPrayerName = (prayer) => {
    return prayer.charAt(0).toUpperCase() + prayer.slice(1);
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-black rounded-lg shadow-lg overflow-hidden glass-card">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-semibold text-center">Jamā'ah Journal</h2>
        <p className="text-center text-primary-100 text-xs sm:text-sm mt-1">
          Track your spiritual journey
        </p>
      </div>

      <div className="p-2 sm:p-4 glass-card">
        <Calendar
          onChange={setSelectedDate}
          onActiveStartDateChange={({ activeStartDate }) => setCurrentMonth(activeStartDate)}
          value={selectedDate}
          tileContent={tileContent}
          className="w-full border-none"
          tileClassName={({ date, view }) => view === 'month' ? 'prayer-tile' : null}
          navigationLabel={({ date }) => (
            <span className="font-semibold text-gray-800">
              {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          )}
          prevLabel={<ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
          nextLabel={<ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />}
        />
      </div>

      <div className="border-t bg-gray-50 dark:bg-black p-3 sm:p-4 glass-card">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h3>
        
        <div className="space-y-2">
          {Object.values(PRAYER_TYPES).map(prayer => {
            const status = selectedDayData ? selectedDayData[prayer] : undefined;
            
            return (
              <div key={prayer} className="flex items-center justify-between p-2 bg-white dark:bg-black rounded-lg shadow-sm glass-card">
                <div className="flex items-center gap-3">
                  {status ? (
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: PRAYER_COLORS[status] }}
                    />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="font-medium text-gray-700">
                    {formatPrayerName(prayer)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    {status ? (
                      <>
                        {getPrayerIcon(status)}
                        {getStatusLabel(status)}
                      </> 
                    ) : (
                      <span className="text-gray-400">Not marked</span>
                    )}
                  </span>
                  
                  {!online && (
                    <span title="Offline: view-only" className="text-gray-400 dark:text-gray-500">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  )}

                  <select
                    value={status || ""}
                    onChange={(e) => handlePrayerStatusChange(prayer, e.target.value)}
                    disabled={!online}
                    className={`text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 ${
                      !online
                        ? 'border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500'
                    }`}
                  >
                    <option value="">-- Select --</option>
                    <option value="clear">Clear</option>
                    <option value={PRAYER_STATUS.NOT_PRAYED}>Not Prayed</option>
                    <option value={PRAYER_STATUS.QAZA}>Qaza</option>
                    {!masjidMode && <option value={PRAYER_STATUS.HOME}>Home</option>}
                    {!masjidMode && <option value={PRAYER_STATUS.MASJID}>Masjid</option>}
                    {masjidMode && <option value={PRAYER_STATUS.HOME}>Prayed</option>}
                  </select>
                </div>
              </div>
            );
          })}
          
          {isFriday(selectedDate) && (
            <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-[#0a0a0a] rounded-lg shadow-sm border border-purple-200 dark:border-gray-800 glass-card">
              <div className="flex items-center gap-3">
                {selectedDayData && selectedDayData[SURAH_ALKAHF] ? (
                  <div 
                    className="w-3 h-3 flex items-center justify-center"
                    style={{ color: SURAH_COLORS[selectedDayData[SURAH_ALKAHF]] }}
                  >
                    <Book className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-3 h-3 flex items-center justify-center border-2 border-gray-300 rounded">
                    <Book className="w-2 h-2 text-gray-300" />
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Surah Al-Kahf</span>
                  <div className="text-xs text-purple-600 font-medium">Friday Special (10 points)</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  {selectedDayData && selectedDayData[SURAH_ALKAHF] ? (
                    <>
                      <Book className="w-4 h-4" />
                      {selectedDayData[SURAH_ALKAHF] === SURAH_STATUS.RECITED ? 'Recited' : 'Missed'}
                    </>
                  ) : (
                    <span className="text-gray-400">Not marked</span>
                  )}
                </span>
                
                {!online && (
                  <span title="Offline: view-only" className="text-gray-400 dark:text-gray-500">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}

                <select
                  value={(selectedDayData && selectedDayData[SURAH_ALKAHF]) || ""}
                  onChange={(e) => handlePrayerStatusChange(SURAH_ALKAHF, e.target.value)}
                  disabled={!online}
                  className={`text-sm border rounded px-2 py-1 focus:outline-none bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 ${
                    !online
                      ? 'border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                      : 'border-purple-300 dark:border-gray-700 focus:ring-2 focus:ring-purple-500'
                  }`}
                >
                  <option value="">-- Select --</option>
                  <option value="clear">Clear</option>
                  <option value={SURAH_STATUS.RECITED}>Recited</option>
                  <option value={SURAH_STATUS.MISSED}>Missed</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-primary-50 dark:bg-[#0a0a0a] rounded-lg border border-transparent dark:border-gray-800 glass-card">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700 dark:text-gray-200">Daily Score:</span>
            <span className="font-bold text-primary-700 dark:text-primary-400">
              {(() => {
                const dayScore = calculateDayScore(selectedDayData, selectedDate, masjidMode);
                const maxScore = isFriday(selectedDate) ? 145 : 135;
                return dayScore !== null ? `${dayScore} / ${maxScore}` : 'Not tracked';
              })()}
            </span>
          </div>
          {isFriday(selectedDate) && (
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
              <Book className="w-3 h-3" />
              Friday Special: +10 points for Surah Al-Kahf
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrayerCalendar;
