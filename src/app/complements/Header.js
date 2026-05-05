'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Helper function to validate if a string is a valid image URL or Base64
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Check for valid URL patterns: http://, https://, or data:image/
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return true;
  }
  // Also check if it looks like a Base64 image (contains common Base64 image patterns)
  if (trimmed.includes('base64,')) {
    return true;
  }
  // Check if it's a valid looking URL (contains common image extensions)
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  return imageExtensions.some(ext => trimmed.toLowerCase().includes(ext));
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
    if (savedPhoto && savedPhoto !== 'null') {
      setUserPhoto(savedPhoto);
    } else if (token) {
      // Only fetch if no cached photo and logged in
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
      const res = await fetch('http://localhost:3000/perfil', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.foto) {
        setUserPhoto(data.foto);
        localStorage.setItem('userFoto', data.foto);
      }
    } catch (err) {
      // Silent fail - keep existing photo
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
        // Store photo if available
        if (data.foto) {
          localStorage.setItem('userFoto', data.foto);
          setUserPhoto(data.foto);
        } else {
          localStorage.removeItem('userFoto');
          setUserPhoto('');
        }
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
      <header className="bg-black/95 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-[#ABDB25]">EHtech</Link>
            <div className="flex items-center space-x-4">
<<<<<<< HEAD
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
=======
              <nav className="hidden md:flex space-x-6">
                <Link href="/" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Início</Link>
                <Link href="/sobre" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Sobre nós</Link>
              </nav>
              <button onClick={() => { setActiveTab('cadastro'); setModalOpen(true); }} className="px-6 py-2 bg-[#ABDB25] text-black font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-sm">Cadastro</button>
              <button onClick={() => { setActiveTab('login'); setModalOpen(true); }} className="px-6 py-2 border-2 border-[#ABDB25]/50 text-[#ABDB25] font-bold rounded-full hover:bg-[#ABDB25] hover:text-black transition-all duration-300 text-sm">Login</button>
>>>>>>> c38d38da68a04b8a5b664ed101384452dd3db440
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
<<<<<<< HEAD
<form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'cadastro' && (
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors" required />
              )}
              <input type="text" placeholder="Nome de usuário" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors" required />
=======
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors" required />
>>>>>>> c38d38da68a04b8a5b664ed101384452dd3db440
              <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors" required />
              <button type="submit" className="w-full py-4 bg-[#ABDB25] hover:bg-white hover:text-black font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">{activeTab === 'login' ? 'Entrar' : 'Cadastrar'}</button>
              {activeTab === 'login' && (
                <div className="text-center mt-2">
                  <Link href="/esqueci-senha" onClick={() => setModalOpen(false)} className="text-sm text-[#ABDB25] hover:underline">Esqueci minha senha?</Link>
                </div>
              )}
            </form>
            {message && (
              <p className={`mt-4 p-3 rounded-xl text-center font-bold ${message.includes('sucesso') || message.includes('liberado') ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>{message}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
