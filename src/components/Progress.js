/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
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
  getMotivationalInsights 
} from '../services/analyticsService';
import { PRAYER_STATUS, PRAYER_COLORS } from '../services/prayerService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Progress = () => {
  const { currentUser } = useAuth();
  const [timeframe, setTimeframe] = useState('month'); // 'month', 'year', 'recent'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadStats();
    }
  }, [currentUser, timeframe, selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = async () => {
    try {
      setLoading(true);
      let statsData;
      
      switch (timeframe) {
        case 'month':
          statsData = await getMonthlyStats(currentUser.uid, selectedYear, selectedMonth);
          break;
        case 'year':
          statsData = await getYearlyStats(currentUser.uid, selectedYear);
          break;
        case 'recent':
          statsData = await getRecentStats(currentUser.uid, 30);
          break;
        default:
          statsData = await getMonthlyStats(currentUser.uid, selectedYear, selectedMonth);
      }
      
      console.log('Progress Debug - Loaded stats data:', statsData);
      console.log('Progress Debug - Surah Al-Kahf stats:', statsData.surahAlKahfStats);
      setStats(statsData);
      setInsights(getMotivationalInsights(statsData));
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
        borderColor: '#ffffff',
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
  };

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'month':
        return `${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'year':
        return `${selectedYear}`;
      case 'recent':
        return 'Last 30 Days';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Spiritual Journey</h1>
            <p className="text-primary-100">Track your progress and celebrate your growth</p>
          </div>
          <TrendingUp className="w-12 h-12 text-primary-200" />
        </div>

        {/* Time Frame Selector */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {[
              { key: 'recent', label: 'Last 30 Days' },
              { key: 'month', label: 'Monthly' },
              { key: 'year', label: 'Yearly' }
            ].map(option => (
              <button
                key={option.key}
                onClick={() => setTimeframe(option.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeframe === option.key
                    ? 'bg-white text-primary-700'
                    : 'bg-primary-500 text-white hover:bg-primary-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {timeframe === 'month' && (
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-primary-500 text-white rounded-lg px-3 py-2 border border-primary-400"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-primary-500 text-white rounded-lg px-3 py-2 border border-primary-400"
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
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-primary-500 text-white rounded-lg px-3 py-2 border border-primary-400"
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
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Days Tracked</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalTrackedDays}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Consistency</p>
                  <p className="text-3xl font-bold text-green-600">{(stats.consistency || 0).toFixed(1)}%</p>
                </div>
                <Target className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Current Streak</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.currentStreak}</p>
                  <p className="text-xs text-gray-500">days</p>
                </div>
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Best Streak</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.bestStreak}</p>
                  <p className="text-xs text-gray-500">days</p>
                </div>
                <Flame className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Average Score</p>
                  <p className="text-3xl font-bold text-purple-600">{(stats.averageScore || 0).toFixed(2)}</p>
                </div>
                <Award className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Surah Al-Kahf Friday Tracking */}
          {stats.surahAlKahfStats.totalFridays > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Book className="w-6 h-6 text-purple-600" />
                Surah Al-Kahf (Friday Special)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Fridays</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.surahAlKahfStats.totalFridays}</p>
                    </div>
                    <Calendar className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Recited</p>
                      <p className="text-2xl font-bold text-green-600">{stats.surahAlKahfStats.recited}</p>
                    </div>
                    <Book className="w-6 h-6 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Missed</p>
                      <p className="text-2xl font-bold text-red-600">{stats.surahAlKahfStats.missed}</p>
                    </div>
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Consistency</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.surahAlKahfStats.consistency.toFixed(1)}%</p>
                    </div>
                    <Target className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
              </div>
              
              {/* Surah Al-Kahf Progress Bar */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Friday Reading Progress</span>
                  <span className="text-sm text-gray-600">
                    {stats.surahAlKahfStats.recited} / {stats.surahAlKahfStats.totalFridays} Fridays
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
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
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                Your Achievements & Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
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
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
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
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
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
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Detailed Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </>
      )}
    </div>
  );
};

export default Progress;
