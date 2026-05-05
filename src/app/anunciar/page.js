'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Helper function to validate if a string is a valid image URL
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Check for valid URL patterns: http://, https://, or data:image/
  return trimmed.startsWith('http://') || 
         trimmed.startsWith('https://') || 
         trimmed.startsWith('data:image/');
};

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
  const [categoria, setCategoria] = useState('');
  const [imagem, setImagem] = useState('');
  const [imagemPreview, setImagemPreview] = useState('');
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
    // Convert to BRL format
    value = (parseInt(value) / 100).toFixed(2);
    setPreco(value);
  };

  // Format price for display
  const formatPrecoDisplay = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Handle image selection with preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage('Por favor, selecione uma imagem');
      setMessageType('error');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('A imagem deve ter no máximo 5MB');
      setMessageType('error');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagemPreview(reader.result);
      setImagem(reader.result);
    };
    reader.onerror = () => {
      setMessage('Erro ao ler a imagem');
      setMessageType('error');
    };
    reader.readAsDataURL(file);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setImagem('');
    setImagemPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    // Validate required fields
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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim(),
          preco: parseFloat(preco),
          categoria,
          imagem: imagem || null
        })
      });
      const data = await res.json();

      // Check for authentication errors
      if (res.status === 401 || res.status === 403) {
        // Check for specific error codes
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN') {
          // Clear invalid token and redirect to login
          localStorage.removeItem('token');
          setMessage('Sessão expirada. Faça login novamente.');
          setMessageType('error');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          return;
        }
      }

      if (res.ok) {
        setMessage('Produto publicado com sucesso!');
        setMessageType('success');
        // Reset form
        setNome('');
        setDescricao('');
        setPreco('');
        setCategoria('');
        setImagem('');
        setImagemPreview('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setMessage(data.mensagem || 'Erro ao publicar produto');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Erro: Verifique se backend está rodando');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-[#ABDB25] text-xl">Carregando...</div>
      </div>
    );
  }

  // Product categories
  const categorias = [
    { value: 'smartphones', label: 'Smartphones' },
    { value: 'notebooks', label: 'Notebooks' },
    { value: 'computadores', label: 'Computadores' },
    { value: 'tablets', label: 'Tablets' },
    { value: 'acessorios', label: 'Acessórios' },
    { value: 'gadgets', label: 'Gadgets' },
    { value: 'games', label: 'Games' },
    { value: 'redes', label: 'Redes e Internet' },
    { value: 'audio', label: 'Áudio' },
    { value: 'outros', label: 'Outros' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111] via-black to-[#ABDB25]/30 text-white pt-20 pb-20">
      <div className="max-w-2xl mx-auto px-6">
        <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-[#ABDB25] mb-2">Anunciar Produto</h1>
          <p className="text-gray-400 mb-6">Preencha os dados do seu produto para publicá-lo</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome do Produto */}
            <div>
              <label className="block text-white font-medium mb-2">
                Nome do Produto <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: iPhone 14 Pro 128GB"
                className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
                maxLength={100}
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-white font-medium mb-2">
                Descrição <span className="text-red-400">*</span>
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva as características, estado de conservação, etc."
                rows={4}
                className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors resize-none"
                maxLength={500}
              />
              <p className="text-gray-500 text-sm mt-1 text-right">{descricao.length}/500</p>
            </div>

            {/* Preço */}
            <div>
              <label className="block text-white font-medium mb-2">
                Preço <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                <input
                  type="text"
                  value={preco ? formatPrecoDisplay(preco) : ''}
                  onChange={handlePrecoChange}
                  placeholder="0,00"
                  className="w-full p-4 pl-12 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-white font-medium mb-2">
                Categoria <span className="text-red-400">*</span>
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-[#ABDB25] focus:outline-none transition-colors"
              >
                <option value="" className="bg-gray-800">Selecione uma categoria</option>
                {categorias.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-gray-800">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Imagem */}
            <div>
              <label className="block text-white font-medium mb-2">
                Imagem do Produto
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />

{isValidImageUrl(imagemPreview) ? (
                <div className="relative inline-block">
                  <img
                    src={imagemPreview}
                    alt="Preview"
                    className="max-w-full h-48 object-contain rounded-xl border border-gray-600 bg-gray-800/50"
                    onError={(e) => { e.target.style.display = 'none'; removeImage(); }}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="w-full p-8 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-[#ABDB25] hover:text-[#ABDB25] transition-colors flex flex-col items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">Clique para enviar uma imagem</span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG ou WEBP (máx. 5MB)</span>
                </button>
              )}
            </div>

            {/* Message */}
            {message && (
              <p className={`p-3 rounded-xl text-center font-bold ${messageType === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                {message}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#ABDB25] hover:bg-white hover:text-black disabled:bg-gray-600 disabled:text-gray-400 text-black font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Publicando...
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
