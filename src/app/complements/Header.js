'use client';
/* eslint-disable react-hooks/immutability */
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const dropdownRef = useRef(null);
  const [activeTab, setActiveTab] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [userPhoto, setUserPhoto] = useState('');

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

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
      fetchProfilePhoto(token);
      fetchNotifications(token);
      fetchUnreadMessages(token);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const intervalId = window.setInterval(() => {
      fetchNotifications(token);
      fetchUnreadMessages(token);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Listen for storage changes (update photo when changed in other tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'userFoto') {
        setUserPhoto(e.newValue || '');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchProfilePhoto = async (token) => {
    try {
      const res = await fetch('http://localhost:3000/perfil', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
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
      const res = await fetch('http://localhost:3000/mensagens/nao-lidas/total', {
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
      const res = await fetch('http://localhost:3000/notificacoes', {
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
      await fetch(`http://localhost:3000/notificacoes/${notificationId}/lida`, {
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
      await fetch('http://localhost:3000/notificacoes/lidas', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((currentNotifications) => currentNotifications.map((notification) => ({ ...notification, lida: 1 })));
    } catch (err) {
      console.log('[Header] Error updating notifications:', err);
    }
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
      const res = await fetch(`http://localhost:3000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      setMessage(data.mensagem || data.error || '');
      if (activeTab === 'login' && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userUsername', data.username || username);
        fetchProfilePhoto(data.token);
        fetchNotifications(data.token);
        fetchUnreadMessages(data.token);
        setIsLoggedIn(true);
        setFeedback('Login bem-sucedido!');
        setModalOpen(false);
        setUsername(''); 
        setEmail(''); 
        setSenha('');
        setConfirmarSenha('');
      } else if (activeTab === 'cadastro' && res.ok) {
        setFeedback(data.mensagem || 'Cadastro realizado! Agora você pode fazer login.');
        setActiveTab('login');
        setSenha('');
        setConfirmarSenha('');
      }
    } catch (err) {
      setMessage('Erro: Verifique se backend está rodando em localhost:3000');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userUsername');
    localStorage.removeItem('userFoto');
    setIsLoggedIn(false);
    setDropdownOpen(false);
    setNotificationsOpen(false);
    setNotifications([]);
    setUnreadMessages(0);
    router.push('/');
  };

  const goToPerfil = () => {
    setDropdownOpen(false);
    router.push('/perfil');
  };

  const goToMensagens = () => {
    setDropdownOpen(false);
    router.push('/mensagens');
  };

  const goToAnunciar = () => {
    setDropdownOpen(false);
    router.push('/anunciar');
  };

  const goToCarrinho = () => {
    setDropdownOpen(false);
    router.push('/carrinho');
  };

  const unreadNotifications = notifications.filter((notification) => !notification.lida).length;

  return (
    <>
      {feedback && (
        <div className="fixed right-5 top-24 z-[60] rounded-xl border border-green-500/40 bg-green-500/20 px-4 py-3 text-sm font-medium text-green-200 shadow-xl" role="status">
          {feedback}
          <button type="button" onClick={() => setFeedback('')} className="ml-3 text-green-100 hover:text-white" aria-label="Fechar mensagem">×</button>
        </div>
      )}
      <header className="sticky top-0 z-50 border-b border-[#abdb25]/15 bg-[#070909]/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-2">
          <div className="flex justify-between items-center">
            <Link href="/" className="group flex items-center rounded-2xl transition duration-300 hover:scale-[1.02]" aria-label="EHtech - página inicial">
              <img src="/ehtech-logo.png" alt="EHtech" className="h-14 w-auto object-contain drop-shadow-[0_0_18px_rgba(171,219,37,0.22)] md:h-16" />
            </Link>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-6">
                <Link href="/" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Início</Link>
                <Link href="/produtos" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Produtos</Link>
                <Link href="/sobre" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Sobre nós</Link>
              </nav>
              
              {isLoggedIn ? (
                // Logged in - show chat, notifications, avatar dropdown
                <div className="relative flex items-center gap-3" ref={dropdownRef}>
                  {/* Botão de Chat / Mensagens */}
                  <Link
                    href="/mensagens"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-white hover:border-[#ABDB25] hover:text-[#ABDB25] transition-all"
                    aria-label="Mensagens"
                    title="Mensagens do Marketplace"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    {unreadMessages > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ABDB25] text-black px-1 text-xs font-extrabold shadow-lg animate-pulse">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </Link>

                  {/* Botão de Notificações */}
                  <button
                    type="button"
                    onClick={() => { setNotificationsOpen(!notificationsOpen); setDropdownOpen(false); }}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-white hover:border-[#ABDB25] hover:text-[#ABDB25] transition-all"
                    aria-label="Notificações"
                    title="Notificações"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadNotifications > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </button>

                  {/* Avatar do Usuário */}
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-10 h-10 rounded-full bg-[#ABDB25] flex items-center justify-center text-black font-bold hover:shadow-lg hover:shadow-[#ABDB25]/30 transition-all overflow-hidden"
                  >
                    {isValidImageUrl(userPhoto) ? (
                      <img src={userPhoto} alt="Foto de perfil" className="w-full h-full object-cover object-center" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Painel de Notificações Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-12 top-12 w-80 overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl z-50">
                      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                        <span className="font-bold text-white text-sm">Notificações</span>
                        {unreadNotifications > 0 && (
                          <button type="button" onClick={markAllNotificationsAsRead} className="text-xs font-bold text-[#ABDB25] hover:underline">Marcar todas como lidas</button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map((notification) => (
                          <button
                            type="button"
                            key={notification.id}
                            onClick={() => markNotificationAsRead(notification.id)}
                            className={`w-full border-b border-gray-800 px-4 py-3 text-left transition-colors hover:bg-gray-800 ${notification.lida ? 'bg-gray-900' : 'bg-[#ABDB25]/10'}`}
                          >
                            <p className="text-sm text-white">{notification.mensagem}</p>
                            <p className="mt-1 text-xs text-gray-400">{new Date(notification.created_at).toLocaleString('pt-BR')}</p>
                          </button>
                        )) : (
                          <p className="px-4 py-6 text-center text-sm text-gray-400">Você não possui notificações.</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Dropdown Menu do Usuário */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-12 w-52 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-gray-800">
                      <div className="py-1">
                        <button 
                          onClick={goToPerfil}
                          className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 flex items-center transition-colors text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Meu Perfil
                        </button>
                        <button 
                          onClick={goToMensagens}
                          className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 flex items-center justify-between transition-colors text-sm"
                        >
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Mensagens
                          </div>
                          {unreadMessages > 0 && (
                            <span className="bg-[#ABDB25] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                              {unreadMessages}
                            </span>
                          )}
                        </button>
                        <button 
                          onClick={goToAnunciar}
                          className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 flex items-center transition-colors text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Anunciar Produto
                        </button>
                        <button 
                          onClick={goToCarrinho}
                          className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 flex items-center transition-colors text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5m4 8v1a2 2 0 002 2h.01M9 20a2 2 0 104 0M15 20a2 2 0 104 0" />
                          </svg>
                          Carrinho
                        </button>
                      </div>
                      <div className="py-1">
                        <button 
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 flex items-center transition-colors text-sm"
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
                  onClick={() => setModalOpen(true)}
                  className="rounded-xl bg-[#ABDB25] px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#ABDB25]/20 transition-all duration-300 hover:bg-white hover:shadow-xl"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Login / Cadastro */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-[#ABDB25]/30 bg-gray-900/95 p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-white">
                {activeTab === 'login' ? 'Entrar no EHtech' : 'Criar Conta'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold p-1 rounded-lg"
              >
                ×
              </button>
            </div>

            {/* Abas */}
            <div className="flex rounded-2xl bg-gray-800/80 p-1 mb-6">
              <button
                onClick={() => { setActiveTab('login'); setMessage(''); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'login' ? 'bg-[#ABDB25] text-black shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setActiveTab('cadastro'); setMessage(''); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'cadastro' ? 'bg-[#ABDB25] text-black shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Cadastro
              </button>
            </div>

            {/* Mensagem de Feedback */}
            {message && (
              <p className={`mb-4 p-3 rounded-xl text-center text-sm font-semibold ${
                message.includes('sucesso') || message.includes('criado')
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {message}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'cadastro' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Nome de Usuário</label>
                  <input
                    type="text"
                    placeholder="Seu username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full p-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#ABDB25] transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="seu-email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#ABDB25] transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-400">Senha</label>
                  {activeTab === 'login' && (
                    <Link
                      href="/esqueci-senha"
                      onClick={() => setModalOpen(false)}
                      className="text-xs text-[#ABDB25] hover:underline"
                    >
                      Esqueci a senha
                    </Link>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="Sua senha (mínimo 8 dígitos)"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full p-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#ABDB25] transition-all"
                />
              </div>

              {activeTab === 'cadastro' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    placeholder="Repita sua senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    required
                    className="w-full p-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#ABDB25] transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-[#ABDB25] hover:bg-white text-black font-extrabold rounded-2xl shadow-xl transition-all duration-300 mt-6 text-base"
              >
                {activeTab === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
