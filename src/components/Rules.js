import React, { useState } from 'react';
import {
  BookOpen,
  Calculator,
  Target,
  Settings,
  Home,
  Building,
  Clock,
  X,
  Award,
  TrendingUp,
  Calendar,
  Users,
  Eye,
  ChevronDown,
  ChevronRight,
  Info,
  Star,
  Zap
} from 'lucide-react';

const Rules = () => {
  const [expandedSection, setExpandedSection] = useState('scoring');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const SectionCard = ({ id, title, icon: Icon, children, isExpanded }) => (
    <div className="bg-white dark:bg-black rounded-xl shadow-lg border border-rose-100 dark:border-gray-800 overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full px-6 py-4 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 dark:from-black dark:to-black dark:hover:from-[#0a0a0a] dark:hover:to-[#0a0a0a] transition-colors duration-200 flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-6 h-6 text-rose-600" />
          <h2 className="text-xl font-bold text-rose-800 dark:text-rose-200">{title}</h2>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-rose-600" />
        ) : (
          <ChevronRight className="w-5 h-5 text-rose-600" />
        )}
      </button>
      {isExpanded && (
        <div className="p-6 space-y-6">
          {children}
        </div>
      )}
    </div>
  );

  const FormulaBox = ({ title, formula, example }) => (
    <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-black dark:to-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
      <h4 className="font-semibold text-rose-800 dark:text-rose-200 mb-2">{title}</h4>
      <div className="bg-white dark:bg-black rounded p-3 mb-3 border border-rose-100 dark:border-gray-800">
        <code className="text-rose-700 dark:text-rose-300 font-mono text-sm">{formula}</code>
      </div>
      {example && (
        <div className="text-sm text-rose-600 dark:text-rose-300">
          <strong>Example:</strong> {example}
        </div>
      )}
    </div>
  );

  const ScoreCard = ({ status, standardScore, masjidScore, icon: Icon, description }) => (
    <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800 hover:border-rose-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center space-x-3 mb-2">
        <Icon className="w-5 h-5 text-rose-600" />
        <h4 className="font-semibold text-rose-800 dark:text-rose-200">{status}</h4>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{description}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-rose-50 dark:bg-[#0a0a0a] rounded p-2">
          <div className="text-xs text-rose-600 dark:text-rose-300 font-medium">Standard Mode</div>
          <div className="text-lg font-bold text-rose-800 dark:text-rose-200">{standardScore} pts</div>
        </div>
        <div className="bg-pink-50 dark:bg-[#0a0a0a] rounded p-2">
          <div className="text-xs text-pink-600 dark:text-pink-300 font-medium">Home Mode</div>
          <div className="text-lg font-bold text-pink-800 dark:text-pink-200">{masjidScore} pts</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 dark:from-black dark:via-black dark:to-black p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-rose-800 dark:text-rose-200 mb-2">Rules & Guide</h1>
          <p className="text-rose-600 dark:text-rose-300 text-lg">
            Everything you need to know about Namaaz Tracker
          </p>
        </div>

        <div className="space-y-6">
          {/* Prayer Scoring System */}
          <SectionCard
            id="scoring"
            title="Prayer Scoring System"
            icon={Calculator}
            isExpanded={expandedSection === 'scoring'}
          >
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Namaaz Tracker uses a point-based system to track your prayer consistency. 
                The scoring varies based on your <strong>Prayer Mode</strong> setting.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScoreCard
                  status="Not Prayed"
                  standardScore="0"
                  masjidScore="0"
                  icon={X}
                  description="Prayer was missed completely"
                />
                <ScoreCard
                  status="Qaza (Late)"
                  standardScore="0.5"
                  masjidScore="13"
                  icon={Clock}
                  description="Prayer performed after its time"
                />
                <ScoreCard
                  status="Home"
                  standardScore="1"
                  masjidScore="27"
                  icon={Home}
                  description="Prayer performed at home on time"
                />
                <ScoreCard
                  status="Masjid"
                  standardScore="27"
                  masjidScore="N/A"
                  icon={Building}
                  description="Prayer performed in congregation at mosque"
                />
              </div>

              <div className="bg-rose-100 dark:bg-[#0a0a0a] rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-rose-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-rose-800 dark:text-rose-200 mb-1">Why Different Scoring?</h4>
                    <p className="text-rose-700 dark:text-rose-300 text-sm">
                      <strong>Standard Mode:</strong> Rewards mosque attendance with higher points (27 vs 1 for home).<br/>
                      <strong>Home Mode:</strong> Treats all on-time prayers equally (27 pts), perfect for those who primarily pray at home.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Metrics Explained */}
          <SectionCard
            id="metrics"
            title="Metrics & Formulas"
            icon={Target}
            isExpanded={expandedSection === 'metrics'}
          >
            <div className="space-y-6">
              <FormulaBox
                title="Average Score"
                formula="Total Score ÷ Days Actually Tracked"
                example="If you scored 135 points over 1 day tracked = 135.00 average"
              />
              
              <FormulaBox
                title="Consistency Percentage"
                formula="(Total Prayers - Not Prayed) ÷ Total Prayers × 100"
                example="If you prayed 4 out of 5 prayers = (5-1) ÷ 5 × 100 = 80%"
              />
              
              <FormulaBox
                title="Masjid Percentage"
                formula="Masjid Prayers ÷ Total Prayers × 100"
                example="If 3 out of 5 prayers were in masjid = 3 ÷ 5 × 100 = 60%"
              />
              
              <FormulaBox
                title="Current Streak"
                formula="Consecutive days with all 5 prayers marked as Home/Masjid"
                example="If you completed all prayers for 7 days in a row = 7 day streak"
              />
              
              <FormulaBox
                title="Best Streak"
                formula="Highest consecutive days achieved in the selected period"
                example="Your longest streak in the current month was 15 days"
              />

              <FormulaBox
                title="Composite Score (Leaderboard)"
                formula="(Average Score × 0.5) + (Consistency × 0.3) + (Streak × 0.15) + (Masjid % × 0.05)"
                example="A balanced score considering all aspects of your prayer performance"
              />
            </div>
          </SectionCard>

          {/* App Settings Guide */}
          <SectionCard
            id="settings"
            title="Settings & Toggles Guide"
            icon={Settings}
            isExpanded={expandedSection === 'settings'}
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                  <div className="flex items-center space-x-3 mb-3">
                    <Building className="w-5 h-5 text-rose-600" />
                    <h4 className="font-semibold text-rose-800 dark:text-rose-200">Masjid Mode Toggle</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    <strong>Location:</strong> Profile → Settings<br/>
                    <strong>Default:</strong> OFF (Standard Mode)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-rose-50 dark:bg-[#0a0a0a] rounded p-3">
                      <h5 className="font-medium text-rose-800 dark:text-rose-200 mb-1">Standard Mode (OFF)</h5>
                      <p className="text-sm text-rose-700 dark:text-rose-300">
                        • Shows "Home" and "Masjid" options<br/>
                        • Rewards mosque attendance highly<br/>
                        • Best for regular mosque-goers
                      </p>
                    </div>
                    <div className="bg-pink-50 dark:bg-[#0a0a0a] rounded p-3">
                      <h5 className="font-medium text-pink-800 dark:text-pink-200 mb-1">Home Mode (ON)</h5>
                      <p className="text-sm text-pink-700 dark:text-pink-300">
                        • Shows only "Prayed" option<br/>
                        • Equal points for all on-time prayers<br/>
                        • Best for home prayer preference
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                  <div className="flex items-center space-x-3 mb-3">
                    <Eye className="w-5 h-5 text-rose-600" />
                    <h4 className="font-semibold text-rose-800 dark:text-rose-200">Privacy Toggle</h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    <strong>Location:</strong> Profile → Settings<br/>
                    <strong>Default:</strong> ON (Public)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-rose-50 dark:bg-[#0a0a0a] rounded p-3">
                      <h5 className="font-medium text-rose-800 dark:text-rose-200 mb-1">Public (ON)</h5>
                      <p className="text-sm text-rose-700 dark:text-rose-300">
                        • Visible on leaderboards<br/>
                        • Others can add you as friend<br/>
                        • Participate in community features
                      </p>
                    </div>
                    <div className="bg-pink-50 dark:bg-[#0a0a0a] rounded p-3">
                      <h5 className="font-medium text-pink-800 dark:text-pink-200 mb-1">Private (OFF)</h5>
                      <p className="text-sm text-pink-700 dark:text-pink-300">
                        • Hidden from leaderboards<br/>
                        • Personal tracking only<br/>
                        • Complete privacy
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* How to Use the App */}
          <SectionCard
            id="guide"
            title="How to Use Namaaz Tracker"
            icon={BookOpen}
            isExpanded={expandedSection === 'guide'}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                    <div className="flex items-center space-x-3 mb-3">
                      <Calendar className="w-5 h-5 text-rose-600" />
                      <h4 className="font-semibold text-rose-800 dark:text-rose-200">1. Track Daily Prayers</h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      • Go to Calendar section<br/>
                      • Click on any date<br/>
                      • Mark each prayer status<br/>
                      • Track Surah Al-Kahf on Fridays
                    </p>
                  </div>

                  <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                    <div className="flex items-center space-x-3 mb-3">
                      <TrendingUp className="w-5 h-5 text-rose-600" />
                      <h4 className="font-semibold text-rose-800 dark:text-rose-200">2. Monitor Progress</h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      • Visit Progress section<br/>
                      • View different time periods<br/>
                      • Analyze your statistics<br/>
                      • Get motivational insights
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                    <div className="flex items-center space-x-3 mb-3">
                      <Users className="w-5 h-5 text-rose-600" />
                      <h4 className="font-semibold text-rose-800 dark:text-rose-200">3. Join Leaderboards</h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      • Enable Public profile<br/>
                      • Compete with others<br/>
                      • Add friends<br/>
                      • Filter by prayer mode
                    </p>
                  </div>

                  <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                    <div className="flex items-center space-x-3 mb-3">
                      <Settings className="w-5 h-5 text-rose-600" />
                      <h4 className="font-semibold text-rose-800 dark:text-rose-200">4. Customize Settings</h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      • Set your prayer mode<br/>
                      • Adjust privacy settings<br/>
                      • Personalize your experience<br/>
                      • Update profile information
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-rose-100 to-pink-100 dark:from-[#0a0a0a] dark:to-[#0a0a0a] rounded-lg p-6 border border-rose-200 dark:border-gray-800">
                <div className="flex items-start space-x-3">
                  <Star className="w-6 h-6 text-rose-600 mt-1" />
                  <div>
                    <h4 className="font-bold text-rose-800 dark:text-rose-200 mb-2">Pro Tips for Success</h4>
                    <ul className="text-rose-700 dark:text-rose-300 space-y-1 text-sm">
                      <li>• Set your Masjid Mode based on your primary prayer location</li>
                      <li>• Track consistently for accurate statistics</li>
                      <li>• Use the Progress section to identify improvement areas</li>
                      <li>• Join leaderboards for motivation and community</li>
                      <li>• Don't forget to mark Surah Al-Kahf on Fridays!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Leaderboard System */}
          <SectionCard
            id="leaderboard"
            title="Leaderboard System"
            icon={Award}
            isExpanded={expandedSection === 'leaderboard'}
          >
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                The leaderboard ensures fair competition by separating users based on their prayer modes and calculating composite scores.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                  <h4 className="font-semibold text-rose-800 mb-2">Filter Options</h4>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• All Users</li>
                    <li>• Standard Mode Only</li>
                    <li>• Home Mode Only</li>
                    <li>• Friends Only</li>
                  </ul>
                </div>

                <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                  <h4 className="font-semibold text-rose-800 mb-2">Time Periods</h4>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• This Week</li>
                    <li>• This Month</li>
                    <li>• This Year</li>
                    <li>• All Time</li>
                  </ul>
                </div>

                <div className="bg-white dark:bg-black rounded-lg p-4 border border-rose-200 dark:border-gray-800">
                  <h4 className="font-semibold text-rose-800 mb-2">Ranking Factors</h4>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• Average Score (50%)</li>
                    <li>• Consistency (30%)</li>
                    <li>• Streak (15%)</li>
                    <li>• Masjid % (5%)</li>
                  </ul>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pb-8">
          <div className="inline-flex items-center space-x-2 text-rose-600">
            <Zap className="w-4 h-4" />
            <span className="text-sm">
              May Allah accept our prayers and grant us consistency in worship.
              <br />
              Enjoying the app? Skip the 5-star rating; a 5-star dua for the developer is priceless!
            </span>
            <Zap className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules;
