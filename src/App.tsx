import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, 
  Gift, 
  UserPlus,
  Gamepad2, 
  Coffee, 
  Star, 
  Home, 
  Compass, 
  MessageSquare, 
  User, 
  ChevronRight, 
  Play, 
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Mic2,
  MapPin,
  User2,
  Heart,
  Venus,
  Mars,
  Copy,
  Check,
  Plus,
  Minus,
  Edit2,
  ShoppingCart,
  Image,
  Layout,
  Monitor,
  Smartphone,
  Share2,
  ChevronDown,
  ChevronUp,
  Filter,
  SlidersHorizontal,
  ThumbsUp,
  MoreHorizontal,
  MoreVertical,
  Flag,
  UserRoundPen,
  Users,
  Zap,
  Trophy,
  Send,
  Bell,
  Contact,
  Smile,
  AlertTriangle,
  CheckCheck,
  Wallet,
  CreditCard,
  History,
  Languages,
  Calendar,
  Settings,
  X,
  Phone,
  Mail,
  RefreshCw,
  Camera,
  LogOut,
  ShieldCheck,
  HelpCircle,
  Gem,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Store,
  ChevronLeft,
  Lock,
  Globe,
  Shield,
  Link,
  BarChart3,
  TrendingUp,
  Eye,
  DollarSign,
  ArrowDownToLine,
  Clock,
  MousePointer2,
  Ban,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Game, EPal, EPalServiceVariant, Coupon, Playlink, Post, Message, ChatSession, IMOrder, Wallet as WalletType, RechargePackage, WalletTransaction, RechargeOrder, PlayerRanking, Notification } from './types';
import { GAMES, EPALS, POSTS } from './constants';
import { COMPANION_LEVELS, INITIAL_PLAYER_RANKING, TaskProgress } from './companionConstants';
import { CompanionLevelDashboard, TaskCenter, LevelBenefits, DecayExplainerModal } from './components/CompanionCenter';
import { IncomeReview, CustomerReview } from './components/ReviewModules';
import { IcebreakerPoolView, MOCK_ICEBREAKER_USERS } from './components/IcebreakerPoolView';
import { ReportModal, ReportType, ReportContext } from './components/ReportModal';

// --- Components ---

const GlassCard = ({ children, className = "", ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div className={`bg-white/[0.055] backdrop-blur-2xl border border-white/[0.075] rounded-[1.25rem] overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.22)] transition-all duration-200 ${className}`} {...props}>
    {children}
  </div>
);

const ScoreMetricCard = ({ icon: Icon, label, value, color, className = "", onHelp }: { icon: any, label: string, value: string, color: string, className?: string, onHelp: () => void }) => (
  <GlassCard className={`p-4 space-y-2.5 relative group ${className}`}>
    <div className="flex items-center justify-between">
      <div className={`w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center ${color} backdrop-blur-sm`}>
        <Icon className="w-4 h-4" />
      </div>
      <button onClick={onHelp} className="text-[#68756a] hover:text-[#f6f1e6] transition-colors">
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
    </div>
    <div className="space-y-0.5">
      <p className="text-[9px] font-bold text-[#a8b3a7] uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-[#f6f1e6]">{value}</p>
    </div>
  </GlassCard>
);

const RuleItem = ({ label, desc }: { label: string, desc: string }) => (
  <div className="space-y-1">
    <p className="text-xs font-bold text-white">{label}</p>
    <p className="text-[10px] text-gray-500 font-medium">{desc}</p>
  </div>
);

const IconButton = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2.5 group tap-card"
  >
    <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 ${
      active
        ? 'bg-emerald-500/18 border border-emerald-400/45 shadow-[0_10px_28px_rgba(16,185,129,0.16)]'
        : 'bg-white/[0.055] border border-white/[0.075] group-hover:bg-white/[0.085] group-hover:border-emerald-500/25'
    }`}>
      <Icon className={`w-7 h-7 transition-colors duration-300 ${active ? 'text-emerald-300' : 'text-emerald-300/75 group-hover:text-emerald-200'}`} />
    </div>
    <span className={`text-[10px] font-bold uppercase transition-colors duration-300 ${active ? 'text-[#f6f1e6]' : 'text-[#a8b3a7] group-hover:text-[#f6f1e6]'}`}>
      {label}
    </span>
  </button>
);

const WaveAnimation = ({ color = "bg-black" }: { color?: string }) => (
  <div className="flex items-center gap-[1px] h-2.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <motion.div
        key={`wave-${i}`}
        animate={{
          height: [2, 7, 2],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.1,
          ease: "easeInOut"
        }}
        className={`w-[1.2px] ${color} rounded-full shadow-[0_0_4px_rgba(255,255,255,0.3)]`}
      />
    ))}
  </div>
);

const EPalCard: React.FC<{ 
  epal: EPal; 
  onProfileClick: () => void; 
  onOrderClick: () => void; 
  isPlaying?: boolean;
  onPlayToggle?: (e: React.MouseEvent) => void;
  badgeText?: string;
}> = ({ epal, onProfileClick, onOrderClick, isPlaying, onPlayToggle, badgeText }) => (
  <GlassCard className="relative p-4 flex items-center gap-4 hover:bg-white/[0.08] transition-all duration-300 group border-white/[0.065] hover:border-emerald-500/25 hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)] tap-card">
    {/* Column 1: Avatar */}
    <div className="relative shrink-0">
      <div 
        className="w-20 h-20 rounded-[1.15rem] overflow-hidden border border-white/10 cursor-pointer group-hover:border-emerald-400/45 transition-all shadow-lg" 
        onClick={onProfileClick}
      >
        <img 
          src={epal.avatarUrl} 
          alt={epal.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
          referrerPolicy="no-referrer" 
        />
      </div>
      {/* Play Button Overlay */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onPlayToggle?.(e);
        }}
        className={`absolute -bottom-1 -right-1 size-9 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all border z-10 bg-emerald-600 border-emerald-400/45 text-white`}
      >
        {isPlaying ? (
          <WaveAnimation color="bg-white" />
        ) : (
          <Play className="w-3 h-3 fill-current ml-0.5" />
        )}
      </button>
    </div>

    {/* Column 2: Player Info */}
    <div className="flex-1 flex flex-col gap-1 min-w-0">
      <h4 
        className="font-bold text-white text-lg leading-tight cursor-pointer hover:text-emerald-300 transition-colors truncate" 
        onClick={onProfileClick}
      >
        {epal.name}
      </h4>
      
      <div className="flex items-center gap-1">
        <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
        <span className="text-sm text-white font-bold">{epal.rating.toFixed(1)}</span>
        <span className="text-[10px] text-gray-500 font-medium">
          ({epal.orderCount >= 1000 ? `${(epal.orderCount / 1000).toFixed(1)}k` : epal.orderCount})
        </span>
      </div>

      {badgeText && (
        <div className="mt-0.5 flex">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-full">
            {badgeText}
          </span>
        </div>
      )}
    </div>

    {/* Column 3: Price + CTA */}
    <div className="flex flex-col items-end gap-2.5 shrink-0 pl-2">
      <div className="flex flex-col items-end leading-none">
        <div className="flex items-center gap-1 text-[#f6f1e6] font-bold">
          <span className="text-base">{epal.price}</span>
          <CoinIcon />
        </div>
        <span className="text-[9px] text-[#a8b3a7] font-semibold uppercase tracking-tight mt-1">{t('perHour')}</span>
      </div>

      <button
        onClick={onOrderClick}
        className="size-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-[0_10px_24px_rgba(16,185,129,0.22)]"
      >
        <Gamepad2 className="w-4 h-4" />
      </button>
    </div>
  </GlassCard>
);

const LegendEPalCard: React.FC<{ 
  epal: EPal; 
  onProfileClick: () => void; 
  isPlaying?: boolean;
  onPlayToggle?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: 'overlay' | 'stacked';
}> = ({ epal, onProfileClick, isPlaying, onPlayToggle, className = "", variant = 'overlay' }) => {
  const displayTags = epal.tags.slice(0, 2);
  const remainingCount = epal.tags.length - 2;

  const InfoContent = () => (
    <div className="flex justify-between items-start relative">
      <div className={`flex-1 min-w-0 ${variant === 'overlay' ? 'pr-8' : ''}`}>
        <div className="flex items-center gap-1.5">
          <h4 className={`font-bold truncate ${variant === 'overlay' ? 'text-white text-xs sm:text-sm' : 'text-white text-sm'}`}>{epal.name}</h4>
          <div className="flex items-center gap-0.5 shrink-0 bg-black/20 px-1 py-0.5 rounded-md">
            <Star className="w-2 h-2 text-yellow-500 fill-current" />
            <span className="text-[8px] text-white font-bold">{epal.rating.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <div className="flex gap-1 overflow-hidden">
            {displayTags.map((tag, idx) => (
              <span key={`${tag}-${idx}`} className="px-1.5 py-0.5 bg-emerald-500/30 border border-emerald-500/30 rounded-full text-[7px] font-bold text-emerald-200 whitespace-nowrap">
                {tag}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded-full text-[7px] font-bold text-gray-300 whitespace-nowrap">
                +{remainingCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Play Button for Overlay Variant */}
      {variant === 'overlay' && (
        <div className="absolute right-0 z-10 top-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onPlayToggle?.(e);
            }}
            className="w-8 h-8 bg-emerald-600 border border-emerald-500/50 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
          >
            {isPlaying ? (
              <WaveAnimation color="bg-white" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white fill-current" />
            )}
          </button>
        </div>
      )}
    </div>
  );

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col gap-3 ${className}`} onClick={onProfileClick}>
        <div className="relative aspect-square rounded-[32px] overflow-hidden group shadow-2xl border border-white/5">
          <img 
            src={epal.avatarUrl} 
            alt={epal.name} 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            referrerPolicy="no-referrer" 
          />
          {/* Play Button inside avatar for stacked variant */}
          <div className="absolute bottom-3 right-3 z-20">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onPlayToggle?.(e);
              }}
              className="w-8 h-8 bg-emerald-600 border border-emerald-500/50 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
            >
              {isPlaying ? (
                <WaveAnimation color="bg-white" />
              ) : (
                <Play className="w-3.5 h-3.5 text-white fill-current" />
              )}
            </button>
          </div>
        </div>
        <div className="px-1">
          <InfoContent />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative aspect-square rounded-[32px] overflow-hidden group cursor-pointer shadow-2xl border border-white/5 ${className}`} 
      onClick={onProfileClick}
    >
      {/* Background Image */}
      <img 
        src={epal.avatarUrl} 
        alt={epal.name} 
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
        referrerPolicy="no-referrer" 
      />
      
      {/* Bottom 1/3 Overlay — smoother gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/70 via-black/40 to-transparent backdrop-blur-sm p-3 flex flex-col justify-end">
        <InfoContent />
      </div>
    </div>
  );
};

const GameGridItem: React.FC<{ 
  game: Game; 
  isFavorite: boolean; 
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
}> = ({ game, isFavorite, onToggleFavorite, onClick }) => (
  <div
    onClick={onClick}
    className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer border border-white/[0.06] hover:border-emerald-500/30 transition-all duration-300 shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
  >
    <img 
      src={game.imageUrl} 
      alt={game.name} 
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      referrerPolicy="no-referrer"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-2 flex flex-col justify-end">
      <span className="font-bold text-white text-[10px] leading-tight line-clamp-2">{game.name}</span>
    </div>
    
    <button 
      onClick={onToggleFavorite}
      className="absolute top-1 right-1 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 active:scale-90 transition-transform"
    >
      <Star 
        className={`w-3 h-3 ${isFavorite ? 'text-yellow-500 fill-current' : 'text-white'}`} 
      />
    </button>
  </div>
);

// --- Helpers ---

const formatChatMessageTime = (timestamp: number, previousTimestamp?: number) => {
  const now = new Date();
  const date = new Date(timestamp);
  
  // If the difference is less than 5 minutes, don't show time
  if (previousTimestamp && timestamp - previousTimestamp < 5 * 60 * 1000) {
    return null;
  }

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getDate() === d2.getDate();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  if (isSameDay(now, date)) {
    return timeStr;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(yesterday, date)) {
    return `Yesterday ${timeStr}`;
  }

  const beforeYesterday = new Date(now);
  beforeYesterday.setDate(now.getDate() - 2);
  if (isSameDay(beforeYesterday, date)) {
    return `2 days ago ${timeStr}`;
  }

  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  if (date > oneWeekAgo) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]} ${timeStr}`;
  }

  if (now.getFullYear() === date.getFullYear()) {
    return `${date.getMonth() + 1}-${date.getDate()}`;
  }

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

// --- Views ---

type View = 'HOME' | 'COMMUNITY' | 'POST_DETAIL' | 'GAME_DETAIL' | 'PROFILE' | 'ORDER_CONFIRM' | 'LEGEND_LIST' | 'ALL_REVIEWS' | 'CATEGORY_SERVICES' | 'IM' | 'IM_DETAIL' | 'NOTIFICATIONS' | 'CONTACTS' | 'COMMUNITY_SELECTOR' | 'ME' | 'WALLET' | 'RECHARGE' | 'WITHDRAW' | 'EXCHANGE_DIAMONDS' | 'APPLY_PLAYER' | 'APPLY_PLAYER_CATEGORY' | 'APPLY_PLAYER_DETAILS' | 'APPLY_PLAYER_SERVICE_FORM' | 'SETTINGS' | 'PURCHASE_HISTORY' | 'PLAYER_ORDERS' | 'ORDER_DETAIL' | 'SETTINGS_EDIT_PROFILE' | 'SETTINGS_CHANGE_PASSWORD' | 'SETTINGS_LINKED_ACCOUNTS' | 'SETTINGS_LANGUAGE' | 'SETTINGS_PRIVACY' | 'SETTINGS_TERMS' | 'PLAYER_CENTER' | 'RANKING_CENTER' | 'PLAYER_SERVICES' | 'COMPANION_LEVEL_DASHBOARD' | 'TASK_CENTER' | 'LEVEL_BENEFITS' | 'INCOME_REVIEW' | 'CUSTOMER_REVIEW' | 'SETTINGS_NOTIFICATIONS' | 'SETTINGS_BLACKLIST' | 'FEEDBACK' | 'MANAGE_PLAYLINKS' | 'ADD_PLAYLINK' | 'NEW_USERS' | 'NEW_EPALS_LIST';

const CoinIcon = ({ className = "w-3 h-3", textClassName = "text-[8px]" }: { className?: string, textClassName?: string }) => (
  <span className={`${className} rounded-full bg-yellow-500 inline-flex items-center justify-center shrink-0`}>
    <span className={`${textClassName} text-black font-black leading-none`}>C</span>
  </span>
);

const WalletView = ({ 
  wallet, 
  transactions, 
  packages,
  onSelectPackage,
  onBack,
  userRole,
  userDiamonds,
  diamondTransactions,
  onWithdraw,
  onExchange,
  onOpenDatePicker,
  startDate,
  endDate,
  onResetDates
}: { 
  wallet: WalletType | null, 
  transactions: WalletTransaction[], 
  packages: RechargePackage[],
  onSelectPackage: (pkg: RechargePackage, method: 'GOOGLE_PAY' | 'APPLE_PAY') => void,
  onBack: () => void,
  userRole: 'USER' | 'PLAYER',
  userDiamonds: number,
  diamondTransactions: WalletTransaction[],
  onWithdraw: () => void,
  onExchange: () => void,
  onOpenDatePicker: (id: string, value: string, title: string) => void,
  startDate: string,
  endDate: string,
  onResetDates: () => void
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [walletTab, setWalletTab] = useState<'COINS' | 'DIAMONDS'>('COINS');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const detectPaymentMethod = (): 'APPLE_PAY' | 'GOOGLE_PAY' => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod|macintosh/.test(ua)) return 'APPLE_PAY';
    return 'GOOGLE_PAY';
  };

  const currentTransactions = walletTab === 'COINS' ? transactions : diamondTransactions;

  const filteredTransactions = currentTransactions.filter(tx => {
    // Type Filter
    if (typeFilter === 'EXPENSE' && tx.amount > 0) return false;
    if (typeFilter === 'INCOME' && tx.amount < 0) return false;

    // Time Filter
    if (!startDate && !endDate) return true;
    const txTime = tx.timestamp;
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() + 86400000 : Infinity;
    return txTime >= start && txTime <= end;
  });

  return (
    <div className="flex flex-col h-full bg-[#07110f]">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={showHistory ? () => setShowHistory(false) : onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-white rtl:rotate-180" />
          </button>
          <h2 className="text-xl font-bold text-white">{showHistory ? 'History' : (userRole === 'PLAYER' ? 'My Assets' : 'Wallet')}</h2>
        </div>
        {!showHistory ? (
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <History className="w-6 h-6" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowTypeMenu(!showTypeMenu);
                  setShowDatePicker(false);
                }}
                className={`p-2 rounded-full transition-all ${showTypeMenu ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <Filter className="w-6 h-6" />
              </button>
              
              <AnimatePresence>
                {showTypeMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-40 bg-[#0c1714] border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1"
                  >
                    {[
                      { id: 'ALL', label: 'All Types' },
                      { id: 'INCOME', label: 'Income' },
                      { id: 'EXPENSE', label: 'Expenses' }
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setTypeFilter(type.id as any);
                          setShowTypeMenu(false);
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${
                          typeFilter === type.id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button 
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  setShowTypeMenu(false);
                }}
                className={`p-2 rounded-full transition-all ${showDatePicker ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <Calendar className="w-6 h-6" />
              </button>
              
              <AnimatePresence>
                {showDatePicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-[#0c1714] border border-white/10 rounded-2xl shadow-2xl z-50 p-4 space-y-4"
                  >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Date Range</span>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Start Date</label>
                      <button 
                        onClick={() => onOpenDatePicker('WALLET_START', startDate, 'Start Date')}
                        className="w-full bg-[#07110f] border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-left font-bold"
                      >
                        {startDate || t('phSelectDate')}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">End Date</label>
                      <button 
                        onClick={() => onOpenDatePicker('WALLET_END', endDate, 'End Date')}
                        className="w-full bg-[#07110f] border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-left font-bold"
                      >
                        {endDate || t('phSelectDate')}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={onResetDates}
                        className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-white/10 transition-all"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 py-2 bg-emerald-600 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {!showHistory ? (
          <>
            {userRole === 'PLAYER' && (
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full">
                <button 
                  onClick={() => setWalletTab('COINS')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${walletTab === 'COINS' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Coins
                </button>
                <button 
                  onClick={() => setWalletTab('DIAMONDS')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${walletTab === 'DIAMONDS' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Diamonds
                </button>
              </div>
            )}
            
            {walletTab === 'COINS' ? (
              <>
                {/* Coin Balance Card */}
                <GlassCard className="p-8 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border-emerald-500/30">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                    <Wallet className="w-8 h-8 text-yellow-500" />
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">{t('coinBalance')}</div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-5xl font-black text-white tracking-tighter">{wallet?.balance || 0}</span>
                      <CoinIcon className="w-6 h-6" />
                    </div>
                  </div>
                </GlassCard>

                {/* Recharge Packages */}
                <div className="space-y-4">
                  <p className="text-gray-400 text-xs font-black uppercase tracking-widest px-2">Recharge Packages</p>
                  <div className="grid grid-cols-2 gap-4">
                    {packages.map(pkg => (
                      <button 
                        key={`wallet-recharge-package-${pkg.id}`}
                        onClick={() => onSelectPackage(pkg, detectPaymentMethod())}
                        className="relative p-6 rounded-3xl border-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/50 transition-all flex flex-col items-center gap-3 active:scale-95 group"
                      >
                        {pkg.bonus && (
                          <div className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-950 text-[10px] font-black px-2 py-1 rounded-full shadow-lg z-10">
                            +{pkg.bonus} BONUS
                          </div>
                        )}
                        <div className="flex items-center gap-2 group-hover:scale-110 transition-transform">
                          <span className="text-3xl font-black text-white">{pkg.coins}</span>
                          <CoinIcon className="w-5 h-5" />
                        </div>
                        <div className="text-emerald-400 font-black text-lg">${pkg.amount}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Diamond Balance Card */}
                <GlassCard className="p-8 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border-emerald-500/30">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <Gem className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">{t('diamondBalance')}</div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-5xl font-black text-white tracking-tighter">{userDiamonds}</span>
                      <Gem className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold mt-2">≈ ${(userDiamonds / 100).toFixed(2)} USD</p>
                  </div>
                  <div className="mt-4 w-full flex gap-3">
                    <button 
                      onClick={onExchange}
                      className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-emerald-400 text-[10px] uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Exchange
                    </button>
                    <button 
                      onClick={onWithdraw}
                      className="flex-1 py-4 bg-emerald-600 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      Withdraw
                    </button>
                  </div>
                </GlassCard>

                {/* Earning Info */}
                <div className="space-y-4">
                  <p className="text-gray-400 text-xs font-black uppercase tracking-widest px-2">{t('earningTips')}</p>
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{t('completeOrders')}</p>
                        <p className="text-xs text-gray-500">Earn diamonds by providing high-quality services to your customers.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                        <Smile className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{t('receiveGifts')}</p>
                        <p className="text-xs text-gray-500">Get extra diamonds from happy customers through the gift system.</p>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* History Tabs */}
            {userRole === 'PLAYER' && (
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full">
                <button 
                  onClick={() => setWalletTab('COINS')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletTab === 'COINS' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500'}`}
                >
                  Coins
                </button>
                <button 
                  onClick={() => setWalletTab('DIAMONDS')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletTab === 'DIAMONDS' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500'}`}
                >
                  Diamonds
                </button>
              </div>
            )}

            <div className="space-y-3">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(tx => (
                  <GlassCard key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        {tx.amount > 0 ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-500" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">{tx.description}</div>
                        <div className="text-gray-500 text-[10px] font-medium">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                      {walletTab === 'COINS' ? <CoinIcon className="w-3 h-3" /> : <Gem className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </GlassCard>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-gray-600 gap-4">
                  <History className="w-12 h-12 opacity-20" />
                  <p className="font-bold">{t('noTransactions')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DatePickerModal = ({ 
  isOpen, 
  onClose, 
  value, 
  onChange, 
  title,
  mode = 'PAST',
  language = 'English'
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  value: string, 
  onChange: (date: string) => void,
  title: string,
  mode?: 'PAST' | 'BIRTHDAY',
  language?: 'English' | 'Arabic'
}) => {
  const parts = (value || new Date().toISOString().split('T')[0]).split('-');
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const now = new Date();
  const currentYear = now.getFullYear();
  const eighteenYearsAgoYear = currentYear - 18;

  const handleConfirm = () => {
    onClose();
  };

  const t_local = (en: string, ar: string) => language === 'Arabic' ? ar : en;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0c1714] border-t border-white/10 rounded-t-[40px] z-[1001] h-[60vh] flex flex-col pt-2 shadow-2xl"
            dir={language === 'Arabic' ? 'rtl' : 'ltr'}
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-4" />
            
            <div className="px-8 flex items-center justify-between mb-2">
              <button onClick={onClose} className="text-gray-500 font-bold text-sm transition-colors hover:text-white">{t_local('Cancel', 'إلغاء')}</button>
              <h3 className="text-white font-black uppercase tracking-widest text-sm">{title}</h3>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-hidden relative px-8 py-4 flex gap-2">
              <div className="absolute top-1/2 left-8 right-8 h-14 -translate-y-1/2 pointer-events-none bg-white/5 border-y border-white/10 rounded-2xl" />
              
              {/* Year */}
              <div className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-24 text-center">
                {Array.from({ length: 100 }, (_, i) => {
                  const y = (mode === 'BIRTHDAY' ? eighteenYearsAgoYear - i : currentYear - i).toString();
                  const isSelected = year === y;
                  return (
                    <div 
                      key={`y-${y}`}
                      onClick={() => {
                        const newDate = `${y}-${month}-${day}`;
                        if (mode !== 'BIRTHDAY' && new Date(newDate) > now) {
                          onChange(now.toISOString().split('T')[0]);
                        } else {
                          onChange(newDate);
                        }
                      }}
                      className={`h-14 flex items-center justify-center snap-center transition-all duration-300 cursor-pointer ${
                        isSelected ? 'text-white text-xl font-black' : 'text-gray-600 text-sm font-bold'
                      }`}
                    >
                      {y}
                    </div>
                  );
                })}
              </div>

              {/* Month */}
              <div className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-24 text-center">
                {Array.from({ length: 12 }, (_, i) => {
                  const m = (i + 1).toString().padStart(2, '0');
                  const isSelected = month === m;
                  return (
                    <div 
                      key={`m-${m}`}
                      onClick={() => {
                        const newDate = `${year}-${m}-${day}`;
                        if (mode !== 'BIRTHDAY' && new Date(newDate) > now) {
                          onChange(now.toISOString().split('T')[0]);
                        } else {
                          onChange(newDate);
                        }
                      }}
                      className={`h-14 flex items-center justify-center snap-center transition-all duration-300 cursor-pointer ${
                        isSelected ? 'text-white text-xl font-black' : 'text-gray-600 text-sm font-bold'
                      }`}
                    >
                      {new Date(2000, i).toLocaleString(language === 'Arabic' ? 'ar-SA' : 'en-US', { month: 'short' })}
                    </div>
                  );
                })}
              </div>

              {/* Day */}
              <div className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-24 text-center">
                {Array.from({ length: 31 }, (_, i) => {
                  const d = (i + 1).toString().padStart(2, '0');
                  const isSelected = day === d;
                  return (
                    <div 
                      key={`d-${d}`}
                      onClick={() => {
                        const newDate = `${year}-${month}-${d}`;
                        if (mode !== 'BIRTHDAY' && new Date(newDate) > now) {
                          onChange(now.toISOString().split('T')[0]);
                        } else {
                          onChange(newDate);
                        }
                      }}
                      className={`h-14 flex items-center justify-center snap-center transition-all duration-300 cursor-pointer ${
                        isSelected ? 'text-white text-xl font-black' : 'text-gray-600 text-sm font-bold'
                      }`}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-8 pb-10 pt-4">
              <button 
                onClick={handleConfirm}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all"
              >
                {t_local('Confirm', 'تأكيد')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const RechargeView = ({ 
  packages, 
  onSelect, 
  onBack 
}: { 
  packages: RechargePackage[], 
  onSelect: (pkg: RechargePackage, method: 'GOOGLE_PAY' | 'APPLE_PAY') => void, 
  onBack: () => void 
}) => {
  const detectPaymentMethod = (): 'APPLE_PAY' | 'GOOGLE_PAY' => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod|macintosh/.test(ua)) {
      return 'APPLE_PAY';
    }
    return 'GOOGLE_PAY';
  };

  return (
    <div className="flex flex-col h-full bg-[#07110f]">
      <div className="sticky top-0 z-50 backdrop-blur-md bg-[#07110f]/80 p-4 flex items-center gap-4 border-b border-white/5">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-white rtl:rotate-180" />
        </button>
        <h2 className="text-xl font-bold text-white">{t('recharge')} {t('coins')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        <div className="space-y-4">
          <p className="text-gray-400 text-xs font-black uppercase tracking-widest px-2">{t('rechargePackages')}</p>
          {/* Packages Grid */}
          <div className="grid grid-cols-2 gap-4">
            {packages.map(pkg => (
              <button 
                key={`recharge-modal-package-${pkg.id}`}
                onClick={() => onSelect(pkg, detectPaymentMethod())}
                className="relative p-6 rounded-3xl border-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/50 transition-all flex flex-col items-center gap-3 active:scale-95 group"
              >
                {pkg.bonus && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-950 text-[10px] font-black px-2 py-1 rounded-full shadow-lg z-10">
                    +{pkg.bonus} BONUS
                  </div>
                )}
                <div className="flex items-center gap-2 group-hover:scale-110 transition-transform">
                  <span className="text-3xl font-black text-white">{pkg.coins}</span>
                  <CoinIcon className="w-5 h-5" />
                </div>
                <div className="text-emerald-400 font-black text-lg">${pkg.amount}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="space-y-4">
          <div className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{t('securePayment')}</p>
              <p className="text-[10px] text-gray-500 font-medium">{t('securePaymentDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeedbackView = ({ 
  onBack,
  onOpenDatePicker,
  selectedTime,
}: { 
  onBack: () => void,
  onOpenDatePicker: (id: string, value: string, title: string) => void,
  selectedTime: string
}) => {
  const [feedbackType, setFeedbackType] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback categories
  const feedbackTypes = [
    { id: 'RECHARGE', label: 'Recharge' },
    { id: 'WITHDRAWAL', label: 'Withdrawal' },
    { id: 'ORDER', label: 'Order' },
    { id: 'REGISTRATION', label: 'Registration' },
    { id: 'PRIVATE_MESSAGE', label: 'Private Msg' },
    { id: 'GIFTING', label: 'Gifting' },
    { id: 'LAG', label: 'Lag/Performance' }
  ];

  const handleSubmit = () => {
    if (!feedbackType || !description || !selectedTime) return;
    setIsSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      onBack();
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#07110f] pb-24">
      <div className="p-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#07110f]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-white rtl:rotate-180" />
          </button>
          <h2 className="text-xl font-bold text-white">{t('titleFeedback')}</h2>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Type Selection */}
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Feedback Type</label>
          <div className="grid grid-cols-2 gap-3">
            {feedbackTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setFeedbackType(type.id)}
                className={`px-4 py-3 rounded-2xl text-[11px] font-bold transition-all border ${
                  feedbackType === type.id 
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Time of Occurrence</label>
          <button 
            onClick={() => onOpenDatePicker('FEEDBACK_TIME', selectedTime, 'Occurrence Time')}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-left group hover:bg-white/10 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${selectedTime ? 'text-white' : 'text-gray-500'}`}>
                {selectedTime || t('selectTheTime')}
              </span>
              <Calendar className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
            </div>
          </button>
        </div>

        {/* Description */}
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Problem Description (Required)</label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('phDescribeIssue')}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white placeholder:text-gray-600 focus:ring-2 focus:ring-emerald-500/50 min-h-[150px] outline-none transition-all resize-none shadow-inner"
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-bold text-gray-600">
              {description.length} / 500
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-4">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Screenshot (Optional)</label>
          <div className="flex flex-col gap-4">
            {image ? (
              <div className="relative w-full h-[200px] md:h-[240px] rounded-2xl overflow-hidden border border-white/20 group">
                <img src={image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setImage('https://picsum.photos/seed/feedback/800/800')}
                className="w-full h-[200px] md:h-[240px] rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-gray-500 hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
              >
                <Camera className="w-10 h-10 group-hover:text-emerald-400 transition-colors" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0a0514] via-[#0a0514] to-transparent z-40">
        <button
          disabled={!feedbackType || !description || !selectedTime || isSubmitting}
          onClick={handleSubmit}
          className={`w-full max-w-md mx-auto py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 ${
            !feedbackType || !description || !selectedTime || isSubmitting
              ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
              : 'bg-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 hover:brightness-110'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Feedback
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const ManagePlaylinksView = ({ 
  playlinks, 
  onAdd, 
  onEdit,
  onDelete, 
  onBack 
}: { 
  playlinks: Playlink[], 
  onAdd: () => void, 
  onEdit: (id: string) => void,
  onDelete: (id: string) => void, 
  onBack: () => void 
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#07110f]">
      <div className="p-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#07110f]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-white rtl:rotate-180" />
          </button>
          <h2 className="text-xl font-bold text-white">Playlinks</h2>
        </div>
        <button 
          onClick={onAdd}
          className="p-2 bg-emerald-600 rounded-xl text-white active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {playlinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
              <Gamepad2 className="w-10 h-10 text-gray-700" />
            </div>
            <div className="space-y-1">
              <p className="text-white font-bold">{t('noPlaylinks')}</p>
              <p className="text-xs text-gray-500">{t('noPlaylinksDesc')}</p>
            </div>
            <button 
              onClick={onAdd}
              className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-emerald-400 hover:bg-white/10 transition-all"
            >
              Add First Playlink
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {playlinks.map(link => (
              <div key={link.id} className="relative group">
                <div className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4 overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                    <img src={link.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{link.gameName}</p>
                    <p className="text-emerald-400 font-bold text-xs">{link.nickname}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onEdit(link.id)}
                      className="p-3 text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-2xl transition-all active:scale-90"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onDelete(link.id)}
                      className="p-3 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all active:scale-90"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AddPlaylinkView = ({ 
  games, 
  onSave, 
  onBack,
  initialData
}: { 
  games: Game[], 
  onSave: (link: Partial<Playlink> & { screenshot?: string }) => void, 
  onBack: () => void,
  initialData?: Playlink
}) => {
  const [step, setStep] = useState<'GAME' | 'DETAILS'>(initialData ? 'DETAILS' : 'GAME');
  const [selectedGame, setSelectedGame] = useState<Game | null>(
    initialData ? (games.find(g => g.name === initialData.gameName) || null) : null
  );
  const [form, setForm] = useState({
    nickname: initialData?.nickname || '',
    platform: initialData?.platform || '',
    server: initialData?.server || '',
    rank: initialData?.rank || '',
    role: initialData?.role || '',
    style: initialData?.style || '',
    screenshot: null as string | null
  });

  const mockOptions = {
    platforms: ['PC', 'Mobile', 'PS'],
    servers: ['North America', 'Europe', 'Asia', 'South America'],
    ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'],
    positions: ['Top', 'Jungle', 'Mid', 'ADC', 'Support', 'Entry', 'Duelist', 'Smokes'],
    styles: ['Aggressive', 'Passive', 'Team-player', 'Carry']
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setStep('DETAILS');
  };

    const handleSave = () => {
    if (!selectedGame || !form.nickname || !form.platform || !form.server || !form.rank) return;
    onSave({
      gameName: selectedGame.name,
      posterUrl: selectedGame.imageUrl,
      nickname: form.nickname,
      rank: form.rank,
      platform: form.platform as any,
      server: form.server,
      role: form.role,
      style: form.style,
      screenshot: form.screenshot || undefined
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#07110f] pb-24">
      <div className="p-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#07110f]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button onClick={(step === 'DETAILS' && !initialData) ? () => setStep('GAME') : onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-white rtl:rotate-180" />
          </button>
          <h2 className="text-xl font-bold text-white">{step === 'GAME' ? 'Select Game' : 'Playlink Details'}</h2>
        </div>
      </div>

      <div className="p-6">
        {step === 'GAME' ? (
          <div className="grid grid-cols-2 gap-4">
            {games.map(game => (
              <button
                key={game.id}
                onClick={() => handleGameSelect(game)}
                className="relative group aspect-[4/5] rounded-3xl overflow-hidden border-2 border-white/10 hover:border-emerald-500/50 transition-all active:scale-95"
              >
                <img src={game.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                  <p className="text-white font-black text-sm text-left leading-tight">{game.name}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Game Nickname/ID (Required)</label>
                <input 
                  type="text"
                  value={form.nickname}
                  placeholder={t('phGameNickname')}
                  onChange={(e) => setForm(prev => ({ ...prev, nickname: e.target.value }))}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Current Ranking</label>
                <select 
                  value={form.rank}
                  onChange={(e) => setForm(prev => ({ ...prev, rank: e.target.value }))}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold appearance-none outline-none focus:border-emerald-500/50"
                >
                  <option value="">{t('optionSelectRanking')}</option>
                  {mockOptions.ranks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Platform */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Platform</label>
                  <select 
                    value={form.platform}
                    onChange={(e) => setForm(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold appearance-none outline-none focus:border-emerald-500/50"
                  >
                    <option value="">{t('optionSelectPlatform')}</option>
                    {mockOptions.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Server */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Server</label>
                  <select 
                    value={form.server}
                    onChange={(e) => setForm(prev => ({ ...prev, server: e.target.value }))}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold appearance-none outline-none focus:border-emerald-500/50"
                  >
                    <option value="">{t('optionSelectServer')}</option>
                    {mockOptions.servers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Position/Role</label>
                      <select 
                        value={form.role}
                        onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold appearance-none outline-none focus:border-emerald-500/50"
                      >
                        <option value="">{t('optionSelectRole')}</option>
                        {mockOptions.positions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Play Style</label>
                      <select 
                        value={form.style}
                        onChange={(e) => setForm(prev => ({ ...prev, style: e.target.value }))}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold appearance-none outline-none focus:border-emerald-500/50"
                      >
                        <option value="">{t('optionSelectStyle')}</option>
                        {mockOptions.styles.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                   </div>
                </div>
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Verification Screenshot</label>
                <div className="flex gap-4">
                   {form.screenshot ? (
                     <div className="relative flex-1 aspect-video rounded-2xl overflow-hidden border border-white/20 group">
                       <img src={form.screenshot} className="w-full h-full object-cover" />
                       <button 
                         onClick={() => setForm(prev => ({ ...prev, screenshot: null }))}
                         className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                       >
                         <X className="w-6 h-6" />
                       </button>
                     </div>
                   ) : (
                     <button 
                       onClick={() => setForm(prev => ({ ...prev, screenshot: 'https://picsum.photos/seed/verify/800/800' }))}
                       className="flex-1 aspect-video rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-emerald-500/50 hover:text-emerald-400 transition-all active:scale-95 group"
                     >
                        <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Upload Screen</span>
                     </button>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0a0514] via-[#0a0514] to-transparent z-40">
          <button
          disabled={step === 'GAME' || !form.nickname || !form.platform || !form.server || !form.rank}
          onClick={handleSave}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 ${
            step === 'GAME' || !form.nickname || !form.platform || !form.server || !form.rank
              ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 text-white hover:brightness-110'
          }`}
        >
          <Send className="w-4 h-4" />
          Save
        </button>
      </div>

    </div>
  );
};

const COUNTRIES = [
  'North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania',
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan',
  'South Korea', 'China', 'Singapore', 'Australia', 'Brazil', 'Mexico'
];

const SettingsSubPage: React.FC<{
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
  stickyHeader?: boolean;
}> = ({ title, onBack, children, rightElement, stickyHeader }) => (
  <div className="min-h-screen pb-20 bg-[#07110f]">
    <div className={`${stickyHeader ? 'sticky top-0 z-[60] bg-[#07110f]/80 backdrop-blur-md border-b border-white/5' : ''} p-6 pb-4`}>
      <div className="flex items-center justify-between relative">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10 transition-all active:scale-95">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{title}</h1>
        <div className="relative z-10 flex items-center justify-end">
          {rightElement || <div className="w-10" />}
        </div>
      </div>
    </div>
    <div className="p-6 pt-0 space-y-6">
      {children}
    </div>
  </div>
);

const LANGUAGES_DATA = {
  English: {
    dir: 'ltr',
    home: 'Home',
    community: 'Community',
    messages: 'Messages',
    me: 'Me',
    settings: 'Settings',
    language: 'Language',
    confirm: 'Confirm',
    cancel: 'Cancel',
    changeLanguageTitle: 'Change Language',
    changeLanguageDesc: 'Are you sure you want to change the language? The application will be re-rendered.',
    recharge: 'Recharge',
    wallet: 'Wallet',
    search: 'Search',
    favorite: 'Favorite',
    games: 'Games',
    chilling: 'Chilling',
    trendingRealms: 'Trending Realms',
    legendEPals: 'Legend EPals',
    newEPals: 'New EPals',
    newUsers: 'New Users',
    moreEPals: 'More EPals',
    searchForEPals: 'Search for EPals',
    noEPalsFound: 'No EPals found with these filters',
    unfollowConfirm: 'Are you sure you want to unfollow this companion?',
    epal: 'EPal',
    viewAll: 'View All',
    logout: 'Log Out',
    myOrders: 'My Orders',
    playerCenter: 'Player Center',
    rankingCenter: 'Ranking Center',
    myServices: 'My Services',
    taskCenter: 'Task Center',
    all: 'All',
    selectCommunity: 'Select Community',
    typeMessage: 'Type a message...',
    send: 'Send',
    report: 'Report',
    block: 'Block',
    unblock: 'Unblock',
    online: 'Online',
    offline: 'Offline',
    trending: 'Trending',
    latest: 'Latest',
    following: 'Following',
    follow: 'Follow',
    balance: 'Balance',
    coins: 'Coins',
    profile: 'Profile',
    editProfile: 'Edit Profile',
    album: 'Album',
    post: 'Post',
    service: 'Service',
    followed: 'Followed',
    fans: 'Fans',
    visitors: 'Visitors',
    payment: 'Payment',
    coupon: 'Coupon',
    discount: 'Discount',
    total: 'Total',
    payNow: 'Pay Now',
    confirmOrder: 'Confirm Order',
    selectPaymentMethod: 'Select Payment Method',
    viewMore: 'View More',
    viewLess: 'View Less',
    // --- Alerts & Confirmations ---
    alertRiskReview: 'Payment is being reviewed for risk control. Please check back later.',
    alertSecurityBinding: 'Security Protection: At least one binding (Phone, Email, or Third-party account) must be linked to your account for security purposes.',
    alertFillAllFields: 'Please fill in all fields',
    alertPasswordsNoMatch: 'New passwords do not match',
    alertPasswordMinLength: 'Password must be at least 8 characters',
    alertServiceUpdated: 'Service updated successfully!',
    alertApplicationSubmitted: 'Application submitted successfully!',
    alertFillRequiredFields: 'Please fill in all required fields',
    alertPlayerLevel: 'Your current Player Level is LV.',
    confirmUnlink: 'Are you sure you want to unlink your',
    confirmDeleteService: 'Are you sure you want to delete this service?',
    confirmBlock: 'Confirm Block?',
    confirmUnblock: 'Confirm Unblock?',
    // --- Placeholders ---
    phDescribeIssue: 'Please describe the issue in detail...',
    phGameNickname: 'e.g. PlayerOne#1234',
    phSearchByIdOrName: 'Search by ID or Name',
    phSaySomethingNice: 'Say something nice...',
    phSearchOrders: 'Search orders...',
    phSearchGames: 'Search games...',
    phPlayStyle: 'e.g. Aggressive, Strategic, Chill',
    phIntro: 'Tell users about your skills and playstyle...',
    phCoverIntro: 'A short catchy intro for your cover...',
    phRank: 'e.g. Diamond IV, Level 100',
    phAggressiveChill: 'e.g. Aggressive, Chill, Pro',
    phPrice: 'e.g. 5',
    phDiscount: 'e.g. 10',
    phServiceName: 'e.g. Pro Carry Service',
    phDisplayName: 'Your display name',
    phBio: 'Tell the community about yourself...',
    phCurrentPassword: '••••••••',
    phNewPassword: 'Min. 8 characters',
    phConfirmPassword: 'Repeat new password',
    phSelectDate: 'Select Date',
    phSelectRanking: 'Select Ranking',
    phSelectPlatform: 'Select Platform',
    phSelectServer: 'Select Server',
    phSelectRole: 'Select Role',
    phSelectStyle: 'Select Style',
    // --- Page Titles ---
    titleEditProfile: 'Edit Profile',
    titleChangePassword: 'Change Password',
    titleLinkedAccounts: 'Linked Accounts',
    titlePrivacyPolicy: 'Privacy Policy',
    titleSendPlaylink: 'Send Playlink',
    titleDeleteService: 'Delete Service',
    titleNotifications: 'Notifications',
    titleContacts: 'Contacts',
    titleMyOrders: 'My Orders',
    titlePurchaseHistory: 'Purchase History',
    titlePlayerOrders: 'Player Orders',
    titleManagePlaylinks: 'Playlinks',
    titleAddPlaylink: 'Add Playlink',
    titleFeedback: 'Submit Feedback',
    titleSelectCategory: 'Select Category',
    titleIcebreakerPool: 'Icebreaker Pool',
    titleIncomeReview: 'Income Review',
    titleCustomerReview: 'Customer Review',
    titleLevelDashboard: 'Companion Level',
    titleRankingCenter: 'Ranking Center',
    titleTaskCenter: 'Task Center',
    titleLevelBenefits: 'Level Benefits',
    // --- Task / Rule Labels ---
    lbDailyLogin: 'Daily Login',
    lbPosting: 'Posting',
    lbNewUserGreeting: 'New User Greeting',
    lbResponseRate: 'Response Rate',
    lbOrderAcceptRate: 'Order Accept Rate',
    lbNewUsersServed: 'New Users Served',
    lbRepeatUsers: 'Repeat Users',
    lbRating: 'Rating',
    lbGiftIncome: 'Gift Income',
    lbTotalIncome: 'Total Income',
    lbBaseDecay: 'Base Decay',
    lbReducedDecay: 'Reduced Decay',
    lbNoOrderPenalty: 'No Order Penalty',
    lbSuspension: 'Suspension',
    // --- Task / Rule Descriptions ---
    descDailyLogin: '+3 per day, max 15 points',
    descPosting: '+5 per post, max 15 points',
    descNewUserGreeting: '+2 per reply, max 50 points',
    descResponseRate: '≥90% → 35, 75–90% → 20, 60–75% → 5',
    descOrderAcceptRate: '≥90% → 35, 75–90% → 20, 60–75% → 5',
    descNewUsersServed: '+10 per user, max 100 points',
    descRepeatUsers: '+5 per user, max 100 points',
    descRating: '≥4.9 → 50, 4.5–4.9 → 30, 4.0–4.5 → 10',
    descGiftIncome: '+2 per 10 diamonds, max 100 points',
    descTotalIncome: '+1 per 20 diamonds, max 200 points',
    descBaseDecay: '6% score reduction weekly',
    descReducedDecay: '3% reduction if weekly income ≥ 1000',
    descNoOrderPenalty: '-50 to -200 score weekly',
    descSuspension: '4 consecutive weeks in L1 removes qualification',
    // --- Misc ---
    messagesTitle: 'Messages',
    noTransactions: 'No transactions found',
    noPlaylinks: 'No Playlinks Found',
    noPlaylinksDesc: 'Connect your game accounts to show your rank and stats.',
    addFirstPlaylink: 'Add First Playlink',
    securePayment: 'Secure Payment',
    securePaymentDesc: 'Automatic store checkout based on your device',
    perHour: 'per hour',
    coinBalance: 'Coin Balance',
    diamondBalance: 'Diamond Balance',
    rechargePackages: 'Recharge Packages',
    earningTips: 'Earning Tips',
    completeOrders: 'Complete Orders',
    completeOrdersDesc: 'Earn diamonds by providing high-quality services to your customers.',
    receiveGifts: 'Receive Gifts',
    receiveGiftsDesc: 'Get extra diamonds from happy customers through the gift system.',
    exchange: 'Exchange',
    withdraw: 'Withdraw',
    history: 'History',
    dateRange: 'Date Range',
    startDate: 'Start Date',
    endDate: 'End Date',
    reset: 'Reset',
    apply: 'Apply',
    allTypes: 'All Types',
    income: 'Income',
    expenses: 'Expenses',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    uploading: 'Uploading...',
    submitting: 'Submitting...',
    loading: 'Loading...',
    noResults: 'No results found',
    loadMore: 'Load More',
    retry: 'Retry',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    finish: 'Finish',
    skip: 'Skip',
    done: 'Done',
    optional: 'Optional',
    required: 'Required',
    maxChars: 'max',
    characters: 'characters',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: 'days ago',
    justNow: 'Just now',
    minutesAgo: 'min ago',
    hoursAgo: 'hr ago',
    secureAccount: 'Secure Payment',
    changeType: 'Change Type',
    submitReport: 'Submit Report',
    reportUser: 'Report User',
    reportPost: 'Report Post',
    selectReportType: 'Please select report type (Required)',
    descriptionOptional: 'Description (Optional)',
    evidenceScreenshots: 'Evidence Screenshots (Optional)',
    maxScreenshots: 'Max 4 screenshots allowed',
    upload: 'Upload',
    addedToFavorites: 'Added to favorites',
    removedFromFavorites: 'Removed from favorites',
    switchToCoins: 'Coins',
    switchToDiamonds: 'Diamonds',
    aboutMe: 'About Me',
    services: 'Services',
    reviews: 'Reviews',
    playlinks: 'Playlinks',
    posts: 'Posts',
    noReviewsYet: 'No reviews yet',
    noServicesYet: 'No services yet',
    orderNow: 'Order Now',
    startChat: 'Start Chat',
    voiceChat: 'Voice Chat',
    textChat: 'Text Chat',
    giftSent: 'Gift sent!',
    messageSent: 'Message sent!',
    copySuccess: 'Copied to clipboard',
    linkCopied: 'Link copied',
    featureComingSoon: 'Coming Soon',
    noNotifications: 'No notifications yet',
    clearAll: 'Clear All',
    markAllRead: 'Mark All Read',
    systemNotification: 'System',
    orderNotification: 'Order',
    socialNotification: 'Social',
    buyXGetY: 'Buy {x} Get {y}',
    free: 'Free',
    limited: 'Limited',
    unlimited: 'Unlimited',
    // --- Icebreaker ---
    icebreakerPool: 'Icebreaker Pool',
    icebreakerDesc: 'Say hi to new users and find potential teammates! ({count}/25 today)',
    quickReplies: 'Quick Replies',
    sayHiTo: 'Say Hi to',
    firstContactCounts: 'First contact counts!',
    sayHi: 'Say Hi',
    // --- More UI ---
    customMessage: 'Custom Message',
    sendMessage: 'Send Message',
    joinedAgo: 'Joined {duration} ago',
    selectGame: 'Select Game',
    playlinkDetails: 'Playlink Details',
    gameNicknameId: 'Game Nickname/ID (Required)',
    currentRanking: 'Current Ranking',
    platform: 'Platform',
    server: 'Server',
    positionRole: 'Position/Role',
    playStyle: 'Play Style',
    verificationScreenshot: 'Verification Screenshot',
    uploadScreen: 'Upload Screen',
    feedbackType: 'Feedback Type',
    timeOfOccurrence: 'Time of Occurrence',
    problemDescription: 'Problem Description (Required)',
    screenshotOptional: 'Screenshot (Optional)',
    selectTheTime: 'Select the time problem occurred',
    feedbackSubmitted: 'Feedback Submitted',
    promoStartDate: 'Promotion Start',
    promoEndDate: 'Promotion End',
    promoType: 'Promotion Type',
    none: 'None',
    firstOrderDiscount: 'First Order Discount',
    percentage: 'Percentage',
    fixedAmount: 'Fixed Amount',
    serviceName: 'Service Name',
    unit: 'Unit',
    promotion: 'Promotion',
    addService: 'Add Service',
    editService: 'Edit Service',
    deleteServiceTitle: 'Delete Service',
    confirmDeleteServiceMsg: 'Are you sure you want to delete this service? This action cannot be undone.',
    screenshot: 'Screenshot',
    remove: 'Remove',
    changePhoto: 'Change Photo',
    gender: 'Gender',
    birthday: 'Birthday',
    region: 'Region',
    phone: 'Phone',
    bindEmail: 'Bind Email',
    bindPhone: 'Bind Phone',
    changeEmail: 'Change Email',
    changePhone: 'Change Phone',
    sendCode: 'Send Code',
    verify: 'Verify',
    resendCode: 'Resend Code',
    enterCode: 'Enter verification code',
    successfullyBound: 'Successfully bound',
    // --- Additional missing keys ---
    optionSelectRanking: 'Select Ranking',
    optionSelectPlatform: 'Select Platform',
    optionSelectServer: 'Select Server',
    optionSelectRole: 'Select Role',
    optionSelectStyle: 'Select Style',
    loadingMore: 'Loading more...',
    filterLabel: 'Filter',
    addServiceBtn: 'Add Service',
    logoutAccount: 'Logout Account',
    addNewService: 'Add New Service',
    avatar: 'Avatar',
    blacklist: 'Blacklist',
    min10: 'Min. 10',
    min15: 'Min. 15',
    notifications: 'Notifications',
    postContent: 'Post content',
    shareThoughts: 'Share your thoughts about the service...',
    termsOfService: 'Terms of Service',
    tryExploring: 'Try exploring other tabs or categories.',
    whatsOnYourMind: "What's on your mind?...",
    noFollowedPosts: "You haven't followed anyone yet or they haven't posted.",
    icebreakerMsg1: 'Hey! noticed you just joined. Welcome to the community!',
    icebreakerMsg2: 'Hi there! Would love to play some games with you sometime.',
    icebreakerMsg3: "Welcome! I'm here if you need any help getting started.",
    phReportDetails: 'Please provide details about the violation...',
    phTypeYourMessage: 'Type your message...',
    privacyPolicy: 'Privacy Policy',
    logoutConfirm: 'Logout Account',
    gameLabel: 'Game',
    rankLabel: 'Rank',
    mainLabel: 'Main',
    styleLabel: 'Style',
    statusLabel: 'Status',
    actionsLabel: 'Actions',
    activeLabel: 'Active',
    inactiveLabel: 'Inactive',
    suspendedLabel: 'Suspended',
    confirmedLabel: 'Confirmed',
    pendingLabel: 'Pending',
    cancelledLabel: 'Cancelled',
    completedLabel: 'Completed',
    ongoingLabel: 'Ongoing',
    copyId: 'Copy ID',
    viewDetails: 'View Details',
    noOrders: 'No orders found',
    noNotificationsDesc: 'You are all caught up!',
    clearCache: 'Clear Cache',
    cacheCleared: 'Cache cleared successfully',
    languageChanged: 'Language changed successfully',
    switchLang: 'Switch to Arabic',
    switchLangEn: 'Switch to English',
    aboutApp: 'About ePal Gaming',
    version: 'Version',
    support: 'Support',
    helpCenter: 'Help Center',
    contactUs: 'Contact Us',
    reportProblem: 'Report a Problem',
    playerQualification: 'Player Qualification',
    applicationReview: 'Application Review',
    underReview: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected'
  },
  Arabic: {
    dir: 'rtl',
    home: 'الرئيسية',
    community: 'المجتمع',
    messages: 'الرسائل',
    me: 'أنا',
    settings: 'الإعدادات',
    language: 'اللغة',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
    changeLanguageTitle: 'تغيير اللغة',
    changeLanguageDesc: 'هل أنت متأكد أنك تريد تغيير اللغة؟ سيتم تبديل اتجاه الواجهة.',
    recharge: 'شحن',
    wallet: 'المحفظة',
    search: 'بحث',
    favorite: 'المفضلة',
    games: 'الألعاب',
    chilling: 'دردشة',
    trendingRealms: 'العوالم الرائجة',
    legendEPals: 'أصحاب الأساطير',
    newEPals: 'أصحاب جدد',
    newUsers: 'مستخدمون جدد',
    moreEPals: 'المزيد من الأصحاب',
    searchForEPals: 'ابحث عن أصحاب',
    noEPalsFound: 'لم يتم العثور على أصحاب بهذه المعايير',
    unfollowConfirm: 'هل أنت متأكد من إلغاء متابعة هذا الصاحب؟',
    epal: 'صاحب',
    viewAll: 'عرض الكل',
    logout: 'تسجيل الخروج',
    myOrders: 'طلباتي',
    playerCenter: 'مركز اللاعب',
    rankingCenter: 'مركز التصنيف',
    myServices: 'خدماتي',
    taskCenter: 'مركز المهام',
    all: 'الكل',
    selectCommunity: 'اختر المجتمع',
    typeMessage: 'اكتب رسالة...',
    send: 'إرسال',
    report: 'إبلاغ',
    block: 'حظر',
    unblock: 'إلغاء الحظر',
    online: 'متصل',
    offline: 'غير متصل',
    trending: 'الرائج',
    latest: 'الأحدث',
    following: 'المتابعة',
    follow: 'متابعة',
    balance: 'الرصيد',
    coins: 'عملات',
    profile: 'الملف الشخصي',
    editProfile: 'تعديل الملف الشخصي',
    album: 'الألبوم',
    post: 'منشور',
    service: 'خدمة',
    followed: 'تمت المتابعة',
    fans: 'المعجبون',
    visitors: 'الزوار',
    payment: 'الدفع',
    coupon: 'كوبون',
    discount: 'خصم',
    total: 'الإجمالي',
    payNow: 'ادفع الآن',
    confirmOrder: 'تأكيد الطلب',
    selectPaymentMethod: 'اختر طريقة الدفع',
    viewMore: 'عرض المزيد',
    viewLess: 'عرض أقل',
    // --- تنبيهات وتأكيدات ---
    alertRiskReview: 'عملية الدفع قيد المراجعة الأمنية. يرجى التحقق لاحقاً.',
    alertSecurityBinding: 'حماية أمنية: يجب ربط وسيلة اتصال واحدة على الأقل (هاتف، بريد إلكتروني، أو حساب خارجي) بحسابك لأغراض الأمان.',
    alertFillAllFields: 'يرجى ملء جميع الحقول',
    alertPasswordsNoMatch: 'كلمات المرور الجديدة غير متطابقة',
    alertPasswordMinLength: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل',
    alertServiceUpdated: 'تم تحديث الخدمة بنجاح!',
    alertApplicationSubmitted: 'تم تقديم الطلب بنجاح!',
    alertFillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة',
    alertPlayerLevel: 'مستوى اللاعب الحالي هو LV.',
    confirmUnlink: 'هل أنت متأكد من إلغاء ربط',
    confirmDeleteService: 'هل أنت متأكد من حذف هذه الخدمة؟',
    confirmBlock: 'تأكيد الحظر؟',
    confirmUnblock: 'تأكيد إلغاء الحظر؟',
    // --- نصوص توضيحية للحقول ---
    phDescribeIssue: 'يرجى وصف المشكلة بالتفصيل...',
    phGameNickname: 'مثال: PlayerOne#1234',
    phSearchByIdOrName: 'ابحث بالمعرف أو الاسم',
    phSaySomethingNice: 'قل شيئاً لطيفاً...',
    phSearchOrders: 'ابحث عن الطلبات...',
    phSearchGames: 'ابحث عن الألعاب...',
    phPlayStyle: 'مثال: شرس، استراتيجي، هادئ',
    phIntro: 'أخبر المستخدمين عن مهاراتك وأسلوب لعبك...',
    phCoverIntro: 'عبارة جذابة قصيرة للغلاف...',
    phRank: 'مثال: Diamond IV, Level 100',
    phAggressiveChill: 'مثال: شرس، هادئ، محترف',
    phPrice: 'مثال: 5',
    phDiscount: 'مثال: 10',
    phServiceName: 'مثال: خدمة حمل احترافية',
    phDisplayName: 'اسم العرض الخاص بك',
    phBio: 'أخبر المجتمع عن نفسك...',
    phCurrentPassword: '••••••••',
    phNewPassword: 'الحد الأدنى 8 أحرف',
    phConfirmPassword: 'أعد كتابة كلمة المرور الجديدة',
    phSelectDate: 'اختر التاريخ',
    phSelectRanking: 'اختر التصنيف',
    phSelectPlatform: 'اختر المنصة',
    phSelectServer: 'اختر السيرفر',
    phSelectRole: 'اختر الدور',
    phSelectStyle: 'اختر الأسلوب',
    // --- عناوين الصفحات ---
    titleEditProfile: 'تعديل الملف الشخصي',
    titleChangePassword: 'تغيير كلمة المرور',
    titleLinkedAccounts: 'الحسابات المرتبطة',
    titlePrivacyPolicy: 'سياسة الخصوصية',
    titleSendPlaylink: 'إرسال رابط اللعب',
    titleDeleteService: 'حذف الخدمة',
    titleNotifications: 'الإشعارات',
    titleContacts: 'جهات الاتصال',
    titleMyOrders: 'طلباتي',
    titlePurchaseHistory: 'سجل المشتريات',
    titlePlayerOrders: 'طلبات اللاعبين',
    titleManagePlaylinks: 'روابط اللعب',
    titleAddPlaylink: 'إضافة رابط لعب',
    titleFeedback: 'تقديم ملاحظات',
    titleSelectCategory: 'اختر الفئة',
    titleIcebreakerPool: 'مجمع التعارف',
    titleIncomeReview: 'مراجعة الدخل',
    titleCustomerReview: 'مراجعة العملاء',
    titleLevelDashboard: 'مستوى الصاحب',
    titleRankingCenter: 'مركز التصنيف',
    titleTaskCenter: 'مركز المهام',
    titleLevelBenefits: 'مزايا المستوى',
    // --- أسماء المهام والقواعد ---
    lbDailyLogin: 'تسجيل الدخول اليومي',
    lbPosting: 'المنشورات',
    lbNewUserGreeting: 'تحية المستخدمين الجدد',
    lbResponseRate: 'معدل الاستجابة',
    lbOrderAcceptRate: 'معدل قبول الطلبات',
    lbNewUsersServed: 'المستخدمون الجدد',
    lbRepeatUsers: 'المستخدمون المتكررون',
    lbRating: 'التقييم',
    lbGiftIncome: 'دخل الهدايا',
    lbTotalIncome: 'إجمالي الدخل',
    lbBaseDecay: 'التناقص الأساسي',
    lbReducedDecay: 'التناقص المخفّض',
    lbNoOrderPenalty: 'عقوبة عدم وجود طلبات',
    lbSuspension: 'الإيقاف',
    // --- وصف المهام والقواعد ---
    descDailyLogin: '+3 نقاط يومياً، حد أقصى 15 نقطة',
    descPosting: '+5 نقاط لكل منشور، حد أقصى 15 نقطة',
    descNewUserGreeting: '+2 نقطة لكل رد، حد أقصى 50 نقطة',
    descResponseRate: '≥90% → 35، 75-90% → 20، 60-75% → 5',
    descOrderAcceptRate: '≥90% → 35، 75-90% → 20، 60-75% → 5',
    descNewUsersServed: '+10 نقاط لكل مستخدم، حد أقصى 100 نقطة',
    descRepeatUsers: '+5 نقاط لكل مستخدم، حد أقصى 100 نقطة',
    descRating: '≥4.9 → 50، 4.5-4.9 → 30، 4.0-4.5 → 10',
    descGiftIncome: '+2 نقطة لكل 10 ألماسات، حد أقصى 100 نقطة',
    descTotalIncome: '+1 نقطة لكل 20 ألماسة، حد أقصى 200 نقطة',
    descBaseDecay: 'تناقص 6% من النقاط أسبوعياً',
    descReducedDecay: 'تناقص 3% إذا كان الدخل الأسبوعي ≥ 1000',
    descNoOrderPenalty: 'خصم -50 إلى -200 نقطة أسبوعياً',
    descSuspension: '4 أسابيع متتالية في المستوى الأول تؤدي لإلغاء التأهيل',
    // --- متفرقات ---
    messagesTitle: 'الرسائل',
    noTransactions: 'لا توجد معاملات',
    noPlaylinks: 'لا توجد روابط لعب',
    noPlaylinksDesc: 'اربط حسابات الألعاب الخاصة بك لعرض تصنيفاتك وإحصائياتك.',
    addFirstPlaylink: 'أضف أول رابط لعب',
    securePayment: 'دفع آمن',
    securePaymentDesc: 'إتمام الشراء تلقائياً حسب متجر جهازك',
    perHour: 'للساعة',
    coinBalance: 'رصيد العملات',
    diamondBalance: 'رصيد الألماسات',
    rechargePackages: 'باقات الشحن',
    earningTips: 'نصائح الربح',
    completeOrders: 'إكمال الطلبات',
    completeOrdersDesc: 'اكسب الألماسات من خلال تقديم خدمات عالية الجودة لعملائك.',
    receiveGifts: 'استلام الهدايا',
    receiveGiftsDesc: 'احصل على ألماسات إضافية من العملاء السعداء من خلال نظام الهدايا.',
    exchange: 'تحويل',
    withdraw: 'سحب',
    history: 'السجل',
    dateRange: 'نطاق التاريخ',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    reset: 'إعادة',
    apply: 'تطبيق',
    allTypes: 'جميع الأنواع',
    income: 'دخل',
    expenses: 'مصروفات',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    uploading: 'جاري الرفع...',
    submitting: 'جاري الإرسال...',
    loading: 'جاري التحميل...',
    noResults: 'لا توجد نتائج',
    loadMore: 'تحميل المزيد',
    retry: 'إعادة المحاولة',
    close: 'إغلاق',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    finish: 'إنهاء',
    skip: 'تخطي',
    done: 'تم',
    optional: 'اختياري',
    required: 'مطلوب',
    maxChars: 'حد أقصى',
    characters: 'حرف',
    today: 'اليوم',
    yesterday: 'أمس',
    daysAgo: 'أيام مضت',
    justNow: 'الآن',
    minutesAgo: 'دقائق مضت',
    hoursAgo: 'ساعات مضت',
    secureAccount: 'دفع آمن',
    changeType: 'تغيير النوع',
    submitReport: 'إرسال البلاغ',
    reportUser: 'الإبلاغ عن مستخدم',
    reportPost: 'الإبلاغ عن منشور',
    selectReportType: 'يرجى اختيار نوع البلاغ (مطلوب)',
    descriptionOptional: 'الوصف (اختياري)',
    evidenceScreenshots: 'لقطات الإثبات (اختياري)',
    maxScreenshots: 'الحد الأقصى 4 لقطات',
    upload: 'رفع',
    addedToFavorites: 'تمت الإضافة للمفضلة',
    removedFromFavorites: 'تمت الإزالة من المفضلة',
    switchToCoins: 'عملات',
    switchToDiamonds: 'ألماسات',
    aboutMe: 'نبذة عني',
    services: 'الخدمات',
    reviews: 'التقييمات',
    playlinks: 'روابط اللعب',
    posts: 'المنشورات',
    noReviewsYet: 'لا توجد تقييمات بعد',
    noServicesYet: 'لا توجد خدمات بعد',
    orderNow: 'اطلب الآن',
    startChat: 'ابدأ المحادثة',
    voiceChat: 'محادثة صوتية',
    textChat: 'محادثة نصية',
    giftSent: 'تم إرسال الهدية!',
    messageSent: 'تم إرسال الرسالة!',
    copySuccess: 'تم النسخ للحافظة',
    linkCopied: 'تم نسخ الرابط',
    featureComingSoon: 'قريباً',
    noNotifications: 'لا توجد إشعارات',
    clearAll: 'مسح الكل',
    markAllRead: 'تعليم الكل كمقروء',
    systemNotification: 'النظام',
    orderNotification: 'الطلبات',
    socialNotification: 'اجتماعي',
    buyXGetY: 'اشتري {x} واحصل على {y}',
    free: 'مجاني',
    limited: 'محدود',
    unlimited: 'غير محدود',
    // --- كاسر الجليد ---
    icebreakerPool: 'مجمع التعارف',
    icebreakerDesc: 'رحب بالمستخدمين الجدد واعثر على زملاء محتملين! ({count}/25 اليوم)',
    quickReplies: 'ردود سريعة',
    sayHiTo: 'قل مرحباً لـ',
    firstContactCounts: 'التواصل الأول مهم!',
    sayHi: 'قل مرحباً',
    // --- المزيد من الواجهة ---
    customMessage: 'رسالة مخصصة',
    sendMessage: 'إرسال الرسالة',
    joinedAgo: 'انضم منذ {duration}',
    selectGame: 'اختر اللعبة',
    playlinkDetails: 'تفاصيل رابط اللعب',
    gameNicknameId: 'معرف/اسم اللعبة (مطلوب)',
    currentRanking: 'التصنيف الحالي',
    platform: 'المنصة',
    server: 'السيرفر',
    positionRole: 'الموقع/الدور',
    playStyle: 'أسلوب اللعب',
    verificationScreenshot: 'لقطة تحقق',
    uploadScreen: 'رفع لقطة',
    feedbackType: 'نوع الملاحظة',
    timeOfOccurrence: 'وقت الحدوث',
    problemDescription: 'وصف المشكلة (مطلوب)',
    screenshotOptional: 'لقطة شاشة (اختياري)',
    selectTheTime: 'اختر وقت حدوث المشكلة',
    feedbackSubmitted: 'تم تقديم الملاحظة',
    promoStartDate: 'بداية العرض',
    promoEndDate: 'نهاية العرض',
    promoType: 'نوع العرض',
    none: 'لا يوجد',
    firstOrderDiscount: 'خصم أول طلب',
    percentage: 'نسبة مئوية',
    fixedAmount: 'مبلغ ثابت',
    serviceName: 'اسم الخدمة',
    unit: 'الوحدة',
    promotion: 'العرض الترويجي',
    addService: 'إضافة خدمة',
    editService: 'تعديل الخدمة',
    deleteServiceTitle: 'حذف الخدمة',
    confirmDeleteServiceMsg: 'هل أنت متأكد من حذف هذه الخدمة؟ لا يمكن التراجع عن هذا الإجراء.',
    screenshot: 'لقطة شاشة',
    remove: 'إزالة',
    changePhoto: 'تغيير الصورة',
    gender: 'الجنس',
    birthday: 'تاريخ الميلاد',
    region: 'المنطقة',
    phone: 'الهاتف',
    bindEmail: 'ربط البريد الإلكتروني',
    bindPhone: 'ربط الهاتف',
    changeEmail: 'تغيير البريد الإلكتروني',
    changePhone: 'تغيير رقم الهاتف',
    sendCode: 'إرسال الرمز',
    verify: 'تحقق',
    resendCode: 'إعادة إرسال الرمز',
    enterCode: 'أدخل رمز التحقق',
    successfullyBound: 'تم الربط بنجاح',
    // --- مفاتيح إضافية ---
    optionSelectRanking: 'اختر التصنيف',
    optionSelectPlatform: 'اختر المنصة',
    optionSelectServer: 'اختر السيرفر',
    optionSelectRole: 'اختر الدور',
    optionSelectStyle: 'اختر الأسلوب',
    loadingMore: 'جاري تحميل المزيد...',
    filterLabel: 'تصفية',
    addServiceBtn: 'إضافة خدمة',
    logoutAccount: 'تسجيل الخروج من الحساب',
    addNewService: 'إضافة خدمة جديدة',
    avatar: 'الصورة الرمزية',
    blacklist: 'القائمة السوداء',
    min10: 'الحد الأدنى 10',
    min15: 'الحد الأدنى 15',
    notifications: 'الإشعارات',
    postContent: 'محتوى المنشور',
    shareThoughts: 'شارك بأفكارك حول الخدمة...',
    termsOfService: 'شروط الخدمة',
    tryExploring: 'جرب استكشاف علامات تبويب أو فئات أخرى.',
    whatsOnYourMind: 'ما الذي يدور في ذهنك؟...',
    noFollowedPosts: 'لم تتابع أي شخص بعد أو لم ينشروا بعد.',
    icebreakerMsg1: 'مرحباً! لاحظت انضمامك للتو. أهلاً بك في المجتمع!',
    icebreakerMsg2: 'أهلاً! يسعدني أن نلعب بعض الألعاب معاً في وقت ما.',
    icebreakerMsg3: 'أهلاً بك! أنا هنا إذا احتجت أي مساعدة للبدء.',
    phReportDetails: 'يرجى تقديم تفاصيل حول المخالفة...',
    phTypeYourMessage: 'اكتب رسالتك...',
    privacyPolicy: 'سياسة الخصوصية',
    logoutConfirm: 'تسجيل الخروج من الحساب',
    gameLabel: 'اللعبة',
    rankLabel: 'التصنيف',
    mainLabel: 'الرئيسي',
    styleLabel: 'الأسلوب',
    statusLabel: 'الحالة',
    actionsLabel: 'الإجراءات',
    activeLabel: 'نشط',
    inactiveLabel: 'غير نشط',
    suspendedLabel: 'موقوف',
    confirmedLabel: 'مؤكد',
    pendingLabel: 'معلق',
    cancelledLabel: 'ملغي',
    completedLabel: 'مكتمل',
    ongoingLabel: 'جاري',
    copyId: 'نسخ المعرّف',
    viewDetails: 'عرض التفاصيل',
    noOrders: 'لا توجد طلبات',
    noNotificationsDesc: 'أنت على اطلاع بكل شيء!',
    clearCache: 'مسح الذاكرة المؤقتة',
    cacheCleared: 'تم مسح الذاكرة المؤقتة بنجاح',
    languageChanged: 'تم تغيير اللغة بنجاح',
    switchLang: 'التبديل إلى العربية',
    switchLangEn: 'التبديل إلى الإنجليزية',
    aboutApp: 'حول ePal Gaming',
    version: 'الإصدار',
    support: 'الدعم',
    helpCenter: 'مركز المساعدة',
    contactUs: 'اتصل بنا',
    reportProblem: 'الإبلاغ عن مشكلة',
    playerQualification: 'تأهيل اللاعب',
    applicationReview: 'مراجعة الطلب',
    underReview: 'قيد المراجعة',
    approved: 'مقبول',
    rejected: 'مرفوض'
  },
  Turkish: {
    dir: 'ltr',
    home: 'Ana Sayfa',
    community: 'Topluluk',
    messages: 'Mesajlar',
    me: 'Ben',
    settings: 'Ayarlar',
    language: 'Dil',
    confirm: 'Onayla',
    cancel: 'İptal',
    changeLanguageTitle: 'Dili Değiştir',
    changeLanguageDesc: 'Dili değiştirmek istediğinize emin misiniz? Arayüz yeniden yüklenecek.',
    recharge: 'Yükle',
    wallet: 'Cüzdan',
    search: 'Ara',
    favorite: 'Favori',
    games: 'Oyunlar',
    chilling: 'Sohbet',
    trendingRealms: 'Trend Diyarlar',
    legendEPals: 'Efsane EPaller',
    newEPals: 'Yeni EPaller',
    newUsers: 'Yeni Kullanıcılar',
    moreEPals: 'Daha Fazla EPal',
    searchForEPals: 'EPal Ara',
    noEPalsFound: 'Bu filtrelerle EPal bulunamadı',
    unfollowConfirm: 'Bu arkadaşı takipten çıkmak istediğinize emin misiniz?',
    epal: 'EPal',
    viewAll: 'Tümünü Gör',
    logout: 'Çıkış Yap',
    myOrders: 'Siparişlerim',
    playerCenter: 'Oyuncu Merkezi',
    rankingCenter: 'Sıralama Merkezi',
    myServices: 'Hizmetlerim',
    taskCenter: 'Görev Merkezi',
    all: 'Tümü',
    selectCommunity: 'Topluluk Seç',
    typeMessage: 'Mesaj yaz...',
    send: 'Gönder',
    report: 'Bildir',
    block: 'Engelle',
    unblock: 'Engeli Kaldır',
    online: 'Çevrimiçi',
    offline: 'Çevrimdışı',
    trending: 'Trend',
    latest: 'En Yeni',
    following: 'Takip',
    follow: 'Takip Et',
    balance: 'Bakiye',
    coins: 'Para',
    profile: 'Profil',
    editProfile: 'Profili Düzenle',
    album: 'Albüm',
    post: 'Gönderi',
    service: 'Hizmet',
    followed: 'Takip Edildi',
    fans: 'Hayranlar',
    visitors: 'Ziyaretçiler',
    payment: 'Ödeme',
    coupon: 'Kupon',
    discount: 'İndirim',
    total: 'Toplam',
    payNow: 'Şimdi Öde',
    confirmOrder: 'Siparişi Onayla',
    selectPaymentMethod: 'Ödeme Yöntemi Seç',
    viewMore: 'Daha Fazla',
    viewLess: 'Daha Az',
    alertRiskReview: 'Ödeme risk kontrolü için inceleniyor. Lütfen daha sonra tekrar kontrol edin.',
    alertSecurityBinding: 'Güvenlik Koruması: Güvenlik amacıyla hesabınıza en az bir bağlantı (Telefon, E-posta veya Üçüncü taraf hesabı) bağlanmalıdır.',
    alertFillAllFields: 'Lütfen tüm alanları doldurun',
    alertPasswordsNoMatch: 'Yeni şifreler eşleşmiyor',
    alertPasswordMinLength: 'Şifre en az 8 karakter olmalıdır',
    alertServiceUpdated: 'Hizmet başarıyla güncellendi!',
    alertApplicationSubmitted: 'Başvuru başarıyla gönderildi!',
    alertFillRequiredFields: 'Lütfen gerekli tüm alanları doldurun',
    alertPlayerLevel: 'Mevcut Oyuncu Seviyeniz LV.',
    confirmUnlink: 'Bağlantıyı kaldırmak istediğinize emin misiniz',
    confirmDeleteService: 'Bu hizmeti silmek istediğinize emin misiniz?',
    confirmBlock: 'Engellemeyi Onayla?',
    confirmUnblock: 'Engel Kaldırmayı Onayla?',
    phDescribeIssue: 'Lütfen sorunu ayrıntılı olarak açıklayın...',
    phGameNickname: 'örn. OyuncuBir#1234',
    phSearchByIdOrName: 'ID veya İsme Göre Ara',
    phSaySomethingNice: 'Güzel bir şey söyle...',
    phSearchOrders: 'Siparişleri ara...',
    phSearchGames: 'Oyunları ara...',
    phPlayStyle: 'örn. Agresif, Stratejik, Sakin',
    phIntro: 'Kullanıcılara yeteneklerinizden ve oyun tarzınızdan bahsedin...',
    phCoverIntro: 'Kapağınız için kısa ve etkileyici bir tanıtım...',
    phRank: 'örn. Elmas IV, Seviye 100',
    phAggressiveChill: 'örn. Agresif, Sakin, Profesyonel',
    phPrice: 'örn. 5',
    phDiscount: 'örn. 10',
    phServiceName: 'örn. Profesyonel Taşıma Hizmeti',
    phDisplayName: 'Görünen adınız',
    phBio: 'Topluluğa kendinizden bahsedin...',
    phCurrentPassword: '••••••••',
    phNewPassword: 'En az 8 karakter',
    phConfirmPassword: 'Yeni şifreyi tekrar yazın',
    phSelectDate: 'Tarih Seç',
    phSelectRanking: 'Sıralama Seç',
    phSelectPlatform: 'Platform Seç',
    phSelectServer: 'Sunucu Seç',
    phSelectRole: 'Rol Seç',
    phSelectStyle: 'Stil Seç',
    titleEditProfile: 'Profili Düzenle',
    titleChangePassword: 'Şifre Değiştir',
    titleLinkedAccounts: 'Bağlı Hesaplar',
    titlePrivacyPolicy: 'Gizlilik Politikası',
    titleSendPlaylink: 'Oyun Bağlantısı Gönder',
    titleDeleteService: 'Hizmeti Sil',
    titleNotifications: 'Bildirimler',
    titleContacts: 'Kişiler',
    titleMyOrders: 'Siparişlerim',
    titlePurchaseHistory: 'Satın Alma Geçmişi',
    titlePlayerOrders: 'Oyuncu Siparişleri',
    titleManagePlaylinks: 'Oyun Bağlantıları',
    titleAddPlaylink: 'Oyun Bağlantısı Ekle',
    titleFeedback: 'Geri Bildirim Gönder',
    titleSelectCategory: 'Kategori Seç',
    titleIcebreakerPool: 'Tanışma Havuzu',
    titleIncomeReview: 'Gelir İnceleme',
    titleCustomerReview: 'Müşteri İnceleme',
    titleLevelDashboard: 'EPal Seviyesi',
    titleRankingCenter: 'Sıralama Merkezi',
    titleTaskCenter: 'Görev Merkezi',
    titleLevelBenefits: 'Seviye Avantajları',
    lbDailyLogin: 'Günlük Giriş',
    lbPosting: 'Gönderi',
    lbNewUserGreeting: 'Yeni Kullanıcı Selamlama',
    lbResponseRate: 'Yanıt Oranı',
    lbOrderAcceptRate: 'Sipariş Kabul Oranı',
    lbNewUsersServed: 'Hizmet Verilen Yeni Kullanıcılar',
    lbRepeatUsers: 'Tekrarlayan Kullanıcılar',
    lbRating: 'Puan',
    lbGiftIncome: 'Hediye Geliri',
    lbTotalIncome: 'Toplam Gelir',
    lbBaseDecay: 'Temel Azalma',
    lbReducedDecay: 'Azaltılmış Azalma',
    lbNoOrderPenalty: 'Siparişsizlik Cezası',
    lbSuspension: 'Askıya Alma',
    descDailyLogin: 'Günde +3, maksimum 15 puan',
    descPosting: 'Gönderi başına +5, maksimum 15 puan',
    descNewUserGreeting: 'Yanıt başına +2, maksimum 50 puan',
    descResponseRate: '≥%90 → 35, %75-90 → 20, %60-75 → 5',
    descOrderAcceptRate: '≥%90 → 35, %75-90 → 20, %60-75 → 5',
    descNewUsersServed: 'Kullanıcı başına +10, maksimum 100 puan',
    descRepeatUsers: 'Kullanıcı başına +5, maksimum 100 puan',
    descRating: '≥4.9 → 50, 4.5-4.9 → 30, 4.0-4.5 → 10',
    descGiftIncome: '10 elmas başına +2, maksimum 100 puan',
    descTotalIncome: '20 elmas başına +1, maksimum 200 puan',
    descBaseDecay: 'Haftalık %6 puan azalması',
    descReducedDecay: 'Haftalık gelir ≥ 1000 ise %3 azalma',
    descNoOrderPenalty: 'Haftalık -50 ila -200 puan',
    descSuspension: 'L1\'de art arda 4 hafta yeterliliği kaldırır',
    messagesTitle: 'Mesajlar',
    noTransactions: 'İşlem bulunamadı',
    noPlaylinks: 'Oyun Bağlantısı Bulunamadı',
    noPlaylinksDesc: 'Sıralamanızı ve istatistiklerinizi göstermek için oyun hesaplarınızı bağlayın.',
    addFirstPlaylink: 'İlk Oyun Bağlantısını Ekle',
    securePayment: 'Güvenli Ödeme',
    securePaymentDesc: 'Cihazınıza göre otomatik mağaza ödemesi',
    perHour: 'saat başına',
    coinBalance: 'Para Bakiyesi',
    diamondBalance: 'Elmas Bakiyesi',
    rechargePackages: 'Yükleme Paketleri',
    earningTips: 'Kazanç İpuçları',
    completeOrders: 'Siparişleri Tamamla',
    completeOrdersDesc: 'Müşterilerinize yüksek kaliteli hizmetler sunarak elmas kazanın.',
    receiveGifts: 'Hediyeler Al',
    receiveGiftsDesc: 'Hediye sistemi aracılığıyla mutlu müşterilerden ekstra elmaslar alın.',
    exchange: 'Değiştir',
    withdraw: 'Çek',
    history: 'Geçmiş',
    dateRange: 'Tarih Aralığı',
    startDate: 'Başlangıç Tarihi',
    endDate: 'Bitiş Tarihi',
    reset: 'Sıfırla',
    apply: 'Uygula',
    allTypes: 'Tüm Türler',
    income: 'Gelir',
    expenses: 'Giderler',
    save: 'Kaydet',
    delete: 'Sil',
    edit: 'Düzenle',
    add: 'Ekle',
    uploading: 'Yükleniyor...',
    submitting: 'Gönderiliyor...',
    loading: 'Yükleniyor...',
    noResults: 'Sonuç bulunamadı',
    loadMore: 'Daha Fazla Yükle',
    retry: 'Tekrar Dene',
    close: 'Kapat',
    back: 'Geri',
    next: 'İleri',
    previous: 'Önceki',
    finish: 'Bitir',
    skip: 'Atla',
    done: 'Tamam',
    optional: 'İsteğe bağlı',
    required: 'Zorunlu',
    maxChars: 'maks',
    characters: 'karakter',
    today: 'Bugün',
    yesterday: 'Dün',
    daysAgo: 'gün önce',
    justNow: 'Az önce',
    minutesAgo: 'dk önce',
    hoursAgo: 'sa önce',
    secureAccount: 'Güvenli Ödeme',
    changeType: 'Türü Değiştir',
    submitReport: 'Bildirimi Gönder',
    reportUser: 'Kullanıcıyı Bildir',
    reportPost: 'Gönderiyi Bildir',
    selectReportType: 'Lütfen bildirim türünü seçin (Zorunlu)',
    descriptionOptional: 'Açıklama (İsteğe bağlı)',
    evidenceScreenshots: 'Kanıt Ekran Görüntüleri (İsteğe bağlı)',
    maxScreenshots: 'En fazla 4 ekran görüntüsü',
    upload: 'Yükle',
    addedToFavorites: 'Favorilere eklendi',
    removedFromFavorites: 'Favorilerden kaldırıldı',
    switchToCoins: 'Para',
    switchToDiamonds: 'Elmas',
    aboutMe: 'Hakkımda',
    services: 'Hizmetler',
    reviews: 'Değerlendirmeler',
    playlinks: 'Oyun Bağlantıları',
    posts: 'Gönderiler',
    noReviewsYet: 'Henüz değerlendirme yok',
    noServicesYet: 'Henüz hizmet yok',
    orderNow: 'Şimdi Sipariş Ver',
    startChat: 'Sohbete Başla',
    voiceChat: 'Sesli Sohbet',
    textChat: 'Yazılı Sohbet',
    giftSent: 'Hediye gönderildi!',
    messageSent: 'Mesaj gönderildi!',
    copySuccess: 'Panoya kopyalandı',
    linkCopied: 'Bağlantı kopyalandı',
    featureComingSoon: 'Yakında',
    noNotifications: 'Henüz bildirim yok',
    clearAll: 'Tümünü Temizle',
    markAllRead: 'Tümünü Okundu İşaretle',
    systemNotification: 'Sistem',
    orderNotification: 'Sipariş',
    socialNotification: 'Sosyal',
    buyXGetY: '{x} Al {y} Bedava',
    free: 'Ücretsiz',
    limited: 'Sınırlı',
    unlimited: 'Sınırsız',
    icebreakerPool: 'Tanışma Havuzu',
    icebreakerDesc: 'Yeni kullanıcılara selam ver ve potansiyel takım arkadaşları bul! ({count}/25 bugün)',
    quickReplies: 'Hızlı Yanıtlar',
    sayHiTo: 'Selam Ver',
    firstContactCounts: 'İlk temas önemlidir!',
    sayHi: 'Selam Ver',
    customMessage: 'Özel Mesaj',
    sendMessage: 'Mesaj Gönder',
    joinedAgo: '{duration} önce katıldı',
    selectGame: 'Oyun Seç',
    playlinkDetails: 'Oyun Bağlantısı Detayları',
    gameNicknameId: 'Oyun Takma Adı/ID (Zorunlu)',
    currentRanking: 'Mevcut Sıralama',
    platform: 'Platform',
    server: 'Sunucu',
    positionRole: 'Pozisyon/Rol',
    playStyle: 'Oyun Stili',
    verificationScreenshot: 'Doğrulama Ekran Görüntüsü',
    uploadScreen: 'Ekran Görüntüsü Yükle',
    feedbackType: 'Geri Bildirim Türü',
    timeOfOccurrence: 'Olay Zamanı',
    problemDescription: 'Sorun Açıklaması (Zorunlu)',
    screenshotOptional: 'Ekran Görüntüsü (İsteğe bağlı)',
    selectTheTime: 'Sorunun meydana geldiği zamanı seçin',
    feedbackSubmitted: 'Geri Bildirim Gönderildi',
    promoStartDate: 'Promosyon Başlangıcı',
    promoEndDate: 'Promosyon Bitişi',
    promoType: 'Promosyon Türü',
    none: 'Yok',
    firstOrderDiscount: 'İlk Sipariş İndirimi',
    percentage: 'Yüzde',
    fixedAmount: 'Sabit Tutar',
    serviceName: 'Hizmet Adı',
    unit: 'Birim',
    promotion: 'Promosyon',
    addService: 'Hizmet Ekle',
    editService: 'Hizmeti Düzenle',
    deleteServiceTitle: 'Hizmeti Sil',
    confirmDeleteServiceMsg: 'Bu hizmeti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
    screenshot: 'Ekran Görüntüsü',
    remove: 'Kaldır',
    changePhoto: 'Fotoğrafı Değiştir',
    gender: 'Cinsiyet',
    birthday: 'Doğum Günü',
    region: 'Bölge',
    phone: 'Telefon',
    bindEmail: 'E-posta Bağla',
    bindPhone: 'Telefon Bağla',
    changeEmail: 'E-posta Değiştir',
    changePhone: 'Telefon Değiştir',
    sendCode: 'Kod Gönder',
    verify: 'Doğrula',
    resendCode: 'Kodu Tekrar Gönder',
    enterCode: 'Doğrulama kodunu girin',
    successfullyBound: 'Başarıyla bağlandı',
    // --- Ek anahtarlar ---
    optionSelectRanking: 'Sıralama Seç',
    optionSelectPlatform: 'Platform Seç',
    optionSelectServer: 'Sunucu Seç',
    optionSelectRole: 'Rol Seç',
    optionSelectStyle: 'Stil Seç',
    loadingMore: 'Daha fazla yükleniyor...',
    filterLabel: 'Filtrele',
    addServiceBtn: 'Hizmet Ekle',
    logoutAccount: 'Hesaptan Çıkış',
    addNewService: 'Yeni Hizmet Ekle',
    avatar: 'Avatar',
    blacklist: 'Kara Liste',
    min10: 'Min. 10',
    min15: 'Min. 15',
    notifications: 'Bildirimler',
    postContent: 'Gönderi içeriği',
    shareThoughts: 'Hizmet hakkında düşüncelerinizi paylaşın...',
    termsOfService: 'Hizmet Şartları',
    tryExploring: 'Diğer sekmeleri veya kategorileri keşfetmeyi deneyin.',
    whatsOnYourMind: 'Aklında ne var?...',
    noFollowedPosts: 'Henüz kimseyi takip etmediniz veya onlar gönderi paylaşmadı.',
    icebreakerMsg1: 'Hey! yeni katıldığını fark ettim. Topluluğa hoş geldin!',
    icebreakerMsg2: 'Merhaba! Seninle biraz oyun oynamak isterim.',
    icebreakerMsg3: 'Hoş geldin! Başlamak için yardıma ihtiyacın olursa buradayım.',
    phReportDetails: 'Lütfen ihlal hakkında ayrıntılı bilgi verin...',
    phTypeYourMessage: 'Mesajınızı yazın...',
    privacyPolicy: 'Gizlilik Politikası',
    logoutConfirm: 'Hesaptan Çıkış',
    gameLabel: 'Oyun',
    rankLabel: 'Sıralama',
    mainLabel: 'Ana',
    styleLabel: 'Stil',
    statusLabel: 'Durum',
    actionsLabel: 'İşlemler',
    activeLabel: 'Aktif',
    inactiveLabel: 'Pasif',
    suspendedLabel: 'Askıya Alındı',
    confirmedLabel: 'Onaylandı',
    pendingLabel: 'Beklemede',
    cancelledLabel: 'İptal Edildi',
    completedLabel: 'Tamamlandı',
    ongoingLabel: 'Devam Ediyor',
    copyId: 'ID Kopyala',
    viewDetails: 'Detayları Gör',
    noOrders: 'Sipariş bulunamadı',
    noNotificationsDesc: 'Tamamen gündemdesiniz!',
    clearCache: 'Önbelleği Temizle',
    cacheCleared: 'Önbellek başarıyla temizlendi',
    languageChanged: 'Dil başarıyla değiştirildi',
    switchLang: 'Arapçaya Geç',
    switchLangEn: 'İngilizceye Geç',
    aboutApp: 'ePal Gaming Hakkında',
    version: 'Sürüm',
    support: 'Destek',
    helpCenter: 'Yardım Merkezi',
    contactUs: 'Bize Ulaşın',
    reportProblem: 'Sorun Bildir',
    playerQualification: 'Oyuncu Yeterliliği',
    applicationReview: 'Başvuru İnceleme',
    underReview: 'İnceleniyor',
    approved: 'Onaylandı',
    rejected: 'Reddedildi'
  }
} as const;

// Module-level t() so ALL components can use it
let _lang: 'English' | 'Arabic' | 'Turkish' = 'English';
export const setLang = (l: 'English' | 'Arabic' | 'Turkish') => { _lang = l; };
export const t = (key: keyof typeof LANGUAGES_DATA['English']) => {
  return LANGUAGES_DATA[_lang][key] || LANGUAGES_DATA['English'][key];
};

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Arabic' | 'Turkish'>('English');
  const [pendingLanguage, setPendingLanguage] = useState<'English' | 'Arabic' | 'Turkish' | null>(null);
  const [showLanguageConfirm, setShowLanguageConfirm] = useState(false);

  // Sync React state to module-level variable
  useEffect(() => { setLang(selectedLanguage); }, [selectedLanguage]);

  const [serviceSort, setServiceSort] = useState<'NAME_ASC' | 'NAME_DESC' | 'ORDERS_ASC' | 'ORDERS_DESC'>('NAME_ASC');
  const [showServiceSortMenu, setShowServiceSortMenu] = useState(false);
  const [serviceToToggle, setServiceToToggle] = useState<any>(null);
  const [serviceToDelete, setServiceToDelete] = useState<any>(null);
  const [playingServiceId, setPlayingServiceId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('HOME');
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [rechargePackages, setRechargePackages] = useState<RechargePackage[]>([]);
  const [isRecharging, setIsRecharging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState({
    message: true,
    order: true,
    system: true,
    post: true
  });
  const [cacheSize, setCacheSize] = useState('12.4 MB');
  const [showDecayExplainer, setShowDecayExplainer] = useState(false);

  useEffect(() => {
    (window as any).setShowDecayExplainer = setShowDecayExplainer;
  }, []);
  const onOpenDatePicker = (id: string, value: string, title: string) => {
    let defaultValue = value;
    if (!defaultValue) {
      if (id === 'BIRTHDAY') {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 18);
        defaultValue = today.toISOString().split('T')[0];
      } else {
        defaultValue = new Date().toISOString().split('T')[0];
      }
    }
    setDatePickerTarget({ id, value: defaultValue, title });
  };

  const handleDateChange = (newDate: string) => {
    if (!datePickerTarget) return;

    // Common check: Prevent future dates across all pickers (except if we ever allow future)
    const isFuture = new Date(newDate) > new Date();
    const validatedDate = isFuture ? new Date().toISOString().split('T')[0] : newDate;

    setDatePickerTarget(prev => prev ? { ...prev, value: validatedDate } : null);
    
    switch (datePickerTarget.id) {
      case 'BIRTHDAY':
        setTempProfile(prev => ({ ...prev, birthday: validatedDate }));
        break;
      case 'WALLET_START':
        setWalletStartDate(validatedDate);
        if (new Date(validatedDate) > new Date(walletEndDate)) {
          setWalletEndDate(validatedDate);
        }
        break;
      case 'WALLET_END':
        setWalletEndDate(validatedDate);
        if (new Date(validatedDate) < new Date(walletStartDate)) {
          setWalletStartDate(validatedDate);
        }
        break;
      case 'ORDER_START':
        setOrderStartDate(validatedDate);
        if (new Date(validatedDate) > new Date(orderEndDate)) {
          setOrderEndDate(validatedDate);
        }
        break;
      case 'ORDER_END':
        setOrderEndDate(validatedDate);
        if (new Date(validatedDate) < new Date(orderStartDate)) {
          setOrderStartDate(validatedDate);
        }
        break;
      case 'PROMO_START':
        setServiceForm(prev => ({ 
          ...prev, 
          promotion: { 
            ...prev.promotion, 
            startDate: validatedDate,
            endDate: new Date(validatedDate) > new Date(prev.promotion.endDate || '') ? validatedDate : prev.promotion.endDate
          } 
        }));
        break;
      case 'FEEDBACK_TIME':
        setFeedbackTime(validatedDate);
        break;
      case 'PROMO_END':
        setServiceForm(prev => ({ 
          ...prev, 
          promotion: { 
            ...prev.promotion, 
            endDate: validatedDate,
            startDate: new Date(validatedDate) < new Date(prev.promotion.startDate || '') ? validatedDate : prev.promotion.startDate
          } 
        }));
        break;
    }
  };

  const userId = 'user_1'; // Mock current user

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`/api/wallet/balance?userId=${userId}`);
      const data = await res.json();
      setWallet(data);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  }, [userId]);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/wallet/transactions?userId=${userId}`);
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  }, [userId]);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/recharge/packages');
      const data = await res.json();
      setRechargePackages(data);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
    fetchPackages();
  }, [fetchWallet, fetchTransactions, fetchPackages]);

  const handleRecharge = async (pkg: RechargePackage, method: 'GOOGLE_PAY' | 'APPLE_PAY') => {
    setIsRecharging(true);
    try {
      // 1. Create Order
      const createRes = await fetch('/api/recharge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, packageId: pkg.id, paymentMethod: method })
      });
      const order = await createRes.json();
      
      if (order.error) throw new Error(order.error);

      // 2. Simulate Payment Gateway (Apple/Google Pay)
      // In a real app, this would open the native payment sheet
      await new Promise(resolve => setTimeout(resolve, 2000));
      const transactionId = `pay_${Math.random().toString(36).substr(2, 9)}`;

      // 3. Verify Payment (Callback)
      const verifyRes = await fetch('/api/recharge/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: order.id, 
          transactionId, 
          status: 'SUCCESS' 
        })
      });
      const result = await verifyRes.json();

      if (result.status === 'SUCCESS') {
        await fetchWallet();
        await fetchTransactions();
        navigateTo('WALLET');
      } else if (result.status === 'PENDING') {
        alert(t('alertRiskReview'));
        navigateTo('WALLET');
      }
    } catch (err: any) {
      alert(err.message || 'Recharge failed');
    } finally {
      setIsRecharging(false);
    }
  };

  const handleExchangeDiamonds = (amount: number) => {
    if (amount < 10) return;
    if (amount % 10 !== 0) return;
    if (amount > userDiamonds) return;

    const coinsToReceive = Math.floor(amount * 0.8);
    
    // Update Diamonds
    setUserDiamonds(prev => prev - amount);
    const diamondTx: WalletTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount: -amount,
      description: 'Exchange to Coins',
      timestamp: Date.now(),
      type: 'EXCHANGE'
    };
    setDiamondTransactions(prev => [diamondTx, ...prev]);

    // Update Coins
    setWallet(prev => prev ? { ...prev, balance: prev.balance + coinsToReceive } : null);
    const coinTx: WalletTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount: coinsToReceive,
      description: 'Exchange from Diamonds',
      timestamp: Date.now(),
      type: 'EXCHANGE'
    };
    setTransactions(prev => [coinTx, ...prev]);
    
    setExchangeAmount('');
    handleBack();
  };

  const handleWithdrawDiamonds = (amount: number) => {
    if (amount < 15) return;
    if (amount % 15 !== 0) return;
    if (amount > userDiamonds) return;

    const usdToReceive = amount / 15;
    
    // Update Diamonds
    setUserDiamonds(prev => prev - amount);
    const diamondTx: WalletTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount: -amount,
      description: `Withdrawal ($${usdToReceive.toFixed(2)})`,
      timestamp: Date.now(),
      type: 'WITHDRAW'
    };
    setDiamondTransactions(prev => [diamondTx, ...prev]);

    setWithdrawAmount('');
    handleBack();
  };
  const [selectedCategory, setSelectedCategory] = useState<Category>('GAMES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string | null>(null);
  const [applicationDetails, setApplicationDetails] = useState({
    rank: '',
    platform: '',
    style: '',
    price: '',
    discount: ''
  });
  const [selectedEPal, setSelectedEPal] = useState<EPal | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(0);
  const [giftQuantity, setGiftQuantity] = useState(1);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [userCoins, setUserCoins] = useState(1250);
  const [userDiamonds, setUserDiamonds] = useState(1500);
  const [diamondTransactions, setDiamondTransactions] = useState<WalletTransaction[]>([
    { id: 'dt1', amount: 500, type: 'INCOME', description: 'Order #1234 Completion', timestamp: Date.now() - 86400000 },
    { id: 'dt2', amount: 1000, type: 'INCOME', description: 'Order #1235 Completion', timestamp: Date.now() - 172800000 },
  ]);
  const [userRole, setUserRole] = useState<'USER' | 'PLAYER'>('PLAYER');
  const [isPlayerOnline, setIsPlayerOnline] = useState(true);
  const [playerApplicationStatus, setPlayerApplicationStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'>('APPROVED');
  const [playerApplicationStep, setPlayerApplicationStep] = useState(1);
  const [isEditingService, setIsEditingService] = useState(false);
  const [playerApplicationData, setPlayerApplicationData] = useState({
    gameId: '',
    rank: '',
    mainPosition: '',
    server: '',
    platform: '',
    style: '',
    intro: '',
    screenshots: [] as string[],
    voiceUrl: '',
    coverUrl: '',
    coverIntro: '',
    services: [] as any[], // Array of { id, serviceName, price, unit, promotion }
  });

  const [editingPlaylinkId, setEditingPlaylinkId] = useState<string | null>(null);
  const [playlinkToDelete, setPlaylinkToDelete] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState({
    avatarUrl: EPALS[0].avatarUrl,
    name: EPALS[0].name,
    gender: EPALS[0].gender || 'Secret',
    birthday: '2000-01-01',
    region: EPALS[0].region || 'United States',
    bio: 'Gaming is life! 🎮 Let\'s climb together and have some fun in the Rift. ✨',
    email: 'alex.gamer@example.com',
    phone: '',
    linkedAccounts: {
      Discord: true,
      Google: false,
      Facebook: false,
      Apple: false,
    },
    album: [
      'https://picsum.photos/seed/album1/800/800',
      'https://picsum.photos/seed/album2/800/800',
      'https://picsum.photos/seed/album3/800/800',
    ] as string[]
  });

  const [tempProfile, setTempProfile] = useState(userProfile);
  
  // Account Binding States
  const [bindType, setBindType] = useState<'EMAIL' | 'PHONE' | null>(null);
  const [bindValue, setBindValue] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationStep, setVerificationStep] = useState<'VIEW' | 'INPUT' | 'VERIFY' | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showBindModal, setShowBindModal] = useState(false);

  // Handle resend code timer
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handleStartBind = (type: 'EMAIL' | 'PHONE', initialValue?: string) => {
    setBindType(type);
    if (initialValue) {
      setBindValue(initialValue);
      setVerificationStep('VIEW');
    } else {
      setBindValue('');
      setVerificationStep('INPUT');
    }
    setShowBindModal(true);
  };

  const handleSendCode = () => {
    if (!bindValue) return;
    setVerificationStep('VERIFY');
    setResendCooldown(60);
    setVerificationCode('');
  };

  const handleVerifyBind = () => {
    if (verificationCode.length !== 6) return;
    
    setUserProfile(prev => ({
      ...prev,
      [bindType === 'EMAIL' ? 'email' : 'phone']: bindValue
    }));
    
    setShowSubmissionToast({
      show: true,
      message: `Successfully bound ${bindType === 'EMAIL' ? 'email' : 'phone number'}`
    });
    setTimeout(() => setShowSubmissionToast({ show: false, message: '' }), 3000);

    setShowBindModal(false);
    setVerificationStep(null);
    setBindType(null);
    setBindValue('');
    setVerificationCode('');
  };

  const handleUnbind = (type: 'EMAIL' | 'PHONE') => {
    const isContactOccupied = (userProfile.email ? 1 : 0) + (userProfile.phone ? 1 : 0);
    const isThirdPartyOccupied = Object.values(userProfile.linkedAccounts).filter(Boolean).length;
    
    if (isContactOccupied + isThirdPartyOccupied <= 1) {
      alert(t('alertSecurityBinding'));
      return;
    }
    
    if (window.confirm(`${t('confirmUnlink')} ${type.toLowerCase()}?`)) {
      setUserProfile(prev => ({
        ...prev,
        [type === 'EMAIL' ? 'email' : 'phone']: ''
      }));
      setShowBindModal(false);
    }
  };

  const handleUpdatePassword = () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      alert(t('alertFillAllFields'));
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      alert(t('alertPasswordsNoMatch'));
      return;
    }
    if (passwordForm.new.length < 8) {
      alert(t('alertPasswordMinLength'));
      return;
    }

    setShowSubmissionToast({
      show: true,
      message: 'Password updated successfully'
    });
    setTimeout(() => setShowSubmissionToast({ show: false, message: '' }), 3000);
    
    setPasswordForm({ current: '', new: '', confirm: '' });
    handleBack();
  };

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState({
    serviceName: '',
    price: 0,
    unit: 'game',
    promotion: {
      type: 'NONE' as 'NONE' | 'FIRST_ORDER_DISCOUNT' | 'DISCOUNT' | 'BUY_X_GET_Y',
      value: 0,
      buyX: 0,
      getY: 0,
      limitType: 'NONE' as 'NONE' | 'TIME' | 'QUANTITY',
      startDate: '',
      endDate: '',
      limitValue: 0
    }
  });
  const [playerServices, setPlayerServices] = useState([
    { id: '1', name: 'League of Legends', coverName: 'Challenger Carry', coverUrl: 'https://picsum.photos/seed/lol-cover/400/600', voiceUrl: 'https://example.com/voice1.mp3', price: 5, unit: 'hr', rating: 4.9, reviews: 128, status: 'ONLINE', orders: 450 },
    { id: '2', name: 'Valorant', coverName: 'Radiant Duo', coverUrl: 'https://picsum.photos/seed/val-cover/400/600', voiceUrl: 'https://example.com/voice2.mp3', price: 8, unit: 'hr', rating: 5.0, reviews: 64, status: 'ONLINE', orders: 210 },
    { id: '3', name: 'CS2', coverName: 'Global Elite Boost', coverUrl: 'https://picsum.photos/seed/cs-cover/400/600', voiceUrl: 'https://example.com/voice3.mp3', price: 6, unit: 'hr', rating: 4.8, reviews: 32, status: 'OFFLINE', orders: 85 },
  ]);
  const [applyGameSearchQuery, setApplyGameSearchQuery] = useState('');
  const [showApplySelectionModal, setShowApplySelectionModal] = useState<{
    show: boolean;
    type: 'RANK' | 'MAIN' | 'SERVER' | 'PLATFORM' | 'NONE';
    options: string[];
    title: string;
  }>({
    show: false,
    type: 'NONE',
    options: [],
    title: ''
  });
  const [showGameSelectorModal, setShowGameSelectorModal] = useState(false);
  const [focusCommentInput, setFocusCommentInput] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentView === 'POST_DETAIL' && focusCommentInput && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [currentView, focusCommentInput, selectedPost?.id]);
  const [moreEPals, setMoreEPals] = useState<EPal[]>(EPALS.filter(e => !e.isLegend));
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playingEPalId, setPlayingEPalId] = useState<string | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<EPalServiceVariant | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([
    { id: '1', name: 'New User Discount', discount: 5, type: 'FIXED', minSpend: 10 },
    { id: '2', name: 'Weekend Special', discount: 10, type: 'PERCENTAGE', minSpend: 20 }
  ]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'Playlink' | 'Service' | 'Album' | 'Post'>('Service');
  const [selectedPlaylinkId, setSelectedPlaylinkId] = useState<string | null>(null);
  const [showPlaylinkModal, setShowPlaylinkModal] = useState(false);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [epalToUnfollow, setEpalToUnfollow] = useState<EPal | null>(null);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [reviewSortOrder, setReviewSortOrder] = useState<'DEFAULT' | 'NEWEST' | 'OLDEST' | 'RATING_HIGH' | 'RATING_LOW'>('DEFAULT');
  const [selectedReviewTag, setSelectedReviewTag] = useState<string | null>(null);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);
  const [showReviewFilterModal, setShowReviewFilterModal] = useState(false);
  const [imTab, setImTab] = useState<'MESSAGE' | 'ORDER' | 'FRIENDS'>('MESSAGE');
  const [imSearchQuery, setImSearchQuery] = useState('');
  const [walletTab, setWalletTab] = useState<'ALL' | 'RECHARGE' | 'ORDER'>('ALL');
  const [walletDate, setWalletDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedApplyGameCategory, setSelectedApplyGameCategory] = useState<string>('GAMES');
  const [epalSortBy, setEpalSortBy] = useState<'DEFAULT' | 'ORDERS' | 'SCORE'>('DEFAULT');
  const [epalFilters, setEpalFilters] = useState({
    status: 'ALL' as 'ALL' | 'ONLINE',
    gender: 'ALL' as 'ALL' | 'Male' | 'Female',
    priceRange: [0, 100] as [number, number],
    server: 'ALL' as string,
    platform: 'ALL' as string,
    rank: 'ALL' as string,
  });
  const [showEpalFilterModal, setShowEpalFilterModal] = useState(false);
  const [showRankSelectorModal, setShowRankSelectorModal] = useState(false);
  const [showServerSelectorModal, setShowServerSelectorModal] = useState(false);
  const [showPlatformSelectorModal, setShowPlatformSelectorModal] = useState(false);
  const [isImSearchExpanded, setIsImSearchExpanded] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    { id: '1', participantId: '1', lastMessage: 'Let\'s play tomorrow!', lastTimestamp: Date.now() - 1800000, unreadCount: 2 },
    { id: '2', participantId: '2', lastMessage: 'Nice sniper montage!', lastTimestamp: Date.now() - 3600000, unreadCount: 0 },
    { id: '3', participantId: '3', lastMessage: 'Looking for a duo?', lastTimestamp: Date.now() - 7200000, unreadCount: 1 },
  ]);
  const [imOrders, setImOrders] = useState<IMOrder[]>([
    { id: 'o1', epalId: '1', customerId: 'me', customerName: 'Alex', customerAvatar: 'https://picsum.photos/seed/me/100/100', serviceName: 'League of Legends', status: 'PENDING', price: 15, timestamp: Date.now() - 86400000, unit: 'Game', unitPrice: 15, quantity: 1 },
    { id: 'o2', epalId: '3', customerId: 'me', customerName: 'Alex', customerAvatar: 'https://picsum.photos/seed/me/100/100', serviceName: 'Valorant', status: 'COMPLETED', price: 24, timestamp: Date.now() - 172800000, endTime: Date.now() - 172800000 + 3600000, unit: 'Game', unitPrice: 12, quantity: 2 },
    { id: 'o3', epalId: 'me', customerId: '2', customerName: 'Sarah', customerAvatar: 'https://picsum.photos/seed/sarah/100/100', serviceName: 'League of Legends', status: 'COMPLETED', price: 20, timestamp: Date.now() - 43200000, unit: 'Game', unitPrice: 20, quantity: 1 },
  ]);
  const [myPlaylinks, setMyPlaylinks] = useState<Playlink[]>([
    {
      id: 'mypl1',
      gameName: 'League of Legends',
      nickname: 'Sogeryou#NA1',
      rank: 'Diamond',
      server: 'North America',
      platform: 'PC',
      posterUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop'
    }
  ]);
  const [showOngoingOrderWarning, setShowOngoingOrderWarning] = useState(false);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([
    { id: 'm0', senderId: '1', receiverId: 'me', content: 'Long time no see!', timestamp: Date.now() - 86400000 * 2, type: 'text' }, // 2 days ago
    { id: 'm1', senderId: '1', receiverId: 'me', content: 'Hello!', timestamp: Date.now() - 3600000, type: 'text' },
    { id: 'm2', senderId: 'me', receiverId: '1', content: 'Hi there!', timestamp: Date.now() - 3500000, type: 'text' },
    { id: 'm3', senderId: '1', receiverId: 'me', content: 'Want to play?', timestamp: Date.now() - 3400000, type: 'text' },
    { id: 'm4', senderId: 'me', receiverId: '1', content: 'Sure, let\'s go!', timestamp: Date.now() - 60000, type: 'text' }, // 1 min ago
  ]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<IMOrder | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [showImServiceCards, setShowImServiceCards] = useState(false);
  const [showImOrderCard, setShowImOrderCard] = useState(false);
  const [imDetailOrderTab, setImDetailOrderTab] = useState<'EPAL' | 'CUSTOMER'>('EPAL');
  const [imOrderTab, setImOrderTab] = useState<'EPAL' | 'CUSTOMER'>('EPAL');
  const [showImReportMenu, setShowImReportMenu] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const [walletStartDate, setWalletStartDate] = useState('');
  const [walletEndDate, setWalletEndDate] = useState('');
  const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
  const [isOrderSearchExpanded, setIsOrderSearchExpanded] = useState(false);

  useEffect(() => {
    if (showPlaylinkModal && selectedPlaylinkId) {
      setTimeout(() => {
        const element = document.getElementById(`pl-card-${selectedPlaylinkId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
        }
      }, 100);
    }
  }, [showPlaylinkModal, selectedPlaylinkId]);

  useEffect(() => {
    // Reset any service-related state if needed
    setShowServiceDetails(false);
  }, [activeServiceId]);

  const [orderTab, setOrderTab] = useState<'ALL' | 'PENDING' | 'ONGOING' | 'COMPLETED'>('ALL');
  const [userStatus, setUserStatus] = useState<'ONLINE' | 'OFFLINE' | 'PLAYING' | 'RESTING'>('ONLINE');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [viewHistory, setViewHistory] = useState<View[]>(['HOME']);
  const [contactsTab, setContactsTab] = useState<'FRIENDS' | 'FOLLOWING' | 'FOLLOWERS'>('FRIENDS');
  const [communityTab, setCommunityTab] = useState<'TRENDING' | 'LATEST' | 'FOLLOWING'>('TRENDING');
  const [showFullSearch, setShowFullSearch] = useState(false);
  const [fullSearchQuery, setFullSearchQuery] = useState('');
  const [fullSearchResults, setFullSearchResults] = useState<EPal[]>([]);
  const [exchangeAmount, setExchangeAmount] = useState<number | ''>('');
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');

  const [playerRanking, setPlayerRanking] = useState<PlayerRanking>({
    ...INITIAL_PLAYER_RANKING,
    lastUpdateTimestamp: Date.now()
  });

  const [showRankingRules, setShowRankingRules] = useState(false);
  const [rankingTab, setRankingTab] = useState<'ACTIVITY' | 'SERVICE'>('ACTIVITY');

  const calculateRankingScore = useCallback((stats: PlayerRanking['weeklyStats']) => {
    // Activity Score (Max 150)
    let activityScore = 0;
    activityScore += Math.min(stats.logins * 3, 15);
    activityScore += Math.min(stats.posts * 5, 15);
    activityScore += Math.min(stats.greetings * 2, 50);
    
    if (stats.responseRate >= 90) activityScore += 35;
    else if (stats.responseRate >= 75) activityScore += 20;
    else if (stats.responseRate >= 60) activityScore += 5;
    
    if (stats.acceptanceRate >= 90) activityScore += 35;
    else if (stats.acceptanceRate >= 75) activityScore += 20;
    else if (stats.acceptanceRate >= 60) activityScore += 5;
    
    // Service Score (Max 550)
    let serviceScore = 0;
    serviceScore += Math.min(stats.newUsersServed * 10, 100);
    serviceScore += Math.min(stats.repeatUsersServed * 5, 100);
    
    if (stats.totalStars >= 150) serviceScore += 50;
    else if (stats.totalStars >= 100) serviceScore += 30;
    else if (stats.totalStars >= 50) serviceScore += 10;
    else if (stats.totalStars >= 20) serviceScore += 5;
    
    serviceScore += Math.min(Math.floor(stats.giftIncome / 10) * 2, 100);
    serviceScore += Math.min(Math.floor(stats.totalIncome / 20) * 1, 200);
    
    return { activityScore, serviceScore };
  }, []);

  const getLevelConfig = useCallback((level: number) => {
    const configs: Record<number, { threshold: number, retain: number, incomeReq: number | null }> = {
      1: { threshold: 0, retain: 0, incomeReq: null },
      2: { threshold: 200, retain: 160, incomeReq: null },
      3: { threshold: 400, retain: 320, incomeReq: 300 },
      4: { threshold: 800, retain: 480, incomeReq: 800 },
      5: { threshold: 1500, retain: 1200, incomeReq: 1500 },
      6: { threshold: 2500, retain: 2000, incomeReq: 3000 },
    };
    return configs[level];
  }, []);

  const getLevelBenefits = useCallback((level: number) => {
    const benefits: Record<number, { priceRange: [number, number], exposure: string }> = {
      1: { priceRange: [20, 30], exposure: 'None' },
      2: { priceRange: [30, 40], exposure: '+5%' },
      3: { priceRange: [40, 60], exposure: '+15%' },
      4: { priceRange: [50, 80], exposure: '+30%' },
      5: { priceRange: [60, 100], exposure: '+50%' },
      6: { priceRange: [80, 150], exposure: '+100% + Featured' },
    };
    return benefits[level];
  }, []);

  useEffect(() => {
    const { activityScore, serviceScore } = calculateRankingScore(playerRanking.weeklyStats);
    setPlayerRanking(prev => ({
      ...prev,
      currentActivityScore: activityScore,
      currentServiceScore: serviceScore,
      totalWeeklyScore: activityScore + serviceScore
    }));
  }, [playerRanking.weeklyStats, calculateRankingScore]);

  const processWeeklyUpdate = useCallback(() => {
    setPlayerRanking(prev => {
      const { activityScore, serviceScore } = calculateRankingScore(prev.weeklyStats);
      let newScore = prev.score;
      
      // Apply Penalty
      if (prev.weeklyStats.totalIncome === 0) {
        const penaltyWeeks = prev.weeklyStats.noOrderWeeks + 1;
        const penalties = [50, 100, 150, 200];
        const penalty = penalties[Math.min(penaltyWeeks - 1, 3)];
        newScore -= penalty;
      }

      // Apply Decay
      const decayRate = prev.weeklyStats.totalIncome >= 1000 ? 0.97 : 0.94;
      newScore = Math.floor(newScore * decayRate);
      
      // Add Weekly Score
      newScore += (activityScore + serviceScore);
      newScore = Math.max(0, newScore);

      // Determine Level
      let newLevel = prev.level;
      
      // Check for Downgrade
      const currentConfig = getLevelConfig(prev.level);
      if (newScore < currentConfig.retain && prev.level > 1) {
        newLevel = prev.level - 1;
      }

      // Check for Upgrade
      const nextConfig = getLevelConfig(prev.level + 1);
      if (nextConfig && newScore >= nextConfig.threshold) {
        // Anti-abuse: check income requirement
        if (nextConfig.incomeReq === null || prev.weeklyStats.totalIncome >= nextConfig.incomeReq) {
          newLevel = prev.level + 1;
        }
      }

      // L1 consecutive weeks check
      let consecutiveL1 = prev.weeklyStats.consecutiveL1Weeks;
      if (newLevel === 1) {
        consecutiveL1 += 1;
      } else {
        consecutiveL1 = 0;
      }

      let newStatus = prev.status;
      if (consecutiveL1 >= 4) {
        newStatus = 'SUSPENDED';
      }

      const finalConfig = getLevelConfig(newLevel);
      const nextLevelConfig = getLevelConfig(newLevel + 1);

      return {
        ...prev,
        level: newLevel,
        score: newScore,
        status: newStatus,
        retainThreshold: finalConfig.retain,
        nextLevelThreshold: nextLevelConfig ? nextLevelConfig.threshold : null,
        weeklyIncomeRequirement: nextLevelConfig ? nextLevelConfig.incomeReq : null,
        weeklyStats: {
          ...prev.weeklyStats,
          noOrderWeeks: prev.weeklyStats.totalIncome === 0 ? prev.weeklyStats.noOrderWeeks + 1 : 0,
          consecutiveL1Weeks: consecutiveL1,
          // Reset weekly stats
          logins: 0,
          posts: 0,
          greetings: 0,
          newUsersServed: 0,
          repeatUsersServed: 0,
          giftIncome: 0,
          totalIncome: 0,
        },
        lastUpdateTimestamp: Date.now()
      };
    });
  }, [calculateRankingScore, getLevelConfig]);

  const [isScrolling, setIsScrolling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [followedEPals, setFollowedEPals] = useState<Set<string>>(new Set());
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [blockedMeUsers, setBlockedMeUsers] = useState<Set<string>>(new Set(['5'])); // User 5 blocked me for demo
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportContext, setReportContext] = useState<ReportContext>('USER');
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isUnblockConfirmOpen, setIsUnblockConfirmOpen] = useState(false);
  const [isClearCacheConfirmOpen, setIsClearCacheConfirmOpen] = useState(false);
  const [userToUnblock, setUserToUnblock] = useState<string | null>(null);
  const [isProfileMoreOpen, setIsProfileMoreOpen] = useState(false);
  const [showSubmissionToast, setShowSubmissionToast] = useState<{ show: boolean; message: string; subtext?: string }>({ show: false, message: '' });
  const [showPlaylinkSelection, setShowPlaylinkSelection] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'ORDER' | 'SOCIAL' | 'SYSTEM'>('ORDER');
  const [isMarkReadConfirmOpen, setIsMarkReadConfirmOpen] = useState(false);
  const [feedbackTime, setFeedbackTime] = useState('');
  const [datePickerTarget, setDatePickerTarget] = useState<{
    id: string;
    value: string;
    title: string;
  } | null>(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 'notif-1', title: 'Order Accepted', content: 'Your order for League of Legends has been accepted by Player123.', time: '2 mins ago', timestamp: Date.now() - 120000, type: 'ORDER', unread: true, orderId: 'o1' },
    { id: 'notif-2', title: 'New Follower', content: 'Player789 started following you.', time: '15 mins ago', timestamp: Date.now() - 900000, type: 'SOCIAL', unread: true },
    { id: 'notif-3', title: 'Recharge Successful', content: 'Your recharge of 100 Coins has been confirmed.', time: '1 hour ago', timestamp: Date.now() - 3600000, type: 'SYSTEM', unread: false },
    { id: 'notif-4', title: 'New Message', content: 'Player456 sent you a message.', time: '3 hours ago', timestamp: Date.now() - 10800000, type: 'SOCIAL', unread: false },
    { id: 'notif-5', title: 'System Update', content: 'New features added to the platform! Check them out.', time: '1 day ago', timestamp: Date.now() - 86400000, type: 'SYSTEM', unread: false },
    { id: 'notif-6', title: 'Payment Received', content: 'You received 50 Coins from an order.', time: '2 days ago', timestamp: Date.now() - 172800000, type: 'ORDER', unread: false, orderId: 'o2' },
  ]);
  const followersOfMe = useMemo(() => new Set(['1', '2', '3', '5']), []); // Mock users who follow me
  const mutualFollowers = useMemo(() => {
    return EPALS.filter(epal => followedEPals.has(epal.id) && followersOfMe.has(epal.id));
  }, [followedEPals, followersOfMe]);

  const [allPosts, setAllPosts] = useState<Post[]>(POSTS);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showPostCategorySelector, setShowPostCategorySelector] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [newPostGame, setNewPostGame] = useState<Game | null>(null);

  const filteredPosts = useMemo(() => {
    let posts = [...allPosts];
    if (selectedGame) {
      posts = posts.filter(post => post.gameId === selectedGame.id);
    }

    switch (communityTab) {
      case 'TRENDING':
        return posts.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
      case 'LATEST':
        return posts.sort((a, b) => b.timestamp - a.timestamp);
      case 'FOLLOWING':
        return posts.filter(post => followedEPals.has(post.userId));
      default:
        return posts;
    }
  }, [communityTab, selectedGame, followedEPals, allPosts]);

  const toggleFollow = (id: string) => {
    if (isInteractionBlocked(id)) return;
    if (followedEPals.has(id)) {
      // Show confirmation modal
      const epal = EPALS.find(e => e.id === id);
      if (epal) {
        setEpalToUnfollow(epal);
        setShowUnfollowModal(true);
      }
      return;
    }

    setFollowedEPals(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const confirmUnfollow = () => {
    if (epalToUnfollow) {
      setFollowedEPals(prev => {
        const next = new Set(prev);
        next.delete(epalToUnfollow.id);
        return next;
      });
      setShowUnfollowModal(false);
      setEpalToUnfollow(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 1500); // Hide after 1.5 seconds of no scrolling
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentView === 'HOME') {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, currentView]);

  const legendEPals = useMemo(() => EPALS.filter(e => e.isLegend).slice(0, 10), []);

  const navigateTo = (view: View, data?: any) => {
    // Reset focus state on every navigation unless explicitly requested for POST_DETAIL
    setFocusCommentInput(false);
    setShowImServiceCards(false);

    if (view !== 'IM') {
      setIsImSearchExpanded(false);
      setImSearchQuery('');
    }

    if (view === 'COMMUNITY') setSelectedGame(data || null);
    if (view === 'POST_DETAIL') {
      setSelectedPost(data.post);
      setFocusCommentInput(data.focusInput || false);
    }
    if (view === 'GAME_DETAIL') setSelectedGame(data);
    if (view === 'PROFILE') {
      setSelectedEPal(data);
      if (data.services && data.services.length > 0) {
        setActiveServiceId(data.services[0].id);
      } else {
        setActiveServiceId(null);
      }
    }
    if (view === 'ORDER_CONFIRM') {
      const epal = data?.epal || selectedEPal;
      if (epal) {
        const hasOngoingOrder = imOrders.some(order => 
          order.epalId === epal.id && 
          order.status !== 'COMPLETED' && 
          order.status !== 'CANCELLED'
        );
        if (hasOngoingOrder) {
          setShowOngoingOrderWarning(true);
          return;
        }
      }
      if (data?.epal) setSelectedEPal(data.epal);
      if (data?.variant) setSelectedVariant(data.variant);
      setOrderQuantity(1);
      setSelectedCoupon(null);
    }
    
    if (view === 'ALL_REVIEWS') {
      setSelectedEPal(data.epal);
      setReviewSortOrder('DEFAULT');
      setSelectedReviewTag(null);
      setSelectedRatingFilter(null);
      setShowReviewFilterModal(false);
    }

    if (view === 'IM_DETAIL') {
      setSelectedEPal(data);
      // Reset messages for the selected EPal (mock)
      setCurrentMessages([
        { id: `m0-${data.id}`, senderId: data.id, receiverId: 'me', content: 'Long time no see!', timestamp: Date.now() - 86400000 * 2, type: 'text' }, // 2 days ago
        { id: `m1-${data.id}`, senderId: data.id, receiverId: 'me', content: `Hello! I'm ${data.name}`, timestamp: Date.now() - 3600000, type: 'text' },
        { id: `m2-${data.id}`, senderId: 'me', receiverId: data.id, content: 'Hi there!', timestamp: Date.now() - 3500000, type: 'text' },
        { id: `m3-${data.id}`, senderId: data.id, receiverId: 'me', content: 'Want to play?', timestamp: Date.now() - 3400000, type: 'text' },
        { id: `m4-${data.id}`, senderId: 'me', receiverId: data.id, content: 'Sure, let\'s go!', timestamp: Date.now() - 60000, type: 'text' }, // 1 min ago
      ]);
    }
    
    if (view === 'SETTINGS_EDIT_PROFILE') {
      setTempProfile({ ...userProfile });
    }

    if (view === 'FEEDBACK') {
      setFeedbackTime('');
    }

    if (view === 'HOME' || view === 'ME' || view === 'COMMUNITY' || view === 'IM') {
      setViewHistory([view]);
    } else {
      setViewHistory(prev => {
        // Don't push if it's the same as the current view
        if (prev[prev.length - 1] === view) return prev;
        return [...prev, view];
      });
    }
    setCurrentView(view);
    window.scrollTo(0, 0);
  };


  const handleCreatePost = () => {
    if (!newPostContent.trim() && postImages.length === 0) return;
    if (!newPostGame) return; // Category selection required

    const newPost: Post = {
      id: `p-new-${Date.now()}`,
      userId: 'me',
      userName: userProfile.name,
      userAvatar: userProfile.avatarUrl,
      content: newPostContent,
      images: postImages.length > 0 ? [...postImages] : undefined,
      likes: 0,
      comments: 0,
      timestamp: Date.now(),
      gameId: newPostGame.id,
      gameName: newPostGame.name
    };
    setAllPosts(prev => [newPost, ...prev]);
    setNewPostContent('');
    setPostImages([]);
    setNewPostGame(null);
    setShowCreatePost(false);
  };

  const handleBack = () => {
    // Reset focus state when going back
    setFocusCommentInput(false);
    setShowImServiceCards(false);
    setShowPlaylinkSelection(false);

    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop(); // Remove current view
      const previousView = newHistory[newHistory.length - 1];
      setViewHistory(newHistory);
      setCurrentView(previousView);
      window.scrollTo(0, 0);
    } else {
      setCurrentView('HOME');
      setViewHistory(['HOME']);
    }
  };

  const isInteractionBlocked = (targetId: string) => {
    if (blockedUsers.has(targetId)) {
      setShowSubmissionToast({
        show: true,
        message: 'Interaction Failed',
        subtext: 'You have blocked this user'
      });
      setTimeout(() => setShowSubmissionToast({ show: false, message: '' }), 1500);
      return true;
    }
    if (blockedMeUsers.has(targetId)) {
      setShowSubmissionToast({
        show: true,
        message: 'Interaction Failed',
        subtext: 'The user has blocked you'
      });
      setTimeout(() => setShowSubmissionToast({ show: false, message: '' }), 1500);
      return true;
    }
    return false;
  };

  const handleBlockUser = (userId: string) => {
    setBlockedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        setShowSubmissionToast({
          show: true,
          message: 'User Unblocked',
          subtext: 'You can now receive messages from this user again'
        });
      } else {
        next.add(userId);
        setShowSubmissionToast({
          show: true,
          message: 'User Blocked',
          subtext: 'You will no longer receive any messages from this user'
        });
      }
      return next;
    });
    setIsBlockConfirmOpen(false);
    setTimeout(() => {
      setShowSubmissionToast({ show: false, message: '' });
    }, 1000);
  };

  const handleReportSubmit = (report: { type: ReportType; description: string; images: string[] }) => {
    const ticketId = Math.random().toString(36).substring(7).toUpperCase();
    
    setIsReportModalOpen(false);
    setShowSubmissionToast({
      show: true,
      message: 'Report Submitted',
      subtext: `Ticket: T-${ticketId} | Status: Pending`
    });

    setTimeout(() => {
      setShowSubmissionToast({ show: false, message: '' });
    }, 1000);
  };

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      const newItems = EPALS.filter(e => !e.isLegend).map(e => ({ 
        ...e, 
        id: `${e.id}-more-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }));
      setMoreEPals(prev => [...prev, ...newItems]);
      setLoadingMore(false);
    }, 1000);
  };

  const toggleFavorite = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  const handlePlayToggle = (epalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingEPalId === epalId) {
      setPlayingEPalId(null);
    } else {
      setPlayingEPalId(epalId);
      // Auto stop after 5 seconds to simulate audio length
      setTimeout(() => {
        setPlayingEPalId(current => current === epalId ? null : current);
      }, 5000);
    }
  };

  const allSortedGames = useMemo(() => {
    return [...GAMES].sort((a, b) => a.name.localeCompare(b.name));
  }, []);


  // Filter EPals for the Chilling tab
  const favoritedGames = useMemo(() => {
    return allSortedGames.filter(g => favorites.includes(g.id));
  }, [allSortedGames, favorites]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      const headerOffset = 180;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const groupedGames = useMemo<{ [key: string]: Game[] } | null>(() => {
    if (selectedCategory !== 'GAMES') return null;
    const groups: { [key: string]: Game[] } = {};
    GAMES.filter(g => 
      g.category === 'GAMES' && 
      (searchQuery === '' || g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ).forEach(game => {
      const letter = game.name.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(game);
    });
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key].sort((a, b) => a.name.localeCompare(b.name));
      return acc;
    }, {} as { [key: string]: Game[] });
  }, [selectedCategory, searchQuery]);

  return (
    <div
      dir={LANGUAGES_DATA[selectedLanguage].dir}
      lang={selectedLanguage === 'Arabic' ? 'ar' : selectedLanguage === 'Turkish' ? 'tr' : 'en'}
      className={`app-shell min-h-screen text-[#f6f1e6] font-sans selection:bg-emerald-500/30 antialiased ${selectedLanguage === 'Arabic' ? 'text-start' : 'text-left'}`}
    >
      {/* Header */}
      {['HOME', 'COMMUNITY', 'IM', 'ME', 'COMMUNITY_SELECTOR'].includes(currentView) && (
        <header className="app-header sticky top-0 z-50 backdrop-blur-xl px-5 py-3.5 flex items-center justify-between border-b border-white/[0.06]">
          {currentView === 'HOME' ? (
            <>
              <div className="flex-1 max-w-xs">
                <button 
                  onClick={() => setShowFullSearch(true)}
                  className="w-full min-h-12 flex items-center bg-white/[0.065] rounded-2xl px-4 py-2 border border-white/10 hover:border-emerald-400/45 transition-all text-start shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="ms-2 text-sm text-gray-500">{t('search')}</span>
                </button>
              </div>
              <button className="ms-4 size-11 text-amber-300 hover:bg-amber-400/10 rounded-2xl transition-colors flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4 w-full">
              {viewHistory.length > 1 && (
                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full">
                  <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                </button>
              )}
              <h2 className={`text-lg font-bold flex-1 min-w-0 ${viewHistory.length === 1 ? 'text-center' : ''}`}>
                 {currentView === 'COMMUNITY' ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
                      <button
                        onClick={() => setSelectedGame(null)}
                      className={`min-h-10 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          selectedGame === null ? 'bg-emerald-600 text-white shadow-[0_8px_20px_rgba(16,185,129,0.18)]' : 'text-gray-400'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        All
                      </button>
                      {GAMES.slice(0, 4).map(game => (
                        <button
                          key={`apply-game-btn-${game.id}`}
                          onClick={() => setSelectedGame(game)}
                          className={`min-h-10 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                            selectedGame?.id === game.id ? 'bg-emerald-600 text-white shadow-[0_8px_20px_rgba(16,185,129,0.18)]' : 'text-gray-400'
                          }`}
                        >
                          {game.name}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => navigateTo('COMMUNITY_SELECTOR')}
                      className="p-1.5 bg-white/5 rounded-full text-gray-400 shrink-0 ml-2"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                ) : currentView === 'IM' ? (
                  <div className="flex items-center justify-between w-full">
                    <span>{t('messagesTitle')}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowFullSearch(true)} className="p-2 hover:bg-white/10 rounded-full">
                        <Search className="w-5 h-5" />
                      </button>
                      <button onClick={() => navigateTo('CONTACTS')} className="p-2 hover:bg-white/10 rounded-full">
                        <Users className="w-5 h-5" />
                      </button>
                      <button onClick={() => navigateTo('NOTIFICATIONS')} className="p-2 hover:bg-white/10 rounded-full">
                        <Bell className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : currentView === 'ME' ? (
                  t('me')
                ) : currentView === 'COMMUNITY_SELECTOR' ? (
                  t('selectCommunity')
                ) : null}
              </h2>
            </div>
          )}
        </header>
      )}

      <main className="pb-20">
        {/* Full-screen Search Modal */}
      <AnimatePresence>
        {showFullSearch && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[200] bg-[#07110f] flex flex-col"
          >
            {/* Search Header */}
            <div className="px-6 py-4 flex items-center gap-4 border-b border-white/5">
              <button 
                onClick={() => {
                  setShowFullSearch(false);
                  setFullSearchQuery('');
                  setFullSearchResults([]);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  autoFocus
                  type="text"
                  placeholder={t('phSearchByIdOrName')}
                  value={fullSearchQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setFullSearchQuery(query);
                    if (query.trim()) {
                      const results = EPALS.filter(epal => 
                        epal.id.toLowerCase().includes(query.toLowerCase()) || 
                        epal.name.toLowerCase().includes(query.toLowerCase())
                      );
                      setFullSearchResults(results);
                    } else {
                      setFullSearchResults([]);
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-6 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {fullSearchQuery.trim() === '' ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                    <Search className="w-10 h-10 text-gray-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 font-bold">{t('searchForEPals')}</p>
                    <p className="text-xs text-gray-600">Enter an ID or nickname to find someone</p>
                  </div>
                </div>
              ) : fullSearchResults.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <p className="text-gray-500 font-bold">No results found for "{fullSearchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Search Results</p>
                  <div className="space-y-4">
                    {fullSearchResults.map(epal => {
                      const session = currentView === 'IM' ? chatSessions.find(s => s.participantId === epal.id) : null;
                      
                      return (
                          <div 
                            key={`search-result-epal-${epal.id}`}
                            onClick={() => {
                              setShowFullSearch(false);
                              if (currentView === 'IM') {
                                navigateTo('IM_DETAIL', epal);
                              } else {
                                navigateTo('PROFILE', epal);
                              }
                            }}
                            className="flex items-center gap-4 p-2 hover:bg-white/5 transition-all cursor-pointer rounded-xl"
                          >
                            <img src={epal.avatarUrl} className="w-14 h-14 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white truncate">{epal.name}</h4>
                              {session ? (
                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                  <p className="text-[11px] text-gray-500 truncate flex-1">{session.lastMessage}</p>
                                  <span className="text-[9px] text-gray-700 shrink-0">{formatChatMessageTime(session.lastTimestamp)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-500 font-mono">ID: {epal.id}</span>
                                  <span className="text-gray-700 text-[10px]">•</span>
                                  <span className="text-[10px] text-emerald-400 font-bold">{epal.game}</span>
                                </div>
                              )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-700" />
                          </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
          {currentView === 'HOME' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-5 sm:px-6 space-y-8"
            >
              {/* Category Buttons */}
              <section className="pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <IconButton 
                    icon={Star} 
                    label={t('favorite')} 
                    onClick={() => {
                      setSelectedCategory('FAVOURITE');
                      navigateTo('CATEGORY_SERVICES');
                    }} 
                  />
                  <IconButton 
                    icon={Gamepad2} 
                    label={t('games')} 
                    onClick={() => {
                      setSelectedCategory('GAMES');
                      navigateTo('CATEGORY_SERVICES');
                    }} 
                  />
                  <IconButton 
                    icon={Coffee} 
                    label={t('chilling')} 
                    onClick={() => {
                      setSelectedCategory('CHILLING');
                      navigateTo('CATEGORY_SERVICES');
                    }} 
                  />
                </div>
              </section>

              {/* Trending Realms */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold tracking-tight">{t('trendingRealms')}</h3>
                  <button 
                    onClick={() => {
                      setSelectedCategory('GAMES');
                      navigateTo('CATEGORY_SERVICES');
                    }} 
                    className="text-xs text-emerald-300 font-bold"
                  >
                    {t('viewAll')}
                  </button>
                </div>
                <div 
                  className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x"
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    if (target.scrollLeft + target.offsetWidth >= target.scrollWidth - 10) {
                      setTimeout(() => {
                        setSelectedCategory('GAMES');
                        navigateTo('CATEGORY_SERVICES');
                      }, 100);
                    }
                  }}
                >
                      {GAMES.slice(0, 8).map(game => (
                        <div 
                          key={`trending-game-v2-${game.id}`}
                          onClick={() => navigateTo('GAME_DETAIL', game)}
                          className="relative min-w-[180px] h-44 rounded-[1.25rem] overflow-hidden group cursor-pointer snap-start tap-card border border-white/[0.06]"
                        >
                      <img 
                        src={game.imageUrl} 
                        alt={game.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end">
                        <span className="font-bold text-white">{game.name}</span>
                        <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">{game.onlineCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Legend ePals */}
              <section className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">{t('legendEPals')}</h3>
                  </div>
                  <button onClick={() => navigateTo('LEGEND_LIST')} className="text-sm font-bold text-emerald-300 flex items-center gap-1">
                    {t('viewAll')} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>

                <div 
                  className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x"
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    if (target.scrollLeft + target.offsetWidth >= target.scrollWidth - 10) {
                      setTimeout(() => navigateTo('LEGEND_LIST'), 100);
                    }
                  }}
                >
                    <div className="grid grid-rows-2 grid-flow-col gap-4">
                      {legendEPals.map(epal => (
                        <div key={`legend-epal-home-${epal.id}`} className="w-[280px] snap-start">
                          <LegendEPalCard 
                            epal={epal} 
                            onProfileClick={() => navigateTo('PROFILE', epal)}
                            isPlaying={playingEPalId === epal.id}
                            onPlayToggle={(e) => handlePlayToggle(epal.id, e)}
                            className="w-[280px]"
                          />
                        </div>
                      ))}
                    </div>
                </div>
              </section>

              {/* New EPals Entrance */}
              <section className="mb-8">
                <div 
                  onClick={() => navigateTo('NEW_EPALS_LIST')}
                  className="relative h-[180px] rounded-[32px] overflow-hidden group cursor-pointer border border-white/10 shadow-2xl transition-all active:scale-95 mx-6"
                >
                  <img 
                    src={EPALS.find(e => !e.isLegend)?.avatarUrl || 'https://picsum.photos/seed/new/400/400'} 
                    alt="New EPals" 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f071a] via-[#0f071a]/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-1">
                      <h3 className="text-3xl font-black text-white italic tracking-tighter shadow-2xl group-hover:scale-110 transition-transform">{t('newEPals')}</h3>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Recently Joined</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* More ePals */}
              <section className="space-y-6">
                <h3 className="text-xl font-bold tracking-tight">{t('moreEPals')}</h3>
                <div className="space-y-4">
                  {moreEPals.map(epal => {
                    const badgeText = epal.game;
                    
                    return (
                      <EPalCard 
                        key={`more-epal-view-card-${epal.id}`} 
                        epal={epal} 
                        onProfileClick={() => navigateTo('PROFILE', epal)}
                        onOrderClick={() => navigateTo('ORDER_CONFIRM', { epal })}
                        isPlaying={playingEPalId === epal.id}
                        onPlayToggle={(e) => handlePlayToggle(epal.id, e)}
                        badgeText={badgeText}
                        showTags={true}
                      />
                    );
                  })}
                </div>
                
                {/* Sentinel for infinite scroll */}
                <div ref={lastElementRef} className="h-20 flex items-center justify-center">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-gray-500 font-bold">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>{t('loadingMore')}</span>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {currentView === 'COMMUNITY_SELECTOR' && (
            <motion.div
              key="community_selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-6 pt-6 pb-24"
            >
              <div className="space-y-8">
                {Object.entries(
                  GAMES.reduce((acc, game) => {
                    const letter = game.name[0].toUpperCase();
                    if (!acc[letter]) acc[letter] = [];
                    acc[letter].push(game);
                    return acc;
                  }, {} as { [key: string]: Game[] })
                ).sort(([a], [b]) => a.localeCompare(b)).map(([letter, games]) => (
                  <div key={`community-selector-letter-${letter}`} className="space-y-4">
                    <div className="text-emerald-400 font-bold text-lg border-b border-white/10 pb-2">{letter}</div>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                      {games.sort((a, b) => a.name.localeCompare(b.name)).map(game => (
                        <button
                          key={`community-selector-game-${game.id}`}
                          onClick={() => {
                            setSelectedGame(game);
                            navigateTo('COMMUNITY');
                          }}
                          className="flex flex-col gap-2 transition-all text-center group"
                        >
                          <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg border border-white/5">
                            <img 
                              src={game.imageUrl} 
                              alt={game.name} 
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="font-bold text-white text-[11px] truncate px-1">{game.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {currentView === 'COMMUNITY' && (
            <motion.div 
              key="community"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-0"
            >
              {/* Community Tabs */}
              <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md border-b border-white/5">
                <div className="flex px-6">
                  {[
                    { id: 'TRENDING', label: t('trending') },
                    { id: 'LATEST', label: t('latest') },
                    { id: 'FOLLOWING', label: t('following') }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCommunityTab(tab.id as any)}
                      className={`flex-1 py-4 text-sm font-bold transition-all relative ${
                        communityTab === tab.id ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                      {communityTab === tab.id && (
                        <motion.div 
                          layoutId="communityTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Posts List - Seamless Style */}
              <div className="divide-y divide-white/5 pb-24">
                {filteredPosts.length > 0 ? (
                  filteredPosts.map(post => (
                    <div 
                      key={`community-post-${post.id}`} 
                      onClick={() => navigateTo('POST_DETAIL', { post })}
                      className="bg-transparent hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Post Header */}
                      <div className="p-6 flex items-center justify-between">
                        <div 
                          className="flex items-center gap-4 cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            const epal = EPALS.find(ep => ep.id === post.userId);
                            if (epal) navigateTo('PROFILE', epal);
                          }}
                        >
                          <img 
                            src={post.userAvatar} 
                            alt={post.userName} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-white/10 group-hover:border-emerald-500/50 transition-all"
                            referrerPolicy="no-referrer"
                          />
                          <div className="space-y-0.5">
                            <div className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors">{post.userName}</div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                              <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                              {post.gameName && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-700" />
                                  <span className="text-emerald-400/80">{post.gameName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFollow(post.userId);
                          }}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                            followedEPals.has(post.userId) 
                              ? 'bg-white/10 text-gray-400' 
                              : 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          }`}
                        >
                          {followedEPals.has(post.userId) ? t('following') : t('follow')}
                        </button>
                      </div>

                      {/* Post Content */}
                      <div className="px-6 pb-4 space-y-4">
                        <p className="text-base text-gray-200 leading-relaxed">{post.content}</p>
                        <PostImageGrid images={post.images || []} postId={post.id} />
                      </div>

                      {/* Post Actions */}
                      <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isInteractionBlocked(post.userId)) return;
                              // Handle like logic
                            }}
                            className={`flex items-center gap-2 transition-colors ${post.isLiked ? 'text-emerald-400' : 'text-gray-400 hover:text-white'}`}
                          >
                            <ThumbsUp className={`w-6 h-6 ${post.isLiked ? 'fill-current' : ''}`} />
                            <span className="text-sm font-bold">{post.likes}</span>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isInteractionBlocked(post.userId)) return;
                              navigateTo('POST_DETAIL', { post, focusInput: true });
                            }}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                          >
                            <MessageSquare className="w-6 h-6" />
                            <span className="text-sm font-bold">{post.comments}</span>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isInteractionBlocked(post.userId)) return;
                              setShowGiftPanel(true);
                            }}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                          >
                            <Gift className="w-6 h-6" />
                            <span className="text-sm font-bold">Gift</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation();
                              setReportContext('POST');
                              setIsReportModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Flag className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                      <Globe className="w-10 h-10 text-gray-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-white font-bold">No posts found</h3>
                      <p className="text-gray-500 text-sm">
                        {communityTab === 'FOLLOWING' 
                          ? "You haven't followed anyone yet or they haven't posted." 
                          : "Try exploring other tabs or categories."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Action Button */}
              <div className="fixed bottom-24 right-6 z-[60]">
                <button
                  onClick={() => {
                    setShowPostCategorySelector(true);
                  }}
                  className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-90 transition-all border-2 border-white/10"
                >
                  <Plus className="w-8 h-8" />
                </button>
              </div>
            </motion.div>
          )}

          {currentView === 'CATEGORY_SERVICES' && (
            <motion.div 
              key="category_services"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20"
            >
              {/* Header */}
              <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md border-b border-white/5">
                <div className="px-6 py-4 flex items-center gap-4">
                  <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                  </button>
                  <h2 className="text-lg font-bold">{t('service')}s</h2>
                </div>
                
                <div className="flex px-6 border-b border-white/5">
                  {[
                    { id: 'FAVOURITE', label: 'Favorite' },
                    { id: 'GAMES', label: 'Games' },
                    { id: 'CHILLING', label: 'Chilling' }
                  ].map(tab => (
                    <button
                      key={`category-service-tab-${tab.id}`}
                      onClick={() => setSelectedCategory(tab.id as Category)}
                      className={`flex-1 py-3 text-sm font-bold transition-all relative ${
                        selectedCategory === tab.id ? 'text-emerald-400' : 'text-gray-500'
                      }`}
                    >
                      {tab.label}
                      {selectedCategory === tab.id && (
                        <motion.div 
                          layoutId="activeCategoryTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6 space-y-6">
                {selectedCategory === 'GAMES' && groupedGames ? (
                <div className="space-y-8 pt-4">
                  {Object.keys(groupedGames).length > 0 ? (
                    Object.entries(groupedGames as { [key: string]: Game[] }).map(([letter, games]) => (
                      <div key={`category-letter-section-${letter}`} id={`letter-${letter}`} className="space-y-4">
                        <h3 className="text-xl font-bold text-emerald-400 border-b border-white/5 pb-2">{letter}</h3>
                        <div className="grid grid-cols-3 gap-4">
                          {games.map(game => (
                            <GameGridItem 
                              key={`category-game-${game.id}`}
                              game={game}
                              isFavorite={favorites.includes(game.id)}
                              onToggleFavorite={(e) => toggleFavorite(game.id, e)}
                              onClick={() => navigateTo('GAME_DETAIL', game)}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                      <Search className="w-12 h-12 opacity-20" />
                      <p className="font-bold">No games found for "{searchQuery}"</p>
                    </div>
                  )}
                  
                  {/* Alphabet Sidebar */}
                  {Object.keys(groupedGames).length > 0 && (
                    <motion.div 
                      animate={{ opacity: isScrolling ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-50 py-4 bg-black/20 backdrop-blur-sm rounded-full border border-white/5"
                    >
                      {Object.keys(groupedGames).map(letter => (
                        <button 
                          key={`category-alphabet-${letter}`}
                          onClick={() => scrollToLetter(letter)}
                          className="text-[10px] font-bold text-gray-500 hover:text-emerald-400 transition-colors px-2 py-0.5"
                        >
                          {letter}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 pt-4">
                  {(() => {
                    const filtered = (selectedCategory === 'FAVOURITE' 
                      ? GAMES.filter(g => favorites.includes(g.id))
                      : GAMES.filter(g => g.category === selectedCategory)
                    ).filter(g => 
                      searchQuery === '' || g.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                          {selectedCategory === 'FAVOURITE' && searchQuery === '' ? (
                            <>
                              <Star className="w-12 h-12 opacity-20" />
                              <p className="font-bold">No favorites yet</p>
                            </>
                          ) : (
                            <>
                              <Search className="w-12 h-12 opacity-20" />
                              <p className="font-bold">No results found {searchQuery && `for "${searchQuery}"`}</p>
                            </>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 gap-4">
                        {filtered.map(game => (
                          <GameGridItem 
                            key={`category-service-game-${game.id}`}
                            game={game}
                            isFavorite={favorites.includes(game.id)}
                            onToggleFavorite={(e) => toggleFavorite(game.id, e)}
                            onClick={() => navigateTo('GAME_DETAIL', game)}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
              </div>
            </motion.div>
          )}

          {currentView === 'POST_DETAIL' && selectedPost && (
            <motion.div 
              key={`post_detail_${selectedPost.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20"
            >
              {/* Header */}
              <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-white/5">
                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                </button>
                <h2 className="text-lg font-bold">Post Detail</h2>
              </div>

              {/* Original Post */}
              <div className="p-6 space-y-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => {
                    const epal = EPALS.find(ep => ep.id === selectedPost.userId);
                    if (epal) navigateTo('PROFILE', epal);
                  }}
                >
                  <img 
                    src={selectedPost.userAvatar} 
                    alt={selectedPost.userName} 
                    className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:border-emerald-500/50 transition-all"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors">{selectedPost.userName}</div>
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                      {new Date(selectedPost.timestamp).toLocaleDateString()}
                      {selectedPost.gameName && ` • ${selectedPost.gameName}`}
                    </div>
                  </div>
                </div>
                <p className="text-base text-gray-200 leading-relaxed">{selectedPost.content}</p>
                <PostImageGrid images={selectedPost.images || []} postId={selectedPost.id} />

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-8">
                        <button className={`flex items-center gap-2 transition-colors ${selectedPost.isLiked ? 'text-emerald-400' : 'text-gray-400 hover:text-white'}`}>
                          <ThumbsUp className={`w-6 h-6 ${selectedPost.isLiked ? 'fill-current' : ''}`} />
                          <span className="text-sm font-bold">{selectedPost.likes}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                          <MessageSquare className="w-6 h-6" />
                          <span className="text-sm font-bold">{selectedPost.comments}</span>
                        </button>
                        <button onClick={() => setShowGiftPanel(true)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                          <Gift className="w-6 h-6" />
                          <span className="text-sm font-bold">Gift</span>
                        </button>
                      </div>
                      <button 
                        onClick={() => {
                          setReportContext('POST');
                          setIsReportModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Flag className="w-6 h-6" />
                      </button>
                    </div>
              </div>

              {/* Author's Services - Horizontal Scroll */}
              {(() => {
                const author = EPALS.find(e => e.id === selectedPost.userId);
                if (!author || !author.services || author.services.length === 0) return null;
                
                return (
                  <div className="py-6 space-y-4">
                    <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-2">
                      {author.services
                        .sort((a, b) => {
                          const aOrders = parseInt(a.orderCount.replace(/[^0-9.]/g, '') || '0') * (a.orderCount.includes('k') ? 1000 : 1);
                          const bOrders = parseInt(b.orderCount.replace(/[^0-9.]/g, '') || '0') * (b.orderCount.includes('k') ? 1000 : 1);
                          return bOrders - aOrders;
                        })
                        .map(service => (
                          <div key={`post-author-service-${service.id}`} className="min-w-[200px]">
                            <GlassCard className="p-2 flex flex-col gap-2">
                              <div className="relative aspect-video rounded-lg overflow-hidden">
                                <img src={service.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded-md border border-white/10 flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 text-yellow-500 fill-current" />
                                  <span className="text-[9px] font-bold text-white">{service.rating.toFixed(1)}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-white text-xs line-clamp-1">{service.name}</h4>
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{service.orderCount}</span>
                                  <button 
                                    onClick={() => navigateTo('ORDER_CONFIRM', { epal: author, variant: service.variants[0] })}
                                    className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-bold text-[10px] transition-colors active:scale-95"
                                  >
                                    <span className="flex items-center gap-1">
                                      {service.variants[0].price} <CoinIcon />
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </GlassCard>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })()}

              {/* Comments Section */}
              <div className="px-6 space-y-6 pt-6 border-t border-white/5">
                <h3 className="text-lg font-bold">Comments ({selectedPost.comments})</h3>
                <div className="space-y-8">
                  {selectedPost.commentsList?.map(comment => (
                    <div key={`post-comment-${comment.id}`} className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex items-start gap-3 cursor-pointer group"
                          onClick={() => {
                            const epal = EPALS.find(ep => ep.id === comment.userId);
                            if (epal) navigateTo('PROFILE', epal);
                          }}
                        >
                          <img 
                            src={comment.userAvatar} 
                            className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-emerald-500/50 transition-all" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">{comment.userName}</span>
                              <span className="text-[10px] text-gray-500">{new Date(comment.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">{comment.content}</p>
                          </div>
                        </div>
                        <button className="p-1 text-gray-500 hover:text-emerald-400 transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="pl-13 flex items-center gap-6">
                        <button className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-wider">Reply</button>
                        <button className="text-[10px] font-bold text-gray-500 hover:text-red-400 uppercase tracking-wider">Report</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment Input Bar */}
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c1714]/95 backdrop-blur-xl border-t border-white/10 p-4 pb-8">
                <div className="max-w-md mx-auto flex items-center gap-3">
                  <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 px-4 py-3 flex items-center gap-2">
                    <input 
                      ref={commentInputRef}
                      type="text" 
                      placeholder={t('phSaySomethingNice')} 
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-500"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (isInteractionBlocked(selectedPost.userId)) return;
                    }}
                    className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg active:scale-95 transition-all"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'LEGEND_LIST' && (
            <motion.div 
              key="legend_list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20"
            >
              {/* Header */}
              <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-white/5 mb-6">
                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                </button>
                <h2 className="text-lg font-bold">{t('legendEPals')}</h2>
              </div>

              <div className="px-6 grid grid-cols-2 gap-4">
                {EPALS.filter(e => e.isLegend).map(epal => (
                  <LegendEPalCard 
                    key={`legend-list-epal-${epal.id}`} 
                    epal={epal} 
                    onProfileClick={() => navigateTo('PROFILE', epal)}
                    isPlaying={playingEPalId === epal.id}
                    onPlayToggle={(e) => handlePlayToggle(epal.id, e)}
                    variant="stacked"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {currentView === 'GAME_DETAIL' && (
            <motion.div 
              key="game_detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="min-h-screen pb-20"
            >
              <div className="relative h-[35vh] w-full">
                <img 
                  src={selectedGame?.imageUrl} 
                  alt={selectedGame?.name} 
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f071a] via-transparent to-black/40" />
                
                {/* Back Button */}
                <button 
                  onClick={handleBack}
                  className="absolute top-6 left-6 p-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-black/40 transition-all z-50"
                >
                  <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                </button>

                <div className="absolute bottom-6 left-6">
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg">{selectedGame?.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-emerald-400 font-bold text-sm tracking-widest drop-shadow-md">{selectedGame?.onlineCount} Online</p>
                  </div>
                </div>
              </div>

              <div className="px-6 mt-6 space-y-4">
                {/* Sort & Filter Controls */}
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {[
                      { id: 'DEFAULT', label: 'Default' },
                      { id: 'ORDERS', label: 'Orders' },
                      { id: 'SCORE', label: 'Score' }
                    ].map(option => (
                      <button
                        key={option.id}
                        onClick={() => setEpalSortBy(option.id as any)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                          epalSortBy === option.id 
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowEpalFilterModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0 ${
                      Object.values(epalFilters).some(v => v !== 'ALL' && !Array.isArray(v)) || epalFilters.priceRange[0] !== 0 || epalFilters.priceRange[1] !== 100
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{t('filterLabel')}</span>
                  </button>
                </div>

                {(() => {
                  const filteredEpals = EPALS
                    .filter(e => e.game.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || ''))
                    .filter(e => {
                      if (epalFilters.status === 'ONLINE' && e.onlineStatus !== 'Online') return false;
                      if (epalFilters.gender !== 'ALL' && e.gender !== epalFilters.gender) return false;
                      if (e.price < epalFilters.priceRange[0] || e.price > epalFilters.priceRange[1]) return false;
                      
                      // For Server, Platform, Rank, we check playlinks
                      if (epalFilters.server !== 'ALL' || epalFilters.platform !== 'ALL' || epalFilters.rank !== 'ALL') {
                        const matchingPlaylink = e.playlinks?.find(pl => 
                          pl.gameName.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || '')
                        );
                        if (!matchingPlaylink) return false;
                        if (epalFilters.server !== 'ALL' && matchingPlaylink.server !== epalFilters.server) return false;
                        if (epalFilters.platform !== 'ALL' && matchingPlaylink.platform !== epalFilters.platform) return false;
                        if (epalFilters.rank !== 'ALL' && matchingPlaylink.rank !== epalFilters.rank) return false;
                      }
                      
                      return true;
                    })
                    .sort((a, b) => {
                      if (epalSortBy === 'ORDERS') {
                        const aOrders = parseFloat(a.orderCount.replace('k', '')) * (a.orderCount.includes('k') ? 1000 : 1);
                        const bOrders = parseFloat(b.orderCount.replace('k', '')) * (b.orderCount.includes('k') ? 1000 : 1);
                        return bOrders - aOrders;
                      }
                      if (epalSortBy === 'SCORE') return b.rating - a.rating;
                      return 0; // Default
                    });

                  if (filteredEpals.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                        <Search className="w-12 h-12 opacity-20" />
                        <p className="font-bold">{t('noEPalsFound')}</p>
                        <button 
                          onClick={() => setEpalFilters({
                            status: 'ALL',
                            gender: 'ALL',
                            priceRange: [0, 100],
                            server: 'ALL',
                            platform: 'ALL',
                            rank: 'ALL',
                          })}
                          className="text-emerald-400 font-bold text-sm"
                        >
                          Reset Filters
                        </button>
                      </div>
                    );
                  }

                  return filteredEpals.map(epal => {
                    const playlink = epal.playlinks?.find(pl => 
                      pl.gameName.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || '')
                    );
                    
                    let badgeText = undefined;
                    if (selectedGame?.category !== 'CHILLING') {
                      if (epalFilters.rank !== 'ALL') badgeText = playlink?.rank;
                      else if (epalFilters.server !== 'ALL') badgeText = playlink?.server;
                      else if (epalFilters.platform !== 'ALL') badgeText = playlink?.platform;
                      else badgeText = playlink?.rank || playlink?.role || playlink?.server;
                    }

                    return (
                      <EPalCard 
                        key={`game-detail-epal-${epal.id}`} 
                        epal={epal} 
                        onProfileClick={() => navigateTo('PROFILE', epal)}
                        onOrderClick={() => navigateTo('ORDER_CONFIRM', { epal })}
                        isPlaying={playingEPalId === epal.id}
                        onPlayToggle={(e) => handlePlayToggle(epal.id, e)}
                        badgeText={badgeText}
                      />
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}

          {currentView === 'PROFILE' && selectedEPal && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="space-y-0"
            >
              <div className="relative h-[35vh]">
                <img 
                  src={selectedEPal.avatarUrl} 
                  alt={selectedEPal.name} 
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f071a] via-transparent to-black/40" />
                
                {/* Back Button */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
                  <button 
                    onClick={handleBack}
                    className="p-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-black/40 transition-all"
                  >
                    <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                  </button>
                  <div className="flex items-center gap-2">
                    {selectedEPal.id !== '1' && (
                      <div className="relative">
                        <button 
                          onClick={() => setIsProfileMoreOpen(!isProfileMoreOpen)}
                          className="p-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-black/40 transition-all"
                        >
                          <MoreHorizontal className="w-6 h-6" />
                        </button>

                        <AnimatePresence>
                          {isProfileMoreOpen && (
                            <>
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsProfileMoreOpen(false)}
                                className="fixed inset-0 z-[60]"
                              />
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute top-12 right-0 w-40 bg-[#0c1714] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70] p-1.5"
                              >
                                <button 
                                  onClick={() => {
                                    setIsProfileMoreOpen(false);
                                    setReportContext('USER');
                                    setIsReportModalOpen(true);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-gray-300 hover:text-white"
                                >
                                  <Flag className="w-4 h-4 text-gray-500" />
                                  <span className="text-xs font-bold">{t('report')}</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setIsProfileMoreOpen(false);
                                    setIsBlockConfirmOpen(true);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all text-red-400"
                                >
                                  <Ban className="w-4 h-4" />
                                  <span className="text-xs font-bold">
                                    {blockedUsers.has(selectedEPal.id) ? t('unblock') : t('block')}
                                  </span>
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {selectedEPal.id === '1' && (
                      <button 
                        onClick={() => navigateTo('SETTINGS_EDIT_PROFILE')}
                        className="p-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-black/40 transition-all"
                      >
                        <Settings className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="px-6 -mt-12 relative z-10 space-y-6">
                {/* Avatar Frame */}
                <div className="absolute -top-12 left-10 w-24 h-24 rounded-3xl border-4 border-[#0f071a] overflow-hidden shadow-2xl z-30">
                  <img src={selectedEPal.avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>

                <GlassCard className="p-5 pt-16 space-y-3 relative z-20 shadow-2xl">
                  {/* Follow Button - Top Right */}
                  {selectedEPal && selectedEPal.id !== '1' && (
                    <button 
                      onClick={() => selectedEPal && toggleFollow(selectedEPal.id)}
                      className={`absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl active:scale-95 transition-all group ${
                        selectedEPal && followedEPals.has(selectedEPal.id)
                          ? 'bg-white/10 border border-white/20' 
                          : 'bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      }`}
                    >
                      <Heart 
                        className={`w-3.5 h-3.5 text-white ${
                          selectedEPal && followedEPals.has(selectedEPal.id) ? 'fill-current' : ''
                        }`} 
                      />
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                        {selectedEPal && followedEPals.has(selectedEPal.id) ? 'Following' : 'Follow'}
                      </span>
                    </button>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 pr-24">
                      <h1 className="text-xl font-bold truncate tracking-tight">{selectedEPal.name}</h1>
                      {selectedEPal.gender && (
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${selectedEPal.gender === 'Female' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {selectedEPal.gender === 'Female' ? <Venus className="w-3 h-3" /> : <Mars className="w-3 h-3" />}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                        <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-tight">ID: {selectedEPal.id.slice(0, 8)}</span>
                        <button 
                          onClick={() => copyToClipboard(selectedEPal.id)}
                          className="p-1 hover:bg-white/10 rounded-md transition-colors"
                        >
                          {copied ? <Check className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
                        <div className="flex items-center gap-1">
                          <span>{selectedEPal.followersCount || '0'}</span>
                          <span className="font-medium opacity-60">Followers</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{selectedEPal.followingCount || '0'}</span>
                          <span className="font-medium opacity-60">Following</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Info Badges */}
                      <div className="flex flex-wrap gap-2">
                        {selectedEPal.onlineStatus && (
                          <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-lg text-green-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase">{selectedEPal.onlineStatus}</span>
                          </div>
                        )}

                        {selectedEPal.region && (
                          <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-gray-400">
                            <MapPin className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase">{selectedEPal.region}</span>
                          </div>
                        )}
                      </div>

                      {selectedEPal.bio && (
                        <p className="text-xs text-gray-400 leading-relaxed px-1">
                          {selectedEPal.bio}
                        </p>
                      )}
                    </div>
                </GlassCard>

                {/* Profile Tabs */}
                <div className="flex justify-between items-center px-2 py-4 border-b border-white/5 sticky top-0 bg-[#07110f]/80 backdrop-blur-xl z-40 -mx-6 px-8">
                  {[
                    { id: 'Playlink', icon: Play },
                    { id: 'Service', icon: Gamepad2, hidden: !selectedEPal.services || selectedEPal.services.length === 0 },
                    { id: 'Album', icon: Image },
                    { id: 'Post', icon: Layout }
                  ].filter(tab => !tab.hidden).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setProfileTab(tab.id as any)}
                      className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${profileTab === tab.id ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <tab.icon className={`w-5 h-5 ${profileTab === tab.id ? 'fill-current' : ''}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{tab.id}</span>
                      {profileTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute -bottom-4 left-0 right-0 h-0.5 bg-emerald-400 rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {profileTab === 'Service' && selectedEPal.services && selectedEPal.services.length > 0 && (
                  <div className="space-y-6 pt-2 relative z-30">
                    <div className="flex gap-4 overflow-x-auto pt-4 pb-6 no-scrollbar -mx-2 px-2">
                      {selectedEPal.services.map(service => {
                        return (
                          <button
                            key={`profile-service-tab-${service.id}`}
                            onClick={() => setActiveServiceId(service.id)}
                            className={`flex flex-col items-center gap-2 shrink-0 transition-all duration-300 ${activeServiceId === service.id ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                          >
                            <div className={`w-20 h-28 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${activeServiceId === service.id ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-110' : 'border-white/10'}`}>
                              <img 
                                src={service.posterUrl} 
                                alt={service.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-tighter ${activeServiceId === service.id ? 'text-white' : 'text-gray-500'}`}>{service.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Service Content */}
                    {selectedEPal.services.find(s => s.id === activeServiceId) && (
                      <div className="space-y-6">
                        {(() => {
                          const service = selectedEPal.services.find(s => s.id === activeServiceId)!;
                          return (
                            <>
                              <GlassCard className="p-6 space-y-4">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-1.5">
                                      <h3 className="text-xl font-bold">{service.name}</h3>
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                          <span className="text-sm font-bold">{service.rating.toFixed(1)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                          <span className="text-sm font-bold">{service.orderCount} Orders</span>
                                        </div>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={(e) => handlePlayToggle(selectedEPal.id, e)}
                                      className="w-10 h-10 bg-emerald-600 border border-emerald-500/50 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0"
                                    >
                                      {playingEPalId === selectedEPal.id ? (
                                        <WaveAnimation color="bg-white" />
                                      ) : (
                                        <Play className="w-4 h-4 text-white fill-current" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Screenshots */}
                                <img 
                                  src={service.screenshots[0]} 
                                  className="w-full h-36 object-cover rounded-2xl border border-white/10" 
                                  referrerPolicy="no-referrer"
                                />

                                <div className="space-y-4">
                                  <p className="text-gray-400 text-sm leading-relaxed">{service.description}</p>
                                  
                                  {/* Service Details Toggle */}
                                  {service.details && (
                                    <div className="space-y-3">
                                      <button 
                                        onClick={() => setShowServiceDetails(!showServiceDetails)}
                                        className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
                                      >
                                        {showServiceDetails ? (
                                          <>
                                            <ChevronUp className="w-3 h-3" />
                                            View Less
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="w-3 h-3" />
                                            View More
                                          </>
                                        )}
                                      </button>

                                      <AnimatePresence>
                                        {showServiceDetails && (
                                          <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="space-y-1.5 pt-1">
                                              {service.details.rank && (
                                                <div className="flex justify-between items-center p-2 bg-white/5 rounded-xl border border-white/10">
                                                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Rank</p>
                                                  <p className="text-xs font-bold text-emerald-400">{service.details.rank}</p>
                                                </div>
                                              )}
                                              {service.details.server && (
                                                <div className="flex justify-between items-center p-2 bg-white/5 rounded-xl border border-white/10">
                                                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Server</p>
                                                  <p className="text-xs font-bold text-emerald-400">{service.details.server}</p>
                                                </div>
                                              )}
                                              {service.details.main && (
                                                <div className="flex justify-between items-center p-2 bg-white/5 rounded-xl border border-white/10">
                                                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Main</p>
                                                  <p className="text-xs font-bold text-emerald-400">{service.details.main}</p>
                                                </div>
                                              )}
                                              {service.details.style && (
                                                <div className="flex justify-between items-center p-2 bg-white/5 rounded-xl border border-white/10">
                                                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Style</p>
                                                  <p className="text-xs font-bold text-emerald-400">{service.details.style}</p>
                                                </div>
                                              )}
                                              {service.details.platform && (
                                                <div className="flex justify-between items-center p-2 bg-white/5 rounded-xl border border-white/10">
                                                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Platform</p>
                                                  <p className="text-xs font-bold text-emerald-400">{service.details.platform}</p>
                                                </div>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>

                                {/* Variants */}
                                <div className="space-y-3 pt-2">
                                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">Service Types</h4>
                                  <div className="grid grid-cols-1 gap-2">
                                    {service.variants.map((v) => (
                                      <button 
                                        key={v.name} 
                                        onClick={() => navigateTo('ORDER_CONFIRM', { epal: selectedEPal, variant: v })}
                                        className="flex justify-between items-center p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all text-left"
                                      >
                                        <span className="text-sm font-bold">{v.name}</span>
                                        <span className="text-white font-bold flex items-center gap-1">
                                          {v.price} <CoinIcon />
                                          <span className="text-[10px] text-gray-500 uppercase">/ {v.unit}</span>
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </GlassCard>

                              {/* Reviews Section */}
                              <div className="space-y-6">
                                <div className="flex justify-between items-end px-1">
                                  <div className="space-y-1">
                                    <h3 className="text-lg font-bold">User Reviews</h3>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                        <span className="text-sm font-bold text-emerald-400">{selectedEPal.rating.toFixed(1)}</span>
                                      </div>
                                      <span className="text-xs text-gray-500 font-bold">{selectedEPal.orderCount} Ratings</span>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => navigateTo('ALL_REVIEWS', { epal: selectedEPal })}
                                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                  >
                                    View All
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Review Tags */}
                                {selectedEPal.reviewTags && (
                                  <div className="flex flex-wrap gap-2 px-1">
                                    {selectedEPal.reviewTags.map((tag, idx) => (
                                      <div 
                                        key={`${tag.name}-${idx}`}
                                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2"
                                      >
                                        <span className="text-[11px] font-bold text-gray-300">{tag.name}</span>
                                        <span className="text-[10px] font-bold text-gray-500">{tag.count}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="space-y-3">
                                  {selectedEPal.reviews?.slice(0, 2).map(review => (
                                    <div key={review.id}>
                                      <GlassCard className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                          <div className="flex items-center gap-3">
                                            <img src={review.userAvatar} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                                            <div>
                                              <p className="text-sm font-bold">{review.userName}</p>
                                              <div className="flex gap-0.5">
                                                {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={`profile-review-detail-${review.id}-star-${i}`} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-700'}`} />
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                          <span className="text-[10px] text-gray-600 font-bold">{review.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-400 italic">"{review.comment}"</p>
                                      </GlassCard>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'Playlink' && (
                  <div className="grid grid-cols-1 gap-4 pt-4">
                    {selectedEPal.playlinks?.map((pl) => (
                      <button 
                        key={pl.id}
                        onClick={() => {
                          setSelectedPlaylinkId(pl.id);
                          setShowPlaylinkModal(true);
                        }}
                        className="relative aspect-[16/6] rounded-2xl overflow-hidden group active:scale-[0.98] transition-all border border-white/5"
                      >
                        <img 
                          src={pl.posterUrl} 
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                          <div className="space-y-1 text-left">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/20">
                              {pl.gameName}
                            </span>
                            <h3 className="text-lg font-black text-white tracking-tight uppercase">{pl.nickname}</h3>
                          </div>
                          {pl.platform && (
                            <div className="w-8 h-8 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center">
                              {pl.platform === 'PC' && <Monitor className="w-4 h-4 text-white" />}
                              {pl.platform === 'PS' && <Gamepad2 className="w-4 h-4 text-white" />}
                              {pl.platform === 'Mobile' && <Smartphone className="w-4 h-4 text-white" />}
                            </div>
                          )}
                        </div>

                        <div className="absolute bottom-4 left-4 right-4 flex flex-nowrap gap-2 overflow-hidden">
                          {[pl.rank, pl.server, pl.role, pl.style].filter(Boolean).map((tag, idx) => (
                            <span key={`album-tag-${selectedEPal.id}-${idx}`} className="text-[9px] font-bold text-white/90 uppercase tracking-wider bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap shrink-0">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {profileTab === 'Album' && (
                  <div className="grid grid-cols-3 gap-2 pt-4">
                    {(selectedEPal.album || [1, 2, 3, 4, 5, 6]).map((item, i) => (
                      <div key={`profile-album-${selectedEPal.id}-${i}`} className="aspect-square rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                        <img 
                          src={typeof item === 'string' ? item : `https://picsum.photos/seed/${selectedEPal.id}${item}/400/400`} 
                          className={`w-full h-full object-cover transition-all duration-500 ${typeof item === 'string' ? '' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {profileTab === 'Post' && (
                  <div className="space-y-4 pt-4">
                    {(() => {
                      const userPosts = POSTS.filter(p => p.userId === selectedEPal.id);
                      if (userPosts.length === 0) {
                        return (
                          <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                              <Layout className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-gray-500 font-bold">No posts yet</p>
                          </div>
                        );
                      }
                      return userPosts.map((post) => (
                        <button 
                          key={post.id} 
                          onClick={() => navigateTo('POST_DETAIL', { post })}
                          className="w-full text-left"
                        >
                          <GlassCard className="p-4 space-y-4 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <img src={post.userAvatar} className="w-8 h-8 rounded-full object-cover" />
                              <div>
                                <p className="text-xs font-bold">{post.userName}</p>
                                <p className="text-[10px] text-gray-500">{new Date(post.timestamp).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-200 line-clamp-3">{post.content}</p>
                            {post.images && post.images.length > 0 && (
                              <div className={`grid ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                {post.images.slice(0, 2).map((img, idx) => (
                                  <div key={`${img}-${idx}`} className="aspect-video rounded-xl bg-white/5 overflow-hidden">
                                    <img src={img} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </GlassCard>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Floating Profile Actions */}
              <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 pointer-events-none">
                <div className="flex gap-4 max-w-md mx-auto pointer-events-auto">
                  <button 
                    onClick={() => {
                      if (!selectedEPal) return;
                      if (isInteractionBlocked(selectedEPal.id)) return;
                      navigateTo('IM_DETAIL', selectedEPal);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-[#0c1714]/90 backdrop-blur-xl border border-white/10 font-bold flex items-center justify-center gap-3 text-white shadow-2xl active:scale-95 transition-all"
                  >
                    <MessageSquare className="w-5 h-5 text-emerald-400" /> Chat
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedEPal && activeServiceId) {
                        if (isInteractionBlocked(selectedEPal.id)) return;
                        const service = selectedEPal.services?.find(s => s.id === activeServiceId);
                        if (service) {
                          navigateTo('ORDER_CONFIRM', { epal: selectedEPal, variant: service.variants[0] });
                        }
                      }
                    }}
                    className="flex-1 py-4 rounded-2xl bg-emerald-600 font-bold shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 text-white"
                  >
                    <Play className="w-5 h-5 fill-current" /> Play
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'ALL_REVIEWS' && selectedEPal && (
            <motion.div 
              key="all_reviews"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20"
            >
              {/* Header */}
              <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-white/5 mb-6">
                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                </button>
                <h2 className="text-lg font-bold">All Reviews</h2>
              </div>

              <div className="px-6 space-y-6">
                {/* Rating Summary */}
                <GlassCard className="p-8 flex items-center justify-between bg-white/[0.03] border-white/5 rounded-[32px] overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-50" />
                  <div className="relative z-10 flex flex-col gap-3">
                    <div className="flex items-baseline">
                      <span className="text-7xl font-bold text-white tracking-tighter">
                        {selectedEPal.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex gap-1.5 px-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={`profile-summary-star-${selectedEPal.id}-${i}`} className={`w-5 h-5 ${i < Math.floor(selectedEPal.rating) ? 'text-yellow-400 fill-current' : 'text-white/10'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="relative z-10 text-right">
                    <div className="text-white/30 text-lg font-medium tracking-tight">
                      {selectedEPal.orderCount.toLocaleString()} reviews
                    </div>
                  </div>
                </GlassCard>

              {/* Tags & Filters */}
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
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{t('filterLabel')}</span>
                    </button>
                  </div>
                </div>
                {selectedEPal.reviewTags && (
                  <div className="flex flex-wrap gap-2">
                    {selectedEPal.reviewTags.map((tag, idx) => (
                      <button 
                        key={`${tag.name}-${idx}`}
                        onClick={() => setSelectedReviewTag(tag.name === selectedReviewTag ? null : tag.name)}
                        className={`px-4 py-2 rounded-2xl border transition-all flex items-center gap-2 ${
                          selectedReviewTag === tag.name 
                            ? 'bg-emerald-600/20 border-emerald-500/50' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span className={`text-xs font-bold ${selectedReviewTag === tag.name ? 'text-emerald-400' : 'text-gray-300'}`}>
                          {tag.name}
                        </span>
                        <span className="text-xs font-bold text-gray-500">{tag.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Filters Display */}
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

              {/* Review List */}
              <div className="space-y-4">
                {(() => {
                  let filtered = [...(selectedEPal.reviews || [])];
                  
                  // Filter by tag
                  if (selectedReviewTag) {
                    filtered = filtered.filter(r => r.tags?.includes(selectedReviewTag));
                  }

                  // Filter by rating
                  if (selectedRatingFilter) {
                    filtered = filtered.filter(r => r.rating === selectedRatingFilter);
                  }
                  
                  // Sort
                  if (reviewSortOrder === 'NEWEST') {
                    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                  } else if (reviewSortOrder === 'OLDEST') {
                    filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                  } else if (reviewSortOrder === 'RATING_HIGH') {
                    filtered.sort((a, b) => b.rating - a.rating);
                  } else if (reviewSortOrder === 'RATING_LOW') {
                    filtered.sort((a, b) => a.rating - b.rating);
                  }
                  
                  if (filtered.length === 0) {
                    return (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                          <MessageSquare className="w-8 h-8 text-gray-700" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-white font-bold">No reviews found</p>
                          <p className="text-xs text-gray-500">Try selecting a different filter or tag</p>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedReviewTag(null);
                            setSelectedRatingFilter(null);
                            setReviewSortOrder('DEFAULT');
                          }}
                          className="text-xs font-bold text-emerald-400"
                        >
                          Reset all filters
                        </button>
                      </div>
                    );
                  }

                  return filtered.map(review => (
                    <div key={review.id}>
                      <GlassCard className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div 
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => {
                              const epal = EPALS.find(ep => ep.name === review.userName);
                              if (epal) navigateTo('PROFILE', epal);
                            }}
                          >
                            <img 
                              src={review.userAvatar} 
                              className="w-12 h-12 rounded-full object-cover border-2 border-white/5 group-hover:border-emerald-500/50 transition-all" 
                              referrerPolicy="no-referrer" 
                            />
                            <div>
                              <p className="text-sm font-bold group-hover:text-emerald-400 transition-colors">{review.userName}</p>
                              <div className="flex gap-0.5">
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <Star key={`profile-review-${review.id}-star-${i}`} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-700'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-600 font-bold">{review.date}</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed italic">"{review.comment}"</p>
                        {review.tags && review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {review.tags.map((t, i) => (
                              <span key={`tag-${review.id}-${i}`} className="text-[9px] font-bold text-gray-500 uppercase tracking-tight bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </GlassCard>
                    </div>
                  ));
                })()}
              </div>
              </div>
            </motion.div>
          )}

          {currentView === 'IM' && (
            <motion.div 
              key="im"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 pt-4 px-6 space-y-6"
            >
              {/* Sub Tabs */}
              <div className="flex items-center border-b border-white/5 pb-4">
                <button 
                  onClick={() => setImTab('MESSAGE')}
                  className={`flex-1 text-center text-lg font-bold transition-all relative ${imTab === 'MESSAGE' ? 'text-white' : 'text-gray-500'}`}
                >
                  Message
                  {imTab === 'MESSAGE' && <motion.div layoutId="imTab" className="absolute -bottom-4 left-0 right-0 h-1 bg-emerald-500 rounded-full" />}
                </button>
                <button 
                  onClick={() => setImTab('FRIENDS')}
                  className={`flex-1 text-center text-lg font-bold transition-all relative ${imTab === 'FRIENDS' ? 'text-white' : 'text-gray-500'}`}
                >
                  Friends
                  {imTab === 'FRIENDS' && <motion.div layoutId="imTab" className="absolute -bottom-4 left-0 right-0 h-1 bg-emerald-500 rounded-full" />}
                </button>
                <button 
                  onClick={() => setImTab('ORDER')}
                  className={`flex-1 text-center text-lg font-bold transition-all relative ${imTab === 'ORDER' ? 'text-white' : 'text-gray-500'}`}
                >
                  Order
                  {imTab === 'ORDER' && <motion.div layoutId="imTab" className="absolute -bottom-4 left-0 right-0 h-1 bg-emerald-500 rounded-full" />}
                </button>
              </div>

              {imTab === 'MESSAGE' ? (
                <div className="space-y-6">
                  {chatSessions.filter(s => {
                    const p = EPALS.find(e => e.id === s.participantId);
                    // Only show sessions with a last message
                    if (!s.lastMessage) return false;
                    return !imSearchQuery || p?.name.toLowerCase().includes(imSearchQuery.toLowerCase());
                  }).map(session => {
                    const participant = EPALS.find(e => e.id === session.participantId);
                    if (!participant) return null;
                    return (
                      <div 
                        key={`chat-session-${session.id}`} 
                        onClick={() => navigateTo('IM_DETAIL', participant)}
                        className="flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer p-2 -mx-2 rounded-xl"
                      >
                        <div className="relative">
                          <img src={participant.avatarUrl} className="w-14 h-14 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                          {session.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 rounded-full border-2 border-[#0f071a] flex items-center justify-center text-[10px] font-bold text-white">
                              {session.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="font-bold text-white truncate">{participant.name}</h4>
                            <span className="text-[10px] text-gray-500 font-bold">{formatChatMessageTime(session.lastTimestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-400 truncate">{session.lastMessage}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : imTab === 'FRIENDS' ? (
                <div className="space-y-6">
                  {mutualFollowers.filter(e => !imSearchQuery || e.name.toLowerCase().includes(imSearchQuery.toLowerCase())).length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                        <Users className="w-8 h-8 text-gray-700" />
                      </div>
                      <p className="text-gray-500 font-bold">No mutual followers found</p>
                    </div>
                  ) : (
                    mutualFollowers.filter(e => !imSearchQuery || e.name.toLowerCase().includes(imSearchQuery.toLowerCase())).map(epal => {
                      const session = chatSessions.find(s => s.participantId === epal.id);
                      return (
                        <div 
                          key={`im-friends-${epal.id}`} 
                          onClick={() => navigateTo('PROFILE', epal)}
                          className="flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer p-2 -mx-2 rounded-xl"
                        >
                          <div className="relative">
                            <img src={epal.avatarUrl} className="w-14 h-14 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                            {session && session.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 rounded-full border-2 border-[#0f071a] flex items-center justify-center text-[10px] font-bold text-white">
                                {session.unreadCount}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white truncate">{epal.name}</h4>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Order Sub-tabs */}
                  <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-full">
                    {[
                      { id: 'EPAL', label: 'E-Pal' },
                      { id: 'CUSTOMER', label: 'Customer' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setImOrderTab(tab.id as any)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          imOrderTab === tab.id 
                            ? 'bg-emerald-600 text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {imOrders.filter(o => 
                      imOrderTab === 'EPAL' ? o.customerId === 'me' : o.epalId === 'me'
                    ).map(order => {
                      const epal = EPALS.find(e => e.id === (imOrderTab === 'EPAL' ? order.epalId : order.customerId));
                      if (!epal) return null;
                      return (
                        <div 
                          key={`im-order-${order.id}`} 
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetailModal(true);
                          }}
                          className="flex items-center gap-4 py-4 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group px-2 -mx-2"
                        >
                          <div className="relative shrink-0">
                            <img src={epal.avatarUrl} className="w-14 h-14 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0f071a] ${epal.onlineStatus === 'Online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="font-bold text-white text-sm truncate">{epal.name}</h4>
                              <span className="text-[10px] text-gray-500 font-bold">{formatChatMessageTime(order.timestamp)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex flex-col min-w-0">
                                <p className="text-xs text-gray-400 truncate mb-1">{order.serviceName}</p>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                                    order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                                    order.status === 'ACCEPTED' ? 'bg-blue-500/10 text-blue-400' :
                                    order.status === 'ONGOING' ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-emerald-500/10 text-emerald-400'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-sm font-black text-white">{order.price}</span>
                                <CoinIcon className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {order.status === 'PENDING' ? (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateTo('IM_DETAIL', epal);
                                }}
                                className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-lg active:scale-90 transition-all"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            ) : (order.status === 'COMPLETED' && !order.reviewed && order.epalId !== 'me') && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  setReviewRating(5);
                                  setReviewTags([]);
                                  setReviewFeedback('');
                                  setShowReviewModal(true);
                                }}
                                className="p-2.5 bg-white/10 rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-all"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}
                            {order.status === 'COMPLETED' && order.reviewed && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                <span className="text-[10px] font-black text-yellow-500">{order.reviewRating}.0</span>
                              </div>
                            )}
                            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                    {imOrders.filter(o => 
                      imOrderTab === 'EPAL' ? o.customerId === 'me' : o.epalId === 'me'
                    ).length === 0 && (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                          <FileText className="w-8 h-8 text-gray-700" />
                        </div>
                        <p className="text-gray-500 font-bold">No {imOrderTab.toLowerCase()} orders found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'CONTACTS' && (
            <motion.div 
              key="contacts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 pt-6 px-6 space-y-6"
            >
              <div className="flex items-center gap-4">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-bold">Contacts</h1>
              </div>

              {/* Contacts Tabs */}
              <div className="flex items-center border-b border-white/5">
                {[
                  { id: 'FRIENDS', label: 'Friends' },
                  { id: 'FOLLOWING', label: 'Following' },
                  { id: 'FOLLOWERS', label: 'Followers' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setContactsTab(tab.id as any)}
                    className={`flex-1 text-center pb-3 text-sm font-bold transition-all relative ${
                      contactsTab === tab.id ? 'text-emerald-400' : 'text-gray-500'
                    }`}
                  >
                    {tab.label}
                    {contactsTab === tab.id && (
                      <motion.div 
                        layoutId="contactsTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                      />
                    )}
                  </button>
                ))}
              </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                    {(() => {
                      const filteredList = contactsTab === 'FRIENDS' 
                        ? mutualFollowers 
                        : contactsTab === 'FOLLOWING'
                        ? EPALS.filter(e => followedEPals.has(e.id))
                        : EPALS.filter(e => followersOfMe.has(e.id));

                      if (filteredList.length === 0) {
                        return (
                          <div className="col-span-2 py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                              <Users className="w-8 h-8 text-gray-700" />
                            </div>
                            <p className="text-gray-500 font-bold">No {contactsTab.toLowerCase()} yet</p>
                          </div>
                        );
                      }

                      return filteredList.map(epal => (
                        <div 
                          key={`contact-${contactsTab}-${epal.id}`} 
                          onClick={() => navigateTo('PROFILE', epal)}
                          className="flex items-center gap-3 hover:bg-white/5 transition-all cursor-pointer p-2 rounded-xl group"
                        >
                          <div className="relative shrink-0">
                            <img src={epal.avatarUrl} className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:border-emerald-500/50 transition-colors" referrerPolicy="no-referrer" />
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f071a] ${epal.onlineStatus === 'Online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">{epal.name}</h4>
                            <p className="text-[10px] text-gray-500 truncate">{epal.game}</p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
            </motion.div>
          )}

          {currentView === 'IM_DETAIL' && selectedEPal && (() => {
            const ordersWithThisUser = imOrders.filter(o => 
              (o.epalId === selectedEPal.id && o.customerId === 'me') || 
              (o.epalId === 'me' && o.customerId === selectedEPal.id)
            ).sort((a, b) => b.timestamp - a.timestamp);

            return (
              <motion.div 
                key={`im_detail_${selectedEPal.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen flex flex-col bg-[#07110f]"
            >
              {/* Top Bar */}
              <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                  </button>
                  <div 
                    className="flex items-center gap-2.5 cursor-pointer group" 
                    onClick={() => navigateTo('PROFILE', selectedEPal)}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-lg">
                      <img src={selectedEPal.avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-bold text-white text-sm leading-tight group-hover:text-emerald-400 transition-colors truncate max-w-[120px]">{selectedEPal.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        <span className="text-[8px] text-green-500 font-bold uppercase tracking-widest">Online</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => toggleFollow(selectedEPal.id)}
                    className={`p-1.5 rounded-lg transition-all active:scale-95 ${
                      followedEPals.has(selectedEPal.id) 
                        ? 'bg-white/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${followedEPals.has(selectedEPal.id) ? 'fill-current' : ''}`} />
                  </button>
                  {selectedEPal.services && selectedEPal.services.length > 0 && (
                    <button 
                      onClick={() => {
                        setShowImServiceCards(!showImServiceCards);
                        setShowImOrderCard(false);
                      }}
                      className={`p-1.5 rounded-lg transition-all active:scale-95 ${
                        showImServiceCards 
                          ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                          : 'bg-white/5 text-gray-400 border border-white/10'
                      }`}
                    >
                      <Gamepad2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(() => {
                    const hasOngoingOrders = imOrders.some(o => 
                      ((o.epalId === selectedEPal.id && o.customerId === 'me') || 
                       (o.epalId === 'me' && o.customerId === selectedEPal.id)) &&
                      (o.status === 'PENDING' || o.status === 'ONGOING')
                    );
                    if (!hasOngoingOrders) return null;
                    return (
                      <button 
                        onClick={() => {
                          setShowImOrderCard(!showImOrderCard);
                          setShowImServiceCards(false);
                        }}
                        className={`p-1.5 rounded-lg transition-all active:scale-95 ${
                          showImOrderCard 
                            ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                            : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    );
                  })()}
                  <div className="relative">
                    <button 
                      onClick={() => setShowImReportMenu(!showImReportMenu)}
                      className="p-1.5 text-gray-500 hover:text-white transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    <AnimatePresence>
                      {showImReportMenu && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowImReportMenu(false)}
                            className="fixed inset-0 z-[60]"
                          />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 mt-2 w-32 bg-[#0c1714] border border-white/10 rounded-xl shadow-2xl z-[61] overflow-hidden"
                            >
                              <button 
                                onClick={() => {
                                  setShowImReportMenu(false);
                                  setReportContext('USER');
                                  setIsReportModalOpen(true);
                                }}
                                className="w-full px-4 py-3 text-left text-xs font-bold text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors"
                              >
                                <Flag className="w-3.5 h-3.5" />
                                Report
                              </button>
                              <button 
                                onClick={() => {
                                  setShowImReportMenu(false);
                                  setIsBlockConfirmOpen(true);
                                }}
                                className="w-full px-4 py-3 text-left text-xs font-bold text-gray-300 hover:bg-white/5 border-t border-white/5 flex items-center gap-2 transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                {blockedUsers.has(selectedEPal.id) ? 'Unblock' : 'Block'}
                              </button>
                            </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Service Cards Overlay */}
              <AnimatePresence>
                {showImServiceCards && selectedEPal.services && selectedEPal.services.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-[#07110f] border-b border-white/5 overflow-hidden shrink-0"
                  >
                    <div className="flex gap-4 overflow-x-auto no-scrollbar p-4 snap-x">
                      {selectedEPal.services.map(service => (
                        <div 
                          key={service.id}
                          onClick={() => navigateTo('ORDER_CONFIRM', { epal: selectedEPal, variant: service.variants[0] })}
                          className="min-w-[280px] bg-white/5 rounded-2xl border border-white/10 p-3 flex gap-3 cursor-pointer hover:bg-white/10 transition-all snap-center"
                        >
                          <div className="shrink-0">
                            <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                              <img src={service.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-0.5">
                            <div className="space-y-1">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-white text-sm truncate">{service.name}</h4>
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                <span className="text-[10px] font-bold text-white">{service.rating}</span>
                                <span className="text-[10px] text-gray-500 font-medium">({service.orderCount})</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <CoinIcon className="w-3 h-3" />
                                <span className="text-sm font-black text-white">{service.variants[0].price}</span>
                                <span className="text-[9px] text-gray-500 font-bold uppercase">/{service.variants[0].unit}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Order Card Overlay */}
              <AnimatePresence>
                {showImOrderCard && ordersWithThisUser.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-[#07110f] border-b border-white/5 overflow-hidden shrink-0"
                  >
                    <div className="px-6 py-4">
                      {(() => {
                        const order = ordersWithThisUser[0]; // Only show the latest one
                        return (
                          <div 
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetailModal(true);
                            }}
                            className="bg-white/5 rounded-2xl border border-white/10 p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
                                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-white text-sm truncate">{order.serviceName}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                    order.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                    order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                                    'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0 pl-4">
                              {(() => {
                                const relevantPlaylink = myPlaylinks.find(pl => 
                                  order.serviceName.toLowerCase().includes(pl.gameName.toLowerCase())
                                );
                                if (!relevantPlaylink) return null;
                                return (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newMsg: Message = {
                                        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                        senderId: 'me',
                                        receiverId: selectedEPal.id,
                                        content: `Check out my ${relevantPlaylink.gameName} Playlink!`,
                                        timestamp: Date.now(),
                                        type: 'playlink',
                                        playlinkId: relevantPlaylink.id
                                      };
                                      setCurrentMessages(prev => [...prev, newMsg]);
                                      setShowImOrderCard(false);
                                    }}
                                    className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center"
                                    title={t('titleSendPlaylink')}
                                  >
                                    <Link className="w-4 h-4" />
                                  </button>
                                );
                              })()}
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1">
                                  <CoinIcon className="w-3.5 h-3.5" />
                                  <span className="font-black text-white text-base">{order.totalPrice || order.price}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Messages */}
              <div 
                className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-20"
                onClick={() => setShowPlaylinkSelection(false)}
              >
                {currentMessages.map((msg, index) => {
                  const prevMsg = index > 0 ? currentMessages[index - 1] : undefined;
                  const timeDisplay = formatChatMessageTime(msg.timestamp, prevMsg?.timestamp);
                  
                  return (
                  <React.Fragment key={`chat-message-group-${msg.id}`}>
                      {timeDisplay && (
                        <div className="flex justify-center my-4">
                          <span className="text-[10px] text-gray-500 font-bold bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            {timeDisplay}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl ${
                          msg.type === 'playlink' 
                            ? 'bg-transparent p-0' 
                            : msg.senderId === 'me' ? 'bg-emerald-600 text-white rounded-tr-none px-4 py-2.5' : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none px-4 py-2.5'
                        }`}>
                          {msg.type === 'playlink' ? (
                            (() => {
                              const pl = (msg.senderId === 'me' ? myPlaylinks : EPALS.find(e => e.id === msg.senderId)?.playlinks)?.find(p => p.id === msg.playlinkId);
                              if (!pl) return <p className="text-xs text-gray-500 italic">Playlink not found</p>;
                              return (
                                <div className="bg-[#0c1714] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-64">
                                  <div className="relative h-32">
                                    <img src={pl.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    <div className="absolute bottom-3 left-3">
                                      <h5 className="text-white font-black text-sm leading-tight">{pl.gameName}</h5>
                                      <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">{pl.rank || pl.role}</p>
                                    </div>
                                  </div>
                                  <div className="p-3 flex items-center justify-between">
                                    <div className="min-w-0">
                                      <p className="text-white font-bold text-xs truncate">{pl.nickname}</p>
                                      <p className="text-gray-500 text-[9px] font-medium uppercase tracking-tighter">{pl.server} • {pl.platform}</p>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setSelectedPlaylinkId(pl.id);
                                        setShowPlaylinkModal(true);
                                      }}
                                      className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                    >
                                      View
                                    </button>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Detached Playlink Selection List & Overlay */}
              <AnimatePresence>
                {showPlaylinkSelection && (
                  <>
                    <motion.div 
                      key="playlink-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowPlaylinkSelection(false)}
                      className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-[2px]"
                    />
                    <motion.div 
                      key="playlink-selection"
                      initial={{ opacity: 0, y: 100 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 100 }}
                      className="fixed bottom-0 left-0 right-0 z-[60] pb-[96px]"
                    >
                      <div className="w-full bg-[#0c1714] border-t border-white/10 p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] max-h-[360px] overflow-y-auto no-scrollbar">
                        <div className="grid grid-cols-1 gap-3">
                          {myPlaylinks.map(pl => (
                            <button 
                              key={`order-playlink-option-${pl.id}`}
                              onClick={() => {
                                const newMsg: Message = {
                                  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                  senderId: 'me',
                                  receiverId: selectedEPal.id,
                                  content: `Check out my ${pl.gameName} Playlink!`,
                                  timestamp: Date.now(),
                                  type: 'playlink',
                                  playlinkId: pl.id
                                };
                                setCurrentMessages(prev => [...prev, newMsg]);
                                setShowPlaylinkSelection(false);
                              }}
                              className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-left group"
                            >
                              <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-lg">
                                <img src={pl.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-bold truncate group-hover:text-emerald-400 transition-colors">{pl.gameName}</p>
                                  <p className="text-[10px] text-gray-500 font-bold truncate uppercase tracking-widest mt-0.5">{pl.nickname} • {pl.server}</p>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                                <Send className="w-4 h-4 ml-0.5" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Input Bar */}
              <div className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0c1714] border-t border-white/10 p-4 pb-8">
                <div className="max-w-md mx-auto relative px-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGiftPanel(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-yellow-500 transition-colors"
                      >
                        <Gift className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPlaylinkSelection(!showPlaylinkSelection);
                        }}
                        className={`p-1.5 transition-all ${showPlaylinkSelection ? 'text-emerald-400' : 'text-gray-400 hover:text-emerald-400'}`}
                      >
                        <Link className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 bg-white/5 rounded-xl border border-white/10 px-3 h-9 flex items-center gap-2 relative group focus-within:border-emerald-500/30 transition-all">
                      <input 
                        type="text" 
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={t('typeMessage')} 
                        className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-gray-500 pe-7"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && messageInput.trim()) {
                            if (isInteractionBlocked(selectedEPal.id)) return;
                            const newMsg: Message = {
                              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                              senderId: 'me',
                              receiverId: selectedEPal.id,
                              content: messageInput.trim(),
                              timestamp: Date.now(),
                              type: 'text'
                            };
                            setCurrentMessages(prev => [...prev, newMsg]);
                            setMessageInput('');
                          }
                        }}
                      />
                      <button className="absolute right-2 p-1 text-gray-500 hover:text-emerald-400 transition-colors" tabIndex={-1}>
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>

                    <button 
                      onClick={() => {
                        if (messageInput.trim()) {
                          if (isInteractionBlocked(selectedEPal.id)) return;
                          const newMsg: Message = {
                            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            senderId: 'me',
                            receiverId: selectedEPal.id,
                            content: messageInput.trim(),
                            timestamp: Date.now(),
                            type: 'text'
                          };
                          setCurrentMessages(prev => [...prev, newMsg]);
                          setMessageInput('');
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0 shadow-emerald-900/40 text-white"
                    >
                      <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )})()}

          {currentView === 'ME' && (
            <motion.div 
              key="me"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="min-h-screen pb-20 bg-[#07110f]"
            >
              <div className="px-6 pt-8 space-y-4 relative z-10">
                {/* User Info Card */}
                <div className="flex items-center gap-4 px-2">
                  <div className="relative cursor-pointer" onClick={() => navigateTo('PROFILE', { ...EPALS[0], ...userProfile })}>
                    <div className="w-20 h-20 rounded-[28px] border-4 border-[#0f071a] overflow-hidden shadow-2xl hover:border-emerald-500/50 transition-all">
                      <img src={userProfile.avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-black text-white truncate">{userProfile.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold">
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">ID: 88886666</span>
                      </div>
                      <button 
                        onClick={() => setShowStatusModal(true)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border ${
                          userStatus === 'ONLINE' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                          userStatus === 'PLAYING' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                          userStatus === 'RESTING' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        }`}
                      >
                        <div className={`w-1 h-1 rounded-full ${
                          userStatus === 'ONLINE' ? 'bg-green-400' :
                          userStatus === 'PLAYING' ? 'bg-blue-400' :
                          userStatus === 'RESTING' ? 'bg-yellow-400' :
                          'bg-gray-400'
                        }`} />
                        {userStatus}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Wallet Card */}
                <GlassCard 
                  className="p-6 bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border-emerald-500/30 overflow-hidden relative group cursor-pointer" 
                  onClick={() => navigateTo('WALLET')}
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
                  <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Wallet Balance</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <CoinIcon className="w-6 h-6" />
                          <span className="text-3xl font-black text-white tracking-tight">{wallet?.balance ?? 0}</span>
                        </div>
                        {userRole === 'PLAYER' && (
                          <>
                            <div className="w-px h-8 bg-white/10 mx-2" />
                            <div className="flex items-center gap-2">
                              <Gem className="w-6 h-6 text-emerald-400" />
                              <span className="text-3xl font-black text-white tracking-tight">{userDiamonds}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </GlassCard>

                {/* Main Menu */}
                <div className="space-y-2">
                  
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => navigateTo('PURCHASE_HISTORY')}
                      className="w-full flex items-center justify-between p-5 bg-white/5 rounded-[24px] border border-white/10 hover:bg-white/10 active:scale-[0.99] transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-white">Purchase History</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {userRole === 'PLAYER' ? (
                      <button 
                        onClick={() => navigateTo('PLAYER_CENTER')}
                        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-emerald-600/20 to-transparent rounded-[24px] border border-emerald-500/30 hover:bg-emerald-600/20 active:scale-[0.99] transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <BarChart3 className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-white">Player Center</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigateTo('APPLY_PLAYER')}
                        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-emerald-600/20 to-transparent rounded-[24px] border border-emerald-500/30 hover:bg-emerald-600/20 active:scale-[0.99] transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <Zap className="w-6 h-6 fill-current" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-white">Become a Player</p>
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Earn Diamonds Now</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Secondary Menu */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    {[
                      { icon: Settings, label: 'Settings', color: 'text-gray-400', action: () => navigateTo('SETTINGS') },
                      { icon: UserPlus, label: 'New Users', color: 'text-green-400', action: () => navigateTo('NEW_USERS') },
                      { icon: Ban, label: 'Blacklist', color: 'text-red-400', action: () => navigateTo('SETTINGS_BLACKLIST') },
                      { icon: HelpCircle, label: 'Feedback', color: 'text-blue-400', action: () => navigateTo('FEEDBACK') },
                    ].map((item) => (
                      <button 
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                          <span className="font-bold text-gray-300">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Selection Modal */}
              <AnimatePresence>
                {showStatusModal && (
                  <div className="fixed inset-0 z-[100] flex items-end justify-center px-6 pb-12">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowStatusModal(false)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      className="w-full max-w-md bg-[#1a1225] rounded-[32px] p-6 relative z-10 border border-white/10 shadow-2xl"
                    >
                      <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
                      <h3 className="text-lg font-bold text-white mb-6 text-center">Adjust Status</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: 'ONLINE', label: 'Online', color: 'bg-green-500', icon: <div className="w-2 h-2 rounded-full bg-green-500" /> },
                          { id: 'OFFLINE', label: 'Offline', color: 'bg-gray-500', icon: <div className="w-2 h-2 rounded-full bg-gray-500" /> },
                          { id: 'PLAYING', label: 'Playing', color: 'bg-blue-500', icon: <div className="w-2 h-2 rounded-full bg-blue-500" /> },
                          { id: 'RESTING', label: 'Resting', color: 'bg-yellow-500', icon: <div className="w-2 h-2 rounded-full bg-yellow-500" /> },
                        ].map((status) => (
                          <button
                            key={status.id}
                            onClick={() => {
                              setUserStatus(status.id as any);
                              setShowStatusModal(false);
                            }}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                              userStatus === status.id 
                                ? 'bg-emerald-600/20 border-emerald-500/50 text-white' 
                                : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {status.icon}
                              <span className="font-bold">{status.label}</span>
                            </div>
                            {userStatus === status.id && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => setShowStatusModal(false)}
                        className="w-full py-4 mt-6 bg-white/5 rounded-2xl text-sm font-bold text-gray-400 hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {currentView === 'PURCHASE_HISTORY' && (
            <motion.div 
              key="purchase_history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-6"
            >
              <div className="sticky top-0 z-50 backdrop-blur-md bg-[#07110f]/80 -mx-6 px-6 py-4 border-b border-white/5 flex items-center justify-between relative">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {!isOrderSearchExpanded ? (
                  <>
                    <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">Purchase History</h1>
                    <div className="flex items-center gap-2 relative z-10">
                      <button 
                        onClick={() => setIsOrderSearchExpanded(true)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setShowOrderDatePicker(!showOrderDatePicker)}
                        className={`p-2 rounded-lg transition-all ${showOrderDatePicker ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        <Calendar className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center gap-2 ml-4 relative z-10">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        autoFocus
                        type="text"
                        placeholder={t('phSearchOrders')}
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        setIsOrderSearchExpanded(false);
                        setOrderSearchQuery('');
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {showOrderDatePicker && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Date Range</span>
                        <button 
                          onClick={() => {
                            setOrderStartDate('');
                            setOrderEndDate('');
                          }}
                          className="text-[8px] font-bold text-emerald-400 hover:text-emerald-300 uppercase"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-1">Start Date</label>
                          <button 
                            onClick={() => onOpenDatePicker('ORDER_START', orderStartDate, 'Start Date')}
                            className="w-full bg-[#07110f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white text-left font-bold"
                          >
                            {orderStartDate || 'Select Date'}
                          </button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-1">End Date</label>
                          <button 
                            onClick={() => onOpenDatePicker('ORDER_END', orderEndDate, 'End Date')}
                            className="w-full bg-[#07110f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white text-left font-bold"
                          >
                            {orderEndDate || 'Select Date'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                {['ALL', 'PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED'].map((tab) => (
                  <button 
                    key={`purchase-tab-${tab}`}
                    onClick={() => setOrderTab(tab as any)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      orderTab === tab ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {imOrders.filter(o => {
                  if (o.customerId !== 'me') return false;
                  if (orderTab !== 'ALL' && o.status !== orderTab) return false;
                  if (orderSearchQuery) {
                    const query = orderSearchQuery.toLowerCase();
                    if (!(o.serviceName || o.gameName || '').toLowerCase().includes(query) && !o.id.toLowerCase().includes(query)) return false;
                  }
                  if (orderStartDate || orderEndDate) {
                    const txTime = o.timestamp;
                    const start = orderStartDate ? new Date(orderStartDate).getTime() : 0;
                    const end = orderEndDate ? new Date(orderEndDate).getTime() + 86400000 : Infinity;
                    if (txTime < start || txTime > end) return false;
                  }
                  return true;
                }).length > 0 ? (
                  imOrders.filter(o => {
                    if (o.customerId !== 'me') return false;
                    if (orderTab !== 'ALL' && o.status !== orderTab) return false;
                    if (orderSearchQuery) {
                      const query = orderSearchQuery.toLowerCase();
                      if (!(o.serviceName || o.gameName || '').toLowerCase().includes(query) && !o.id.toLowerCase().includes(query)) return false;
                    }
                    if (orderStartDate || orderEndDate) {
                      const txTime = o.timestamp;
                      const start = orderStartDate ? new Date(orderStartDate).getTime() : 0;
                      const end = orderEndDate ? new Date(orderEndDate).getTime() + 86400000 : Infinity;
                      if (txTime < start || txTime > end) return false;
                    }
                    return true;
                  }).map((order) => {
                    const epal = EPALS.find(e => e.id === order.epalId);
                    return (
                      <div key={`purchase-order-${order.id}`} className="p-5 bg-white/5 rounded-[24px] border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-bold text-white text-lg">{order.serviceName || order.gameName}</p>
                              <p className="text-[10px] text-gray-500 font-medium">{order.createTime || new Date(order.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                            order.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <CoinIcon className="w-4 h-4" />
                            <span className="font-black text-white text-xl">{order.totalPrice || order.price}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {order.status === 'COMPLETED' && order.reviewed && (
                              <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mr-2">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                <span className="text-xs font-black text-yellow-500">{order.reviewRating}.0</span>
                              </div>
                            )}
                            <button 
                              onClick={() => {
                                setSelectedOrder(order);
                                navigateTo('ORDER_DETAIL');
                              }}
                              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                              Details
                            </button>
                            {order.status === 'COMPLETED' && !order.reviewed && order.epalId !== 'me' && (
                              <button 
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setReviewRating(5);
                                  setReviewTags([]);
                                  setReviewFeedback('');
                                  setShowReviewModal(true);
                                }}
                                className="px-4 py-2 bg-emerald-600 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
                              >
                                Rate
                              </button>
                            )}
                            {(order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'ONGOING') && (
                              <button 
                                onClick={() => epal && navigateTo('IM_DETAIL', epal)}
                                className="px-5 py-2 bg-emerald-600 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex items-center gap-2"
                              >
                                <MessageCircle className="w-3 h-3" />
                                Chat
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-40">
                    <FileText className="w-16 h-16" />
                    <p className="font-bold">No orders found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentView === 'PLAYER_ORDERS' && (
            <motion.div 
              key="player_orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-6"
            >
              <div className="sticky top-0 z-50 backdrop-blur-md bg-[#07110f]/80 -mx-6 px-6 py-4 border-b border-white/5 flex items-center justify-between relative">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {!isOrderSearchExpanded ? (
                  <>
                    <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">My Order</h1>
                    <div className="flex items-center gap-2 relative z-10">
                      <button 
                        onClick={() => setIsOrderSearchExpanded(true)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setShowOrderDatePicker(!showOrderDatePicker)}
                        className={`p-2 rounded-lg transition-all ${showOrderDatePicker ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        <Calendar className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center gap-2 ml-4 relative z-10">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        autoFocus
                        type="text"
                        placeholder={t('phSearchOrders')}
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        setIsOrderSearchExpanded(false);
                        setOrderSearchQuery('');
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {showOrderDatePicker && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Date Range</span>
                        <button 
                          onClick={() => {
                            setOrderStartDate('');
                            setOrderEndDate('');
                          }}
                          className="text-[8px] font-bold text-emerald-400 hover:text-emerald-300 uppercase"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Start Date</label>
                          <button 
                            onClick={() => onOpenDatePicker('ORDER_START', orderStartDate, 'Start Date')}
                            className="w-full bg-[#07110f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white text-left font-bold"
                          >
                            {orderStartDate || 'Select Date'}
                          </button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">End Date</label>
                          <button 
                            onClick={() => onOpenDatePicker('ORDER_END', orderEndDate, 'End Date')}
                            className="w-full bg-[#07110f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white text-left font-bold"
                          >
                            {orderEndDate || 'Select Date'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                {['ALL', 'PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED'].map((tab) => (
                  <button 
                    key={`player-tab-${tab}`}
                    onClick={() => setOrderTab(tab as any)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      orderTab === tab ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {imOrders.filter(o => {
                  if (o.epalId !== 'me') return false;
                  if (orderTab !== 'ALL' && o.status !== orderTab) return false;
                  if (orderSearchQuery) {
                    const query = orderSearchQuery.toLowerCase();
                    if (!(o.serviceName || o.gameName || '').toLowerCase().includes(query) && !o.id.toLowerCase().includes(query)) return false;
                  }
                  if (orderStartDate || orderEndDate) {
                    const txTime = o.timestamp;
                    const start = orderStartDate ? new Date(orderStartDate).getTime() : 0;
                    const end = orderEndDate ? new Date(orderEndDate).getTime() + 86400000 : Infinity;
                    if (txTime < start || txTime > end) return false;
                  }
                  return true;
                }).length > 0 ? (
                  imOrders.filter(o => {
                    if (o.epalId !== 'me') return false;
                    if (orderTab !== 'ALL' && o.status !== orderTab) return false;
                    if (orderSearchQuery) {
                      const query = orderSearchQuery.toLowerCase();
                      if (!(o.serviceName || o.gameName || '').toLowerCase().includes(query) && !o.id.toLowerCase().includes(query)) return false;
                    }
                    if (orderStartDate || orderEndDate) {
                      const txTime = o.timestamp;
                      const start = orderStartDate ? new Date(orderStartDate).getTime() : 0;
                      const end = orderEndDate ? new Date(orderEndDate).getTime() + 86400000 : Infinity;
                      if (txTime < start || txTime > end) return false;
                    }
                    return true;
                  }).map((order) => {
                    return (
                      <div key={`player-order-${order.id}`} className="p-5 bg-white/5 rounded-[24px] border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-bold text-white text-lg">{order.serviceName || order.gameName}</p>
                              <p className="text-[10px] text-gray-500 font-medium">{order.createTime || new Date(order.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                            order.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <CoinIcon className="w-4 h-4" />
                            <span className="font-black text-white text-xl">{order.totalPrice || order.price}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {order.status === 'COMPLETED' && order.reviewed && (
                              <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mr-2">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                <span className="text-xs font-black text-yellow-500">{order.reviewRating}.0</span>
                              </div>
                            )}
                            <button 
                              onClick={() => {
                                setSelectedOrder(order);
                                navigateTo('ORDER_DETAIL');
                              }}
                              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                              Details
                            </button>
                            {(order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'ONGOING') && (
                              <button 
                                onClick={() => navigateTo('IM_DETAIL', { id: 'me', name: 'Customer' } as any)}
                                className="px-5 py-2 bg-emerald-600 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex items-center gap-2"
                              >
                                <MessageCircle className="w-3 h-3" />
                                Chat
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-40">
                    <FileText className="w-16 h-16" />
                    <p className="font-bold">No orders found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentView === 'ORDER_DETAIL' && selectedOrder && (
            <motion.div 
              key="order_detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen bg-[#07110f] p-6 space-y-6"
            >
              <div className="sticky top-0 z-50 backdrop-blur-md bg-[#07110f]/80 -mx-6 px-6 py-4 border-b border-white/5 flex items-center justify-between relative">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">Order Details</h1>
                <div className="w-10" />
              </div>

              <GlassCard className="p-6 space-y-6">
                {/* Header: Service Info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 flex items-center justify-center shrink-0">
                    <Gamepad2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black text-white truncate">{selectedOrder.serviceName || selectedOrder.gameName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">ID: {selectedOrder.id}</span>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        selectedOrder.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                        selectedOrder.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Other Party Section */}
                {(() => {
                  const isFromPlayerOrders = viewHistory[viewHistory.length - 2] === 'PLAYER_ORDERS';
                  const otherParty = isFromPlayerOrders 
                    ? { 
                        id: selectedOrder.customerId || 'customer_1', 
                        name: selectedOrder.customerName || 'GamerPro99', 
                        avatarUrl: selectedOrder.customerAvatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1974&auto=format&fit=crop', 
                        rating: 5.0, 
                        tags: ['Customer'],
                        bio: 'Regular customer who loves gaming.',
                        voiceUrl: '',
                        coverUrl: 'https://picsum.photos/seed/gamer-cover/800/1200',
                        coverIntro: 'Always looking for a good duo!',
                        price: 0,
                        unit: 'hr',
                        services: []
                      } as any
                    : EPALS.find(e => e.id === selectedOrder.epalId);

                  return (
                    <div className="pt-6 border-t border-white/5">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                        {isFromPlayerOrders ? 'Customer' : 'E-Pal'}
                      </p>
                      <button 
                        onClick={() => otherParty && navigateTo('PROFILE', otherParty)}
                        className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 group-hover:border-emerald-500/50 transition-all">
                            <img 
                              src={otherParty?.avatarUrl || 'https://picsum.photos/seed/user/200'} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">{otherParty?.name || 'User'}</p>
                            <p className="text-[10px] text-gray-500 font-medium">View Profile</p>
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-gray-600 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  );
                })()}

                {/* Order Info */}
                <div className="pt-6 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Order Time</span>
                    <span className="text-xs font-bold text-white">{new Date(selectedOrder.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Unit Price</span>
                    <div className="flex items-center gap-1.5">
                      <CoinIcon className="w-3 h-3" />
                      <span className="text-xs font-bold text-white">{selectedOrder.unitPrice || selectedOrder.price}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Quantity</span>
                    <span className="text-xs font-bold text-white">x{selectedOrder.quantity || 1}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Discount</span>
                    <span className="text-xs font-bold text-green-400">-{selectedOrder.discount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-xs font-black text-white uppercase tracking-widest">Total Amount</span>
                    <div className="flex items-center gap-2">
                      <CoinIcon className="w-4 h-4" />
                      <span className="text-xl font-black text-white">{selectedOrder.totalPrice || selectedOrder.price}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Review Result Section - Moved outside GlassCard to be "below" */}
              {selectedOrder.reviewed && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Review Result</p>
                  <div className="p-6 bg-white/5 rounded-[32px] border border-white/10 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={`order-detail-${selectedOrder.id}-star-${star}`} 
                            className={`w-4 h-4 ${star <= (selectedOrder.reviewRating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-700'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-sm font-black text-white">{selectedOrder.reviewRating}.0</span>
                    </div>
                    {selectedOrder.reviewTags && selectedOrder.reviewTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.reviewTags.map((tag, idx) => (
                          <span key={`order-detail-${selectedOrder.id}-tag-${tag}-${idx}`} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedOrder.reviewFeedback && (
                      <p className="text-sm text-gray-300 leading-relaxed italic">"{selectedOrder.reviewFeedback}"</p>
                    )}
                  </div>
                </div>
              )}

              {selectedOrder.status === 'PENDING' && (
                <div className="space-y-3">
                  {(() => {
                    const relevantPlaylink = myPlaylinks.find(pl => 
                      selectedOrder.serviceName.toLowerCase().includes(pl.gameName.toLowerCase())
                    );
                    const epal = EPALS.find(e => e.id === selectedOrder.epalId) || 
                                 EPALS.find(e => e.id === selectedOrder.customerId);
                    
                    return (
                      <button 
                        onClick={() => {
                          if (epal) {
                            if (relevantPlaylink) {
                              const newMsg: Message = {
                                id: Math.random().toString(),
                                senderId: 'me',
                                receiverId: epal.id,
                                content: `Check out my ${relevantPlaylink.gameName} Playlink!`,
                                timestamp: Date.now(),
                                type: 'playlink',
                                playlinkId: relevantPlaylink.id
                              };
                              setCurrentMessages(prev => [...prev, newMsg]);
                            }
                            navigateTo('IM_DETAIL', epal);
                          }
                        }}
                        className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                      >
                        <Link className="w-4 h-4" />
                        {relevantPlaylink ? 'Send Playlink' : 'Contact Party'}
                      </button>
                    );
                  })()}
                  <button 
                    onClick={() => {
                      setImOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'CANCELLED' } : o));
                      handleBack();
                    }}
                    className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel Order
                  </button>
                </div>
              )}

              {selectedOrder.status === 'COMPLETED' && !selectedOrder.reviewed && selectedOrder.epalId !== 'me' && (
                <button 
                  onClick={() => {
                    setReviewRating(5);
                    setReviewTags([]);
                    setReviewFeedback('');
                    setShowReviewModal(true);
                  }}
                  className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Rate this service
                </button>
              )}
            </motion.div>
          )}

          {currentView === 'RECHARGE' && (
            <motion.div 
              key="recharge"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20"
            >
              <RechargeView 
                packages={rechargePackages}
                onSelect={handleRecharge}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {currentView === 'APPLY_PLAYER' && (
            <motion.div 
              key="apply_player"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen bg-[#07110f] flex flex-col"
            >
              <div className="sticky top-0 z-50 backdrop-blur-md bg-[#07110f]/80 p-6 flex items-center gap-4 border-b border-white/5">
                <button 
                  onClick={() => {
                    if (playerApplicationStep > 1) {
                      setPlayerApplicationStep(prev => prev - 1);
                    } else {
                      handleBack();
                    }
                  }} 
                  className="p-2 bg-white/5 rounded-xl border border-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <h1 className="text-xl font-bold">{isEditingService ? 'Edit Service' : 'Become a Player'}</h1>
                  {!isEditingService && (
                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Step {playerApplicationStep} of 4</p>
                  )}
                </div>
              </div>
              <div className="p-6 space-y-6 flex-1 overflow-y-auto pb-20">

                {/* Progress Bar */}
                {!isEditingService && (
                  <div className="flex gap-2 h-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div 
                        key={step}
                        className={`flex-1 rounded-full transition-all duration-500 ${
                          step <= playerApplicationStep ? 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {playerApplicationStatus === 'PENDING' ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6 text-center">
                    <div className="w-24 h-24 rounded-[40px] bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                      <History className="w-12 h-12 text-emerald-400 animate-spin-slow" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-white">Application Pending</h2>
                      <p className="text-sm text-gray-500 max-w-[280px] mx-auto">
                        Our team is reviewing your application. This usually takes 24-48 hours. We'll notify you once approved!
                      </p>
                    </div>
                    <button 
                      onClick={handleBack}
                      className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/10 transition-all"
                    >
                      Back to Profile
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Step 1: Select Category */}
                    {playerApplicationStep === 1 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black text-white">Choose Your Game</h2>
                          <p className="text-sm text-gray-500">
                            Select the main game you want to provide services for.
                          </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input 
                            type="text"
                            placeholder={t('phSearchGames')}
                            value={applyGameSearchQuery}
                            onChange={(e) => setApplyGameSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                          />
                        </div>

                        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                          {[
                            { id: 'GAMES', label: 'Games' },
                            { id: 'CHILLING', label: 'Chill' }
                          ].map((tab) => (
                            <button 
                              key={tab.id}
                              onClick={() => setSelectedApplyGameCategory(tab.id)}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                selectedApplyGameCategory === tab.id ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-8">
                          {Object.entries(
                            GAMES
                              .filter(game => 
                                game.category === selectedApplyGameCategory && 
                                game.name.toLowerCase().includes(applyGameSearchQuery.toLowerCase())
                              )
                              .reduce((acc, game) => {
                                const firstLetter = game.name[0].toUpperCase();
                                if (!acc[firstLetter]) acc[firstLetter] = [];
                                acc[firstLetter].push(game);
                                return acc;
                              }, {} as Record<string, Game[]>)
                          )
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([letter, games]) => (
                            <div key={`apply-game-selector-letter-${letter}`} className="space-y-2">
                              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-2">{letter}</p>
                              <div className="space-y-1">
                                {games.sort((a, b) => a.name.localeCompare(b.name)).map(game => (
                                  <button
                                    key={`apply-game-selector-option-${game.id}`}
                                    onClick={() => {
                                      setPlayerApplicationData(prev => ({ ...prev, gameId: game.id }));
                                    }}
                                    className={`w-full py-4 px-4 flex items-center gap-4 rounded-2xl border transition-all group ${
                                      playerApplicationData.gameId === game.id 
                                        ? 'bg-emerald-600/20 border-emerald-500/50' 
                                        : 'bg-transparent border-transparent hover:bg-white/5'
                                    }`}
                                  >
                                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-2xl shrink-0">
                                      <img src={game.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <p className={`text-base font-bold transition-colors ${
                                        playerApplicationData.gameId === game.id ? 'text-white' : 'text-gray-300'
                                      }`}>{game.name}</p>
                                    </div>
                                    {playerApplicationData.gameId === game.id && (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Configuration */}
                    {playerApplicationStep === 2 && (
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black text-white">Game Configuration</h2>
                          <p className="text-sm text-gray-500">
                            Configure your {GAMES.find(g => g.id === playerApplicationData.gameId)?.name} details.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {GAMES.find(g => g.id === playerApplicationData.gameId)?.hasRank && (
                            <button 
                              onClick={() => setShowApplySelectionModal({
                                show: true,
                                type: 'RANK',
                                title: 'Select Rank',
                                options: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master']
                              })}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                              <div className="text-left">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Rank</p>
                                <p className={`text-sm font-bold ${playerApplicationData.rank ? 'text-white' : 'text-gray-600'}`}>
                                  {playerApplicationData.rank || 'Select Rank'}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                            </button>
                          )}

                          {GAMES.find(g => g.id === playerApplicationData.gameId)?.hasMain && (
                            <button 
                              onClick={() => setShowApplySelectionModal({
                                show: true,
                                type: 'MAIN',
                                title: 'Select Position',
                                options: ['Top', 'Jungle', 'Mid', 'ADC', 'Support']
                              })}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                              <div className="text-left">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Main Position</p>
                                <p className={`text-sm font-bold ${playerApplicationData.mainPosition ? 'text-white' : 'text-gray-600'}`}>
                                  {playerApplicationData.mainPosition || 'Select Position'}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                            </button>
                          )}

                          {GAMES.find(g => g.id === playerApplicationData.gameId)?.hasServer && (
                            <button 
                              onClick={() => setShowApplySelectionModal({
                                show: true,
                                type: 'SERVER',
                                title: 'Select Server',
                                options: ['NA', 'EUW', 'EUNE', 'SEA', 'KR', 'JP']
                              })}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                              <div className="text-left">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Server</p>
                                <p className={`text-sm font-bold ${playerApplicationData.server ? 'text-white' : 'text-gray-600'}`}>
                                  {playerApplicationData.server || 'Select Server'}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                            </button>
                          )}

                          {GAMES.find(g => g.id === playerApplicationData.gameId)?.hasPlatform && (
                            <button 
                              onClick={() => setShowApplySelectionModal({
                                show: true,
                                type: 'PLATFORM',
                                title: 'Select Platform',
                                options: ['PC', 'PS4/5', 'Xbox', 'Mobile', 'Switch']
                              })}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                              <div className="text-left">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Platform</p>
                                <p className={`text-sm font-bold ${playerApplicationData.platform ? 'text-white' : 'text-gray-600'}`}>
                                  {playerApplicationData.platform || 'Select Platform'}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                            </button>
                          )}

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Style</p>
                            <input 
                              type="text"
                              placeholder={t('phPlayStyle')}
                              value={playerApplicationData.style}
                              onChange={(e) => setPlayerApplicationData(prev => ({ ...prev, style: e.target.value }))}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                            />
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Introduction</p>
                            <textarea 
                              placeholder={t('phIntro')}
                              rows={4}
                              value={playerApplicationData.intro}
                              onChange={(e) => setPlayerApplicationData(prev => ({ ...prev, intro: e.target.value }))}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all resize-none"
                            />
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Game Screenshot</p>
                            <div className="space-y-3">
                              {playerApplicationData.screenshots.length > 0 ? (
                                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 relative">
                                  <img src={playerApplicationData.screenshots[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <button 
                                    onClick={() => setPlayerApplicationData(prev => ({ ...prev, screenshots: [] }))}
                                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-xl text-white backdrop-blur-md"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setPlayerApplicationData(prev => ({ ...prev, screenshots: ['https://picsum.photos/seed/' + Math.random() + '/1280/720'] }))}
                                  className="w-full aspect-video rounded-2xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center gap-3 text-gray-500 hover:bg-white/10 transition-all"
                                >
                                  <Camera className="w-8 h-8" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Add Game Screenshot</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Voice & Cover */}
                    {playerApplicationStep === 3 && (
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black text-white">Voice & Cover</h2>
                          <p className="text-sm text-gray-500">
                            Make your profile stand out with a voice recording and a great cover.
                          </p>
                        </div>

                        <div className="space-y-8">
                          <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Voice Recording</p>
                            <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] flex flex-col items-center gap-6 min-h-[240px] justify-center">
                              <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center relative shrink-0">
                                {isRecording && (
                                  <motion.div 
                                    initial={{ scale: 1, opacity: 0.5 }}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                    className="absolute inset-0 rounded-full bg-emerald-600" 
                                  />
                                )}
                                <Mic2 className={`w-8 h-8 relative z-10 ${isRecording ? 'text-white' : 'text-emerald-400'}`} />
                              </div>
                              
                              <div className="text-center space-y-1 h-16 flex flex-col justify-center">
                                {isRecording ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="text-2xl font-black text-white tabular-nums">
                                      0:{recordingTime.toString().padStart(2, '0')}
                                    </span>
                                    <div className="flex gap-2 h-3 items-center">
                                      {[1, 2, 3, 4, 5].map(i => (
                                        <motion.div
                                          key={`wave-${i}`}
                                          animate={{ height: [4, 12, 4] }}
                                          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                          className="w-1 bg-emerald-500 rounded-full"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm font-bold text-white">
                                      {playerApplicationData.voiceUrl ? 'Greeting Recorded' : 'Record your greeting'}
                                    </p>
                                    <p className="text-[10px] text-gray-500">Max 30 seconds</p>
                                  </>
                                )}
                              </div>

                              <div className="flex flex-col w-full gap-3">
                                {!isRecording && !playerApplicationData.voiceUrl && (
                                  <button 
                                    onClick={() => {
                                      setIsRecording(true);
                                      setRecordingTime(0);
                                      const timer = setInterval(() => {
                                        setRecordingTime(prev => {
                                          if (prev >= 30) {
                                            clearInterval(timer);
                                            setIsRecording(false);
                                            setPlayerApplicationData(p => ({ ...p, voiceUrl: 'https://example.com/voice.mp3' }));
                                            return 30;
                                          }
                                          return prev + 1;
                                        });
                                      }, 1000);
                                      (window as any).recordingTimer = timer;
                                    }}
                                    className="w-full py-4 bg-emerald-600 rounded-2xl font-black text-white text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                  >
                                    Start Recording
                                  </button>
                                )}

                                {isRecording && (
                                  <div className="flex gap-3">
                                    <button 
                                      onClick={() => {
                                        clearInterval((window as any).recordingTimer);
                                        setIsRecording(false);
                                        setRecordingTime(0);
                                      }}
                                      className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-gray-400 text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={() => {
                                        clearInterval((window as any).recordingTimer);
                                        setIsRecording(false);
                                        setPlayerApplicationData(p => ({ ...p, voiceUrl: 'https://example.com/voice.mp3' }));
                                      }}
                                      className="flex-1 py-4 bg-green-600 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                    >
                                      Done
                                    </button>
                                  </div>
                                )}

                                {!isRecording && playerApplicationData.voiceUrl && (
                                  <div className="flex gap-3">
                                    <button 
                                      onClick={() => {
                                        setPlayerApplicationData(p => ({ ...p, voiceUrl: '' }));
                                        setIsRecording(true);
                                        setRecordingTime(0);
                                        const timer = setInterval(() => {
                                          setRecordingTime(prev => {
                                            if (prev >= 30) {
                                              clearInterval(timer);
                                              setIsRecording(false);
                                              setPlayerApplicationData(p => ({ ...p, voiceUrl: 'https://example.com/voice.mp3' }));
                                              return 30;
                                            }
                                            return prev + 1;
                                          });
                                        }, 1000);
                                        (window as any).recordingTimer = timer;
                                      }}
                                      className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-emerald-400 text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                      Re-record
                                    </button>
                                    <div className="flex-1 py-4 bg-green-600/20 border border-green-500/30 rounded-2xl flex items-center justify-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Saved</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Cover Image</p>
                            <button 
                              onClick={() => setPlayerApplicationData(prev => ({ ...prev, coverUrl: 'https://picsum.photos/seed/cover/800/1200' }))}
                              className="w-full aspect-[3/4] bg-white/5 border border-dashed border-white/20 rounded-[32px] overflow-hidden flex flex-col items-center justify-center gap-3 group relative"
                            >
                              {playerApplicationData.coverUrl ? (
                                <>
                                  <img src={playerApplicationData.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-white" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                    <Camera className="w-6 h-6 text-gray-500" />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs font-bold text-white">Upload Cover</p>
                                    <p className="text-[10px] text-gray-500">Portrait recommended</p>
                                  </div>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Cover Intro</p>
                            <input 
                              type="text"
                              placeholder={t('phCoverIntro')}
                              value={playerApplicationData.coverIntro}
                              onChange={(e) => setPlayerApplicationData(prev => ({ ...prev, coverIntro: e.target.value }))}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Service & Promotion */}
                    {playerApplicationStep === 4 && (
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black text-white">Service & Pricing</h2>
                          <p className="text-sm text-gray-500">
                            Configure one or more services for this game.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {(playerApplicationData.services || []).map((service, index) => (
                            <GlassCard key={`apply-service-card-${index}`} className="p-5 flex items-center justify-between border-white/10 hover:border-emerald-500/30 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                  <Gamepad2 className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-white font-black text-sm uppercase tracking-tight">{service.serviceName}</p>
                                  <div className="flex items-center gap-1">
                                    <span className="text-lg font-black text-white">{service.price}</span>
                                    <CoinIcon className="w-3.5 h-3.5" />
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">/ {service.unit}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    setServiceForm(service);
                                    setEditingServiceIndex(index);
                                    navigateTo('APPLY_PLAYER_SERVICE_FORM');
                                  }}
                                  className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm(t('confirmDeleteService'))) {
                                      setPlayerApplicationData(prev => ({
                                        ...prev,
                                        services: prev.services.filter((_, i) => i !== index)
                                      }));
                                    }
                                  }}
                                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </GlassCard>
                          ))}
                        </div>

                        <button 
                          onClick={() => {
                            setServiceForm({
                              serviceName: '',
                              price: 0,
                              unit: 'game',
                              promotion: {
                                type: 'NONE',
                                value: 0,
                                buyX: 0,
                                getY: 0,
                                limitType: 'NONE',
                                startDate: '',
                                endDate: '',
                                limitValue: 0
                              }
                            });
                            setEditingServiceIndex(null);
                            navigateTo('APPLY_PLAYER_SERVICE_FORM');
                          }}
                          className="w-full p-5 bg-white/5 border border-dashed border-white/20 rounded-2xl text-gray-500 font-bold hover:border-emerald-500/50 hover:text-emerald-400 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          <span>{t('addServiceBtn')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              {playerApplicationStatus !== 'PENDING' && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#07110f]/80 backdrop-blur-xl border-t border-white/10 z-50">
                  {playerApplicationStep < 4 ? (
                    <button 
                      onClick={() => setPlayerApplicationStep(prev => prev + 1)}
                      disabled={(() => {
                        if (playerApplicationStep === 1) return !playerApplicationData.gameId;
                        if (playerApplicationStep === 2) {
                          const game = GAMES.find(g => g.id === playerApplicationData.gameId);
                          if (game?.hasRank && !playerApplicationData.rank) return true;
                          if (game?.hasMain && !playerApplicationData.mainPosition) return true;
                          if (game?.hasServer && !playerApplicationData.server) return true;
                          if (game?.hasPlatform && !playerApplicationData.platform) return true;
                          if (!playerApplicationData.style || !playerApplicationData.intro) return true;
                          if (playerApplicationData.screenshots.length === 0) return true;
                          return false;
                        }
                        if (playerApplicationStep === 3) {
                          return !playerApplicationData.coverUrl || !playerApplicationData.coverIntro || !playerApplicationData.voiceUrl;
                        }
                        return false;
                      })()}
                      className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all uppercase tracking-widest text-xs"
                    >
                      Next Step
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        if (playerApplicationStatus === 'APPROVED') {
                          const gameName = GAMES.find(g => g.id === playerApplicationData.gameId)?.name || '';
                          setPlayerServices(prev => {
                            const otherServices = prev.filter(s => s.name !== gameName);
                            const newServicesForGame = playerApplicationData.services.map((s, i) => ({
                              id: `${playerApplicationData.gameId}_${i}_${Date.now()}`,
                              name: gameName,
                              coverName: playerApplicationData.coverIntro,
                              coverUrl: playerApplicationData.coverUrl,
                              voiceUrl: playerApplicationData.voiceUrl,
                              price: s.price,
                              unit: s.unit,
                              rating: 5.0,
                              reviews: 0,
                              status: 'ONLINE',
                              orders: 0
                            }));
                            return [...otherServices, ...newServicesForGame];
                          });
                          alert(t('alertServiceUpdated'));
                          handleBack();
                        } else {
                          setPlayerApplicationStatus('PENDING');
                          alert(t('alertApplicationSubmitted'));
                        }
                      }}
                      disabled={(() => {
                        if (playerApplicationStep === 4) {
                          return playerApplicationData.services.length === 0;
                        }
                        if (!playerApplicationData.serviceName || !playerApplicationData.price) return true;
                        if (playerApplicationData.promotion.type !== 'NONE') {
                          if (playerApplicationData.promotion.type === 'BUY_X_GET_Y') {
                            if (!playerApplicationData.promotion.buyX || !playerApplicationData.promotion.getY) return true;
                          } else {
                            if (!playerApplicationData.promotion.value) return true;
                          }
                          if (playerApplicationData.promotion.limitType !== 'NONE' && !playerApplicationData.promotion.limitValue) return true;
                        }
                        return false;
                      })()}
                      className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all uppercase tracking-widest text-xs"
                    >
                      {playerApplicationStatus === 'APPROVED' ? 'Update Service' : 'Submit Application'}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Selection Modal for Player Application */}
          <AnimatePresence>
            {showApplySelectionModal.show && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
              >
                <div 
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  onClick={() => setShowApplySelectionModal(prev => ({ ...prev, show: false }))}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  className="relative w-full max-w-md bg-[#0c1714] rounded-t-[40px] sm:rounded-[40px] border-t sm:border border-white/10 overflow-hidden shadow-2xl"
                >
                  <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black text-white">{showApplySelectionModal.title}</h2>
                      <button 
                        onClick={() => setShowApplySelectionModal(prev => ({ ...prev, show: false }))}
                        className="p-2 bg-white/5 rounded-xl border border-white/10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {showApplySelectionModal.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            const type = showApplySelectionModal.type;
                            setPlayerApplicationData(prev => ({
                              ...prev,
                              rank: type === 'RANK' ? option : prev.rank,
                              mainPosition: type === 'MAIN' ? option : prev.mainPosition,
                              server: type === 'SERVER' ? option : prev.server,
                              platform: type === 'PLATFORM' ? option : prev.platform,
                            }));
                            setShowApplySelectionModal(prev => ({ ...prev, show: false }));
                          }}
                          className={`w-full p-5 rounded-2xl text-left border transition-all flex items-center justify-between group ${
                            (showApplySelectionModal.type === 'RANK' && playerApplicationData.rank === option) ||
                            (showApplySelectionModal.type === 'MAIN' && playerApplicationData.mainPosition === option) ||
                            (showApplySelectionModal.type === 'SERVER' && playerApplicationData.server === option) ||
                            (showApplySelectionModal.type === 'PLATFORM' && playerApplicationData.platform === option)
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <span className="font-bold">{option}</span>
                          {((showApplySelectionModal.type === 'RANK' && playerApplicationData.rank === option) ||
                            (showApplySelectionModal.type === 'MAIN' && playerApplicationData.mainPosition === option) ||
                            (showApplySelectionModal.type === 'SERVER' && playerApplicationData.server === option) ||
                            (showApplySelectionModal.type === 'PLATFORM' && playerApplicationData.platform === option)) && (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {currentView === 'APPLY_PLAYER_CATEGORY' && (
            <motion.div 
              key="apply_player_category"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-bold">Select Category</h1>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white">Service Category</h2>
                  <p className="text-sm text-gray-500">What kind of service will you provide for {selectedGame?.name}?</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {['Ranked Carry', 'Normal Play', 'Coaching', 'Leveling', 'Fun & Casual'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedServiceCategory(cat);
                        navigateTo('APPLY_PLAYER_DETAILS');
                      }}
                      className={`w-full p-6 rounded-[24px] border transition-all flex items-center justify-between group ${
                        selectedServiceCategory === cat 
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-white' 
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-bold text-lg">{cat}</span>
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'APPLY_PLAYER_DETAILS' && (
            <motion.div 
              key="apply_player_details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-bold">Service Details</h1>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Rank / Level</p>
                  <input 
                    type="text" 
                    value={applicationDetails.rank}
                    onChange={(e) => setApplicationDetails(prev => ({ ...prev, rank: e.target.value }))}
                    placeholder={t('phRank')}
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Platform</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['PC', 'Mobile', 'Console'].map(p => (
                      <button
                        key={`apply-platform-choice-${p}`}
                        onClick={() => setApplicationDetails(prev => ({ ...prev, platform: p }))}
                        className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                          applicationDetails.platform === p 
                            ? 'bg-emerald-600 border-emerald-500 text-white' 
                            : 'bg-white/5 border-white/10 text-gray-500'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Style</p>
                  <input 
                    type="text" 
                    value={applicationDetails.style}
                    onChange={(e) => setApplicationDetails(prev => ({ ...prev, style: e.target.value }))}
                    placeholder={t('phAggressiveChill')}
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Price (Coins/hr)</p>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={applicationDetails.price}
                        onChange={(e) => setApplicationDetails(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="e.g. 5"
                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <CoinIcon />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Discount (%)</p>
                    <input 
                      type="number" 
                      value={applicationDetails.discount}
                      onChange={(e) => setApplicationDetails(prev => ({ ...prev, discount: e.target.value }))}
                      placeholder="e.g. 10"
                      className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setPlayerApplicationStatus('PENDING');
                  navigateTo('APPLY_PLAYER');
                }}
                className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Submit Application
              </button>
            </motion.div>
          )}

          {currentView === 'SETTINGS' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
            >
              <div className="flex items-center justify-between relative">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">{t('settings')}</h1>
                <div className="w-10" />
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Account</p>
                  <div className="space-y-1">
                    <button 
                      onClick={() => navigateTo('SETTINGS_EDIT_PROFILE')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-300">Edit Profile</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => navigateTo('SETTINGS_CHANGE_PASSWORD')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <span className="font-bold text-gray-300">Change Password</span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => navigateTo('SETTINGS_LINKED_ACCOUNTS')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <span className="font-bold text-gray-300">Linked Accounts</span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">General</p>
                  <div className="space-y-1">
                    <button 
                      onClick={() => navigateTo('SETTINGS_LANGUAGE')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <span className="font-bold text-gray-300">{t('language')}</span>
                      <div className="flex items-center gap-2">
                        <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${selectedLanguage === 'Arabic' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                      </div>
                    </button>
                    <button 
                      onClick={() => navigateTo('SETTINGS_NOTIFICATIONS')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <span className="font-bold text-gray-300">Notifications</span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setIsClearCacheConfirmOpen(true)}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <span className="font-bold text-gray-300">Clear Cache</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-600">{cacheSize}</span>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">About</p>
                  <div className="space-y-1">
                    <button 
                      onClick={() => navigateTo('SETTINGS_PRIVACY')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <span className="font-bold text-gray-300">Privacy Policy</span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => navigateTo('SETTINGS_TERMS')}
                      className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <span className="font-bold text-gray-300">Terms of Service</span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <div className="w-full flex items-center justify-between p-5">
                      <span className="font-bold text-gray-300">Version</span>
                      <span className="text-[10px] font-bold text-gray-600">v1.2.0 (MVP)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <button className="w-full flex items-center justify-center gap-2 p-5 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400 font-bold hover:bg-red-500/20 active:scale-[0.98] transition-all">
                    <LogOut className="w-5 h-5" />
                    <span>{t('logoutAccount')}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'RANKING_CENTER' && (
            <AnimatePresence mode="wait">
              {!showRankingRules ? (
                <motion.div 
                  key="ranking_dashboard"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between relative">
                    <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                      <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                    </button>
                    <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
                      <h1 className="text-xl font-bold uppercase tracking-tight whitespace-nowrap">Ranking & Growth</h1>
                      <button onClick={() => setShowRankingRules(true)} className="text-gray-500 hover:text-white transition-colors">
                        <HelpCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="w-10" />
                  </div>

                  {/* Suspension Warning */}
                  {playerRanking.status === 'SUSPENDED' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">Qualification Suspended</p>
                        <p className="text-[10px] text-red-400 font-medium">You have stayed in L1 for 4 consecutive weeks. Please contact support to reapply.</p>
                      </div>
                    </div>
                  )}

                  {/* Level & Retention Summary Card */}
                  <GlassCard className="p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/20 blur-3xl rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-4xl font-black text-white italic tracking-tighter">LV. {playerRanking.level}</h2>
                        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                          <Trophy className="w-8 h-8" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(playerRanking.score / (playerRanking.nextLevelThreshold || playerRanking.score)) * 100}%` }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-pink-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-gray-400">Current Score: {playerRanking.score}</span>
                          <span className="text-emerald-400">Next Level: {playerRanking.nextLevelThreshold || 'MAX'}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold text-center mt-2">
                          Must keep score ≥ {playerRanking.retainThreshold} to remain LV. {playerRanking.level}
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Detailed Score Tabs */}
                  <div className="space-y-6">
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                      <button 
                        onClick={() => setRankingTab('ACTIVITY')}
                        className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          rankingTab === 'ACTIVITY' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        Activity Score
                        <HelpCircle className="w-3 h-3 opacity-50" onClick={(e) => { e.stopPropagation(); setShowRankingRules(true); }} />
                      </button>
                      <button 
                        onClick={() => setRankingTab('SERVICE')}
                        className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          rankingTab === 'SERVICE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        Service Score
                        <HelpCircle className="w-3 h-3 opacity-50" onClick={(e) => { e.stopPropagation(); setShowRankingRules(true); }} />
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {rankingTab === 'ACTIVITY' ? (
                        <motion.div 
                          key="activity_grid"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="grid grid-cols-2 gap-4"
                        >
                          <ScoreMetricCard 
                            icon={Calendar} 
                            label={t('lbDailyLogin')} 
                            value={`${playerRanking.weeklyStats.logins}/5`} 
                            color="text-blue-400" 
                            onHelp={() => setShowRankingRules(true)}
                          />
                          <ScoreMetricCard 
                            icon={MessageSquare} 
                            label={t('lbPosting')} 
                            value={`${playerRanking.weeklyStats.posts}/3`} 
                            color="text-blue-400" 
                            onHelp={() => setShowRankingRules(true)}
                          />
                          <ScoreMetricCard 
                            icon={Users} 
                            label={t('lbNewUserGreeting')} 
                            value={`${playerRanking.weeklyStats.greetings}/25`} 
                            color="text-blue-400" 
                            onHelp={() => setShowRankingRules(true)}
                          />
                          <ScoreMetricCard 
                            icon={Clock} 
                            label={t('lbResponseRate')} 
                            value={`${playerRanking.weeklyStats.responseRate}% → ${playerRanking.weeklyStats.responseRate >= 90 ? 35 : playerRanking.weeklyStats.responseRate >= 75 ? 20 : playerRanking.weeklyStats.responseRate >= 60 ? 5 : 0} pts`} 
                            color="text-blue-400" 
                            onHelp={() => setShowRankingRules(true)}
                          />
                          <ScoreMetricCard 
                            icon={MousePointer2} 
                            label={t('lbOrderAcceptRate')} 
                            value={`${playerRanking.weeklyStats.acceptanceRate}% → ${playerRanking.weeklyStats.acceptanceRate >= 90 ? 35 : playerRanking.weeklyStats.acceptanceRate >= 75 ? 20 : playerRanking.weeklyStats.acceptanceRate >= 60 ? 5 : 0} pts`} 
                            color="text-blue-400" 
                            className="col-span-2"
                            onHelp={() => setShowRankingRules(true)}
                          />
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="service_grid"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="grid grid-cols-2 gap-4"
                        >
                          <ScoreMetricCard 
                            icon={Users} 
                            label={t('lbNewUsersServed')} 
                            value={`${playerRanking.weeklyStats.newUsersServed}/10`} 
                            color="text-emerald-400" 
                            onHelp={() => setShowRankingRules(true)}
                          />
                          <ScoreMetricCard 
                            icon={History} 
                            label={t('lbRepeatUsers')} 
                            value={`${playerRanking.weeklyStats.repeatUsersServed}/20`} 
                            color="text-emerald-400" 
                            onHelp={() => setShowRankingRules(true)}
                          />
                          <ScoreMetricCard 
                            icon={Star} 
                            label={t('lbRating')} 
                            value={`${playerRanking.weeklyStats.rating} → ${playerRanking.weeklyStats.rating >= 4.9 ? 50 : playerRanking.weeklyStats.rating >= 4.5 ? 30 : playerRanking.weeklyStats.rating >= 4.0 ? 10 : 0} pts`} 
                            color="text-emerald-400" 
                            onHelp={() => setShowRankingRules(true)}
                          />
                          <ScoreMetricCard 
                            icon={Gift} 
                            label={t('lbGiftIncome')} 
                            value={`${Math.min(Math.floor(playerRanking.weeklyStats.giftIncome / 10) * 2, 100)}/100 pts`} 
                            color="text-emerald-400" 
                            onHelp={() => setShowRankingRules(true)}
                          />
                          <ScoreMetricCard 
                            icon={Wallet} 
                            label={t('lbTotalIncome')} 
                            value={`${Math.min(Math.floor(playerRanking.weeklyStats.totalIncome / 20) * 1, 200)}/200 pts`} 
                            color="text-emerald-400" 
                            className="col-span-2"
                            onHelp={() => setShowRankingRules(true)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Level Benefits */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">LV. {playerRanking.level} Benefits</p>
                      <button onClick={() => setShowRankingRules(true)} className="text-gray-600 hover:text-white transition-colors">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <GlassCard className="p-5 space-y-2 border-green-500/10">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 mb-2">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pricing Power</p>
                        <p className="text-sm font-bold text-white">
                          {getLevelBenefits(playerRanking.level).priceRange[0]} - {getLevelBenefits(playerRanking.level).priceRange[1]} Coins/Hr
                        </p>
                      </GlassCard>
                      <GlassCard className="p-5 space-y-2 border-blue-500/10">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2">
                          <Zap className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Exposure</p>
                        <p className="text-sm font-bold text-white">
                          {getLevelBenefits(playerRanking.level).exposure}
                        </p>
                      </GlassCard>
                    </div>
                  </div>

                  {/* Upgrade Requirements */}
                  {playerRanking.nextLevelThreshold && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-2">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Upgrade to LV. {playerRanking.level + 1} Requirements</p>
                        <button onClick={() => setShowRankingRules(true)} className="text-gray-600 hover:text-white transition-colors">
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </div>
                      <GlassCard className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${playerRanking.score >= playerRanking.nextLevelThreshold ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-600'}`}>
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-bold text-white">Reach {playerRanking.nextLevelThreshold} Score</span>
                          </div>
                          <span className={`text-xs font-black ${playerRanking.score >= playerRanking.nextLevelThreshold ? 'text-green-400' : 'text-gray-500'}`}>
                            ({playerRanking.score}/{playerRanking.nextLevelThreshold})
                          </span>
                        </div>

                        {playerRanking.weeklyIncomeRequirement !== null && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${playerRanking.weeklyStats.totalIncome >= playerRanking.weeklyIncomeRequirement ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-600'}`}>
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-bold text-white">Weekly Income ≥ {playerRanking.weeklyIncomeRequirement} Diamonds</span>
                            </div>
                            <span className={`text-xs font-black ${playerRanking.weeklyStats.totalIncome >= playerRanking.weeklyIncomeRequirement ? 'text-green-400' : 'text-gray-500'}`}>
                              ({playerRanking.weeklyStats.totalIncome}/{playerRanking.weeklyIncomeRequirement})
                            </span>
                          </div>
                        )}
                      </GlassCard>
                    </div>
                  )}

                  {/* Simulation Controls (For Demo) */}
                  <div className="pt-4">
                    <button 
                      onClick={processWeeklyUpdate}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
                    >
                      Simulate Weekly Settlement
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="ranking_rules"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
                >
                  <div className="flex items-center justify-between relative">
                    <button onClick={() => setShowRankingRules(false)} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2 text-center leading-tight whitespace-nowrap">Ranking System & Rules</h1>
                    <div className="w-10" />
                  </div>

                  <div className="space-y-8">
                    {/* General Progression */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-2">General Progression</p>
                      <GlassCard className="divide-y divide-white/5">
                        {[
                          { lv: 1, range: '0 - 199', retain: '0' },
                          { lv: 2, range: '200 - 399', retain: '160' },
                          { lv: 3, range: '400 - 799', retain: '320' },
                          { lv: 4, range: '800 - 1499', retain: '480' },
                          { lv: 5, range: '1500 - 2499', retain: '1200' },
                          { lv: 6, range: '2500+', retain: '2000' },
                        ].map((item) => (
                          <div key={item.lv} className="p-4 flex items-center justify-between">
                            <span className="text-sm font-bold text-white">LV. {item.lv}</span>
                            <div className="text-right">
                              <p className="text-xs font-black text-gray-400">{item.range} Score</p>
                              <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Retain: {item.retain}</p>
                            </div>
                          </div>
                        ))}
                      </GlassCard>
                    </div>

                    {/* Scoring Rules */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2">Activity Scoring Rules</p>
                      <GlassCard className="p-6 space-y-4">
                        <RuleItem label={t('lbDailyLogin')} desc={t('descDailyLogin')} />
                        <RuleItem label={t('lbPosting')} desc={t('descPosting')} />
                        <RuleItem label={t('lbNewUserGreeting')} desc={t('descNewUserGreeting')} />
                        <RuleItem label={t('lbResponseRate')} desc={t('descResponseRate')} />
                        <RuleItem label={t('lbOrderAcceptRate')} desc={t('descOrderAcceptRate')} />
                      </GlassCard>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-2">Service Scoring Rules</p>
                      <GlassCard className="p-6 space-y-4">
                        <RuleItem label={t('lbNewUsersServed')} desc={t('descNewUsersServed')} />
                        <RuleItem label={t('lbRepeatUsers')} desc={t('descRepeatUsers')} />
                        <RuleItem label={t('lbRating')} desc={t('descRating')} />
                        <RuleItem label={t('lbGiftIncome')} desc={t('descGiftIncome')} />
                        <RuleItem label={t('lbTotalIncome')} desc={t('descTotalIncome')} />
                      </GlassCard>
                    </div>

                    {/* Hard Requirements */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest px-2">Income Condition Constraint</p>
                      <GlassCard className="p-6 bg-red-500/5 border-red-500/20">
                        <p className="text-xs text-gray-300 leading-relaxed font-medium">
                          To upgrade to LV. 3 or higher, you <span className="text-red-400 font-black">MUST</span> meet the weekly income requirement in addition to the score threshold.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-[8px] font-black text-gray-500 uppercase mb-1">LV. 3 Req</p>
                            <p className="text-xs font-bold text-white">300 Diamonds</p>
                          </div>
                          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-[8px] font-black text-gray-500 uppercase mb-1">LV. 6 Req</p>
                            <p className="text-xs font-bold text-white">3000 Diamonds</p>
                          </div>
                        </div>
                      </GlassCard>
                    </div>

                    {/* Decay & Penalties */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-2">Decay & Penalties</p>
                      <GlassCard className="p-6 space-y-4">
                        <RuleItem label={t('lbBaseDecay')} desc={t('descBaseDecay')} />
                        <RuleItem label={t('lbReducedDecay')} desc={t('descReducedDecay')} />
                        <RuleItem label={t('lbNoOrderPenalty')} desc={t('descNoOrderPenalty')} />
                        <RuleItem label={t('lbSuspension')} desc={t('descSuspension')} />
                      </GlassCard>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {currentView === 'PLAYER_CENTER' && (
            <motion.div 
              key="player_center"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
            >
              <div className="flex items-center justify-between relative">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">Player Center</h1>
                <div className="w-10" />
              </div>

              {/* Player Stats Overview */}
              <div className="space-y-4">
                <GlassCard 
                  onClick={() => navigateTo('COMPANION_LEVEL_DASHBOARD')}
                  className="p-8 bg-gradient-to-br from-emerald-600/20 via-emerald-900/10 to-transparent border-emerald-500/30 relative overflow-hidden cursor-pointer hover:bg-white/10 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Player Level</p>
                  </div>
                  <div className="flex items-end justify-between mb-6">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-white leading-none">LV. {playerRanking.level}</span>
                      {playerRanking.level < 6 && (
                        <span className="text-xs font-bold text-gray-500 mb-1">/ LV. {playerRanking.level + 1}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Weekly Income</p>
                      <div className="flex items-center justify-end gap-1.5">
                        <Gem className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-sm font-black text-white tracking-tight">{playerRanking.weeklyStats.totalIncome}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(playerRanking.score / (playerRanking.nextLevelThreshold || playerRanking.score)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-pink-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      />
                    </div>
                  </div>
                </GlassCard>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => navigateTo('PLAYER_ORDERS')}
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
                  onClick={() => navigateTo('PLAYER_SERVICES')}
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
                  onClick={() => navigateTo('INCOME_REVIEW')}
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
                  onClick={() => navigateTo('CUSTOMER_REVIEW')}
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

            </motion.div>
          )}

          {currentView === 'COMPANION_LEVEL_DASHBOARD' && (
            <CompanionLevelDashboard 
              ranking={playerRanking} 
              onBack={handleBack} 
              onNavigate={navigateTo} 
            />
          )}

          {currentView === 'TASK_CENTER' && (
            <TaskCenter 
              ranking={playerRanking} 
              onBack={handleBack} 
            />
          )}

          {currentView === 'LEVEL_BENEFITS' && (
            <LevelBenefits 
              ranking={playerRanking} 
              onBack={handleBack} 
            />
          )}

          {currentView === 'INCOME_REVIEW' && (
            <IncomeReview 
              ranking={playerRanking}
              onBack={handleBack}
            />
          )}

          {currentView === 'CUSTOMER_REVIEW' && (
            <CustomerReview 
              onBack={handleBack}
              onNavigate={navigateTo}
            />
          )}

          {currentView === 'PLAYER_SERVICES' && (
            <motion.div 
              key="player_services"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-24 bg-[#07110f] flex flex-col"
            >
              <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between relative shrink-0">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">Game Services</h1>
                
                <div className="relative z-10">
                  <button 
                    onClick={() => setShowServiceSortMenu(!showServiceSortMenu)}
                    className={`p-2 rounded-xl border transition-all ${showServiceSortMenu ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>

                  <AnimatePresence>
                    {showServiceSortMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-[#0c1714] border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1"
                      >
                        {[
                          { id: 'NAME_ASC', label: 'Name (A-Z)', icon: ChevronDown },
                          { id: 'NAME_DESC', label: 'Name (Z-A)', icon: ChevronUp },
                          { id: 'ORDERS_DESC', label: 'Orders (High-Low)', icon: TrendingUp },
                          { id: 'ORDERS_ASC', label: 'Orders (Low-High)', icon: TrendingUp },
                        ].map(sort => (
                          <button
                            key={sort.id}
                            onClick={() => {
                              setServiceSort(sort.id as any);
                              setShowServiceSortMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${
                              serviceSort === sort.id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span>{sort.label}</span>
                            <sort.icon className="w-3 h-3" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12">
                <div className="space-y-8">
                  {(() => {
                    const sortedServices = [...playerServices].sort((a, b) => {
                      if (serviceSort === 'NAME_ASC') return a.name.localeCompare(b.name);
                      if (serviceSort === 'NAME_DESC') return b.name.localeCompare(a.name);
                      if (serviceSort === 'ORDERS_DESC') return b.orders - a.orders;
                      if (serviceSort === 'ORDERS_ASC') return a.orders - b.orders;
                      return 0;
                    });

                    const grouped = sortedServices.reduce((acc, s) => {
                      if (!acc[s.name]) acc[s.name] = [];
                      acc[s.name].push(s);
                      return acc;
                    }, {} as Record<string, any[]>);

                    return (Object.entries(grouped) as [string, any[]][]).map(([gameName, services]) => (
                      <div key={gameName} className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                          <h3 className="text-xs font-black text-white uppercase tracking-widest">{gameName}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {services.map((service) => (
                            <GlassCard key={service.id} className="relative group overflow-visible">
                              <div className="flex gap-4 p-4">
                                {/* Cover Image */}
                                <div className="relative w-24 h-32 rounded-xl overflow-hidden shrink-0">
                                  <img 
                                    src={service.coverUrl} 
                                    alt={service.coverName} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  
                                  {/* Voice Preview Button - Moved to bottom right of image */}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPlayingServiceId(playingServiceId === service.id ? null : service.id);
                                    }}
                                    className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all border border-white/20 ${
                                      playingServiceId === service.id ? 'bg-emerald-600' : 'bg-emerald-600/80 backdrop-blur-md'
                                    }`}
                                  >
                                    {playingServiceId === service.id ? (
                                      <WaveAnimation color="bg-white" />
                                    ) : (
                                      <Play className="w-3 h-3 fill-current ml-0.5" />
                                    )}
                                  </button>
                                </div>

                                {/* Service Details */}
                                <div className="flex-1 flex flex-col justify-between py-1">
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="font-bold text-white text-base leading-tight">{service.coverName}</h4>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1">
                                        <span className="text-xl font-black text-white">{service.price}</span>
                                        <CoinIcon className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">/ {service.unit}</span>
                                      </div>
                                      
                                      {/* Toggle Switch */}
                                      <div className="flex items-center gap-2 mt-1">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setServiceToToggle(service);
                                          }}
                                          className={`relative w-12 h-6 rounded-full transition-all duration-500 ease-in-out ${
                                            service.status === 'ONLINE' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-gray-700'
                                          }`}
                                        >
                                          <motion.div 
                                            layout
                                            initial={false}
                                            animate={{ 
                                              x: service.status === 'ONLINE' ? 24 : 4,
                                              scale: service.status === 'ONLINE' ? 1.1 : 1,
                                              backgroundColor: "#ffffff"
                                            }}
                                            transition={{ 
                                              type: "spring", 
                                              stiffness: 500, 
                                              damping: 30,
                                              mass: 1
                                            }}
                                            className="absolute top-1 left-0 w-4 h-4 rounded-full shadow-lg z-10" 
                                          />
                                          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                                            <div className={`w-1 h-1 rounded-full bg-white/20 transition-opacity duration-300 ${service.status === 'ONLINE' ? 'opacity-0' : 'opacity-100'}`} />
                                            <div className={`w-1 h-1 rounded-full bg-white/20 transition-opacity duration-300 ${service.status === 'ONLINE' ? 'opacity-100' : 'opacity-0'}`} />
                                          </div>
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => {
                                          const game = GAMES.find(g => g.name === service.name) || GAMES[0];
                                          setPlayerApplicationData({
                                            gameId: game.id,
                                            rank: 'Diamond',
                                            mainPosition: 'Mid',
                                            server: 'EUW',
                                            platform: 'PC',
                                            style: 'Aggressive',
                                            intro: 'Professional gamer with 5 years of experience.',
                                            screenshots: ['https://picsum.photos/seed/lol/1280/720'],
                                            voiceUrl: service.voiceUrl,
                                            coverUrl: service.coverUrl,
                                            coverIntro: service.coverName,
                                            services: [{
                                              serviceName: service.name,
                                              price: service.price,
                                              unit: service.unit,
                                              promotion: { type: 'NONE', value: 0, limitType: 'NONE', limitValue: 0 }
                                            }]
                                          });
                                          setIsEditingService(true);
                                          setPlayerApplicationStep(2);
                                          navigateTo('APPLY_PLAYER');
                                        }}
                                        className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                                      >
                                        <Settings className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setServiceToDelete(service);
                                        }}
                                        className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                                        title={t('titleDeleteService')}
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </GlassCard>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Fixed Bottom Bar for Add New Service */}
              <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f071a] via-[#0f071a] to-transparent pt-12 z-50">
                <button 
                  onClick={() => {
                    setIsEditingService(false);
                    setPlayerApplicationStep(1);
                    setPlayerApplicationData({
                      gameId: '',
                      rank: '',
                      mainPosition: '',
                      server: '',
                      platform: '',
                      style: '',
                      intro: '',
                      screenshots: [],
                      voiceUrl: '',
                      coverUrl: '',
                      coverIntro: '',
                      services: [],
                    });
                    navigateTo('APPLY_PLAYER');
                  }}
                  className="w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs shadow-[0_8px_25px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98]"
                >
                  <Plus className="w-5 h-5" />
                  <span>{t('addNewService')}</span>
                </button>
              </div>

              {/* Confirmation Modals */}
              <AnimatePresence>
                {serviceToToggle && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="w-full max-w-sm bg-[#0c1714] border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-white">
                          {serviceToToggle.status === 'ONLINE' ? 'Take Down Service?' : 'List Service?'}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {serviceToToggle.status === 'ONLINE' 
                            ? 'This service will be hidden from the marketplace. You can list it again anytime.' 
                            : 'This service will be visible to all users in the marketplace.'}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setServiceToToggle(null)}
                          className="flex-1 p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            setPlayerServices(prev => prev.map(s => 
                              s.id === serviceToToggle.id 
                                ? { ...s, status: s.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE' } 
                                : s
                            ));
                            setServiceToToggle(null);
                          }}
                          className="flex-1 p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg transition-all"
                        >
                          Confirm
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {serviceToDelete && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="w-full max-w-sm bg-[#0c1714] border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                        <X className="w-8 h-8 text-red-400" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-white">Delete Service?</h3>
                        <p className="text-sm text-gray-400">
                          This action cannot be undone. All service data and history will be permanently removed.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setServiceToDelete(null)}
                          className="flex-1 p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            setPlayerServices(prev => prev.filter(s => s.id !== serviceToDelete.id));
                            setServiceToDelete(null);
                          }}
                          className="flex-1 p-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {currentView === 'APPLY_PLAYER_SERVICE_FORM' && (
            <motion.div 
              key="apply_player_service_form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
            >
              <div className="flex items-center justify-between relative">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">
                  {editingServiceIndex !== null ? 'Edit Service' : 'New Service'}
                </h1>
                <div className="w-10" />
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Service Name</p>
                  <input 
                    type="text"
                    placeholder={t('phServiceName')}
                    value={serviceForm.serviceName}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, serviceName: e.target.value }))}
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                  />
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-1 px-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Price</p>
                      <button 
                        onClick={() => alert(`${t('alertPlayerLevel')} ${playerRanking.level}.`)}
                        className="text-gray-600 hover:text-white transition-colors"
                      >
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder={`${getLevelBenefits(playerRanking.level).priceRange[0]}-${getLevelBenefits(playerRanking.level).priceRange[1]}`}
                        value={serviceForm.price || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const [min, max] = getLevelBenefits(playerRanking.level).priceRange;
                          if (val > max) {
                            setServiceForm(prev => ({ ...prev, price: max }));
                          } else {
                            setServiceForm(prev => ({ ...prev, price: val }));
                          }
                        }}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          const [min, max] = getLevelBenefits(playerRanking.level).priceRange;
                          if (val < min) setServiceForm(prev => ({ ...prev, price: min }));
                        }}
                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all pr-12"
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <CoinIcon />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pb-5 text-gray-600 font-black text-xl">/</div>

                  <div className="flex-1 space-y-3">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Unit</p>
                    <div className="relative">
                      <select 
                        value={serviceForm.unit}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-emerald-500/50 outline-none transition-all appearance-none"
                      >
                        <option value="30mins">30mins</option>
                        <option value="game">game</option>
                        <option value="time">time</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Promotion (Optional)</p>
                    <button 
                      onClick={() => setServiceForm(prev => ({ 
                        ...prev, 
                        promotion: { ...prev.promotion, type: prev.promotion.type === 'NONE' ? 'DISCOUNT' : 'NONE' } 
                      }))}
                      className={`text-[10px] font-black uppercase tracking-widest transition-all ${
                        serviceForm.promotion.type !== 'NONE' ? 'text-emerald-400' : 'text-gray-600'
                      }`}
                    >
                      {serviceForm.promotion.type !== 'NONE' ? 'Remove' : 'Add'}
                    </button>
                  </div>

                  {serviceForm.promotion.type !== 'NONE' && (
                    <div className="space-y-6 p-6 bg-white/5 border border-white/10 rounded-[32px]">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Promotion Type</p>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'FIRST_ORDER_DISCOUNT', label: 'First Order Discount' },
                            { id: 'DISCOUNT', label: 'General Discount' },
                            { id: 'BUY_X_GET_Y', label: 'Buy X Get Y' }
                          ].map((type) => (
                            <button
                              key={`service-promotion-type-${type.id}`}
                              onClick={() => setServiceForm(prev => ({ 
                                ...prev, 
                                promotion: { ...prev.promotion, type: type.id as any } 
                              }))}
                              className={`p-4 rounded-2xl text-left border transition-all ${
                                serviceForm.promotion.type === type.id ? 'bg-emerald-600/20 border-emerald-500/50 text-white' : 'bg-white/5 border-white/10 text-gray-500'
                              }`}
                            >
                              <p className="text-xs font-bold">{type.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {serviceForm.promotion.type === 'BUY_X_GET_Y' ? 'Promotion Details' : 'Discount Value (1-20%)'}
                        </p>
                        {serviceForm.promotion.type === 'BUY_X_GET_Y' ? (
                          <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-1">
                              <p className="text-[8px] font-black text-gray-500 uppercase px-2">Buy X</p>
                              <input 
                                type="number"
                                placeholder="1-10"
                                min="1"
                                max="10"
                                value={serviceForm.promotion.buyX || ''}
                                onChange={(e) => {
                                  let val = Number(e.target.value);
                                  if (val > 10) val = 10;
                                  if (val < 1) val = 1;
                                  setServiceForm(prev => ({ 
                                    ...prev, 
                                    promotion: { ...prev.promotion, buyX: val } 
                                  }));
                                }}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-emerald-500/50 outline-none transition-all"
                              />
                            </div>
                            <div className="pt-6 text-gray-500 font-black">GET</div>
                            <div className="flex-1 space-y-1">
                              <p className="text-[8px] font-black text-gray-500 uppercase px-2">Get Y</p>
                              <input 
                                type="number"
                                placeholder="1-10"
                                min="1"
                                max="10"
                                value={serviceForm.promotion.getY || ''}
                                onChange={(e) => {
                                  let val = Number(e.target.value);
                                  if (val > 10) val = 10;
                                  if (val < 1) val = 1;
                                  setServiceForm(prev => ({ 
                                    ...prev, 
                                    promotion: { ...prev.promotion, getY: val } 
                                  }));
                                }}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-emerald-500/50 outline-none transition-all"
                              />
                            </div>
                          </div>
                        ) : (
                          <input 
                            type="number"
                            placeholder="1-20"
                            min="1"
                            max="20"
                            value={serviceForm.promotion.value || ''}
                            onChange={(e) => {
                              let val = Number(e.target.value);
                              if (val > 20) val = 20;
                              if (val < 1) val = 1;
                              setServiceForm(prev => ({ 
                                ...prev, 
                                promotion: { ...prev.promotion, value: val } 
                              }));
                            }}
                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                          />
                        )}
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Promotion Limit</p>
                        <div className="flex gap-2">
                          {[
                            { id: 'NONE', label: 'None' },
                            { id: 'TIME', label: 'Time' },
                            { id: 'QUANTITY', label: 'Qty' }
                          ].map((limit) => (
                            <button
                              key={limit.id}
                              onClick={() => setServiceForm(prev => ({ 
                                ...prev, 
                                promotion: { ...prev.promotion, limitType: limit.id as any } 
                              }))}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                serviceForm.promotion.limitType === limit.id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-gray-500'
                              }`}
                            >
                              {limit.label}
                            </button>
                          ))}
                        </div>
                        {serviceForm.promotion.limitType === 'TIME' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-gray-500 uppercase px-2">Start Date</p>
                              <button 
                                onClick={() => onOpenDatePicker('PROMO_START', serviceForm.promotion.startDate || '', 'Start Date')}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-left hover:bg-white/10 transition-all"
                              >
                                {serviceForm.promotion.startDate || 'Select'}
                              </button>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-gray-500 uppercase px-2">End Date</p>
                              <button 
                                onClick={() => onOpenDatePicker('PROMO_END', serviceForm.promotion.endDate || '', 'End Date')}
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-left hover:bg-white/10 transition-all"
                              >
                                {serviceForm.promotion.endDate || 'Select'}
                              </button>
                            </div>
                          </div>
                        )}
                        {serviceForm.promotion.limitType === 'QUANTITY' && (
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-500 uppercase px-2">Quantity (1-10)</p>
                            <input 
                              type="number"
                              placeholder="1-10"
                              min="1"
                              max="10"
                              value={serviceForm.promotion.limitValue || ''}
                              onChange={(e) => {
                                let val = Number(e.target.value);
                                if (val > 10) val = 10;
                                if (val < 1) val = 1;
                                setServiceForm(prev => ({ 
                                  ...prev, 
                                  promotion: { ...prev.promotion, limitValue: val } 
                                }));
                              }}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#07110f]/80 backdrop-blur-xl border-t border-white/10 z-50">
                <button 
                  onClick={() => {
                    if (!serviceForm.serviceName || !serviceForm.price) {
                      alert(t('alertFillRequiredFields'));
                      return;
                    }
                    setPlayerApplicationData(prev => {
                      const newServices = [...(prev.services || [])];
                      if (editingServiceIndex !== null) {
                        newServices[editingServiceIndex] = serviceForm;
                      } else {
                        newServices.push(serviceForm);
                      }
                      return { ...prev, services: newServices };
                    });
                    handleBack();
                  }}
                  className="w-full p-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-all active:scale-[0.98]"
                >
                  {editingServiceIndex !== null ? 'Save Changes' : 'Add Service'}
                </button>
              </div>
            </motion.div>
          )}

          {currentView === 'WITHDRAW' && (
            <motion.div 
              key="withdraw"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
            >
              <div className="flex items-center justify-between relative">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">Withdraw</h1>
                <div className="w-10" />
              </div>

              <GlassCard className="p-8 bg-gradient-to-br from-emerald-600/20 to-transparent border-emerald-500/30 text-center space-y-4">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Available Diamonds</p>
                <div className="flex items-center justify-center gap-3">
                  <Gem className="w-8 h-8 text-emerald-400" />
                  <span className="text-5xl font-black text-white tracking-tighter">{userDiamonds}</span>
                </div>
                <p className="text-[10px] text-gray-500 font-bold">≈ ${(userDiamonds / 100).toFixed(2)} USD</p>
              </GlassCard>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Withdraw Amount</p>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">15 Diamonds = $1 USD</p>
                  </div>
                  <div className="relative">
                    <Gem className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                    <input 
                      type="number" 
                      placeholder="Min. 15"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-5 pl-14 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-700 focus:border-emerald-500/50 outline-none transition-all"
                    />
                    <button 
                      onClick={() => setWithdrawAmount(Math.floor(userDiamonds / 15) * 15)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400 uppercase tracking-widest"
                    >
                      Max
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 px-2">
                    <p className="text-[10px] text-gray-500 font-medium">Minimum withdrawal: $1 (15 Diamonds)</p>
                    <p className="text-[10px] text-gray-500 font-medium">Must be a multiple of 15 Diamonds</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Withdraw to</p>
                  <div className="space-y-2">
                    {[
                      { id: 'paypal', name: 'PayPal', icon: <Globe className="w-5 h-5" />, account: 'alex***@gmail.com' },
                      { id: 'bank', name: 'Bank Card', icon: <CreditCard className="w-5 h-5" />, account: '**** 8888' },
                    ].map(method => (
                      <button key={method.id} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                            {method.icon}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-white">{method.name}</p>
                            <p className="text-[10px] text-gray-500 font-medium">{method.account}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <button 
                  disabled={!withdrawAmount || withdrawAmount < 15 || withdrawAmount % 15 !== 0 || withdrawAmount > userDiamonds}
                  onClick={() => handleWithdrawDiamonds(Number(withdrawAmount))}
                  className="w-full py-5 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Confirm Withdrawal (${(Number(withdrawAmount) / 15).toFixed(2)})
                </button>
                <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                  Withdrawals are usually processed within 1-3 business days. <br />
                  A 5% service fee will be applied to each transaction.
                </p>
              </div>
            </motion.div>
          )}

          {currentView === 'EXCHANGE_DIAMONDS' && (
            <motion.div 
              key="exchange"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f] p-6 space-y-8"
            >
              <div className="flex items-center justify-between relative">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2">Exchange</h1>
                <div className="w-10" />
              </div>

              <GlassCard className="p-8 bg-gradient-to-br from-emerald-600/20 to-transparent border-emerald-500/30 text-center space-y-4">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Available Diamonds</p>
                <div className="flex items-center justify-center gap-3">
                  <Gem className="w-8 h-8 text-emerald-400" />
                  <span className="text-5xl font-black text-white tracking-tighter">{userDiamonds}</span>
                </div>
                <p className="text-[10px] text-gray-500 font-bold">≈ ${(userDiamonds / 100).toFixed(2)} USD</p>
              </GlassCard>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Exchange Amount</p>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">1 Diamond = 0.8 Coins</p>
                  </div>
                  <div className="relative">
                    <Gem className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                    <input 
                      type="number" 
                      placeholder="Min. 10"
                      value={exchangeAmount}
                      onChange={(e) => setExchangeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-5 pl-14 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-700 focus:border-emerald-500/50 outline-none transition-all"
                    />
                    <button 
                      onClick={() => setExchangeAmount(Math.floor(userDiamonds / 10) * 10)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400 uppercase tracking-widest"
                    >
                      Max
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 px-2">
                    <p className="text-[10px] text-gray-500 font-medium">Minimum exchange: 10 Diamonds</p>
                    <p className="text-[10px] text-gray-500 font-medium">Must be a multiple of 10 Diamonds</p>
                  </div>
                </div>

                <div className="p-6 bg-emerald-600/5 border border-emerald-500/20 rounded-3xl flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">You will receive</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-white">{exchangeAmount ? Math.floor(Number(exchangeAmount) * 0.8) : 0}</span>
                      <CoinIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <Zap className="w-8 h-8 text-emerald-500/30" />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <button 
                  disabled={!exchangeAmount || exchangeAmount < 10 || exchangeAmount % 10 !== 0 || exchangeAmount > userDiamonds}
                  onClick={() => handleExchangeDiamonds(Number(exchangeAmount))}
                  className="w-full py-5 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Confirm Exchange
                </button>
                <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                  Exchanges are instant and irreversible. <br />
                  Coins can be used to purchase services and gifts.
                </p>
              </div>
            </motion.div>
          )}

          {currentView === 'SETTINGS_EDIT_PROFILE' && (
            <motion.div 
              key="settings_edit_profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SettingsSubPage 
                title={t('titleEditProfile')} 
                stickyHeader
                onBack={() => {
                  const hasChanges = JSON.stringify(userProfile) !== JSON.stringify(tempProfile);
                  if (hasChanges) {
                    setShowExitConfirm(true);
                  } else {
                    handleBack();
                  }
                }}
                rightElement={
                  <button 
                    onClick={() => {
                      setUserProfile({ ...tempProfile });
                      setShowSubmissionToast({
                        show: true,
                        message: 'Profile Updated',
                        subtext: ''
                      });
                      setTimeout(() => {
                        setShowSubmissionToast({ show: false, message: '' });
                      }, 1000);
                      handleBack();
                    }}
                    className="text-emerald-400 font-black uppercase tracking-widest text-[11px] px-4 py-2 bg-emerald-400/10 rounded-xl border border-emerald-400/20 active:scale-95 transition-all"
                  >
                    Save
                  </button>
                }
              >
                <div className="space-y-8 pb-10">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-white/5">
                        <img 
                          src={tempProfile.avatarUrl} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <button 
                        onClick={() => setTempProfile(prev => ({ ...prev, avatarUrl: `https://picsum.photos/seed/${Date.now()}/400/400` }))}
                        className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 rounded-xl border-2 border-[#0f071a] shadow-xl active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Nickname</p>
                      <input 
                        type="text" 
                        value={tempProfile.name}
                        onChange={(e) => setTempProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-gray-700"
                        placeholder={t('phDisplayName')}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Gender (Non-modifiable)</p>
                      <div className="w-full p-5 bg-white/5 border border-white/5 rounded-2xl text-gray-500 font-bold flex items-center gap-3">
                        {tempProfile.gender === 'Female' ? <Venus className="w-4 h-4 shrink-0" /> : <Mars className="w-4 h-4 shrink-0" />}
                        <span className="flex-1">{tempProfile.gender}</span>
                        <Lock className="w-4 h-4 opacity-30" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Birthday</p>
                      <button 
                        onClick={() => onOpenDatePicker('BIRTHDAY', tempProfile.birthday, 'Select Birthday')}
                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold flex items-center justify-between hover:bg-white/10 transition-all active:scale-[0.99]"
                      >
                        <span>{tempProfile.birthday || 'Select Birthday'}</span>
                        <Calendar className="w-4 h-4 text-emerald-400" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Country / Region</p>
                      <button 
                        onClick={() => setShowCountryPicker(true)}
                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold flex items-center justify-between hover:bg-white/10 transition-all active:scale-[0.99]"
                      >
                        <span>{tempProfile.region || 'Select Country'}</span>
                        <Globe className="w-4 h-4 text-emerald-400" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Bio</p>
                      <textarea 
                        value={tempProfile.bio}
                        onChange={(e) => setTempProfile(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-emerald-500/50 outline-none transition-all h-32 resize-none placeholder:text-gray-700"
                        placeholder={t('phBio')}
                      />
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Playlinks</p>
                      <button 
                        onClick={() => navigateTo('MANAGE_PLAYLINKS')}
                        className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl group active:scale-[0.98] transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                            <Gamepad2 className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-white font-bold text-sm">Manage Playlinks</p>
                            <p className="text-[10px] text-gray-500 font-medium">{myPlaylinks.length} Connected Accounts</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Album Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Album ({tempProfile.album.length}/9)</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {tempProfile.album.map((url, index) => (
                        <div key={`settings-album-preview-${index}`} className="relative aspect-square group">
                          <img 
                            src={url} 
                            className="w-full h-full object-cover rounded-2xl border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <button 
                            onClick={() => setTempProfile(prev => ({
                              ...prev,
                              album: prev.album.filter((_, i) => i !== index)
                            }))}
                            className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </button>
                        </div>
                      ))}
                      {tempProfile.album.length < 9 && (
                        <button 
                          onClick={() => setTempProfile(prev => ({
                            ...prev,
                            album: [...prev.album, `https://picsum.photos/seed/${Date.now()}/800/800`]
                          }))}
                          className="aspect-square bg-white/5 border border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-600 hover:border-emerald-500/50 hover:text-emerald-400 transition-all active:scale-95"
                        >
                          <Plus className="w-6 h-6" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Add Photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </SettingsSubPage>
            </motion.div>
          )}

          {currentView === 'SETTINGS_CHANGE_PASSWORD' && (
            <motion.div 
              key="settings_change_password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SettingsSubPage title={t('titleChangePassword')} onBack={handleBack}>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Current Password</p>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input 
                        type="password" 
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                        placeholder={t('phCurrentPassword')}
                        className="w-full p-5 pl-12 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-700 focus:border-emerald-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">New Password</p>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input 
                        type="password" 
                        value={passwordForm.new}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                        placeholder={t('phNewPassword')}
                        className="w-full p-5 pl-12 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-700 focus:border-emerald-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Confirm New Password</p>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input 
                        type="password" 
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                        placeholder={t('phConfirmPassword')}
                        className="w-full p-5 pl-12 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-700 focus:border-emerald-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleUpdatePassword}
                    className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 transition-all uppercase tracking-widest text-xs mt-8"
                  >
                    Update Password
                  </button>
                </div>
              </SettingsSubPage>
            </motion.div>
          )}

          {currentView === 'SETTINGS_LINKED_ACCOUNTS' && (
            <motion.div 
              key="settings_linked_accounts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SettingsSubPage title={t('titleLinkedAccounts')} onBack={handleBack}>
                <div className="space-y-2 pt-4">
                  {/* Critical Bindings: Phone & Email */}
                  <div className="space-y-2">
                    {[
                      { id: 'PHONE', name: 'Phone Number', icon: <Phone className="w-5 h-5 text-green-400" />, value: userProfile.phone },
                      { id: 'EMAIL', name: 'Email Address', icon: <Mail className="w-5 h-5 text-blue-400" />, value: userProfile.email },
                    ].map(acc => (
                      <div 
                        key={acc.id} 
                        onClick={() => acc.value ? handleStartBind(acc.id as any, acc.value) : handleStartBind(acc.id as any)}
                        className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-emerald-500/50 transition-all">
                            {acc.icon}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{acc.name}</p>
                            <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                              {acc.value || (acc.id === 'EMAIL' ? 'Not bound' : '')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {acc.value ? (
                            <ChevronRight className="w-5 h-5 text-gray-700 group-hover:translate-x-1 transition-transform" />
                          ) : (
                            <button 
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all"
                            >
                              Bind
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Third Party Bindings */}
                  <div className="space-y-2">
                    {[
                      { name: 'Discord', icon: <MessageSquare className="w-5 h-5" />, color: 'bg-[#5865F2]', linked: userProfile.linkedAccounts.Discord, username: 'Alex#1234' },
                      { name: 'Google', icon: <Globe className="w-5 h-5" />, color: 'bg-[#DB4437]', linked: userProfile.linkedAccounts.Google },
                      { name: 'Facebook', icon: <Globe className="w-5 h-5" />, color: 'bg-[#4267B2]', linked: userProfile.linkedAccounts.Facebook },
                      { name: 'Apple', icon: <Smartphone className="w-5 h-5" />, color: 'bg-white text-black text-black', linked: userProfile.linkedAccounts.Apple },
                    ].map(acc => (
                      <div key={acc.name} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl ${acc.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                            {acc.icon}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{acc.name}</p>
                            {acc.linked && <p className="text-[10px] font-bold text-gray-500 mt-0.5">{acc.username || 'Linked'}</p>}
                          </div>
                        </div>
                        <button 
                          disabled={acc.linked}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            acc.linked ? 'bg-white/5 text-gray-700 border border-white/10 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-lg'
                          }`}
                        >
                          {acc.linked ? 'Linked' : 'Link'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </SettingsSubPage>
            </motion.div>
          )}

          {currentView === 'SETTINGS_LANGUAGE' && (
            <motion.div 
              key="settings_language"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SettingsSubPage title={t('language')} onBack={handleBack}>
                <div className="space-y-2 pt-4">
                  {(['English', 'Arabic', 'Turkish'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => {
                        if (lang !== selectedLanguage) {
                          setPendingLanguage(lang);
                          setShowLanguageConfirm(true);
                        } else {
                          handleBack();
                        }
                      }}
                      className={`w-full p-5 flex items-center justify-between rounded-2xl border transition-all ${
                        selectedLanguage === lang
                          ? 'bg-emerald-600/10 border-emerald-500/50 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-bold">{lang === 'Arabic' ? 'العربية' : lang === 'Turkish' ? 'Türkçe' : 'English'}</span>
                      {selectedLanguage === lang && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </SettingsSubPage>
            </motion.div>
          )}

          {currentView === 'SETTINGS_PRIVACY' && (
            <motion.div 
              key="settings_privacy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SettingsSubPage title={t('titlePrivacyPolicy')} onBack={handleBack}>
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">1. Information Collection</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with other users.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">2. Use of Information</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      We use the information we collect to provide, maintain, and improve our services, and to develop new ones.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">3. Data Security</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access.
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-600 italic pt-4">Last updated: April 4, 2026</p>
                </div>
              </SettingsSubPage>
            </motion.div>
          )}

          {currentView === 'SETTINGS_TERMS' && (
            <motion.div 
              key="settings_terms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SettingsSubPage title="Terms of Service" onBack={handleBack}>
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">1. Acceptance of Terms</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      By accessing or using our services, you agree to be bound by these terms. If you do not agree to all of these terms, do not use our services.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">2. User Conduct</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      You are responsible for your use of the services and for any content you provide. You agree not to engage in any prohibited conduct.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">3. Termination</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      We reserve the right to terminate or suspend your access to our services at any time, without notice, for any reason.
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-600 italic pt-4">Last updated: April 4, 2026</p>
                </div>
              </SettingsSubPage>
            </motion.div>
          )}

          {currentView === 'SETTINGS_NOTIFICATIONS' && (
            <motion.div 
              key="settings_notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SettingsSubPage title="Notifications" onBack={handleBack}>
                <div className="px-6 space-y-4">
                  {[
                    { key: 'message', label: 'Message Messages' },
                    { key: 'order', label: 'Order Messages' },
                    { key: 'system', label: 'System Messages' },
                    { key: 'post', label: 'Post Messages' }
                  ].map(({ key, label }) => (
                    <div key={key} className="w-full flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                      <span className="font-bold text-gray-300">{label}</span>
                      <button 
                        onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        className={`w-10 h-5 rounded-full relative transition-colors ${notificationSettings[key as keyof typeof notificationSettings] ? 'bg-emerald-600' : 'bg-white/10'}`}
                      >
                        <motion.div 
                          animate={{ x: notificationSettings[key as keyof typeof notificationSettings] ? 24 : 4 }}
                          className="absolute top-1 w-3 h-3 rounded-full bg-white" 
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </SettingsSubPage>
            </motion.div>
          )}

          {currentView === 'SETTINGS_BLACKLIST' && (
            <motion.div 
              key="settings_blacklist"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SettingsSubPage title="Blacklist" onBack={() => handleBack()}>
                <div className="px-6 space-y-4">
                  {blockedUsers.size === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                        <Ban className="w-10 h-10 text-gray-700" />
                      </div>
                      <p className="text-gray-500 font-bold">Your blacklist is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                       {Array.from(blockedUsers).map(userId => {
                         const epal = EPALS.find(e => e.id === userId);
                         if (!epal) return null;
                         return (
                           <div key={`blacklist-item-${epal.id}`} className="flex items-center justify-between py-4 border-b border-white/5">
                             <div className="flex items-center gap-4">
                               <img src={epal.avatarUrl} className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-lg" referrerPolicy="no-referrer" />
                               <div>
                                 <p className="font-bold text-white text-base">{epal.name}</p>
                                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">ID: {epal.id.slice(0, 12)}...</p>
                               </div>
                             </div>
                              <button 
                                onClick={() => {
                                  setUserToUnblock(epal.id);
                                  setIsUnblockConfirmOpen(true);
                                }}
                                className="px-5 py-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-red-400 transition-all active:scale-95"
                              >
                                Unblock
                              </button>
                           </div>
                         )
                       })}
                    </div>
                  )}
                </div>
              </SettingsSubPage>
            </motion.div>
          )}

          {currentView === 'NEW_USERS' && (
            <motion.div 
              key="new_users-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <IcebreakerPoolView 
                onBack={handleBack} 
                onNavigateToProfile={(payload) => navigateTo('PROFILE', payload)}
                t={t as any}
              />
            </motion.div>
          )}

          {currentView === 'NEW_EPALS_LIST' && (
            <motion.div 
              key="new_epals-page"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20"
            >
              {/* Sticky Header */}
              <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md border-b border-white/5 px-6 pt-12 pb-6 flex items-center gap-4">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10">
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">{t('newEPals')}</h1>
              </div>

              {/* New EPals List */}
              <div className="px-6 space-y-4 pt-6">
                {EPALS.filter(e => !e.isLegend).slice(0, 15).map(epal => (
                  <EPalCard 
                    key={`new_epals-page-epal-${epal.id}`} 
                    epal={epal} 
                    onProfileClick={() => navigateTo('PROFILE', epal)}
                    onOrderClick={() => navigateTo('ORDER_CONFIRM', { epal })}
                    isPlaying={playingEPalId === epal.id}
                    onPlayToggle={(e) => handlePlayToggle(epal.id, e)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {currentView === 'WALLET' && (
            <motion.div 
              key="wallet"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20"
            >
              <WalletView 
                wallet={wallet}
                transactions={transactions}
                packages={rechargePackages}
                onSelectPackage={handleRecharge}
                onBack={handleBack}
                userRole={userRole}
                userDiamonds={userDiamonds}
                diamondTransactions={diamondTransactions}
                onWithdraw={() => navigateTo('WITHDRAW')}
                onExchange={() => navigateTo('EXCHANGE_DIAMONDS')}
                onOpenDatePicker={(id, val, title) => setDatePickerTarget({ id, value: val, title })}
                startDate={walletStartDate}
                endDate={walletEndDate}
                onResetDates={() => {
                  setWalletStartDate('');
                  setWalletEndDate('');
                }}
              />
            </motion.div>
          )}

          {currentView === 'FEEDBACK' && (
            <motion.div 
              key="feedback"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <FeedbackView 
                onBack={handleBack}
                onOpenDatePicker={(id, val, title) => setDatePickerTarget({ id, value: val, title })}
                selectedTime={feedbackTime}
              />
            </motion.div>
          )}

          {currentView === 'MANAGE_PLAYLINKS' && (
            <motion.div 
              key="manage_playlinks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ManagePlaylinksView 
                playlinks={myPlaylinks}
                onAdd={() => {
                  setEditingPlaylinkId(null);
                  navigateTo('ADD_PLAYLINK');
                }}
                onEdit={(id) => {
                  setEditingPlaylinkId(id);
                  navigateTo('ADD_PLAYLINK');
                }}
                onDelete={(id) => {
                  setPlaylinkToDelete(id);
                }}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {currentView === 'ADD_PLAYLINK' && (
            <motion.div 
              key="add_playlink"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <AddPlaylinkView 
                games={GAMES}
                onBack={handleBack}
                initialData={editingPlaylinkId ? myPlaylinks.find(l => l.id === editingPlaylinkId) : undefined}
                onSave={(newLink) => {
                  // Duplicate Check (only when adding new, or if editing to a DIFFERENT game)
                  const isDuplicate = myPlaylinks.some(l => 
                    l.gameName === newLink.gameName && l.id !== editingPlaylinkId
                  );

                  if (isDuplicate) {
                    setShowSubmissionToast({ show: true, message: `Association for ${newLink.gameName} already exists!` });
                    setTimeout(() => setShowSubmissionToast({ show: false, message: '' }), 3000);
                    return;
                  }

                  if (editingPlaylinkId) {
                    // Update
                    setMyPlaylinks(prev => prev.map(l => l.id === editingPlaylinkId ? {
                      ...l,
                      nickname: newLink.nickname,
                      rank: newLink.rank,
                      platform: newLink.platform,
                      server: newLink.server,
                      role: newLink.role,
                      style: newLink.style
                    } : l));
                    setEditingPlaylinkId(null);
                  } else {
                    // Add New
                    const link: Playlink = {
                      id: `pl-${Date.now()}`,
                      gameName: newLink.gameName!,
                      posterUrl: newLink.posterUrl!,
                      nickname: newLink.nickname,
                      rank: newLink.rank,
                      platform: newLink.platform,
                      server: newLink.server,
                      role: newLink.role,
                      style: newLink.style
                    };
                    setMyPlaylinks(prev => [...prev, link]);
                  }
                  setShowSubmissionToast({ show: true, message: `Association ${editingPlaylinkId ? 'updated' : 'added'} successfully` });
                  setTimeout(() => setShowSubmissionToast({ show: false, message: '' }), 3000);
                  handleBack();
                }}
              />
            </motion.div>
          )}

          {currentView === 'NOTIFICATIONS' && (
            <motion.div 
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 bg-[#07110f]"
            >
              {/* Header */}
              <div className="sticky top-0 z-50 bg-[#07110f]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                  <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                  </button>
                  <h1 className="text-xl font-bold">Notifications</h1>
                </div>
                <button 
                  onClick={() => setIsMarkReadConfirmOpen(true)}
                  className="p-2 text-gray-500 hover:text-emerald-400 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex px-6 pt-6 border-b border-white/5">
                {(['ORDER', 'SOCIAL', 'SYSTEM'] as const).map((tab) => (
                  <button
                    key={`notif-tab-${tab}`}
                    onClick={() => setNotificationTab(tab)}
                    className={`flex-1 pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                      notificationTab === tab ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {tab}
                    {notifications.some(n => n.type === tab && n.unread) && (
                      <span className="absolute top-0 right-[20%] w-2 h-2 rounded-full bg-red-500 border border-[#0f071a]" />
                    )}
                    {notificationTab === tab && (
                      <motion.div 
                        layoutId="activeTabNotif"
                        className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-emerald-500 rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="space-y-1">
                {notifications
                  .filter(n => n.type === notificationTab)
                  .map((notif) => (
                    <div 
                      key={`notif-item-${notif.id}`} 
                      onClick={() => {
                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
                        if (notif.orderId) {
                          const order = imOrders.find(o => o.id === notif.orderId);
                          if (order) {
                            setSelectedOrder(order);
                            setShowOrderDetailModal(true);
                          }
                        }
                      }}
                      className="px-6 py-5 relative transition-all active:bg-white/5 cursor-pointer flex gap-4"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-bold transition-colors ${notif.unread ? 'text-white' : 'text-gray-400'}`}>{notif.title}</h3>
                          <span className="text-[10px] font-bold text-gray-600">{notif.time}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-500">{notif.content}</p>
                      </div>
                      {notif.unread && (
                        <div className="shrink-0 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        </div>
                      )}
                    </div>
                  ))}
                {notifications.filter(n => n.type === notificationTab).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                      <Bell className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No notifications yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Mark All as Read Confirmation Modal */}
          <AnimatePresence>
            {isMarkReadConfirmOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMarkReadConfirmOpen(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="w-full max-w-sm bg-[#0c1714] border border-white/10 rounded-[32px] p-8 space-y-6 relative z-10"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <CheckCheck className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white text-center">Mark all as read?</h3>
                      <p className="text-sm text-gray-400 leading-relaxed px-4 text-center">
                        All {notificationTab.toLowerCase()} notifications will be marked as read.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setNotifications(prev => prev.map(n => n.type === notificationTab ? { ...n, unread: false } : n));
                        setIsMarkReadConfirmOpen(false);
                      }}
                      className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {currentView === 'ORDER_CONFIRM' && selectedEPal && selectedVariant && (
            <motion.div 
              key="order"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen pb-20 pt-6 px-6 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center gap-4">
                <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Confirm Order</h1>
              </div>

              {/* Service Info */}
              <GlassCard className="p-4 flex gap-4">
                <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 border border-white/10">
                  <img 
                    src={selectedEPal.services?.find(s => s.id === activeServiceId)?.posterUrl || selectedEPal.avatarUrl} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col justify-center space-y-1">
                  <h2 className="text-lg font-bold">{selectedEPal.services?.find(s => s.id === activeServiceId)?.name || selectedEPal.game}</h2>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white leading-tight">{selectedEPal.name}</p>
                    <p className="text-sm font-bold text-white opacity-60 leading-tight">ID: {selectedEPal.id.slice(0, 8)}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Service Types */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Service Type</h3>
                <button 
                  onClick={() => setShowServiceTypeModal(true)}
                  className="w-full flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all text-left"
                >
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-white block">{selectedVariant.name}</span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-tight flex items-center gap-1">
                      {selectedVariant.price} <CoinIcon /> / {selectedVariant.unit}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Quantity */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quantity</h3>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    {(() => {
                      const unit = selectedVariant.unit.toLowerCase();
                      if (unit.includes('min')) {
                        const mins = parseInt(unit) || 0;
                        return `Total: ${mins * orderQuantity}min`;
                      }
                      if (unit.includes('game')) {
                        return `Total: ${orderQuantity} Games`;
                      }
                      if (unit.includes('time')) {
                        return `Total: ${orderQuantity} Times`;
                      }
                      return `Total: ${orderQuantity} ${selectedVariant.unit}(s)`;
                    })()}
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-sm font-bold text-gray-300">Select Units</span>
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                      className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-bold w-4 text-center">{orderQuantity}</span>
                    <button 
                      onClick={() => setOrderQuantity(orderQuantity + 1)}
                      className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center active:scale-90 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Price Summary</h3>
                <GlassCard className="p-5 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="font-bold flex items-center gap-1">
                      {selectedVariant.price * orderQuantity} <CoinIcon />
                    </span>
                  </div>
                  <button 
                    disabled={availableCoupons.length === 0}
                    onClick={() => setShowCouponModal(true)}
                    className={`w-full flex justify-between items-center text-sm transition-all ${
                      availableCoupons.length > 0 ? 'hover:opacity-70 active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-gray-400">Coupon</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold flex items-center gap-1 ${selectedCoupon ? 'text-green-400' : 'text-gray-500'}`}>
                        {selectedCoupon ? (
                          <>
                            -{selectedCoupon.type === 'FIXED' 
                              ? selectedCoupon.discount 
                              : Math.floor((selectedVariant.price * orderQuantity) * (selectedCoupon.discount / 100))} <CoinIcon />
                          </>
                        ) : (availableCoupons.length > 0 ? 'Select coupon' : 'No Available Coupons')}
                      </span>
                      {availableCoupons.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                    </div>
                  </button>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Discount</span>
                    <span className="font-bold text-green-400 flex items-center gap-1">
                      -{selectedCoupon ? (selectedCoupon.type === 'FIXED' ? selectedCoupon.discount : Math.floor((selectedVariant.price * orderQuantity) * (selectedCoupon.discount / 100))) : 0} <CoinIcon />
                    </span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Final Price</span>
                    <span className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
                      {(() => {
                        const subtotal = selectedVariant.price * orderQuantity;
                        let discount = 0;
                        if (selectedCoupon) {
                          discount = selectedCoupon.type === 'FIXED' 
                            ? selectedCoupon.discount 
                            : Math.floor(subtotal * (selectedCoupon.discount / 100));
                        }
                        return Math.max(0, subtotal - discount);
                      })()} <CoinIcon className="w-5 h-5" textClassName="text-[10px]" />
                    </span>
                  </div>
                </GlassCard>
              </div>

              {/* Action Buttons */}
              <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-gradient-to-t from-[#0f071a] to-transparent">
                <div className="max-w-md mx-auto">
                  <button 
                    onClick={() => {
                      if (!selectedEPal || !selectedVariant) return;
                      if (isInteractionBlocked(selectedEPal.id)) return;

                      // Check for ongoing orders
                      const hasOngoingOrder = imOrders.some(order => 
                        order.epalId === selectedEPal.id && 
                        order.status !== 'COMPLETED' && 
                        order.status !== 'CANCELLED'
                      );

                      if (hasOngoingOrder) {
                        setShowOngoingOrderWarning(true);
                        return;
                      }

                      // Add new order
                      const newOrder: IMOrder = {
                        id: `o${Date.now()}`,
                        epalId: selectedEPal.id,
                        serviceName: selectedEPal.services?.find(s => s.id === activeServiceId)?.name || selectedEPal.game,
                        status: 'PENDING',
                        price: (() => {
                          const subtotal = selectedVariant.price * orderQuantity;
                          let discount = 0;
                          if (selectedCoupon) {
                            discount = selectedCoupon.type === 'FIXED' 
                              ? selectedCoupon.discount 
                              : Math.floor(subtotal * (selectedCoupon.discount / 100));
                          }
                          return Math.max(0, subtotal - discount);
                        })(),
                        timestamp: Date.now(),
                        unit: selectedVariant.unit,
                        unitPrice: selectedVariant.price,
                        quantity: orderQuantity
                      };

                      setImOrders(prev => [newOrder, ...prev]);
                      navigateTo('IM');
                      setImTab('ORDER');
                    }}
                    className="w-full py-4 rounded-2xl bg-emerald-600 font-bold text-lg shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 transition-all text-white"
                  >
                    Pay & Start
                  </button>
                </div>
              </div>

              {/* Coupon Modal */}
              <AnimatePresence>
                {showCouponModal && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowCouponModal(false)}
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />
                    <motion.div 
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed bottom-0 left-0 right-0 bg-[#0c1714] rounded-t-[32px] border-t border-white/10 z-[101] max-w-md mx-auto p-6 pb-12 space-y-6"
                    >
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Select Coupon</h2>
                        <button 
                          onClick={() => setShowCouponModal(false)}
                          className="text-gray-500 hover:text-white font-bold"
                        >
                          Close
                        </button>
                      </div>

                      <div className="space-y-3">
                        <button 
                          onClick={() => {
                            setSelectedCoupon(null);
                            setShowCouponModal(false);
                          }}
                          className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                            selectedCoupon === null 
                              ? 'bg-emerald-600/20 border-emerald-500/50' 
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <span className="font-bold">Don't use coupon</span>
                          {selectedCoupon === null && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        </button>

                        {availableCoupons.map(coupon => {
                          const subtotal = selectedVariant.price * orderQuantity;
                          const isDisabled = coupon.minSpend ? subtotal < coupon.minSpend : false;
                          
                          return (
                            <button 
                              key={coupon.id}
                              disabled={isDisabled}
                              onClick={() => {
                                setSelectedCoupon(coupon);
                                setShowCouponModal(false);
                              }}
                              className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all text-left ${
                                selectedCoupon?.id === coupon.id 
                                  ? 'bg-emerald-600/20 border-emerald-500/50' 
                                  : isDisabled ? 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed' : 'bg-white/5 border-white/10'
                              }`}
                            >
                              <div className="space-y-1">
                                <p className="font-bold">{coupon.name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  {coupon.type === 'FIXED' ? <>{coupon.discount} <CoinIcon /> OFF</> : `${coupon.discount}% OFF`}
                                  {coupon.minSpend && <> • Min spend {coupon.minSpend} <CoinIcon /></>}
                                </p>
                              </div>
                              {selectedCoupon?.id === coupon.id && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Service Type Modal */}
              <AnimatePresence>
                {showServiceTypeModal && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowServiceTypeModal(false)}
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />
                    <motion.div 
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed bottom-0 left-0 right-0 bg-[#0c1714] rounded-t-[32px] border-t border-white/10 z-[101] max-w-md mx-auto p-6 pb-12 space-y-6"
                    >
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Select Service Type</h2>
                        <button 
                          onClick={() => setShowServiceTypeModal(false)}
                          className="text-gray-500 hover:text-white font-bold"
                        >
                          Close
                        </button>
                      </div>

                      <div className="space-y-3">
                        {selectedEPal.services?.find(s => s.id === activeServiceId)?.variants.map((v) => (
                          <button 
                            key={v.name} 
                            onClick={() => {
                              setSelectedVariant(v);
                              setShowServiceTypeModal(false);
                            }}
                            className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all text-left ${
                              selectedVariant.name === v.name 
                                ? 'bg-emerald-600/20 border-emerald-500/50' 
                                : 'bg-white/5 border-white/10'
                            }`}
                          >
                            <div className="space-y-1">
                              <p className="font-bold">{v.name}</p>
                              <p className="text-xs text-emerald-400 font-bold uppercase tracking-tight">
                                <span className="flex items-center gap-1">
                                  {v.price} <CoinIcon /> / {v.unit}
                                </span>
                              </p>
                            </div>
                            {selectedVariant.name === v.name && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unfollow Confirmation Modal */}
        <AnimatePresence>
          {showUnfollowModal && epalToUnfollow && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowUnfollowModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-0 flex items-center justify-center z-[201] p-6 pointer-events-none"
              >
                <GlassCard className="w-full max-w-xs p-6 space-y-6 pointer-events-auto shadow-2xl border-white/20 bg-[#0c1714]/90">
                  <div className="space-y-2 text-center">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto border-2 border-emerald-500/30">
                      <img src={epalToUnfollow.avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <h3 className="text-lg font-bold">Unfollow {epalToUnfollow.name}?</h3>
                    <p className="text-xs text-gray-400">{t('unfollowConfirm')}</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={confirmUnfollow}
                      className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 font-bold text-sm active:scale-95 transition-all"
                    >
                      Unfollow
                    </button>
                    <button 
                      onClick={() => setShowUnfollowModal(false)}
                      className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Playlink Gallery Modal */}
        <AnimatePresence>
          {showPlaylinkModal && selectedEPal && selectedPlaylinkId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
              onClick={() => setShowPlaylinkModal(false)}
            >
              <button 
                className="absolute top-10 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white z-[110] active:scale-90 transition-transform"
                onClick={() => setShowPlaylinkModal(false)}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>

              <div 
                className="w-full max-w-sm overflow-x-auto flex snap-x snap-mandatory no-scrollbar gap-6"
                onClick={(e) => e.stopPropagation()}
              >
                {(selectedEPal.playlinks || []).concat(myPlaylinks || []).filter((pl, index, self) => 
                  index === self.findIndex((t) => t.id === pl.id)
                ).map((pl) => (
                  <div 
                    key={pl.id}
                    id={`pl-card-${pl.id}`}
                    className="min-w-full snap-center"
                  >
                    <GlassCard className="overflow-hidden border-white/20 shadow-2xl bg-[#07110f] flex flex-col w-full relative">
                      {/* Top Rank Highlight */}
                      <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center pr-14">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Current Rank</span>
                        </div>
                        <span className="text-xl font-black text-white italic">{pl.rank || '-'}</span>
                      </div>

                      {/* Share Button - Top Right of Card */}
                      <div className="absolute top-3 right-3 z-10">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (navigator.share) {
                              navigator.share({
                                title: `${pl.gameName} - ${pl.nickname}`,
                                text: `Check out ${selectedEPal.name}'s ${pl.gameName} profile!`,
                                url: window.location.href
                              }).catch(console.error);
                            }
                          }}
                          className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-all"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {/* Info Grid */}
                      <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4 bg-white/2">
                        <div className="space-y-1.5">
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Platform</p>
                          <div className="flex items-center gap-2">
                            {pl.platform === 'PC' && <Monitor className="w-3.5 h-3.5 text-emerald-400" />}
                            {pl.platform === 'PS' && <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />}
                            {pl.platform === 'Mobile' && <Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
                            <span className="text-sm font-bold text-white">{pl.platform || '-'}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Server</p>
                          <p className="text-sm font-bold text-white">{pl.server || '-'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Position</p>
                          <p className="text-sm font-bold text-white">{pl.role || '-'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Style</p>
                          <p className="text-sm font-bold text-white">{pl.style || '-'}</p>
                        </div>
                      </div>

                      {/* Game Image at bottom */}
                      <div className="relative aspect-video overflow-hidden group">
                        <img 
                          src={pl.posterUrl} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f071a] via-transparent to-transparent" />
                        
                        <div className="absolute bottom-4 left-6">
                          <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{pl.gameName}</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-emerald-400 tracking-widest">{pl.nickname}</p>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(pl.nickname);
                              }}
                              className="p-1 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 transition-colors group/copy"
                            >
                              {copied ? (
                                <Check className="w-2.5 h-2.5 text-green-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-emerald-400 group-hover/copy:text-emerald-300" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review Filter Modal */}
        <AnimatePresence>
          {showReviewFilterModal && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReviewFilterModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 bg-[#0c1714] rounded-t-[32px] border-t border-white/10 z-[201] max-w-md mx-auto p-6 pb-12 space-y-8"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Filter & Sort</h2>
                  <button 
                    onClick={() => setShowReviewFilterModal(false)}
                    className="text-gray-500 hover:text-white font-bold"
                  >
                    Close
                  </button>
                </div>

                {/* Sort Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Sort By</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'DEFAULT', label: 'Default' },
                      { id: 'NEWEST', label: 'Newest' },
                      { id: 'OLDEST', label: 'Oldest' },
                      { id: 'RATING_HIGH', label: 'Highest Rating' },
                      { id: 'RATING_LOW', label: 'Lowest Rating' }
                    ].map((sort) => (
                      <button
                        key={sort.id}
                        onClick={() => setReviewSortOrder(sort.id as any)}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all text-left ${
                          reviewSortOrder === sort.id 
                            ? 'bg-emerald-600/20 border-emerald-500/50' 
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <span className={`text-sm font-bold ${reviewSortOrder === sort.id ? 'text-emerald-400' : 'text-gray-300'}`}>
                          {sort.label}
                        </span>
                        {reviewSortOrder === sort.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Filter by Rating</h3>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button
                      onClick={() => setSelectedRatingFilter(null)}
                      className={`px-5 py-3 rounded-2xl border whitespace-nowrap transition-all flex items-center gap-2 ${
                        selectedRatingFilter === null 
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}
                    >
                      <span className="text-sm font-bold">All</span>
                    </button>
                    {[5, 4, 3, 2, 1].map((star) => (
                      <button
                        key={`rating-filter-star-${star}`}
                        onClick={() => setSelectedRatingFilter(star === selectedRatingFilter ? null : star)}
                        className={`px-5 py-3 rounded-2xl border whitespace-nowrap transition-all flex items-center gap-2 ${
                          selectedRatingFilter === star 
                            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' 
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                      >
                        <span className="text-sm font-bold">{star}</span>
                        <Star className={`w-3.5 h-3.5 ${selectedRatingFilter === star ? 'text-yellow-500 fill-current' : 'text-gray-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setShowReviewFilterModal(false)}
                  className="w-full py-4 rounded-2xl bg-emerald-600 font-bold text-lg shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 transition-all text-white"
                >
                  Apply Filters
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Gift Panel */}
        <AnimatePresence>
          {showGiftPanel && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowGiftPanel(false);
                  setShowQuantitySelector(false);
                }}
                className="fixed inset-0 bg-black/60 z-[200]"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 bg-[#0c1714] rounded-t-[32px] border-t border-white/10 z-[201] max-w-md mx-auto p-6 pb-8 h-[70vh] flex flex-col"
              >
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <h2 className="text-xl font-bold">Send a Gift</h2>
                  <button onClick={() => {
                    setShowGiftPanel(false);
                    setShowQuantitySelector(false);
                  }} className="text-gray-500 hover:text-white font-bold">Close</button>
                </div>

                {/* Gift List - Scrollable */}
                <div className="flex-1 overflow-y-auto no-scrollbar pr-1 mb-6">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 0, icon: Heart, label: 'Heart', price: 10, color: 'text-red-400' },
                      { id: 1, icon: Star, label: 'Star', price: 50, color: 'text-yellow-400' },
                      { id: 2, icon: Zap, label: 'Energy', price: 100, color: 'text-blue-400' },
                      { id: 3, icon: Trophy, label: 'Trophy', price: 500, color: 'text-orange-400' },
                      { id: 4, icon: Gift, label: 'Box', price: 1000, color: 'text-emerald-400' },
                      { id: 5, icon: Play, label: 'Ticket', price: 2000, color: 'text-green-400' },
                      { id: 6, icon: Star, label: 'Super', price: 5000, color: 'text-yellow-500' },
                      { id: 7, icon: Trophy, label: 'Crown', price: 10000, color: 'text-yellow-600' },
                      { id: 8, icon: Heart, label: 'Love', price: 520, color: 'text-pink-400' },
                      { id: 9, icon: Zap, label: 'Thunder', price: 999, color: 'text-yellow-300' },
                    ].map((gift) => (
                      <button 
                        key={gift.id} 
                        onClick={() => setSelectedGiftId(gift.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95 ${
                          selectedGiftId === gift.id 
                            ? 'bg-emerald-600/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full bg-white/5 flex items-center justify-center ${gift.color}`}>
                          <gift.icon className="w-7 h-7 fill-current" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-300">{gift.label}</span>
                        <div className="flex items-center gap-1">
                          <CoinIcon />
                          <span className="text-[11px] font-bold text-white">{gift.price}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="flex items-center justify-between pt-2 shrink-0">
                  {/* Left: Balance & Recharge */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-full border border-white/10">
                      <CoinIcon className="w-4 h-4" textClassName="text-[10px]" />
                      <span className="text-sm font-bold text-white">{wallet?.balance ?? 0}</span>
                    </div>
                    <button 
                      onClick={() => navigateTo('RECHARGE')}
                      className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400 hover:bg-emerald-600/30 active:scale-95 transition-all"
                    >
                      Recharge
                    </button>
                  </div>

                  {/* Right: Quantity & Send */}
                  <div className="relative flex items-center">
                    {/* Quantity Panel */}
                    <AnimatePresence>
                      {showQuantitySelector && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          className="absolute bottom-full right-0 mb-4 bg-[#2a1b3e] border border-white/10 rounded-2xl p-2 grid grid-cols-2 gap-2 shadow-2xl z-[202] min-w-[140px]"
                        >
                          {[1, 10, 52, 66, 99, 520, 1314].map((num) => (
                            <button
                              key={num}
                              onClick={() => {
                                setGiftQuantity(num);
                                setShowQuantitySelector(false);
                              }}
                              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                                giftQuantity === num ? 'bg-emerald-600 text-white' : 'hover:bg-white/5 text-gray-400'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center bg-emerald-600 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] overflow-hidden">
                      <button 
                        onClick={() => setShowQuantitySelector(!showQuantitySelector)}
                        className="pl-5 pr-3 py-3 flex items-center gap-1.5 border-r border-white/20 hover:bg-white/10 transition-colors"
                      >
                        <span className="text-sm font-bold text-white">{giftQuantity}</span>
                        <ChevronRight className={`w-4 h-4 text-white/70 transition-transform ${showQuantitySelector ? 'rotate-90' : '-rotate-90'}`} />
                      </button>
                      <button 
                        onClick={() => {
                          setShowGiftPanel(false);
                          setShowQuantitySelector(false);
                        }}
                        className="pl-4 pr-6 py-3 font-bold text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Game Selector Modal */}
        <AnimatePresence>
          {showGameSelectorModal && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowGameSelectorModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="fixed inset-6 bg-[#0c1714] rounded-[32px] border border-white/10 z-[201] max-w-md mx-auto p-6 overflow-hidden flex flex-col"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">All Communities</h2>
                  <button onClick={() => setShowGameSelectorModal(false)} className="text-gray-500 hover:text-white font-bold">Close</button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                  <button
                    onClick={() => { 
                      setSelectedGame(null); 
                      setShowGameSelectorModal(false); 
                      if (currentView !== 'COMMUNITY') navigateTo('COMMUNITY');
                    }}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      selectedGame === null ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <span className="font-bold">All Communities</span>
                    {selectedGame === null && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </button>
                  {GAMES.map(game => (
                    <button
                      key={`selector-game-${game.id}`}
                      onClick={() => { 
                        setSelectedGame(game); 
                        setShowGameSelectorModal(false); 
                        if (currentView === 'APPLY_PLAYER') {
                          navigateTo('APPLY_PLAYER_CATEGORY');
                        } else if (currentView !== 'COMMUNITY') {
                          navigateTo('COMMUNITY');
                        }
                      }}
                      className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                        selectedGame?.id === game.id ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <img src={game.imageUrl} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      <span className="font-bold flex-1 text-left">{game.name}</span>
                      {selectedGame?.id === game.id && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {/* Ongoing Order Warning Modal */}
        <AnimatePresence>
          {showOngoingOrderWarning && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOngoingOrderWarning(false)}
                className="fixed inset-0 bg-black/60 z-[600]"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-sm bg-[#0c1714] rounded-[32px] border border-white/10 z-[601] p-8 text-center space-y-6 shadow-2xl"
              >
                <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-yellow-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Ongoing Order</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    You already have an ongoing order with this EPal. Please complete or cancel it before placing a new one.
                  </p>
                </div>
                <button 
                  onClick={() => setShowOngoingOrderWarning(false)}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  Got it
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Order Detail Modal */}
        <AnimatePresence>
          {showOrderDetailModal && selectedOrder && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowOrderDetailModal(false)}
                className="fixed inset-0 bg-black/80 z-[400]"
              />
              {(() => {
                const epal = EPALS.find(e => e.id === selectedOrder.epalId);
                return (
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    drag="y"
                    dragConstraints={{ top: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 100 || info.velocity.y > 500) setShowOrderDetailModal(false);
                    }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 bg-[#07110f] z-[401] p-8 pb-12 flex flex-col no-scrollbar overflow-y-auto"
                  >
                    <div 
                      onClick={() => setShowOrderDetailModal(false)}
                      className="flex items-center justify-center py-4 mb-4 shrink-0 cursor-pointer group"
                    >
                      <div className="w-12 h-1.5 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors" />
                    </div>
                    
                    <div className="flex-1 space-y-8">
                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black text-white tracking-tight">Order Details</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">ID: {selectedOrder.id.toUpperCase()}</p>
                      </div>

                      {/* Other Party Section */}
                      <div className="pt-6 border-t border-white/5">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                          {selectedOrder.epalId === 'me' ? 'Customer' : 'E-Pal'}
                        </p>
                        <button 
                          onClick={() => {
                            const otherId = selectedOrder.epalId === 'me' ? selectedOrder.customerId : selectedOrder.epalId;
                            const otherName = selectedOrder.epalId === 'me' ? selectedOrder.customerName : EPALS.find(e => e.id === selectedOrder.epalId)?.name;
                            const otherAvatar = selectedOrder.epalId === 'me' ? selectedOrder.customerAvatar : EPALS.find(e => e.id === selectedOrder.epalId)?.avatarUrl;
                            
                            const otherParty = EPALS.find(e => e.id === otherId) || {
                              id: otherId || 'unknown',
                              name: otherName || 'Unknown',
                              avatarUrl: otherAvatar || 'https://picsum.photos/seed/unknown/100/100',
                              rating: 5.0,
                              orderCount: '0',
                              price: 0,
                              game: '',
                              tags: [],
                              isLegend: false
                            };
                            setShowOrderDetailModal(false);
                            navigateTo('PROFILE', otherParty);
                          }}
                          className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 group-hover:border-emerald-500/50 transition-all">
                              <img 
                                src={selectedOrder.epalId === 'me' ? selectedOrder.customerAvatar : EPALS.find(e => e.id === selectedOrder.epalId)?.avatarUrl} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                {selectedOrder.epalId === 'me' ? selectedOrder.customerName : EPALS.find(e => e.id === selectedOrder.epalId)?.name}
                              </p>
                              <p className="text-[10px] text-gray-500 font-medium">View Profile</p>
                            </div>
                          </div>
                          <ArrowLeft className="w-4 h-4 text-gray-600 rotate-180 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Service Item</span>
                          <span className="font-bold text-white text-sm">{selectedOrder.serviceName}</span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Unit Type</span>
                          <span className="font-bold text-white text-sm">{selectedOrder.unit || 'Game'}</span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Unit Price</span>
                          <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                            <CoinIcon className="w-3.5 h-3.5" />
                            {selectedOrder.unitPrice || selectedOrder.price}
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Quantity</span>
                          <span className="font-bold text-white text-sm">x{selectedOrder.quantity || 1}</span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Order Created</span>
                          <span className="font-bold text-gray-400 text-sm">{selectedOrder.createTime || new Date(selectedOrder.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Order Status</span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                            selectedOrder.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                            selectedOrder.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                            selectedOrder.status === 'ACCEPTED' ? 'bg-blue-500/20 text-blue-400' :
                            selectedOrder.status === 'ONGOING' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {selectedOrder.status}
                          </span>
                        </div>
                        {selectedOrder.status === 'COMPLETED' && selectedOrder.endTime && (
                          <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Completed At</span>
                            <span className="font-bold text-gray-400 text-sm">{new Date(selectedOrder.endTime).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Highlighted Total Price Section */}
                      <div className="bg-gradient-to-br from-emerald-600/10 to-transparent rounded-[32px] p-6 border border-white/5 flex flex-col items-center gap-2 shadow-2xl">
                        <span className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Total Payment</span>
                        <div className="flex items-center gap-3">
                          <CoinIcon className="w-6 h-6" />
                          <span className="text-4xl font-black text-white tracking-tighter">{selectedOrder.totalPrice || selectedOrder.price}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 space-y-6 shrink-0">
                      {/* Review Result Section - Moved below order details */}
                      {selectedOrder.reviewed && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Review Result</p>
                          <div className="p-6 bg-white/5 rounded-[32px] border border-white/10 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={`order-review-${selectedOrder.id}-star-${star}`} 
                                    className={`w-4 h-4 ${star <= (selectedOrder.reviewRating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-700'}`} 
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-black text-white">{selectedOrder.reviewRating}.0</span>
                            </div>
                            {selectedOrder.reviewTags && selectedOrder.reviewTags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {selectedOrder.reviewTags.map((tag, idx) => (
                                  <span key={`order-review-${selectedOrder.id}-tag-${tag}-${idx}`} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            {selectedOrder.reviewFeedback && (
                              <p className="text-sm text-gray-300 leading-relaxed italic">"{selectedOrder.reviewFeedback}"</p>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedOrder.status === 'PENDING' && (
                        <>
                          {selectedOrder.epalId === 'me' ? (
                            <button 
                              onClick={() => {
                                const updatedOrder: IMOrder = { ...selectedOrder, status: 'ACCEPTED' };
                                setImOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
                                setSelectedOrder(updatedOrder);
                              }}
                              className="w-full py-5 bg-green-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(34,197,94,0.4)] active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Accept Order
                            </button>
                          ) : (
                            (() => {
                              const relevantPlaylink = myPlaylinks.find(pl => 
                                selectedOrder.serviceName.toLowerCase().includes(pl.gameName.toLowerCase())
                              );
                              const epal = EPALS.find(e => e.id === selectedOrder.epalId);
                              
                              return (
                                <button 
                                  onClick={() => {
                                    setShowOrderDetailModal(false);
                                    if (epal) {
                                      if (relevantPlaylink) {
                                        const newMsg: Message = {
                                          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                          senderId: 'me',
                                          receiverId: epal.id,
                                          content: `Check out my ${relevantPlaylink.gameName} Playlink!`,
                                          timestamp: Date.now(),
                                          type: 'playlink',
                                          playlinkId: relevantPlaylink.id
                                        };
                                        setCurrentMessages(prev => [...prev, newMsg]);
                                      }
                                      navigateTo('IM_DETAIL', epal);
                                    }
                                  }}
                                  className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                  <Link className="w-4 h-4" />
                                  {relevantPlaylink ? 'Send' : 'Contact'}
                                </button>
                              );
                            })()
                          )}
                          <button 
                            onClick={() => {
                              setImOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'CANCELLED' } : o));
                              setShowOrderDetailModal(false);
                            }}
                            className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all uppercase tracking-widest text-xs"
                          >
                            Cancel Order
                          </button>
                        </>
                      )}

                      {selectedOrder.status === 'ACCEPTED' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-blue-500/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-blue-400" />
                              </div>
                              <p className="text-sm font-bold text-blue-400">Order Accepted! Both parties must confirm to start.</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className={`p-3 rounded-xl border flex flex-col items-center gap-1 ${selectedOrder.customerConfirmedStart ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Customer</span>
                                {selectedOrder.customerConfirmedStart ? (
                                  <div className="flex items-center gap-1 text-green-400 font-bold text-[10px]">
                                    <Check className="w-3 h-3" /> Confirmed
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-600 font-bold italic">Waiting...</span>
                                )}
                              </div>
                              <div className={`p-3 rounded-xl border flex flex-col items-center gap-1 ${selectedOrder.epalConfirmedStart ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">E-Pal</span>
                                {selectedOrder.epalConfirmedStart ? (
                                  <div className="flex items-center gap-1 text-green-400 font-bold text-[10px]">
                                    <Check className="w-3 h-3" /> Confirmed
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-600 font-bold italic">Waiting...</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button 
                            disabled={(selectedOrder.epalId === 'me' && selectedOrder.epalConfirmedStart) || (selectedOrder.customerId === 'me' && selectedOrder.customerConfirmedStart)}
                            onClick={() => {
                              const isMeCustomer = selectedOrder.customerId === 'me';
                              const isMeEpal = selectedOrder.epalId === 'me';
                              
                              const updatedOrder: IMOrder = { 
                                ...selectedOrder,
                                customerConfirmedStart: isMeCustomer ? true : selectedOrder.customerConfirmedStart,
                                epalConfirmedStart: isMeEpal ? true : selectedOrder.epalConfirmedStart,
                              };

                              // Check if both are now confirmed
                              if (updatedOrder.customerConfirmedStart && updatedOrder.epalConfirmedStart) {
                                updatedOrder.status = 'ONGOING';
                              }

                              setImOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
                              setSelectedOrder(updatedOrder);
                            }}
                            className={`w-full py-5 rounded-2xl font-black text-white shadow-2xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 ${
                              ((selectedOrder.epalId === 'me' && selectedOrder.epalConfirmedStart) || (selectedOrder.customerId === 'me' && selectedOrder.customerConfirmedStart))
                                ? 'bg-gray-700 cursor-not-allowed opacity-50'
                                : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-500/20'
                            }`}
                          >
                            <Play className="w-4 h-4 fill-current" />
                            {((selectedOrder.epalId === 'me' && selectedOrder.epalConfirmedStart) || (selectedOrder.customerId === 'me' && selectedOrder.customerConfirmedStart))
                              ? 'Waiting for Other'
                              : 'Confirm Start Service'
                            }
                          </button>
                        </div>
                      )}

                      {selectedOrder.status === 'ONGOING' && (
                        <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-[32px] space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-500/20 rounded-2xl">
                              <Zap className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-white">Service is Ongoing</p>
                              <p className="text-xs text-yellow-500/70 font-bold">Enjoy your game session!</p>
                            </div>
                          </div>
                          
                          {selectedOrder.epalId === 'me' ? (
                             <button 
                              onClick={() => {
                                const updatedOrder: IMOrder = { ...selectedOrder, status: 'COMPLETED', endTime: Date.now() };
                                setImOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
                                setSelectedOrder(updatedOrder);
                              }}
                              className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-white transition-all uppercase tracking-widest text-xs"
                            >
                              Complete Service
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                const epal = EPALS.find(e => e.id === selectedOrder.epalId);
                                if (epal) {
                                  setShowOrderDetailModal(false);
                                  navigateTo('IM_DETAIL', epal);
                                }
                              }}
                              className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-white transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Contact E-Pal
                            </button>
                          )}
                        </div>
                      )}
                      {selectedOrder.status === 'COMPLETED' && !selectedOrder.reviewed && selectedOrder.epalId !== 'me' && (
                        <button 
                          onClick={() => {
                            setShowOrderDetailModal(false);
                            setReviewRating(5);
                            setReviewTags([]);
                            setReviewFeedback('');
                            setShowReviewModal(true);
                          }}
                          className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-emerald-400 hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
                        >
                          Rate this Service
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </>
          )}
        </AnimatePresence>

        {/* Review Modal */}
        <AnimatePresence>
          {showReviewModal && selectedOrder && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReviewModal(false)}
                className="fixed inset-0 bg-black/80 z-[400]"
              />
              {(() => {
                const epal = EPALS.find(e => e.id === selectedOrder.epalId);
                return (
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    drag="y"
                    dragConstraints={{ top: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 100 || info.velocity.y > 500) setShowReviewModal(false);
                    }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 bg-[#07110f] z-[401] p-8 pb-12 flex flex-col no-scrollbar overflow-y-auto"
                  >
                    <div 
                      onClick={() => setShowReviewModal(false)}
                      className="flex items-center justify-center py-4 mb-4 shrink-0 cursor-pointer group"
                    >
                      <div className="w-12 h-1.5 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors" />
                    </div>
                    <div className="space-y-8 flex-1">
                      <div className="relative text-center space-y-2">
                        <h2 className="text-3xl font-black text-white tracking-tight">Rate Service</h2>
                        <p className="text-gray-500 text-sm font-medium">How was your experience with {epal?.name}?</p>
                      </div>

                  {/* Rating */}
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={`submit-review-star-${star}`} 
                        onClick={() => setReviewRating(star)}
                        className="p-1"
                      >
                        <Star className={`w-10 h-10 ${star <= reviewRating ? 'text-yellow-500 fill-current' : 'text-gray-700'}`} />
                      </button>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest text-center">Select Tags</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Professional', 'Friendly', 'Skilled', 'Good Comms', 'Patient', 'Fun'].map((tag, idx) => (
                        <button
                          key={`${tag}-${idx}`}
                          onClick={() => {
                            setReviewTags(prev => 
                              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                            );
                          }}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                            reviewTags.includes(tag)
                              ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                              : 'bg-white/5 border-white/10 text-gray-400'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest text-center">Your Feedback</p>
                    <textarea 
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      placeholder="Share your thoughts about the service..."
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-600 focus:border-emerald-500/50 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        // Mock submit
                        if (selectedOrder) {
                          const updatedOrder: IMOrder = { 
                            ...selectedOrder, 
                            reviewed: true,
                            reviewRating,
                            reviewTags,
                            reviewFeedback
                          };
                          setImOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
                          setSelectedOrder(updatedOrder);
                        }
                        setShowReviewModal(false);
                      }}
                      className="w-full py-4 bg-emerald-600 rounded-2xl font-bold text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
                    >
                      Submit Review
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </>
          )}
        </AnimatePresence>
      </main>

        {/* EPal Filter Modal */}
        <AnimatePresence>
          {showEpalFilterModal && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-[#07110f] z-[401] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 pt-12 pb-6 flex items-center gap-4 shrink-0 border-b border-white/5">
                <button 
                  onClick={() => setShowEpalFilterModal(false)}
                  className="p-2 rounded-full bg-white/5 border border-white/10 text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-black text-white">Filters</h2>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 space-y-10">
                {/* Status */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Status</h3>
                  <div className="flex gap-3">
                    {['ALL', 'ONLINE'].map(s => (
                      <button
                        key={`epal-status-filter-${s}`}
                        onClick={() => setEpalFilters(prev => ({ ...prev, status: s as any }))}
                        className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all border ${
                          epalFilters.status === s 
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                      >
                        {s === 'ALL' ? 'All' : 'Online Only'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Gender</h3>
                  <div className="flex gap-3">
                    {['ALL', 'Male', 'Female'].map(g => (
                      <button
                        key={`epal-gender-filter-${g}`}
                        onClick={() => setEpalFilters(prev => ({ ...prev, gender: g as any }))}
                        className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all border ${
                          epalFilters.gender === g 
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                      >
                        {g === 'ALL' ? 'All' : g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Price Range</h3>
                    <span className="text-xs font-bold text-white">{epalFilters.priceRange[0]} - {epalFilters.priceRange[1]} Coins</span>
                  </div>
                  <div className="px-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={epalFilters.priceRange[1]}
                      onChange={(e) => setEpalFilters(prev => ({ ...prev, priceRange: [prev.priceRange[0], parseInt(e.target.value)] }))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>
                </div>

                {/* Dynamic Filters (Server, Platform, Rank) */}
                {(() => {
                  const gameEpals = EPALS.filter(e => e.game.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || ''));
                  const playlinks = gameEpals.flatMap(e => e.playlinks || []).filter(pl => pl.gameName.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || ''));
                  
                  const servers = Array.from(new Set(playlinks.map(pl => pl.server).filter(Boolean)));
                  const platforms = Array.from(new Set(playlinks.map(pl => pl.platform).filter(Boolean)));
                  const ranks = Array.from(new Set(playlinks.map(pl => pl.rank).filter(Boolean)));

                  return (
                    <div className="space-y-10">
                      {servers.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Server</h3>
                          <button
                            onClick={() => setShowServerSelectorModal(true)}
                            className="w-full flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white transition-all hover:bg-white/10"
                          >
                            <span>{epalFilters.server === 'ALL' ? 'All Servers' : epalFilters.server}</span>
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      )}

                      {platforms.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Platform</h3>
                          <button
                            onClick={() => setShowPlatformSelectorModal(true)}
                            className="w-full flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white transition-all hover:bg-white/10"
                          >
                            <span>{epalFilters.platform === 'ALL' ? 'All Platforms' : epalFilters.platform}</span>
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      )}

                      {ranks.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Rank</h3>
                          <button
                            onClick={() => setShowRankSelectorModal(true)}
                            className="w-full flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white transition-all hover:bg-white/10"
                          >
                            <span>{epalFilters.rank === 'ALL' ? 'All Ranks' : epalFilters.rank}</span>
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Fixed Footer */}
              <div className="p-6 border-t border-white/5 bg-[#07110f] flex gap-4 shrink-0">
                <button 
                  onClick={() => setEpalFilters({
                    status: 'ALL',
                    gender: 'ALL',
                    priceRange: [0, 100],
                    server: 'ALL',
                    platform: 'ALL',
                    rank: 'ALL',
                  })}
                  className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-gray-400 uppercase tracking-widest text-xs active:scale-95 transition-all"
                >
                  Reset All
                </button>
                <button 
                  onClick={() => setShowEpalFilterModal(false)}
                  className="flex-[2] py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rank Selector Modal */}
        <AnimatePresence>
          {showRankSelectorModal && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-[#07110f] z-[500] flex flex-col"
            >
              <div className="px-6 pt-12 pb-6 flex items-center gap-4 shrink-0">
                <button 
                  onClick={() => setShowRankSelectorModal(false)}
                  className="p-2 rounded-full bg-white/5 border border-white/10 text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-black text-white">Select Rank</h2>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12">
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setEpalFilters(prev => ({ ...prev, rank: 'ALL' }));
                      setShowRankSelectorModal(false);
                    }}
                    className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all ${
                      epalFilters.rank === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-bold">All Ranks</span>
                    {epalFilters.rank === 'ALL' && <CheckCircle2 className="w-5 h-5" />}
                  </button>

                  {(() => {
                    const gameEpals = EPALS.filter(e => e.game.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || ''));
                    const playlinks = gameEpals.flatMap(e => e.playlinks || []).filter(pl => pl.gameName.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || ''));
                    const ranks = Array.from(new Set(playlinks.map(pl => pl.rank).filter(Boolean)));

                    const RANK_ORDER = [
                      'Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger',
                      'Ascendant', 'Immortal', 'Radiant', 'Predator', 'AR', 'Level'
                    ];

                    const sortedRanks = ranks.sort((a, b) => {
                      const aIndex = RANK_ORDER.findIndex(r => a.includes(r));
                      const bIndex = RANK_ORDER.findIndex(r => b.includes(r));
                      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                      if (aIndex === -1) return 1;
                      if (bIndex === -1) return -1;
                      return aIndex - bIndex;
                    });

                    return sortedRanks.map(r => (
                      <button
                        key={`rank-selector-option-${r}`}
                        onClick={() => {
                          setEpalFilters(prev => ({ ...prev, rank: r as string }));
                          setShowRankSelectorModal(false);
                        }}
                        className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all ${
                          epalFilters.rank === r ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-bold">{r}</span>
                        {epalFilters.rank === r && <CheckCircle2 className="w-5 h-5" />}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Server Selector Modal */}
        <AnimatePresence>
          {showServerSelectorModal && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-[#07110f] z-[500] flex flex-col"
            >
              <div className="px-6 pt-12 pb-6 flex items-center gap-4 shrink-0">
                <button 
                  onClick={() => setShowServerSelectorModal(false)}
                  className="p-2 rounded-full bg-white/5 border border-white/10 text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-black text-white">Select Server</h2>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8">
                <div className="space-y-3">
                  {(() => {
                    const gameEpals = EPALS.filter(e => e.game.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || ''));
                    const playlinks = gameEpals.flatMap(e => e.playlinks || []).filter(pl => pl.gameName.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || ''));
                    const servers = Array.from(new Set(playlinks.map(pl => pl.server).filter(Boolean)));

                    return (
                      <>
                        <button
                          onClick={() => {
                            setEpalFilters(prev => ({ ...prev, server: 'ALL' }));
                            setShowServerSelectorModal(false);
                          }}
                          className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all ${
                            epalFilters.server === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <span className="font-bold">All Servers</span>
                          {epalFilters.server === 'ALL' && <CheckCircle2 className="w-5 h-5" />}
                        </button>
                        {servers.map(s => (
                          <button
                            key={`server-selector-option-${s}`}
                            onClick={() => {
                              setEpalFilters(prev => ({ ...prev, server: s as string }));
                              setShowServerSelectorModal(false);
                            }}
                            className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all ${
                              epalFilters.server === s ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            <span className="font-bold">{s}</span>
                            {epalFilters.server === s && <CheckCircle2 className="w-5 h-5" />}
                          </button>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform Selector Modal */}
        <AnimatePresence>
          {showPlatformSelectorModal && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-[#07110f] z-[500] flex flex-col"
            >
              <div className="px-6 pt-12 pb-6 flex items-center gap-4 shrink-0">
                <button 
                  onClick={() => setShowPlatformSelectorModal(false)}
                  className="p-2 rounded-full bg-white/5 border border-white/10 text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-black text-white">Select Platform</h2>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8">
                <div className="space-y-3">
                  {(() => {
                    const gameEpals = EPALS.filter(e => e.game.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || ''));
                    const playlinks = gameEpals.flatMap(e => e.playlinks || []).filter(pl => pl.gameName.toLowerCase().includes(selectedGame?.name.toLowerCase().split(' ')[0] || ''));
                    const platforms = Array.from(new Set(playlinks.map(pl => pl.platform).filter(Boolean)));

                    return (
                      <>
                        <button
                          onClick={() => {
                            setEpalFilters(prev => ({ ...prev, platform: 'ALL' }));
                            setShowPlatformSelectorModal(false);
                          }}
                          className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all ${
                            epalFilters.platform === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <span className="font-bold">All Platforms</span>
                          {epalFilters.platform === 'ALL' && <CheckCircle2 className="w-5 h-5" />}
                        </button>
                        {platforms.map(p => (
                          <button
                            key={`platform-selector-option-${p}`}
                            onClick={() => {
                              setEpalFilters(prev => ({ ...prev, platform: p as string }));
                              setShowPlatformSelectorModal(false);
                            }}
                            className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all ${
                              epalFilters.platform === p ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            <span className="font-bold">{p}</span>
                            {epalFilters.platform === p && <CheckCircle2 className="w-5 h-5" />}
                          </button>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recharge Loading Overlay */}
        <AnimatePresence>
          {isRecharging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex flex-col items-center justify-center gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CoinIcon className="w-8 h-8 animate-bounce" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">Processing Payment</h3>
                <p className="text-gray-400 text-sm">Please do not close the app or refresh the page...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Bottom Navigation */}
      {(currentView === 'HOME' || currentView === 'COMMUNITY' || currentView === 'CATEGORY_SERVICES' || currentView === 'IM' || currentView === 'ME') && (
        <nav className="fixed bottom-0 inset-x-0 z-[100] pointer-events-none">
          <div className="bottom-nav-surface backdrop-blur-2xl border-t border-white/[0.07] px-4 py-2.5 pb-[calc(0.55rem+env(safe-area-inset-bottom))] flex justify-around items-center pointer-events-auto">
            <NavButton icon={Home} active={currentView === 'HOME' || currentView === 'CATEGORY_SERVICES'} onClick={() => navigateTo('HOME')} label={t('home')} />
            <NavButton icon={Globe} active={currentView === 'COMMUNITY'} onClick={() => navigateTo('COMMUNITY')} label={t('community')} />
            <NavButton icon={MessageSquare} active={currentView === 'IM'} onClick={() => navigateTo('IM')} label={t('messages')} />
            <NavButton icon={User} active={currentView === 'ME'} onClick={() => navigateTo('ME')} label={t('me')} />
          </div>
        </nav>
      )}
      <AnimatePresence>
        {showDecayExplainer && (
          <DecayExplainerModal 
            ranking={playerRanking} 
            onClose={() => setShowDecayExplainer(false)} 
            onGoToTasks={() => {
              setShowDecayExplainer(false);
              navigateTo('TASK_CENTER');
            }}
          />
        )}
      </AnimatePresence>

      {/* Block/Unblock Confirmation Modal (from Profile) */}
      <AnimatePresence>
        {isBlockConfirmOpen && selectedEPal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-[#0c1714] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${blockedUsers.has(selectedEPal.id) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                  <Ban className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white">
                    {blockedUsers.has(selectedEPal.id) ? 'Confirm Unblock?' : 'Confirm Block?'}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium px-2">
                    {blockedUsers.has(selectedEPal.id) 
                      ? `Are you sure you want to unblock ${selectedEPal.name}? They will be able to interact with you again.`
                      : `Are you sure you want to block ${selectedEPal.name}? They will not be able to interact with you.`}
                  </p>
                </div>
              </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setIsBlockConfirmOpen(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-gray-400 uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleBlockUser(selectedEPal.id)}
                    className={`flex-1 py-4 rounded-2xl text-xs font-black text-white uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                      blockedUsers.has(selectedEPal.id) ? 'bg-emerald-600 shadow-emerald-900/40' : 'bg-red-600 shadow-red-900/40'
                    }`}
                  >
                    Confirm
                  </button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedicated Unblock Confirmation Modal (from Blacklist page) */}
      <AnimatePresence>
        {isUnblockConfirmOpen && userToUnblock && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-[#0c1714] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Ban className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white">Confirm Unblock?</h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium px-2">
                    Are you sure you want to unblock this user? They will be able to interact with you again.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setIsUnblockConfirmOpen(false);
                    setUserToUnblock(null);
                  }}
                  className="py-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-gray-400 uppercase tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleBlockUser(userToUnblock);
                    setIsUnblockConfirmOpen(false);
                    setUserToUnblock(null);
                  }}
                  className="py-4 rounded-2xl bg-emerald-600 text-xs font-black text-white uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Cache Confirmation Modal */}
      <AnimatePresence>
        {isClearCacheConfirmOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#10201b] border border-white/10 rounded-[32px] p-8 space-y-8"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Clear Cache?</h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-bold">
                    This will remove temporary files and free up space. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsClearCacheConfirmOpen(false)}
                  className="py-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-gray-400 uppercase tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setCacheSize('0 B');
                    setIsClearCacheConfirmOpen(false);
                  }}
                  className="py-4 rounded-2xl bg-red-600 text-xs font-black text-white uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <ReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetName={selectedEPal?.name || selectedPost?.userName || ''}
        context={reportContext}
        onSubmit={handleReportSubmit}
      />

      {/* Country Picker Modal */}
      <AnimatePresence>
        {showCountryPicker && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCountryPicker(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-[#10201b] border-t border-white/10 rounded-t-[32px] z-[201] max-h-[50vh] flex flex-col pt-2"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-4" />
              
              <div className="px-6 flex items-center justify-between mb-4">
                <button onClick={() => setShowCountryPicker(false)} className="text-gray-500 font-bold text-sm transition-colors hover:text-white">Cancel</button>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Select Country</h3>
                <button 
                  onClick={() => setShowCountryPicker(false)}
                  className="text-emerald-400 font-black uppercase tracking-widest text-sm transition-colors hover:text-emerald-300"
                >
                  Done
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar snap-y snap-mandatory py-20 px-6 relative">
                {/* Selection Highlight */}
                <div className="absolute top-1/2 left-6 right-6 h-12 -translate-y-1/2 pointer-events-none bg-white/5 border-y border-white/10 rounded-xl" />
                
                {COUNTRIES.map((country) => {
                  const isSelected = tempProfile.region === country;
                  return (
                    <div 
                      key={country}
                      onClick={() => setTempProfile(prev => ({ ...prev, region: country }))}
                      className={`h-12 flex items-center justify-center snap-center transition-all duration-300 cursor-pointer ${isSelected ? 'text-white text-lg font-black' : 'text-gray-600 text-sm font-bold'}`}
                    >
                      {country}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unsaved Changes Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#0c1714] border border-white/10 rounded-[32px] p-8 space-y-6 relative z-10"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Unsaved Changes</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    You have unsaved changes. Are you sure you want to exit?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 px-4 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowExitConfirm(false);
                    handleBack();
                  }}
                  className="flex-1 px-4 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-900/40"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Language Confirmation Modal */}
      <AnimatePresence>
        {showLanguageConfirm && pendingLanguage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-[#0c1714] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Languages className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white">
                    {t('changeLanguageTitle')}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium px-2">
                    {t('changeLanguageDesc')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setSelectedLanguage(pendingLanguage);
                    setPendingLanguage(null);
                    setShowLanguageConfirm(false);
                    handleBack();
                  }}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  {t('confirm')}
                </button>
                <button 
                  onClick={() => {
                    setShowLanguageConfirm(false);
                    setPendingLanguage(null);
                  }}
                  className="w-full py-4 bg-white/5 text-gray-400 hover:text-white rounded-2xl font-bold uppercase tracking-widest transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playlinkToDelete && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPlaylinkToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0c1714] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
                  <Trash2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-wider">Delete Playlink?</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    This will permanently remove this game association from your profile. This action cannot be undone.
                  </p>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    onClick={() => {
                      if (playlinkToDelete) {
                        setMyPlaylinks(prev => prev.filter(l => l.id !== playlinkToDelete));
                        setShowSubmissionToast({ show: true, message: 'Playlink deleted' });
                        setTimeout(() => setShowSubmissionToast({ show: false, message: '' }), 3000);
                        setPlaylinkToDelete(null);
                      }
                    }}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-red-900/20 transition-all active:scale-95"
                  >
                    Delete Permanently
                  </button>
                  <button 
                    onClick={() => setPlaylinkToDelete(null)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DatePickerModal 
        isOpen={!!datePickerTarget} 
        onClose={() => setDatePickerTarget(null)} 
        value={datePickerTarget?.value || ''} 
        onChange={handleDateChange}
        title={datePickerTarget?.title || 'Select Date'}
        mode={datePickerTarget?.id === 'BIRTHDAY' ? 'BIRTHDAY' : 'PAST'}
        language={selectedLanguage}
      />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {showSubmissionToast.show && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-6 right-6 z-[2000]"
          >
            <div className="max-w-xs mx-auto bg-[#0c1714]/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{showSubmissionToast.message}</h4>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        <AnimatePresence mode="wait">
          {showPostCategorySelector && (
            <PostCategorySelectorModal
              isOpen={showPostCategorySelector}
              onClose={() => setShowPostCategorySelector(false)}
              onSelect={(game) => {
                setNewPostGame(game);
                setShowPostCategorySelector(false);
                setTimeout(() => setShowCreatePost(true), 300);
              }}
              games={GAMES}
            />
          )}
          {showCreatePost && (
            <CreatePostModal 
              isOpen={showCreatePost} 
              onClose={() => {
                setShowCreatePost(false);
                setPostImages([]);
                setNewPostGame(null);
              }} 
              onPost={handleCreatePost}
              content={newPostContent}
              setContent={setNewPostContent}
              images={postImages}
              setImages={setPostImages}
              selectedGame={newPostGame}
            />
          )}
        </AnimatePresence>

        <AccountBindModal
          isOpen={showBindModal}
          onClose={() => setShowBindModal(false)}
          type={bindType}
          value={bindValue}
          onValueChange={setBindValue}
          step={verificationStep}
          onSendCode={handleSendCode}
          onVerify={handleVerifyBind}
          code={verificationCode}
          onCodeChange={setVerificationCode}
          resendCooldown={resendCooldown}
          selectedCountryCode={selectedCountryCode}
          onSelectedCountryCodeChange={setSelectedCountryCode}
          setVerificationStep={setVerificationStep}
          handleUnbind={handleUnbind}
        />
    </div>
  );
}

const COUNTRY_CODES = [
  { code: '+1', name: 'USA' },
  { code: '+86', name: 'China' },
  { code: '+44', name: 'UK' },
  { code: '+81', name: 'Japan' },
  { code: '+971', name: 'UAE' },
];

const AccountBindModal = ({ 
  isOpen, 
  onClose, 
  type, 
  value, 
  onValueChange, 
  step, 
  onSendCode, 
  onVerify, 
  code, 
  onCodeChange, 
  resendCooldown,
  selectedCountryCode,
  onSelectedCountryCodeChange,
  setVerificationStep,
  handleUnbind
}: {
  isOpen: boolean;
  onClose: () => void;
  type: 'EMAIL' | 'PHONE' | null;
  value: string;
  onValueChange: (val: string) => void;
  step: 'VIEW' | 'INPUT' | 'VERIFY' | null;
  onSendCode: () => void;
  onVerify: () => void;
  code: string;
  onCodeChange: (val: string) => void;
  resendCooldown: number;
  selectedCountryCode: string;
  onSelectedCountryCodeChange: (val: string) => void;
  setVerificationStep: (step: 'VIEW' | 'INPUT' | 'VERIFY') => void;
  handleUnbind: (type: 'EMAIL' | 'PHONE') => void;
}) => {
  if (!isOpen || !type) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-[#0c1714] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative z-[301]"
        >
          <div className="p-10 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">
                {step === 'VIEW' ? (type === 'EMAIL' ? 'Email Binding' : 'Phone Binding') : 
                 step === 'INPUT' ? `Bind ${type === 'EMAIL' ? 'Email' : 'Phone'}` : 'Verification'}
              </h2>
              <button 
                onClick={onClose}
                className="p-2.5 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {step === 'VIEW' ? (
              <div className="space-y-10">
                <div className="space-y-4 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-2">
                    {type === 'EMAIL' ? <Mail className="w-10 h-10 text-emerald-400" /> : <Phone className="w-10 h-10 text-emerald-400" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-sm font-medium tracking-wideGray">Your current bound {type.toLowerCase()} address is</p>
                    <p className="text-2xl font-black text-white tracking-tight">{value}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => setVerificationStep('INPUT')}
                    className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all uppercase tracking-[0.2em] text-xs"
                  >
                    Change {type === 'EMAIL' ? 'Email' : 'Phone'}
                  </button>
                  <button 
                    onClick={() => handleUnbind(type)}
                    className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-red-400 hover:bg-red-500/10 hover:border-red-500/20 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs"
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ) : step === 'INPUT' ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] px-2 block">
                    {type === 'EMAIL' ? 'Email Address' : 'Phone Number'}
                  </label>
                  <div className="flex flex-col gap-4">
                    {type === 'PHONE' && (
                      <div className="relative">
                        <select 
                          value={selectedCountryCode}
                          onChange={(e) => onSelectedCountryCodeChange(e.target.value)}
                          className="appearance-none w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all cursor-pointer text-base"
                        >
                          {COUNTRY_CODES.map(c => (
                            <option key={c.code} value={c.code} className="bg-[#0c1714] text-white">
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-400">
                        {type === 'EMAIL' ? <Mail className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                      </div>
                      <input 
                        type={type === 'EMAIL' ? 'email' : 'tel'}
                        value={value}
                        onChange={(e) => onValueChange(e.target.value)}
                        placeholder={type === 'EMAIL' ? 'example@email.com' : 'Enter phone number'}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-white placeholder:text-gray-700 focus:outline-none focus:border-emerald-500 transition-all font-bold text-base"
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={onSendCode}
                  disabled={!value}
                  className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all uppercase tracking-[0.2em] text-xs disabled:opacity-50 disabled:scale-100 disabled:shadow-none mt-4"
                >
                  Send Verification Code
                </button>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">We've sent a 6-digit code to</p>
                  <p className="font-bold text-white tracking-wide">{type === 'PHONE' ? `${selectedCountryCode} ${value}` : value}</p>
                </div>

                <div className="flex justify-center gap-2">
                  <div className="relative w-full max-w-xs flex justify-center gap-2">
                    {/* Hidden input to capture numeric typing */}
                    <input 
                      type="tel"
                      maxLength={6}
                      value={code}
                      autoFocus
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        onCodeChange(val);
                      }}
                      className="absolute inset-0 opacity-0 cursor-default"
                    />
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={`code-digit-${i}`} 
                        className={`w-12 h-14 bg-white/5 border rounded-2xl flex items-center justify-center text-2xl font-black transition-all ${
                          code.length === i ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-500/5' : 
                          code[i] ? 'border-white/20 text-white' : 'border-white/10 text-gray-700'
                        }`}
                      >
                        {code[i] || ''}
                        {code.length === i && (
                          <motion.div 
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="w-0.5 h-6 bg-emerald-500 rounded-full ml-0.5"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <button 
                    onClick={onVerify}
                    disabled={code.length !== 6}
                    className="w-full py-4 bg-emerald-600 rounded-2xl font-black text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    Verify & Bind
                  </button>
                  
                  <button 
                    onClick={onSendCode}
                    disabled={resendCooldown > 0}
                    className="flex items-center gap-2 mx-auto text-[10px] font-black uppercase tracking-widest text-emerald-400 disabled:text-gray-600 transition-all"
                  >
                    {resendCooldown > 0 ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" /> Resend in {resendCooldown}s</>
                    ) : (
                      <><RefreshCw className="w-3 h-3" /> Resend Code</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const PostCategorySelectorModal = ({ isOpen, onClose, onSelect, games }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSelect: (game: Game) => void,
  games: Game[]
}) => {
  if (!isOpen) return null;

  const groupedGames = games.reduce((acc, game) => {
    const letter = game.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(game);
    return acc;
  }, {} as { [key: string]: Game[] });

  return (
    <div className="fixed inset-0 z-[120] bg-[#07110f] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#07110f]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/5">
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-black text-white uppercase tracking-widest">Select Category</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        <div className="space-y-8">
          {Object.entries(groupedGames)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([letter, letterGames]) => (
              <div key={`post-category-letter-${letter}`} className="space-y-4">
                <div className="text-emerald-400 font-bold text-lg border-b border-white/10 pb-2">{letter}</div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                  {letterGames
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(game => (
                      <button
                        key={`post-category-option-${game.id}`}
                        onClick={() => onSelect(game)}
                        className="flex flex-col gap-2 transition-all text-center group active:scale-95"
                      >
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg border border-white/5 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300">
                          <img 
                            src={game.imageUrl} 
                            alt={game.name} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="font-bold text-white text-[11px] truncate px-1 group-hover:text-emerald-400 transition-colors">
                          {game.name}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const CreatePostModal = ({ 
  isOpen, 
  onClose, 
  onPost, 
  content, 
  setContent, 
  images, 
  setImages,
  selectedGame,
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onPost: () => void, 
  content: string, 
  setContent: (v: string) => void,
  images: string[],
  setImages: React.Dispatch<React.SetStateAction<string[]>>,
  selectedGame: Game | null,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 9 - images.length;
    const newFiles: File[] = Array.from(files).slice(0, remainingSlots) as File[];

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#07110f] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#07110f]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/5">
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white">
          <X className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Create Post</h2>
          {selectedGame && (
            <span className="text-[10px] text-emerald-400 font-bold mt-1 uppercase tracking-wider">{selectedGame.name}</span>
          )}
        </div>
        <button 
          onClick={onPost}
          disabled={(!content.trim() && images.length === 0) || !selectedGame}
          className="px-6 py-2 bg-emerald-600 disabled:opacity-50 disabled:grayscale text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
        >
          Post
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-6 space-y-6">
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?..."
            className="w-full bg-transparent text-white text-lg placeholder:text-gray-600 outline-none transition-all resize-none min-h-[120px]"
          />

          {/* Image Grid */}
          <div className="grid grid-cols-3 gap-2 pb-10">
            {images.map((img, idx) => (
              <div key={`post-creation-img-${idx}-${img.substring(0, 20)}`} className="relative aspect-square rounded-xl overflow-hidden group">
                <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-white/5 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:bg-white/10 transition-all"
              >
                <Plus className="w-6 h-6" />
                <span className="text-[10px] uppercase font-black tracking-widest">{images.length}/9</span>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              multiple 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const PostImageGrid = ({ images, postId }: { images: string[], postId?: string }) => {
  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 bg-white/5">
        <img 
          src={images[0]} 
          alt="Post content" 
          className="w-full max-h-[70vh] object-contain bg-black/20"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  const gridCols = (images.length === 2 || images.length === 4) ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-1 rounded-2xl overflow-hidden border border-white/5 bg-[#07110f]`}>
      {images.map((img, i) => (
        <div key={`post-grid-img-${postId || 'single'}-${i}`} className="aspect-square relative group overflow-hidden">
          <img 
            src={img} 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            referrerPolicy="no-referrer"
          />
        </div>
      ))}
    </div>
  );
};

const NavButton = ({ icon: Icon, active, onClick, label }: { icon: any, active?: boolean, onClick?: () => void, label?: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[64px] rounded-2xl py-1 ${
      active
        ? 'text-emerald-300'
        : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    <div className={`size-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${
      active ? 'bg-emerald-500/16 shadow-[0_8px_20px_rgba(16,185,129,0.13)]' : ''
    }`}>
      <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} fill={active ? "currentColor" : "none"} />
    </div>
    {label && (
      <span className={`text-[9px] font-bold ${active ? 'opacity-100' : 'opacity-65'}`}>
        {label}
      </span>
    )}
  </button>
);

const Toast = ({ message, type, onClose }: { message: string, type: 'SUCCESS' | 'ERROR' | 'INFO', onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm"
    >
      <div className={`px-6 py-4 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-between gap-4 ${
        type === 'SUCCESS' ? 'bg-green-500/20' : 
        type === 'ERROR' ? 'bg-red-500/20' : 'bg-emerald-600/20'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            type === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : 
            type === 'ERROR' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {type === 'SUCCESS' ? <CheckCheck className="w-4 h-4" /> : 
             type === 'ERROR' ? <X className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </div>
          <p className="text-white text-sm font-bold">{message}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
