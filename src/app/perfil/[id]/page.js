'use client';
import { apiRequest } from '../../../lib/api-request.js';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { ListingDetailLink, useListingQuery, useListingScroll } from '../../complements/ListingNavigation';
import { useParams } from 'next/navigation';
import { getMainImage } from '../../complements/imageHelper';
import ImageWithFallback from '../../complements/ImageWithFallback';
import LoadingState from '../../complements/LoadingState';

const defaults = { page: 1 };
const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

// Helper function to validate if a string is a valid image URL or Base64
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Check for valid URL patterns: http://, https://, or data:image/
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return true;
  }
  // Also check if it looks like a Base64 image (contains common Base64 image patterns)
  if (trimmed.includes('base64,')) {
    return true;
  }
  // Check if it's a valid looking URL (contains common image extensions)
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  return imageExtensions.some(ext => trimmed.toLowerCase().includes(ext));
};

function SellerProfile({ id }) {
  const { query: { page }, search, update } = useListingQuery(defaults);
  const from = `/perfil/${id}${search ? '?' + search : ''}`;
  const [profileResult, setProfileResult] = useState(null);
  const [serviceReviews, setServiceReviews] = useState(null);
  const [catalogResult, setCatalogResult] = useState(null);
  const [profileRetry, setProfileRetry] = useState(0);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [imgError, setImgError] = useState(false);
  const seller = profileResult?.seller;
  const catalog = catalogResult?.page === page && catalogResult?.retry === catalogRetry ? catalogResult : null;
  const produtos = catalog?.data?.items || [];
  const avaliacoes = seller?.reputacao_vendas;
  const avaliacoesServicos = serviceReviews?.data;
  useListingScroll(Boolean(seller && catalog?.data), search);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    apiRequest(`/usuarios/${encodeURIComponent(id)}/publico`, options)
      .then(profile => { if (!controller.signal.aborted) setProfileResult({ seller: profile }); })
      .catch(error => { if (!controller.signal.aborted) setProfileResult({ error }); });
    apiRequest(`/servicos/reputacao/prestador/${encodeURIComponent(id)}`, options)
      .then(data => { if (!controller.signal.aborted) setServiceReviews({ data }); })
      .catch(error => { if (!controller.signal.aborted) setServiceReviews({ error }); });
    return () => controller.abort();
  }, [id, profileRetry]);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest(`/produtos/catalogo?${new URLSearchParams({ vendedor: id, page: String(page) })}`, { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        if (page > data.totalPages) update({ page: data.totalPages });
        else setCatalogResult({ page, retry: catalogRetry, data });
      })
      .catch(error => { if (!controller.signal.aborted) setCatalogResult({ page, retry: catalogRetry, error }); });
    return () => controller.abort();
  }, [id, page, catalogRetry, update]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} aria-hidden="true" className={`text-xl ${i < Math.round(rating) ? 'text-accent' : 'text-muted'}`}>
        ★
      </span>
    ));
  };

  if (!profileResult) return <LoadingState label="Carregando perfil…" />;

  if (!seller) {
    return (
      <div className="site-background min-h-screen text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">{profileResult.error?.status === 404 ? 'Vendedor não encontrado' : 'Perfil indisponível'}</h1>
          {profileResult.error?.status >= 500 || !profileResult.error?.status ? <button type="button" className="mr-4 underline" onClick={() => { setProfileResult(null); setProfileRetry(value => value + 1); }}>Tentar novamente</button> : null}
          <Link href="/produtos" className="text-accent hover:underline">Voltar aos produtos</Link>
        </div>
      </div>
    );
  }

  const isSelf = Number(currentUserId) === Number(seller.id_usuario);
  const joined = new Date(seller.data_criacao || '');

  return (
    <div className="site-background min-h-screen text-foreground pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back button */}
        <Link href="/produtos" className="inline-flex items-center text-muted hover:text-accent mb-6 transition-colors">
          ← Voltar aos produtos
        </Link>

        {/* Seller Info Card */}
        <div className="bg-surface border border-line rounded-2xl p-8 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Seller Avatar */}
            <div className="relative shrink-0">
              {seller.foto && !imgError && isValidImageUrl(seller.foto) ? (
                <img
                  src={seller.foto}
                  alt={seller.username || 'Vendedor'}
                  onError={() => setImgError(true)}
                  className="w-24 h-24 rounded-full object-cover border-2 border-accent shadow-lg shadow-transparent bg-surface-raised"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-accent-fill flex items-center justify-center text-accent-contrast text-4xl font-bold shadow-lg shadow-transparent">
                  {seller.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            
            {/* Seller Details */}
            <div className="min-w-0 text-center md:text-left flex-1">
              <h1 className="break-words text-3xl font-bold text-foreground mb-2">{seller.nome || seller.username}</h1>
              {seller.nome && !/^usuario_[a-f0-9]{16}$/.test(seller.username || '') && <p className="break-words text-muted text-sm mb-2">@{seller.username}</p>}
              {Number.isFinite(joined.getTime()) && <p className="text-muted text-sm">Na EHtech desde <time dateTime={joined.toISOString().slice(0, 10)}>{monthYear.format(joined)}</time></p>}
              
              {/* Reputações independentes para vendas e serviços */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-line bg-surface-raised px-4 py-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Vendas de produtos</span>
                  {avaliacoes?.total ? <div className="flex flex-wrap items-center gap-2"><div className="flex">{renderStars(avaliacoes.media)}</div><strong className="text-accent">{avaliacoes.media.toLocaleString('pt-BR')} de 5</strong><small className="text-muted">({avaliacoes.total})</small></div> : <p className="text-sm text-muted">Sem avaliações de compras verificadas</p>}
                  <p className="mt-1 text-sm text-muted">{seller.vendas_recebidas} {seller.vendas_recebidas === 1 ? 'venda recebida' : 'vendas recebidas'}</p>
                </div>
                <div className="rounded-xl border border-accent bg-accent-soft px-4 py-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Serviços técnicos</span>
                  {avaliacoesServicos?.total ? <div className="flex flex-wrap items-center gap-2"><div className="flex">{renderStars(avaliacoesServicos.media)}</div><strong className="text-accent">{avaliacoesServicos.media.toLocaleString('pt-BR')} de 5</strong><small className="text-muted">({avaliacoesServicos.total})</small></div> : <p className="text-sm text-muted">{serviceReviews?.error ? 'Avaliações indisponíveis' : avaliacoesServicos ? 'Sem avaliações de serviços' : 'Carregando avaliações…'}</p>}
                  <p className="mt-1 text-sm text-muted">{seller.servicos_concluidos} {seller.servicos_concluidos === 1 ? 'serviço concluído' : 'serviços concluídos'}</p>
                </div>
              </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex flex-col sm:flex-row md:flex-col items-center gap-3">
              <div className="text-center bg-surface-raised border border-line rounded-xl px-5 py-3 w-full">
                <p className="text-muted text-xs uppercase tracking-wider font-semibold">Anúncios</p>
                <p className="text-2xl font-bold text-foreground">{catalog?.data?.total ?? '—'}</p>
              </div>

              {!isSelf && (
                <Link
                  href={`/mensagens?usuario=${seller.id_usuario}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-accent-fill hover:brightness-110 text-accent-contrast font-bold rounded-xl shadow-lg hover:shadow-transparent transition-all text-center text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Conversar
                </Link>
              )}
            </div>
          </div>
        </div>

        {avaliacoesServicos?.avaliacoes?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Avaliações dos serviços técnicos</h2>
            <div className="grid gap-3">
              {avaliacoesServicos.avaliacoes.slice(0, 6).map((avaliacao, index) => (
                <article key={`${avaliacao.created_at}-${index}`} className="rounded-2xl border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-foreground">{avaliacao.avaliador}</strong><span className="ml-2 text-xs text-muted">em {avaliacao.servico}</span></div><span className="text-accent tracking-wider">{'★'.repeat(avaliacao.nota)}{'☆'.repeat(5 - avaliacao.nota)}</span></div>
                  {avaliacao.comentario && <p className="mt-3 text-sm leading-relaxed text-muted">{avaliacao.comentario}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Products Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Produtos de {seller.nome || seller.username}</h2>
          
          {!catalog ? <LoadingState label="Carregando anúncios…" /> : catalog.error ? (
            <div className="rounded-xl border border-line bg-surface p-5" role="status"><p>Os anúncios estão indisponíveis.</p><button type="button" className="mt-2 underline" onClick={() => setCatalogRetry(value => value + 1)}>Tentar novamente</button></div>
          ) : produtos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {produtos.map((produto, index) => (
                <div 
                  key={produto.id_produto || index}
                  className="bg-surface border border-line rounded-2xl overflow-hidden hover:border-accent hover:shadow-lg hover:shadow-transparent transition-all duration-300 group"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-surface-raised relative overflow-hidden">
                    {getMainImage(produto.imagem) ? (
                      <ImageWithFallback
                        src={getMainImage(produto.imagem)}
                        alt={produto.nome}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 270px"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <ListingDetailLink from={from} href={`/produtos/${produto.id_produto}`} className="block">
                      <h3 className="font-bold text-foreground mb-1 truncate group-hover:text-accent transition-colors">
                        {produto.nome}
                      </h3>
                      <p className="text-accent text-xl font-bold">
                        {formatPrice(produto.preco)}
                      </p>
                    </ListingDetailLink>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-line rounded-2xl p-8 text-center">
              <p className="text-muted">Este vendedor ainda não tem produtos anunciados.</p>
            </div>
          )}
          {catalog?.data?.totalPages > 1 && <nav aria-label="Páginas de anúncios do vendedor" className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <button type="button" className="rounded-xl border border-line px-3 py-2 disabled:opacity-50" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>Anterior</button>
            <p>Página {page} de {catalog.data.totalPages}</p>
            <button type="button" className="rounded-xl border border-line px-3 py-2 disabled:opacity-50" disabled={page >= catalog.data.totalPages} onClick={() => update({ page: page + 1 })}>Próxima</button>
          </nav>}
        </div>
      </div>
    </div>
  );
}

export default function SellerProfilePage() {
  const { id } = useParams();
  return <Suspense fallback={<LoadingState label="Carregando perfil…" />}><SellerProfile key={id} id={id} /></Suspense>;
}
