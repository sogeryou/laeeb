import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatSession, EPal, Message, Post } from '@shared/types';
import { apiUrl, readJsonResponse } from '@shared/apiClient';
import { catchUpMessages, reconcilePosts, flushReadQueue } from '../lib/socialSync';

type Page<T> = { items: T[]; nextBefore: string | null };
export function useSocial(token: string | null, userId: string | undefined, view: string, selected: EPal | null) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postListMode, setPostListMode] = useState<'public' | 'mine'>('public');
  const [messageInput, setMessageInput] = useState('');
  const [postDraft, setPostDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [publishingPost, setPublishingPost] = useState(false);
  const [socialError, setSocialError] = useState('');
  const [postError, setPostError] = useState('');
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const peer = useRef<string | null>(null);
  const generation = useRef(0), latest = useRef({ token, userId, view, selectedId: selected?.id });
  latest.current = { token, userId, view, selectedId: selected?.id };
  const authenticated = Boolean(token);
  const messageAttempt = useRef<{ content: string; peer: string; key: string } | null>(null);
  const postAttempt = useRef<{ content: string; key: string } | null>(null);
  const messageBusy = useRef(false), postBusy = useRef(false);
  const knownMessages = useRef(new Set<string>());
  const pendingReads = useRef(new Set<string>());
  const published = useRef<Array<{ revision: number; post: Post }>>([]), postRevision = useRef(0);
  const call = useCallback(async <T,>(path: string, body?: unknown): Promise<T> => readJsonResponse<T>(await fetch(apiUrl(`/api/social${path}`), {
    method: body === undefined ? 'GET' : 'POST', headers: { ...(latest.current.token ? { Authorization: `Bearer ${latest.current.token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })), []);
  const displayMessages = (items: Message[]) => items.map(m => ({ ...m, senderId: m.senderId === userId ? 'me' : m.senderId }));

  useEffect(() => {
    setChatSessions([]); setCurrentMessages([]); setMessageInput(''); setPostDraft(''); setSocialError(''); setPostError('');
    messageAttempt.current = null; postAttempt.current = null;
    published.current = []; postRevision.current = 0;
    setPosts([]); setPostListMode('public');
    if (!token || !userId) return;
    let active = true, busy = false;
    const poll = async () => {
      if (busy || document.hidden) return; busy = true;
      try { const data = await call<{ items: ChatSession[] }>('/conversations'); if (active) setChatSessions(data.items); }
      catch (error) { if (active) setSocialError((error as Error).message); }
      finally { busy = false; }
    };
    void poll(); const timer = setInterval(poll, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [authenticated, userId, call]);

  useEffect(() => {
    const version = ++generation.current; peer.current = null; knownMessages.current = new Set(); setCurrentMessages([]); setMessageCursor(null); setMessageInput(''); setSocialError('');
    pendingReads.current = new Set();
    if (!token || !userId || view !== 'IM_DETAIL' || !selected) return;
    let active = true, busy = false, initialized = false;
    const poll = async () => {
      if (busy || document.hidden) return; busy = true;
      try {
        const peerId = selected.userId || (await call<EPal>(`/peer/${encodeURIComponent(selected.id)}`)).userId!;
        if (!active) return; peer.current = peerId;
        const hadKnownMessages = knownMessages.current.size > 0;
        const data = await catchUpMessages(before => {
          if (!active) throw new Error('CONVERSATION_CHANGED');
          return call<Page<Message>>(`/messages/${encodeURIComponent(peerId)}${before ? `?before=${encodeURIComponent(before)}` : ''}`);
        }, knownMessages.current, initialized);
        if (!active || generation.current !== version) return;
        const incoming = displayMessages(data.items);
        setCurrentMessages(old => { const combined = new Map<string, Message>(old.map(m => [m.id, m])); incoming.forEach(m => combined.set(m.id, m)); return [...combined.values()].sort((a, b) => a.timestamp - b.timestamp); });
        if (!initialized || !hadKnownMessages) setMessageCursor(data.nextBefore);
        data.items.forEach(m => knownMessages.current.add(m.id)); initialized = true;
        setSocialError('');
        data.items.filter(m => m.receiverId === userId && !m.readAt).forEach(m => pendingReads.current.add(m.id));
        await flushReadQueue(pendingReads.current, ids => call(`/messages/${encodeURIComponent(peerId)}/read`, { ids }), () => active && !document.hidden);
      } catch (error) { if (active) setSocialError((error as Error).message); }
      finally { busy = false; }
    };
    void poll(); const timer = setInterval(poll, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [authenticated, userId, view, selected?.id, selected?.userId, call]);

  useEffect(() => {
    if (view !== 'COMMUNITY') return;
    let active = true;
    const revision = postRevision.current;
    setPosts([]); setPostCursor(null);
    void call<Page<Post>>(postListMode === 'mine' ? '/posts/mine' : '/posts').then(data => { if (active) { setPosts(reconcilePosts(data.items, published.current.filter(p => p.revision > revision && (postListMode === 'mine' || p.post.status === 'APPROVED')).map(p => p.post))); setPostCursor(data.nextBefore); setPostError(''); } }).catch(error => { if (active) setPostError(error.message); });
    return () => { active = false; };
  }, [view, call, postListMode, authenticated, userId]);

  const sendMessage = async () => {
    const content = messageInput.trim(), peerId = peer.current, version = generation.current;
    if (!token || !content || !peerId || messageBusy.current) return;
    if (messageAttempt.current?.content !== content || messageAttempt.current?.peer !== peerId) messageAttempt.current = { content, peer: peerId, key: crypto.randomUUID() };
    const key = messageAttempt.current.key; messageBusy.current = true; setSendingMessage(true);
    try {
      const sent = await call<Message>('/messages', { recipientId: peerId, content, requestId: key });
      if (generation.current !== version || latest.current.userId !== userId) return;
      setCurrentMessages(old => old.some(m => m.id === sent.id) ? old : [...old, ...displayMessages([sent])]);
      setMessageInput(old => old.trim() === content ? '' : old); messageAttempt.current = null; setSocialError('');
    } catch (error) { if (generation.current === version) setSocialError((error as Error).message); }
    finally { messageBusy.current = false; setSendingMessage(false); }
  };
  const loadEarlierMessages = async () => {
    const peerId = peer.current, version = generation.current;
    if (!peerId || !messageCursor || loadingHistory) return;
    setLoadingHistory(true);
    try {
      const data = await call<Page<Message>>(`/messages/${encodeURIComponent(peerId)}?before=${encodeURIComponent(messageCursor)}`);
      if (generation.current !== version) return;
      data.items.forEach(m => knownMessages.current.add(m.id));
      setCurrentMessages(old => { const combined = new Map([...displayMessages(data.items), ...old].map(m => [m.id, m])); return [...combined.values()].sort((a, b) => a.timestamp - b.timestamp); });
      setMessageCursor(data.nextBefore);
      data.items.filter(m => m.receiverId === userId && !m.readAt).forEach(m => pendingReads.current.add(m.id));
      await flushReadQueue(pendingReads.current, ids => call(`/messages/${encodeURIComponent(peerId)}/read`, { ids }), () => generation.current === version && !document.hidden);
    } catch (error) { if (generation.current === version) setSocialError((error as Error).message); }
    finally { setLoadingHistory(false); }
  };
  const publishPost = async () => {
    const content = postDraft.trim(); if (!token || !content || postBusy.current) return false;
    if (postAttempt.current?.content !== content) postAttempt.current = { content, key: crypto.randomUUID() };
    postBusy.current = true; setPublishingPost(true);
    try {
      const post = await call<Post>('/posts', { content, requestId: postAttempt.current.key });
      if (latest.current.userId !== userId) return false;
      published.current.push({ revision: ++postRevision.current, post });
      setPostListMode('mine');
      setPosts(old => [post, ...old.filter(p => p.id !== post.id)]); setPostDraft(old => old.trim() === content ? '' : old); setPostError(''); postAttempt.current = null; return true;
    } catch (error) { if (latest.current.userId === userId) setPostError((error as Error).message); return false; }
    finally { postBusy.current = false; setPublishingPost(false); }
  };
  const loadMorePosts = async () => {
    if (!postCursor) return;
    try { const data = await call<Page<Post>>(`${postListMode === 'mine' ? '/posts/mine' : '/posts'}?before=${encodeURIComponent(postCursor)}`); if (latest.current.userId !== userId) return;
      setPosts(old => [...new Map([...old, ...data.items].map(p => [p.id, p])).values()]); setPostCursor(data.nextBefore); setPostError('');
    } catch (error) { if (latest.current.userId === userId) setPostError((error as Error).message); }
  };
  return { chatSessions, setChatSessions, currentMessages, setCurrentMessages, messageInput, setMessageInput,
    posts, postListMode, setPostListMode, postDraft, setPostDraft, sendingMessage, publishingPost, socialError, postError, sendMessage, publishPost,
    messageCursor, loadEarlierMessages, loadingHistory, postCursor, loadMorePosts };
}
