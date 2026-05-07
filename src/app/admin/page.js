'use client';

import { useMemo, useState, useEffect } from 'react';

function formatPercent(value, total) {
  if (!total || total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

/**
 * Gráfico simples (sem libs externas) - barras responsivas.
 * categories: [{ label, value, colorClass }]
 */
function SimpleBarChart({ categories }) {
  const max = Math.max(0, ...categories.map((c) => c.value));

  return (
    <div className="w-full">
      <div className="flex items-end gap-3 h-44">
        {categories.map((c) => {
          const pct = max > 0 ? c.value / max : 0;
          return (
            <div key={c.label} className="flex-1 min-w-0">
              <div className="flex items-end justify-center">
                <div
                  className={`${c.colorClass} w-full rounded-xl`}
                  style={{ height: `${Math.max(8, Math.round(pct * 100))}%` }}
                  aria-label={`${c.label}: ${c.value}`}
                />
              </div>
              <div className="mt-3 text-xs text-white/70 text-center truncate">{c.label}</div>
              <div className="mt-1 text-sm text-white font-bold text-center">{c.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Admin() {
  const [adminToken, setAdminToken] = useState(null);
  const [users, setUsers] = useState([]);

  const [loginEmail, setLoginEmail] = useState('admin@ehtech.com');
  const [loginSenha, setLoginSenha] = useState('admin123');

  const [editing, setEditing] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setAdminToken(token);
      fetchUsers(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginAdmin = async () => {
    try {
      const res = await fetch('http://localhost:3000/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, senha: loginSenha }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        setAdminToken(data.token);
        fetchUsers(data.token);
      } else {
        alert(data.mensagem);
      }
    } catch {
      alert('Erro conexão');
    }
  };

  const fetchUsers = async (token) => {
    try {
      const res = await fetch('http://localhost:3000/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch {
      alert('Erro listar');
    }
  };

  const saveEdit = async () => {
    if (!editing) return;

    try {
      const res = await fetch(`http://localhost:3000/admin/users/${editing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ email: editEmail, role: editRole }),
      });
      const data = await res.json();
      alert(data.mensagem);
      fetchUsers(adminToken);
      setEditing(null);
    } catch {
      alert('Erro update');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Deletar user?')) return;
    try {
      const res = await fetch(`http://localhost:3000/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      alert(data.mensagem);
      fetchUsers(adminToken);
    } catch {
      alert('Erro delete');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
  };

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => (u.role || '').toLowerCase() === 'admin').length;
    const regularUsers = total - admins;

    return {
      total,
      admins,
      regularUsers,
      adminShareLabel: total ? formatPercent(admins, total) : '0%',
    };
  }, [users]);

  const roleCategories = useMemo(() => {
    const admins = users.filter((u) => (u.role || '').toLowerCase() === 'admin').length;
    const regularUsers = users.length - admins;
    return [
      { label: 'Admin', value: admins, colorClass: 'bg-[#ABDB25]' },
      { label: 'User', value: regularUsers, colorClass: 'bg-blue-600' },
    ];
  }, [users]);

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#111] to-black flex items-center justify-center p-8">
        <div className="bg-gray-900/80 backdrop-blur-md p-8 rounded-2xl border border-[#ABDB25]/30 max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-[#ABDB25] to-white bg-clip-text text-transparent mb-8">
            Admin Login
          </h1>

          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="admin@ehtech.com"
            className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl mb-4 text-white focus:border-[#ABDB25]"
          />

          <input
            type="password"
            value={loginSenha}
            onChange={(e) => setLoginSenha(e.target.value)}
            placeholder="admin123"
            className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl mb-6 text-white focus:border-[#ABDB25]"
          />

          <button
            onClick={loginAdmin}
            className="w-full py-4 bg-[#ABDB25] hover:bg-white hover:text-black font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            Entrar Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111] to-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ABDB25] to-white bg-clip-text text-transparent">
              Admin Intranet - Dashboard
            </h1>
            <p className="text-white/70 mt-2 text-sm">Visão geral das contas e ações de administração.</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[#ABDB25] font-bold">Admin OK</span>
            <button onClick={logout} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-xl font-bold transition-all">
              Logout
            </button>
          </div>
        </div>

        {/* Widgets / Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/50 backdrop-blur-md border border-[#ABDB25]/20 rounded-2xl p-5">
            <div className="text-white/70 text-sm">Total de Usuários</div>
            <div className="mt-2 text-3xl font-extrabold">{stats.total}</div>
            <div className="mt-3 text-xs text-white/60">Contagem a partir de /admin/users</div>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-md border border-[#ABDB25]/20 rounded-2xl p-5">
            <div className="text-white/70 text-sm">Admins</div>
            <div className="mt-2 text-3xl font-extrabold">{stats.admins}</div>
            <div className="mt-3 text-xs text-white/60">Participação: {stats.adminShareLabel}</div>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-md border border-[#ABDB25]/20 rounded-2xl p-5">
            <div className="text-white/70 text-sm">Usuários Comuns</div>
            <div className="mt-2 text-3xl font-extrabold">{stats.regularUsers}</div>
            <div className="mt-3 text-xs text-white/60">Acesso padrão (role user)</div>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-md border border-[#ABDB25]/20 rounded-2xl p-5">
            <div className="text-white/70 text-sm">Alertas</div>
            <div className="mt-2 text-3xl font-extrabold">{stats.admins === 0 ? '!' : 'OK'}</div>
            <div className="mt-3 text-xs text-white/60">
              {stats.admins === 0 ? 'Sem admins cadastrados' : 'Sem alertas críticos'}
            </div>
          </div>
        </div>

        {/* Gráfico + Ações */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900/50 backdrop-blur-md border border-[#ABDB25]/20 rounded-2xl p-5 lg:col-span-2">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#ABDB25]">Distribuição por Role</h2>
              <span className="text-xs text-white/60">Atualiza ao recarregar/editar</span>
            </div>
            <div className="mt-4">
              <SimpleBarChart categories={roleCategories} />
            </div>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-md border border-[#ABDB25]/20 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-[#ABDB25]">Ações Rápidas</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  const el = document.getElementById('admin-users-table');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="py-3 px-4 bg-[#ABDB25] text-black font-bold rounded-xl hover:bg-white hover:shadow-lg transition-all"
              >
                Gerenciar Usuários
              </button>

              <button
                onClick={() => fetchUsers(adminToken)}
                className="py-3 px-4 bg-gray-800/50 hover:bg-gray-800 text-white font-bold rounded-xl border border-gray-700 hover:border-gray-600 transition-all"
              >
                Atualizar Dados
              </button>

              <div className="text-xs text-white/60">
                Dica: use Editar para mudar role (user/admin) e Delete para remover contas.
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div
          id="admin-users-table"
          className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-[#ABDB25]/20 overflow-hidden"
        >
          <div className="p-5 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-bold text-[#ABDB25]">Usuários</h2>
            <span className="text-xs text-white/60">Total: {stats.total}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800/50">
                  <th className="p-4 text-left font-bold text-[#ABDB25]">ID</th>
                  <th className="p-4 text-left font-bold text-[#ABDB25]">Email</th>
                  <th className="p-4 text-left font-bold text-[#ABDB25]">Role</th>
                  <th className="p-4 text-left font-bold text-[#ABDB25]">Ações</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id_usuario}
                    className="border-t border-gray-700 hover:bg-gray-800/30 transition-all"
                  >
                    <td className="p-4 whitespace-nowrap">{user.id_usuario}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">{user.role || 'user'}</td>
                    <td className="p-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          // backend usa id_usuario em /admin/users/:id (via tabela)
                          setEditing({
                            ...user,
                            id: user.id_usuario,
                          });
                          setEditEmail(user.email);
                          setEditRole(user.role || 'user');
                        }}
                        className="mr-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(user.id_usuario)}
                        className="px-4 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-[#ABDB25]/30 rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6 text-[#ABDB25]">Editar User {editing.id_usuario}</h2>

              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl mb-4 text-white focus:border-[#ABDB25]"
              />

              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl mb-6 text-white focus:border-[#ABDB25]"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>

              <div className="flex gap-4">
                <button
                  onClick={saveEdit}
                  className="flex-1 py-3 bg-[#ABDB25] hover:bg-white hover:text-black font-bold rounded-xl transition-all"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

