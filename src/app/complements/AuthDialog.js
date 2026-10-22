'use client';
import Link from 'next/link';
export default function AuthDialog({ open, authDialogRef, activeTab, setActiveTab, setMessage, setModalOpen, message, username, setUsername, email, setEmail, senha, setSenha, confirmarSenha, setConfirmarSenha, handleSubmit }) {
if (!open) return null;
return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div role="dialog" aria-modal="true" aria-labelledby="auth-title" ref={authDialogRef} className="max-h-[90vh] overflow-y-auto w-full max-w-md rounded-3xl border border-accent bg-surface p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 id="auth-title" className="text-2xl font-extrabold text-foreground">
                {activeTab === 'login' ? 'Entrar no EHtech' : 'Criar Conta'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-foreground text-2xl font-bold p-1 rounded-lg"
                aria-label="Fechar janela de autenticação"
              >
                ×
              </button>
            </div>

            {/* Abas */}
            <div className="flex rounded-2xl bg-surface-raised p-1 mb-6">
              <button
                aria-pressed={activeTab === 'login'}
                onClick={() => { setActiveTab('login'); setMessage(''); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'login' ? 'bg-accent-fill text-accent-contrast shadow' : 'text-muted hover:text-foreground'
                }`}
              >
                Login
              </button>
              <button
                aria-pressed={activeTab === 'cadastro'}
                onClick={() => { setActiveTab('cadastro'); setMessage(''); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'cadastro' ? 'bg-accent-fill text-accent-contrast shadow' : 'text-muted hover:text-foreground'
                }`}
              >
                Cadastro
              </button>
            </div>

            {/* Mensagem de Feedback */}
            {message && (
              <p role="status" className={`mb-4 p-3 rounded-xl text-center text-sm font-semibold ${
                message.includes('sucesso') || message.includes('criado')
                  ? 'bg-success-soft text-success border border-success'
                  : 'bg-danger-soft text-danger border border-danger'
              }`}>
                {message}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'cadastro' && (
                <div>
                  <label htmlFor="auth-username" className="block text-xs font-semibold text-muted mb-1">Nome de Usuário</label>
                  <input
                    type="text"
                    id="auth-username" autoComplete="username" placeholder="Seu username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted text-sm focus:outline-none focus:border-accent transition-all"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-muted mb-1">E-mail</label>
                <input
                  type="email"
                  id="auth-email" autoComplete="email" placeholder="seu-email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted text-sm focus:outline-none focus:border-accent transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="auth-password" className="block text-xs font-semibold text-muted">Senha</label>
                  {activeTab === 'login' && (
                    <Link
                      href="/esqueci-senha"
                      onClick={() => setModalOpen(false)}
                      className="text-xs text-accent hover:underline"
                    >
                      Esqueci a senha
                    </Link>
                  )}
                </div>
                <input
                  type="password"
                  id="auth-password" autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'} placeholder="Sua senha (mínimo 8 dígitos)"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted text-sm focus:outline-none focus:border-accent transition-all"
                />
              </div>

              {activeTab === 'cadastro' && (
                <div>
                  <label htmlFor="auth-confirm" className="block text-xs font-semibold text-muted mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    id="auth-confirm" autoComplete="new-password" placeholder="Repita sua senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    required
                    className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted text-sm focus:outline-none focus:border-accent transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-accent-fill hover:brightness-110 text-accent-contrast font-extrabold rounded-2xl shadow-xl transition-all duration-300 mt-6 text-base"
              >
                {activeTab === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>
          </div>
        </div>);
}
