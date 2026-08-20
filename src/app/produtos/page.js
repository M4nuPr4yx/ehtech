'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ImageWithFallback from '../complements/ImageWithFallback';
import { getMainImage } from '../complements/imageHelper';

function ProdutosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [produtos, setProdutos] = useState([]);
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
      const res = await fetch('http://localhost:3000/produtos');
      
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
    fetchProdutos();
  }, []);

  // Filter products
  const produtosFiltrados = produtos.filter(produto => {
    // Search filter
    if (search && !produto.nome?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Category filter
    if (categoria && produto.categoria !== categoria) {
      return false;
    }
    // Price range filter
    if (precoMin && parseFloat(produto.preco) < parseFloat(precoMin)) {
      return false;
    }
    if (precoMax && parseFloat(produto.preco) > parseFloat(precoMax)) {
      return false;
    }
    return true;
  });

  // Sort products
  const produtosOrdenados = [...produtosFiltrados].sort((a, b) => {
    const aEsgotado = Number(a.estoque) <= 0;
    const bEsgotado = Number(b.estoque) <= 0;
    if (aEsgotado !== bEsgotado) return aEsgotado ? 1 : -1;

    switch (ordenacao) {
      case 'menor-preco':
        return parseFloat(a.preco) - parseFloat(b.preco);
      case 'maior-preco':
        return parseFloat(b.preco) - parseFloat(a.preco);
      case 'recentes':
      default:
        return Number(b.id_produto) - Number(a.id_produto);
    }
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const limparFiltros = () => {
    setSearch('');
    setCategoria('');
    setPrecoMin('');
    setPrecoMax('');
    setOrdenacao('recentes');
  };

  if (loading) {
    return (
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#ABDB25] border-t-transparent"></div>
          <div className="text-[#d7f58d] text-sm font-semibold">Carregando catálogo de produtos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="site-background min-h-screen text-white pt-10 pb-20 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(171,219,37,0.08)_0%,_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-1/3 left-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(171,219,37,0.05)_0%,_transparent_70%)] blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="mb-8 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-[#ABDB25]"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#ABDB25]">Catálogo Completo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Todos os Produtos</h1>
          <p className="text-sm text-gray-400 mt-1">Explore, filtre e compre equipamentos com segurança e transparência</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filters Panel */}
        <aside className="h-fit w-full shrink-0 rounded-2xl border border-white/10 bg-[#121612]/95 p-6 shadow-xl shadow-black/30 lg:sticky lg:top-24 lg:w-72 backdrop-blur-md">
          <div className="flex items-center justify-between mb-5 border-b border-white/[0.08] pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
            </h2>
            {(search || categoria || precoMin || precoMax || ordenacao !== 'recentes') && (
              <button
                onClick={limparFiltros}
                className="text-xs font-semibold text-[#ABDB25] hover:underline"
              >
                Limpar tudo
              </button>
            )}
          </div>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <label className="block text-sm text-gray-400 mb-1">Buscar</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome do produto..."
                className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-[#ABDB25] focus:outline-none transition-colors"
              >
                {categorias.map(cat => (
                  <option key={cat.value} value={cat.value} className="bg-gray-800">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Mín</label>
                <input
                  type="number"
                  value={precoMin}
                  onChange={(e) => setPrecoMin(e.target.value)}
                  placeholder="0"
                  className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Máx</label>
                <input
                  type="number"
                  value={precoMax}
                  onChange={(e) => setPrecoMax(e.target.value)}
                  placeholder="999999"
                  className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ordenar por</label>
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-[#ABDB25] focus:outline-none transition-colors"
              >
                <option value="recentes" className="bg-gray-800">Mais recentes</option>
                <option value="menor-preco" className="bg-gray-800">Menor preço</option>
                <option value="maior-preco" className="bg-gray-800">Maior preço</option>
              </select>
            </div>
          </div>

          {/* Clear filters button */}
          {(search || categoria || precoMin || precoMax || ordenacao !== 'recentes') && (
            <button
              onClick={limparFiltros}
              className="mt-4 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Limpar filtros
            </button>
          )}

          {/* Results count */}
          <div className="mt-4 text-gray-400 text-sm">
            {produtosOrdenados.length} produto{produtosOrdenados.length !== 1 ? 's' : ''} encontrado{produtosOrdenados.length !== 1 ? 's' : ''}
          </div>
        </aside>

        <section className="min-w-0 flex-1">

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl text-red-300 mb-6">
            {error}
          </div>
        )}

        {/* Products Grid */}
        {produtosOrdenados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {produtosOrdenados.map((produto, index) => {
              const imageUrl = getMainImage(produto.imagem);
              return (
              <div
                key={produto.id_produto || index}
                className="scale-up-ver-bottom bg-[#15181b]/95 border border-white/10 rounded-2xl overflow-hidden hover:border-[#ABDB25]/70 hover:shadow-xl hover:shadow-[#ABDB25]/15 hover:-translate-y-1 transition-all duration-300 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
{/* Product Image */}
                <div className="aspect-square bg-gray-800 relative overflow-hidden">
                  {imageUrl ? (
                    <ImageWithFallback
                      src={imageUrl}
                      alt={produto.nome}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

{/* Product Info */}
                <div className="p-4">
                  <Link href={`/produtos/${produto.id_produto}`} className="block">
                    <h3 className="font-bold text-white mb-1 truncate group-hover:text-[#ABDB25] transition-colors">
                      {produto.nome}
                    </h3>
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                      {produto.descricao}
                    </p>
                    <p className="text-[#ABDB25] text-xl font-bold mb-3">
                      {formatPrice(produto.preco)}
                    </p>
                  </Link>
                  <button 
                    onClick={() => router.push(`/produtos/${produto.id_produto}`)}
                    className="w-full py-2 bg-[#ABDB25] hover:bg-white hover:text-black text-black font-bold rounded-xl transition-all duration-300"
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="text-center py-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-400 text-lg mb-4">Nenhum produto encontrado</p>
            <button 
              onClick={limparFiltros}
              className="text-[#ABDB25] hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
        </section>
        </div>
      </div>
    </div>
  );
}

export default function Produtos() {
  return (
    <Suspense fallback={
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#ABDB25] border-t-transparent"></div>
          <div className="text-[#d7f58d] text-sm font-semibold">Carregando catálogo de produtos...</div>
        </div>
      </div>
    }>
      <ProdutosContent />
    </Suspense>
  );
}
