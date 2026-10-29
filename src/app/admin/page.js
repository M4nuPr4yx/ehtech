'use client';
import AdminLogin from './AdminLogin.js';

import { apiResponse } from '../../lib/api-request.js';


import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';

async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(response.ok ? 'Resposta inválida do servidor' : `Servidor indisponível (${response.status})`);
  }
  return response.json();
}

function formatPercent(value, total) {
  if (!total || total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('data:image/')
  );
};

/**
 * Gráfico simples de barras
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
              <div className="mt-3 text-xs text-foreground text-center truncate">{c.label}</div>
              <div className="mt-1 text-sm text-foreground font-bold text-center">{c.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Admin() {
  const [adminToken, setAdminToken] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  useEffect(() => {
    const expired = () => { setAdminToken(null); setIsCheckingSession(false); };
    window.addEventListener('ehtech:admin-session-expired', expired);
    return () => window.removeEventListener('ehtech:admin-session-expired', expired);
  }, []);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'produtos', 'usuarios'

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');

  // Edição de Usuário
  const [editingUser, setEditingUser] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  // Edição de Produto
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProdNome, setEditProdNome] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdPreco, setEditProdPreco] = useState('');
  const [editProdEstoque, setEditProdEstoque] = useState('');
  const [editProdCategoria, setEditProdCategoria] = useState('');
  const [editProdStatus, setEditProdStatus] = useState('');
  const [editProdImagem, setEditProdImagem] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Filtros de Produtos
  const [productSearch, setProductSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todas');

  // Filtros de Usuários
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    let active = true;
    let revision = 0;
    const restoreSession = async () => {
      const requestRevision = ++revision;
      localStorage.removeItem('adminToken');
      const userToken = localStorage.getItem('token');
      const token = userToken || sessionStorage.getItem('adminToken');
      if (userToken) sessionStorage.removeItem('adminToken');
      if (!token) {
        if (active) setIsCheckingSession(false);
        return;
      }

      try {
        const sessionResponse = await apiResponse('/admin/sessao', {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
        });
        if (!sessionResponse.ok) throw new Error(sessionResponse.status === 403 ? 'Acesso restrito a contas com cargo admin ou sessão expirada.' : 'Sua sessão expirou. Entre novamente.');
        const session = await readApiResponse(sessionResponse);
        if (session.role !== 'admin') throw new Error('Acesso restrito a administradores');

        const [usersResponse, productsResponse] = await Promise.all([
          apiResponse('/admin/users', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
          apiResponse('/admin/produtos', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        ]);
        if (!usersResponse.ok || !productsResponse.ok) throw new Error('Não foi possível restaurar a sessão');
        const [usersData, productsData] = await Promise.all([readApiResponse(usersResponse), readApiResponse(productsResponse)]);
        if (active && requestRevision === revision) {
          sessionStorage.setItem('adminToken', token);
          setAdminToken(token);
          setUsers(Array.isArray(usersData) ? usersData : []);
          setProducts(Array.isArray(productsData) ? productsData : []);
        }
      } catch (error) {
        if (active && requestRevision === revision) {
          sessionStorage.removeItem('adminToken');
          setFeedback(error.message);
        }
      } finally {
        if (active && requestRevision === revision) setIsCheckingSession(false);
      }
    };

    restoreSession();
    const handleAuthChange = event => {
      if (event.type === 'storage' && event.key !== 'token' && event.key !== null) return;
      setAdminToken(null);
      setUsers([]);
      setProducts([]);
      setIsCheckingSession(true);
      restoreSession();
    };
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('ehtech:auth-change', handleAuthChange);
    return () => {
      active = false;
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('ehtech:auth-change', handleAuthChange);
    };
  }, []);

  const loginAdmin = async () => {
    setIsLoggingIn(true);
    setFeedback('');
    try {
      const res = await apiResponse('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, senha: loginSenha }),
      });
      const data = await readApiResponse(res);
      if (res.ok && data.token) {
        sessionStorage.setItem('adminToken', data.token);
        setAdminToken(data.token);
        setLoginSenha('');
        await Promise.all([fetchUsers(data.token), fetchProducts(data.token)]);
      } else {
        setFeedback(data.mensagem || 'Credenciais inválidas');
      }
    } catch (error) {
      setFeedback(error.message || 'Não foi possível conectar ao servidor da intranet.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  async function fetchUsers(token) {
    try {
      const res = await apiResponse('/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(res);
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem('adminToken');
        setAdminToken(null);
        setFeedback('Sua sessão administrativa expirou. Entre novamente.');
        return;
      }
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      console.error('Erro ao listar usuários');
    }
  }

  const fetchProducts = async (token) => {
    try {
      const res = await apiResponse('/admin/produtos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(res);
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem('adminToken');
        setAdminToken(null);
        setFeedback('Sua sessão administrativa expirou. Entre novamente.');
        return;
      }
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      console.error('Erro ao listar produtos');
    }
  };

  const updateProductApproval = async (id, status) => {
    try {
      const res = await apiResponse(`/admin/produtos/${id}/aprovacao`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem);
      fetchProducts(adminToken);
      setSelectedProduct(null);
    } catch (error) {
      setFeedback(error.message || 'Erro ao atualizar aprovação');
    }
  };

  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    setEditProdNome(prod.nome || '');
    setEditProdDesc(prod.descricao || '');
    setEditProdPreco(prod.preco || '');
    setEditProdEstoque(prod.estoque !== undefined ? String(prod.estoque) : '0');
    setEditProdCategoria(prod.categoria || '');
    setEditProdStatus(prod.status_aprovacao || 'pendente');
    setEditProdImagem(prod.imagem || '');
  };

  const saveProductEdit = async (e) => {
    e?.preventDefault();
    if (!editingProduct) return;

    setSavingProduct(true);
    try {
      const res = await apiResponse(`/produtos/${editingProduct.id_produto}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nome: editProdNome,
          descricao: editProdDesc,
          preco: parseFloat(editProdPreco) || 0,
          estoque: parseInt(editProdEstoque, 10) || 0,
          categoria: editProdCategoria,
          status_aprovacao: editProdStatus,
          imagem: editProdImagem,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback('Produto atualizado com sucesso!');
        setEditingProduct(null);
        fetchProducts(adminToken);
      } else {
        setFeedback(data.mensagem || 'Erro ao salvar produto');
      }
    } catch (err) {
      console.error(err);
      setFeedback('Erro ao atualizar produto');
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${nome}"?`)) return;

    try {
      const res = await apiResponse(`/produtos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data.mensagem || 'Produto excluído!');
        fetchProducts(adminToken);
      } else {
        setFeedback(data.mensagem || 'Erro ao excluir');
      }
    } catch {
      setFeedback('Erro de conexão ao excluir produto');
    }
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;

    try {
      const res = await apiResponse(`/admin/users/${editingUser.id_usuario}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ email: editEmail, role: editRole }),
      });
      const data = await res.json();
      setFeedback(data.mensagem || 'Usuário atualizado.');
      if (res.ok) {
        fetchUsers(adminToken);
        setEditingUser(null);
      }
    } catch {
      setFeedback('Erro ao atualizar usuário');
    }
  };

  const deleteUser = async (id, email) => {
    if (!confirm(`Deletar o usuário ${email}?`)) return;
    try {
      const res = await apiResponse(`/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setFeedback(data.mensagem || 'Usuário excluído.');
      if (res.ok) {
        fetchUsers(adminToken);
      }
    } catch {
      setFeedback('Erro ao deletar usuário');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('adminToken');
    if (localStorage.getItem('token') === adminToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('userUsername');
      localStorage.removeItem('userFoto');
      window.dispatchEvent(new Event('ehtech:auth-change'));
    }
    setAdminToken(null);
    setUsers([]);
    setProducts([]);
    setFeedback('');
  };

  // Estatísticas
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const admins = users.filter((u) => (u.role || '').toLowerCase() === 'admin').length;
    const regularUsers = totalUsers - admins;

    const totalProducts = products.length;
    const approvedProducts = products.filter((p) => p.status_aprovacao === 'aprovado').length;
    const pendingProducts = products.filter((p) => p.status_aprovacao === 'pendente').length;
    const rejectedProducts = products.filter((p) => p.status_aprovacao === 'reprovado').length;

    return {
      totalUsers,
      admins,
      regularUsers,
      totalProducts,
      approvedProducts,
      pendingProducts,
      rejectedProducts,
      adminShareLabel: totalUsers ? formatPercent(admins, totalUsers) : '0%',
    };
  }, [users, products]);

  const roleCategories = useMemo(() => {
    return [
      { label: 'Admin', value: stats.admins, colorClass: 'bg-accent-fill' },
      { label: 'User', value: stats.regularUsers, colorClass: 'bg-info-soft' },
    ];
  }, [stats]);

  const productStatusCategories = useMemo(() => {
    return [
      { label: 'Aprovados', value: stats.approvedProducts, colorClass: 'bg-success-soft' },
      { label: 'Pendentes', value: stats.pendingProducts, colorClass: 'bg-warning-soft' },
      { label: 'Reprovados', value: stats.rejectedProducts, colorClass: 'bg-danger-soft' },
    ];
  }, [stats]);

  // Filtro de produtos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        (p.nome || '').toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.vendedor || '').toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.descricao || '').toLowerCase().includes(productSearch.toLowerCase());

      const matchStatus = statusFilter === 'todos' || p.status_aprovacao === statusFilter;
      const matchCategory = categoryFilter === 'todas' || (p.categoria || '').toLowerCase() === categoryFilter.toLowerCase();

      return matchSearch && matchStatus && matchCategory;
    });
  }, [products, productSearch, statusFilter, categoryFilter]);

  // Filtro de usuários
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = userSearch.toLowerCase();
      return (
        (u.email || '').toLowerCase().includes(query) ||
        (u.username || '').toLowerCase().includes(query) ||
        (u.role || '').toLowerCase().includes(query)
      );
    });
  }, [users, userSearch]);

  if (isCheckingSession) {
    return <div className="site-background min-h-screen" />;
  }

  if (!adminToken) {
    return (
      <AdminLogin feedback={feedback} loginAdmin={loginAdmin} loginEmail={loginEmail} setLoginEmail={setLoginEmail} loginSenha={loginSenha} setLoginSenha={setLoginSenha} isLoggingIn={isLoggingIn} />
    );
  }

  return (
    <div className="site-background min-h-screen text-foreground p-4 md:p-8">
      {feedback && (
        <div className="fixed right-5 top-5 z-[100] rounded-xl border border-accent bg-surface px-4 py-3 text-sm text-foreground shadow-xl" role="status">
          {feedback}
          <button type="button" onClick={() => setFeedback('')} className="ml-3 text-accent hover:text-foreground" aria-label="Fechar mensagem">×</button>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho Admin */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 pb-6 border-b border-line">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">
              EHtech Admin Portal
            </h1>
            <p className="text-muted text-sm mt-1">Gerencie produtos, moderação de anúncios e usuários com total controle.</p>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/admin/servicos" className="px-4 py-2 bg-surface border border-line text-muted rounded-xl text-sm font-semibold">Moderar serviços</Link>
            <Link href="/admin/componentes" className="px-4 py-2 bg-surface border border-line hover:border-accent text-muted rounded-xl text-sm font-semibold">Catálogo técnico</Link>
            <Link
              href="/"
              className="px-4 py-2 bg-surface border border-line hover:border-accent text-muted hover:text-accent rounded-xl text-sm font-semibold transition-all"
            >
              Vitrine Pública
            </Link>
            <button
              onClick={logout}
              className="px-5 py-2 bg-danger-soft hover:bg-danger-soft text-danger rounded-xl font-bold text-sm transition-all shadow-lg"
            >
              Encerrar Sessão
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex flex-wrap gap-2 mb-8 bg-surface p-1.5 rounded-2xl border border-line max-w-xl">
          <button
            aria-pressed={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-accent-fill text-accent-contrast shadow-lg shadow-transparent'
                : 'text-muted hover:text-foreground'
            }`}
          >
            📊 Visão Geral
          </button>
          <button
            aria-pressed={activeTab === 'produtos'} onClick={() => setActiveTab('produtos')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'produtos'
                ? 'bg-accent-fill text-accent-contrast shadow-lg shadow-transparent'
                : 'text-muted hover:text-foreground'
            }`}
          >
            📦 Produtos ({products.length})
            {stats.pendingProducts > 0 && (
              <span className="bg-warning-soft text-warning text-xs px-1.5 py-0.2 rounded-full font-extrabold">
                {stats.pendingProducts}
              </span>
            )}
          </button>
          <button
            aria-pressed={activeTab === 'usuarios'} onClick={() => setActiveTab('usuarios')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'usuarios'
                ? 'bg-accent-fill text-accent-contrast shadow-lg shadow-transparent'
                : 'text-muted hover:text-foreground'
            }`}
          >
            👥 Usuários ({users.length})
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: DASHBOARD / VISÃO GERAL */}
        {/* ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface border border-line rounded-3xl p-6 shadow-xl">
                <div className="text-muted text-xs uppercase tracking-wider font-semibold">Total de Produtos</div>
                <div className="mt-2 text-3xl font-extrabold text-foreground">{stats.totalProducts}</div>
                <div className="mt-3 text-xs text-success font-medium">
                  {stats.approvedProducts} aprovados na vitrine
                </div>
              </div>

              <div className="bg-surface border border-warning rounded-3xl p-6 shadow-xl">
                <div className="text-warning text-xs uppercase tracking-wider font-semibold">Aguardando Moderação</div>
                <div className="mt-2 text-3xl font-extrabold text-warning">{stats.pendingProducts}</div>
                <div className="mt-3 text-xs text-muted">Produtos pendentes de aprovação</div>
              </div>

              <div className="bg-surface border border-line rounded-3xl p-6 shadow-xl">
                <div className="text-muted text-xs uppercase tracking-wider font-semibold">Usuários Cadastrados</div>
                <div className="mt-2 text-3xl font-extrabold text-foreground">{stats.totalUsers}</div>
                <div className="mt-3 text-xs text-accent font-medium">{stats.admins} administradores</div>
              </div>

              <div className="bg-surface border border-danger rounded-3xl p-6 shadow-xl">
                <div className="text-danger text-xs uppercase tracking-wider font-semibold">Anúncios Reprovados</div>
                <div className="mt-2 text-3xl font-extrabold text-danger">{stats.rejectedProducts}</div>
                <div className="mt-3 text-xs text-muted">Necessitam de revisão pelo vendedor</div>
              </div>
            </div>

            {/* Gráficos e Ações Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface border border-line rounded-3xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-foreground mb-4">Status dos Anúncios</h2>
                <SimpleBarChart categories={productStatusCategories} />
              </div>

              <div className="bg-surface border border-line rounded-3xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-foreground mb-4">Distribuição de Usuários</h2>
                <SimpleBarChart categories={roleCategories} />
              </div>
            </div>

            {/* Seção de Pendentes Rápidos */}
            {stats.pendingProducts > 0 && (
              <div className="bg-surface border border-warning rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-warning flex items-center gap-2">
                    ⚠️ Produtos Pendentes de Aprovação ({stats.pendingProducts})
                  </h2>
                  <button
                    aria-pressed={activeTab === 'produtos'} onClick={() => setActiveTab('produtos')}
                    className="text-xs text-accent font-bold hover:underline"
                  >
                    Ver todos os produtos →
                  </button>
                </div>

                <div className="divide-y divide-line">
                  {products
                    .filter((p) => p.status_aprovacao === 'pendente')
                    .map((p) => (
                      <div key={p.id_produto} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {p.imagem && isValidImageUrl(p.imagem) ? (
                            <img src={p.imagem} alt={p.nome} className="w-12 h-12 rounded-xl object-contain bg-surface-raised" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-surface-raised flex items-center justify-center text-xs text-muted">Sem foto</div>
                          )}
                          <div>
                            <h3 className="font-bold text-foreground">{p.nome}</h3>
                            <p className="text-xs text-muted">Vendedor: {p.vendedor} · {formatBRL(p.preco)}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => updateProductApproval(p.id_produto, 'aprovado')}
                            className="px-4 py-2 bg-accent-fill hover:brightness-110 text-accent-contrast font-bold text-xs rounded-xl transition-all"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => updateProductApproval(p.id_produto, 'reprovado')}
                            className="px-4 py-2 bg-danger-soft hover:bg-danger-soft text-danger font-bold text-xs rounded-xl transition-all"
                          >
                            Reprovar
                          </button>
                          <button
                            onClick={() => openEditProduct(p)}
                            className="px-4 py-2 bg-surface-raised hover:bg-surface text-muted text-xs font-semibold rounded-xl border border-line"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: GERENCIAMENTO COMPLETO DE PRODUTOS */}
        {/* ======================================================== */}
        {activeTab === 'produtos' && (
          <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Controle Completo de Produtos</h2>
                <p className="text-muted text-xs mt-1">Visualize, filtre, edite preços, estoque, fotos e status de qualquer anúncio.</p>
              </div>

              <button
                onClick={() => fetchProducts(adminToken)}
                className="px-4 py-2 bg-surface-raised hover:bg-surface text-foreground text-xs font-bold rounded-xl border border-line transition-all flex items-center gap-2"
              >
                🔄 Atualizar Lista
              </button>
            </div>

            {/* Filtros e Busca */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Buscar por nome, vendedor, descrição..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="p-3.5 bg-surface-raised border border-line rounded-2xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-3.5 bg-surface-raised border border-line rounded-2xl text-sm text-foreground focus:outline-none focus:border-accent"
              >
                <option value="todos">Todos os Status</option>
                <option value="aprovado">Apenas Aprovados</option>
                <option value="pendente">Apenas Pendentes</option>
                <option value="reprovado">Apenas Reprovados</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-3.5 bg-surface-raised border border-line rounded-2xl text-sm text-foreground focus:outline-none focus:border-accent"
              >
                <option value="todas">Todas as Categorias</option>
                <option value="computadores">Computadores</option>
                <option value="celulares">Celulares</option>
                <option value="acessorios">Acessórios</option>
                <option value="games">Games</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            {/* Tabela de Produtos */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted">
                <thead className="bg-surface-raised text-xs uppercase text-accent font-bold">
                  <tr>
                    <th className="p-4 rounded-l-2xl">Produto</th>
                    <th className="p-4">Vendedor</th>
                    <th className="p-4">Preço</th>
                    <th className="p-4">Estoque</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 rounded-r-2xl text-center">Ações de Controle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted">
                        Nenhum produto corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const statusColor =
                        p.status_aprovacao === 'aprovado'
                          ? 'bg-success-soft text-success border-success'
                          : p.status_aprovacao === 'pendente'
                          ? 'bg-warning-soft text-warning border-warning'
                          : 'bg-danger-soft text-danger border-danger';

                      return (
                        <tr key={p.id_produto} className="hover:bg-surface-raised transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {p.imagem && isValidImageUrl(p.imagem) ? (
                                <img
                                  src={p.imagem}
                                  alt={p.nome}
                                  className="w-12 h-12 rounded-xl object-contain bg-surface-raised border border-line shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-surface-raised flex items-center justify-center text-xs text-muted shrink-0">
                                  Sem foto
                                </div>
                              )}
                              <div className="min-w-0 max-w-xs">
                                <p className="font-bold text-foreground truncate">{p.nome}</p>
                                <p className="text-xs text-muted truncate">{p.descricao}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 whitespace-nowrap text-foreground font-medium">
                            {p.vendedor} <span className="text-xs text-muted">#{p.vendedor_id}</span>
                          </td>

                          <td className="p-4 whitespace-nowrap font-bold text-accent">
                            {formatBRL(p.preco)}
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <span className={`font-semibold ${Number(p.estoque) > 0 ? 'text-foreground' : 'text-danger'}`}>
                              {p.estoque} un
                            </span>
                          </td>

                          <td className="p-4 whitespace-nowrap capitalize text-muted">
                            {p.categoria}
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border capitalize ${statusColor}`}>
                              {p.status_aprovacao || 'pendente'}
                            </span>
                          </td>

                          <td className="p-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditProduct(p)}
                                className="px-3 py-1.5 bg-info-soft hover:bg-info-soft text-info font-bold rounded-xl text-xs transition-all shadow"
                                title="Editar produto"
                              >
                                ✏️ Editar
                              </button>

                              {p.status_aprovacao !== 'aprovado' && (
                                <button
                                  onClick={() => updateProductApproval(p.id_produto, 'aprovado')}
                                  className="px-3 py-1.5 bg-accent-fill hover:brightness-110 text-accent-contrast font-bold rounded-xl text-xs transition-all shadow"
                                  title="Aprovar produto"
                                >
                                  ✅
                                </button>
                              )}

                              {p.status_aprovacao !== 'reprovado' && (
                                <button
                                  onClick={() => updateProductApproval(p.id_produto, 'reprovado')}
                                  className="px-3 py-1.5 bg-warning-soft hover:bg-warning-soft text-warning font-bold rounded-xl text-xs transition-all shadow"
                                  title="Reprovar produto"
                                >
                                  ⛔
                                </button>
                              )}

                              <button
                                onClick={() => deleteProduct(p.id_produto, p.nome)}
                                className="px-3 py-1.5 bg-danger-soft hover:bg-danger-soft text-danger font-bold rounded-xl text-xs transition-all shadow"
                                title="Excluir produto"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: GERENCIAMENTO DE USUÁRIOS */}
        {/* ======================================================== */}
        {activeTab === 'usuarios' && (
          <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Controle de Usuários</h2>
                <p className="text-muted text-xs mt-1">Gerencie permissões (roles), visualize cadastros e modere contas.</p>
              </div>

              <button
                onClick={() => fetchUsers(adminToken)}
                className="px-4 py-2 bg-surface-raised hover:bg-surface text-foreground text-xs font-bold rounded-xl border border-line transition-all flex items-center gap-2"
              >
                🔄 Atualizar Lista
              </button>
            </div>

            {/* Busca de Usuários */}
            <input
              type="text"
              placeholder="Buscar por email, username ou role..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full p-3.5 bg-surface-raised border border-line rounded-2xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent"
            />

            {/* Tabela de Usuários */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted">
                <thead className="bg-surface-raised text-xs uppercase text-accent font-bold">
                  <tr>
                    <th className="p-4 rounded-l-2xl">ID</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">E-mail</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Data de Criação</th>
                    <th className="p-4 rounded-r-2xl text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id_usuario} className="hover:bg-surface-raised transition-colors">
                        <td className="p-4 font-mono text-muted">#{user.id_usuario}</td>
                        <td className="p-4 font-bold text-foreground">{user.username || '-'}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                              user.role === 'admin'
                                ? 'bg-accent-soft text-accent border border-accent'
                                : 'bg-surface-raised text-muted'
                            }`}
                          >
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted">
                          {user.data_criacao ? new Date(user.data_criacao).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setEditEmail(user.email);
                                setEditRole(user.role || 'user');
                              }}
                              className="px-3 py-1.5 bg-info-soft hover:bg-info-soft text-info font-bold rounded-xl text-xs transition-all"
                            >
                              Editar Role
                            </button>
                            <button
                              onClick={() => deleteUser(user.id_usuario, user.email)}
                              className="px-3 py-1.5 bg-danger-soft hover:bg-danger-soft text-danger font-bold rounded-xl text-xs transition-all"
                            >
                              Deletar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL DE EDIÇÃO DE PRODUTO PELO ADMIN */}
        {/* ======================================================== */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-accent bg-surface p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Editar Produto #{editingProduct.id_produto}</h2>
                  <p className="text-xs text-muted">Modifique campos técnicos, moderação e precificação como Administrador.</p>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-muted hover:text-foreground text-2xl font-bold p-1 rounded-lg"
                >
                  ×
                </button>
              </div>

              <form onSubmit={saveProductEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Título do Produto</label>
                  <input
                    type="text"
                    value={editProdNome}
                    onChange={(e) => setEditProdNome(e.target.value)}
                    required
                    className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editProdPreco}
                      onChange={(e) => setEditProdPreco(e.target.value)}
                      required
                      className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Estoque</label>
                    <input
                      type="number"
                      value={editProdEstoque}
                      onChange={(e) => setEditProdEstoque(e.target.value)}
                      required
                      className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Status de Moderação</label>
                    <select
                      value={editProdStatus}
                      onChange={(e) => setEditProdStatus(e.target.value)}
                      className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="aprovado">Aprovado</option>
                      <option value="pendente">Pendente</option>
                      <option value="reprovado">Reprovado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Categoria</label>
                  <select
                    value={editProdCategoria}
                    onChange={(e) => setEditProdCategoria(e.target.value)}
                    required
                    className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="computadores">Computadores</option>
                    <option value="celulares">Celulares</option>
                    <option value="acessorios">Acessórios</option>
                    <option value="games">Games</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">URL da Imagem</label>
                  <input
                    type="text"
                    value={editProdImagem}
                    onChange={(e) => setEditProdImagem(e.target.value)}
                    placeholder="https://... ou /uploads/..."
                    className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Descrição</label>
                  <textarea
                    value={editProdDesc}
                    onChange={(e) => setEditProdDesc(e.target.value)}
                    rows={4}
                    required
                    className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="flex-1 py-4 bg-accent-fill hover:brightness-110 text-accent-contrast font-extrabold rounded-2xl shadow-xl transition-all disabled:opacity-50"
                  >
                    {savingProduct ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-6 py-4 bg-surface-raised hover:bg-surface text-foreground font-bold rounded-2xl border border-line"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL DE EDIÇÃO DE USUÁRIO */}
        {/* ======================================================== */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-accent rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-2 text-foreground">Editar Usuário #{editingUser.id_usuario}</h2>
              <p className="text-xs text-muted mb-6">Altere e-mail ou nível de acesso.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Nível de Permissão (Role)</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full p-3.5 bg-surface-raised border border-line rounded-xl text-foreground text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="user">Usuário Comum (user)</option>
                    <option value="admin">Administrador (admin)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveUserEdit}
                    className="flex-1 py-3.5 bg-accent-fill hover:brightness-110 text-accent-contrast font-extrabold rounded-2xl shadow-xl transition-all"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="px-6 py-3.5 bg-surface-raised hover:bg-surface text-foreground font-bold rounded-2xl border border-line"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
