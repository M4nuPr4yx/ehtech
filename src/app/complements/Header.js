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
  // Support URL and base64
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
  const dropdownRef = useRef(null);
  const [activeTab, setActiveTab] = useState('login');
const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
const [message, setMessage] = useState('');
  const [userPhoto, setUserPhoto] = useState('');

// Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    // Load profile photo from localStorage (cached on login)
    const savedPhoto = localStorage.getItem('userFoto');
    console.log('[Header] Init - token:', !!token, 'savedPhoto:', savedPhoto ? 'exists' : 'null');
    if (savedPhoto && savedPhoto !== 'null' && savedPhoto !== '') {
      // Validar se é base64 válido ou URL válida
      const isValidBase64 = savedPhoto.startsWith('data:image/') && savedPhoto.includes(',');
      const isValidUrl = savedPhoto.startsWith('http://') || savedPhoto.startsWith('https://') || savedPhoto.startsWith('/uploads/');
      if (isValidBase64 || isValidUrl) {
        console.log('[Header] Setting photo from localStorage:', savedPhoto.substring(0, 50));
        setUserPhoto(savedPhoto);
      } else {
        console.log('[Header] Invalid photo in localStorage, clearing:', savedPhoto.substring(0, 30));
        localStorage.removeItem('userFoto');
      }
    }
    if (token) {
      console.log('[Header] Fetching fresh profile photo');
      fetchProfilePhoto(token);
    }
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
      console.log('[Header] Fetching /perfil');
      const res = await fetch('http://localhost:3000/perfil', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('[Header] /perfil response:', res.ok, 'foto:', data.foto ? 'exists' : 'null');
      if (res.ok && data.foto && data.foto.startsWith('data:image/')) {
        // Validar se o base64 está completo (contém vírgula)
        const hasComma = data.foto.includes(',');
        console.log('[Header] Base64 validation:', hasComma ? 'valid' : 'CORRUPTED (no comma)');
        if (hasComma) {
          setUserPhoto(data.foto);
          localStorage.setItem('userFoto', data.foto);
        } else {
          console.log('[Header] Ignoring corrupted base64 photo');
          localStorage.removeItem('userFoto');
        }
      } else if (res.ok && data.foto && (
        data.foto.startsWith('http://') ||
        data.foto.startsWith('https://') ||
        data.foto.startsWith('/uploads/')
      )) {
        // URL válida
        console.log('[Header] URL photo:', data.foto.substring(0, 50));
        setUserPhoto(data.foto);
        localStorage.setItem('userFoto', data.foto);
      }
    } catch (err) {
      console.log('[Header] Error fetching photo:', err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const endpoint = activeTab === 'login' ? 'login' : 'cadastro';
      let bodyData;
      if (activeTab === 'login') {
        // Login uses username + senha
        bodyData = { username, senha };
      } else {
        // Cadastro uses username + email + senha
        bodyData = { username, email, senha };
      }
      const res = await fetch(`http://localhost:3000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
setMessage(data.mensagem);
      if (activeTab === 'login' && data.token) {
        localStorage.setItem('token', data.token);
        // Store username for display
        localStorage.setItem('userUsername', data.username || username);
        // Store photo if available - the backend /login doesn't return foto
        // So we need to fetch it after login
        console.log('[Header] Login success, fetching profile photo');
        fetchProfilePhoto(data.token);
        setIsLoggedIn(true);
        alert('Login bem-sucedido!');
        setModalOpen(false);
      } else if (data.mensagem.includes('sucesso')) {
        alert('Cadastro realizado! Agora você pode fazer login.');
        setModalOpen(false);
      }
      setUsername(''); 
      setEmail(''); 
      setSenha('');
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
    router.push('/');
  };

const goToPerfil = () => {
    setDropdownOpen(false);
    window.location.href = '/perfil';
  };

const goToAnunciar = () => {
    setDropdownOpen(false);
    window.location.href = '/anunciar';
  };

  const goToCarrinho = () => {
    setDropdownOpen(false);
    window.location.href = '/carrinho';
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090b0d]/90 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ABDB25] text-lg text-black">E</span>EH<span className="text-[#ABDB25]">tech</span></Link>
            <div className="flex items-center space-x-4">
<nav className="hidden md:flex space-x-6">
                <Link href="/" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Início</Link>
                <Link href="/produtos" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Produtos</Link>
                <Link href="/sobre" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Sobre nós</Link>
              </nav>
              
{isLoggedIn ? (
                // Logged in - show avatar dropdown
                <div className="relative" ref={dropdownRef}>
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
                  
{dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                      <button 
                        onClick={goToPerfil}
                        className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 flex items-center transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Perfil
                      </button>
<button 
                        onClick={goToAnunciar}
                        className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 flex items-center transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Anunciar Produto
                      </button>
                      <button 
                        onClick={goToCarrinho}
                        className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 flex items-center transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5m4 8v1a2 2 0 002 2h.01M9 20a2 2 0 104 0M15 20a2 2 0 104 0" />
                        </svg>
                        Carrinho
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left text-red-400 hover:bg-gray-800 flex items-center transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Not logged in - show login/cadastro buttons
                <>
                  <button onClick={() => { setActiveTab('cadastro'); setModalOpen(true); }} className="px-6 py-2 bg-[#ABDB25] text-black font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-sm">Cadastro</button>
                  <button onClick={() => { setActiveTab('login'); setModalOpen(true); }} className="px-6 py-2 border-2 border-[#ABDB25]/50 text-[#ABDB25] font-bold rounded-full hover:bg-[#ABDB25] hover:text-black transition-all duration-300 text-sm">Login</button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex mb-6">
              <button onClick={() => { setActiveTab('login'); setMessage(''); }} className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === 'login' ? 'bg-[#ABDB25] text-black shadow-lg' : 'text-white hover:text-[#ABDB25]'}`}>Login</button>
              <button onClick={() => { setActiveTab('cadastro'); setMessage(''); }} className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ml-2 ${activeTab === 'cadastro' ? 'bg-[#ABDB25] text-black shadow-lg' : 'text-white hover:text-[#ABDB25]'}`}>Cadastro</button>
            </div>
<form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'cadastro' && (
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors" required />
              )}
              <input type="text" placeholder="Nome de usuário" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors" required />
              <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors" required />
              <button type="submit" className="w-full py-4 bg-[#ABDB25] hover:bg-white hover:text-black font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">{activeTab === 'login' ? 'Entrar' : 'Cadastrar'}</button>
              {activeTab === 'login' && (
                <div className="text-center mt-2">
                  <Link href="/esqueci-senha" onClick={() => setModalOpen(false)} className="text-sm text-[#ABDB25] hover:underline">Esqueci minha senha?</Link>
                </div>
              )}
            </form>
            {message && (
              <p className={`mt-4 p-3 rounded-xl text-center font-bold ${message.includes('sucesso') || message.includes('liberado') ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-500/20 text-green-300 border border-red-500/30'}`}>{message}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
