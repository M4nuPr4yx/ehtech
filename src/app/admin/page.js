'use client';

import { useState, useEffect } from 'react';

export default function Admin() {
  const [adminToken, setAdminToken] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
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
    try {
      const res = await fetch(`http://localhost:3000/admin/users/${editing.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}` 
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ABDB25] to-white bg-clip-text text-transparent">
            Admin Intranet - Usuários
          </h1>
          <div>
            <span className="mr-4 text-[#ABDB25]">Admin OK</span>
            <button onClick={logout} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-xl font-bold transition-all">
              Logout
            </button>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-[#ABDB25]/20 overflow-hidden">
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
                <tr key={user.id_usuario} className="border-t border-gray-700 hover:bg-gray-800/30 transition-all">
                  <td className="p-4">{user.id_usuario}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">{user.role || 'user'}</td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        setEditing(user);
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
