'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '../../lib/api';
import ImageWithFallback from '../complements/ImageWithFallback';
import { getMainImage } from '../complements/imageHelper';

const CONTRACT_STATUS = {
  solicitado: 'Solicitado', orcamento_enviado: 'Orçamento enviado', aceito: 'Aceito',
  em_execucao: 'Em execução', concluido: 'Concluído', cancelado: 'Cancelado'
};

// Helper function to validate if a string is a valid image URL or Base64
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

export default function Perfil() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('perfil');
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [userFoto, setUserFoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Form states for security tab
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [senhaConfimar, setSenhaConfirmar] = useState('');

  // User products states
  const [userProducts, setUserProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', descricao: '', preco: '', categoria: '', imagem: '' });
  const [editLoading, setEditLoading] = useState(false);
  const fileInputRefEdit = useRef(null);

  // Histórico permanente de serviços e pedidos de produtos
  const [serviceHistory, setServiceHistory] = useState([]);
  const [productOrders, setProductOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const fetchPerfil = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.replace('/?login=1&next=%2Fperfil');
        return;
      }
      const res = await fetch(getApiUrl('/perfil'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPerfil(data);
      } else {
        localStorage.removeItem('token');
        router.replace('/?login=1&next=%2Fperfil');
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch user's products
  const fetchUserProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl('/produtos/meus'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserProducts(data);
      }
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [servicesResponse, ordersResponse] = await Promise.all([
        fetch(getApiUrl('/contratacoes'), { headers, cache: 'no-store' }),
        fetch(getApiUrl('/pedidos'), { headers, cache: 'no-store' })
      ]);
      const [servicesData, ordersData] = await Promise.all([servicesResponse.json(), ordersResponse.json()]);
      if (!servicesResponse.ok) throw new Error(servicesData.mensagem || 'Não foi possível carregar os serviços.');
      if (!ordersResponse.ok) throw new Error(ordersData.mensagem || 'Não foi possível carregar os produtos.');
      setServiceHistory(Array.isArray(servicesData) ? servicesData : []);
      setProductOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      setHistoryError(error.message || 'Não foi possível carregar seu histórico.');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  // Load products when tab changes to "produtos"
  useEffect(() => {
    if (activeTab === 'produtos') {
      fetchUserProducts();
    }
    if (activeTab === 'historico') {
      fetchHistory();
    }
  }, [activeTab, fetchUserProducts, fetchHistory]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('aba') === 'historico') {
      setActiveTab('historico');
      if (params.get('pedido') === '1') {
        setMessage('Pedido registrado no seu histórico. Nenhuma cobrança foi realizada.');
        setMessageType('success');
        window.history.replaceState({}, '', '/perfil?aba=historico');
      }
    }
  }, []);

const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userUsername');
    localStorage.removeItem('userFoto');
    router.push('/');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (novaSenha.length < 7) {
      setMessage('Nova senha mínimo 7 dígitos');
      setMessageType('error');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setMessage('As senhas não coincidem');
      setMessageType('error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl('/perfil/senha'), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ senhaAtual, novaSenha })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.mensagem);
        setMessageType('success');
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');
        // Force logout after password change
        setTimeout(() => {
          handleLogout();
        }, 2000);
      } else {
        setMessage(data.mensagem);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Erro: Verifique se o servidor está respondendo');
      setMessageType('error');
    }
  };

const handleChangeEmail = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl('/perfil/email'), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ novoEmail, senha: senhaConfimar })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.mensagem);
        setMessageType('success');
        setNovoEmail('');
        setSenhaConfirmar('');
        // Force logout after email change
        setTimeout(() => {
          handleLogout();
        }, 2000);
      } else {
        setMessage(data.mensagem);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Erro: Verifique se o servidor está respondendo');
      setMessageType('error');
    }
  };

  const uploadFoto = async (file) => {
    const formData = new FormData();
    formData.append('imagem', file);

    const token = localStorage.getItem('token');
    const res = await fetch(getApiUrl('/upload/imagem'), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro no upload');
    return data.url;
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage('Por favor, selecione uma imagem');
      setMessageType('error');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('A imagem deve ter no máximo 5MB');
      setMessageType('error');
      return;
    }

    setUploadingPhoto(true);
    setMessage('');

    try {
      // Upload via FormData - salva arquivo no servidor e retorna URL
      const fotoUrl = await uploadFoto(file);

      // Enviar URL para o backend salvar no banco
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl('/perfil/foto'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ foto: fotoUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || 'Erro ao salvar foto');

      setPerfil({ ...perfil, foto: fotoUrl });
      if (fotoUrl) {
        localStorage.setItem('userFoto', fotoUrl);
      } else {
        localStorage.removeItem('userFoto');
      }
      setMessage('Foto atualizada com sucesso!');
      setMessageType('success');
    } catch (err) {
      setMessage('Erro: ' + err.message);
      setMessageType('error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl('/perfil/foto'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ foto: null })
      });
      const data = await res.json();
      if (res.ok) {
        setPerfil({ ...perfil, foto: null });
        localStorage.removeItem('userFoto');
        setMessage('Foto removida!');
        setMessageType('success');
      } else {
        setMessage(data.mensagem || 'Erro ao remover foto');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Erro: Verifique se o servidor está respondendo');
      setMessageType('error');
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <div className="text-[#ABDB25] text-xl">Carregando...</div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Data não disponível';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(Number(value) || 0);

  return (
    <div className="site-background min-h-screen text-white pt-20 pb-20">
      <div className={`${activeTab === 'historico' ? 'max-w-5xl' : 'max-w-2xl'} mx-auto px-6 transition-all`}>
        <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-[#ABDB25] mb-6"> Meu Perfil</h1>
          
{/* Tabs */}
          <div className="flex mb-6 border-b border-gray-700 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('perfil'); setMessage(''); }}
              className={`py-3 px-6 font-bold transition-all ${activeTab === 'perfil' ? 'text-[#ABDB25] border-b-2 border-[#ABDB25]' : 'text-gray-400 hover:text-white'}`}
            >
              Perfil
            </button>
            <button
              onClick={() => { setActiveTab('seguranca'); setMessage(''); }}
              className={`py-3 px-6 font-bold transition-all ${activeTab === 'seguranca' ? 'text-[#ABDB25] border-b-2 border-[#ABDB25]' : 'text-gray-400 hover:text-white'}`}
            >
              Segurança
            </button>
            <button
              onClick={() => { setActiveTab('produtos'); setMessage(''); }}
              className={`py-3 px-6 font-bold transition-all ${activeTab === 'produtos' ? 'text-[#ABDB25] border-b-2 border-[#ABDB25]' : 'text-gray-400 hover:text-white'}`}
            >
              Seus Produtos
            </button>
            <button
              onClick={() => { setActiveTab('historico'); setMessage(''); }}
              className={`py-3 px-6 whitespace-nowrap font-bold transition-all ${activeTab === 'historico' ? 'text-[#ABDB25] border-b-2 border-[#ABDB25]' : 'text-gray-400 hover:text-white'}`}
            >
              Histórico
            </button>
          </div>

{/* Tab: Perfil */}
          {activeTab === 'perfil' && perfil && (
            <div className="space-y-4">
{/* Foto de Perfil */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
{isValidImageUrl(perfil.foto) ? (
                    <img 
                      src={perfil.foto} 
                      alt="Foto de perfil" 
                      className="w-32 h-32 rounded-full object-cover object-center border-4 border-[#ABDB25]"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-700 border-4 border-[#ABDB25] flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={openFilePicker}
                    className="px-4 py-2 bg-[#ABDB25] hover:bg-white hover:text-black text-black font-bold rounded-lg text-sm transition-all"
                  >
                    Alterar Foto
                  </button>
                  {perfil.foto && (
                    <button
                      onClick={handleRemovePhoto}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-all"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4">
                <label className="text-gray-400 text-sm">E-mail</label>
                <p className="text-white text-lg font-medium">{perfil.email}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <label className="text-gray-400 text-sm">Cargo</label>
                <p className="text-white text-lg font-medium capitalize">{perfil.role}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <label className="text-gray-400 text-sm">Membro desde</label>
                <p className="text-white text-lg font-medium">{formatDate(perfil.data_criacao)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-4 mt-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
              >
                Sair da Conta
              </button>
            </div>
          )}

          {/* Tab: Segurança */}
          {activeTab === 'seguranca' && (
            <div className="space-y-8">
              {/* Alterar Senha */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Alterar Senha</h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <input
                    type="password"
                    placeholder="Senha atual"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Nova senha (mínimo 7 dígitos)"
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
                    className="w-full py-4 bg-[#ABDB25] hover:bg-white hover:text-black text-black font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all"
                  >
                    Alterar Senha
                  </button>
                </form>
              </div>

              {/* Alterar Email */}
              <div className="pt-6 border-t border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Alterar E-mail</h2>
                <form onSubmit={handleChangeEmail} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Novo e-mail"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirme sua senha"
                    value={senhaConfimar}
                    onChange={(e) => setSenhaConfirmar(e.target.value)}
                    className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#ABDB25] hover:bg-white hover:text-black text-black font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all"
                  >
                    Alterar E-mail
                  </button>
                </form>
              </div>

{message && (
                <p className={`p-3 rounded-xl text-center font-bold ${messageType === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                  {message}
                </p>
              )}
            </div>
          )}

          {/* Tab: Seus Produtos */}
          {activeTab === 'produtos' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Seus Produtos</h2>
                <Link href="/anunciar" className="px-4 py-2 bg-[#ABDB25] hover:bg-white hover:text-black text-black font-bold rounded-lg text-sm transition-all">
                  + Novo Produto
                </Link>
              </div>

              {loadingProducts ? (
                <div className="text-center py-8 text-gray-400">Carregando...</div>
              ) : userProducts.length > 0 ? (
                <div className="space-y-4">
                  {userProducts.map((produto) => (
                    <div key={produto.id_produto} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex gap-4">
                      <div className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                        {isValidImageUrl(produto.imagem) ? (
                          <img src={produto.imagem} alt={produto.nome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{produto.nome}</h3>
                        <p className="text-[#ABDB25] font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco)}</p>
                        <p className="text-gray-400 text-sm truncate">{produto.descricao}</p>
                        <p className={`mt-1 text-xs font-bold ${produto.status_aprovacao === 'aprovado' ? 'text-green-400' : produto.status_aprovacao === 'reprovado' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {produto.status_aprovacao === 'aprovado' ? 'Aprovado' : produto.status_aprovacao === 'reprovado' ? 'Não aprovado' : 'Aguardando aprovação'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link href={`/editar-produto/${produto.id_produto}`} className="px-3 py-1 bg-[#ABDB25] hover:bg-white hover:text-black text-black font-bold rounded text-sm text-center">
                          Editar
                        </Link>
                        {produto.status_aprovacao === 'aprovado' && (
                          <Link href={`/produtos/${produto.id_produto}`} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded text-sm text-center">
                            Ver
                          </Link>
                        )}
                        <button 
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja excluir este produto?')) {
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(getApiUrl(`/produtos/${produto.id_produto}`), {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (res.ok) {
                                  setMessage('Produto excluído com sucesso!');
                                  setMessageType('success');
                                  fetchUserProducts();
                                } else {
                                  setMessage('Erro ao excluir produto');
                                  setMessageType('error');
                                }
                              } catch (err) {
                                setMessage('Erro ao excluir produto');
                                setMessageType('error');
                              }
                            }
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Você ainda não tem produtos cadastrados.</p>
                  <Link href="/anunciar" className="text-[#ABDB25] hover:underline">
                    Anunciar seu primeiro produto →
                  </Link>
                </div>
              )}

              {message && (
                <p className={`mt-4 p-3 rounded-xl text-center font-bold ${messageType === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                  {message}
                </p>
              )}
            </div>
          )}

          {/* Tab: Histórico de serviços e produtos */}
          {activeTab === 'historico' && (
            <div className="space-y-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ABDB25]">Sua jornada EHtech</span><h2 className="mt-1 text-2xl font-bold text-white">Histórico de contratações</h2><p className="mt-1 text-sm text-gray-400">Registros permanecem disponíveis mesmo após a conclusão.</p></div>
                <button type="button" onClick={fetchHistory} disabled={loadingHistory} className="self-start rounded-xl border border-gray-700 px-4 py-2 text-xs font-bold text-gray-300 hover:border-[#ABDB25] hover:text-[#ABDB25] disabled:opacity-50">↻ Atualizar</button>
              </div>

              {message && <div className={`rounded-xl border px-4 py-3 text-sm ${messageType === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>{message}</div>}
              {historyError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">{historyError}</div>}

              {loadingHistory ? <div className="py-16 text-center text-gray-400">Carregando seu histórico…</div> : (
                <>
                  <section>
                    <div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-bold text-white">Serviços</h3><p className="text-xs text-gray-500">Como cliente ou prestador</p></div><span className="rounded-full bg-[#ABDB25]/10 px-3 py-1 text-xs font-bold text-[#ABDB25]">{serviceHistory.length}</span></div>
                    {serviceHistory.length ? <div className="grid gap-3 md:grid-cols-2">{serviceHistory.map((contract) => (
                      <article key={contract.id_contratacao} className="flex flex-col rounded-2xl border border-gray-700 bg-gray-800/45 p-5">
                        <div className="flex items-start justify-between gap-3"><div><span className="text-[9px] font-bold uppercase tracking-wider text-[#ABDB25]">{contract.papel === 'prestador' ? 'Você prestou' : 'Você contratou'}</span><h4 className="mt-1 font-bold text-white">{contract.servico_titulo}</h4><p className="mt-1 text-xs text-gray-500">Com {contract.papel === 'prestador' ? contract.cliente_nome : contract.prestador_nome} · #{contract.id_contratacao}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold ${contract.status === 'concluido' ? 'bg-green-500/15 text-green-300' : contract.status === 'cancelado' ? 'bg-red-500/15 text-red-300' : 'bg-blue-500/15 text-blue-300'}`}>{CONTRACT_STATUS[contract.status] || contract.status}</span></div>
                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-700/70 pt-4"><div><span className="block text-[9px] uppercase text-gray-500">Valor acordado</span><strong className="text-sm text-gray-200">{contract.valor_proposto == null ? 'Aguardando proposta' : formatCurrency(contract.valor_proposto)}</strong></div><div><span className="block text-[9px] uppercase text-gray-500">Última atualização</span><strong className="text-sm text-gray-200">{formatDate(contract.updated_at)}</strong></div></div>
                        {contract.garantia_codigo && <div className="mt-3 rounded-xl border border-[#ABDB25]/25 bg-[#ABDB25]/5 p-3"><span className="block text-[9px] font-bold uppercase text-[#ABDB25]">Garantia registrada</span><strong className="font-mono text-xs text-gray-200">{contract.garantia_codigo}</strong><p className="mt-1 text-[10px] text-gray-500">Válida até {formatDate(contract.garantia_fim_em)}</p></div>}
                        <Link href="/contratacoes" className="mt-auto pt-4 text-xs font-bold text-[#ABDB25] hover:underline">Ver detalhes e ações →</Link>
                      </article>
                    ))}</div> : <div className="rounded-2xl border border-dashed border-gray-700 p-8 text-center"><p className="text-sm text-gray-400">Você ainda não possui serviços no histórico.</p><Link href="/servicos" className="mt-2 inline-block text-sm font-bold text-[#ABDB25] hover:underline">Explorar serviços →</Link></div>}
                  </section>

                  <section>
                    <div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-bold text-white">Pedidos de produtos</h3><p className="text-xs text-gray-500">Registro dos itens solicitados aos vendedores</p></div><span className="rounded-full bg-[#ABDB25]/10 px-3 py-1 text-xs font-bold text-[#ABDB25]">{productOrders.length}</span></div>
                    {productOrders.length ? <div className="space-y-4">{productOrders.map((order) => (
                      <article key={order.id_pedido} className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800/45">
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 px-5 py-4"><div><span className="text-[9px] uppercase tracking-wider text-gray-500">Pedido #{order.id_pedido}</span><p className="mt-1 text-xs text-gray-400">Registrado em {formatDate(order.created_at)}</p></div><div className="text-right"><span className="block rounded-full bg-blue-500/15 px-2.5 py-1 text-[9px] font-bold text-blue-300">Pedido registrado</span><strong className="mt-1 block text-lg text-[#ABDB25]">{formatCurrency(order.total)}</strong></div></header>
                        <div className="divide-y divide-gray-700/70">{order.itens.map((item) => (
                          <div key={item.id_item} className="flex items-center gap-4 p-4"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-700"><ImageWithFallback src={getMainImage(item.imagem)} alt={item.nome_produto} className="h-full w-full object-cover" sizes="56px" /></div><div className="min-w-0 flex-1"><Link href={`/produtos/${item.produto_id}`} className="block truncate text-sm font-bold text-white hover:text-[#ABDB25]">{item.nome_produto}</Link><p className="truncate text-xs text-gray-500">Vendedor: {item.vendedor_nome}</p></div><div className="text-right"><span className="block text-xs text-gray-500">{item.quantidade} × {formatCurrency(item.preco_unitario)}</span><strong className="text-sm text-gray-200">{formatCurrency(item.quantidade * item.preco_unitario)}</strong></div></div>
                        ))}</div>
                        <footer className="border-t border-gray-700 bg-gray-900/35 px-5 py-3 text-[10px] text-gray-500">Este registro não representa pagamento. Combine entrega e pagamento diretamente com o vendedor.</footer>
                      </article>
                    ))}</div> : <div className="rounded-2xl border border-dashed border-gray-700 p-8 text-center"><p className="text-sm text-gray-400">Nenhum pedido de produto foi registrado.</p><Link href="/produtos" className="mt-2 inline-block text-sm font-bold text-[#ABDB25] hover:underline">Explorar produtos →</Link></div>}
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
