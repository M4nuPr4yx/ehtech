'use client';
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
      const res = await fetch('http://localhost:3000/esqueci-senha', {
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
    <div className="site-background min-h-screen text-white flex items-center justify-center p-4">
      <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-2xl font-bold text-[#ABDB25] mb-2 text-center">Esqueci minha senha</h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Informe seu e-mail e enviaremos instruções para redefinir sua senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#ABDB25] hover:bg-white hover:text-black font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar link de redefinição'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 p-3 rounded-xl text-center font-bold text-sm ${
            message.includes('sucesso') || message.includes('enviaremos')
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {message}
          </p>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-[#ABDB25] transition-colors">
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

