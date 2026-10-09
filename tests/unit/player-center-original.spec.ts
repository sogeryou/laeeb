import { expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OriginalCenterHome, rankingFromCenter } from '../../client/components/player-center/OriginalCenterHome';
import { CompanionLevelDashboard, DecayExplainerModal, LevelBenefits, TaskCenter } from '../../client/components/player-center/CompanionCenter';

it('renders level screens and rules while the account level is pending sync', () => {
  const props = { ranking: rankingFromCenter(null), onBack() {}, onNavigate() {}, onClose() {}, onGoToTasks() {} };
  for (const Component of [CompanionLevelDashboard, DecayExplainerModal, LevelBenefits]) {
    expect(() => renderToStaticMarkup(React.createElement(Component, props))).not.toThrow();
  }
  expect(renderToStaticMarkup(React.createElement(CompanionLevelDashboard, props))).toContain('Level pending sync');
  expect(renderToStaticMarkup(React.createElement(LevelBenefits, props))).toContain('Level pending sync');
});

it('restores the original five-entry green center, not the redesigned three-card dashboard', () => {
  const html = renderToStaticMarkup(React.createElement(OriginalCenterHome, { onBack() {}, onNavigate() {}, ranking: rankingFromCenter(null) }));
  for (const title of ['Player Level', 'My Order', 'Game Services', 'Income Review', 'Customer Review']) expect(html).toContain(title);
  expect(html).toContain('bg-[#07110f]');
  expect(html).not.toContain('bg-purple');
  expect(html).not.toContain('Local review build');
});
it('does not invent a current level or score when adapting real weekly tasks', () => {
  const ranking = rankingFromCenter({ weeklyTasks: { income: 1275, newCustomers: 13, repeatCustomers: 13, ratingStars: 103 }, weeklyPoints: { service: 258 } } as any);
  expect(ranking.pending).toBe(true);
  expect(ranking.weeklyStats.totalIncome).toBe(1275);
  expect(ranking.weeklyPointsBreakdown.service).toBe(258);
  expect(ranking.score).toBe(0);
});
it('distinguishes no acceptance opportunities from a failed acceptance task', () => {
  const ranking = rankingFromCenter({ connectedActivity: ['login', 'accept'], activity: { loginDays: 1, acceptanceRate: null, points: 3 }, weeklyTasks: {}, weeklyPoints: {} } as any);
  const html = renderToStaticMarkup(React.createElement(TaskCenter, { ranking, onBack() {} }));
  expect(html).toContain('NO OPPORTUNITIES');
});
it('adapts real post and reply task points without enabling greeting rewards', () => {
  const ranking = rankingFromCenter({ connectedActivity: ['login', 'accept', 'post', 'reply'], activity: { postDays: 3, replyRate: 1, acceptanceRate: null, points: 50 }, weeklyTasks: {}, weeklyPoints: {} } as any);
  expect(ranking.weeklyStats.posts).toBe(3);
  expect(ranking.weeklyStats.responseRate).toBe(1);
  const html = renderToStaticMarkup(React.createElement(TaskCenter, { ranking, onBack() {} }));
  expect(html).toContain('50 pts estimated');
  expect(ranking.connectedActivity).not.toContain('greet');
});
it('shows server greeting progress and the original greeting task entry', () => {
  const ranking = rankingFromCenter({ connectedActivity: ['greet'], activity: { greetings: 2, points: 10 }, weeklyTasks: {}, weeklyPoints: {} } as any);
  expect(ranking.weeklyStats.greetings).toBe(2);
  const html = renderToStaticMarkup(React.createElement(TaskCenter, { ranking, onBack() {}, onGreet() {} }));
  expect(html).toContain('Find New Users to Greet');
  expect(html).toContain('+10');
  expect(html).not.toContain('Greeting rewards are not connected');
});
