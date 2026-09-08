'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ImageWithFallback from './complements/ImageWithFallback';
import { getMainImage } from './complements/imageHelper';
import { getApiUrl } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState('');

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const res = await fetch(getApiUrl('/produtos/catalogo?limit=8&page=1'));
        
        if (res.ok) {
          const data = await res.json();
          // Produtos disponíveis aparecem primeiro; esgotados ficam no fim.
          const ordenados = [...(data.items || [])].sort((a, b) => {
            const aEsgotado = Number(a.estoque) <= 0;
            const bEsgotado = Number(b.estoque) <= 0;
            if (aEsgotado !== bEsgotado) return aEsgotado ? 1 : -1;
            return Number(b.id_produto) - Number(a.id_produto);
          });
          setProdutos(ordenados.slice(0, 8));
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProdutos();
  }, []);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      router.push(`/produtos?search=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      router.push('/produtos');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const categories = [
    {
      name: 'Smartphones',
      id: 'smartphones',
      desc: 'iPhones, Galaxy e Xiaomi',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'Notebooks',
      id: 'notebooks',
      desc: 'Gamer, Trabalho e MacBooks',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'PCs Gamer',
      id: 'computadores',
      desc: 'Setups completos e Desktops',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    {
      name: 'Games & Consoles',
      id: 'games',
      desc: 'PS5, Xbox, Nintendo e Jogos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 6H9a6 6 0 00-6 6v3a2 2 0 002 2h1.5a1.5 1.5 0 001.5-1.5V14a1 1 0 011-1h6a1 1 0 011 1v1.5a1.5 1.5 0 001.5 1.5H19a2 2 0 002-2v-3a6 6 0 00-6-6zM6 11h4M8 9v4m8-2h.01M18 13h.01" />
        </svg>
      )
    },
    {
      name: 'Áudio & Som',
      id: 'audio',
      desc: 'Headsets, Fones e Caixas',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      )
    },
    {
      name: 'Acessórios',
      id: 'acessorios',
      desc: 'Teclados, Mouses e Cabos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      name: 'Redes & Wi-Fi',
      id: 'redes',
      desc: 'Roteadores e Adaptadores',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      )
    },
    {
      name: 'Gadgets & Outros',
      id: 'gadgets',
      desc: 'Smartwatches e Inovações',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  return (
    <div className="site-background relative min-h-screen overflow-hidden text-white">
      {/* Background Mesh Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[34rem] w-[55rem] rounded-full bg-[radial-gradient(circle,_rgba(171,219,37,0.14)_0%,_rgba(10,18,6,0.06)_50%,_transparent_75%)] blur-3xl" />
        <div className="absolute top-[32rem] right-[-10rem] h-[30rem] w-[35rem] rounded-full bg-[radial-gradient(circle,_rgba(171,219,37,0.08)_0%,_transparent_70%)] blur-3xl" />
        <div className="absolute top-[65rem] left-[-10rem] h-[28rem] w-[32rem] rounded-full bg-[radial-gradient(circle,_rgba(171,219,37,0.07)_0%,_transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="scale-up-ver-bottom inline-flex items-center gap-2 rounded-full border border-[#ABDB25]/30 bg-[#ABDB25]/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#d7f58d] mb-6 shadow-lg shadow-[#ABDB25]/5 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-[#ABDB25] animate-ping" />
            Produtos e serviços de tecnologia em um só lugar
          </div>

          {/* Heading */}
          <h1 className="scale-up-ver-bottom text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.08]">
            Compre, venda e troque <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-white via-[#d7f58d] to-[#ABDB25] bg-clip-text text-transparent">
              tecnologia sem intermediários.
            </span>
          </h1>

          <p className="scale-up-ver-bottom text-base sm:text-xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
            Encontre computadores, smartphones e componentes ou contrate especialistas para cuidar da sua tecnologia.
          </p>

          {/* Hero Quick Search Bar */}
          <form onSubmit={handleHeroSearch} className="scale-up-ver-bottom max-w-2xl mx-auto mb-6">
            <div className="relative flex items-center rounded-2xl border border-white/15 bg-[#121612]/90 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl focus-within:border-[#ABDB25] focus-within:ring-2 focus-within:ring-[#ABDB25]/20 transition-all">
              <div className="pl-4 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="O que você está procurando hoje? Ex: RTX 4060, iPhone 14, PS5..."
                className="w-full bg-transparent px-3 py-3 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-[#ABDB25] px-5 sm:px-7 py-3 text-xs sm:text-sm font-extrabold text-black hover:bg-white transition-all duration-200 shadow-lg shadow-[#ABDB25]/20"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* Quick Search Tags */}
          <div className="scale-up-ver-bottom flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
            <span className="font-semibold text-gray-500">Mais buscados:</span>
            {['iPhone', 'Notebook Gamer', 'RTX', 'PlayStation 5', 'Monitor 144Hz'].map((tag) => (
              <Link
                key={tag}
                href={`/produtos?search=${encodeURIComponent(tag)}`}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-gray-300 hover:border-[#ABDB25]/50 hover:text-[#ABDB25] transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Benefits Bar */}
      <section className="relative border-y border-white/[0.08] bg-[#0c100c]/80 backdrop-blur-md py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-center gap-3 p-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ABDB25]/10 border border-[#ABDB25]/30 text-[#ABDB25]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">Pagamento Seguro</p>
                <p className="text-[11px] sm:text-xs text-gray-400">Dinheiro retido até você aprovar</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ABDB25]/10 border border-[#ABDB25]/30 text-[#ABDB25]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">Negocie no Chat</p>
                <p className="text-[11px] sm:text-xs text-gray-400">Converse direto com o vendedor</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ABDB25]/10 border border-[#ABDB25]/30 text-[#ABDB25]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">Taxa Zero de Anúncio</p>
                <p className="text-[11px] sm:text-xs text-gray-400">Publique gratuitamente</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ABDB25]/10 border border-[#ABDB25]/30 text-[#ABDB25]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">Pronta Entrega</p>
                <p className="text-[11px] sm:text-xs text-gray-400">Produtos reais com estoque visível</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Explorer Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#ABDB25]">Navegue por Departamentos</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Categorias em Alta</h2>
          </div>
          <Link href="/produtos" className="text-xs sm:text-sm font-semibold text-[#ABDB25] hover:underline flex items-center gap-1">
            Ver todas <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/produtos?categoria=${cat.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#121613]/90 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#ABDB25]/60 hover:bg-[#161c14] hover:shadow-xl hover:shadow-[#ABDB25]/10"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ABDB25]/10 border border-[#ABDB25]/25 group-hover:bg-[#ABDB25]/20 group-hover:border-[#ABDB25]/50 group-hover:scale-105 transition-all">
                  {cat.icon}
                </div>
                <span className="text-gray-500 group-hover:text-[#ABDB25] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="font-bold text-sm sm:text-base text-white group-hover:text-[#ABDB25] transition-colors">
                  {cat.name}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-8 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ABDB25]"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#ABDB25]">Vitrine da Comunidade</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Produtos Recentes</h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Os últimos anúncios publicados e disponíveis para compra</p>
          </div>
          <Link
            href="/produtos"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:border-[#ABDB25] hover:text-[#ABDB25] transition-all"
          >
            Explorar catálogo completo <span>→</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-[#121612] p-3 aspect-[3/4] animate-pulse flex flex-col justify-between">
                <div className="w-full aspect-square bg-gray-800/60 rounded-xl" />
                <div className="space-y-2 mt-3">
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-5 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : produtos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {produtos.map((produto, index) => {
              const imageUrl = getMainImage(produto.imagem);
              const isEsgotado = Number(produto.estoque) <= 0;
              const precoNum = Number(produto.preco) || 0;
              const parcela = precoNum > 0 ? (precoNum / 10).toFixed(2) : '0.00';

              return (
                <Link
                  href={`/produtos/${produto.id_produto}`}
                  key={produto.id_produto || index}
                  className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#121612]/90 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ABDB25]/60 hover:shadow-2xl hover:shadow-[#ABDB25]/15"
                >
                  {/* Image Container with Badges */}
                  <div className="aspect-square bg-[#0b0e0c] relative overflow-hidden flex items-center justify-center">
                    {/* Status Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      {isEsgotado ? (
                        <span className="rounded-md bg-red-600/90 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-sm shadow-md">
                          Esgotado
                        </span>
                      ) : (
                        <span className="rounded-md bg-black/70 border border-[#ABDB25]/40 px-2 py-0.5 text-[10px] font-bold text-[#d7f58d] backdrop-blur-sm shadow-md">
                          Disponível
                        </span>
                      )}
                    </div>

                    {imageUrl ? (
                      <ImageWithFallback
                        src={imageUrl}
                        alt={produto.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[11px]">Sem foto</span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
                    <div>
                      {produto.categoria && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                          {produto.categoria}
                        </span>
                      )}
                      <h3 className="font-bold text-white text-xs sm:text-sm leading-snug line-clamp-2 mb-2 group-hover:text-[#ABDB25] transition-colors">
                        {produto.nome}
                      </h3>
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/[0.06]">
                      <div className="text-[#ABDB25] text-base sm:text-lg font-extrabold">
                        {formatPrice(produto.preco)}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-gray-400">
                        em até <strong className="text-gray-200">10x de R$ {parcela}</strong>
                      </p>

                      <div className="mt-3 w-full rounded-xl bg-white/[0.06] py-2 text-center text-xs font-bold text-gray-200 group-hover:bg-[#ABDB25] group-hover:text-black transition-all">
                        Ver Anúncio
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#121612] border border-white/10 rounded-3xl p-8 max-w-xl mx-auto">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-white/[0.05] text-[#ABDB25] mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Nenhum produto publicado no momento</h3>
            <p className="text-sm text-gray-400 mb-6">Seja o primeiro a anunciar seu smartphone, videogame ou notebook na comunidade!</p>
            <Link
              href="/anunciar"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ABDB25] px-6 py-3 font-extrabold text-black hover:bg-white transition-all shadow-xl shadow-[#ABDB25]/20"
            >
              Publicar primeiro produto
            </Link>
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
          <div><span className="text-[10px] font-extrabold tracking-[0.18em] text-[#ABDB25]">SUPORTE ESPECIALIZADO</span><h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">Tecnologia também é serviço.</h2><p className="text-sm text-gray-400 mt-2">Do primeiro parafuso ao Wi-Fi funcionando melhor.</p></div>
          <Link href="/servicos" className="inline-flex items-center gap-2 text-sm font-bold text-[#d7f58d] hover:text-white">Explorar todos os serviços <span>→</span></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Montagem de PC', 'Compatibilidade, montagem e testes completos.', 'montagem'],
            ['Suporte técnico', 'Soluções remotas ou presenciais para o dia a dia.', 'suporte'],
            ['Redes e Wi-Fi', 'Mais cobertura, estabilidade e segurança.', 'redes'],
            ['Manutenção', 'Limpeza, upgrades e otimização do equipamento.', 'manutencao']
          ].map(([title, description, category]) => (
            <Link key={category} href={`/servicos?categoria=${category}`} className="group rounded-2xl border border-white/10 bg-[#141a15] p-5 hover:border-[#ABDB25]/60 hover:-translate-y-0.5 transition-all">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ABDB25]/10 text-[#ABDB25] font-extrabold">+</span>
              <h3 className="text-base font-bold text-white mt-5 group-hover:text-[#d7f58d]">{title}</h3>
              <p className="text-xs leading-relaxed text-gray-400 mt-2">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Seller Callout Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-[#ABDB25]/30 bg-gradient-to-br from-[#121a0e] via-[#0d120d] to-[#070907] p-8 sm:p-12 shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <span className="rounded-full bg-[#ABDB25]/20 border border-[#ABDB25]/40 px-3 py-1 text-xs font-bold text-[#d7f58d]">
              Ganhe dinheiro com o que não usa
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-4 mb-3 leading-tight">
              Tem eletrônicos parados em casa? Anuncie hoje na EHtech.
            </h2>
            <p className="text-sm sm:text-base text-gray-300 mb-6 leading-relaxed">
              Crie seu anúncio em menos de 2 minutos. Receba propostas pelo chat, negocie com compradores verificados e venda com total segurança.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/anunciar"
                className="rounded-xl bg-[#ABDB25] px-6 py-3.5 text-sm font-extrabold text-black hover:bg-white transition-all shadow-xl shadow-[#ABDB25]/20"
              >
                Anunciar Gratuitamente
              </Link>
              <Link
                href="/sobre"
                className="rounded-xl border border-white/20 bg-white/[0.05] px-6 py-3.5 text-sm font-semibold text-white hover:border-[#ABDB25] hover:text-[#ABDB25] transition-all"
              >
                Como funciona a garantia
              </Link>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 top-0 hidden lg:flex items-center pr-12 pointer-events-none opacity-25">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-80 w-80 text-[#ABDB25]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}
