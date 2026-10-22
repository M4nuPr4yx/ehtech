'use client';

export default function AdminLogin({ feedback, loginAdmin, loginEmail, setLoginEmail, loginSenha, setLoginSenha, isLoggingIn }) {
return (<div className="site-background min-h-screen flex items-center justify-center p-6">
        <div className="bg-surface backdrop-blur-xl p-8 rounded-3xl border border-accent max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-foreground">
              Painel Administrativo
            </h1>
            <p className="text-muted text-sm mt-1">Acesso restrito a administradores EHtech</p>
          </div>
          {feedback && (
            <div className="mb-4 rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              {feedback}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loginAdmin();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="admin-email" className="block text-sm font-semibold text-muted mb-1">E-mail Administrativo</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                id="admin-email" autoComplete="username" placeholder="admin@ehtech.com"
                required
                className="w-full p-4 bg-surface-raised border border-line rounded-2xl text-foreground placeholder-muted focus:outline-none focus:border-accent transition-all"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-muted mb-1">Senha</label>
              <input
                type="password"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                id="admin-password" autoComplete="current-password" placeholder="••••••••"
                required
                className="w-full p-4 bg-surface-raised border border-line rounded-2xl text-foreground placeholder-muted focus:outline-none focus:border-accent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 bg-accent-fill hover:brightness-110 text-accent-contrast font-extrabold rounded-2xl shadow-xl hover:shadow-transparent transition-all duration-300 mt-4 text-base"
            >
              {isLoggingIn ? 'Autenticando…' : 'Entrar como Administrador'}
            </button>
          </form>
        </div>
      </div>);
}
