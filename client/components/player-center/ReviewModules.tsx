import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Gem, 
  Gift, 
  UserPlus, 
  Users, 
  Star, 
  Search, 
  Filter, 
  MessageCircle, 
  ChevronRight, 
  ArrowLeft, 
  MoreHorizontal,
  Lock,
  Info,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  DollarSign,
  BarChart3,
  SlidersHorizontal,
  Gamepad2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  LayoutList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCenterData, DataNotice, placeholderAvatar, type PlayerRanking } from './data';

// --- Reusable Components ---

const CoinIcon = ({ className = "w-3 h-3", textClassName = "text-[8px]" }: { className?: string, textClassName?: string }) => (
  <span className={`${className} rounded-full bg-yellow-500 inline-flex items-center justify-center shrink-0`}>
    <span className={`${textClassName} text-black font-black leading-none`}>C</span>
  </span>
);

const GlassCard = ({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void, key?: React.Key }) => (
  <div
    onClick={onClick}
    className={`bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-3xl overflow-hidden shadow-sm transition-all duration-200 ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
  >
    {children}
  </div>
);

const Badge = ({ children, color = "emerald" }: { children: React.ReactNode, color?: 'emerald' | 'blue' | 'green' | 'red' | 'orange', key?: React.Key }) => {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- Original reusable components ---

const StatCard = ({ label, value, change, icon: Icon, color }: { label: string, value: string | number, change: number, icon: any, color: string }) => (
  <GlassCard className="p-4 space-y-2">
    <div className="flex items-center justify-between">
      <div className={`p-2 rounded-xl bg-${color}-500/10 text-${color}-400`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(change)}%
      </div>
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  </GlassCard>
);

const HealthIndicator = ({ label, value, status }: { label: string, value: string, status: 'healthy' | 'warning' | 'critical' }) => {
  const colors = {
    healthy: 'text-green-400 bg-green-400',
    warning: 'text-yellow-400 bg-yellow-400',
    critical: 'text-red-400 bg-red-400',
  };
  return (
    <div className="flex items-center justify-between p-3 bg-white/[0.04] rounded-xl border border-white/[0.07]">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-black ${colors[status].split(' ')[0]}`}>{value}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${colors[status].split(' ')[1]}`} />
      </div>
    </div>
  );
};

// --- Main Modules ---

export const IncomeReview = ({ onBack, ranking }: { onBack: () => void, ranking: PlayerRanking }) => {
  const [timeDimension, setTimeDimension] = useState<'DAY' | 'WEEK' | 'MONTH' | 'ALL'>('WEEK');
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const resource = useCenterData(timeDimension);
  const currentStats = { total: resource.data?.income.total ?? 0, service: resource.data?.income.service ?? 0, gift: resource.data?.income.gift };
  const [serviceLimit, setServiceLimit] = useState(20);
  useEffect(() => setServiceLimit(20), [timeDimension]);
  const serviceBreakdown = (resource.data?.income.services || []).slice(0, serviceLimit).map(s => ({
    id: s.id, name: s.name, day: s.income, week: s.income, month: s.income, all: s.income,
    subItems: [{ name: s.orders + ' settled orders', day: s.income, week: s.income, month: s.income, all: s.income }]
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen pb-20 bg-[#07110f]"
    >
      <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-xl border-b border-white/[0.07] p-4">
        <div className="flex items-center justify-between relative">
          <button onClick={onBack} className="p-2 bg-white/[0.04] rounded-xl border border-white/[0.07] relative z-10 transition-all active:scale-95">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <h1 className="text-lg font-black text-white absolute left-1/2 -translate-x-1/2 uppercase tracking-tight">Income Review</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Statistics Cards */}
        <div className="flex flex-col gap-4">
          <div className="flex bg-white/[0.04] rounded-2xl p-1.5 border border-white/[0.07] self-start">
            {(['DAY', 'WEEK', 'MONTH', 'ALL'] as const).map(d => (
                <button
                  key={`review-trend-time-${d}`}
                  onClick={() => {
                    setTimeDimension(d);
                    setExpandedService(null);
                  }}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    timeDimension === d ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <GlassCard className="p-6 bg-gradient-to-br from-emerald-600/20 to-transparent border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1 opacity-60">Total Income</p>
                    <div className="flex items-center gap-2">
                      <span className="text-4xl font-black text-white leading-none">{currentStats.total.toLocaleString()}</span>
                      <div className="flex items-center justify-center -mb-0.5">
                        <Gem aria-label="Diamonds" className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                </div>
              </GlassCard>

              <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-5 space-y-3 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Service</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xl font-black text-white">{currentStats.service.toLocaleString()}</p>
                      <Gem aria-label="Diamonds" className="w-4 h-4"  />
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-5 space-y-3 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                      <Gift className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gift <span className="normal-case tracking-normal">(not connected)</span></p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xl font-black text-white">{currentStats.gift == null ? '—' : currentStats.gift.toLocaleString()}</p>
                      <Gem aria-label="Diamonds" className="w-4 h-4"  />
                    </div>
                  </div>
                </GlassCard>
              </div>
          </div>
        </div>
      </div>

      {/* Service Detail Breakdown */}
      <div className="p-6 pt-0 space-y-4">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Service Breakdown</p>

        <div className="space-y-3">
          {serviceBreakdown.map((service, idx) => {
            const isExpanded = expandedService === service.id;
            const value = timeDimension === 'DAY' ? service.day : timeDimension === 'WEEK' ? service.week : timeDimension === 'MONTH' ? service.month : service.all;
            
            return (
                  <div key={`service-${service.name}-${idx}`} className="space-y-2">
                <GlassCard 
                  onClick={() => setExpandedService(isExpanded ? null : service.id)}
                  className={`p-4 flex items-center justify-between transition-all ${isExpanded ? 'border-emerald-500/50 bg-white/10' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isExpanded ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/[0.04] text-gray-400 border-white/[0.07]'}`}>
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{service.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        {timeDimension === 'DAY' ? 'Today' : timeDimension === 'WEEK' ? 'This Week' : timeDimension === 'MONTH' ? 'This Month' : 'All Time'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-base font-black text-white">{value}</span>
                        <Gem aria-label="Diamonds" className="w-3 h-3" />
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      className="text-gray-500"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.div>
                  </div>
                </GlassCard>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden px-2"
                    >
                      <div className="bg-white/[0.04] rounded-2xl border border-white/[0.07] p-4 space-y-3">
                        {service.subItems.map((sub, sIdx) => {
                          const subValue = timeDimension === 'DAY' ? sub.day : timeDimension === 'WEEK' ? sub.week : timeDimension === 'MONTH' ? sub.month : sub.all;
                          return (
                            <div key={`sub-${service.name}-${sub.name}-${sIdx}`} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-xs text-gray-400 font-medium">{sub.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-white">{subValue}</span>
                                <Gem aria-label="Diamonds" className="w-2.5 h-2.5" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      {serviceLimit < (resource.data?.income.services.length || 0) && <button className="mx-6 px-5 py-3 rounded-xl bg-emerald-600/10 text-emerald-400 text-xs" onClick={() => setServiceLimit(v => v + 20)}>Load more services</button>}
      {!resource.loading && !resource.error && resource.data && !serviceBreakdown.length && <p className="px-6 text-xs text-gray-500">No income in this period.</p>}
      <DataNotice resource={resource} />

    </motion.div>
  );
};

export const CustomerReview = ({ onBack, onNavigate }: { onBack: () => void, onNavigate: (view: string, data?: any) => void }) => {
  const [timeDimension, setTimeDimension] = useState<'DAY' | 'WEEK' | 'MONTH' | 'ALL'>('WEEK');
  const [showTimeFilter, setShowTimeFilter] = useState(false);

  // New states for drilling
  const [customerListView, setCustomerListView] = useState<'TOTAL' | 'OLD' | 'NEW' | null>(null);
  const [selectedServiceRating, setSelectedServiceRating] = useState<any | null>(null);
  
  // Sorting and filtering for drill-downs
  const [drillSortField, setDrillSortField] = useState<'orders' | 'spend'>('orders');
  const [drillSortOrder, setDrillSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showDrillSort, setShowDrillSort] = useState(false);
  const [showServiceSwitcher, setShowServiceSwitcher] = useState(false);

  const [selectedReviewTag, setSelectedReviewTag] = useState<string | null>(null);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);
  const [reviewSortOrder, setReviewSortOrder] = useState<'DEFAULT' | 'NEWEST' | 'OLDEST' | 'RATING_HIGH' | 'RATING_LOW'>('DEFAULT');
  const [showReviewFilterModal, setShowReviewFilterModal] = useState(false);

  const [customerSortField, setCustomerSortField] = useState<'lastServed' | 'orders' | 'spend'>('lastServed');
  const [customerSortOrder, setCustomerSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCustomerSort, setShowCustomerSort] = useState(false);

  const resource = useCenterData(timeDimension, customerListView === 'NEW' ? 'NEW' : customerListView === 'OLD' ? 'OLD' : 'ALL',
    customerListView ? (drillSortField === 'orders' ? 'ORDERS' : 'INCOME') : customerSortField === 'lastServed' ? 'TIME' : customerSortField === 'orders' ? 'ORDERS' : 'INCOME',
    (customerListView ? drillSortOrder : customerSortOrder) === 'asc' ? 'ASC' : 'DESC');
  const counts = resource.data?.customers.counts || { total: 0, old: 0, new: 0 };
  const customerStats = { DAY: counts, WEEK: counts, MONTH: counts, ALL: counts };
  const customers = (resource.data?.customers.items || []).map(c => ({ id: c.id, nickname: c.name, avatar: placeholderAvatar, tags: c.group === 'NEW' ? ['NEW'] : ['REPEAT'], totalOrders: c.orders, totalSpend: c.income, lastServedAt: c.latest }));
  const sortedCustomers = customers;
  const serviceRatings = (resource.data?.customers.services || []).map(s => ({ id: s.id, name: s.name, rating: s.rating, count: s.reviews, tags: [] as { name: string; count: number }[], reviews: [] as any[] }));
  useEffect(() => { setSelectedServiceRating(null); }, [timeDimension]);
  const currentIndex = selectedServiceRating 
    ? serviceRatings.findIndex(s => s.name === selectedServiceRating.name)
    : -1;

  const handleServiceSwipe = (direction: 'next' | 'prev') => {
    if (!selectedServiceRating) return;
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % serviceRatings.length
      : (currentIndex - 1 + serviceRatings.length) % serviceRatings.length;
    setSelectedServiceRating(serviceRatings[newIndex]);
  };
  

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen pb-20 bg-[#07110f]"
    >
      {/* Header - Fixed */}
      <div className="sticky top-0 z-[60] bg-[#07110f]/80 backdrop-blur-xl border-b border-white/[0.07] p-6">
        <div className="flex items-center justify-between relative">
          <button 
            onClick={() => {
              if (customerListView || selectedServiceRating) {
                setCustomerListView(null);
                setSelectedServiceRating(null);
              } else {
                onBack();
              }
            }} 
            className="p-2 bg-white/[0.04] rounded-xl border border-white/[0.07] relative z-10"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
            {customerListView ? 'Served Customers' : 
             selectedServiceRating ? selectedServiceRating.name : 'Customer Review'}
          </h1>
          
          <div className="flex items-center gap-2 relative z-10">
            {selectedServiceRating && (
              <div className="relative">
                <button 
                  onClick={() => setShowServiceSwitcher(!showServiceSwitcher)}
                  className={`p-1.5 rounded-lg border transition-all ${showServiceSwitcher ? 'bg-emerald-600 border-emerald-500 shadow-lg' : 'bg-white/[0.04] border-white/[0.07] text-gray-400'}`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showServiceSwitcher && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowServiceSwitcher(false)}
                        className="fixed inset-0 z-[70]"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-[#0c1714] border border-white/[0.07] rounded-2xl shadow-2xl z-[120] overflow-hidden max-h-[300px] overflow-y-auto p-2"
                      >
                        <div className="p-2 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/[0.06] mb-1">Select Service</div>
                        {serviceRatings.map(s => (
                          <button
                            key={`switcher-top-${s.name}`}
                            onClick={() => {
                              setSelectedServiceRating(s);
                              setShowServiceSwitcher(false);
                            }}
                            className={`w-full text-left p-3 rounded-xl transition-all ${selectedServiceRating?.name === s.name ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                          >
                            <p className="text-xs font-bold">{s.name}</p>
                            <div className="flex items-center gap-1 mt-0.5 opacity-60">
                              <Star className="w-2.5 h-2.5 text-yellow-500 fill-current" />
                              <span className="text-[10px]">{s.rating}</span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {customerListView && (
              <div className="relative">
                <button 
                  onClick={() => setShowTimeFilter(!showTimeFilter)}
                  className={`p-1.5 rounded-lg border transition-all ${showTimeFilter ? 'bg-emerald-600 border-emerald-500 shadow-lg' : 'bg-white/[0.04] border-white/[0.07] text-gray-400'}`}
                >
                  <Filter className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showTimeFilter && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowTimeFilter(false)}
                        className="fixed inset-0 z-[70]"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-40 bg-[#0c1714] border border-white/[0.07] rounded-2xl shadow-2xl z-[80] overflow-hidden"
                      >
                        {(['DAY', 'WEEK', 'MONTH', 'ALL'] as const).map(d => (
                          <button
                            key={`review-customer-time-${d}`}
                            onClick={() => {
                              setTimeDimension(d);
                              setShowTimeFilter(false);
                            }}
                            className={`w-full text-left p-4 text-[10px] font-black uppercase tracking-widest transition-all border-b border-white/[0.06] last:border-0 ${
                              timeDimension === d ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-white/5'
                            }`}
                          >
                            {d === 'DAY' ? 'Today' : d === 'WEEK' ? 'Week' : d === 'MONTH' ? 'Month' : 'All'}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {!customerListView && !selectedServiceRating && (
          <>
            {/* Service Quality Breakdown */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="space-y-0.5">
                    <p className="text-[14px] font-black text-white uppercase tracking-wider leading-none">Served Customers</p>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowTimeFilter(!showTimeFilter)}
                      className="px-3 py-2 bg-white/[0.04] rounded-xl border border-white/[0.07] text-gray-400 hover:text-emerald-400 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {timeDimension === 'DAY' ? 'Today' : timeDimension === 'WEEK' ? 'Week' : timeDimension === 'MONTH' ? 'Month' : 'All'}
                      </span>
                    </button>
                    <AnimatePresence>
                      {showTimeFilter && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTimeFilter(false)}
                            className="fixed inset-0 z-[70]"
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 mt-2 w-40 bg-[#0c1714] border border-white/[0.07] rounded-2xl shadow-2xl z-[80] overflow-hidden"
                          >
                            {(['DAY', 'WEEK', 'MONTH', 'ALL'] as const).map(d => (
                              <button
                                key={`review-stats-time-${d}`}
                                onClick={() => {
                                  setTimeDimension(d);
                                  setShowTimeFilter(false);
                                }}
                                className={`w-full text-left p-4 text-[10px] font-black uppercase tracking-widest transition-all border-b border-white/[0.06] last:border-0 ${
                                  timeDimension === d ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-white/5'
                                }`}
                              >
                                {d === 'DAY' ? 'Today' : d === 'WEEK' ? 'Week' : d === 'MONTH' ? 'Month' : 'All'}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {(['TOTAL', 'OLD', 'NEW'] as const).map(type => (
                    <GlassCard 
                      key={`review-rating-type-${type}`}
                      onClick={() => {
                        setCustomerListView(type);
                        setDrillSortField('orders');
                        setDrillSortOrder('desc');
                      }}
                      className="p-6 flex flex-col items-center justify-center text-center space-y-2 border-white/[0.06] hover:border-emerald-500/30 bg-gradient-to-b from-white/[0.02] to-transparent"
                    >
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{type}</p>
                      <p className={`text-2xl font-black ${type === 'TOTAL' ? 'text-white' : type === 'OLD' ? 'text-blue-400' : 'text-green-400'}`}>
                        {customerStats[timeDimension][type.toLowerCase() as keyof typeof customerStats['DAY']]}
                      </p>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </div>

            {/* Service Review Cards (Horizontal Scroll) */}
            <div className="space-y-4">
              <p className="text-[14px] font-black text-white uppercase tracking-wider leading-none px-2">Service Review</p>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
                {serviceRatings.map((s) => (
                  <GlassCard 
                    key={`service-rating-${s.name}`}
                    onClick={() => setSelectedServiceRating(s)}
                    className="min-w-[160px] flex-shrink-0 p-4 flex flex-col items-center gap-3 border-white/[0.06] hover:border-emerald-500/30 bg-gradient-to-br from-white/[0.03] to-transparent text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                      <Gamepad2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs leading-tight line-clamp-1">{s.name}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-xs text-white font-bold">{s.rating == null ? '—' : s.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>

            {!customerListView && !selectedServiceRating && (
              <div className="space-y-4">
                {/* Sorting UI */}
                <div className="flex items-center justify-between px-2">
                  <p className="text-[14px] font-black text-white uppercase tracking-wider leading-none">My customers</p>
                  <div className="relative">
                    <button 
                      onClick={() => setShowCustomerSort(!showCustomerSort)}
                      className="px-4 py-2 bg-emerald-600/10 border border-emerald-500/20 rounded-xl text-emerald-400 hover:bg-emerald-600/20 transition-all active:scale-95 flex items-center gap-2 group shadow-lg shadow-emerald-500/5"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {customerSortField === 'lastServed' ? 'Time' : customerSortField === 'orders' ? 'Orders' : 'Spend'}
                      </span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showCustomerSort ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showCustomerSort && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCustomerSort(false)}
                            className="fixed inset-0 z-[70]"
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 mt-2 w-48 bg-[#0c1714] border border-white/[0.07] rounded-2xl shadow-2xl z-[80] overflow-hidden"
                          >
                            {[
                              { field: 'lastServed', label: 'Time' },
                              { field: 'orders', label: 'Total Orders' },
                              { field: 'spend', label: 'Total Spend' }
                            ].map(option => (
                              <button
                                key={`sort-opt-${option.field}`}
                                onClick={() => {
                                  if (customerSortField === option.field) {
                                    setCustomerSortOrder(customerSortOrder === 'desc' ? 'asc' : 'desc');
                                  } else {
                                    setCustomerSortField(option.field as any);
                                    setCustomerSortOrder('desc');
                                  }
                                  setShowCustomerSort(false);
                                }}
                                className={`w-full text-left p-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between ${
                                  customerSortField === option.field ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-500 hover:bg-white/5'
                                }`}
                              >
                                <span>{option.label}</span>
                                {customerSortField === option.field && (
                                  customerSortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                )}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {sortedCustomers.map(customer => (
                  <GlassCard 
                    key={customer.id} 
                    className="p-4"
                    onClick={() => onNavigate('PROFILE', customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img 
                          src={customer.avatar} 
                          alt="" 
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-white/[0.06] shadow-xl" 
                        />
                        <div>
                          <p className="text-base font-black text-white">{customer.nickname}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <div className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06] flex items-center gap-1">
                                <span className="text-[10px] font-black text-emerald-400">{customer.totalOrders}</span>
                                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">Orders</span>
                             </div>
                             <div className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06] flex items-center gap-1">
                                <span className="text-[10px] font-black text-yellow-500">{customer.totalSpend.toLocaleString()}</span>
                                <Gem aria-label="Diamonds" className="w-2 h-2" />
                             </div>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </>
        )}

        {customerListView && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* View Switcher Tabs inside Drill Down */}
            <div className="flex p-1 bg-white/[0.04] rounded-2xl border border-white/[0.07] mx-1">
              {(['TOTAL', 'OLD', 'NEW'] as const).map(type => (
                <button
                  key={`drill-tab-${type}`}
                  onClick={() => setCustomerListView(type)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    customerListView === type ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {[...customers].filter(c => {
               if (customerListView === 'TOTAL') return true;
               if (customerListView === 'NEW') return c.tags.includes('NEW');
               if (customerListView === 'OLD') return !c.tags.includes('NEW');
               return true;
            }).sort((a, b) => {
              const valA = drillSortField === 'orders' ? a.totalOrders : a.totalSpend;
              const valB = drillSortField === 'orders' ? b.totalOrders : b.totalSpend;
              return drillSortOrder === 'desc' ? valB - valA : valA - valB;
            }).map(customer => (
              <GlassCard 
                key={`list-${customer.id}`} 
                className="p-4"
                onClick={() => onNavigate('PROFILE', customer)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img 
                      src={customer.avatar} 
                      alt="" 
                      className="w-12 h-12 rounded-2xl object-cover border border-white/[0.07] shadow-xl" 
                    />
                    <div>
                      <p className="text-sm font-black text-white">{customer.nickname}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <div className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06] flex items-center gap-1">
                            <span className="text-[10px] font-black text-emerald-400">{customer.totalOrders}</span>
                            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">Orders</span>
                         </div>
                         <div className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06] flex items-center gap-1">
                            <span className="text-[10px] font-black text-yellow-500">{customer.totalSpend.toLocaleString()}</span>
                            <Gem aria-label="Diamonds" className="w-2 h-2" />
                         </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-800" />
                </div>
              </GlassCard>
            ))}
            </div>
          </motion.div>
        )}

        {selectedServiceRating && (
          <div className="space-y-8 relative">
            <motion.div
              key={selectedServiceRating.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -100) handleServiceSwipe('next');
                else if (info.offset.x > 100) handleServiceSwipe('prev');
              }}
              className="space-y-8"
            >
              {/* Rating Summary (Matched to Profile Styles EXACTLY) */}
            <GlassCard className="p-8 flex items-center justify-between bg-white/[0.03] border-white/[0.06] rounded-[32px] overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-50" />
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-baseline">
                  <span className="text-7xl font-bold text-white tracking-tighter">
                    {selectedServiceRating.rating == null ? '—' : selectedServiceRating.rating.toFixed(1)}
                  </span>
                </div>
                <div className="flex gap-1.5 px-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={`rating-star-summary-${selectedServiceRating.name}-${i}`} 
                      className={`w-5 h-5 ${i < Math.floor(selectedServiceRating.rating) ? 'text-yellow-400 fill-current' : 'text-white/10'}`} 
                    />
                  ))}
                </div>
              </div>
              <div className="relative z-10 text-right">
                <div className="text-white/30 text-lg font-medium tracking-tight">
                  {selectedServiceRating.count.toLocaleString()} reviews
                </div>
              </div>
            </GlassCard>

            {/* Tags Like Profile View */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filter by Tag</h3>
                <div className="flex items-center gap-3">
                  {(selectedReviewTag || selectedRatingFilter || reviewSortOrder !== 'DEFAULT') && (
                    <button 
                      onClick={() => {
                        setSelectedReviewTag(null);
                        setSelectedRatingFilter(null);
                        setReviewSortOrder('DEFAULT');
                      }}
                      className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                  <button 
                    onClick={() => setShowReviewFilterModal(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                      selectedRatingFilter || reviewSortOrder !== 'DEFAULT'
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-white/[0.04] border-white/[0.07] text-gray-400'
                    }`}
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Filter</span>
                  </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 px-1">
                {selectedServiceRating.tags.map((tag: any, idx: number) => (
                  <button 
                    key={`tag-filter-${tag.name}-${idx}`}
                    onClick={() => setSelectedReviewTag(tag.name === selectedReviewTag ? null : tag.name)}
                    className={`px-4 py-2 rounded-2xl border transition-all flex items-center gap-2 ${
                      selectedReviewTag === tag.name 
                        ? 'bg-emerald-600/20 border-emerald-500/50' 
                        : 'bg-white/[0.04] border-white/[0.07] hover:bg-white/10'
                    }`}
                  >
                    <span className={`text-xs font-bold ${selectedReviewTag === tag.name ? 'text-emerald-400' : 'text-gray-300'}`}>
                      {tag.name}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {tag.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filters Display like App.tsx */}
            {(selectedRatingFilter || reviewSortOrder !== 'DEFAULT') && (
              <div className="flex flex-wrap gap-2 px-1">
                {selectedRatingFilter && (
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                    <Star className="w-2.5 h-2.5 text-yellow-500 fill-current" />
                    <span className="text-[10px] font-bold text-emerald-400">{selectedRatingFilter} Stars</span>
                  </div>
                )}
                {reviewSortOrder !== 'DEFAULT' && (
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] font-bold text-emerald-400">
                      {reviewSortOrder === 'NEWEST' ? 'Newest' : 
                       reviewSortOrder === 'OLDEST' ? 'Oldest' : 
                       reviewSortOrder === 'RATING_HIGH' ? 'Highest Rating' : 'Lowest Rating'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Review List List Like Profile View */}
            <div className="space-y-4">
              {(() => {
                let filtered = [...selectedServiceRating.reviews];
                if (selectedReviewTag) filtered = filtered.filter((r: any) => r.tags?.includes(selectedReviewTag)); // Mock fallback
                if (selectedRatingFilter) filtered = filtered.filter((r: any) => r.rating === selectedRatingFilter);
                
                if (reviewSortOrder === 'NEWEST') filtered.sort((a, b) => b.timestamp - a.timestamp);
                else if (reviewSortOrder === 'RATING_HIGH') filtered.sort((a, b) => b.rating - a.rating);

                if (filtered.length === 0) {
                  return (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto border border-white/5">
                        <MessageCircle className="w-8 h-8 text-gray-700" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-white font-bold">No reviews found</p>
                        <p className="text-xs text-gray-500">Review detail feed is not connected yet</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 px-1">
                    {filtered.map((review: any) => (
                      <GlassCard key={`review-detail-${review.id}`} className="p-5 space-y-4 border-white/5">
                        <div className="flex justify-between items-start">
                          <div 
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => onNavigate('PROFILE', { name: review.userName })}
                          >
                            <img 
                              src={review.userAvatar} 
                              className="w-12 h-12 rounded-full object-cover border-2 border-white/[0.06] group-hover:border-emerald-500/50 transition-all font-bold" 
                              referrerPolicy="no-referrer" 
                            />
                            <div>
                              <p className="text-sm font-bold group-hover:text-emerald-400 transition-colors">{review.userName}</p>
                              <div className="flex gap-0.5 mt-0.5">
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <Star key={`module-review-${review.id}-star-${i}`} className={`w-2.5 h-2.5 ${i < (review.rating || 5) ? 'text-yellow-500 fill-current' : 'text-gray-700'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            {new Date(review.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed font-medium">{review.content}</p>
                      </GlassCard>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Sync Filter Modal like App.tsx */}
            <AnimatePresence>
              {showReviewFilterModal && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowReviewFilterModal(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                  />
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="fixed bottom-0 left-0 right-0 bg-[#10201b] border-t border-white/[0.07] rounded-t-[32px] p-6 z-[101] max-h-[80vh] overflow-y-auto"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-white">Filter Reviews</h3>
                      <button onClick={() => setShowReviewFilterModal(false)} className="p-2 bg-white/[0.04] rounded-full"><X className="w-5 h-5"/></button>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rating</p>
                        <div className="flex flex-wrap gap-2">
                          {[5, 4, 3, 2, 1].map(r => (
                            <button
                              key={`review-rating-option-${r}`}
                              onClick={() => setSelectedRatingFilter(r === selectedRatingFilter ? null : r)}
                              className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${
                                selectedRatingFilter === r ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' : 'bg-white/[0.04] border-white/[0.07] text-gray-400'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${selectedRatingFilter === r ? 'fill-current' : ''}`} />
                              <span className="text-xs font-bold">{r} Stars</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sort By</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'DEFAULT', label: 'Recommended' },
                            { id: 'NEWEST', label: 'Newest First' },
                            { id: 'RATING_HIGH', label: 'Highest Rating' },
                            { id: 'RATING_LOW', label: 'Lowest Rating' }
                          ].map(sort => (
                            <button
                              key={`sort-${sort.id}`}
                              onClick={() => setReviewSortOrder(sort.id as any)}
                              className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                reviewSortOrder === sort.id ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-white/[0.04] border-white/[0.07] text-gray-400'
                              }`}
                            >
                              {sort.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowReviewFilterModal(false)}
                      className="w-full py-4 bg-emerald-600 rounded-2xl font-bold text-white mt-8 shadow-lg shadow-emerald-600/30"
                    >
                      Apply Filters
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
          </div>
        )}
      </div>

      {!selectedServiceRating && resource.data?.nextOffset != null && <button disabled={resource.more} onClick={resource.loadMore} className="mx-6 px-5 py-3 rounded-xl bg-emerald-600/10 text-emerald-400 text-xs">{resource.more ? 'Loading…' : 'Load more customers'}</button>}
      {!selectedServiceRating && !resource.loading && !resource.error && resource.data && !customers.length && <p className="px-6 text-xs text-gray-500">No customers in this period.</p>}
      <DataNotice resource={resource} />

    </motion.div>
  );
};

