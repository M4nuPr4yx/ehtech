'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ImageWithFallback from '../complements/ImageWithFallback';
import { getMainImage } from '../complements/imageHelper';
import { getApiUrl } from '../../lib/api';

const PAGE_SIZE = 12;
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const categories = [
  ['', 'Todos'], ['smartphones', 'Smartphones'], ['notebooks', 'Notebooks'],
  ['computadores', 'Computadores'], ['games', 'Games'], ['audio', 'Áudio'],
  ['Smartwatches', 'Smartwatches'], ['Câmeras digitais', 'Câmeras'],
  ['tablets', 'Tablets'], ['acessorios', 'Acessórios'], ['gadgets', 'Gadgets'],
  ['redes', 'Redes e internet'], ['outros', 'Outros'],
];
const emptyFilters = { search: '', categoria: '', precoMin: '', precoMax: '', ordenacao: 'recentes' };

function Icon({ type = 'search', ...props }) {
  const paths = {
    search: 'm21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    filter: 'M4 7h16M4 17h16M8 4v6m8 4v6',
    box: 'm3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 5 9-5m-9 5v9',
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[type]} /></svg>;
}

function Skeletons() {
  return <div className={styles.grid} aria-hidden="true">{Array.from({ length: PAGE_SIZE }, (_, i) => (
    <div key={i} className={styles.skeleton}><div /><span /><span /></div>
  ))}</div>;
}

function Catalog({ initialFilters }) {
  const [draft, setDraft] = useState(initialFilters);
  const [query, setQuery] = useState({ ...initialFilters, page: 1 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [precoMin, setPrecoMin] = useState('');
  const [precoMax, setPrecoMax] = useState('');
  const [ordenacao, setOrdenacao] = useState('recentes');

  // Categories
  const categorias = [
    { value: '', label: 'Todas as categorias' },
    { value: 'smartphones', label: 'Smartphones' },
    { value: 'notebooks', label: 'Notebooks' },
    { value: 'computadores', label: 'Computadores' },
    { value: 'tablets', label: 'Tablets' },
    { value: 'acessorios', label: 'Acessórios' },
    { value: 'gadgets', label: 'Gadgets' },
    { value: 'games', label: 'Games' },
    { value: 'redes', label: 'Redes e Internet' },
    { value: 'audio', label: 'Áudio' },
    { value: 'outros', label: 'Outros' }
  ];

  // Sync with URL query parameters
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
    const cat = searchParams.get('categoria');
    if (cat) setCategoria(cat);
  }, [searchParams]);

  const fetchProdutos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(getApiUrl('/produtos'));
      
      if (res.ok) {
        const data = await res.json();
        setProdutos(data);
      } else {
        setProdutos([]);
      }
    } catch (err) {
      setError('Erro ao carregar produtos');
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Native disclosure stays compact on phones; controls remain usable without JS.
    if (filtersRef.current) filtersRef.current.open = window.matchMedia('(min-width: 760px)').matches;
  }, []);

  // Apply all fields and reset the page together. Typing never unmounts inputs.
  useEffect(() => {
    if (!pendingFilters || invalidRange) return;
    const timer = setTimeout(() => setQuery({ ...draft, page: 1 }), 350);
    return () => clearTimeout(timer);
  }, [draft, pendingFilters, invalidRange]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    const params = new URLSearchParams({ ...query, limit: String(PAGE_SIZE) });
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/catalogo?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.mensagem || 'Não foi possível carregar o catálogo.');
        if (!Array.isArray(data.items)) throw new Error('Resposta inválida do catálogo.');
        if (active) {
          const totalPages = Math.max(1, Number(data.totalPages) || 1);
          if (query.page > totalPages) {
            setQuery((current) => ({ ...current, page: totalPages }));
          } else {
            setResult({ ...data, totalPages });
          }
        }
      } catch (err) {
        if (active) setError(err.name === 'AbortError' ? 'A busca demorou mais que o esperado. Tente novamente.' : err.message);
      } finally {
        clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [query, retry]);

  function change(field, value) { setDraft((current) => ({ ...current, [field]: value })); }
  function clear() { setDraft({ ...emptyFilters }); setQuery({ ...emptyFilters, page: 1 }); }
  function changePage(nextPage) {
    setQuery((current) => ({ ...current, page: nextPage }));
    resultsRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    resultsRef.current?.focus({ preventScroll: true });
  }
  const hasFilters = draft.search || draft.categoria || draft.precoMin || draft.precoMax;
  const busy = loading || pendingFilters;
  const categoryName = categories.find(([value]) => value === draft.categoria)?.[1] || draft.categoria;
  const rangeStart = result?.total ? (query.page - 1) * PAGE_SIZE + 1 : 0;

  return (
    <div className={styles.catalog}>
      <div className={styles.shell}>
        <div className={styles.breadcrumb}><Link href="/">Início</Link><span>/</span><span>Catálogo</span></div>
        <header className={styles.hero}>
          <div><p className={styles.eyebrow}>ESCOLHA SEU PRÓXIMO UPGRADE</p><h1>Tecnologia que<br />combina com <em>você.</em></h1><p className={styles.subtitle}>Explore os anúncios da comunidade e encontre seu próximo equipamento.</p></div>
          <Link href="/anunciar" className={styles.sell}>Seu próximo upgrade começa aqui.<strong>Anuncie seu equipamento <Icon type="arrow" /></strong></Link>
        </header>
        <div className={styles.searchRow}>
          <div className={styles.search}><Icon /><label htmlFor="catalog-search" className={styles.srOnly}>Buscar produtos</label><input id="catalog-search" type="search" placeholder="O que você está procurando?" value={draft.search} maxLength={100} onChange={(e) => change('search', e.target.value)} autoComplete="off" /></div>
          <span className={styles.searchHint}>Encontre. Compare. Escolha.</span>
        </div>
        <nav className={styles.chips} aria-label="Categorias rápidas">
          {categories.slice(0, 8).map(([value, label]) => <button key={value} type="button" aria-pressed={draft.categoria === value} onClick={() => change('categoria', value)}>{label}</button>)}
        </nav>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <details ref={filtersRef} className={styles.filters} open>
              <summary><span><Icon type="filter" /> Refine sua busca</span><span>⌄</span></summary>
              <div className={styles.filterBody}>
                <label htmlFor="catalog-category">Categoria</label>
                <select id="catalog-category" value={draft.categoria} onChange={(e) => change('categoria', e.target.value)}>{categories.map(([value, label]) => <option key={value} value={value}>{value ? label : 'Todas as categorias'}</option>)}</select>
                <fieldset><legend>Faixa de preço</legend><div className={styles.prices}>
                  <div><label htmlFor="catalog-min">De R$</label><input id="catalog-min" type="number" min="0" step="0.01" placeholder="0" value={draft.precoMin} onChange={(e) => change('precoMin', e.target.value)} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'price-error' : undefined} /></div>
                  <div><label htmlFor="catalog-max">Até R$</label><input id="catalog-max" type="number" min="0" step="0.01" placeholder="Sem limite" value={draft.precoMax} onChange={(e) => change('precoMax', e.target.value)} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'price-error' : undefined} /></div>
                </div>{invalidRange && <p id="price-error" className={styles.fieldError}>O valor mínimo deve ser menor ou igual ao máximo.</p>}</fieldset>
                {hasFilters && <button type="button" className={styles.clear} onClick={clear}>Limpar filtros <span>×</span></button>}
                <div className={styles.tip}><Icon type="box" /><p>Um novo destino para a tecnologia.<span>Descubra o que a comunidade está anunciando.</span></p></div>
              </div>
            </details>
          </aside>
          <section className={styles.results} ref={resultsRef} tabIndex={-1} aria-label="Resultados do catálogo">
            <div className={styles.toolbar}>
              <div><h2>{draft.categoria ? categoryName : 'Explore o catálogo'}</h2><p role="status" aria-live="polite">{busy && !invalidRange ? 'Atualizando resultados…' : result ? `${result.total} produtos encontrados` : 'Busque seu próximo equipamento'}</p></div>
              <div className={styles.sort}><label htmlFor="catalog-sort">Ordenar por</label><select id="catalog-sort" value={draft.ordenacao} onChange={(e) => change('ordenacao', e.target.value)}><option value="recentes">Mais recentes</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option></select></div>
            </div>
            {hasFilters && <div className={styles.activeFilters}>{draft.search && <span>Busca: “{draft.search}”</span>}{draft.categoria && <span>{categoryName}</span>}{(draft.precoMin || draft.precoMax) && <span>{draft.precoMin ? money.format(draft.precoMin) : 'R$ 0'} — {draft.precoMax ? money.format(draft.precoMax) : 'sem limite'}</span>}</div>}
            {error && <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></div>}
            <div aria-busy={loading}>
              {!result && loading ? <Skeletons /> : result?.items.length ? (
                <div className={styles.grid} data-updating={busy}>
                  {result.items.map((product) => (
                    <Link key={product.id_produto} href={`/produtos/${product.id_produto}`} prefetch={false} className={styles.card}>
                      <div className={styles.photo}>
                        <ImageWithFallback src={getMainImage(product.imagem)} alt={product.nome} className={styles.productImage} sizes="(max-width: 479px) 90vw, (max-width: 759px) 45vw, (max-width: 1099px) 35vw, 25vw" />
                        {Number(product.estoque) <= 0 && <span className={styles.soldOut}>Esgotado</span>}
                      </div>
                      <div className={styles.cardBody}><span className={styles.category}>{product.categoria}</span><h3>{product.nome}</h3><p className={styles.description}>{product.descricao}</p><div className={styles.cardBottom}><div><span className={styles.priceLabel}>Valor do anúncio</span><strong>{money.format(Number(product.preco) || 0)}</strong></div><span className={styles.cardArrow}><Icon type="arrow" /></span></div></div>
                    </Link>
                  ))}
                </div>
              ) : !error && !loading ? <div className={styles.empty}><Icon type="search" width="36" height="36" /><h3>Nenhum anúncio por aqui.</h3><p>Experimente outra palavra ou amplie os filtros da busca.</p><button type="button" onClick={clear}>Explorar todos os produtos</button></div> : null}
            </div>
            {result?.total > 0 && <div className={styles.pagination}>
              <span>{rangeStart}–{Math.min(query.page * PAGE_SIZE, result.total)} de {result.total} anúncios</span>
              <nav aria-label="Paginação de produtos"><button type="button" disabled={busy || query.page <= 1} onClick={() => changePage(query.page - 1)} aria-label="Página anterior">←</button><span>Página {query.page} de {result.totalPages}</span><button type="button" disabled={busy || query.page >= result.totalPages} onClick={() => changePage(query.page + 1)} aria-label="Próxima página">→</button></nav>
            </div>}
          </section>
        </div>
      </div>
    </div>
  );
}

function CatalogFromUrl() {
  const params = useSearchParams();
  const search = params.get('search') || '';
  const categoria = params.get('categoria') || '';
  return <Catalog key={JSON.stringify([search, categoria])} initialFilters={{ ...emptyFilters, search, categoria }} />;
}

export default function Produtos() {
  return <Suspense fallback={<div className={styles.catalog}><div className={styles.shell}><p role="status">Carregando catálogo…</p><Skeletons /></div></div>}><CatalogFromUrl /></Suspense>;
}
