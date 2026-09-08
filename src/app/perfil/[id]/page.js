'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getApiUrl } from '../../../lib/api';

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

export default function SellerProfile() {
  const router = useRouter();
  const params = useParams();
  const [seller, setSeller] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState({ media: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id);
      } catch (e) {}
    }
  }, []);

  const fetchSellerData = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch all products
      const produtosRes = await fetch(getApiUrl('/produtos'), { headers });
      const produtosData = await produtosRes.json();
      
      // Filter products by this seller
      const sellerProducts = Array.isArray(produtosData) ? produtosData.filter(p => p.vendedor_id === parseInt(params.id)) : [];
      setProdutos(sellerProducts);

      // Obter dados públicos do vendedor
      const userRes = await fetch(getApiUrl(`/usuarios/${params.id}/publico`));
      if (userRes.ok) {
        const userData = await userRes.json();
        setSeller(userData);
      } else if (sellerProducts.length > 0) {
        setSeller({
          username: sellerProducts[0].vendedor,
          id_usuario: sellerProducts[0].vendedor_id,
          foto: null
        });
      }

      // Buscar avaliações do vendedor
      const avaliacoesRes = await fetch(getApiUrl(`/avaliacoes/usuario/${params.id}`));
      if (avaliacoesRes.ok) {
        const avaliacoesData = await avaliacoesRes.json();
        setAvaliacoes(avaliacoesData);
      }
    } catch (err) {
      setError('Erro ao carregar dados do vendedor');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSellerData();
  }, [fetchSellerData]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} className={`text-xl ${i < Math.round(rating) ? 'text-[#ABDB25]' : 'text-gray-600'}`}>
        ★
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <div className="text-[#ABDB25] text-xl animate-pulse">Carregando perfil...</div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Vendedor não encontrado'}</p>
          <Link href="/produtos" className="text-[#ABDB25] hover:underline">Voltar aos produtos</Link>
        </div>
      </div>
    );
  }

  const isSelf = currentUserId && (Number(currentUserId) === Number(seller.id_usuario || params.id));

  return (
    <div className="site-background min-h-screen text-white pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back button */}
        <Link href="/produtos" className="inline-flex items-center text-gray-400 hover:text-[#ABDB25] mb-6 transition-colors">
          ← Voltar aos produtos
        </Link>

        {/* Seller Info Card */}
        <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-8 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Seller Avatar */}
            <div className="relative shrink-0">
              {seller.foto && !imgError && isValidImageUrl(seller.foto) ? (
                <img
                  src={seller.foto}
                  alt={seller.username || 'Vendedor'}
                  onError={() => setImgError(true)}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#ABDB25] shadow-lg shadow-[#ABDB25]/20 bg-gray-800"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#ABDB25] flex items-center justify-center text-black text-4xl font-bold shadow-lg shadow-[#ABDB25]/20">
                  {seller.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            
            {/* Seller Details */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{seller.nome || seller.username}</h1>
              {seller.nome && <p className="text-gray-400 text-sm mb-2">@{seller.username}</p>}
              
              {/* Rating */}
              <div className="flex items-center justify-center md:justify-start gap-2">
                <div className="flex">
                  {renderStars(parseFloat(avaliacoes.media))}
                </div>
                <span className="text-xl font-bold text-[#ABDB25]">{avaliacoes.media}</span>
                <span className="text-gray-400">({avaliacoes.total} {avaliacoes.total === 1 ? 'avaliação' : 'avaliações'})</span>
              </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex flex-col sm:flex-row md:flex-col items-center gap-3">
              <div className="text-center bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-3 w-full">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Anúncios</p>
                <p className="text-2xl font-bold text-white">{produtos.length}</p>
              </div>

              {!isSelf && (
                <Link
                  href={`/mensagens?vendedor=${seller.id_usuario || params.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#ABDB25] hover:bg-white text-black font-bold rounded-xl shadow-lg hover:shadow-[#ABDB25]/30 transition-all text-center text-sm"
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

        {/* Products Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Produtos de {seller.username}</h2>
          
          {produtos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {produtos.map((produto, index) => (
                <div 
                  key={produto.id_produto || index}
                  className="bg-gray-900/95 border border-gray-700 rounded-2xl overflow-hidden hover:border-[#ABDB25] hover:shadow-lg hover:shadow-[#ABDB25]/20 transition-all duration-300 group"
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
                      <p className="text-[#ABDB25] text-xl font-bold">
                        {formatPrice(produto.preco)}
                      </p>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-8 text-center">
              <p className="text-gray-400">Este vendedor ainda não tem produtos anunciados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
