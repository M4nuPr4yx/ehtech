'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { THEMES, THEME_KEY } from '../../lib/theme';

let fallbackPreference = null;

function getPreference() {
  if (fallbackPreference !== null) return fallbackPreference;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return THEMES.some(theme => theme.id === saved) ? saved : 'system';
  } catch { return 'system'; }
}

function applyTheme() {
  const preference = getPreference();
  document.documentElement.dataset.theme = preference === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
}

function savePreference(id) {
  try { localStorage.setItem(THEME_KEY, id); fallbackPreference = null; }
  catch { fallbackPreference = id; }
  window.dispatchEvent(new Event('ehtech-theme-change'));
}

function subscribe(callback) {
  const media = matchMedia('(prefers-color-scheme: dark)');
  const update = () => { applyTheme(); callback(); };
  const storageUpdate = event => { if (event.key === THEME_KEY || event.key === null) { fallbackPreference = null; update(); } };
  window.addEventListener('storage', storageUpdate);
  window.addEventListener('ehtech-theme-change', update);
  media.addEventListener('change', update);
  applyTheme();
  return () => {
    window.removeEventListener('storage', storageUpdate);
    window.removeEventListener('ehtech-theme-change', update);
    media.removeEventListener('change', update);
  };
}

export default function ThemeSwitcher() {
  const preference = useSyncExternalStore(subscribe, getPreference, () => 'system');
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!container.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  function selectTheme(id) {
    savePreference(id);
    setOpen(false);
    trigger.current?.focus();
  }

  return <div className="theme-switcher" ref={container}>
    <button ref={trigger} className="theme-trigger" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="theme-options" aria-label="Escolher tema">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
      <span>Tema</span>
    </button>
    {open && <div id="theme-options" className="theme-options" role="group" aria-label="Temas de aparência">
      <p>Aparência</p>
      {THEMES.map(theme => <button key={theme.id} type="button" aria-pressed={preference === theme.id} onClick={() => selectTheme(theme.id)}>
        <span className="theme-swatch" style={{ background: theme.color }} aria-hidden="true" />
        <span><strong>{theme.name}</strong><small>{theme.description}</small></span>
        <span className="theme-check" aria-hidden="true">{preference === theme.id ? '✓' : ''}</span>
      </button>)}
      <small className="theme-hint">Sua escolha fica salva neste navegador.</small>
    </div>}
  </div>;
}
