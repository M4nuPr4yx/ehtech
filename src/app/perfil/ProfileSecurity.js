'use client';
import GoogleAccount from './GoogleAccount';

export default function ProfileSecurity({ handleChangePassword, senhaAtual, setSenhaAtual, novaSenha, setNovaSenha, confirmarSenha, setConfirmarSenha, handleChangeEmail, novoEmail, setNovoEmail, senhaConfimar, setSenhaConfirmar, message, messageType }) {
return (<div className="space-y-8">
              <GoogleAccount />
              {/* Alterar Senha */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Alterar Senha</h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <label className="block text-sm font-medium"><span className="block mb-2">Senha atual</span><input
                    type="password"
                    placeholder="Senha atual"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="w-full p-4 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors"
                    required
                  /></label>
                  <label className="block text-sm font-medium"><span className="block mb-2">Nova senha (mínimo 8 caracteres)</span><input
                    type="password"
                    placeholder="Nova senha (mínimo 8 caracteres)"
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
                    className="w-full py-4 bg-accent-fill hover:brightness-110 hover:text-accent-contrast text-accent-contrast font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all"
                  >
                    Alterar Senha
                  </button>
                </form>
              </div>

              {/* Alterar Email */}
              <div className="pt-6 border-t border-line">
                <h2 className="text-xl font-bold text-foreground mb-4">Alterar E-mail</h2>
                <form onSubmit={handleChangeEmail} className="space-y-4">
                  <label className="block text-sm font-medium"><span className="block mb-2">Novo e-mail</span><input
                    type="email"
                    placeholder="Novo e-mail"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    className="w-full p-4 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors"
                    required
                  /></label>
                  <label className="block text-sm font-medium"><span className="block mb-2">Senha atual</span><input
                    type="password"
                    placeholder="Confirme sua senha"
                    value={senhaConfimar}
                    onChange={(e) => setSenhaConfirmar(e.target.value)}
                    className="w-full p-4 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors"
                    required
                  /></label>
                  <button
                    type="submit"
                    className="w-full py-4 bg-accent-fill hover:brightness-110 hover:text-accent-contrast text-accent-contrast font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all"
                  >
                    Alterar E-mail
                  </button>
                </form>
              </div>

{message && (
                <p className={`p-3 rounded-xl text-center font-bold ${messageType === 'success' ? 'bg-success-soft text-success border border-success' : 'bg-danger-soft text-danger border border-danger'}`}>
                  {message}
                </p>
              )}
            </div>);
}
