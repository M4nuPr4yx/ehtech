'use client';
import { apiResponse, apiRequest } from '../../lib/api-request.js';
import LoadingState from '../complements/LoadingState';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import UserSearch from '../complements/UserSearch';
import { ConversationSafety, ReportControl } from '../complements/TrustControls';
import { isValidImageUrl } from '../complements/imageHelper';

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

function MensagensContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlVendedorId = searchParams.get('usuario') || searchParams.get('vendedor');
  const urlProdutoId = searchParams.get('produto');

  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [findingPeople, setFindingPeople] = useState(false);

  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState('');

  const [referencedProduct, setReferencedProduct] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'chat'
  const messagesEndRef = useRef(null);
  const activePartnerRef = useRef(null);
  const messagesRequestRef = useRef(0);
  const partnerRevisionRef = useRef(0);
  const cursorRef = useRef({ oldest: null, latest: null });
  const messageRequest = useRef(null);
  const conversationRequest = useRef(null);
  const messageList = useRef(null);
  const restoreScroll = useRef(null);
  const scrollToLatest = useRef(true);

  function openConversation(user) {
    messageRequest.current?.abort(); cursorRef.current = { oldest: null, latest: null }; setHasOlder(false);
    const id = Number(user.id_usuario);
    activePartnerRef.current = id;
    partnerRevisionRef.current += 1;
    messagesRequestRef.current += 1;
    setActivePartner({ ...user, id_usuario: id });
    setMessages([]); setNewMessage(''); setMessageFeedback(''); setReferencedProduct(null);
    setFindingPeople(false); setMobileView('chat'); setLoadingMessages(true);
    router.replace(`/mensagens?usuario=${id}`, { scroll: false });
  }

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

    if (silent && conversationRequest.current) return;
    conversationRequest.current?.abort();
    const controller = new AbortController(); conversationRequest.current = controller;
    if (!silent) setLoadingConversations(true);
    try {
      const res = await apiResponse('/mensagens/conversas', {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (!controller.signal.aborted) setConversations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    } finally {
      if (conversationRequest.current === controller) conversationRequest.current = null;
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

    const targetVendedorId = Number(urlVendedorId);
    if (!Number.isSafeInteger(targetVendedorId) || targetVendedorId <= 0 || targetVendedorId === Number(currentUser.id)) return;
    if (activePartnerRef.current === targetVendedorId && !urlProdutoId) return;
    const controller = new AbortController();

    const setupPartnerFromUrl = async () => {
      const revision = ++partnerRevisionRef.current;
      messageRequest.current?.abort(); cursorRef.current = { oldest: null, latest: null }; setHasOlder(false);
      activePartnerRef.current = targetVendedorId;
      messagesRequestRef.current += 1;
      setActivePartner(null); setMessages([]); setReferencedProduct(null); setNewMessage(''); setMessageFeedback('');
      try {
        const res = await apiResponse(`/usuarios/${targetVendedorId}/publico`, { signal: controller.signal });
        if (!res.ok) throw new Error('Usuário não encontrado. Busque outra pessoa para conversar.');
        if (res.ok) {
          const userData = await res.json();
          if (controller.signal.aborted || activePartnerRef.current !== targetVendedorId || partnerRevisionRef.current !== revision) return;
          setActivePartner({
            id_usuario: userData.id_usuario,
            username: userData.username,
            nome: userData.nome,
            foto: userData.foto,
          });
          setMobileView('chat'); setFindingPeople(false);
          if (urlProdutoId) {
            const productResponse = await apiResponse(`/produtos/${urlProdutoId}`, { signal: controller.signal });
            const product = productResponse.ok ? await productResponse.json() : null;
            if (!controller.signal.aborted && activePartnerRef.current === targetVendedorId && partnerRevisionRef.current === revision && Number(product?.vendedor_id) === targetVendedorId) setReferencedProduct(product);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted && activePartnerRef.current === targetVendedorId && partnerRevisionRef.current === revision) setMessageFeedback(err.message);
      }
    };

    setupPartnerFromUrl();

    return () => controller.abort();
  }, [currentUser, urlVendedorId, urlProdutoId]);

  // 4. Carregar mensagens da conversa ativa
  const fetchMessages = useCallback(async (partnerId, silent = false, older = false) => {
    if (!partnerId) return;
    const token = localStorage.getItem('token');
    if (!token || (silent && messageRequest.current)) return;
    messageRequest.current?.abort();
    const controller = new AbortController(); messageRequest.current = controller;
    const requestId = ++messagesRequestRef.current;
    const query = new URLSearchParams({ limit: '40' });
    if (older && cursorRef.current.oldest) query.set('antes', cursorRef.current.oldest);
    else if (silent && cursorRef.current.latest) query.set('depois', cursorRef.current.latest);
    if (older) { setLoadingOlder(true); const list = messageList.current; if (list) restoreScroll.current = { height: list.scrollHeight, top: list.scrollTop }; }
    else if (!silent) setLoadingMessages(true);
    const list = messageList.current;
    scrollToLatest.current = !older && (!silent || !list || list.scrollHeight - list.scrollTop - list.clientHeight < 100);
    try {
      const data = await apiRequest('/mensagens/' + partnerId + '?' + query, { signal: controller.signal, headers: { Authorization: 'Bearer ' + token } });
      if (controller.signal.aborted || activePartnerRef.current !== Number(partnerId) || requestId !== messagesRequestRef.current) return;
      const received = Array.isArray(data.mensagens) ? data.mensagens : [];
      if (!silent || older) setHasOlder(Boolean(data.paginacao?.tem_anteriores));
      if (received.length) {
        if (!cursorRef.current.oldest || older) cursorRef.current.oldest = received[0].id;
        if (!older) cursorRef.current.latest = received.at(-1).id;
        setMessages(previous => {
          const merged = new Map((silent || older ? previous : []).map(item => [item.id, item]));
          received.forEach(item => merged.set(item.id, item));
          return [...merged.values()].sort((a, b) => Number(a.id) - Number(b.id)).map(item => Number(item.destinatario_id) === Number(partnerId) && Number(item.id) <= data.lidas_ate ? { ...item, lida: true } : item);
        });
      } else if (!silent && !older) setMessages([]);
      else if (data.lidas_ate) setMessages(previous => previous.some(item => !item.lida && Number(item.destinatario_id) === Number(partnerId) && Number(item.id) <= data.lidas_ate) ? previous.map(item => Number(item.destinatario_id) === Number(partnerId) && Number(item.id) <= data.lidas_ate ? { ...item, lida: true } : item) : previous);
      if (received.some(message => !message.lida && Number(message.remetente_id) === Number(partnerId))) {
        apiRequest('/mensagens/' + partnerId + '/lidas', { method: 'PUT', signal: controller.signal, json: { ate_id: received.at(-1).id }, headers: { Authorization: 'Bearer ' + token } }).then(() => {
          setConversations(previous => previous.map(item => Number(item.partner_id) === Number(partnerId) ? { ...item, unread_count: 0 } : item));
        }).catch(() => {});
      }
    } catch (error) {
      if (!controller.signal.aborted && activePartnerRef.current === Number(partnerId)) setMessageFeedback(error.message);
    } finally {
      if (messageRequest.current === controller) messageRequest.current = null;
      if (activePartnerRef.current === Number(partnerId) && requestId === messagesRequestRef.current) { setLoadingMessages(false); setLoadingOlder(false); }
    }
  }, []);

  useEffect(() => {
    if (activePartner?.id_usuario) fetchMessages(activePartner.id_usuario);
    return () => { messageRequest.current?.abort(); messageRequest.current = null; };
  }, [activePartner, fetchMessages]);

  useEffect(() => {
    if (!currentUser) return;
    let cycle = 0;
    const update = (force = false) => {
      if (document.visibilityState === 'hidden') return;
      if (force || !activePartner || cycle++ % 3 === 0) fetchConversations(true);
      if (activePartner?.id_usuario) fetchMessages(activePartner.id_usuario, true);
    };
    const visible = () => update(true);
    const interval = setInterval(update, 8000);
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visible); conversationRequest.current?.abort(); };
  }, [currentUser, activePartner, fetchConversations, fetchMessages]);

  useEffect(() => {
    const list = messageList.current;
    if (!list) return;
    if (restoreScroll.current) { const prior = restoreScroll.current; list.scrollTop = prior.top + list.scrollHeight - prior.height; restoreScroll.current = null; }
    else if (scrollToLatest.current) list.scrollTop = list.scrollHeight;
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
      const res = await apiResponse('/mensagens', {
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
        if (activePartnerRef.current === Number(partnerId)) await fetchMessages(partnerId, true);
        await fetchConversations(true);
      } else {
        const errData = await res.json();
        throw new Error(errData.mensagem || 'Erro ao enviar mensagem');
      }
    } catch (err) {
      if (activePartnerRef.current === Number(partnerId)) {
        setMessageFeedback(err.message || 'Erro de conexão ao enviar mensagem');
        setNewMessage(current => current || textToSend);
      }
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const name = `${c.partner_nome || ''} ${c.partner_username || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="site-background min-h-screen text-foreground pt-10 pb-16 px-4 md:px-8">
      {messageFeedback && (
        <div className="fixed right-5 top-24 z-50 rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger shadow-xl" role="alert">
          {messageFeedback}
          <button type="button" onClick={() => setMessageFeedback('')} className="ml-3 hover:text-foreground" aria-label="Fechar mensagem">×</button>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho da página */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">
              Mensagens
            </h1>
            <p className="text-muted text-sm mt-1">Encontre pessoas e converse, com ou sem anúncio.</p>
          </div>
          <Link
            href="/produtos"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-surface border border-line hover:border-accent rounded-xl text-sm font-semibold text-muted hover:text-accent transition-all"
          >
            Explorar produtos
          </Link>
        </div>

        {/* Layout do Chat */}
        <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 h-[660px] max-h-[78vh]">
          {/* COLUNA ESQUERDA: LISTA DE CONVERSAS */}
          <div
            className={`md:col-span-4 border-r border-line flex flex-col h-full bg-surface ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Barra de Busca */}
            <div className="p-4 border-b border-line">
              <button type="button" disabled={!currentUser} onClick={() => { setFindingPeople(value => !value); setMobileView('list'); }} className="mb-3 w-full rounded-xl bg-accent-fill px-4 py-3 text-sm font-bold text-accent-contrast disabled:opacity-50">{findingPeople ? '← Minhas conversas' : '+ Nova conversa'}</button>
              {!findingPeople && <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar conversa..."
                  aria-label="Filtrar minhas conversas"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-raised border border-line rounded-2xl text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent transition-all"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-muted absolute left-3.5 top-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>}
            </div>

            {/* Lista de Conversas */}
            {findingPeople ? <UserSearch onSelect={openConversation} /> : <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-line">
              {loadingConversations && conversations.length === 0 ? (
                <LoadingState label="Carregando conversas…" detail="" />
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  <p className="text-base font-semibold text-muted mb-1">Nenhuma conversa encontrada</p>
                  <p className="text-xs">Clique em “Nova conversa” para buscar qualquer pessoa por nome ou @usuário.</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const partnerId = conv.partner_id;
                  const isActive = (activePartner?.id_usuario || activePartner?.partner_id) === partnerId;

                  return (
                    <button
                      key={partnerId}
                      onClick={() => {
                        openConversation({
                          id_usuario: conv.partner_id,
                          username: conv.partner_username,
                          nome: conv.partner_nome,
                          foto: conv.partner_foto,
                        });
                      }}
                      className={`w-full p-4 flex items-center gap-3 text-left transition-all hover:bg-surface-raised ${
                        isActive ? 'bg-accent-soft border-l-4 border-accent' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {conv.partner_foto && isValidImageUrl(conv.partner_foto) ? (
                          <img
                            src={conv.partner_foto}
                            alt={conv.partner_username}
                            className="w-12 h-12 rounded-full object-cover border border-line bg-surface-raised"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-accent-fill flex items-center justify-center text-accent-contrast font-bold text-lg">
                            {conv.partner_username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 bg-accent-fill text-accent-contrast text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-sm text-foreground truncate">
                            {conv.partner_nome || conv.partner_username}
                          </h3>
                          <span className="text-xs text-muted shrink-0">
                            {formatMessageTime(conv.last_message_date)}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-accent font-semibold' : 'text-muted'}`}>
                          {conv.last_message}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>}
          </div>

          {/* COLUNA DIREITA: JANELA DO CHAT */}
          <div
            className={`md:col-span-8 flex flex-col h-full bg-surface ${
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {activePartner ? (
              <>
                {/* Header do Chat */}
                <div className="p-4 border-b border-line flex items-center justify-between bg-surface backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    {/* Botão de voltar (mobile) */}
                    <button
                      onClick={() => setMobileView('list')}
                      aria-label="Voltar para conversas e busca de pessoas"
                      className="md:hidden p-2 text-muted hover:text-foreground rounded-lg hover:bg-surface-raised"
                    >
                      ←
                    </button>

                    {/* Avatar do parceiro */}
                    {activePartner.foto && isValidImageUrl(activePartner.foto) ? (
                      <img
                        src={activePartner.foto}
                        alt={activePartner.username}
                        className="w-10 h-10 rounded-full object-cover border border-accent bg-surface-raised"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent-fill flex items-center justify-center text-accent-contrast font-bold text-base">
                        {activePartner.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}

                    <div>
                      <h2 className="font-bold text-foreground text-base leading-tight">
                        {activePartner.nome || activePartner.username}
                      </h2>
                      <span className="text-xs text-accent font-medium">@{activePartner.username}</span>
                    </div>
                  </div>

                  <Link
                    href={`/perfil/${activePartner.id_usuario || activePartner.partner_id}`}
                    className="text-xs px-3 py-1.5 bg-surface-raised hover:bg-surface text-muted hover:text-accent rounded-xl border border-line transition-colors"
                  >
                    Ver Perfil
                  </Link>
                </div>

                <ConversationSafety key={activePartner.id_usuario} userId={activePartner.id_usuario} />
                {/* Banner de Contexto de Produto (se houver) */}
                {referencedProduct && (
                  <div className="px-4 py-2.5 bg-surface border-b border-line flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {referencedProduct.imagem && isValidImageUrl(referencedProduct.imagem) && (
                        <img
                          src={referencedProduct.imagem}
                          alt={referencedProduct.nome}
                          className="w-10 h-10 rounded-lg object-contain bg-surface-raised border border-line shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-muted">Negociando produto:</p>
                        <p className="text-xs font-bold text-foreground truncate">{referencedProduct.nome}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-accent">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(referencedProduct.preco))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Área de Mensagens (Scroll) */}
                <div ref={messageList} className="flex-1 p-4 overflow-y-auto space-y-4" aria-label="Histórico da conversa">{hasOlder && <button type="button" disabled={loadingOlder} onClick={() => fetchMessages(activePartner.id_usuario, false, true)} className="rounded-xl border border-line px-4 py-2 text-sm">{loadingOlder ? 'Carregando anteriores…' : 'Carregar mensagens anteriores'}</button>}
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-muted text-sm animate-pulse">
                      Carregando mensagens...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted p-6">
                      <div className="w-16 h-16 rounded-full bg-surface-raised flex items-center justify-center text-3xl mb-3">
                        💬
                      </div>
                      <p className="font-semibold text-muted">Inicie a conversa!</p>
                      <p className="text-xs text-muted mt-1 max-w-sm">
                        Envie uma mensagem para tirar dúvidas sobre produtos, entregas ou preços.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = Number(msg.remetente_id) === Number(currentUser?.id);

                      return (
                        <div key={msg.id} data-message-id={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {/* Card de produto anexado (se houver na mensagem) */}
                          {msg.produto_nome && (
                            <div className="mb-1 max-w-xs text-xs bg-surface border border-line rounded-xl p-2.5 flex items-center gap-2">
                              {msg.produto_imagem && isValidImageUrl(msg.produto_imagem) && (
                                <img
                                  src={msg.produto_imagem}
                                  alt={msg.produto_nome}
                                  className="w-8 h-8 rounded object-contain bg-surface-raised"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate">{msg.produto_nome}</p>
                                {msg.produto_preco && (
                                  <p className="text-accent font-semibold">
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
                                ? 'bg-accent-fill text-accent-contrast font-medium rounded-br-none'
                                : 'bg-surface-raised text-foreground border border-line rounded-bl-none'
                            }`}
                          >
                            {msg.conteudo}
                          </div>

                          {/* Hora e Status */}
                          {!isMe && <ReportControl type="mensagem" targetId={msg.id} label="Denunciar mensagem" />}
                          <div className="flex items-center gap-1 mt-1 px-1">
                            <span className="text-xs text-muted">{formatMessageTime(msg.created_at)}</span>
                            {isMe && (
                              <span className={`text-xs font-bold ${msg.lida ? 'text-accent' : 'text-muted'}`}>
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
                <form onSubmit={handleSendMessage} className="p-4 border-t border-line bg-surface flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Digite sua mensagem..."
                    aria-label="Digite sua mensagem"
                    maxLength={2000}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                    className="flex-1 p-3.5 bg-surface-raised border border-line rounded-2xl text-foreground placeholder-muted text-sm focus:outline-none focus:border-accent transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3.5 bg-accent-fill hover:brightness-110 text-accent-contrast font-bold rounded-2xl shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                    aria-label={sending ? 'Enviando mensagem' : 'Enviar mensagem'}
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
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted">
                <div className="w-20 h-20 rounded-full bg-surface-raised border border-line flex items-center justify-center text-4xl mb-4">
                  💬
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Suas Conversas</h2>
                <p className="text-sm text-muted max-w-md mb-6">
                  Selecione uma conversa ou clique em “Nova conversa” para procurar pessoas por nome ou @usuário. Você não precisa de um anúncio para conversar.
                </p>
                <button
                  type="button"
                  disabled={!currentUser}
                  onClick={() => { setFindingPeople(true); setMobileView('list'); }}
                  className="px-6 py-3 bg-accent-fill text-accent-contrast font-bold rounded-xl hover:brightness-110 transition-all shadow-lg text-sm"
                >
                  Procurar pessoas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MensagensPage() {
  return <Suspense fallback={<LoadingState label="Carregando conversas…" />}><MensagensContent /></Suspense>;
}
