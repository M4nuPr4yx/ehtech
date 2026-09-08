'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ImageWithFallback from '../../complements/ImageWithFallback';
import { getMainImage, getProductImages, isValidImageUrl } from '../../complements/imageHelper';
import { getApiUrl } from '../../../lib/api';

// ImageGallery Component - galeria interativa com miniaturas
function ImageGallery({ images }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const validImages = Array.isArray(images) ? images.filter(isValidImageUrl) : [];

  if (validImages.length === 0) {
    return (
      <div className="aspect-square bg-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  const prev = () => setActiveIdx((i) => (i - 1 + validImages.length) % validImages.length);
  const next = () => setActiveIdx((i) => (i + 1) % validImages.length);

  return (
    <div className="flex flex-col gap-3">
      {/* Imagem Principal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden aspect-square group">
        <ImageWithFallback
          src={validImages[activeIdx]}
          alt={`Foto ${activeIdx + 1}`}
          className="w-full h-full object-contain p-2 transition-opacity duration-300"
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
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-[#ABDB25] text-white hover:text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próxima imagem"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-[#ABDB25] text-white hover:text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
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
              className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                idx === activeIdx
                  ? 'border-[#ABDB25] shadow-md shadow-[#ABDB25]/20'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <img
                src={url}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-contain bg-gray-800 p-0.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProdutoDetalhes() {
  const router = useRouter();
  const params = useParams();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartMessage, setCartMessage] = useState('');
  
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
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }, []);

  const fetchProduto = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/produtos/${params.id}`));
      if (res.ok) {
        const found = await res.json();
        setProduto(found);
        setEditData({
          nome: found.nome,
          descricao: found.descricao,
          preco: found.preco,
          imagem: found.imagem || ''
        });

        // Buscar foto e dados do vendedor
        if (found.vendedor_id) {
          try {
            const sellerRes = await fetch(getApiUrl(`/usuarios/${found.vendedor_id}/publico`));
            if (sellerRes.ok) {
              const sData = await sellerRes.json();
              setSellerInfo(sData);
            }
          } catch {}
        }
      } else {
        setError('Produto não encontrado');
      }
    } catch (err) {
      setError('Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchAvaliacoes = useCallback(async () => {
    if (!params.id) return;
    try {
      const res = await fetch(getApiUrl(`/avaliacoes/produto/${params.id}`));
      if (res.ok) {
        const data = await res.json();
        setAvaliacoes(data);
      }
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProduto();
    fetchAvaliacoes();
  }, [fetchProduto, fetchAvaliacoes]);

  const submitRating = async () => {
    if (!userRating) return;
    setSubmittingRating(true);
    setRatingMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl('/avaliacoes'), {
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
      const res = await fetch(getApiUrl(`/produtos/${params.id}`), {
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
    if (!isLoggedIn) {
      router.push(`/?login=1&next=${encodeURIComponent(`/produtos/${produto.id_produto}`)}`);
      return;
    }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.findIndex(item => item.id_produto === produto.id_produto);
    if (existing >= 0) {
      cart[existing].quantidade += 1;
    } else {
      cart.push({ ...produto, quantidade: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    setCartMessage('Produto adicionado ao carrinho!');
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
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <div className="text-[#ABDB25] text-xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (error || !produto) {
    return (
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Produto não encontrado'}</p>
          <Link href="/produtos" className="text-[#ABDB25] hover:underline">Voltar aos produtos</Link>
        </div>
      </div>
    );
  }

  const productImage = getMainImage(produto.imagem);

  return (
    <div className="site-background min-h-screen text-white pt-20 pb-20">
      {cartMessage && (
        <div className="fixed right-5 top-24 z-50 rounded-xl border border-green-500/40 bg-green-500/20 px-4 py-3 text-sm font-medium text-green-200 shadow-xl" role="status">
          {cartMessage}
          <button type="button" onClick={() => setCartMessage('')} className="ml-3 text-green-100 hover:text-white" aria-label="Fechar mensagem">×</button>
        </div>
      )}
      <div className="max-w-4xl mx-auto px-6">
        {/* Back button */}
        <Link href="/produtos" className="inline-flex items-center text-gray-400 hover:text-[#ABDB25] mb-6 transition-colors">
          ← Voltar aos produtos
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Galeria de Fotos do Produto */}
          <ImageGallery images={getProductImages(produto.imagem)} />

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
                <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {sellerInfo?.foto && isValidImageUrl(sellerInfo.foto) ? (
                        <img
                          src={sellerInfo.foto}
                          alt={produto.vendedor}
                          className="w-12 h-12 rounded-full object-cover border border-[#ABDB25] bg-gray-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#ABDB25] flex items-center justify-center text-black font-bold text-lg">
                          {produto.vendedor?.charAt(0).toUpperCase() || 'V'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider">Vendido por</p>
                      <Link href={`/perfil/${produto.vendedor_id}`} className="text-[#ABDB25] hover:underline font-bold text-lg">
                        {sellerInfo?.nome || produto.vendedor}
                      </Link>
                    </div>
                  </div>

                  {!isOwner && produto.vendedor_id && (
                    <Link
                      href={`/mensagens?vendedor=${produto.vendedor_id}&produto=${produto.id_produto}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-[#ABDB25] hover:text-black text-white text-sm font-semibold rounded-xl border border-gray-600 hover:border-[#ABDB25] transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      Conversar
                    </Link>
                  )}
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
            <span className="text-gray-400">({avaliacoes.total} {avaliacoes.total === 1 ? 'avaliação' : 'avaliações'})</span>
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
