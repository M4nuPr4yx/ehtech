'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ImageWithFallback from '../../complements/ImageWithFallback';
import { getProductImages, isValidImageUrl } from '../../complements/imageHelper';
import { ProductExtras } from '../../complements/DifferentialsUI';
import { ProductActions, ReportControl } from '../../complements/TrustControls';
import { ProductSpecificationList } from '../../complements/ProductSpecifications';
import { ListingBackLink } from '../../complements/ListingNavigation';
import { apiRequest, apiResponse } from '../../../lib/api-request';
import { productCategoryLabel } from '../../../lib/product-category.mjs';

const demoNotice = 'DEMONSTRAÇÃO EHtech: anúncio fictício para testar o marketplace. Não é uma oferta comercial; não efetue pagamento, contato telefônico ou envio para estes dados.';
const surface = 'rounded-2xl border border-line bg-surface';

// ImageGallery Component - galeria interativa com miniaturas
function ImageGallery({ images, name }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const validImages = Array.isArray(images) ? images.filter(isValidImageUrl) : [];

  if (validImages.length === 0) {
    return <div className={`${surface} grid h-44 place-items-center text-sm text-muted`}>Anúncio sem fotos</div>;
  }

  const prev = () => setActiveIdx((i) => (i - 1 + validImages.length) % validImages.length);
  const next = () => setActiveIdx((i) => (i + 1) % validImages.length);

  return (
    <div className="flex flex-col gap-3">
      {/* Imagem Principal */}
      <div className={`${surface} relative aspect-[4/3] max-h-56 overflow-hidden sm:max-h-[26rem]`}>
        <ImageWithFallback
          src={validImages[activeIdx]}
          alt={`Foto ${activeIdx + 1} de ${name}`}
          loading={activeIdx === 0 ? 'eager' : 'lazy'}
          sizes="(max-width: 767px) 92vw, 55vw"
          className="h-full w-full object-contain p-3"
        />

        {/* Badge contagem */}
        {validImages.length > 1 && (
          <span className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {activeIdx + 1}/{validImages.length}
          </span>
        )}

        {/* Setas de Navegação */}
        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Imagem anterior"
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/70 text-2xl text-white hover:bg-black"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próxima imagem"
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/70 text-2xl text-white hover:bg-black"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validImages.map((url, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => setActiveIdx(idx)}
              aria-label={`Ver foto ${idx + 1}`}
              aria-pressed={idx === activeIdx}
              className={`size-12 shrink-0 rounded-xl overflow-hidden border-2 transition-all sm:size-16 ${
                idx === activeIdx
                  ? 'border-accent shadow-md shadow-transparent'
                  : 'border-line hover:border-line'
              }`}
            >
              <ImageWithFallback
                src={url}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-contain bg-surface-raised p-0.5"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProdutoDetalhes({ initialProduct }) {
  const router = useRouter();
  const params = useParams();
  const [produto, setProduto] = useState(initialProduct);
  const loading = false;
  const error = ''; 
  const [cartMessage, setCartMessage] = useState(null);
  
  // Rating state
  const [avaliacoes, setAvaliacoes] = useState({ avaliacoes: [], media: 0, total: 0 });
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  
  // Edit state
  const [isOwner, setIsOwner] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ nome: initialProduct.nome, descricao: initialProduct.descricao, preco: initialProduct.preco, imagem: initialProduct.imagem || '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  
  // User state
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('Verificando se você pode avaliar…');
  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('token');
    if (token && params.id) apiRequest(`/avaliacoes/elegibilidade/${params.id}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } }).then(data => { setCanReview(data.permitido); setReviewNotice(data.mensagem); }).catch(error => { if (!controller.signal.aborted) { setCanReview(false); setReviewNotice(error.message); } });
    return () => controller.abort();
  }, [params.id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (produto && user) {
      setIsOwner(Number(produto.vendedor_id) === Number(user.id) || produto.vendedor === user.email);
    } else {
      setIsOwner(false);
    }
  }, [produto, user]);

  useEffect(() => {
    const controller = new AbortController();
    if (produto.vendedor_id) apiRequest('/usuarios/' + produto.vendedor_id + '/publico', { signal: controller.signal }).then(setSellerInfo).catch(() => {});
    return () => controller.abort();
  }, [produto.vendedor_id]);

  const fetchAvaliacoes = useCallback(async () => {
    if (!params.id) return;
    try {
      const res = await apiResponse(`/avaliacoes/produto/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setAvaliacoes(data);
      }
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    }
  }, [params.id]);

  useEffect(() => {
    fetchAvaliacoes();
  }, [fetchAvaliacoes]);

  const submitRating = async () => {
    if (!userRating) return;
    setSubmittingRating(true);
    setRatingMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await apiResponse('/avaliacoes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          produtoId: parseInt(params.id),
          nota: userRating,
          comentario: comment
        })
      });
      const data = await res.json();
      setRatingMessage(data.mensagem);
      if (res.ok) {
        fetchAvaliacoes();
        setComment('');
      }
    } catch (err) {
      setRatingMessage('Erro ao enviar avaliação');
    } finally {
      setSubmittingRating(false);
    }
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    setEditMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await apiResponse(`/produtos/${params.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });
      const data = await res.json();
      if (res.ok) {
        setEditMessage('Produto atualizado!');
        setProduto({ ...produto, ...editData, preco: Number(String(editData.preco).replace(',', '.')) });
        setEditMode(false);
      } else {
        setEditMessage(data.mensagem || 'Erro ao atualizar');
      }
    } catch (err) {
      setEditMessage('Erro ao atualizar produto');
    } finally {
      setSavingEdit(false);
    }
  };

  const addToCart = (checkout = false) => {
    if (!isLoggedIn) {
      router.push(`/?login=1&next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (isOwner || Number(produto.estoque) < 1) return;
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (!Array.isArray(cart)) throw new Error('Carrinho inválido');
      const existing = cart.findIndex(item => Number(item.id_produto) === Number(produto.id_produto));
      if (existing >= 0) {
        if (!checkout) cart[existing].quantidade = Math.min(Number(cart[existing].quantidade) + 1, Number(produto.estoque), 99);
      } else {
        cart.push({ ...produto, quantidade: 1 });
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      if (checkout) router.push(cart.length > 1 ? '/carrinho' : '/checkout');
      else setCartMessage({ text: 'Produto adicionado ao carrinho!', added: true });
    } catch {
      setCartMessage({ text: 'Não foi possível atualizar o carrinho neste navegador. Verifique se o armazenamento está disponível e tente novamente.', added: false });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const renderStars = (rating, interactive = false, onRate = null) => {
    return [...Array(5)].map((_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => interactive && onRate && onRate(i + 1)}
        disabled={!interactive}
        aria-label={`${interactive ? 'Avaliar com' : 'Nota'} ${i + 1} ${i === 0 ? 'estrela' : 'estrelas'}`}
        className={`text-2xl ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform ${i < rating ? 'text-accent' : 'text-muted'}`}
      >
        ★
      </button>
    ));
  };

  if (loading) {
    return (
      <div className="site-background min-h-screen text-foreground flex items-center justify-center">
        <div className="text-accent text-xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (error || !produto) {
    return (
      <div className="site-background min-h-screen text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-danger text-xl mb-4">{error || 'Produto não encontrado'}</p>
          <Link href="/produtos" className="text-accent hover:underline">Voltar aos produtos</Link>
        </div>
      </div>
    );
  }

  const demo = /^\[DEMO\]\s*/i.test(produto.nome);
  const name = demo ? produto.nome.replace(/^\[DEMO\]\s*/i, '') || produto.nome : produto.nome;
  const description = String(produto.descricao || '').trim();
  const descriptionParts = (demo && description.startsWith(demoNotice) ? description.slice(demoNotice.length).trim() : description)
    .split(/\r?\n(?:[ \t]*\r?\n)+/).filter(Boolean);
  const origin = [produto.origem_cidade, produto.origem_uf].filter(Boolean).join('/');
  const inStock = Number(produto.estoque) > 0;

  return (
    <div className="site-background min-h-screen pb-16 pt-5 text-foreground sm:pt-9">
      {cartMessage && (
        <div className={`fixed right-5 top-24 z-50 max-w-[calc(100%_-_2.5rem)] rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${cartMessage.added ? 'border-success bg-success-soft text-success' : 'border-danger bg-danger-soft text-danger'}`} role={cartMessage.added ? 'status' : 'alert'}>
          {cartMessage.text}
          {cartMessage.added && <Link href="/carrinho" className="ml-3 font-bold underline">Ir para o carrinho</Link>}
          <button type="button" onClick={() => setCartMessage(null)} className="ml-3 hover:text-foreground" aria-label="Fechar mensagem">×</button>
        </div>
      )}
      <div className="mx-auto max-w-6xl space-y-4 px-4 sm:space-y-5 sm:px-6">
        <ListingBackLink fallback="/produtos" fallbackLabel="Voltar aos produtos" className="inline-flex items-center text-sm font-semibold text-muted hover:text-accent" />

        <header className={`${surface} p-4 sm:px-6 sm:py-5`}>
          <div className="mb-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-surface-raised px-3 py-1 text-muted">{productCategoryLabel(produto.categoria)}</span>
            {demo && <span className="rounded-full border border-line px-3 py-1 text-accent">Demonstração</span>}
          </div>
          <h1 className="break-words text-2xl font-bold leading-tight sm:text-3xl">{name}</h1>
        </header>

        <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-6">
          <ImageGallery images={getProductImages(produto.imagem)} name={name} />

          {/* Product Info */}
          <div className={`${surface} min-w-0 p-5 sm:p-6`}>
            {editMode ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-accent mb-4">Editar Produto</h2>
                <div>
                  <label className="block text-sm text-muted mb-1">Nome</label>
                  <input
                    type="text"
                    value={editData.nome}
                    onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                    className="w-full p-3 bg-surface-raised border border-line rounded-xl text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Preço</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 129,90"
                    value={editData.preco}
                    onChange={(e) => setEditData({ ...editData, preco: e.target.value })}
                    className="w-full p-3 bg-surface-raised border border-line rounded-xl text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Descrição</label>
                  <textarea
                    value={editData.descricao}
                    onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                    className="w-full p-3 bg-surface-raised border border-line rounded-xl text-foreground focus:border-accent focus:outline-none h-32"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Imagem (URL ou Base64)</label>
                  <input
                    type="text"
                    value={editData.imagem}
                    onChange={(e) => setEditData({ ...editData, imagem: e.target.value })}
                    className="w-full p-3 bg-surface-raised border border-line rounded-xl text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={saveEdit}
                    disabled={savingEdit}
                    className="flex-1 py-3 bg-accent-fill hover:brightness-110 text-accent-contrast font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {savingEdit ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setEditMessage(''); }}
                    className="px-6 py-3 border border-line text-foreground rounded-xl hover:bg-surface-raised transition-all"
                  >
                    Cancelar
                  </button>
                </div>
                {editMessage && (
                  <p className={`p-3 rounded-xl text-center ${editMessage.includes('sucesso') ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                    {editMessage}
                  </p>
                )}
              </div>
            ) : (

              <section className="space-y-4" aria-label="Compra e vendedor">
                <div className="space-y-1">
                  <p className="text-4xl font-extrabold tracking-tight text-accent">{formatPrice(produto.preco)}</p>
                  <p className="text-sm font-semibold text-muted">{inStock ? 'Em estoque' : 'Sem estoque'}</p>
                </div>

                {demo && <p className="rounded-lg border border-line bg-surface-raised p-3 text-sm text-muted">Anúncio fictício. Evite pagamentos, contatos e envios usando estes dados.</p>}

                {isOwner ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setEditMode(true)} className="rounded-xl bg-accent-fill px-4 py-3 font-bold text-accent-contrast hover:brightness-110">Editar</button>
                    <Link href={'/editar-produto/' + produto.id_produto} className="text-sm font-semibold text-accent underline">Editar origem e dados do anúncio</Link>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <button type="button" onClick={() => addToCart(true)} disabled={!inStock} className="min-h-11 rounded-xl bg-accent-fill px-4 py-3 font-bold text-accent-contrast hover:brightness-110 disabled:opacity-50">
                      {inStock ? 'Iniciar pedido' : 'Sem estoque'}
                    </button>
                    <button type="button" onClick={() => addToCart()} disabled={!inStock} className="min-h-11 rounded-xl border border-line bg-surface-raised px-4 py-3 font-bold hover:bg-surface disabled:opacity-50">
                      Adicionar ao carrinho
                    </button>
                  </div>
                )}

                {!isOwner && inStock && <div className="space-y-2 rounded-xl bg-surface-raised p-4 text-sm text-muted">
                  <h2 className="font-bold text-foreground">Como funciona a compra</h2>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>{produto.exige_entrega ? 'Escolha entrega ou solicite retirada, revise e registre o pedido.' : 'Revise os itens e registre o pedido na EHtech.'}</li>
                    <li>{produto.exige_entrega ? 'Abra o pedido para combinar entrega ou retirada e aceitar a proposta do vendedor.' : 'Combine com o vendedor como receber seu produto.'}</li>
                    <li>Combine o pagamento diretamente com o vendedor, fora da EHtech.</li>
                  </ol>
                </div>}

                <dl className="space-y-2 border-y border-line py-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <dt className="text-muted">Entrega</dt>
                    <dd>{produto.exige_entrega ? 'A combinar' : 'Sem entrega física'}</dd>
                  </div>
                  {Boolean(produto.exige_entrega) && (
                    <div className="flex flex-wrap justify-between gap-x-4">
                      <dt className="text-muted">Origem do envio</dt>
                      <dd>{origin || 'A confirmar com o vendedor'}</dd>
                    </div>
                  )}
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {sellerInfo?.foto && isValidImageUrl(sellerInfo.foto) ? (
                      <ImageWithFallback src={sellerInfo.foto} alt="" sizes="36px" className="size-9 shrink-0 rounded-full bg-surface-raised object-cover" />
                    ) : (
                      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-raised font-bold text-accent">{(sellerInfo?.nome || produto.vendedor || 'V').charAt(0).toUpperCase()}</span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-muted">Vendido por</p>
                      {produto.vendedor_id ? (
                        <Link href={'/perfil/' + produto.vendedor_id} className="break-words font-semibold text-accent hover:underline">{sellerInfo?.nome || produto.vendedor}</Link>
                      ) : <span className="font-semibold">{sellerInfo?.nome || produto.vendedor}</span>}
                    </div>
                  </div>
                  {!isOwner && produto.vendedor_id && (
                    <Link href={'/mensagens?vendedor=' + produto.vendedor_id + '&produto=' + produto.id_produto} className="rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:bg-surface-raised">Tirar dúvidas com o vendedor</Link>
                  )}
                </div>

                <ProductActions key={produto.id_produto} productId={produto.id_produto} />
              </section>
            )}
          </div>
        </div>

        <section className={surface + ' space-y-3 p-5 sm:p-6'} aria-labelledby="specifications-heading">
          <h2 id="specifications-heading" className="text-xl font-bold">Ficha técnica</h2>
          <ProductSpecificationList product={produto} />
        </section>

        {!editMode && <ProductExtras productId={produto.id_produto} />}

        <section className={surface + ' p-5 sm:p-6'} aria-labelledby="description-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="description-heading" className="text-xl font-bold">Sobre o produto</h2>
            {produto.data_criacao && <p className="text-xs text-muted">Publicado em {new Date(produto.data_criacao).toLocaleDateString('pt-BR')}</p>}
          </div>
          <div className="mt-4 max-w-[72ch] space-y-4 break-words leading-relaxed text-muted">
            {descriptionParts.length
              ? descriptionParts.map((part, index) => <p className="whitespace-pre-line" key={index}>{part}</p>)
              : <p>O anunciante ainda não informou detalhes.</p>}
          </div>
        </section>

        {/* Ratings Section */}
        <div className={surface + ' p-5 sm:p-6'}>
          <h2 className="text-2xl font-bold text-foreground mb-4">Avaliações</h2>
          
          {/* Average rating */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex">
              {renderStars(Math.round(parseFloat(avaliacoes.media)))}
            </div>
            <span className="text-xl font-bold text-accent">{avaliacoes.media}</span>
            <span className="text-muted">({avaliacoes.total} {avaliacoes.total === 1 ? 'avaliação' : 'avaliações'})</span>
          </div>

          {isLoggedIn && !isOwner && <p className="my-3 text-sm text-muted">{reviewNotice}</p>}
          {isLoggedIn && !isOwner && canReview && (
            <div className="border-t border-line pt-6 mt-6">
              <h3 className="text-lg font-bold text-foreground mb-3">Avaliar este produto</h3>
              <div className="flex gap-2 mb-3">
                {renderStars(userRating, true, (rating) => setUserRating(rating))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comentário (opcional)"
                aria-label="Comentário da avaliação"
                maxLength={1000}
                className="w-full p-3 bg-surface-raised border border-line rounded-xl text-foreground placeholder-muted focus:border-accent focus:outline-none h-24 mb-3"
              />
              <button
                onClick={submitRating}
                disabled={!userRating || submittingRating}
                className="py-3 px-6 bg-accent-fill hover:brightness-110 text-accent-contrast font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {submittingRating ? 'Enviando...' : 'Enviar Avaliação'}
              </button>
              {ratingMessage && (
                <p className={`mt-3 p-3 rounded-xl ${ratingMessage.includes('sucesso') ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                  {ratingMessage}
                </p>
              )}
            </div>
          )}

          {/* Reviews list */}
          {avaliacoes.avaliacoes && avaliacoes.avaliacoes.length > 0 && (
            <div className="border-t border-line pt-6 mt-6 space-y-4">
              {avaliacoes.avaliacoes.map((avaliacao, index) => (
                <div key={index} className="bg-surface-raised border border-line rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {renderStars(avaliacao.nota)}
                    </div>
                    <span className="text-muted text-sm">por {avaliacao.avaliador_username}</span>
                    <span className="text-xs text-muted" title="Compra verificada indica pedido concluído com recebimento confirmado pelo comprador; não confirma pagamento.">{avaliacao.compra_verificada ? 'Compra verificada' : 'Avaliação histórica · compra não verificada'}</span>
                  </div>
                  {avaliacao.comentario && (
                    <p className="text-muted">{avaliacao.comentario}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {avaliacoes.total === 0 && (
            <p className="text-muted">Este produto ainda não tem avaliações de compras verificadas.</p>
          )}
        </div>
        {!isOwner && <ReportControl type="produto" targetId={params.id} label="Denunciar anúncio" />}
      </div>
    </div>
  );
}
