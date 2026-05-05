'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3000/produtos', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (res.ok) {
          const data = await res.json();
          // Get only the 8 most recent products
          setProdutos(data.slice(0, 8));
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
    <div className="min-h-screen bg-gradient-to-b from-[#111] via-black to-[#ABDB25]/30 text-white pt-20 pb-20">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight bg-gradient-to-r from-[#ABDB25]/90 to-[#ABDB25] bg-clip-text text-transparent drop-shadow-2xl">
            EHtech
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
                className="bg-gray-900/95 border border-gray-700 rounded-2xl overflow-hidden hover:border-[#ABDB25] hover:shadow-lg hover:shadow-[#ABDB25]/20 transition-all duration-300 group cursor-pointer"
              >
{/* Product Image */}
                <div className="aspect-square bg-gray-800 relative overflow-hidden">
                  {isValidImageUrl(produto.imagem) ? (
                    <img 
                      src={produto.imagem} 
                      alt={produto.nome}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { e.target.style.display = 'none'; }}
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
