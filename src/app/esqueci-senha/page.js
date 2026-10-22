'use client';
import { apiResponse } from '../../lib/api-request.js';

import { useState } from 'react';
import Link from 'next/link';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const res = await apiResponse('/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.mensagem);
      setEmail('');
    } catch (err) {
      setMessage('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="site-background min-h-screen text-foreground flex items-center justify-center p-4">
      <div className="bg-surface border border-line rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-2xl font-bold text-accent mb-2 text-center">Esqueci minha senha</h1>
        <p className="text-muted text-sm mb-6 text-center">
          Informe seu e-mail e enviaremos instruções para redefinir sua senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium"><span className="block mb-2">E-mail</span><input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors"
            required
          /></label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent-fill hover:brightness-110 hover:text-accent-contrast font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar link de redefinição'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 p-3 rounded-xl text-center font-bold text-sm ${
            message.includes('sucesso') || message.includes('enviaremos')
              ? 'bg-success-soft text-success border border-success'
              : 'bg-danger-soft text-danger border border-danger'
          }`}>
            {message}
          </p>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-muted hover:text-accent transition-colors">
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

