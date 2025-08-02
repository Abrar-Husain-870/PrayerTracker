import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { ChevronLeft, ChevronRight, Church, Home, Clock, X, Book } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  PRAYER_TYPES, 
  PRAYER_STATUS, 
  PRAYER_COLORS,
  SURAH_ALKAHF,
  SURAH_STATUS,
  SURAH_COLORS,
  getPrayerStatusForDate,
  savePrayerStatus,
  getPrayerDataForMonth,
  calculateDayScore,
  isFriday
} from '../services/prayerService';
import 'react-calendar/dist/Calendar.css';

const PrayerCalendar = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const [selectedDayData, setSelectedDayData] = useState({});
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load month data when month changes
  useEffect(() => {
    if (currentUser) {
      loadMonthData();
    }
  }, [currentUser, currentMonth]);

  // Load selected day data when date changes
  useEffect(() => {
    if (currentUser && selectedDate) {
      const localDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      console.log('State Debug - selectedDate changed:', {
        selectedDate: selectedDate,
        selectedDateString: localDateStr,
        isFriday: isFriday(selectedDate)
      });
      loadDayData();
    }
  }, [currentUser, selectedDate]);

  const loadMonthData = async () => {
    try {
      setLoading(true);
      
      // Get the first and last day of the current month
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      // Create date range that includes adjacent month dates visible on calendar
      // Calendar typically shows 6 weeks (42 days), so we need to include dates from previous/next months
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      
      // Get the start of the calendar view (might be from previous month)
      const startOfCalendarView = new Date(firstDayOfMonth);
      startOfCalendarView.setDate(startOfCalendarView.getDate() - firstDayOfMonth.getDay());
      
      // Get the end of the calendar view (might be from next month)
      const endOfCalendarView = new Date(lastDayOfMonth);
      const daysToAdd = 6 - lastDayOfMonth.getDay();
      endOfCalendarView.setDate(endOfCalendarView.getDate() + daysToAdd);
      
      // Load data for the entire calendar view range
      const startYear = startOfCalendarView.getFullYear();
      const startMonth = startOfCalendarView.getMonth() + 1;
      const endYear = endOfCalendarView.getFullYear();
      const endMonth = endOfCalendarView.getMonth() + 1;
      
      let allData = {};
      
      // Load data for each month in the range
      const monthsToLoad = [];
      let currentDate = new Date(startYear, startMonth - 1, 1);
      const endDate = new Date(endYear, endMonth - 1, 1);
      
      while (currentDate <= endDate) {
        monthsToLoad.push({
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      // Load data for all required months
      for (const { year: y, month: m } of monthsToLoad) {
        const monthData = await getPrayerDataForMonth(currentUser.uid, y, m);
        allData = { ...allData, ...monthData };
      }
      
      setMonthData(allData);
    } catch (error) {
      console.error('Error loading month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDayData = async () => {
    try {
      // Fix timezone issue by creating a new date with local timezone
      const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const data = await getPrayerStatusForDate(currentUser.uid, localDate);
      
      // If data is null (unmarked date), set default values for UI display
      if (data === null) {
        const defaultData = {
          [PRAYER_TYPES.FAJR]: null,
          [PRAYER_TYPES.DHUHR]: null,
          [PRAYER_TYPES.ASR]: null,
          [PRAYER_TYPES.MAGHRIB]: null,
          [PRAYER_TYPES.ISHA]: null
        };
        
        // Add Surah Al-Kahf for Fridays
        if (isFriday(selectedDate)) {
          defaultData[SURAH_ALKAHF] = null;
        }
        
        setSelectedDayData(defaultData);
      } else {
        // Fix key inconsistency: handle both surah_kahf and surah_alkahf
        if (data.hasOwnProperty('surah_kahf') && !data.hasOwnProperty(SURAH_ALKAHF)) {
          console.log('Data Debug - Found old surah_kahf key, migrating to surah_alkahf');
          data[SURAH_ALKAHF] = data['surah_kahf'];
          delete data['surah_kahf'];
        }
        
        // For Fridays, always ensure Surah Al-Kahf key exists in the UI state
        if (isFriday(selectedDate)) {
          // If the key doesn't exist in Firestore data, it means user selected "-- Select --"
          // and we removed it, so set it to null for UI consistency
          if (!data.hasOwnProperty(SURAH_ALKAHF)) {
            data[SURAH_ALKAHF] = null;
          }
        }
        
        console.log('Data Debug - Final data being set to state:', data);
        console.log('Data Debug - Surah Al-Kahf value:', data[SURAH_ALKAHF]);
        setSelectedDayData(data);
      }
    } catch (error) {
      console.error('Error loading day data:', error);
    }
  };

  const handlePrayerStatusChange = async (prayer, status) => {
    try {
      // Fix timezone issue by creating a new date with local timezone
      const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      
      // Handle empty string for "-- Select --" option - convert to null
      const statusToSave = status === '' ? null : status;
      
      // Format date properly without timezone issues
      const localDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      
      console.log('Save Debug - Selected date:', selectedDate);
      console.log('Save Debug - Local date for saving:', localDate);
      console.log('Save Debug - Local date string:', localDateStr);
      console.log('Save Debug - Raw status:', status, 'Status to save:', statusToSave);
      console.log('Save Debug - Attempting to save:', { prayer, status: statusToSave, date: localDateStr });
      
      await savePrayerStatus(currentUser.uid, localDate, prayer, statusToSave);
      console.log('Save Debug - Successfully saved to Firestore');
      setSelectedDayData(prev => ({
        ...prev,
        [prayer]: statusToSave
      }));
      console.log('Save Debug - Updated local state with:', statusToSave);
      // Reload month data to update calendar colors (but don't reload day data to avoid overriding our state)
      console.log('Save Debug - Reloading month data to refresh calendar...');
      await loadMonthData();
      console.log('Save Debug - Month data reloaded (day data kept as-is to prevent reversion)');
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
      default:
        return <X className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case PRAYER_STATUS.MASJID:
        return 'Masjid';
      case PRAYER_STATUS.HOME:
        return 'Home';
      case PRAYER_STATUS.QAZA:
        return 'Qaza';
      default:
        return 'Not Prayed';
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      // Fix timezone issue by using local date
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      const dayData = monthData[dateStr];
      
      // Calendar tile rendering with fixed timezone
      
      // Only show indicators for tracked days (not null/blank days)
      if (dayData && dayData !== null) {
        const prayers = Object.values(PRAYER_TYPES);
        const isFridayDate = isFriday(date);
        
        // Only show dots for prayers that have been explicitly marked (not null)
        const markedPrayers = prayers.filter(prayer => dayData[prayer] !== null && dayData[prayer] !== undefined);
        
        // Check if Surah Al-Kahf is marked on Friday
        const surahMarked = isFridayDate && dayData[SURAH_ALKAHF] !== null && dayData[SURAH_ALKAHF] !== undefined;
        
        if (markedPrayers.length === 0 && !surahMarked) {
          return null; // No indicators if nothing is marked
        }

        // Count prayers that are not "Not Prayed" for the counter
        const completedPrayers = markedPrayers.filter(prayer => 
          dayData[prayer] !== PRAYER_STATUS.NOT_PRAYED
        ).length;
        
        const totalActivities = isFridayDate ? 6 : 5; // 5 prayers + Surah Al-Kahf on Friday
        const markedActivities = markedPrayers.length + (surahMarked ? 1 : 0);

        return (
          <div className="flex flex-col items-center">
            <div className="flex flex-wrap gap-1 mt-1 justify-center max-w-[40px]">
              {/* Prayer dots */}
              {markedPrayers.map(prayer => {
                const status = dayData[prayer];
                return (
                  <div
                    key={prayer}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PRAYER_COLORS[status] }}
                    title={`${prayer.charAt(0).toUpperCase() + prayer.slice(1)}: ${status}`}
                  />
                );
              })}
              
              {/* Surah Al-Kahf book icon for Friday */}
              {surahMarked && (
                <div
                  className="w-2 h-2 flex items-center justify-center"
                  style={{ color: SURAH_COLORS[dayData[SURAH_ALKAHF]] }}
                  title={`Surah Al-Kahf: ${dayData[SURAH_ALKAHF]}`}
                >
                  <Book className="w-2 h-2" />
                </div>
              )}
            </div>
          </div>
        );
      }
    }
    return null;
  };

  const formatPrayerName = (prayer) => {
    return prayer.charAt(0).toUpperCase() + prayer.slice(1);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4">
        <h2 className="text-xl font-semibold text-center">Jamā’ah Journal</h2>
        <p className="text-center text-primary-100 text-sm mt-1">
          Track your spiritual journey
        </p>
      </div>

      {/* Calendar */}
      <div className="p-4">
        <Calendar
          onChange={setSelectedDate}
          onActiveStartDateChange={({ activeStartDate }) => setCurrentMonth(activeStartDate)}
          value={selectedDate}
          tileContent={tileContent}
          className="w-full border-none"
          tileClassName="hover:bg-primary-50 transition-colors"
          navigationLabel={({ date }) => (
            <span className="font-semibold text-gray-800">
              {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          )}
          prevLabel={<ChevronLeft className="w-5 h-5" />}
          nextLabel={<ChevronRight className="w-5 h-5" />}
        />
      </div>

      {/* Selected Date Prayer Status */}
      <div className="border-t bg-gray-50 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h3>
        
        <div className="space-y-2">
          {/* Regular Prayers */}
          {Object.values(PRAYER_TYPES).map(prayer => {
            const status = selectedDayData[prayer]; // Can be null for unmarked prayers
            const displayStatus = status || PRAYER_STATUS.NOT_PRAYED;
            
            return (
              <div key={prayer} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  {status !== null ? (
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: PRAYER_COLORS[displayStatus] }}
                    />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="font-medium text-gray-700">
                    {formatPrayerName(prayer)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    {status !== null ? (
                      <>
                        {getPrayerIcon(displayStatus)}
                        {getStatusLabel(displayStatus)}
                      </>
                    ) : (
                      <span className="text-gray-400">Not marked</span>
                    )}
                  </span>
                  
                  <select
                    value={status || ""}
                    onChange={(e) => handlePrayerStatusChange(prayer, e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Select --</option>
                    <option value={PRAYER_STATUS.NOT_PRAYED}>Not Prayed</option>
                    <option value={PRAYER_STATUS.QAZA}>Qaza</option>
                    <option value={PRAYER_STATUS.HOME}>Home</option>
                    <option value={PRAYER_STATUS.MASJID}>Masjid</option>
                  </select>
                </div>
              </div>
            );
          })}
          
          {/* Surah Al-Kahf for Fridays */}
          {isFriday(selectedDate) && (
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg shadow-sm border border-purple-200">
              <div className="flex items-center gap-3">
                {selectedDayData[SURAH_ALKAHF] !== null && selectedDayData[SURAH_ALKAHF] !== undefined ? (
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
                  {selectedDayData[SURAH_ALKAHF] !== null && selectedDayData[SURAH_ALKAHF] !== undefined ? (
                    <>
                      <Book className="w-4 h-4" />
                      {selectedDayData[SURAH_ALKAHF] === SURAH_STATUS.RECITED ? 'Recited' : 'Missed'}
                    </>
                  ) : (
                    <span className="text-gray-400">Not marked</span>
                  )}
                </span>
                
                <select
                  value={selectedDayData[SURAH_ALKAHF] || ""}
                  onChange={(e) => {
                    const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                    const localDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
                    console.log('Dropdown Debug - onChange triggered:', {
                      selectedDate: selectedDate,
                      localDate: localDate,
                      selectedDateString: localDateStr,
                      isFriday: isFriday(selectedDate),
                      prayer: SURAH_ALKAHF,
                      newValue: e.target.value,
                      currentValue: selectedDayData[SURAH_ALKAHF]
                    });
                    handlePrayerStatusChange(SURAH_ALKAHF, e.target.value);
                  }}
                  className="text-sm border border-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select --</option>
                  <option value={SURAH_STATUS.RECITED}>Recited</option>
                  <option value={SURAH_STATUS.MISSED}>Missed</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Daily Score */}
        <div className="mt-4 p-3 bg-primary-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Daily Score:</span>
            <span className="font-bold text-primary-700">
              {(() => {
                const dayScore = calculateDayScore(selectedDayData, selectedDate);
                const maxScore = isFriday(selectedDate) ? 145 : 135; // 135 + 10 for Surah Al-Kahf on Friday
                return dayScore !== null ? `${dayScore} / ${maxScore}` : 'Not tracked';
              })()}
            </span>
          </div>
          {isFriday(selectedDate) && (
            <div className="text-xs text-purple-600 mt-1 flex items-center gap-1">
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
