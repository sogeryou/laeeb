import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { authPresentation } from './config';
import type { AuthCopy } from './copy';

export function AvatarPicker({ c, onClose, onChoose, onUpload }: { c: AuthCopy; onClose: () => void; onChoose: (id: string) => void; onUpload: (image: string) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState('');
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const uploadLock = useRef(false);
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  const chooseFile = (value?: File) => {
    if (!value) return;
    if (!['image/jpeg','image/png','image/webp'].includes(value.type) || value.size > 10 * 1024 * 1024) { setError(c.photoError); return; }
    setError(''); setLoaded(false); setZoom(1); setPosition({ x: 0, y: 0 }); setSource(URL.createObjectURL(value));
  };
  const upload = async () => {
    if (uploadLock.current || !loaded || !image.current) return;
    uploadLock.current = true; setBusy(true); setError('');
    try {
      const img = image.current;
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
      const scale = Math.max(512 / img.naturalWidth, 512 / img.naturalHeight) * zoom;
      const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
      ctx.drawImage(img, (512 - width) * (position.x + 1) / 2, (512 - height) * (position.y + 1) / 2, width, height);
      await onUpload(canvas.toDataURL('image/png'));
      onClose();
    } catch { setError(c.photoFailed); }
    finally { uploadLock.current = false; setBusy(false); }
  };
  return <dialog ref={dialog} className="auth-dialog" aria-labelledby="avatar-title" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}>
    <div className="auth-dialog-head"><h2 id="avatar-title">{source ? c.crop : c.avatar}</h2><button type="button" className="auth-icon" onClick={onClose} disabled={busy} aria-label={c.close}><X /></button></div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {source ? <>
      <div className="auth-crop"><img ref={image} src={source} alt={c.crop} onLoad={() => {
        const img = image.current!;
        if (img.naturalWidth * img.naturalHeight > 40_000_000) { setError(c.photoError); setLoaded(false); } else setLoaded(true);
      }} onError={() => setError(c.photoError)} style={{ objectPosition: `${(position.x + 1) * 50}% ${(position.y + 1) * 50}%`, transform: `scale(${zoom})`, transformOrigin: `${(position.x + 1) * 50}% ${(position.y + 1) * 50}%` }} /></div>
      <label className="auth-range">{c.zoom}<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
      <label className="auth-range">{c.emailStep === 'Email' ? 'Horizontal position' : 'الموضع الأفقي'}<input type="range" min="-1" max="1" step=".05" value={position.x} onChange={e => setPosition(p => ({ ...p, x: Number(e.target.value) }))} /></label>
      <label className="auth-range">{c.emailStep === 'Email' ? 'Vertical position' : 'الموضع العمودي'}<input type="range" min="-1" max="1" step=".05" value={position.y} onChange={e => setPosition(p => ({ ...p, y: Number(e.target.value) }))} /></label>
      <button type="button" className="auth-primary" disabled={busy || !loaded} onClick={upload}>{busy ? c.loading : c.usePhoto}</button>
      <button type="button" className="auth-text-button" disabled={busy} onClick={() => setSource('')}>{c.back}</button>
    </> : <>
      <p className="auth-hint">{c.avatarHint}</p>
      <div className="auth-avatar-options">{authPresentation.avatars.map((a, index) => <button type="button" key={a.id} aria-label={`${c.avatar} ${index + 1}`} onClick={() => { onChoose(a.id); onClose(); }}><img src={a.url} alt="" /></button>)}</div>
      <button type="button" className="auth-primary" onClick={() => file.current?.click()}><Camera size={18} />{c.upload}</button>
    </>}
    <input ref={file} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { chooseFile(e.target.files?.[0]); e.target.value = ''; }} />
  </dialog>;
}
