'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import ImageWithFallback from '../complements/ImageWithFallback';
import { getMainImage, isValidImageUrl } from '../complements/imageHelper';
import { getApiUrl } from '../../lib/api';

export default function Carrinho() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [orderError, setOrderError] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  
  // Check login status and load cart on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/?login=1&next=%2Fcarrinho');
      return;
    }
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      // O carrinho é restaurado uma única vez ao carregar a página.
      setCart(JSON.parse(savedCart));
    }
    setLoading(false);
  }, [router]);

  // Save cart to localStorage
  const saveCart = (newCart) => {
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
  };

  // Auto-calculate total
  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const price = parseFloat(item.preco) || 0;
      const quantity = parseInt(item.quantidade) || 0;
      return total + (price * quantity);
    }, 0);
  };

  // Update quantity
  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const newCart = [...cart];
    newCart[index].quantidade = newQuantity;
    saveCart(newCart);
  };

  // Remove item from cart
  const removeItem = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    saveCart(newCart);
    setMessage('Item removido do carrinho!');
    setTimeout(() => setMessage(''), 2000);
  };

  // Clear entire cart
  const clearCart = () => {
    if (confirm('Tem certeza que deseja limpar o carrinho?')) {
      saveCart([]);
      setMessage('Carrinho limpo!');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const placeOrder = async () => {
    if (!window.confirm('Registrar este pedido? Nenhuma cobrança será realizada; você combinará os próximos passos com os vendedores.')) return;
    setSubmittingOrder(true);
    setOrderError('');
    try {
      const response = await fetch(getApiUrl('/pedidos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ itens: cart.map((item) => ({ produto_id: item.id_produto, quantidade: item.quantidade })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.mensagem || 'Não foi possível registrar o pedido.');
      localStorage.removeItem('cart');
      setCart([]);
      router.push('/perfil?aba=historico&pedido=1');
    } catch (error) {
      setOrderError(error.message || 'Não foi possível registrar o pedido.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <div className="text-[#ABDB25] text-xl">Carregando...</div>
      </div>
    );
  }

  const total = calculateTotal();

  return (
    <div className="site-background min-h-screen text-white pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#ABDB25] mb-2">Carrinho de Compras</h1>
          <p className="text-gray-400">Gerencie seus produtos antes de finalizar</p>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-green-500/20 border border-green-500/30 p-4 rounded-xl text-green-300 mb-6">
            {message}
          </div>
        )}
        {orderError && <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/20 p-4 text-red-300" role="alert">{orderError}</div>}

        {/* Empty Cart - Show link to products */}
        {cart.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5m4 8v1a2 2 0 002 2h.01M9 20a2 2 0 104 0M15 20a2 2 0 104 0" />
            </svg>
            <p className="text-gray-400 text-lg mb-4">Seu carrinho está vazio</p>
            <Link href="/produtos" className="inline-block px-6 py-3 bg-[#ABDB25] hover:bg-white hover:text-black text-black font-bold rounded-xl transition-all">
              Ver Produtos
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items List */}
            <div className="space-y-4 mb-8">
              {cart.map((item, index) => (
                <div 
                  key={item.id_produto || index}
                  className="bg-gray-900/95 border border-gray-700 rounded-2xl p-4 flex flex-col md:flex-row gap-4"
                >
                  {/* Product Image */}
                  <div className="w-full md:w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-800">
                    {(() => {
                      const mainImg = getMainImage(item.imagem);
                      return isValidImageUrl(mainImg) ? (
                        <ImageWithFallback 
                          src={mainImg} 
                          alt={item.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link href={`/produtos/${item.id_produto}`} className="text-white hover:text-[#ABDB25] font-bold text-lg">
                        {item.nome}
                      </Link>
                      <p className="text-gray-400 text-sm line-clamp-1">{item.descricao}</p>
                    </div>
                    <div className="text-[#ABDB25] font-bold text-xl">
                      {formatPrice(item.preco)}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end justify-between">
                    <button 
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300 p-2"
                      title="Remover item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    {/* Quantity +/- */}
                    <div className="flex items-center gap-2 bg-gray-800 rounded-xl p-1">
                      <button 
                        onClick={() => updateQuantity(index, item.quantidade - 1)}
                        disabled={item.quantidade <= 1}
                        className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-white font-bold">{item.quantidade}</span>
                      <button 
                        onClick={() => updateQuantity(index, item.quantidade + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal for this item */}
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">Subtotal:</p>
                      <p className="text-white font-bold">
                        {formatPrice((parseFloat(item.preco) || 0) * item.quantidade)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Section */}
            <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-lg">Total ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
                <span className="text-3xl font-bold text-[#ABDB25]">{formatPrice(total)}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={submittingOrder}
                  className="w-full py-4 bg-[#ABDB25] hover:bg-white text-black font-bold rounded-xl shadow-xl disabled:opacity-60 disabled:cursor-wait transition-colors"
                >
                  {submittingOrder ? 'Registrando pedido…' : 'Registrar Pedido'}
                </button>
                <p className="text-center text-xs text-gray-400">Sem cobrança online: o pedido fica salvo e os vendedores são notificados.</p>
                <div className="flex gap-3">
                  <Link href="/produtos" className="flex-1 py-3 text-center border border-gray-600 text-white rounded-xl hover:bg-gray-800 transition-all">
                    Continuar Comprando
                  </Link>
                  <button 
                    onClick={clearCart}
                    className="flex-1 py-3 text-center border border-red-600 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                  >
                    Limpar Carrinho
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
