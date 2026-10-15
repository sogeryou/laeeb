import React, { useMemo } from 'react';
import { ArrowLeft, Filter, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { DEFAULT_GAME_DISCOVERY_QUERY, getDiscoveryGame, type GameDiscoveryQuery } from '@shared/gameDiscovery';
import { useApp } from '../app/AppContext';
import { EPalCard } from '../components/cards/EPalCard';
import { GameDiscoveryFilters } from '../components/game-discovery/GameDiscoveryFilters';
import { gameDiscoveryCopy } from '../components/game-discovery/copy';
import { discoveryQueryKey } from '../components/game-discovery/model';
import { useGameDiscovery } from '../hooks/useGameDiscovery';

export function GameDetailView() {
  const { locale, selectedGame, currentView, authToken, authUser, epalSortBy, setEpalSortBy, epalFilters, setEpalFilters,
    showEpalFilterModal, setShowEpalFilterModal, navigateTo, handleBack } = useApp();
  const c = gameDiscoveryCopy(locale), rtl = locale.toLowerCase().startsWith('ar');
  const game = selectedGame && getDiscoveryGame(selectedGame.id);
  const query = useMemo<GameDiscoveryQuery>(() => ({
    status: epalFilters.status, gender: epalFilters.gender === 'Male' ? 'M' : epalFilters.gender === 'Female' ? 'F' : epalFilters.gender === 'Other' ? 'U' : 'ALL',
    minPrice: epalFilters.priceRange[0], maxPrice: epalFilters.priceRange[1], sort: epalSortBy,
  }), [epalFilters, epalSortBy]);
  const list = useGameDiscovery(game?.id || null, query, currentView === 'GAME_DETAIL', authToken, authUser?.id);
  const filtered = discoveryQueryKey({ ...query, sort: 'DEFAULT' }) !== discoveryQueryKey(DEFAULT_GAME_DISCOVERY_QUERY);
  const apply = (next: GameDiscoveryQuery) => {
    setEpalSortBy(next.sort);
    setEpalFilters({ status: next.status, gender: next.gender === 'M' ? 'Male' : next.gender === 'F' ? 'Female' : next.gender === 'U' ? 'Other' : 'ALL',
      priceRange: [next.minPrice, next.maxPrice], server: 'ALL', platform: 'ALL', rank: 'ALL' });
  };
  return <motion.div id="game-discovery-page" key="game_detail" dir={rtl ? 'rtl' : 'ltr'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="min-h-screen pb-32">
    <div className="relative h-[35vh] min-h-52 w-full">
      <img src={selectedGame?.imageUrl} alt={game?.name || selectedGame?.name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f071a] via-transparent to-black/40" />
      <button type="button" aria-label={c.back} title={c.back} onClick={handleBack} className="absolute top-6 start-6 h-10 w-10 flex items-center justify-center bg-black/30 border border-white/15 rounded-lg text-white"><ArrowLeft className={'w-5 h-5 ' + (rtl ? 'rotate-180' : '')} /></button>
      <div className="absolute bottom-6 inset-x-6 min-w-0">
        <h1 className="text-3xl font-bold text-white drop-shadow-lg [overflow-wrap:anywhere]">{game?.name || selectedGame?.name}</h1>
        <p className="text-purple-300 font-bold text-sm mt-2" aria-live="polite">{list.onlineCount === null ? c.onlinePending : c.onlineCount(list.onlineCount)}</p>
      </div>
    </div>
    <div className="px-6 mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={c.score} className="flex min-w-0 flex-wrap gap-2">
          {([['DEFAULT', c.defaultSort], ['ORDERS', c.orders], ['SCORE', c.score]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={query.sort === id} onClick={() => setEpalSortBy(id)}
            className={'px-3 min-h-10 py-2 rounded-lg text-xs font-bold border ' + (query.sort === id ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-gray-300')}>{label}</button>)}
        </div>
        <button type="button" onClick={() => setShowEpalFilterModal(true)} className={'flex items-center gap-2 px-3 min-h-10 py-2 rounded-lg text-xs font-bold border ' + (filtered ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-300')}><Filter className="w-4 h-4" /><span>{c.filter}</span></button>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-gray-400">
        <span aria-live="polite">{list.total === null ? '' : c.results(list.total)}</span>
        <button type="button" aria-label={c.refresh} title={c.refresh} disabled={list.loading || list.loadingMore} onClick={() => void list.refresh()} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-40"><RefreshCw className={'h-4 w-4 ' + (list.loading ? 'animate-spin' : '')} /></button>
      </div>
      {list.loading && <p role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400"><LoaderCircle className="w-4 h-4 animate-spin" />{c.loading}</p>}
      {list.error && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-300"><span>{c.loadError}</span><button type="button" className="min-h-10 underline" onClick={() => void list.retry()}>{c.retry}</button></div>}
      {!list.loading && !list.error && list.items.length === 0 && <div className="flex flex-col items-center py-16 gap-4 text-gray-400"><Search className="w-10 h-10 opacity-50" /><p className="text-center text-sm">{c.empty}</p>{filtered && <button type="button" className="min-h-10 text-purple-300 text-sm font-bold" onClick={() => apply({ ...DEFAULT_GAME_DISCOVERY_QUERY })}>{c.reset}</button>}</div>}
      {list.items.map(epal => {
        const canOrder = epal.bookable && epal.userId !== authUser?.id && !list.loading && !list.loadingMore && !list.error;
        const disabledReason = epal.userId === authUser?.id ? c.ownProfile : epal.onlineStatus !== 'Online' ? c[epal.onlineStatus || 'Offline'] : c.unavailable;
        return <EPalCard key={epal.id} epal={epal} discovery={{ locale, reviewCount: epal.reviewCount, canOrder: Boolean(canOrder), disabledReason }}
          onProfileClick={() => navigateTo('PROFILE', epal)} onOrderClick={() => {
            if (canOrder && list.canUse(epal.id)) navigateTo('ORDER_CONFIRM', { epal, serviceId: epal.id });
          }} />;
      })}
      {list.hasMore && <button type="button" disabled={list.loading || list.loadingMore} className="w-full min-h-12 flex items-center justify-center gap-2 text-sm font-bold border border-white/10 rounded-lg disabled:opacity-40" onClick={() => void list.loadMore()}>{list.loadingMore && <LoaderCircle className="w-4 h-4 animate-spin" />}{list.loadingMore ? c.loadingMore : c.loadMore}</button>}
    </div>
    {showEpalFilterModal && <GameDiscoveryFilters key={`${selectedGame?.id}:${authUser?.id || ''}`} locale={locale} query={query} onApply={apply} onClose={() => setShowEpalFilterModal(false)} />}
  </motion.div>;
}
