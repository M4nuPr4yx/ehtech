'use client';
import { apiResponse } from '../../lib/api-request.js';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TechnicalComponentPicker from '../complements/TechnicalComponentPicker';
import OriginSelector from '../complements/OriginSelector';

export default function Anunciar() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('1');
  const [categoria, setCategoria] = useState('');
  const [componenteId, setComponenteId] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [requiresShipping, setRequiresShipping] = useState(true);
  const [imagens, setImagens] = useState([]); // Array de URLs das fotos
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const draftKey = useRef(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    Promise.resolve().then(() => {
      try {
        const id = Number(JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id);
        if (Number.isSafeInteger(id) && id > 0) {
          draftKey.current = `ehtech-anuncio-rascunho-${id}`;
          const saved = JSON.parse(sessionStorage.getItem(draftKey.current) || 'null');
          if (saved?.versao === 1 && typeof saved.nome === 'string' && typeof saved.descricao === 'string') {
            setNome(saved.nome.slice(0, 255)); setDescricao(saved.descricao.slice(0, 10000));
            setPreco(typeof saved.preco === 'string' ? saved.preco.slice(0, 20) : '');
            setEstoque(typeof saved.estoque === 'string' ? saved.estoque.slice(0, 4) : '1');
            setCategoria(typeof saved.categoria === 'string' ? saved.categoria.slice(0, 60) : '');
            setDraftRestored(true);
          }
        }
      } catch {}
      setLoading(false); setDraftReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (!draftReady || !draftKey.current) return;
    const timer = setTimeout(() => {
      try {
        if (!nome && !descricao && !preco && !categoria) sessionStorage.removeItem(draftKey.current);
        else sessionStorage.setItem(draftKey.current, JSON.stringify({ versao: 1, nome, descricao, preco, estoque, categoria }));
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [draftReady, nome, descricao, preco, estoque, categoria]);

  function clearDraft() {
    try { if (draftKey.current) sessionStorage.removeItem(draftKey.current); } catch {}
    setNome(''); setDescricao(''); setPreco(''); setEstoque('1'); setCategoria(''); setComponenteId(null); setDraftRestored(false);
  }

  // Handle price input with mask (BRL format)
  const handlePrecoChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setPreco('');
      return;
    }
    value = (parseInt(value, 10) / 100).toFixed(2);
    setPreco(value);
  };

  const formatPrecoDisplay = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Upload de múltiplas imagens para o servidor
  const handleFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (imagens.length + files.length > 8) {
      setMessage('Você pode adicionar no máximo 8 fotos por anúncio.');
      setMessageType('error');
      return;
    }

    // Validações
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setMessage(`O arquivo "${file.name}" não é uma imagem válida.`);
        setMessageType('error');
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        setMessage(`A imagem "${file.name}" ultrapassa o limite de 4MB.`);
        setMessageType('error');
        return;
      }
    }

    setUploadingImage(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      // Envia uma foto por requisição para respeitar o limite de 4,5 MB da Vercel.
      // No deploy, o backend grava cada arquivo no Blob persistente.
      const urls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('imagem', file);
        const res = await apiResponse('/upload/imagem', {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || 'Erro no upload das imagens');
        urls.push(data.url);
      }
      setImagens((prev) => [...prev, ...urls]);
    } catch (err) {
      setMessage('Erro ao subir imagem: ' + err.message);
      setMessageType('error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (indexToRemove) => {
    setImagens((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const makeCover = (indexToCover) => {
    setImagens((prev) => {
      const selected = prev[indexToCover];
      const rest = prev.filter((_, idx) => idx !== indexToCover);
      return [selected, ...rest];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (!nome.trim()) {
      setMessage('Nome do produto é obrigatório');
      setMessageType('error');
      return;
    }
    if (!descricao.trim()) {
      setMessage('Descrição é obrigatória');
      setMessageType('error');
      return;
    }
    if (!preco || parseFloat(preco) <= 0) {
      setMessage('Preço é obrigatório');
      setMessageType('error');
      return;
    }
    if (!categoria) {
      setMessage('Categoria é obrigatória');
      setMessageType('error');
      return;
    }

    if (requiresShipping && !origin) {
      setMessage('Selecione e confirme o endereço de origem do envio.');
      setMessageType('error');
      return;
    }
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await apiResponse('/produtos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim(),
          preco: parseFloat(preco),
          estoque: parseInt(estoque, 10) || 0,
          categoria,
          componente_id: componenteId,
          exige_entrega: requiresShipping,
          origem_endereco_id: origin?.id,
          origem_versao: origin?.versao,
          imagem: imagens.length > 0 ? imagens : null
        })
      });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN') {
          localStorage.removeItem('token');
          setMessage('Sessão expirada. Faça login novamente.');
          setMessageType('error');
          setTimeout(() => { router.replace('/?login=1&next=%2Fanunciar'); }, 2000);
          return;
        }
      }

      if (res.ok) {
        setMessage('Produto enviado com sucesso! O anúncio aguarda aprovação da moderação.');
        setMessageType('success');
        // Reset form
        try { if (draftKey.current) sessionStorage.removeItem(draftKey.current); } catch {}
        setDraftRestored(false);
        setNome('');
        setDescricao('');
        setPreco('');
        setEstoque('1');
      setCategoria('');
      setComponenteId(null);
        setImagens([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setMessage(data.mensagem || 'Erro ao publicar produto');
        setMessageType('error');
      }
    } catch (err) {
      setMessage(err.message || 'Não foi possível enviar o anúncio. Tente novamente.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="site-background min-h-screen text-foreground pt-12 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex min-h-[62rem] items-center justify-center rounded-3xl border border-line bg-surface p-6 shadow-2xl backdrop-blur-xl md:p-10">
            <div className="text-accent text-xl animate-pulse" role="status">Carregando formulário…</div>
          </div>
        </div>
      </div>
    );
  }

  const categorias = [
    { value: 'smartphones', label: 'Smartphones & Celulares' },
    { value: 'notebooks', label: 'Notebooks' },
    { value: 'computadores', label: 'Computadores & Desktops' },
    { value: 'tablets', label: 'Tablets' },
    { value: 'acessorios', label: 'Acessórios & Periféricos' },
    { value: 'gadgets', label: 'Gadgets & Smartwatches' },
    { value: 'games', label: 'Games & Consoles' },
    { value: 'redes', label: 'Redes e Roteadores' },
    { value: 'audio', label: 'Áudio & Fones' },
    { value: 'outros', label: 'Outros' }
  ];

  return (
    <div className="site-background min-h-screen text-foreground pt-12 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface backdrop-blur-xl border border-line rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="mb-8 border-b border-line pb-6">
            <h1 className="text-3xl font-extrabold text-foreground">
              Criar anúncio
            </h1>
            <p className="text-muted text-sm mt-1">
              Preencha os detalhes e adicione fotos. Seu anúncio será enviado para aprovação. Campos com * são obrigatórios.
            </p>
          </div>

          <section className="mb-5 space-y-2 rounded-xl border border-line bg-surface p-4" aria-label="Rascunho do anúncio"><p className="text-sm text-muted">Os campos de texto são salvos nesta aba para sua conta. Fotos e endereço de origem precisam ser revisados novamente após recarregar.</p>{draftRestored && <p role="status">Rascunho de texto restaurado.</p>}<button type="button" className="text-sm font-bold text-accent underline" onClick={clearDraft}>Limpar texto do rascunho</button></section>
          <OriginSelector value={origin} onChange={setOrigin} requiresShipping={requiresShipping} onShippingChange={setRequiresShipping} />
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-lg font-semibold">Informações do produto</h2>
            {/* Nome do Produto */}
            <div>
              <label htmlFor="product-name" className="block text-foreground font-semibold text-sm mb-2">
                Nome do Produto <span className="text-accent">*</span>
              </label>
              <input
                id="product-name"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Teclado Mecânico RGB Switch Blue"
                className="w-full p-4 bg-surface-raised border border-line rounded-2xl text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors text-sm"
                maxLength={100}
                required
              />
            </div>

            {/* Preço e Estoque */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="product-price" className="block text-foreground font-semibold text-sm mb-2">
                  Preço de Venda <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <input
                    id="product-price"
                    type="text"
                    value={formatPrecoDisplay(preco)}
                    onChange={handlePrecoChange}
                    placeholder="R$ 0,00"
                    className="w-full p-4 bg-surface-raised border border-line rounded-2xl text-foreground font-bold placeholder-muted focus:border-accent focus:outline-none transition-colors text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="product-stock" className="block text-foreground font-semibold text-sm mb-2">
                  Estoque Disponível <span className="text-accent">*</span>
                </label>
                <input
                  id="product-stock"
                  type="number"
                  min="1"
                  max="9999"
                  value={estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                  className="w-full p-4 bg-surface-raised border border-line rounded-2xl text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors text-sm"
                  required
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label htmlFor="product-category" className="block text-foreground font-semibold text-sm mb-2">
                Categoria <span className="text-accent">*</span>
              </label>
              <select
                id="product-category"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full p-4 bg-surface-raised border border-line rounded-2xl text-foreground focus:border-accent focus:outline-none transition-colors text-sm"
                required
              >
                <option value="" className="bg-surface-raised">Selecione uma categoria</option>
                {categorias.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-surface-raised">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <TechnicalComponentPicker value={componenteId} onChange={setComponenteId} />

            {/* Descrição */}
            <div>
              <label htmlFor="product-description" className="block text-foreground font-semibold text-sm mb-2">
                Descrição Completa <span className="text-accent">*</span>
              </label>
              <textarea
                id="product-description"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={5}
                placeholder="Descreva o estado do item, especificações técnicas, tempo de uso, garantias..."
                className="w-full p-4 bg-surface-raised border border-line rounded-2xl text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors text-sm leading-relaxed"
                required
              />
            </div>

            <h2 className="text-lg font-semibold pt-4 border-t border-line">Fotos do produto</h2>
            {/* Seção de Fotos Múltiplas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="product-images" className="block text-foreground font-semibold text-sm">
                  Fotos do Produto ({imagens.length}/8)
                </label>
                <span className="text-xs text-muted">
                  A primeira foto será a capa principal
                </span>
              </div>

              <input
                id="product-images"
                type="file"
                ref={fileInputRef}
                onChange={handleFilesChange}
                accept="image/*"
                multiple
                className="hidden"
              />

              {/* Grid de Fotos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {imagens.map((url, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-2xl overflow-hidden border-2 bg-surface-raised aspect-square group shadow-lg transition-all ${
                      idx === 0 ? 'border-accent' : 'border-line hover:border-line'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-contain p-2"
                    />

                    {/* Badge de Capa */}
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 bg-accent-fill text-accent-contrast text-xs font-extrabold px-2 py-0.5 rounded-md shadow">
                        ⭐ Capa
                      </span>
                    )}

                    {/* Ações na foto */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => makeCover(idx)}
                          className="px-2.5 py-1 bg-accent-fill text-accent-contrast font-bold text-xs rounded-lg hover:brightness-110 transition-colors"
                        >
                          Definir Capa
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="px-2.5 py-1 bg-danger-soft text-danger font-bold text-xs rounded-lg hover:bg-danger-soft transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}

                {/* Card de Adicionar Mais Fotos */}
                {imagens.length < 8 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="aspect-square border-2 border-dashed border-line hover:border-accent rounded-2xl flex flex-col items-center justify-center p-4 text-muted hover:text-accent transition-all bg-surface-raised hover:bg-surface-raised disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center">
                        <svg className="animate-spin h-6 w-6 text-accent mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs">Enviando...</span>
                      </div>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs font-semibold">Adicionar Fotos</span>
                        <span className="text-xs text-muted mt-0.5">JPG, PNG, WEBP</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Mensagem de Feedback */}
            {message && (
              <p role={messageType === 'error' ? 'alert' : 'status'} className={`p-4 rounded-2xl text-center font-bold text-sm ${
                messageType === 'success'
                  ? 'bg-success-soft text-success border border-success'
                  : 'bg-danger-soft text-danger border border-danger'
              }`}>
                {message}
              </p>
            )}

            {/* Botão de Enviar Anúncio */}
            <button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="w-full py-4 bg-accent-fill hover:brightness-110 text-accent-contrast font-extrabold rounded-2xl shadow-xl hover:shadow-transparent transition-all duration-300 flex items-center justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Publicando Anúncio...
                </>
              ) : (
                'Publicar Anúncio'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
