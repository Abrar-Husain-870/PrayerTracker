/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Decimation,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Calendar,
  TrendingUp,
  Target,
  Flame,
  Award,
  Clock,
  Star,
  Home,
  Church,
  X,
  Zap,
  Book
} from 'lucide-react';
import { 
  getMonthlyStats, 
  getYearlyStats, 
  getRecentStats,
  getAllTimeStats,
  getMotivationalInsights,
  getDailyTrend
} from '../services/analyticsService';
import { PRAYER_STATUS, PRAYER_COLORS } from '../services/prayerService';
import { useTheme } from '../contexts/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Decimation
);

const Progress = () => {
  const { currentUser } = useAuth();
  const { resolvedTheme } = useTheme();
  const [timeframe, setTimeframe] = useState('alltime'); // Default to 'alltime'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [masjidMode, setMasjidMode] = useState(false);
  const [trendType, setTrendType] = useState('average'); // 'average' | 'composite'
  const [dailyTrend, setDailyTrend] = useState([]);
  const [smooth, setSmooth] = useState(false); // moving average smoothing
  const [zoomReady, setZoomReady] = useState(false); // zoom plugin loaded
  const [isSmallScreen, setIsSmallScreen] = useState(typeof window !== 'undefined' ? window.innerWidth < 480 : false);
  const chartRef = useRef(null);

  // Load user preferences from localStorage
  useEffect(() => {
    if (currentUser) {
      const savedTimeframe = localStorage.getItem(`progress_timeframe_${currentUser.uid}`);
      if (savedTimeframe) {
        setTimeframe(savedTimeframe);
      }
      
      const savedMonth = localStorage.getItem(`progress_month_${currentUser.uid}`);
      const savedYear = localStorage.getItem(`progress_year_${currentUser.uid}`);
      if (savedMonth) setSelectedMonth(parseInt(savedMonth));
      if (savedYear) setSelectedYear(parseInt(savedYear));
    }
  }, [currentUser]);

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
          setMasjidMode(false);
        }
      }
    };
    fetchMasjidMode();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadStats();
    }
  }, [currentUser, timeframe, selectedMonth, selectedYear, masjidMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load the zoom plugin to avoid hard dependency at build time.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('chartjs-plugin-zoom');
        if (mod && mod.default) {
          // Register only once
          if (!ChartJS.registry.plugins.get('zoom')) {
            ChartJS.register(mod.default);
          }
          if (mounted) setZoomReady(true);
        }
      } catch (e) {
        // Plugin not installed; zoom will be disabled gracefully
        if (mounted) setZoomReady(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Update small-screen flag on resize for responsive x-axis label rotation
  useEffect(() => {
    const onResize = () => setIsSmallScreen(window.innerWidth < 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Update small-screen flag on resize to control x-axis label rotation and density
  useEffect(() => {
    const onResize = () => setIsSmallScreen(window.innerWidth < 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      let statsData;
      let startDate;
      let endDate;
      
      switch (timeframe) {
        case 'month':
          statsData = await getMonthlyStats(currentUser.uid, selectedYear, selectedMonth, masjidMode);
          startDate = new Date(selectedYear, selectedMonth - 1, 1);
          endDate = new Date(selectedYear, selectedMonth, 0);
          break;
        case 'year':
          statsData = await getYearlyStats(currentUser.uid, selectedYear, masjidMode);
          startDate = new Date(selectedYear, 0, 1);
          endDate = new Date(selectedYear, 11, 31);
          break;
        case 'recent':
          statsData = await getRecentStats(currentUser.uid, 30, masjidMode);
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(endDate.getDate() - 29);
          break;
        case 'alltime':
          statsData = await getAllTimeStats(currentUser.uid, masjidMode);
          endDate = new Date();
          startDate = new Date();
          startDate.setFullYear(endDate.getFullYear() - 1); // last 12 months for trend
          break;
        default:
          statsData = await getMonthlyStats(currentUser.uid, selectedYear, selectedMonth, masjidMode);
          startDate = new Date(selectedYear, selectedMonth - 1, 1);
          endDate = new Date(selectedYear, selectedMonth, 0);
      }
      
      console.log('Progress Debug - Loaded stats data:', statsData);
      console.log('Progress Debug - Surah Al-Kahf stats:', statsData.surahAlKahfStats);
      setStats(statsData);
      setInsights(getMotivationalInsights(statsData));

      // Load daily trend (only complete days are returned by service)
      if (startDate && endDate) {
        const trend = await getDailyTrend(currentUser.uid, startDate, endDate, masjidMode);
        setDailyTrend(trend);
      } else {
        setDailyTrend([]);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPrayerStatusIcon = (status) => {
    switch (status) {
      case PRAYER_STATUS.MASJID:
        return <Church className="w-5 h-5" />;
      case PRAYER_STATUS.HOME:
        return <Home className="w-5 h-5" />;
      case PRAYER_STATUS.QAZA:
        return <Clock className="w-5 h-5" />;
      default:
        return <X className="w-5 h-5" />;
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'praise':
        return <Award className="w-6 h-6 text-yellow-500" />;
      case 'achievement':
        return <Star className="w-6 h-6 text-purple-500" />;
      case 'momentum':
        return <Flame className="w-6 h-6 text-orange-500" />;
      case 'encouragement':
        return <TrendingUp className="w-6 h-6 text-blue-500" />;
      default:
        return <Target className="w-6 h-6 text-green-500" />;
    }
  };

  // Prepare chart data
  const isDark = resolvedTheme === 'dark';
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  const pieBorderColor = isDark ? '#0a0a0a' : '#ffffff';
  const prayerBreakdownData = stats ? {
    labels: ['Masjid', 'Home', 'Qaza', 'Not Prayed'],
    datasets: [
      {
        data: [
          stats.prayerBreakdown[PRAYER_STATUS.MASJID],
          stats.prayerBreakdown[PRAYER_STATUS.HOME],
          stats.prayerBreakdown[PRAYER_STATUS.QAZA],
          stats.prayerBreakdown[PRAYER_STATUS.NOT_PRAYED],
        ],
        backgroundColor: [
          PRAYER_COLORS[PRAYER_STATUS.MASJID],
          PRAYER_COLORS[PRAYER_STATUS.HOME],
          PRAYER_COLORS[PRAYER_STATUS.QAZA],
          PRAYER_COLORS[PRAYER_STATUS.NOT_PRAYED],
        ],
        borderWidth: 2,
        borderColor: pieBorderColor,
        hoverBorderWidth: 2,
      },
    ],
  } : null;

  const prayerTypeData = stats ? {
    labels: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
    datasets: [
      {
        label: 'Masjid',
        data: Object.keys(stats.prayerTypeStats).map(prayer => 
          stats.prayerTypeStats[prayer][PRAYER_STATUS.MASJID]
        ),
        backgroundColor: PRAYER_COLORS[PRAYER_STATUS.MASJID],
      },
      {
        label: 'Home',
        data: Object.keys(stats.prayerTypeStats).map(prayer => 
          stats.prayerTypeStats[prayer][PRAYER_STATUS.HOME]
        ),
        backgroundColor: PRAYER_COLORS[PRAYER_STATUS.HOME],
      },
      {
        label: 'Qaza',
        data: Object.keys(stats.prayerTypeStats).map(prayer => 
          stats.prayerTypeStats[prayer][PRAYER_STATUS.QAZA]
        ),
        backgroundColor: PRAYER_COLORS[PRAYER_STATUS.QAZA],
      },
      {
        label: 'Not Prayed',
        data: Object.keys(stats.prayerTypeStats).map(prayer =>
          stats.prayerTypeStats[prayer][PRAYER_STATUS.NOT_PRAYED]
        ),
        backgroundColor: PRAYER_COLORS[PRAYER_STATUS.NOT_PRAYED],
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  // Trend chart configuration
  // Format dates like 31/6/25
  const formatShortDate = (iso) => {
    if (!iso) return '';
    const [yy, mm, dd] = iso.split('-').map(Number);
    return `${dd}/${mm}/${String(yy).slice(2)}`;
  };
  const trendLabels = dailyTrend.map(p => formatShortDate(p.date));
  const trendDataValues = trendType === 'average' ? dailyTrend.map(p => p.averageScore) : dailyTrend.map(p => p.compositeScore);

  // Compute moving average for smoothing
  const movingAverage = (values, windowSize = 7) => {
    const result = [];
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= windowSize) sum -= values[i - windowSize];
      const denom = Math.min(i + 1, windowSize);
      result.push(sum / denom);
    }
    return result;
  };
  const smoothedValues = movingAverage(trendDataValues, trendType === 'average' ? 5 : 7);
  const primaryStroke = isDark ? '#60a5fa' : '#3b82f6'; // blue-500/400
  const primaryFill = isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.12)';

  // Dynamic Y-axis range based on visible series (smoothed or raw)
  const valuesForScale = (smooth ? smoothedValues : trendDataValues).filter(v => Number.isFinite(v));
  let dynMin = trendType === 'average' ? 0 : 0;
  let dynMax = trendType === 'average' ? 145 : 100;
  if (valuesForScale.length > 0) {
    const vmin = Math.min(...valuesForScale);
    const vmax = Math.max(...valuesForScale);
    const span = Math.max(1, vmax - vmin);
    const pad = Math.max(span * 0.12, trendType === 'average' ? 3 : 2);
    let minY = vmin - pad;
    let maxY = vmax + pad;
    if (trendType === 'composite') {
      minY = Math.max(0, minY);
      maxY = Math.min(100, maxY);
      // Ensure we still have some span
      if (maxY - minY < 10) {
        const add = (10 - (maxY - minY)) / 2;
        minY = Math.max(0, minY - add);
        maxY = Math.min(100, maxY + add);
      }
    } else {
      // Average scores - typical bounds ~0..150
      minY = Math.max(0, minY);
      maxY = Math.min(150, maxY);
      if (maxY - minY < 10) {
        const add = (10 - (maxY - minY)) / 2;
        minY = Math.max(0, minY - add);
        maxY = Math.min(150, maxY + add);
      }
    }
    dynMin = minY;
    dynMax = maxY;
  }

  const trendData = {
    labels: trendLabels,
    datasets: [
      {
        label: trendType === 'average' ? 'Average Score' : 'Composite Score',
        data: smooth ? smoothedValues : trendDataValues,
        borderColor: primaryStroke,
        backgroundColor: primaryFill,
        pointBackgroundColor: primaryStroke,
        pointBorderColor: primaryStroke,
        pointStyle: 'circle',
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBorderWidth: 2,
        fill: true,
        tension: smooth ? 0.35 : 0.25,
        borderWidth: 2,
      }
    ]
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(ctx) {
            const val = ctx.parsed.y;
            return (trendType === 'average' ? 'Average: ' : 'Composite: ') + (trendType === 'average' ? val.toFixed(0) : val.toFixed(2));
          }
        }
      },
      decimation: { enabled: false },
      // Zoom plugin configuration (applies only if plugin is registered)
      zoom: zoomReady ? {
        zoom: {
          // Wheel zoom: disable on small screens; gentler speed on desktop
          wheel: { enabled: !isSmallScreen, modifierKey: null, speed: 0.05 },
          // Make mobile pinch less sensitive
          pinch: { enabled: true, speed: isSmallScreen ? 0.15 : 0.4 },
          mode: 'x',
          drag: { enabled: false }
        },
        pan: {
          enabled: true,
          mode: 'x',
          // Higher threshold on mobile to avoid accidental pans
          threshold: isSmallScreen ? 25 : 10,
          speed: isSmallScreen ? 3 : 10
        },
        limits: {
          // Prevent over-zooming into too few points on small screens
          x: { min: 'original', max: 'original', minRange: isSmallScreen ? 6 : 3 },
          y: { min: 0 }
        }
      } : undefined
    },
    elements: {
      point: { radius: 3, hoverRadius: 5, hitRadius: 8, borderWidth: 2 }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: dynMin,
        max: dynMax,
        grid: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
        ticks: { color: isDark ? '#9ca3af' : '#6b7280' }
      },
      x: {
        grid: { display: false },
        offset: true,
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          autoSkip: true,
          maxTicksLimit: isSmallScreen ? 6 : 10,
          maxRotation: isSmallScreen ? 60 : 0,
          minRotation: isSmallScreen ? 45 : 0,
          padding: isSmallScreen ? 8 : 4,
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
    elements: {
      arc: {
        borderWidth: 2,
      }
    }
  };

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'month':
        return `${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'year':
        return `${selectedYear}`;
      case 'recent':
        return 'Last 30 Days';
      case 'alltime':
        return 'All Time';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-3 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Your Spiritual Journey</h1>
            <p className="text-primary-100 text-sm sm:text-base">Track your progress and celebrate your growth</p>
          </div>

          <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-primary-200" />
        </div>

        {/* Time Frame Selector */}
        <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
          <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
            {[
              { key: 'alltime', label: 'All Time', shortLabel: 'All' },
              { key: 'recent', label: 'Last 30 Days', shortLabel: '30D' },
              { key: 'month', label: 'Monthly', shortLabel: 'Month' },
              { key: 'year', label: 'Yearly', shortLabel: 'Year' }
            ].map(option => (
              <button
                key={option.key}
                onClick={() => {
                  setTimeframe(option.key);
                  if (currentUser) {
                    localStorage.setItem(`progress_timeframe_${currentUser.uid}`, option.key);
                  }
                }}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm flex-1 sm:flex-none ${
                  timeframe === option.key
                    ? 'bg-white text-primary-700 dark:bg-primary-700 dark:text-white dark:border dark:border-primary-600'
                    : 'bg-primary-500 text-white hover:bg-primary-400'
                }`}
              >
                <span className="sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>

          {timeframe === 'month' && (
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const month = parseInt(e.target.value);
                  setSelectedMonth(month);
                  if (currentUser) {
                    localStorage.setItem(`progress_month_${currentUser.uid}`, month.toString());
                  }
                }}
                className="bg-primary-500 text-white rounded-lg px-3 py-2 border border-primary-400 dark:bg-black dark:text-gray-200 dark:border-gray-700"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const year = parseInt(e.target.value);
                  setSelectedYear(year);
                  if (currentUser) {
                    localStorage.setItem(`progress_year_${currentUser.uid}`, year.toString());
                  }
                }}
                className="bg-primary-500 text-white rounded-lg px-3 py-2 border border-primary-400 dark:bg-black dark:text-gray-200 dark:border-gray-700"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={2024 + i} value={2024 + i}>
                    {2024 + i}
                  </option>
                ))}
              </select>
            </div>
          )}

          {timeframe === 'year' && (
            <select
              value={selectedYear}
              onChange={(e) => {
                const year = parseInt(e.target.value);
                setSelectedYear(year);
                if (currentUser) {
                  localStorage.setItem(`progress_year_${currentUser.uid}`, year.toString());
                }
              }}
              className="bg-primary-500 text-white rounded-lg px-3 py-2 border border-primary-400 dark:bg-black dark:text-gray-200 dark:border-gray-700"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={2024 + i} value={2024 + i}>
                  {2024 + i}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-semibold">{getTimeframeLabel()}</h2>
        </div>
      </div>

      {stats && (
        <>
          {/* Trend Line Chart moved to bottom */}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg border border-gray-100 glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Completed Days</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.totalDays}</p>
                </div>
                <Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg border border-gray-100 glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Consistency</p>
                  <p className="text-xl sm:text-3xl font-bold text-green-600">{(stats.consistency || 0).toFixed(1)}%</p>
                </div>
                <Target className="w-5 h-5 sm:w-8 sm:h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg border border-gray-100 glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Current Streak</p>
                  <p className="text-xl sm:text-3xl font-bold text-blue-600">{stats.currentStreak}</p>
                  <p className="text-xs text-gray-500">days</p>
                </div>
                <Zap className="w-5 h-5 sm:w-8 sm:h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg border border-gray-100 glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Best Streak</p>
                  <p className="text-xl sm:text-3xl font-bold text-orange-600">{stats.bestStreak}</p>
                  <p className="text-xs text-gray-500">days</p>
                </div>
                <Flame className="w-5 h-5 sm:w-8 sm:h-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-lg border border-gray-100 col-span-2 md:col-span-1 glass-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Average Score</p>
                  <p className="text-xl sm:text-3xl font-bold text-purple-600">{(stats.averageScore || 0).toFixed(2)}</p>
                </div>
                <Award className="w-5 h-5 sm:w-8 sm:h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Surah Al-Kahf Friday Tracking */}
          {stats.surahAlKahfStats.totalFridays > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-purple-200 dark:from-black dark:to-black dark:border-gray-800">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <Book className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                Surah Al-Kahf (Friday Special)
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-4">
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-purple-100 dark:bg-[#0a0a0a] dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Fridays</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.surahAlKahfStats.totalFridays}</p>
                    </div>
                    <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-purple-100 dark:bg-[#0a0a0a] dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">Recited</p>
                      <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.surahAlKahfStats.recited}</p>
                    </div>
                    <Book className="w-4 h-4 sm:w-6 sm:h-6 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-purple-100 dark:bg-[#0a0a0a] dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">Missed</p>
                      <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.surahAlKahfStats.missed}</p>
                    </div>
                    <X className="w-4 h-4 sm:w-6 sm:h-6 text-red-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-purple-100 dark:bg-[#0a0a0a] dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">Consistency</p>
                      <p className="text-lg sm:text-2xl font-bold text-purple-600">{stats.surahAlKahfStats.consistency.toFixed(1)}%</p>
                    </div>
                    <Target className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
                  </div>
                </div>
              </div>
              
              {/* Surah Al-Kahf Progress Bar */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100 dark:bg-[#0a0a0a] dark:border-gray-800 glass-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Friday Reading Progress</span>
                  <span className="text-sm text-gray-600">
                    {stats.surahAlKahfStats.recited} / {stats.surahAlKahfStats.totalFridays} Fridays
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-800">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${stats.surahAlKahfStats.consistency}%` 
                    }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {stats.surahAlKahfStats.consistency >= 80 ? (
                    <span className="text-green-600 font-medium">🌟 Excellent consistency! Keep up the blessed habit!</span>
                  ) : stats.surahAlKahfStats.consistency >= 60 ? (
                    <span className="text-blue-600 font-medium">📚 Good progress! Try to be more consistent.</span>
                  ) : (
                    <span className="text-orange-600 font-medium">🤲 Every Friday is a new opportunity for blessings.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Motivational Insights */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 dark:from-black dark:to-black">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                Your Achievements & Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 dark:bg-[#0a0a0a] dark:border-gray-800">
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">{insight.title}</h4>
                        <p className="text-gray-600 text-sm">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prayer Breakdown Pie Chart */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 dark:bg-black dark:border-gray-800 glass-card">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Prayer Status Breakdown</h3>
              {prayerBreakdownData && stats.totalPrayers > 0 ? (
                <Pie data={prayerBreakdownData} options={pieOptions} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No prayer data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Prayer Type Bar Chart */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 dark:bg-black dark:border-gray-800 glass-card">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Prayer-wise Performance</h3>
              {prayerTypeData && stats.totalPrayers > 0 ? (
                <Bar data={prayerTypeData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No prayer data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:bg-black dark:border-gray-800 glass-card">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Detailed Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {Object.entries(stats.prayerBreakdown).map(([status, count]) => {
                const percentage = stats.totalPrayers > 0 ? (count / stats.totalPrayers * 100).toFixed(1) : 0;
                return (
                  <div key={status} className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: PRAYER_COLORS[status] }}
                      >
                        {getPrayerStatusIcon(status)}
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">
                      {status === PRAYER_STATUS.MASJID ? 'Masjid' :
                       status === PRAYER_STATUS.HOME ? 'Home' :
                       status === PRAYER_STATUS.QAZA ? 'Qaza' : 'Not Prayed'}
                    </h4>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600">{percentage}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Trend (Bottom) */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:bg-black dark:border-gray-800 glass-card">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Progress Trend</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${trendType === 'average' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-900 dark:text-gray-200'}`}
                  onClick={() => setTrendType('average')}
                >
                  Average Score
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${trendType === 'composite' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-900 dark:text-gray-200'}`}
                  onClick={() => setTrendType('composite')}
                >
                  Composite Score
                </button>
                <div className="mx-2 w-px bg-gray-200 dark:bg-gray-800" />
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${smooth ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-900 dark:text-gray-200'}`}
                  onClick={() => setSmooth(s => !s)}
                  title="Toggle smoothing (moving average)"
                >
                  {smooth ? 'Smooth: On' : 'Smooth: Off'}
                </button>
              </div>
            </div>
            <div className="h-64">
              {dailyTrend.length > 0 ? (
                <Line ref={chartRef} data={trendData} options={trendOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No completed day data in selected period</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2 sm:mt-3 flex items-center justify-between gap-2">
              <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 px-2">
                Smooth ON: 5-day avg (Average) / 7-day avg (Composite) for a clearer trend; OFF shows exact daily values
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-medium ${zoomReady ? 'bg-gray-100 dark:bg-gray-900 dark:text-gray-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  disabled={!zoomReady}
                  onClick={() => {
                    try {
                      const chart = chartRef.current?.chart || chartRef.current;
                      if (chart && typeof chart.zoom === 'function') {
                        // Zoom out slightly
                        chart.zoom(0.9);
                      }
                    } catch {}
                  }}
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-medium ${zoomReady ? 'bg-gray-100 dark:bg-gray-900 dark:text-gray-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  disabled={!zoomReady}
                  onClick={() => {
                    try {
                      const chart = chartRef.current?.chart || chartRef.current;
                      if (chart && typeof chart.zoom === 'function') {
                        // Zoom in slightly
                        chart.zoom(1.1);
                      }
                    } catch {}
                  }}
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${zoomReady ? 'bg-gray-100 dark:bg-gray-900 dark:text-gray-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  disabled={!zoomReady}
                  onClick={() => {
                    try {
                      const chart = chartRef.current?.chart || chartRef.current;
                      if (chart && chart.resetZoom) {
                        chart.resetZoom();
                      } else if (chart && chart.chart && chart.chart.resetZoom) {
                        chart.chart.resetZoom();
                      }
                    } catch {}
                  }}
                  title={zoomReady ? 'Reset zoom to full range' : 'Zoom unavailable (plugin not installed)'}
                >
                  Reset Zoom
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Progress;
