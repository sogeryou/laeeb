import { useEffect, useState } from 'react';
import { useApp } from '../app/AppContext';
import { OriginalCenterHome } from '../components/player-center/OriginalCenterHome';
import { CompanionLevelDashboard, TaskCenter, LevelBenefits } from '../components/player-center/CompanionCenter';
import { IncomeReview, CustomerReview } from '../components/player-center/ReviewModules';
import { DataNotice, rankingFromCenter, useCenterData } from '../components/player-center/data';
import { GreetingList } from '../components/player-center/GreetingList';

export function PlayerCenterView() {
  const { handleBack, navigateTo, notify, authToken } = useApp();
  const [history, setHistory] = useState(['HOME']);
  const page = history[history.length - 1];
  const resource = useCenterData();
  const ranking = rankingFromCenter(resource.data);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  const back = () => history.length === 1 ? handleBack() : setHistory(v => v.slice(0, -1));
  const navigate = (view: string) => {
    if (view === 'PLAYER_ORDERS') return navigateTo('MY_ORDERS');
    if (view === 'PLAYER_SERVICES') return navigateTo('PLAYER_PROFILE_EDIT');
    if (view === 'PROFILE') return notify('Customer profiles are not connected yet.');
    setHistory(v => [...v, view]);
  };
  return <div className="bg-[#07110f] min-h-screen text-white">
    {page === 'HOME' && <><OriginalCenterHome ranking={ranking} onBack={back} onNavigate={navigate} /><DataNotice resource={resource}/></>}
    {page === 'COMPANION_LEVEL_DASHBOARD' && <CompanionLevelDashboard ranking={ranking} onBack={back} onNavigate={navigate}/>}
    {page === 'TASK_CENTER' && <><TaskCenter ranking={ranking} onBack={back} onGreet={() => navigate('GREETING_USERS')}/><DataNotice resource={resource}/></>}
    {page === 'GREETING_USERS' && <GreetingList token={authToken} onBack={() => { resource.refresh(); back(); }} onChat={peer => navigateTo('IM_DETAIL', peer)}/>}
    {page === 'LEVEL_BENEFITS' && <LevelBenefits ranking={ranking} onBack={back}/>}
    {page === 'INCOME_REVIEW' && <IncomeReview ranking={ranking} onBack={back}/>}
    {page === 'CUSTOMER_REVIEW' && <CustomerReview onBack={back} onNavigate={navigate}/>}
  </div>;
}
