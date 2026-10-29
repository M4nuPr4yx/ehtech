'use client';
import AuthDialog from './AuthDialog.js';

import { apiResponse } from '../../lib/api-request.js';

/* eslint-disable react-hooks/immutability */
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ThemeSwitcher from './ThemeSwitcher';
import AppNavigation from './AppNavigation';
import ehtechLogo from '../../../public/ehtech-logo.png';

// Helper function to validate if a string is a valid image URL or Base64
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('data:image/')
  );
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const dropdownRef = useRef(null);
  const authDialogRef = useRef(null);

  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    authDialogRef.current?.querySelector('input')?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') setModalOpen(false);
      if (event.key !== 'Tab') return;
      const fields = [...(authDialogRef.current?.querySelectorAll('button, a[href], input, select, textarea, iframe') || [])].filter(node => !node.disabled);
      const first = fields[0], last = fields.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const keepFocus = event => {
      if (authDialogRef.current && !authDialogRef.current.contains(event.target)) authDialogRef.current.querySelector('button, input, iframe')?.focus();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', keepFocus);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); document.removeEventListener('focusin', keepFocus); previous?.focus(); };
  }, [modalOpen]);
  const [activeTab, setActiveTab] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [userPhoto, setUserPhoto] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    queueMicrotask(() => { setIsLoggedIn(!!token); setUserRole(null); });
    if (token) fetchProfilePhoto(token);
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    setAuthReady(true);

    // Load profile photo from localStorage (cached on login)
    const savedPhoto = localStorage.getItem('userFoto');
    if (savedPhoto && savedPhoto !== 'null' && savedPhoto !== '') {
      const isValidBase64 = savedPhoto.startsWith('data:image/') && savedPhoto.includes(',');
      const isValidUrl = savedPhoto.startsWith('http://') || savedPhoto.startsWith('https://') || savedPhoto.startsWith('/uploads/');
      if (isValidBase64 || isValidUrl) {
        setUserPhoto(savedPhoto);
      } else {
        localStorage.removeItem('userFoto');
      }
    }
    if (token) {
      fetchNotifications(token);
      fetchUnreadMessages(token);
    }
  }, []);

  // Páginas protegidas voltam para a home com este parâmetro, abrindo o login
  // e mantendo o destino para que a pessoa continue de onde parou.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (authReady && !localStorage.getItem('token') && params.get('login') === '1') {
      setIsLoggedIn(false);
      setActiveTab('login');
      setMessage('');
      setModalOpen(true);
    }
  }, [authReady, pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const update = () => {
      const currentToken = localStorage.getItem('token');
      if (document.visibilityState === 'hidden' || !currentToken) return;
      fetchNotifications(currentToken); fetchUnreadMessages(currentToken);
    };
    const intervalId = window.setInterval(update, 30000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(intervalId); document.removeEventListener('visibilitychange', update); };
  }, [isLoggedIn]);

  useEffect(() => {
    const expired = event => {
      const token = localStorage.getItem('token');
      if (token && event.detail?.authorization === `Bearer ${token}`) {
        localStorage.removeItem('token'); localStorage.removeItem('userUsername'); localStorage.removeItem('userFoto');
        setIsLoggedIn(false); setUserRole(null); setActiveTab('login'); setMessage('Sua sessão terminou. Entre novamente para continuar.'); setModalOpen(true);
      }
      const adminToken = sessionStorage.getItem('adminToken');
      if (adminToken && event.detail?.authorization === `Bearer ${adminToken}`) { sessionStorage.removeItem('adminToken'); window.dispatchEvent(new Event('ehtech:admin-session-expired')); }
    };
    window.addEventListener('ehtech:session-expired', expired);
    return () => window.removeEventListener('ehtech:session-expired', expired);
  }, []);

  // Listen for storage changes (update photo when changed in other tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'userFoto') {
        setUserPhoto(e.newValue || '');
      }
      if (e.key === 'token' || e.key === null || e.type === 'ehtech:auth-change') {
        const token = localStorage.getItem('token');
        sessionStorage.removeItem('adminToken');
        setUserRole(null);
        setIsLoggedIn(Boolean(token));
        setDropdownOpen(false);
        if (token) fetchProfilePhoto(token);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ehtech:auth-change', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ehtech:auth-change', handleStorageChange);
    };
  }, []);

  const fetchProfilePhoto = async (token) => {
    try {
      const res = await apiResponse('/perfil', {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
      });
      const data = await res.json();
      if (localStorage.getItem('token') !== token) return;
      setUserRole(res.ok ? data.role : null);
      if (res.ok && data.foto && isValidImageUrl(data.foto)) {
        setUserPhoto(data.foto);
        localStorage.setItem('userFoto', data.foto);
      }
    } catch (err) {
      console.log('[Header] Error fetching photo:', err);
    }
  };

  const fetchUnreadMessages = async (token) => {
    try {
      const res = await apiResponse('/mensagens/nao-lidas/total', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadMessages(Number(data.totalNaoLidas) || 0);
    } catch (err) {
      console.log('[Header] Error fetching unread messages:', err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async (token) => {
    try {
      const res = await apiResponse('/notificacoes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('[Header] Error fetching notifications:', err);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await apiResponse(`/notificacoes/${notificationId}/lida`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((currentNotifications) => currentNotifications.map((notification) => (
        notification.id === notificationId ? { ...notification, lida: 1 } : notification
      )));
    } catch (err) {
      console.log('[Header] Error updating notification:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await apiResponse('/notificacoes/lidas', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((currentNotifications) => currentNotifications.map((notification) => ({ ...notification, lida: 1 })));
    } catch (err) {
      console.log('[Header] Error updating notifications:', err);
    }
  };

  const completeLogin = (data) => {
    sessionStorage.removeItem('adminToken');
    setUserRole(null);
    localStorage.setItem('token', data.token);
    localStorage.setItem('userUsername', data.username || '');
    window.dispatchEvent(new Event('ehtech:auth-change'));
    fetchNotifications(data.token); fetchUnreadMessages(data.token);
    setIsLoggedIn(true); setFeedback('Login bem-sucedido!'); setModalOpen(false);
    setUsername(''); setEmail(''); setSenha(''); setConfirmarSenha(''); setMessage('');
    const nextPath = new URLSearchParams(window.location.search).get('next');
    if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) router.replace(nextPath);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const endpoint = activeTab === 'login' ? 'login' : 'cadastro';
      let bodyData;
      if (activeTab === 'login') {
        bodyData = { email, senha };
      } else {
        if (senha !== confirmarSenha) {
          setMessage('As senhas não coincidem');
          return;
        }
        bodyData = { username, email, senha, confirmarSenha };
      }
      const res = await apiResponse(`/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      setMessage(data.mensagem || data.error || '');
      if (activeTab === 'login' && data.token) {
        completeLogin(data);
      } else if (activeTab === 'cadastro' && res.ok) {
        setFeedback(data.mensagem || 'Cadastro realizado! Agora você pode fazer login.');
        setActiveTab('login');
        setSenha('');
        setConfirmarSenha('');
      }

    } catch (err) {
      setMessage('Erro: Verifique a conexão com o servidor');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userUsername');
    localStorage.removeItem('userFoto');
    sessionStorage.removeItem('adminToken');
    window.dispatchEvent(new Event('ehtech:auth-change'));
    setUserRole(null);
    setIsLoggedIn(false);
    setDropdownOpen(false);
    setNotificationsOpen(false);
    setNotifications([]);
    setUnreadMessages(0);
    router.push('/');
  };

  const requireAuth = (path) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/?login=1&next=${encodeURIComponent(path)}`);
      return false;
    }
    return true;
  };

  const goToPerfil = () => { setDropdownOpen(false); if (requireAuth('/perfil')) router.push('/perfil'); };
  const goToMensagens = () => { setDropdownOpen(false); if (requireAuth('/mensagens')) router.push('/mensagens'); };
  const goToContratacoes = () => { setDropdownOpen(false); if (requireAuth('/contratacoes')) router.push('/contratacoes'); };
  const goToAnunciar = () => { setDropdownOpen(false); if (requireAuth('/anunciar')) router.push('/anunciar'); };
  const goToCarrinho = () => { setDropdownOpen(false); if (requireAuth('/carrinho')) router.push('/carrinho'); };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const destination = pathname.startsWith('/servicos') ? '/servicos' : '/produtos';
      router.push(`${destination}?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.lida).length;

  return (
    <>
      {feedback && (
        <div className="fixed right-5 top-24 z-[60] rounded-xl border border-success bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-xl backdrop-blur-md" role="status">
          {feedback}
          <button type="button" onClick={() => setFeedback('')} className="ml-3 text-success hover:text-foreground" aria-label="Fechar mensagem">×</button>
        </div>
      )}

      <header className="site-header sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Marca com área de respiro para reforçar a identidade do site. */}
            <Link href="/" className="group flex items-center shrink-0 rounded-2xl border border-transparent px-1 transition-all duration-200 hover:border-accent hover:bg-accent-soft" aria-label="EHtech - página inicial">
              <Image src={ehtechLogo} alt="EHtech" sizes="(min-width: 640px) 68px, 58px" quality={50} priority className="brand-logo h-12 sm:h-14 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03]" />
            </Link>

            {/* Central Search Bar */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex min-w-0 flex-1 max-w-2xl mx-2">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Buscar no site"
                  placeholder={pathname.startsWith('/servicos') ? 'Buscar serviços…' : 'Buscar produtos…'}
                  className="w-full bg-surface border border-line rounded-full py-2 pl-4 pr-10 text-xs sm:text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-accent transition-colors rounded-full"
                  aria-label="Buscar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Right Navigation & Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <ThemeSwitcher />


              {/* Botão de Anunciar */}
              <Link
                href="/anunciar"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-accent bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent hover:bg-accent-fill hover:text-accent-contrast transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Anunciar
              </Link>

              {/* Botão de Carrinho */}
              <Link
                href="/carrinho"
                className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted hover:border-accent hover:text-accent transition-all"
                aria-label="Carrinho de Compras"
                title="Meu Carrinho"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5m4 8v1a2 2 0 002 2h.01M9 20a2 2 0 104 0M15 20a2 2 0 104 0" />
                </svg>
              </Link>
              
              <div className="flex min-w-[7.75rem] justify-end sm:min-w-36">
              {!authReady ? (
                <div className="h-9 w-full sm:h-10" aria-hidden="true" />
              ) : isLoggedIn ? (
                // Logged in - show chat, notifications, avatar dropdown
                <div className="relative flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
                  {userRole === 'admin' && (
                    <Link href="/admin" aria-label="Painel administrativo" title="Painel administrativo" className="hidden h-9 w-9 items-center justify-center rounded-xl border border-accent bg-accent-soft text-accent transition-colors hover:bg-accent-fill hover:text-accent-contrast sm:flex sm:h-10 sm:w-10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4zm-3 9l2 2 4-4" /></svg>
                    </Link>
                  )}
                  {/* Botão de Chat / Mensagens */}
                  <Link
                    href="/mensagens"
                    className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted hover:border-accent hover:text-accent transition-all"
                    aria-label="Mensagens"
                    title="Mensagens do Marketplace"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    {unreadMessages > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent-fill text-accent-contrast px-1 text-xs font-extrabold shadow-lg animate-pulse">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </Link>

                  {/* Botão de Notificações */}
                  <button
                    type="button"
                    onClick={() => { setNotificationsOpen(!notificationsOpen); setDropdownOpen(false); }}
                    className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted hover:border-accent hover:text-accent transition-all"
                    aria-label="Notificações"
                    aria-expanded={notificationsOpen}
                    title="Notificações"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadNotifications > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger-soft px-1 text-xs font-bold text-danger">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </button>

                  {/* Avatar do Usuário */}
                  <button 
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-accent-fill flex items-center justify-center text-accent-contrast font-bold hover:shadow-lg hover:shadow-transparent transition-all overflow-hidden border border-accent"
                    aria-label="Abrir menu do usuário"
                    aria-expanded={dropdownOpen}
                  >
                    {isValidImageUrl(userPhoto) ? (
                      <img src={userPhoto} alt="Foto de perfil" className="w-full h-full object-cover object-center" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Painel de Notificações Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-12 top-12 w-80 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl z-50">
                      <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <span className="font-bold text-foreground text-sm">Notificações</span>
                        {unreadNotifications > 0 && (
                          <button type="button" onClick={markAllNotificationsAsRead} className="text-xs font-bold text-accent hover:underline">Marcar todas como lidas</button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map((notification) => (
                          <button
                            type="button"
                            key={notification.id}
                            onClick={() => markNotificationAsRead(notification.id)}
                            className={`w-full border-b border-line px-4 py-3 text-left transition-colors hover:bg-surface-raised ${notification.lida ? 'bg-surface' : 'bg-accent-soft'}`}
                          >
                            <p className="text-sm text-foreground">{notification.mensagem}</p>
                            <p className="mt-1 text-xs text-muted">{new Date(notification.created_at).toLocaleString('pt-BR')}</p>
                          </button>
                        )) : (
                          <p className="px-4 py-6 text-center text-sm text-muted">Você não possui notificações.</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Dropdown Menu do Usuário */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-12 w-52 bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-line">
                      <div className="py-1">
                        {userRole === 'admin' && (
                          <Link href="/admin" onClick={() => setDropdownOpen(false)} className="flex w-full items-center px-4 py-3 text-left text-sm font-semibold text-accent transition-colors hover:bg-surface-raised">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4zm-3 9l2 2 4-4" /></svg>
                            Painel administrativo
                          </Link>
                        )}
                        <button 
                          onClick={goToPerfil}
                          className="w-full px-4 py-3 text-left text-foreground hover:bg-surface-raised flex items-center transition-colors text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Meu Perfil
                        </button>
                        <Link href="/favoritos" onClick={() => setDropdownOpen(false)} className="flex w-full px-4 py-3 text-sm text-foreground hover:bg-surface-raised">Meus favoritos</Link>
                        <Link href="/bloqueados" onClick={() => setDropdownOpen(false)} className="flex w-full px-4 py-3 text-sm text-foreground hover:bg-surface-raised">Usuários bloqueados</Link>
                        <button 
                          onClick={goToMensagens}
                          className="w-full px-4 py-3 text-left text-foreground hover:bg-surface-raised flex items-center justify-between transition-colors text-sm"
                        >
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Mensagens
                          </div>
                          {unreadMessages > 0 && (
                            <span className="bg-accent-fill text-accent-contrast text-xs font-bold px-2 py-0.5 rounded-full">
                              {unreadMessages}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={goToContratacoes}
                          className="w-full px-4 py-3 text-left text-foreground hover:bg-surface-raised flex items-center transition-colors text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 3h8l4 4v14H5V3h2zm8 0v5h5" />
                          </svg>
                          Minhas Contratações
                        </button>
                        <Link href="/passaportes" onClick={() => setDropdownOpen(false)} className="w-full px-4 py-3 text-left text-foreground hover:bg-surface-raised flex items-center transition-colors text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14v16H5V4zm4 4h6m-6 4h6m-6 4h3" /></svg>
                          Meus Equipamentos
                        </Link>
                        <button 
                          onClick={goToAnunciar}
                          className="w-full px-4 py-3 text-left text-foreground hover:bg-surface-raised flex items-center transition-colors text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Anunciar Produto
                        </button>
                        <button 
                          onClick={goToCarrinho}
                          className="w-full px-4 py-3 text-left text-foreground hover:bg-surface-raised flex items-center transition-colors text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5m4 8v1a2 2 0 002 2h.01M9 20a2 2 0 104 0M15 20a2 2 0 104 0" />
                          </svg>
                          Carrinho
                        </button>
                      </div>
                      <div className="py-1">
                        <button 
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-left text-danger hover:bg-danger-soft flex items-center transition-colors text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="rounded-xl bg-accent-fill px-5 py-2.5 text-sm font-bold text-accent-contrast shadow-lg shadow-transparent transition-all duration-300 hover:brightness-110 hover:shadow-xl"
                >
                  Entrar
                </button>
              )}
              </div>
            </div>
          </div>
          <AppNavigation />
        </div>
      </header>

      {/* Modal de Login / Cadastro */}
      <AuthDialog open={modalOpen} authDialogRef={authDialogRef} activeTab={activeTab} setActiveTab={setActiveTab} setMessage={setMessage} setModalOpen={setModalOpen} message={message} username={username} setUsername={setUsername} email={email} setEmail={setEmail} senha={senha} setSenha={setSenha} confirmarSenha={confirmarSenha} setConfirmarSenha={setConfirmarSenha} handleSubmit={handleSubmit} />
    </>
  );
}
