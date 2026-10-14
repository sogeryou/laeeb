import { useState, useEffect, useMemo, useRef, useCallback, type MouseEvent } from 'react';
import {
  Category, Game, EPal, EPalServiceVariant, Coupon, Playlink, Post, Message, ChatSession, IMOrder,
  Wallet as WalletType, RechargePackage, WalletTransaction,
} from '@shared/types';
import { GAMES, EPALS, POSTS } from '../constants';
import { businessApi, type AuthUser, type CompanionRanking } from '../services/businessApi';
import { useI18n } from '../i18n/I18nProvider';
import { useDeviceId } from '../hooks/useDeviceId';
import { type View, BUSINESS_TOKEN_KEY, BUSINESS_UI_AUTH_KEY } from '../router/routes';
import { viewRequiresAuth } from '../router/guards';
import { useUiStore } from '../stores/uiStore';
import { resolveOrderContext } from '../lib/resolveOrderContext';
import { useSocial } from '../hooks/useSocial';
import { useOrders } from '../hooks/useOrders';
import { useNotifications } from '../hooks/useNotifications';
import { useAccountProfile } from '../hooks/useAccountProfile';
import { usePeerIdentity } from '../hooks/usePeerIdentity';
import { resolveNotificationTarget } from '../components/notifications/target';
import type { AppNotification } from '@shared/notifications';
import { useCompanionApplication } from '../hooks/useCompanionApplication';
import { refreshApplicationOwnerSession } from '../components/application/approvedSession';
import { usePublicCompanionProfile } from '../hooks/usePublicCompanionProfile';
import { blocksCompanionCheckout, toIMOrder } from '../services/orderPresentation';
import { AUTH_SESSION_EVENT, restoreSession as restoreAuthSession, storeSession, endSession, refreshSession, publishProfileUser } from '../features/auth/session';
import { navigateAuth, takeReturn } from '../features/auth/routing';

export function useAppState() {
  const deviceId = useDeviceId();
  const { locale, setLocale, t, supportedLocales, getLocaleLabel } = useI18n();
  const [currentView, setCurrentView] = useState<View>('HOME');
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [rechargePackages, setRechargePackages] = useState<RechargePackage[]>([]);
  const [isRecharging, setIsRecharging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [cacheSize, setCacheSize] = useState('12.4 MB');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAuthenticatedRef = useRef(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authLoginMethod, setAuthLoginMethod] = useState<'PASSWORD' | 'EMAIL_CODE'>('PASSWORD');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authEmailCode, setAuthEmailCode] = useState('');
  const [authCodeCooldown, setAuthCodeCooldown] = useState(0);
  const [authCodeSending, setAuthCodeSending] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authStatus, setAuthStatus] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [companionRankings, setCompanionRankings] = useState<CompanionRanking[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState('');
  const [rankingSortBy, setRankingSortBy] = useState<'SCORE' | 'RATING' | 'COMPLETED'>('SCORE');
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [expandedRankingId, setExpandedRankingId] = useState<string | null>(null);
  const pendingNavigationRef = useRef<{ view: View; data?: any } | null>(null);
  const authTokenRef = useRef<string | null>(null);
  const authUserIdRef = useRef<string | null>(null);
  const adminLoginIntentRef = useRef(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const notifications = useNotifications(authToken, authUser?.id, Boolean(authToken && authUser && (authUser.profileComplete || authUser.role === 'ADMIN')));
  const notificationOpenLock = useRef<{ id: string; guard: () => boolean } | null>(null);
  const [notificationOpening, setNotificationOpening] = useState<{ id: string; guard: () => boolean } | null>(null);
  const notificationOpeningId = notificationOpening?.guard() ? notificationOpening.id : null;
  const [authSessionReady, setAuthSessionReady] = useState(false);

  const fetchWallet = useCallback(async () => {
    const token = authTokenRef.current;
    if (!token) {
      setWallet(null);
      return;
    }
    try {
      const data = await businessApi.getWalletBalance(token);
      if (authTokenRef.current === token) setWallet(data);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    const token = authTokenRef.current;
    if (!token) {
      setTransactions([]);
      return;
    }
    try {
      const data = await businessApi.listWalletTransactions(token);
      if (authTokenRef.current === token) setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      const data = await businessApi.listRechargePackages();
      setRechargePackages(data);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    }
  }, []);

  const fetchCompanionRankings = useCallback(async (token: string) => {
    setRankingsLoading(true);
    setRankingsError('');
    try {
      const list = await businessApi.listCompanionRankings(token, 10);
      setCompanionRankings(list);
    } catch (error) {
      setRankingsError((error as Error).message || t('ranking.loadFailed'));
    } finally {
      setRankingsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    let cancelled = false;
    const onSession = (event: Event) => {
      const session = (event as CustomEvent).detail;
      if (authUserIdRef.current !== (session?.user?.id || null)) { setWallet(null); setTransactions([]); }
      authUserIdRef.current = session?.user?.id || null;
      setIsAuthenticated(Boolean(session)); isAuthenticatedRef.current = Boolean(session);
      setAuthToken(session?.token || null); authTokenRef.current = session?.token || null;
      setAuthUser(session?.user || null);
      if (!session) { setWallet(null); setTransactions([]); }
    };
    window.addEventListener(AUTH_SESSION_EVENT, onSession);
    const restoreSession = async () => {
      try {
        const session = await restoreAuthSession();
        if (!cancelled && session && localStorage.getItem(BUSINESS_TOKEN_KEY) === session.token) storeSession(session);
      } catch { /* Keep stored credentials on a transient network failure; never display an unverified session. */ }
      finally { if (!cancelled) setAuthSessionReady(true); }
    };
    void restoreSession();
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_SESSION_EVENT, onSession);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const refresh = () => { if (document.visibilityState === 'visible') void refreshSession().catch(() => {}); };
    const timer = window.setInterval(refresh, 10 * 60 * 1000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [isAuthenticated]);

  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (authCodeCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setAuthCodeCooldown(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [authCodeCooldown]);

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      setCompanionRankings([]);
      setRankingsLoading(false);
      setRankingsError('');
      setWallet(null);
      setTransactions([]);
      return;
    }
    fetchWallet();
    fetchTransactions();
    fetchCompanionRankings(authToken);
  }, [isAuthenticated, authToken, fetchCompanionRankings, fetchWallet, fetchTransactions]);

  const sortedRankings = useMemo(() => {
    const cloned = [...companionRankings];
    if (rankingSortBy === 'RATING') {
      return cloned.sort((a, b) => b.avgRating - a.avgRating || b.rankingScore - a.rankingScore);
    }
    if (rankingSortBy === 'COMPLETED') {
      return cloned.sort((a, b) => b.completedOrderCount - a.completedOrderCount || b.rankingScore - a.rankingScore);
    }
    return cloned.sort((a, b) => b.rankingScore - a.rankingScore || b.avgRating - a.avgRating);
  }, [companionRankings, rankingSortBy]);

  const openAuthModal = (statusText = t('auth.loginRequired')) => {
    setAuthStatus(statusText);
    setAuthMode('LOGIN');
    setAuthLoginMethod('EMAIL_CODE');
    setShowAuthModal(true);
  };

  const openAdminAuthModal = useCallback(() => {
    adminLoginIntentRef.current = true;
    setAuthMode('LOGIN');
    setAuthLoginMethod('PASSWORD');
    setAuthStatus(t('admin.login.viaUserAppHint'));
    setShowAuthModal(true);
  }, [t]);

  const notify = (message: string) => {
    setToastMessage(message);
    useUiStore.getState().setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage('');
      useUiStore.getState().setToastMessage('');
    }, 3500);
  };

  const requireAuthAction = (statusText?: string) => {
    if (isAuthenticatedRef.current) return true;
    openAuthModal(statusText || t('auth.loginRequired'));
    return false;
  };

  const handleLogout = async () => {
    try { await endSession(); } catch { /* Local state is already cleared. */ }
    localStorage.removeItem(BUSINESS_TOKEN_KEY);
    sessionStorage.removeItem(BUSINESS_UI_AUTH_KEY);
    setIsAuthenticated(false);
    isAuthenticatedRef.current = false;
    setAuthToken(null);
    authTokenRef.current = null;
    setAuthUser(null);
    adminLoginIntentRef.current = false;
    pendingNavigationRef.current = null;
    setCurrentView('HOME');
    setViewHistory(['HOME']);
    setShowAuthModal(false);
    setAuthStatus(t('auth.loggedOut'));
    if (window.location.pathname.startsWith('/admin')) {
      window.location.replace('/');
    }
  };

  const finishAuthSession = (
    session: Awaited<ReturnType<typeof businessApi.login>>,
    wantsAdmin: boolean,
  ) => {
    if (wantsAdmin && session.user.role !== 'ADMIN') {
      adminLoginIntentRef.current = false;
      setAuthStatus(t('admin.login.notAdmin'));
      return;
    }

    storeSession(session);
    setIsAuthenticated(true);
    isAuthenticatedRef.current = true;
    setAuthToken(session.token);
    authTokenRef.current = session.token;
    setAuthUser(session.user);
    setShowAuthModal(false);
    setAuthEmailCode('');
    adminLoginIntentRef.current = false;

    if (wantsAdmin) {
      setAuthStatus(t('admin.status.readyAfterLogin'));
      return;
    }

    setAuthStatus(t('auth.loggedIn'));
    const pending = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    const remembered = takeReturn();
    navigateAuth(null, true);
    if (pending) {
      navigateTo(pending.view, pending.data);
    } else if (remembered) {
      const epal = EPALS.find(item => item.id === remembered.entityId);
      const post = POSTS.find(item => item.id === remembered.entityId);
      const game = GAMES.find(item => item.id === remembered.entityId);
      if (['PROFILE','IM_DETAIL','ORDER_CONFIRM'].includes(remembered.view) && epal) navigateTo(remembered.view, remembered.view === 'ORDER_CONFIRM' ? { epal } : epal);
      else if (remembered.view === 'POST_DETAIL' && post) navigateTo('POST_DETAIL', { post });
      else if (remembered.view === 'GAME_DETAIL' && game) navigateTo('GAME_DETAIL', game);
      else if (!['PROFILE','IM_DETAIL','ORDER_CONFIRM','POST_DETAIL','GAME_DETAIL'].includes(remembered.view)) navigateTo(remembered.view);
      else { setCurrentView('HOME'); setViewHistory(['HOME']); }
    } else {
      setCurrentView('HOME');
      setViewHistory(['HOME']);
    }
  };

  const handleSendAuthEmailCode = async () => {
    if (!authEmail.trim()) {
      setAuthStatus(t('auth.emailRequired'));
      return;
    }
    if (authCodeCooldown > 0 || authCodeSending) return;

    setAuthCodeSending(true);
    setAuthStatus(t('auth.sendingCode'));
    try {
      const result = await businessApi.sendEmailCode(authEmail, 'login', deviceId || undefined);
      setAuthCodeCooldown(result.cooldownSec);
      setAuthStatus(t('auth.codeSent'));
    } catch (error) {
      setAuthStatus((error as Error).message);
    } finally {
      setAuthCodeSending(false);
    }
  };

  const handleAuthSubmit = async () => {
    setAuthStatus(authMode === 'LOGIN' ? t('auth.loggingIn') : t('auth.registering'));
    try {
      const wantsAdmin =
        adminLoginIntentRef.current || window.location.pathname.startsWith('/admin');
      const shouldUseEmailCode =
        authMode === 'LOGIN' && authLoginMethod === 'EMAIL_CODE' && !wantsAdmin;

      if (shouldUseEmailCode) {
        const session = await businessApi.loginWithEmailCode(
          authEmail,
          authEmailCode,
          authUsername || undefined,
          deviceId || undefined,
        );
        finishAuthSession(session, wantsAdmin);
        return;
      }

      if (authMode === 'REGISTER' && !wantsAdmin) {
        await businessApi.register(authUsername, authEmail, authPassword, deviceId || undefined);
      }
      const session = await businessApi.login(authEmail, authPassword, deviceId || undefined);
      finishAuthSession(session, wantsAdmin);
    } catch (error) {
      setAuthStatus((error as Error).message);
    }
  };

  const handleRecharge = async (pkg: RechargePackage, method: 'GOOGLE_PAY' | 'APPLE_PAY') => {
    if (!requireAuthAction(t('auth.loginRequired'))) return;
    const token = authTokenRef.current;
    if (!token) {
      openAuthModal(t('auth.loginRequired'));
      return;
    }
    setIsRecharging(true);
    try {
      // 1. Create Order
      const order = await businessApi.createRechargeOrder(token, pkg.id, method);

      // 2. Simulate Payment Gateway (Apple/Google Pay)
      // In a real app, this would open the native payment sheet
      await new Promise(resolve => setTimeout(resolve, 2000));
      const transactionId = `pay_${Math.random().toString(36).substr(2, 9)}`;

      // 3. Verify Payment (Callback)
      const result = await businessApi.verifyRecharge(token, order.id, transactionId, 'SUCCESS');

      if (result.status === 'SUCCESS') {
        await fetchWallet();
        await fetchTransactions();
        navigateTo('WALLET');
      } else if (result.status === 'PENDING') {
        notify('Payment is being reviewed for risk control. Please check back later.');
        navigateTo('WALLET');
      }
    } catch (err: any) {
      notify(err.message || 'Recharge failed');
    } finally {
      setIsRecharging(false);
    }
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
  const peerIdentity = usePeerIdentity(currentView, selectedEPal, setSelectedEPal, authToken, authUser?.id);
  const companionPublicProfile = usePublicCompanionProfile(currentView, selectedEPal, setSelectedEPal, authUser?.id);
  const publicProfile = selectedEPal?.userId === selectedEPal?.id && selectedEPal?.services === undefined ? peerIdentity : companionPublicProfile;
  const accountProfile = useAccountProfile(authToken, authUser?.id, Boolean(authUser && (authUser.profileComplete || authUser.role === 'ADMIN')),
    currentView === 'SETTINGS_EDIT_PROFILE', publishProfileUser);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(0);
  const [giftQuantity, setGiftQuantity] = useState(1);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [userCoins, setUserCoins] = useState(1250);
  const [userDiamonds, setUserDiamonds] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const userRole = authUser?.role === 'PLAYER' ? 'PLAYER' : 'USER';
  const setUserRole = (_role: 'USER' | 'PLAYER') => {};
  const [isPlayerOnline, setIsPlayerOnline] = useState(true);
  const companionApplication = useCompanionApplication(authUser?.id || null, authToken, currentView === 'ME' || currentView === 'APPLY_PLAYER');
  const playerApplicationStatus = companionApplication.application?.status || 'NONE';
  const setPlayerApplicationStatus = (_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED') => {};
  const [playerApplicationStep, setPlayerApplicationStep] = useState(1);
  const playerApplicationData = companionApplication.draft;
  const setPlayerApplicationData = companionApplication.setDraft;
  useEffect(() => {
    const status = companionApplication.application?.status;
    if (!status || !authToken || !authUser?.id || authUser.role === 'ADMIN'
      || (currentView !== 'ME' && currentView !== 'APPLY_PLAYER')) return;
    const expectedRole = status === 'APPROVED' ? 'PLAYER' : 'USER';
    if (authUser.role === expectedRole) return;
    const guard = companionApplication.sessionGuard(authUser.id, authToken);
    void refreshApplicationOwnerSession(authToken, authUser.id, guard, expectedRole).catch(() => {});
  }, [companionApplication.application?.status, companionApplication.sessionGuard, authToken, authUser?.id, authUser?.role, currentView]);
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

  const handleWithdrawSubmit = async () => {
    if (!requireAuthAction(t('auth.loginRequired'))) return;
    const token = authTokenRef.current;
    const diamondAmount = Number(withdrawAmount);
    if (!token) {
      openAuthModal(t('auth.loginRequired'));
      return;
    }
    if (!Number.isFinite(diamondAmount) || diamondAmount <= 0) {
      notify('Enter a valid withdrawal amount.');
      return;
    }
    if (!withdrawAddress.trim()) {
      notify('Enter your payout wallet address.');
      return;
    }
    setWithdrawSubmitting(true);
    try {
      await businessApi.createWithdrawRequest(token, diamondAmount, `USDT_TRC20:${withdrawAddress.trim()}`);
      setWithdrawAmount('');
      setWithdrawAddress('');
      notify('Withdrawal request submitted. Please wait for admin approval.');
      handleBack();
    } catch (error) {
      notify((error as Error).message || 'Withdrawal request failed.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };
  const [moreEPals, setMoreEPals] = useState<EPal[]>(EPALS.filter(e => !e.isLegend));
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playingEPalId, setPlayingEPalId] = useState<string | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<EPalServiceVariant | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const refreshOrderBalances = useCallback(async () => {
    await Promise.all([fetchWallet(), fetchTransactions()]);
  }, [fetchWallet, fetchTransactions]);
  const orders = useOrders(authToken, authUser?.id, ['IM', 'MY_ORDERS', 'ORDER_CONFIRM'].includes(currentView), refreshOrderBalances);
  const availableCoupons = orders.coupons;
  const setAvailableCoupons = orders.refresh;
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
  useEffect(() => {
    setPlayerApplicationStep(1);
    setApplyGameSearchQuery('');
    setSelectedApplyGameCategory('GAMES');
    setShowApplySelectionModal({ show: false, type: 'NONE', options: [], title: '' });
    setSelectedGame(null);
    setSelectedServiceCategory(null);
    setApplicationDetails({ rank: '', platform: '', style: '', price: '', discount: '' });
  }, [authUser?.id]);
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
  const imOrders = useMemo(() => orders.items.map(toIMOrder), [orders.items]);
  const setImOrders = orders.refresh;
  const [showOngoingOrderWarning, setShowOngoingOrderWarning] = useState(false);
  const social = useSocial(authToken, authUser?.id, currentView, selectedEPal);
  const { chatSessions, setChatSessions, currentMessages, setCurrentMessages, messageInput, setMessageInput } = social;
  const [selectedOrderState, setSelectedOrder] = useState<IMOrder | null>(null);
  const selectedOrder = imOrders.find(order => order.id === selectedOrderState?.id) ?? null;
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [showImServiceCards, setShowImServiceCards] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewFeedback, setReviewFeedback] = useState('');

  useEffect(() => {
    setSelectedOrder(null);
    setShowOrderDetailModal(false);
    setShowReviewModal(false);
    setSelectedCoupon(null);
    setShowCouponModal(false);
    setReviewFeedback('');
    setReviewTags([]);
  }, [authUser?.id]);

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

  const [isScrolling, setIsScrolling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [followedEPals, setFollowedEPals] = useState<Set<string>>(new Set());
  const followersOfMe = useMemo(() => new Set(['1', '2', '3', '5']), []); // Mock users who follow me
  const mutualFollowers = useMemo(() => {
    return EPALS.filter(epal => followedEPals.has(epal.id) && followersOfMe.has(epal.id));
  }, [followedEPals, followersOfMe]);

  const filteredPosts = useMemo(() => {
    let posts = [...social.posts];
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
  }, [communityTab, selectedGame, followedEPals, social.posts]);

  const toggleFollow = (id: string) => {
    if (!requireAuthAction(t('auth.loginRequiredFeature'))) {
      return;
    }
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

  const openNotification = async (notification: AppNotification) => {
    if (!authToken || !authUser?.id || notificationOpenLock.current?.guard()) return;
    const owner = authUser.id;
    const token = authToken;
    const guard = notifications.sessionGuard(owner, token);
    const operation = { id: notification.id, guard };
    notificationOpenLock.current = operation;
    setNotificationOpening(operation);
    try {
      const saved = await notifications.markRead(notification.id);
      if (!saved || !guard()) return;
      const target = await resolveNotificationTarget(token, saved, owner);
      if (!guard()) return;
      if (target.type === 'APPLICATION') {
        navigateTo('APPLY_PLAYER');
        void companionApplication.refresh();
      } else {
        if (!orders.reconcileFetchedOrder(target.order, owner, token, guard)) return;
        navigateTo('MY_ORDERS');
        setSelectedOrder(toIMOrder(target.order));
        setShowOrderDetailModal(true);
      }
    } catch (error) {
      if (guard()) notifications.setError(error instanceof Error ? error.message : 'NOTIFICATION_TARGET_UNAVAILABLE');
    } finally {
      if (notificationOpenLock.current === operation) { notificationOpenLock.current = null; setNotificationOpening(null); }
    }
  };

  const navigateTo = (view: View, data?: any) => {
    const requiresAuth = viewRequiresAuth(view, data);
    if (requiresAuth && !isAuthenticatedRef.current) {
      pendingNavigationRef.current = { view, data };
      openAuthModal(t('auth.loginRequiredFeature'));
      return;
    }

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
      if (!epal) return;

      const hasOngoingOrder = imOrders.some(order => blocksCompanionCheckout(order, epal.id));
      if (hasOngoingOrder) {
        setShowOngoingOrderWarning(true);
        return;
      }

      const orderContext = resolveOrderContext(epal, {
        variant: data?.variant,
        serviceId: data?.serviceId,
        activeServiceId,
      });
      if (!orderContext) {
        notify('This companion has no bookable services yet.');
        return;
      }

      if (data?.epal) setSelectedEPal(data.epal);
      setActiveServiceId(orderContext.serviceId);
      setSelectedVariant(orderContext.variant);
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
      setCurrentMessages([]);
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


  const handleBack = () => {
    // Reset focus state when going back
    setFocusCommentInput(false);
    setShowImServiceCards(false);

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

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      const newItems = EPALS.filter(e => !e.isLegend).map(e => ({ ...e, id: Math.random().toString() }));
      setMoreEPals(prev => [...prev, ...newItems]);
      setLoadingMore(false);
    }, 1000);
  };

  const toggleFavorite = (gameId: string, e: MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  const handlePlayToggle = (epalId: string, e: MouseEvent) => {
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

  return {
    deviceId, locale, setLocale, t, supportedLocales, getLocaleLabel,
    currentView, setCurrentView, wallet, setWallet, transactions, setTransactions,
    rechargePackages, setRechargePackages, isRecharging, setIsRecharging,
    isRecording, setIsRecording, recordingTime, setRecordingTime,
    pushNotificationsEnabled, setPushNotificationsEnabled, cacheSize, setCacheSize,
    isAuthenticated, setIsAuthenticated, isAuthenticatedRef, authToken, setAuthToken,
    authUser, setAuthUser, authSessionReady, notifications, openNotification, notificationOpeningId,
    showAuthModal, setShowAuthModal, authMode, setAuthMode, authEmail, setAuthEmail,
    authLoginMethod, setAuthLoginMethod, authPassword, setAuthPassword,
    authEmailCode, setAuthEmailCode, authCodeCooldown, authCodeSending,
    authUsername, setAuthUsername, authStatus, setAuthStatus,
    toastMessage, setToastMessage, companionRankings, setCompanionRankings,
    rankingsLoading, setRankingsLoading, rankingsError, setRankingsError,
    rankingSortBy, setRankingSortBy, showRankingModal, setShowRankingModal,
    expandedRankingId, setExpandedRankingId, pendingNavigationRef, authTokenRef,
    fetchWallet, fetchTransactions, fetchPackages, fetchCompanionRankings, sortedRankings,
    openAuthModal, openAdminAuthModal, notify, requireAuthAction, handleLogout,
    handleSendAuthEmailCode, handleAuthSubmit, finishAuthSession, handleRecharge,
    selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, selectedGame, setSelectedGame,
    selectedServiceCategory, setSelectedServiceCategory, applicationDetails, setApplicationDetails,
    selectedEPal, setSelectedEPal, publicProfile, accountProfile, selectedPost, setSelectedPost, showGiftPanel, setShowGiftPanel,
    selectedGiftId, setSelectedGiftId, giftQuantity, setGiftQuantity, showQuantitySelector, setShowQuantitySelector,
    userCoins, setUserCoins, userDiamonds, setUserDiamonds, withdrawAmount, setWithdrawAmount,
    withdrawAddress, setWithdrawAddress, withdrawSubmitting, setWithdrawSubmitting,
    userRole, setUserRole, isPlayerOnline, setIsPlayerOnline, playerApplicationStatus, setPlayerApplicationStatus, companionApplication,
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
    orders, chatSessions, setChatSessions, imOrders, setImOrders, showOngoingOrderWarning, setShowOngoingOrderWarning,
    currentMessages, setCurrentMessages, messageInput, setMessageInput, selectedOrder, setSelectedOrder,
    showOrderDetailModal, setShowOrderDetailModal, showImServiceCards, setShowImServiceCards,
    showReviewModal, setShowReviewModal, reviewRating, setReviewRating, reviewTags, setReviewTags, reviewFeedback, setReviewFeedback,
    orderTab, setOrderTab, userStatus, setUserStatus, showStatusModal, setShowStatusModal, viewHistory, setViewHistory,
    contactsTab, setContactsTab, communityTab, setCommunityTab, showFullSearch, setShowFullSearch,
    fullSearchQuery, setFullSearchQuery, fullSearchResults, setFullSearchResults,
    isScrolling, setIsScrolling, copied, setCopied, followedEPals, setFollowedEPals, followersOfMe, mutualFollowers,
    filteredPosts, toggleFollow, confirmUnfollow, copyToClipboard, observer, lastElementRef, legendEPals,
    navigateTo, handleBack, loadMore, toggleFavorite, handlePlayToggle, allSortedGames, favoritedGames, alphabet, scrollToLetter, groupedGames,
    EPALS, GAMES, POSTS, social,
  };
}

export type AppState = ReturnType<typeof useAppState>;
