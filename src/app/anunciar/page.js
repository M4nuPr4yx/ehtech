'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isValidImageUrl } from '../complements/imageHelper';

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
  const [imagens, setImagens] = useState([]); // Array de URLs das fotos
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

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
      if (file.size > 5 * 1024 * 1024) {
        setMessage(`A imagem "${file.name}" ultrapassa o limite de 5MB.`);
        setMessageType('error');
        return;
      }
    }

    setUploadingImage(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('imagens', file);
      });

      const res = await fetch('http://localhost:3000/upload/imagens', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro no upload das imagens');

      if (data.urls && Array.isArray(data.urls)) {
        setImagens((prev) => [...prev, ...data.urls]);
      }
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

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/produtos', {
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
          imagem: imagens.length > 0 ? imagens : null
        })
      });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN') {
          localStorage.removeItem('token');
          setMessage('Sessão expirada. Faça login novamente.');
          setMessageType('error');
          setTimeout(() => { window.location.href = '/'; }, 2000);
          return;
        }
      }

      if (res.ok) {
        setMessage('Produto enviado com sucesso! O anúncio aguarda aprovação da moderação.');
        setMessageType('success');
        // Reset form
        setNome('');
        setDescricao('');
        setPreco('');
        setEstoque('1');
        setCategoria('');
        setImagens([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setMessage(data.mensagem || 'Erro ao publicar produto');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Erro: Verifique se o backend está rodando');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-[#ABDB25] text-xl animate-pulse">Carregando...</div>
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
    <div className="min-h-screen bg-gradient-to-b from-[#070909] via-black to-[#ABDB25]/15 text-white pt-12 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 md:p-10 shadow-2xl">
          <div className="mb-8 border-b border-gray-800 pb-6">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#ABDB25] to-white bg-clip-text text-transparent">
              Anunciar Novo Produto
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Adicione fotos de alta qualidade e detalhes do seu produto para vender mais rápido.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome do Produto */}
            <div>
              <label className="block text-white font-semibold text-sm mb-2">
                Nome do Produto <span className="text-[#ABDB25]">*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Teclado Mecânico RGB Switch Blue"
                className="w-full p-4 bg-gray-800/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:border-[#ABDB25] focus:outline-none transition-colors text-sm"
                maxLength={100}
                required
              />
            </div>

            {/* Preço e Estoque */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-semibold text-sm mb-2">
                  Preço de Venda <span className="text-[#ABDB25]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatPrecoDisplay(preco)}
                    onChange={handlePrecoChange}
                    placeholder="R$ 0,00"
                    className="w-full p-4 bg-gray-800/60 border border-gray-700 rounded-2xl text-white font-bold placeholder-gray-500 focus:border-[#ABDB25] focus:outline-none transition-colors text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold text-sm mb-2">
                  Estoque Disponível <span className="text-[#ABDB25]">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                  className="w-full p-4 bg-gray-800/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:border-[#ABDB25] focus:outline-none transition-colors text-sm"
                  required
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-white font-semibold text-sm mb-2">
                Categoria <span className="text-[#ABDB25]">*</span>
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full p-4 bg-gray-800/60 border border-gray-700 rounded-2xl text-white focus:border-[#ABDB25] focus:outline-none transition-colors text-sm"
                required
              >
                <option value="" className="bg-gray-800">Selecione uma categoria</option>
                {categorias.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-gray-800">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-white font-semibold text-sm mb-2">
                Descrição Completa <span className="text-[#ABDB25]">*</span>
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={5}
                placeholder="Descreva o estado do item, especificações técnicas, tempo de uso, garantias..."
                className="w-full p-4 bg-gray-800/60 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:border-[#ABDB25] focus:outline-none transition-colors text-sm leading-relaxed"
                required
              />
            </div>

            {/* Seção de Fotos Múltiplas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-white font-semibold text-sm">
                  Fotos do Produto ({imagens.length}/8)
                </label>
                <span className="text-xs text-gray-400">
                  A primeira foto será a capa principal
                </span>
              </div>

              <input
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
                    className={`relative rounded-2xl overflow-hidden border-2 bg-gray-800/80 aspect-square group shadow-lg transition-all ${
                      idx === 0 ? 'border-[#ABDB25]' : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-contain p-2"
                    />

                    {/* Badge de Capa */}
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 bg-[#ABDB25] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow">
                        ⭐ Capa
                      </span>
                    )}

                    {/* Ações na foto */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => makeCover(idx)}
                          className="px-2.5 py-1 bg-[#ABDB25] text-black font-bold text-xs rounded-lg hover:bg-white transition-colors"
                        >
                          Definir Capa
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="px-2.5 py-1 bg-red-600 text-white font-bold text-xs rounded-lg hover:bg-red-700 transition-colors"
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
                    className="aspect-square border-2 border-dashed border-gray-700 hover:border-[#ABDB25] rounded-2xl flex flex-col items-center justify-center p-4 text-gray-400 hover:text-[#ABDB25] transition-all bg-gray-800/30 hover:bg-gray-800/50 disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center">
                        <svg className="animate-spin h-6 w-6 text-[#ABDB25] mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                        <span className="text-[10px] text-gray-500 mt-0.5">JPG, PNG, WEBP</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Mensagem de Feedback */}
            {message && (
              <p className={`p-4 rounded-2xl text-center font-bold text-sm ${
                messageType === 'success'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {message}
              </p>
            )}

            {/* Botão de Enviar Anúncio */}
            <button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="w-full py-4 bg-[#ABDB25] hover:bg-white text-black font-extrabold rounded-2xl shadow-xl hover:shadow-[#ABDB25]/30 transition-all duration-300 flex items-center justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
