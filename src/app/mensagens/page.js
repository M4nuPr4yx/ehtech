'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '../../lib/api';

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

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function MensagensPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlVendedorId = searchParams.get('vendedor');
  const urlProdutoId = searchParams.get('produto');

  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState('');

  const [referencedProduct, setReferencedProduct] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'chat'
  const messagesEndRef = useRef(null);

  // 1. Verificar autenticação
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      const nextPath = `${window.location.pathname}${window.location.search}`;
      router.replace(`/?login=1&next=${encodeURIComponent(nextPath)}`);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUser(payload);
    } catch {
      localStorage.removeItem('token');
      const nextPath = `${window.location.pathname}${window.location.search}`;
      router.replace(`/?login=1&next=${encodeURIComponent(nextPath)}`);
    }
  }, [router]);

  // 2. Carregar conversas
  const fetchConversations = useCallback(async (silent = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!silent) setLoadingConversations(true);
    try {
      const res = await fetch(getApiUrl('/mensagens/conversas'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser, fetchConversations]);

  // 3. Lidar com parâmetros de URL (iniciar conversa com vendedor/produto específico)
  useEffect(() => {
    if (!currentUser || !urlVendedorId) return;

    const targetVendedorId = parseInt(urlVendedorId, 10);
    if (isNaN(targetVendedorId) || targetVendedorId === Number(currentUser.id)) return;

    const setupPartnerFromUrl = async () => {
      try {
        const res = await fetch(getApiUrl(`/usuarios/${targetVendedorId}/publico`));
        if (res.ok) {
          const userData = await res.json();
          setActivePartner({
            id_usuario: userData.id_usuario,
            username: userData.username,
            nome: userData.nome,
            foto: userData.foto,
          });
          setMobileView('chat');
        }
      } catch (err) {
        console.error('Erro ao obter vendedor da URL:', err);
      }
    };

    setupPartnerFromUrl();

    // Se houver produto na URL, buscar detalhes para o banner
    if (urlProdutoId) {
      fetch(getApiUrl(`/produtos/${urlProdutoId}`))
        .then((res) => (res.ok ? res.json() : null))
        .then((prod) => {
          if (prod) setReferencedProduct(prod);
        })
        .catch(() => {});
    }
  }, [currentUser, urlVendedorId, urlProdutoId]);

  // 4. Carregar mensagens da conversa ativa
  const fetchMessages = useCallback(async (partnerId, silent = false) => {
    if (!partnerId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(getApiUrl(`/mensagens/${partnerId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data.mensagens) ? data.mensagens : []);
        if (data.parceiro && !activePartner?.username) {
          setActivePartner(data.parceiro);
        }

        // Marcar como lida
        fetch(getApiUrl(`/mensagens/${partnerId}/lidas`), {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }).then(() => {
          // Atualiza contadores locais
          setConversations((prev) =>
            prev.map((c) => (c.partner_id === partnerId ? { ...c, unread_count: 0 } : c))
          );
        });
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [activePartner?.username]);

  useEffect(() => {
    if (activePartner?.id_usuario || activePartner?.partner_id) {
      const partnerId = activePartner.id_usuario || activePartner.partner_id;
      fetchMessages(partnerId);
    }
  }, [activePartner, fetchMessages]);

  // 5. Polling em tempo real a cada 4 segundos
  useEffect(() => {
    if (!currentUser) return;

    const intervalId = setInterval(() => {
      fetchConversations(true);
      if (activePartner) {
        const pId = activePartner.id_usuario || activePartner.partner_id;
        if (pId) fetchMessages(pId, true);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [currentUser, activePartner, fetchConversations, fetchMessages]);

  // 6. Scroll automático para a mensagem mais recente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 7. Enviar mensagem
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending || !activePartner) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const partnerId = activePartner.id_usuario || activePartner.partner_id;
    const textToSend = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const res = await fetch(getApiUrl('/mensagens'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destinatarioId: partnerId,
          conteudo: textToSend,
          produtoId: referencedProduct ? referencedProduct.id_produto : null,
        }),
      });

      if (res.ok) {
        // Atualiza imediatamente histórico
        await fetchMessages(partnerId, true);
        await fetchConversations(true);
      } else {
        const errData = await res.json();
        setMessageFeedback(errData.mensagem || 'Erro ao enviar mensagem');
      }
    } catch (err) {
      console.error('Erro no envio:', err);
      setMessageFeedback('Erro de conexão ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const name = (c.partner_nome || c.partner_username || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="site-background min-h-screen text-white pt-10 pb-16 px-4 md:px-8">
      {messageFeedback && (
        <div className="fixed right-5 top-24 z-50 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-3 text-sm font-medium text-red-100 shadow-xl" role="alert">
          {messageFeedback}
          <button type="button" onClick={() => setMessageFeedback('')} className="ml-3 hover:text-white" aria-label="Fechar mensagem">×</button>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho da página */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#ABDB25] via-white to-gray-300 bg-clip-text text-transparent">
              Mensagens do Marketplace
            </h1>
            <p className="text-gray-400 text-sm mt-1">Converse em tempo real com compradores e vendedores.</p>
          </div>
          <Link
            href="/produtos"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-[#ABDB25] rounded-xl text-sm font-semibold text-gray-300 hover:text-[#ABDB25] transition-all"
          >
            ← Voltar à Vitrine
          </Link>
        </div>

        {/* Layout do Chat */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 h-[750px] max-h-[85vh]">
          {/* COLUNA ESQUERDA: LISTA DE CONVERSAS */}
          <div
            className={`md:col-span-4 border-r border-gray-800 flex flex-col h-full bg-[#0a0d0e]/70 ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Barra de Busca */}
            <div className="p-4 border-b border-gray-800/80">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar conversa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/60 border border-gray-700/80 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ABDB25] transition-all"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 absolute left-3.5 top-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Lista de Conversas */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-800/40">
              {loadingConversations && conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Carregando conversas...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-base font-semibold text-gray-400 mb-1">Nenhuma conversa encontrada</p>
                  <p className="text-xs">Inicie um bate-papo através do perfil de um vendedor ou anúncio.</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const partnerId = conv.partner_id;
                  const isActive = (activePartner?.id_usuario || activePartner?.partner_id) === partnerId;

                  return (
                    <button
                      key={partnerId}
                      onClick={() => {
                        setActivePartner({
                          id_usuario: conv.partner_id,
                          username: conv.partner_username,
                          nome: conv.partner_nome,
                          foto: conv.partner_foto,
                        });
                        setMobileView('chat');
                      }}
                      className={`w-full p-4 flex items-center gap-3 text-left transition-all hover:bg-gray-800/40 ${
                        isActive ? 'bg-[#ABDB25]/10 border-l-4 border-[#ABDB25]' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {conv.partner_foto && isValidImageUrl(conv.partner_foto) ? (
                          <img
                            src={conv.partner_foto}
                            alt={conv.partner_username}
                            className="w-12 h-12 rounded-full object-cover border border-gray-700 bg-gray-800"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#ABDB25] flex items-center justify-center text-black font-bold text-lg">
                            {conv.partner_username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 bg-[#ABDB25] text-black text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-sm text-white truncate">
                            {conv.partner_nome || conv.partner_username}
                          </h3>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {formatMessageTime(conv.last_message_date)}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-[#ABDB25] font-semibold' : 'text-gray-400'}`}>
                          {conv.last_message}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: JANELA DO CHAT */}
          <div
            className={`md:col-span-8 flex flex-col h-full bg-[#0d1012]/95 ${
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {activePartner ? (
              <>
                {/* Header do Chat */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/60 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    {/* Botão de voltar (mobile) */}
                    <button
                      onClick={() => setMobileView('list')}
                      className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                    >
                      ←
                    </button>

                    {/* Avatar do parceiro */}
                    {activePartner.foto && isValidImageUrl(activePartner.foto) ? (
                      <img
                        src={activePartner.foto}
                        alt={activePartner.username}
                        className="w-10 h-10 rounded-full object-cover border border-[#ABDB25]/60 bg-gray-800"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#ABDB25] flex items-center justify-center text-black font-bold text-base">
                        {activePartner.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}

                    <div>
                      <h2 className="font-bold text-white text-base leading-tight">
                        {activePartner.nome || activePartner.username}
                      </h2>
                      <span className="text-xs text-[#ABDB25] font-medium">@{activePartner.username}</span>
                    </div>
                  </div>

                  <Link
                    href={`/perfil/${activePartner.id_usuario || activePartner.partner_id}`}
                    className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-[#ABDB25] rounded-xl border border-gray-700 transition-colors"
                  >
                    Ver Perfil
                  </Link>
                </div>

                {/* Banner de Contexto de Produto (se houver) */}
                {referencedProduct && (
                  <div className="px-4 py-2.5 bg-gray-900/80 border-b border-gray-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {referencedProduct.imagem && isValidImageUrl(referencedProduct.imagem) && (
                        <img
                          src={referencedProduct.imagem}
                          alt={referencedProduct.nome}
                          className="w-10 h-10 rounded-lg object-contain bg-gray-800 border border-gray-700 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Negociando produto:</p>
                        <p className="text-xs font-bold text-white truncate">{referencedProduct.nome}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#ABDB25]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(referencedProduct.preco))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Área de Mensagens (Scroll) */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm animate-pulse">
                      Carregando mensagens...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-6">
                      <div className="w-16 h-16 rounded-full bg-gray-800/80 flex items-center justify-center text-3xl mb-3">
                        💬
                      </div>
                      <p className="font-semibold text-gray-300">Inicie a conversa!</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm">
                        Envie uma mensagem para tirar dúvidas sobre produtos, entregas ou preços.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = Number(msg.remetente_id) === Number(currentUser?.id);

                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {/* Card de produto anexado (se houver na mensagem) */}
                          {msg.produto_nome && (
                            <div className="mb-1 max-w-xs text-xs bg-gray-900 border border-gray-700/80 rounded-xl p-2.5 flex items-center gap-2">
                              {msg.produto_imagem && isValidImageUrl(msg.produto_imagem) && (
                                <img
                                  src={msg.produto_imagem}
                                  alt={msg.produto_nome}
                                  className="w-8 h-8 rounded object-contain bg-gray-800"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-white truncate">{msg.produto_nome}</p>
                                {msg.produto_preco && (
                                  <p className="text-[#ABDB25] font-semibold">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(msg.produto_preco))}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Balão de Texto */}
                          <div
                            className={`max-w-[78%] md:max-w-md px-4 py-2.5 rounded-2xl shadow-md text-sm leading-relaxed whitespace-pre-wrap break-words ${
                              isMe
                                ? 'bg-[#ABDB25] text-black font-medium rounded-br-none'
                                : 'bg-gray-800/90 text-white border border-gray-700/60 rounded-bl-none'
                            }`}
                          >
                            {msg.conteudo}
                          </div>

                          {/* Hora e Status */}
                          <div className="flex items-center gap-1 mt-1 px-1">
                            <span className="text-[10px] text-gray-500">{formatMessageTime(msg.created_at)}</span>
                            {isMe && (
                              <span className={`text-[10px] font-bold ${msg.lida ? 'text-[#ABDB25]' : 'text-gray-500'}`}>
                                {msg.lida ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Campo de Digitação */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 bg-gray-900/60 flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                    className="flex-1 p-3.5 bg-gray-800/80 border border-gray-700 rounded-2xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#ABDB25] transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3.5 bg-[#ABDB25] hover:bg-white text-black font-bold rounded-2xl shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                  >
                    {sending ? (
                      <span className="text-xs">Enviando...</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
                <div className="w-20 h-20 rounded-full bg-gray-800/40 border border-gray-700 flex items-center justify-center text-4xl mb-4">
                  💬
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Suas Conversas</h3>
                <p className="text-sm text-gray-400 max-w-md mb-6">
                  Selecione uma conversa na lista à esquerda ou visite um produto para falar com o vendedor.
                </p>
                <Link
                  href="/produtos"
                  className="px-6 py-3 bg-[#ABDB25] text-black font-bold rounded-xl hover:bg-white transition-all shadow-lg text-sm"
                >
                  Explorar Vitrine
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
