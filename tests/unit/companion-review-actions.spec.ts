import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CompanionReviewActions } from '../../admin/components/CompanionReviewActions';
import { adminApi } from '../../admin/services/adminApi';
import { createPortal } from 'react-dom';

vi.mock('react-dom', () => ({ createPortal: vi.fn((node: React.ReactNode) => node) }));

let root: ReactTestRenderer;
let record: any;
let review: ReturnType<typeof vi.fn>;
const render = async (scopeKey = 'admin-a') => { await act(async () => { root = create(React.createElement(CompanionReviewActions, { record, onReview: review, scopeKey })); }); };
const button = (name: string) => root.root.findAllByType('button').find(node => node.props['aria-label'] === name || node.children.includes(name))!;
const click = async (name: string) => { await act(async () => { await button(name).props.onClick(); }); };
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('window', new EventTarget());
  record = { id: 'cp', status: 'PENDING', updatedAt: 10, gameName: 'PUBG Mobile', intro: 'Real application', hourlyRate: 8, application: { details: { serviceName: 'Ranked duo', unit: 'match', style: 'Patient' } } };
  review = vi.fn(async () => {});
});
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.unstubAllGlobals(); });

it('renders the review overlay at the document root outside table stacking contexts', async () => {
  const body = {};
  vi.stubGlobal('document', { body });
  vi.mocked(createPortal).mockClear();
  await render();
  await click('Reject application');
  expect(createPortal).toHaveBeenCalledWith(expect.anything(), body);
});

it('shows real details and sends approval only after confirmation with its revision', async () => {
  await render();
  expect(button('Approve application').props.title).toBe('\u901a\u8fc7');
  await click('Approve application');
  expect(review).not.toHaveBeenCalled();
  expect(JSON.stringify(root.toJSON())).toContain('Real application');
  expect(JSON.stringify(root.toJSON())).toContain('Ranked duo');
  await click('Confirm review');
  expect(review).toHaveBeenCalledWith({ action: 'APPROVE', expectedUpdatedAt: 10 });
  expect(root.root.findAll(node => node.props.role === 'dialog')).toHaveLength(0);
});
it('requires a nonblank rejection reason and sends the original revision', async () => {
  await render();
  await click('Reject application');
  expect(button('Confirm review').props.disabled).toBe(true);
  const input = root.root.findByType('textarea');
  await act(async () => input.props.onChange({ target: { value: '   ' } }));
  expect(button('Confirm review').props.disabled).toBe(true);
  await act(async () => input.props.onChange({ target: { value: ' Please clarify your experience. ' } }));
  await click('Confirm review');
  expect(review).toHaveBeenCalledWith({ action: 'REJECT', expectedUpdatedAt: 10, reason: 'Please clarify your experience.' });
});
it('does not offer review for a terminal decision', async () => {
  record.status = 'APPROVED'; await render();
  expect(root.root.findAllByType('button')).toHaveLength(0);
  record = { ...record, status: 'REJECTED' };
  await act(async () => root.update(React.createElement(CompanionReviewActions, { record, onReview: review, scopeKey: 'admin-a' })));
  expect(root.root.findAllByType('button')).toHaveLength(0);
});
it('retains rejection feedback when the server fails and allows a retry', async () => {
  review.mockRejectedValueOnce(new Error('COMPANION_REVIEW_SAVE_FAILED'));
  await render(); await click('Reject application');
  await act(async () => root.root.findByType('textarea').props.onChange({ target: { value: 'More detail needed' } }));
  await click('Confirm review');
  expect(root.root.findByType('textarea').props.value).toBe('More detail needed');
  expect(root.root.findAll(node => node.props.role === 'alert')).toHaveLength(1);
  await click('Confirm review');
  expect(review).toHaveBeenCalledTimes(2);
});
it('locks rapid double confirmation until the persisted result returns', async () => {
  let resolve!: () => void; review.mockReturnValueOnce(new Promise<void>(done => { resolve = done; }));
  await render(); await click('Approve application');
  const confirm = button('Confirm review').props.onClick;
  await act(async () => { void confirm(); void confirm(); });
  expect(review).toHaveBeenCalledOnce();
  expect(button('Cancel review').props.disabled).toBe(true);
  await act(async () => resolve());
});
it('hides an old actor dialog and ignores its late result on scope change', async () => {
  let resolve!: () => void; review.mockReturnValueOnce(new Promise<void>(done => { resolve = done; }));
  await render(); await click('Approve application');
  await act(async () => { void button('Confirm review').props.onClick(); });
  await act(async () => root.update(React.createElement(CompanionReviewActions, { record, onReview: review, scopeKey: 'admin-b' })));
  expect(root.root.findAll(node => node.props.role === 'dialog')).toHaveLength(0);
  await act(async () => resolve());
  expect(root.root.findAll(node => node.props.role === 'dialog')).toHaveLength(0);
});
it('forwards reason and expected revision through the encoded admin endpoint', async () => {
  const fetcher = vi.fn(async () => new Response('{}', { headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetcher);
  await adminApi.reviewCompanion('access', 'cp/one', 'REJECT', { reason: 'Details needed', expectedUpdatedAt: 10 });
  expect(fetcher.mock.calls[0][0]).toBe('/api/admin/companions/cp%2Fone/review');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ action: 'REJECT', reason: 'Details needed', expectedUpdatedAt: 10 });
});
