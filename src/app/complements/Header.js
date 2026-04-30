'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const endpoint = activeTab === 'login' ? 'login' : 'cadastro';
      const res = await fetch(`http://localhost:3000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      setMessage(data.mensagem);
      if (activeTab === 'login' && data.token) {
        localStorage.setItem('token', data.token);
        alert('Login bem-sucedido!');
        setModalOpen(false);
      } else if (data.mensagem.includes('sucesso')) {
        alert('Cadastro realizado!');
        setModalOpen(false);
      }
      setEmail(''); 
      setSenha('');
    } catch (err) {
      setMessage('Erro: Verifique se backend está rodando em localhost:3000');
    }
  };

  return (
    <>
      <header className="bg-black/95 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-[#ABDB25]">EHtech</Link>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-6">
                <Link href="/" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Início</Link>
                <Link href="/sobre" className="text-white hover:text-[#ABDB25] transition-colors hover:underline">Sobre nós</Link>
              </nav>
              <button onClick={() => { setActiveTab('cadastro'); setModalOpen(true); }} className="px-6 py-2 bg-[#ABDB25] text-black font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-sm">Cadastro</button>
              <button onClick={() => { setActiveTab('login'); setModalOpen(true); }} className="px-6 py-2 border-2 border-[#ABDB25]/50 text-[#ABDB25] font-bold rounded-full hover:bg-[#ABDB25] hover:text-black transition-all duration-300 text-sm">Login</button>
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
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors" required />
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
