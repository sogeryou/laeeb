import React, { useState } from 'react';
import { 
  ArrowLeft, 
  UserPlus, 
  Send,
  X,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IcebreakerUser } from '../types/review';

// Mock Data
export const MOCK_ICEBREAKER_USERS: IcebreakerUser[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `ib${i}`,
  nickname: `${String.fromCharCode(65 + i)}${String.fromCharCode(97 + i)}***`,
  registerDuration: `${i + 1} days`,
  isActive: i % 3 === 0,
  gameTags: ['Valorant', 'LoL']
}));

const GlassCard = ({ children, className = "", onClick, ...props }: { children: React.ReactNode, className?: string, onClick?: () => void, [key: string]: any }) => (
  <div
    onClick={onClick}
    className={`bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-3xl overflow-hidden shadow-sm transition-all duration-200 ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    {...props}
  >
    {children}
  </div>
);

interface IcebreakerPoolViewProps {
  onBack: () => void;
  onNavigateToProfile?: (payload: any) => void;
  t: (key: string) => string;
}

export const IcebreakerPoolView: React.FC<IcebreakerPoolViewProps> = ({ onBack, onNavigateToProfile, t }) => {
  const [selectedUser, setSelectedUser] = useState<IcebreakerUser | null>(null);
  const [showSayHi, setShowSayHi] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hiCount, setHiCount] = useState(12);

  const templates = [
    t('icebreakerMsg1'),
    t('icebreakerMsg2'),
    t('icebreakerMsg3')
  ];

  const handleSayHi = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setShowSayHi(false);
      setMessage('');
      setHiCount(prev => prev + 1);
    }, 1500);
  };

  return (
    <div className="min-h-screen pb-20 bg-[#07110f]">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-[#07110f]/80 px-6 py-4 pt-12 border-b border-white/[0.06] flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-white/[0.04] rounded-xl border border-white/[0.07]">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-bold">{t('newUsers')}</h1>
        <div className="w-10" />
      </div>

      <div className="p-6 space-y-6">
        {/* Info Card */}
        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-3xl p-6 flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-600/20">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{t('icebreakerPool')}</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{t('icebreakerDesc').replace('{count}', String(hiCount))}</p>
          </div>
        </div>

        {/* User List */}
        <div className="grid grid-cols-1 gap-4">
          {MOCK_ICEBREAKER_USERS.map(user => (
            <GlassCard key={user.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => onNavigateToProfile?.({ 
                    id: user.id,
                    name: user.nickname, 
                    avatarUrl: `https://picsum.photos/seed/${user.id}/100/100`,
                    rating: 5.0,
                    orderCount: '0',
                    price: 0,
                    game: user.gameTags[0] || 'Valorant',
                    tags: user.gameTags,
                    onlineStatus: user.isActive ? 'Online' : 'Offline'
                  })}
                  className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-gray-500 relative cursor-pointer active:scale-95 transition-all overflow-hidden"
                >
                  <img src={`https://picsum.photos/seed/${user.id}/100/100`} alt="" className="w-full h-full object-cover" />
                  {user.isActive && (
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 border-2 border-[#1a0b2e] rounded-full" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-white">{user.nickname}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-500 font-bold tracking-tight">Joined {user.registerDuration} ago</span>
                  </div>
                </div>
              </div>
              <button 
                disabled={hiCount >= 25}
                onClick={() => {
                  setSelectedUser(user);
                  setShowSayHi(true);
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  hiCount >= 25 ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 active:scale-95'
                }`}
              >
                Say Hi
              </button>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Say Hi Bottom Sheet */}
      <AnimatePresence>
        {showSayHi && selectedUser && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSayHi(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 inset-x-0 z-[110] bg-[#0c1714] border-t border-white/[0.07] rounded-t-[32px] p-8 space-y-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/5">
                    <img src={`https://picsum.photos/seed/${selectedUser.id}/100/100`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{t('sayHiTo')} {selectedUser.nickname}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{t('firstContactCounts')}</p>
                  </div>
                </div>
                <button onClick={() => setShowSayHi(false)} className="p-2 bg-white/[0.04] rounded-xl border border-white/[0.07]">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('quickReplies')}</p>
                <div className="grid grid-cols-1 gap-2">
                  {templates.map((t, i) => (
                    <button 
                      key={`icebreaker-msg-template-${i}`}
                      onClick={() => setMessage(t)}
                      className={`w-full p-4 rounded-2xl border text-left text-xs transition-all ${
                        message === t ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-white/[0.04] border-white/[0.07] text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('customMessage')}</p>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('phTypeYourMessage')}
                  className="w-full h-32 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                />
              </div>

              <button 
                disabled={!message.trim() || isSending}
                onClick={handleSayHi}
                className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  !message.trim() || isSending ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 shadow-emerald-600/20 active:scale-95'
                }`}
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
