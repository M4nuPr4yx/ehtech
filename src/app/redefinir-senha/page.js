'use client';
import { apiResponse } from '../../lib/api-request.js';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RedefinirSenhaContent() {
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
        const res = await apiResponse(`/verificar-token/${token}`);
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
    if (novaSenha.length < 8) {
      setMessage('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiResponse('/redefinir-senha', {
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
      <div className="site-background min-h-screen text-foreground flex items-center justify-center">
        <p className="text-xl">Verificando token...</p>
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className="site-background min-h-screen text-foreground flex items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <h1 className="text-2xl font-bold text-danger mb-4">Link inválido</h1>
          <p className="text-muted mb-6">{message}</p>
          <Link href="/esqueci-senha" className="inline-block px-6 py-3 bg-accent-fill text-accent-contrast font-bold rounded-xl hover:brightness-110 transition-all">
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="site-background min-h-screen text-foreground flex items-center justify-center p-4">
      <div className="bg-surface border border-line rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-2xl font-bold text-accent mb-2 text-center">Nova senha</h1>
        <p className="text-muted text-sm mb-6 text-center">
          Digite sua nova senha abaixo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium"><span className="block mb-2">Nova senha (mínimo 8 caracteres)</span><input
            type="password"
            placeholder="Nova senha (mín. 8 caracteres)"
            minLength={8}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="w-full p-4 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors"
            required
          /></label>
          <label className="block text-sm font-medium"><span className="block mb-2">Confirme a nova senha</span><input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className="w-full p-4 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors"
            required
          /></label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent-fill hover:brightness-110 hover:text-accent-contrast font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Redefinindo...' : 'Redefinir senha'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 p-3 rounded-xl text-center font-bold text-sm ${
            message.includes('sucesso')
              ? 'bg-success-soft text-success border border-success'
              : 'bg-danger-soft text-danger border border-danger'
          }`}>
            {message}
          </p>
        )}

        {message && message.includes('sucesso') && (
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-accent hover:underline">
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return <Suspense fallback={<p role="status" className="p-8">Carregando recuperação de senha…</p>}><RedefinirSenhaContent /></Suspense>;
}

