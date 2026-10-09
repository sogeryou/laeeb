import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Gem, FileText, Gamepad2, BarChart3, Users, ChevronRight } from 'lucide-react';
import { type PlayerRanking } from './data';
export { rankingFromCenter } from './data';
const GlassCard = ({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => <div onClick={onClick} className={`bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-3xl overflow-hidden shadow-sm transition-all duration-200 ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}>{children}</div>;
export function OriginalCenterHome({ ranking, onBack, onNavigate }: { ranking: PlayerRanking; onBack: () => void; onNavigate: (view: string) => void }) { return (<motion.div 
              key="player_center"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
            >
              <div className="flex items-center justify-between relative">
                <button onClick={onBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">Player Center</h1>
                <div className="w-10" />
              </div>

              {/* Player Stats Overview */}
              <div className="space-y-4">
                <GlassCard 
                  onClick={() => onNavigate('COMPANION_LEVEL_DASHBOARD')}
                  className="p-8 bg-gradient-to-br from-emerald-600/20 via-emerald-900/10 to-transparent border-emerald-500/30 relative overflow-hidden cursor-pointer hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Player Level</p>
                  </div>
                  <div className="flex items-end justify-between mb-6">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-white leading-none">LV. {ranking.pending ? '—' : ranking.level}</span>
                      {!ranking.pending && ranking.level < 6 && (
                        <span className="text-xs font-bold text-gray-500 mb-1">/ LV. {ranking.level + 1}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Weekly Income</p>
                      <div className="flex items-center justify-end gap-1.5">
                        <Gem className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-sm font-black text-white tracking-tight">{ranking.weeklyStats.totalIncome}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(ranking.score / (ranking.nextLevelThreshold || ranking.score)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-pink-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      />
                    </div>
                  </div>
                </GlassCard>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => onNavigate('PLAYER_ORDERS')}
                  className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/10 hover:bg-white/10 active:scale-[0.99] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">My Order</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => onNavigate('PLAYER_SERVICES')}
                  className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/10 hover:bg-white/10 active:scale-[0.99] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <Gamepad2 className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">Game Services</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => onNavigate('INCOME_REVIEW')}
                  className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/10 hover:bg-white/10 active:scale-[0.99] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">Income Review</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => onNavigate('CUSTOMER_REVIEW')}
                  className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/10 hover:bg-white/10 active:scale-[0.99] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">Customer Review</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </motion.div>); }

