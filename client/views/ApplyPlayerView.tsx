import React from 'react';
import { 
  Search, 
  Gift, 
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
  Flag,
  Users,
  Zap,
  Trophy,
  Send,
  Bell,
  Contact,
  Smile,
  AlertTriangle,
  Wallet,
  CreditCard,
  History,
  Settings,
  X,
  Camera,
  LogOut,
  ShieldCheck,
  HelpCircle,
  Gem,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Calendar,
  Store,
  ChevronLeft,
  Lock,
  Globe,
  Shield,
  Link,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Game, EPal, EPalServiceVariant, Coupon, Playlink, Post, Message, ChatSession, IMOrder, Wallet as WalletType, RechargePackage, WalletTransaction, RechargeOrder } from '@shared/types';
import { PRODUCT_SEMVER } from '../constants';
import { GlassCard } from '../components/ui/GlassCard';
import { IconButton } from '../components/ui/IconButton';
import { WaveAnimation } from '../components/ui/WaveAnimation';
import { CoinIcon } from '../components/ui/CoinIcon';
import { EPalCard } from '../components/cards/EPalCard';
import { LegendEPalCard } from '../components/cards/LegendEPalCard';
import { GameGridItem } from '../components/cards/GameGridItem';
import { WalletView } from '../views/WalletView';
import { RechargeView } from '../views/RechargeView';
import { SettingsSubPage } from '../components/SettingsSubPage';
import { formatChatMessageTime } from '../lib/chatTime';

import { useApp } from '../app/AppContext';
import { refreshApprovedOwnerSession } from '../components/application/approvedSession';
import { applicationErrorText } from '../components/application/applicationCopy';
import { isValidApplicationPrice } from '../components/application/applicationModel';

export function ApplyPlayerView() {
const {
    deviceId, locale, setLocale, t, supportedLocales, getLocaleLabel,
    currentView, setCurrentView, wallet, setWallet, transactions, setTransactions,
    rechargePackages, setRechargePackages, isRecharging, setIsRecharging,
    isRecording, setIsRecording, recordingTime, setRecordingTime,
    pushNotificationsEnabled, setPushNotificationsEnabled, cacheSize, setCacheSize,
    isAuthenticated, setIsAuthenticated, isAuthenticatedRef, authToken, setAuthToken,
    showAuthModal, setShowAuthModal, authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authUsername, setAuthUsername, authStatus, setAuthStatus,
    toastMessage, setToastMessage, companionRankings, setCompanionRankings,
    rankingsLoading, setRankingsLoading, rankingsError, setRankingsError,
    rankingSortBy, setRankingSortBy, showRankingModal, setShowRankingModal,
    expandedRankingId, setExpandedRankingId, pendingNavigationRef, authTokenRef,
    fetchWallet, fetchTransactions, fetchPackages, fetchCompanionRankings, sortedRankings,
    openAuthModal, notify, requireAuthAction, handleLogout, handleAuthSubmit, handleRecharge,
    selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, selectedGame, setSelectedGame,
    selectedServiceCategory, setSelectedServiceCategory, applicationDetails, setApplicationDetails,
    selectedEPal, setSelectedEPal, selectedPost, setSelectedPost, showGiftPanel, setShowGiftPanel,
    selectedGiftId, setSelectedGiftId, giftQuantity, setGiftQuantity, showQuantitySelector, setShowQuantitySelector,
    userCoins, setUserCoins, userDiamonds, setUserDiamonds, withdrawAmount, setWithdrawAmount,
    withdrawAddress, setWithdrawAddress, withdrawSubmitting, setWithdrawSubmitting,
    userRole, setUserRole, isPlayerOnline, setIsPlayerOnline, playerApplicationStatus, setPlayerApplicationStatus,
    playerApplicationStep, setPlayerApplicationStep, playerApplicationData, setPlayerApplicationData,
    applyGameSearchQuery, setApplyGameSearchQuery, showApplySelectionModal, setShowApplySelectionModal,
    showGameSelectorModal, setShowGameSelectorModal, focusCommentInput, setFocusCommentInput, commentInputRef,
    handleWithdrawSubmit, moreEPals, setMoreEPals, loadingMore, setLoadingMore, favorites, setFavorites,
    playingEPalId, setPlayingEPalId, activeServiceId, setActiveServiceId, selectedVariant, setSelectedVariant,
    orderQuantity, setOrderQuantity, availableCoupons, setAvailableCoupons, selectedCoupon, setSelectedCoupon,
    showCouponModal, setShowCouponModal, showServiceTypeModal, setShowServiceTypeModal,
    profileTab, setProfileTab, selectedPlaylinkId, setSelectedPlaylinkId, showPlaylinkModal, setShowPlaylinkModal,
    showUnfollowModal, setShowUnfollowModal, epalToUnfollow, setEpalToUnfollow, showServiceDetails, setShowServiceDetails,
    reviewSortOrder, setReviewSortOrder, selectedReviewTag, setSelectedReviewTag, selectedRatingFilter, setSelectedRatingFilter,
    showReviewFilterModal, setShowReviewFilterModal, imTab, setImTab, imSearchQuery, setImSearchQuery,
    walletTab, setWalletTab, walletDate, setWalletDate, selectedApplyGameCategory, setSelectedApplyGameCategory,
    epalSortBy, setEpalSortBy, epalFilters, setEpalFilters, showEpalFilterModal, setShowEpalFilterModal,
    showRankSelectorModal, setShowRankSelectorModal, showServerSelectorModal, setShowServerSelectorModal,
    showPlatformSelectorModal, setShowPlatformSelectorModal, isImSearchExpanded, setIsImSearchExpanded,
    chatSessions, setChatSessions, imOrders, setImOrders, showOngoingOrderWarning, setShowOngoingOrderWarning,
    currentMessages, setCurrentMessages, messageInput, setMessageInput, selectedOrder, setSelectedOrder,
    showOrderDetailModal, setShowOrderDetailModal, showImServiceCards, setShowImServiceCards,
    showReviewModal, setShowReviewModal, reviewRating, setReviewRating, reviewTags, setReviewTags, reviewFeedback, setReviewFeedback,
    orderTab, setOrderTab, userStatus, setUserStatus, showStatusModal, setShowStatusModal, viewHistory, setViewHistory,
    contactsTab, setContactsTab, communityTab, setCommunityTab, showFullSearch, setShowFullSearch,
    fullSearchQuery, setFullSearchQuery, fullSearchResults, setFullSearchResults,
    isScrolling, setIsScrolling, copied, setCopied, followedEPals, setFollowedEPals, followersOfMe, mutualFollowers,
    filteredPosts, toggleFollow, confirmUnfollow, copyToClipboard, observer, lastElementRef, legendEPals,
    navigateTo, handleBack, loadMore, toggleFavorite, handlePlayToggle, allSortedGames, favoritedGames, alphabet, scrollToLetter, groupedGames,
    EPALS, GAMES, POSTS, companionApplication, authUser,
  } = useApp();

  const unavailable = locale === 'ar' ? 'غير متاح حالياً' : 'Currently unavailable';
  const confirmApproved = async () => {
    if (!authToken || !authUser?.id) return;
    const owner = authUser.id;
    const token = authToken;
    try {
      const confirmed = await refreshApprovedOwnerSession(token, owner, companionApplication.sessionGuard(owner, token));
      if (!confirmed) {
        await companionApplication.refresh();
        return;
      }
      navigateTo('PLAYER_CENTER');
    } catch { await companionApplication.refresh(); }
  };

  return (
    <>
            <motion.div 
              key="apply_player"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-screen bg-[#0f071a] flex flex-col"
            >
              <div className="p-6 space-y-6 flex-1 overflow-y-auto pb-40">
                <div className="flex items-center gap-4">
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
                    <h1 className="text-xl font-bold">{t('me.becomePlayer')}</h1>
                    <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">{t('apply.stepOf', { current: playerApplicationStep, total: 4 })}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 h-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div 
                      key={step}
                      className={`flex-1 rounded-full transition-all duration-500 ${
                        step <= playerApplicationStep ? 'bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                {companionApplication.error && <div role="alert" className="flex items-center justify-between gap-3 text-sm text-red-300"><span className="min-w-0 break-words">{applicationErrorText(companionApplication.error, locale)}</span><button onClick={() => void companionApplication.refresh()} className="shrink-0 underline">{locale === 'ar' ? 'تحديث' : 'Refresh'}</button></div>}
                {companionApplication.loading && !companionApplication.application ? (
                  <div role="status" className="py-12 text-center text-gray-400">{locale === 'ar' ? 'جار تحميل الطلب...' : 'Loading application...'}</div>
                ) : playerApplicationStatus === 'PENDING' ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6 text-center">
                    <div className="w-24 h-24 rounded-[40px] bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                      <History className="w-12 h-12 text-purple-400 animate-spin-slow" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-white">{t('apply.pendingTitle')}</h2>
                      <p className="text-sm text-gray-500 max-w-[280px] mx-auto">{t('apply.pendingBody')}</p>
                    </div>
                    <button 
                      onClick={handleBack}
                      className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/10 transition-all"
                    >
                      {t('apply.backToProfile')}
                    </button>
                  </div>
                ) : playerApplicationStatus === 'REJECTED' && !companionApplication.editing ? (
                  <div className="space-y-6 py-12 text-center">
                    <h2 className="text-xl font-bold text-white">{locale === 'ar' ? 'تم رفض الطلب' : 'Application rejected'}</h2>
                    <p className="whitespace-pre-wrap break-words text-gray-300">{companionApplication.application?.rejectionReason}</p>
                    <button onClick={() => { companionApplication.editRejected(); setPlayerApplicationStep(1); }} className="px-8 py-4 bg-purple-600 rounded-2xl font-bold text-white">{locale === 'ar' ? 'تعديل وإعادة التقديم' : 'Edit and resubmit'}</button>
                  </div>
                ) : playerApplicationStatus === 'APPROVED' ? (
                  <div className="space-y-6 py-12 text-center">
                    <h2 className="text-xl font-bold text-white">{locale === 'ar' ? 'تمت الموافقة على طلبك' : 'Application approved'}</h2>
                    <button onClick={confirmApproved} className="px-8 py-4 bg-purple-600 rounded-2xl font-bold text-white">{locale === 'ar' ? 'مركز اللاعب' : 'Player Center'}</button>
                  </div>
                ) : (
                  <fieldset disabled={companionApplication.busy || companionApplication.attemptPending} className="space-y-8">
                    {/* Step 1: Select Category */}
                    {playerApplicationStep === 1 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black text-white">{t('apply.chooseGameTitle')}</h2>
                          <p className="text-sm text-gray-500">{t('apply.chooseGameSubtitle')}</p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input 
                            type="text"
                            placeholder={t('apply.searchGamesPlaceholder')}
                            value={applyGameSearchQuery}
                            onChange={(e) => setApplyGameSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-purple-500/50 outline-none transition-all"
                          />
                        </div>

                        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                          {[
                            { id: 'GAMES', label: t('apply.tabGames') },
                            { id: 'CHILLING', label: t('apply.tabChill') }
                          ].map((tab) => (
                            <button 
                              key={tab.id}
                              onClick={() => setSelectedApplyGameCategory(tab.id)}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                selectedApplyGameCategory === tab.id ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'text-gray-500 hover:text-gray-300'
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
                            <div key={letter} className="space-y-2">
                              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-2">{letter}</p>
                              <div className="space-y-1">
                                {games.sort((a, b) => a.name.localeCompare(b.name)).map(game => (
                                  <button
                                    key={game.id}
                                    onClick={() => {
                                      setPlayerApplicationData(prev => ({ ...prev, gameId: game.id }));
                                    }}
                                    className={`w-full py-4 px-4 flex items-center gap-4 rounded-2xl border transition-all group ${
                                      playerApplicationData.gameId === game.id 
                                        ? 'bg-purple-600/20 border-purple-500/50' 
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
                                      <CheckCircle2 className="w-5 h-5 text-purple-400" />
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
                          <h2 className="text-2xl font-black text-white">{t('apply.gameConfigTitle')}</h2>
                          <p className="text-sm text-gray-500">
                            {t('apply.gameConfigSubtitle', {
                              gameName: GAMES.find(g => g.id === playerApplicationData.gameId)?.name ?? ''
                            })}
                          </p>
                        </div>

                        <div className="space-y-4">
                          {GAMES.find(g => g.id === playerApplicationData.gameId)?.hasRank && (
                            <button 
                              onClick={() => setShowApplySelectionModal({
                                show: true,
                                type: 'RANK',
                                title: t('apply.modalRankTitle'),
                                options: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master']
                              })}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                              <div className="text-left">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t('apply.fieldRank')}</p>
                                <p className={`text-sm font-bold ${playerApplicationData.rank ? 'text-white' : 'text-gray-600'}`}>
                                  {playerApplicationData.rank || t('apply.selectRank')}
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
                                title: t('apply.modalPositionTitle'),
                                options: ['Top', 'Jungle', 'Mid', 'ADC', 'Support']
                              })}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                              <div className="text-left">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t('apply.fieldMainPosition')}</p>
                                <p className={`text-sm font-bold ${playerApplicationData.mainPosition ? 'text-white' : 'text-gray-600'}`}>
                                  {playerApplicationData.mainPosition || t('apply.selectPosition')}
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
                                title: t('apply.modalServerTitle'),
                                options: ['NA', 'EUW', 'EUNE', 'SEA', 'KR', 'JP']
                              })}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                              <div className="text-left">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t('apply.fieldServer')}</p>
                                <p className={`text-sm font-bold ${playerApplicationData.server ? 'text-white' : 'text-gray-600'}`}>
                                  {playerApplicationData.server || t('apply.selectServer')}
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
                                title: t('apply.modalPlatformTitle'),
                                options: ['PC', 'PS4/5', 'Xbox', 'Mobile', 'Switch']
                              })}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                              <div className="text-left">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t('apply.fieldPlatform')}</p>
                                <p className={`text-sm font-bold ${playerApplicationData.platform ? 'text-white' : 'text-gray-600'}`}>
                                  {playerApplicationData.platform || t('apply.selectPlatform')}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 transition-transform" />
                            </button>
                          )}

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">{t('apply.fieldStyle')}</p>
                            <input 
                              type="text"
                              placeholder={t('apply.stylePlaceholder')}
                              value={playerApplicationData.style}
                              onChange={(e) => setPlayerApplicationData(prev => ({ ...prev, style: e.target.value }))}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-purple-500/50 outline-none transition-all"
                            />
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">{t('apply.fieldIntro')}</p>
                            <textarea 
                              placeholder={t('apply.introPlaceholder')}
                              rows={4}
                              value={playerApplicationData.intro}
                              onChange={(e) => setPlayerApplicationData(prev => ({ ...prev, intro: e.target.value }))}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-purple-500/50 outline-none transition-all resize-none"
                            />
                          </div>

                          <div className="space-y-3"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">{t('apply.fieldScreenshot')}</p><div aria-disabled="true" className="w-full aspect-video max-h-48 rounded-2xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center gap-3 text-gray-500"><Camera className="w-8 h-8" /><span className="text-xs">{unavailable}</span></div></div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Voice & Cover */}
                    {playerApplicationStep === 3 && (
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black text-white">{t('apply.step3Title')}</h2>
                          <p className="text-sm text-gray-500">{t('apply.step3Subtitle')}</p>
                        </div>

                        <div className="space-y-8">
                          <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">{t('apply.voiceRecording')}</p>
                            <div aria-disabled="true" className="p-8 bg-white/5 border border-white/10 rounded-[32px] flex flex-col items-center gap-4 text-gray-500"><Mic2 className="w-8 h-8" /><span>{unavailable}</span></div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">{t('apply.coverImage')}</p>
                            <div aria-disabled="true" className="w-full aspect-[3/4] max-h-64 bg-white/5 border border-dashed border-white/20 rounded-[32px] flex flex-col items-center justify-center gap-3 text-gray-500"><Camera className="w-8 h-8" /><span>{unavailable}</span></div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">{t('apply.coverIntro')}</p>
                            <input 
                              type="text"
                              placeholder={t('apply.coverIntroPlaceholder')}
                              value={playerApplicationData.coverIntro}
                              onChange={(e) => setPlayerApplicationData(prev => ({ ...prev, coverIntro: e.target.value }))}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-purple-500/50 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Service & Promotion */}
                    {playerApplicationStep === 4 && (
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black text-white">{t('apply.step4Title')}</h2>
                          <p className="text-sm text-gray-500">{t('apply.step4Subtitle')}</p>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">{t('apply.serviceName')}</p>
                            <input 
                              type="text"
                              placeholder={t('apply.serviceNamePlaceholder')}
                              value={playerApplicationData.serviceName}
                              onChange={(e) => setPlayerApplicationData(prev => ({ ...prev, serviceName: e.target.value }))}
                              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-purple-500/50 outline-none transition-all"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">{t('apply.priceCoins')}</p>
                              <input 
                                type="number"
                                placeholder="0"
                                value={playerApplicationData.price || ''}
                                onChange={(e) => setPlayerApplicationData(prev => ({ ...prev, price: Number(e.target.value) }))}
                                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-gray-600 focus:border-purple-500/50 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-3">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">{t('apply.unitLabel')}</p>
                              <select 
                                value={playerApplicationData.unit}
                                onChange={(e) => setPlayerApplicationData(prev => ({ ...prev, unit: e.target.value }))}
                                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-purple-500/50 outline-none transition-all appearance-none"
                              >
                                <option value="Game">{t('apply.unitPerGame')}</option>
                                <option value="Hour">{t('apply.unitPerHour')}</option>
                                <option value="Round">{t('apply.unitPerRound')}</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-white/5 text-gray-500"><p className="text-xs font-bold">{locale === 'ar' ? 'العروض الترويجية' : 'Promotions'}: {unavailable}</p></div>
                        </div>
                      </div>
                    )}
                  </fieldset>
                )}
              </div>

              {/* Fixed Footer */}
              {playerApplicationStatus !== 'PENDING' && playerApplicationStatus !== 'APPROVED' && (playerApplicationStatus !== 'REJECTED' || companionApplication.editing) && !companionApplication.loading && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0f071a]/80 backdrop-blur-xl border-t border-white/10 z-50">
                  {companionApplication.attemptPending && <p className="mb-3 text-xs text-amber-300">{locale === 'ar' ? 'حالة الإرسال غير مؤكدة. أعد المحاولة بنفس البيانات.' : 'Submission is unconfirmed. Retry with the same details.'}</p>}
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
                          return false;
                        }
                        if (playerApplicationStep === 3) {
                          return false;
                        }
                        return false;
                      })()}
                      className="w-full py-5 bg-purple-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(168,85,247,0.4)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all uppercase tracking-widest text-xs"
                    >
                      {t('apply.nextStep')}
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        const gameName = GAMES.find(game => game.id === playerApplicationData.gameId)?.name;
                        if (gameName) void companionApplication.submit(gameName);
                      }}
                      disabled={(() => {
                        return companionApplication.busy || !playerApplicationData.serviceName.trim() || !isValidApplicationPrice(playerApplicationData.price);
                      })()}
                      className="w-full py-5 bg-purple-600 rounded-2xl font-black text-white shadow-[0_0_40px_rgba(168,85,247,0.4)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all uppercase tracking-widest text-xs"
                    >
                      {companionApplication.busy ? (locale === 'ar' ? 'جار الإرسال...' : 'Submitting...') : t('apply.submitApplication')}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
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
                  className="relative w-full max-w-md bg-[#1a102d] rounded-t-[40px] sm:rounded-[40px] border-t sm:border border-white/10 overflow-hidden shadow-2xl"
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
                              ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
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
    </>
  );
}
