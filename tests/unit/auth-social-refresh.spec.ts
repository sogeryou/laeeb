import { createElement, act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSocial } from '../../client/hooks/useSocial';
import { usePostDetail } from '../../client/hooks/usePostDetail';

let root: ReactTestRenderer;
let social: ReturnType<typeof useSocial>;
let detail: ReturnType<typeof usePostDetail>;
function Harness({ token, userId }: { token: string | null; userId: string | undefined }) {
  social = useSocial(token, userId, 'IM_DETAIL', { id: 'cp', userId: 'peer' } as any);
  detail = usePostDetail('post', token, userId);
  return null;
}
beforeEach(async () => {
  vi.stubGlobal('document', { hidden: false });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ items: [], nextBefore: null }), { headers: { 'content-type': 'application/json' } })));
  await act(async () => { root = create(createElement(Harness, { token: 'a-first', userId: 'a' })); });
});
it('retains a comment draft across same-account refresh and clears it on identity change', async () => {
  await act(async () => detail.setDraft('unfinished comment'));
  await act(async () => root.update(createElement(Harness, { token: 'a-rotated', userId: 'a' })));
  expect(detail.draft).toBe('unfinished comment');
  await act(async () => root.update(createElement(Harness, { token: 'b-first', userId: 'b' })));
  expect(detail.draft).toBe('');
});
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });
it('retains private drafts during same-account token rotation but clears them for another account', async () => {
  await act(async () => { social.setMessageInput('unfinished message'); social.setPostDraft('unfinished post'); });
  await act(async () => root.update(createElement(Harness, { token: 'a-rotated', userId: 'a' })));
  expect(social.messageInput).toBe('unfinished message');
  expect(social.postDraft).toBe('unfinished post');
  await act(async () => root.update(createElement(Harness, { token: 'b-first', userId: 'b' })));
  expect(social.messageInput).toBe(''); expect(social.postDraft).toBe('');
});
