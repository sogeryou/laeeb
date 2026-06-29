import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  TrendingUp, 
  ArrowLeft, 
  HelpCircle, 
  ChevronRight, 
  Zap, 
  Star, 
  MessageCircle, 
  FileText, 
  Gift, 
  Gem, 
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { PlayerRanking } from '../types';
import { COMPANION_LEVELS, TaskProgress } from '../companionConstants';

const GlassCard = ({ children, className = "", onClick, ...props }: { children: React.ReactNode, className?: string, onClick?: () => void, [key: string]: any }) => (
  <div
    onClick={onClick}
    className={`bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-3xl overflow-hidden shadow-sm transition-all duration-200 ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    {...props}
  >
    {children}
  </div>
);

const CoinIcon = ({ className = "w-3 h-3", textClassName = "text-[8px]" }: { className?: string, textClassName?: string }) => (
  <span className={`${className} rounded-full bg-yellow-500 inline-flex items-center justify-center shrink-0`}>
    <span className={`${textClassName} text-black font-black leading-none`}>C</span>
  </span>
);

// --- Module 4: Decay & Penalty Explainer Modal ---
export const DecayExplainerModal = ({ 
  ranking, 
  onClose,
  onGoToTasks
}: { 
  ranking: PlayerRanking, 
  onClose: () => void,
  onGoToTasks: () => void
}) => {
  const currentLevelInfo = COMPANION_LEVELS.find(l => l.level === ranking.level)!;
  const decayAmount = Math.floor(ranking.score * currentLevelInfo.decayRate);
  const penaltyAmount = ranking.weeksWithoutOrder * 50;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-md bg-[#0c1714] border border-white/[0.07] rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white">Score Rules</h3>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
            {/* Section 1: Weekly Decay */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Weekly Decay</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Every Monday, scores are reduced by a percentage based on your level.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {COMPANION_LEVELS.map(l => (
                  <div key={l.level} className={`p-2 rounded-xl border ${l.level === ranking.level ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-white/[0.04] border-white/5'}`}>
                    <p className="text-[8px] font-black text-gray-500 uppercase">LV.{l.level}</p>
                    <p className={`text-xs font-black ${l.level === ranking.level ? 'text-white' : 'text-gray-400'}`}>{Math.round(l.decayRate * 100)}%</p>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-[10px] text-emerald-300 font-bold">
                  Your score will decrease by <span className="text-white">{(currentLevelInfo.decayRate * 100).toFixed(0)}%</span> = <span className="text-white">-{decayAmount} pts</span> this Monday.
                </p>
              </div>
            </div>

            {/* Section 2: Inactivity Penalties */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-orange-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Inactivity Penalties</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                If you have no order income for consecutive weeks, additional penalties apply.
              </p>
              <div className="space-y-2">
                {[1, 2, 3, 4].map(w => (
                  <div key={`inactivity-penalty-week-${w}`} className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500 font-bold">{w} Week{w > 1 ? 's' : ''}</span>
                    <span className="text-red-400 font-black">-{w * 50} pts</span>
                  </div>
                ))}
              </div>
              {ranking.weeksWithoutOrder > 0 && (
                <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <p className="text-[10px] text-orange-300 font-bold">
                    Current streak: <span className="text-white">{ranking.weeksWithoutOrder} week(s)</span>. Penalty: <span className="text-white">-{penaltyAmount} pts</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Section 3: Protections */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Protections</span>
              </div>
              <ul className="space-y-2">
                <li className="flex gap-2 text-[10px] text-gray-400">
                  <div className="w-1 h-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  No decay applies in the week you level up.
                </li>
                <li className="flex gap-2 text-[10px] text-gray-400">
                  <div className="w-1 h-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  If your score reaches 0, no further decay or penalty is applied.
                </li>
              </ul>
            </div>

            {/* Section 4: Disqualification Warning */}
            {(ranking.weeksWithoutOrder >= 3 || ranking.weeklyStats.consecutiveL1Weeks >= 3) && (
              <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 space-y-2">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Disqualification Warning</span>
                </div>
                <p className="text-[10px] text-red-300 leading-relaxed font-medium">
                  If you remain at Level 1 for 4 consecutive weeks, your companion qualification will be suspended for 1 month.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 py-4 bg-white/[0.04] rounded-2xl font-black text-gray-400 text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              I Understand
            </button>
            <button 
              onClick={onGoToTasks}
              className="flex-1 py-4 bg-emerald-600 rounded-2xl font-black text-white text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Go Earn Points
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Module 5: Tier Table Modal ---
export const TierTableModal = ({ 
  ranking, 
  onClose 
}: { 
  ranking: PlayerRanking, 
  onClose: () => void 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-md bg-[#0c1714] border border-white/[0.07] rounded-[32px] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center">
            <h3 className="text-xl font-black text-white">Player Level</h3>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/[0.07]">
                    <th className="px-4 py-3 text-[8px] font-black text-gray-500 uppercase tracking-widest">Level</th>
                    <th className="px-4 py-3 text-[8px] font-black text-gray-500 uppercase tracking-widest">Points</th>
                    <th className="px-4 py-3 text-[8px] font-black text-gray-500 uppercase tracking-widest">Price</th>
                    <th className="px-4 py-3 text-[8px] font-black text-gray-500 uppercase tracking-widest">Exposure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {COMPANION_LEVELS.map(l => (
                    <tr 
                      key={l.level} 
                      className={`transition-colors ${l.level === ranking.level ? 'bg-emerald-600/10' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black ${l.level === ranking.level ? 'text-white' : 'text-gray-400'}`}>LV.{l.level}</span>
                          {l.level > ranking.level && <Lock className="w-2.5 h-2.5 text-gray-700" />}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[10px] font-bold text-gray-500">{l.minPoints}+</td>
                      <td className="px-4 py-4 text-[10px] font-bold text-gray-500">{l.minPrice}-{l.maxPrice}</td>
                      <td className="px-4 py-4 text-[10px] font-bold text-gray-500 truncate max-w-[80px]">{l.exposureBoost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-emerald-600 rounded-2xl font-black text-white text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Module 6: Metric Help Modal ---
export const MetricHelpModal = ({ 
  type, 
  onClose 
}: { 
  type: 'REPLY' | 'ACCEPT' | 'RATING', 
  onClose: () => void 
}) => {
  const configs = {
    REPLY: {
      title: 'Reply Rate Rules (5min)',
      description: 'Points earned based on your message response rate within 5 minutes this week.',
      tiers: [
        { label: '≥ 90%', pts: 35 },
        { label: '≥ 75%', pts: 20 },
        { label: '≥ 60%', pts: 5 },
        { label: '< 60%', pts: 0 },
      ]
    },
    ACCEPT: {
      title: 'Acceptance Rate Rules (5min)',
      description: 'Points earned based on your order acceptance rate within 5 minutes this week.',
      tiers: [
        { label: '≥ 90%', pts: 35 },
        { label: '≥ 75%', pts: 20 },
        { label: '≥ 60%', pts: 5 },
        { label: '< 60%', pts: 0 },
      ]
    },
    RATING: {
      title: 'Weekly Rating Rules',
      description: 'Points earned based on your total stars received this week.',
      tiers: [
        { label: '≥ 150 Stars', pts: 50 },
        { label: '≥ 100 Stars', pts: 30 },
        { label: '≥ 50 Stars', pts: 10 },
        { label: '≥ 20 Stars', pts: 5 },
      ]
    }
  };

  const config = configs[type];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-xs bg-[#0c1714] border border-white/[0.07] rounded-[32px] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-black text-white">{config.title}</h3>
            <p className="text-[10px] text-gray-500 font-medium">{config.description}</p>
          </div>

          <div className="space-y-2">
            {config.tiers.map((tier, i) => (
              <div key={`metric-tier-${i}`} className="flex items-center justify-between p-3 bg-white/[0.04] rounded-xl border border-white/5">
                <span className="text-xs font-bold text-gray-400">{tier.label}</span>
                <span className="text-xs font-black text-emerald-400">+{tier.pts} pts</span>
              </div>
            ))}
          </div>

          <button 
            onClick={onClose}
            className="w-full py-3 bg-white/[0.04] rounded-xl font-black text-gray-400 text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Module 1: My Level Dashboard ---
export const CompanionLevelDashboard = ({ 
  ranking, 
  onBack, 
  onNavigate 
}: { 
  ranking: PlayerRanking, 
  onBack: () => void,
  onNavigate: (view: any) => void 
}) => {
  const [showDecayModal, setShowDecayModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);

  const currentLevelInfo = COMPANION_LEVELS.find(l => l.level === ranking.level)!;
  const nextLevelInfo = COMPANION_LEVELS.find(l => l.level === ranking.level + 1);
  
  const decayRate = currentLevelInfo.decayRate;
  const projectedScore = ranking.justLeveledUpThisWeek 
    ? ranking.score 
    : Math.max(0, Math.floor(ranking.score * (1 - decayRate)) - (ranking.weeksWithoutOrder * 50));
  
  const dropLevelRisk = ranking.level > 1 && projectedScore < currentLevelInfo.minPoints;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen pb-12 bg-[#07110f] space-y-8"
    >
      <AnimatePresence>
        {showDecayModal && (
          <DecayExplainerModal 
            ranking={ranking} 
            onClose={() => setShowDecayModal(false)}
            onGoToTasks={() => {
              setShowDecayModal(false);
              onNavigate('TASK_CENTER');
            }}
          />
        )}
        {showTierModal && (
          <TierTableModal 
            ranking={ranking} 
            onClose={() => setShowTierModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md border-b border-white/[0.06] p-6 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-white/[0.04] rounded-xl border border-white/[0.07]">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">My Level</h1>
        <button 
          onClick={() => onNavigate('TASK_CENTER')}
          className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 text-white"
        >
          <Zap className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 space-y-8">
        {/* Level Card (Progress Box) */}
        <GlassCard className="p-8 bg-gradient-to-br from-emerald-600/20 via-emerald-900/10 to-transparent border-emerald-500/30 relative overflow-hidden">
          {/* Quick Actions in Progress Box */}
          <div className="absolute top-4 right-4 z-20">
            <button 
              onClick={() => setShowTierModal(true)}
              className="p-1.5 bg-white/[0.04] rounded-lg border border-white/[0.07] text-gray-400 hover:text-white transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center space-y-6">
            {/* Badge */}
            <div className="relative pb-6">
              <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] border-2 border-white/20">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-white rounded-full shadow-xl z-20">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">LV. {ranking.level}</span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight">{currentLevelInfo.name} Companion</h2>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-3">
              {ranking.level === 6 ? (
                <div className="py-2 px-6 bg-yellow-500/10 border border-yellow-500/20 rounded-full inline-block">
                  <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">MAX LEVEL REACHED</span>
                </div>
              ) : nextLevelInfo ? (
                <>
                  <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06] relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (ranking.score / nextLevelInfo.minPoints) * 100)}%` }}
                      className="h-full bg-gradient-to-r from-emerald-600 to-blue-500"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-gray-400">{ranking.score} pts</span>
                    <span className="text-emerald-400">{nextLevelInfo.minPoints - ranking.score} pts to LV.{ranking.level + 1}</span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Projected Score Inside Box */}
            <div className="w-full pt-6 border-t border-white/[0.06] flex items-center justify-between">
              <div className="text-left space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Estimated Next Week</p>
                  <button 
                    onClick={() => setShowDecayModal(true)}
                    className="text-gray-600 hover:text-emerald-400 transition-colors"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-black ${dropLevelRisk ? 'text-red-400' : 'text-white'}`}>{projectedScore}</span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase">pts</span>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dropLevelRisk ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                <TrendingUp className={`w-5 h-5 ${dropLevelRisk ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Current Benefits Section */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Current Benefits (LV.{ranking.level})</p>
          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-5 space-y-3 bg-emerald-600/10 border-emerald-500/20">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                <CoinIcon className="w-5 h-5" textClassName="text-[10px]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Pricing Range</p>
                <p className="text-sm font-black text-white">{currentLevelInfo.minPrice}-{currentLevelInfo.maxPrice} coins</p>
              </div>
            </GlassCard>
            <GlassCard className="p-5 space-y-3 bg-blue-600/10 border-blue-500/20">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Exposure</p>
                <p className="text-sm font-black text-white">{currentLevelInfo.exposureBoost}</p>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Points Breakdown */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Points Breakdown</p>
          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-black text-white">+{ranking.weeklyPointsBreakdown.activity}</span>
              </div>
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Activity Points</p>
            </GlassCard>
            <GlassCard className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Star className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black text-white">+{ranking.weeklyPointsBreakdown.service}</span>
              </div>
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Service Points</p>
            </GlassCard>
            <GlassCard className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
                <span className="text-xs font-black text-red-400">-{ranking.weeklyPointsBreakdown.decay}</span>
              </div>
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Weekly Decay</p>
            </GlassCard>
            <GlassCard className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-black text-orange-400">-{ranking.weeklyPointsBreakdown.penalty}</span>
              </div>
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Penalties</p>
            </GlassCard>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Module 2: Task Center ---
export const TaskCenter = ({ 
  ranking, 
  onBack 
}: { 
  ranking: PlayerRanking, 
  onBack: () => void 
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVITY' | 'SERVICE'>('ACTIVITY');
  const [helpType, setHelpType] = useState<'REPLY' | 'ACCEPT' | 'RATING' | null>(null);

  // Mock task data based on rules
  const activityTasks: TaskProgress[] = [
    { id: 'login', name: 'Daily Login', description: '+3 pts/day', earnedPts: ranking.weeklyStats.logins * 3, capPts: 15, currentValue: ranking.weeklyStats.logins, status: ranking.weeklyStats.logins >= 5 ? 'COMPLETED' : 'IN_PROGRESS', type: 'ACTIVITY', unit: 'days' },
    { id: 'post', name: 'Daily Post', description: '+5 pts/day', earnedPts: ranking.weeklyStats.posts * 5, capPts: 15, currentValue: ranking.weeklyStats.posts, status: ranking.weeklyStats.posts >= 3 ? 'COMPLETED' : 'IN_PROGRESS', type: 'ACTIVITY', unit: 'posts' },
    { id: 'greet', name: 'Greet New Users', description: '+5 pts/reply', earnedPts: ranking.weeklyStats.greetings * 5, capPts: 50, currentValue: ranking.weeklyStats.greetings, status: ranking.weeklyStats.greetings >= 10 ? 'COMPLETED' : 'IN_PROGRESS', type: 'ACTIVITY', unit: 'users' },
    { id: 'reply', name: 'Reply Rate (5min)', description: '≥90%=35pts', earnedPts: ranking.weeklyStats.responseRate >= 0.9 ? 35 : ranking.weeklyStats.responseRate >= 0.75 ? 20 : ranking.weeklyStats.responseRate >= 0.6 ? 5 : 0, capPts: 35, currentValue: ranking.weeklyStats.responseRate * 100, status: ranking.weeklyStats.responseRate >= 0.9 ? 'COMPLETED' : 'IN_PROGRESS', type: 'ACTIVITY', unit: '%', rate: ranking.weeklyStats.responseRate },
    { id: 'accept', name: 'Acceptance Rate (5min)', description: '≥90%=35pts', earnedPts: ranking.weeklyStats.acceptanceRate >= 0.9 ? 35 : ranking.weeklyStats.acceptanceRate >= 0.75 ? 20 : ranking.weeklyStats.acceptanceRate >= 0.6 ? 5 : 0, capPts: 35, currentValue: ranking.weeklyStats.acceptanceRate * 100, status: ranking.weeklyStats.acceptanceRate >= 0.9 ? 'COMPLETED' : 'IN_PROGRESS', type: 'ACTIVITY', unit: '%', rate: ranking.weeklyStats.acceptanceRate },
  ];

  const serviceTasks: TaskProgress[] = [
    { id: 'new_users', name: 'New Users Served', description: '+10 pts/user', earnedPts: ranking.weeklyStats.newUsersServed * 10, capPts: 100, currentValue: ranking.weeklyStats.newUsersServed, status: ranking.weeklyStats.newUsersServed >= 10 ? 'COMPLETED' : 'IN_PROGRESS', type: 'SERVICE', unit: 'users' },
    { id: 'repeat_users', name: 'Repeat Users Served', description: '+5 pts/user', earnedPts: ranking.weeklyStats.repeatUsersServed * 5, capPts: 100, currentValue: ranking.weeklyStats.repeatUsersServed, status: ranking.weeklyStats.repeatUsersServed >= 20 ? 'COMPLETED' : 'IN_PROGRESS', type: 'SERVICE', unit: 'users' },
    { id: 'rating', name: 'Weekly Rating Stars', description: '≥150=50pts', earnedPts: ranking.weeklyStats.totalStars >= 150 ? 50 : ranking.weeklyStats.totalStars >= 100 ? 30 : ranking.weeklyStats.totalStars >= 50 ? 10 : ranking.weeklyStats.totalStars >= 20 ? 5 : 0, capPts: 150, currentValue: ranking.weeklyStats.totalStars, status: ranking.weeklyStats.totalStars >= 150 ? 'COMPLETED' : 'IN_PROGRESS', type: 'SERVICE', unit: 'stars' },
    { id: 'gift', name: 'Gift Revenue', description: '+2 pts/10 diamonds', earnedPts: Math.floor(ranking.weeklyStats.giftIncome / 10) * 2, capPts: 9999, currentValue: ranking.weeklyStats.giftIncome, status: 'IN_PROGRESS', type: 'SERVICE', unit: 'diamonds' },
    { id: 'revenue', name: 'Total Revenue', description: '+1 pt/20 diamonds', earnedPts: Math.floor(ranking.weeklyStats.totalIncome / 20) * 1, capPts: 9999, currentValue: ranking.weeklyStats.totalIncome, status: 'IN_PROGRESS', type: 'SERVICE', unit: 'diamonds' },
  ];

  const currentTasks = activeTab === 'ACTIVITY' ? activityTasks : serviceTasks;
  const totalEarned = currentTasks.reduce((sum, t) => sum + t.earnedPts, 0);
  const totalCap = activeTab === 'ACTIVITY' ? 150 : 9999;

  const getRateColor = (rate: number) => {
    if (rate >= 0.9) return 'text-green-500';
    if (rate >= 0.75) return 'text-yellow-500';
    if (rate >= 0.6) return 'text-orange-500';
    return 'text-red-500';
  };

  const handleHelpClick = (taskId: string) => {
    if (taskId === 'reply') setHelpType('REPLY');
    else if (taskId === 'accept') setHelpType('ACCEPT');
    else if (taskId === 'rating') setHelpType('RATING');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen pb-20 bg-[#07110f] space-y-6"
    >
      <AnimatePresence>
        {helpType && (
          <MetricHelpModal 
            type={helpType} 
            onClose={() => setHelpType(null)} 
          />
        )}
      </AnimatePresence>

      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md border-b border-white/[0.06] p-6 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-white/[0.04] rounded-xl border border-white/[0.07] relative z-10">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">Task Center</h1>
        <div className="w-10" />
      </div>

      <div className="px-6 space-y-6">

      {/* Summary Bar */}
      <GlassCard className="p-4 bg-emerald-600/10 border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">This Week Progress</p>
            <p className="text-sm font-black text-white">{totalEarned} pts earned</p>
          </div>
          {activeTab === 'ACTIVITY' && (
            <div className="text-right">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Cap Remaining</p>
              <p className="text-sm font-black text-emerald-400">{Math.max(0, totalCap - totalEarned)} pts</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex bg-white/[0.04] p-1 rounded-2xl border border-white/[0.07]">
        <button 
          onClick={() => setActiveTab('ACTIVITY')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ACTIVITY' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500'}`}
        >
          Activity Tasks
        </button>
        <button 
          onClick={() => setActiveTab('SERVICE')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SERVICE' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500'}`}
        >
          Service Tasks
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {currentTasks.map(task => (
          <GlassCard key={task.id} className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-white text-sm">{task.name}</h4>
                  {(task.id === 'reply' || task.id === 'accept' || task.id === 'rating') && (
                    <button 
                      onClick={() => handleHelpClick(task.id)}
                      className="text-gray-600 hover:text-emerald-400 transition-colors"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 font-medium">{task.description}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-emerald-400">+{task.earnedPts} pts</p>
                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">earned</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="flex items-baseline gap-1">
                  {task.rate !== undefined ? (
                    <span className={`text-lg font-black ${getRateColor(task.rate)}`}>{(task.rate * 100).toFixed(0)}%</span>
                  ) : (
                    <span className="text-lg font-black text-white">{task.currentValue}</span>
                  )}
                  <span className="text-[10px] text-gray-500 font-bold">/ {task.capPts === 9999 ? '∞' : task.capPts} {task.unit}</span>
                </div>
                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                  task.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                  task.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-white/[0.04] text-gray-500'
                }`}>
                  {task.status.replace('_', ' ')}
                </div>
              </div>
              {task.capPts !== 9999 && (
                <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (task.currentValue / (task.capPts === 0 ? 1 : task.capPts)) * 100)}%` }}
                    className={`h-full ${task.status === 'COMPLETED' ? 'bg-green-500' : 'bg-emerald-600'}`}
                  />
                </div>
              )}
            </div>

            {task.id === 'greet' && task.status !== 'COMPLETED' && (
              <button className="w-full py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-white/10 transition-all">
                Find New Users to Greet →
              </button>
            )}
          </GlassCard>
        ))}
      </div>
      </div>
    </motion.div>
  );
};

// --- Module 3: Level Benefits ---
export const LevelBenefits = ({ 
  ranking, 
  onBack 
}: { 
  ranking: PlayerRanking, 
  onBack: () => void 
}) => {
  const currentLevelInfo = COMPANION_LEVELS.find(l => l.level === ranking.level)!;
  const nextLevelInfo = COMPANION_LEVELS.find(l => l.level === ranking.level + 1);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between relative">
        <button onClick={onBack} className="p-2 bg-white/[0.04] rounded-xl border border-white/[0.07] relative z-10">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">Level Benefits</h1>
        <div className="w-10" />
      </div>

      {/* Current Benefits */}
      <div className="space-y-4">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Current Benefits (LV.{ranking.level})</p>
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-5 space-y-3 bg-emerald-600/10 border-emerald-500/20">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400">
              <CoinIcon className="w-5 h-5" textClassName="text-[10px]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Pricing Range</p>
              <p className="text-sm font-black text-white">{currentLevelInfo.minPrice}-{currentLevelInfo.maxPrice} coins</p>
            </div>
          </GlassCard>
          <GlassCard className="p-5 space-y-3 bg-blue-600/10 border-blue-500/20">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Exposure</p>
              <p className="text-sm font-black text-white">{currentLevelInfo.exposureBoost}</p>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Next Level Teaser */}
      <div className="space-y-4">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Unlock Next Level</p>
        {nextLevelInfo ? (
          <GlassCard className="p-6 relative group">
            <div className="absolute top-4 right-4">
              <Lock className="w-5 h-5 text-gray-700 group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                <Trophy className="w-7 h-7 text-gray-600" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">LV.{nextLevelInfo.level} {nextLevelInfo.name}</h4>
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">{nextLevelInfo.minPoints - ranking.score} pts to unlock</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500 font-bold uppercase">Pricing Range</span>
                <span className="text-white font-black">{nextLevelInfo.minPrice}-{nextLevelInfo.maxPrice} coins</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500 font-bold uppercase">Exposure</span>
                <span className="text-white font-black">{nextLevelInfo.exposureBoost}</span>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-8 text-center bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h4 className="text-lg font-black text-white mb-2">You've reached the top!</h4>
            <p className="text-xs text-gray-500 font-medium">Maintain your score to keep these benefits.</p>
          </GlassCard>
        )}
      </div>

      {/* Comparison Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tier Comparison</p>
        </div>

        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.04] border-b border-white/[0.07]">
                  <th className="px-4 py-3 text-[8px] font-black text-gray-500 uppercase tracking-widest">Level</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-500 uppercase tracking-widest">Points</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-500 uppercase tracking-widest">Price</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-500 uppercase tracking-widest">Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {COMPANION_LEVELS.map(l => (
                  <tr 
                    key={l.level} 
                    className={`transition-colors ${l.level === ranking.level ? 'bg-emerald-600/10' : 'hover:bg-white/[0.02]'}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black ${l.level === ranking.level ? 'text-white' : 'text-gray-400'}`}>LV.{l.level}</span>
                        {l.level > ranking.level && <Lock className="w-2.5 h-2.5 text-gray-700" />}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[10px] font-bold text-gray-500">{l.minPoints}+</td>
                    <td className="px-4 py-4 text-[10px] font-bold text-gray-500">{l.minPrice}-{l.maxPrice}</td>
                    <td className="px-4 py-4 text-[10px] font-bold text-gray-500 truncate max-w-[80px]">{l.exposureBoost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Earnings Estimator */}
      <GlassCard className="p-6 bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-white text-sm">Earnings Estimator</h4>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          At your current order rate, <span className="text-white">Level {ranking.level + 1}</span> pricing could earn you <span className="text-green-400">~240 more diamonds/week</span>.
        </p>
      </GlassCard>
    </motion.div>
  );
};
