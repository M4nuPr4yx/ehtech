'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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

export default function ProdutoDetalhes() {
  const router = useRouter();
  const params = useParams();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Rating state
  const [avaliacoes, setAvaliacoes] = useState({ avaliacoes: [], media: 0, total: 0 });
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  
  // Edit state
  const [isOwner, setIsOwner] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ nome: '', descricao: '', preco: '', imagem: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  
  // User state
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchProduto();
      fetchAvaliacoes();
    }
  }, [params.id]);

  useEffect(() => {
    if (produto && user) {
      setIsOwner(produto.vendedor_id === user.id || produto.vendedor === user.email);
    }
  }, [produto, user]);

  const fetchProduto = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/produtos`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const found = data.find(p => p.id_produto === parseInt(params.id));
      if (found) {
        setProduto(found);
        setEditData({
          nome: found.nome,
          descricao: found.descricao,
          preco: found.preco,
          imagem: found.imagem || ''
        });
      } else {
        setError('Produto não encontrado');
      }
    } catch (err) {
      setError('Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvaliacoes = async () => {
    try {
      const res = await fetch(`http://localhost:3000/avaliacoes/produto/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setAvaliacoes(data);
      }
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    }
  };

  const submitRating = async () => {
    if (!userRating) return;
    setSubmittingRating(true);
    setRatingMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/avaliacoes', {
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
      const res = await fetch(`http://localhost:3000/produtos/${params.id}`, {
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
        setProduto({ ...produto, ...editData });
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

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.findIndex(item => item.id_produto === produto.id_produto);
    if (existing >= 0) {
      cart[existing].quantidade += 1;
    } else {
      cart.push({ ...produto, quantidade: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Produto adicionado ao carrinho!');
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
        className={`text-2xl ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform ${i < rating ? 'text-[#ABDB25]' : 'text-gray-600'}`}
      >
        ★
      </button>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-[#ABDB25] text-xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (error || !produto) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Produto não encontrado'}</p>
          <Link href="/produtos" className="text-[#ABDB25] hover:underline">Voltar aos produtos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111] via-black to-[#ABDB25]/30 text-white pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back button */}
        <Link href="/produtos" className="inline-flex items-center text-gray-400 hover:text-[#ABDB25] mb-6 transition-colors">
          ← Voltar aos produtos
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-gray-900/95 border border-gray-700 rounded-2xl overflow-hidden">
            {isValidImageUrl(produto.imagem) ? (
              <img 
                src={produto.imagem} 
                alt={produto.nome}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="aspect-square flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {editMode ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-[#ABDB25] mb-4">Editar Produto</h2>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nome</label>
                  <input
                    type="text"
                    value={editData.nome}
                    onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-[#ABDB25] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Preço</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.preco}
                    onChange={(e) => setEditData({ ...editData, preco: e.target.value })}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-[#ABDB25] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                  <textarea
                    value={editData.descricao}
                    onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-[#ABDB25] focus:outline-none h-32"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Imagem (URL ou Base64)</label>
                  <input
                    type="text"
                    value={editData.imagem}
                    onChange={(e) => setEditData({ ...editData, imagem: e.target.value })}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-[#ABDB25] focus:outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={saveEdit}
                    disabled={savingEdit}
                    className="flex-1 py-3 bg-[#ABDB25] hover:bg-white text-black font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {savingEdit ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setEditMessage(''); }}
                    className="px-6 py-3 border border-gray-600 text-white rounded-xl hover:bg-gray-800 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
                {editMessage && (
                  <p className={`p-3 rounded-xl text-center ${editMessage.includes('sucesso') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {editMessage}
                  </p>
                )}
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">{produto.nome}</h1>
                <p className="text-[#ABDB25] text-3xl font-bold mb-4">
                  {formatPrice(produto.preco)}
                </p>
                <p className="text-gray-300 mb-6">{produto.descricao}</p>
                
                {/* Seller info */}
                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 mb-6">
                  <p className="text-gray-400 text-sm">Vendido por</p>
                  <Link href={`/perfil/${produto.vendedor_id}`} className="text-[#ABDB25] hover:underline font-bold">
                    {produto.vendedor}
                  </Link>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={addToCart}
                    className="flex-1 py-3 bg-[#ABDB25] hover:bg-white hover:text-black text-black font-bold rounded-xl transition-all"
                  >
                    Adicionar ao Carrinho
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-6 py-3 border border-gray-600 text-white rounded-xl hover:bg-gray-800 transition-all"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ratings Section */}
        <div className="mt-12 bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Avaliações</h2>
          
          {/* Average rating */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex">
              {renderStars(Math.round(parseFloat(avaliacoes.media)))}
            </div>
            <span className="text-xl font-bold text-[#ABDB25]">{avaliacoes.media}</span>
            <span className="text-gray-400">({avaliacoes.total} avaliação{avaliacoes.total !== 1 ? 'ções' : ''})</span>
          </div>

          {/* Submit rating (if logged in) */}
          {isLoggedIn && !isOwner && (
            <div className="border-t border-gray-700 pt-6 mt-6">
              <h3 className="text-lg font-bold text-white mb-3">Avaliar este produto</h3>
              <div className="flex gap-2 mb-3">
                {renderStars(userRating, true, (rating) => setUserRating(rating))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comentário (opcional)"
                className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none h-24 mb-3"
              />
              <button
                onClick={submitRating}
                disabled={!userRating || submittingRating}
                className="py-3 px-6 bg-[#ABDB25] hover:bg-white text-black font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {submittingRating ? 'Enviando...' : 'Enviar Avaliação'}
              </button>
              {ratingMessage && (
                <p className={`mt-3 p-3 rounded-xl ${ratingMessage.includes('sucesso') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {ratingMessage}
                </p>
              )}
            </div>
          )}

          {/* Reviews list */}
          {avaliacoes.avaliacoes && avaliacoes.avaliacoes.length > 0 && (
            <div className="border-t border-gray-700 pt-6 mt-6 space-y-4">
              {avaliacoes.avaliacoes.map((avaliacao, index) => (
                <div key={index} className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {renderStars(avaliacao.nota)}
                    </div>
                    <span className="text-gray-400 text-sm">por {avaliacao.avaliador_username}</span>
                  </div>
                  {avaliacao.comentario && (
                    <p className="text-gray-300">{avaliacao.comentario}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {avaliacoes.total === 0 && (
            <p className="text-gray-400">Este produto ainda não tem avaliações.</p>
          )}
        </div>
      </div>
    </div>
  );
}
