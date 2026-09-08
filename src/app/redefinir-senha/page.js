'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '../../lib/api';

export default function RedefinirSenhaPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerificando(false);
      setMessage('Token não encontrado na URL.');
      return;
    }

    const verificar = async () => {
      try {
        const res = await fetch(getApiUrl(`/verificar-token/${token}`));
        const data = await res.json();
        if (data.valido) {
          setTokenValido(true);
        } else {
          setMessage(data.mensagem || 'Token inválido ou expirado.');
        }
      } catch (err) {
        setMessage('Erro ao verificar token.');
      } finally {
        setVerificando(false);
      }
    };

    verificar();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (novaSenha !== confirmarSenha) {
      setMessage('As senhas não coincidem.');
      return;
    }
    if (novaSenha.length < 7) {
      setMessage('A senha deve ter no mínimo 7 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/redefinir-senha'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await res.json();
      setMessage(data.mensagem);
      if (data.mensagem.includes('sucesso')) {
        setNovaSenha('');
        setConfirmarSenha('');
      }
    } catch (err) {
      setMessage('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (verificando) {
    return (
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <p className="text-xl">Verificando token...</p>
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className="site-background min-h-screen text-white flex items-center justify-center p-4">
        <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Link inválido</h1>
          <p className="text-gray-300 mb-6">{message}</p>
          <Link href="/esqueci-senha" className="inline-block px-6 py-3 bg-[#ABDB25] text-black font-bold rounded-xl hover:bg-white transition-all">
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="site-background min-h-screen text-white flex items-center justify-center p-4">
      <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-2xl font-bold text-[#ABDB25] mb-2 text-center">Nova senha</h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Digite sua nova senha abaixo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Nova senha (mín. 7 caracteres)"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
            required
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#ABDB25] hover:bg-white hover:text-black font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Redefinindo...' : 'Redefinir senha'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 p-3 rounded-xl text-center font-bold text-sm ${
            message.includes('sucesso')
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {message}
          </p>
        )}

        {message && message.includes('sucesso') && (
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-[#ABDB25] hover:underline">
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

