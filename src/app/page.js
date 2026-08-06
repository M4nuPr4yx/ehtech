'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ImageWithFallback from './complements/ImageWithFallback';

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

export default function Home() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const res = await fetch('http://localhost:3000/produtos');
        
        if (res.ok) {
          const data = await res.json();
          // Produtos disponíveis aparecem primeiro; esgotados ficam no fim.
          const ordenados = [...data].sort((a, b) => {
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(171,219,37,0.2),_transparent_34%),linear-gradient(to_bottom,_#111,_#000_48%,_rgba(171,219,37,0.2))] text-white pt-16 pb-20">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="mb-8">
          <span className="mb-5 inline-flex rounded-full border border-[#ABDB25]/30 bg-[#ABDB25]/10 px-4 py-1.5 text-sm font-semibold text-[#d7f58d]">Seu marketplace de tecnologia</span>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-white via-[#d8f88e] to-[#ABDB25] bg-clip-text text-transparent drop-shadow-2xl">
            Tecnologia que encontra você.
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto opacity-90 leading-relaxed">
            A plataforma para compra, venda e troca de produtos de tecnologia.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Link 
            href="/sobre" 
            className="inline-flex items-center px-6 py-3 bg-[#ABDB25] hover:bg-white hover:text-black font-bold rounded-full shadow-2xl hover:shadow-3xl hover:-translate-y-2 transition-all duration-300"
          >
            Descubra mais
          </Link>
          <Link 
            href="/produtos" 
            className="inline-flex items-center px-6 py-3 border-2 border-[#ABDB25]/50 text-[#ABDB25] hover:bg-[#ABDB25] hover:text-black font-bold rounded-full transition-all duration-300"
          >
            Ver produtos
          </Link>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"><p className="font-bold">Compra descomplicada</p><p className="mt-1 text-sm text-gray-400">Encontre o que procura.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"><p className="font-bold">Venda sem enrolação</p><p className="mt-1 text-sm text-gray-400">Anuncie em poucos passos.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"><p className="font-bold">Estoque visível</p><p className="mt-1 text-sm text-gray-400">Saiba o que está disponível.</p></div>
        </div>
      </div>

      {/* Recent Products Section */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white">Produtos Recentes</h2>
          <Link href="/produtos" className="text-[#ABDB25] hover:underline text-sm">
            Ver todos →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-2xl aspect-square animate-pulse" />
            ))}
          </div>
        ) : produtos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {produtos.map((produto, index) => (
              <div 
                key={produto.id_produto || index}
                className="bg-[#15181b]/95 border border-white/10 rounded-2xl overflow-hidden hover:border-[#ABDB25]/70 hover:shadow-xl hover:shadow-[#ABDB25]/15 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
              >
{/* Product Image */}
                <div className="aspect-square bg-gray-800 relative overflow-hidden">
                  {isValidImageUrl(produto.imagem) ? (
                    <ImageWithFallback
                      src={produto.imagem} 
                      alt={produto.nome}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 md:p-4">
                  <h3 className="font-bold text-white text-sm md:text-base truncate mb-1 group-hover:text-[#ABDB25] transition-colors">
                    {produto.nome}
                  </h3>
                  <p className="text-[#ABDB25] text-lg md:text-xl font-bold">
                    {formatPrice(produto.preco)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-900/30 border border-gray-800 rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-400 mb-4">Nenhum produto disponível no momento</p>
            <Link href="/anunciar" className="text-[#ABDB25] hover:underline">
              Anuncie seu primeiro produto →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
