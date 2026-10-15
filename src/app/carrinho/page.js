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
      <div className="site-background min-h-screen text-foreground pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex min-h-[23rem] items-center justify-center rounded-2xl border border-line bg-surface">
            <div className="text-accent text-xl" role="status">Carregando carrinho…</div>
          </div>
        </div>
      </div>
    );
  }

  const total = calculateTotal();

  return (
    <div className="site-background min-h-screen text-foreground pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-accent mb-2">Seu carrinho</h1>
          <p className="text-muted">Gerencie seus produtos antes de finalizar</p>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-success-soft border border-success p-4 rounded-xl text-success mb-6">
            {message}
          </div>
        )}
        {orderError && <div className="mb-6 rounded-xl border border-danger bg-danger-soft p-4 text-danger" role="alert">{orderError}</div>}

        {/* Empty Cart - Show link to products */}
        {cart.length === 0 ? (
          <div className="bg-surface border border-line rounded-2xl p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5m4 8v1a2 2 0 002 2h.01M9 20a2 2 0 104 0M15 20a2 2 0 104 0" />
            </svg>
            <p className="text-muted text-lg mb-4">Seu carrinho está vazio</p>
            <Link href="/produtos" className="inline-block px-6 py-3 bg-accent-fill hover:brightness-110 hover:text-accent-contrast text-accent-contrast font-bold rounded-xl transition-all">
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
                  className="bg-surface border border-line rounded-2xl p-4 flex flex-col md:flex-row gap-4"
                >
                  {/* Product Image */}
                  <div className="w-full md:w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-surface-raised">
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
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link href={`/produtos/${item.id_produto}`} className="text-foreground hover:text-accent font-bold text-lg">
                        {item.nome}
                      </Link>
                      <p className="text-muted text-sm line-clamp-1">{item.descricao}</p>
                    </div>
                    <div className="text-accent font-bold text-xl">
                      {formatPrice(item.preco)}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end justify-between">
                    <button 
                      onClick={() => removeItem(index)}
                      className="text-danger hover:text-danger p-2"
                      title="Remover item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    {/* Quantity +/- */}
                    <div className="flex items-center gap-2 bg-surface-raised rounded-xl p-1">
                      <button 
                        onClick={() => updateQuantity(index, item.quantidade - 1)}
                        disabled={item.quantidade <= 1}
                        className="w-8 h-8 flex items-center justify-center bg-surface hover:bg-surface rounded-lg text-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-foreground font-bold">{item.quantidade}</span>
                      <button 
                        onClick={() => updateQuantity(index, item.quantidade + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-surface hover:bg-surface rounded-lg text-foreground font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal for this item */}
                    <div className="text-right">
                      <p className="text-muted text-xs">Subtotal:</p>
                      <p className="text-foreground font-bold">
                        {formatPrice((parseFloat(item.preco) || 0) * item.quantidade)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Section */}
            <div className="bg-surface border border-line rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted text-lg">Total ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
                <span className="text-3xl font-bold text-accent">{formatPrice(total)}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={submittingOrder}
                  className="w-full py-4 bg-accent-fill hover:brightness-110 text-accent-contrast font-bold rounded-xl shadow-xl disabled:opacity-60 disabled:cursor-wait transition-colors"
                >
                  {submittingOrder ? 'Registrando pedido…' : 'Registrar Pedido'}
                </button>
                <p className="text-center text-xs text-muted">Sem cobrança online: o pedido fica salvo e os vendedores são notificados.</p>
                <div className="flex gap-3">
                  <Link href="/produtos" className="flex-1 py-3 text-center border border-line text-foreground rounded-xl hover:bg-surface-raised transition-all">
                    Continuar Comprando
                  </Link>
                  <button 
                    onClick={clearCart}
                    className="flex-1 py-3 text-center border border-danger text-danger rounded-xl hover:bg-danger-soft hover:text-danger transition-all"
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
