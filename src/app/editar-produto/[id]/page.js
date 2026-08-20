'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('data:image/')
  );
};

export default function EditarProduto() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Form states
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estoque, setEstoque] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [imagemPreview, setImagemPreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch product data
  useEffect(() => {
    const fetchProduto = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.replace(`/?login=1&next=${encodeURIComponent(`/editar-produto/${params.id}`)}`);
          return;
        }

        const res = await fetch(`http://localhost:3000/produtos/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 404) {
          setMessage('Produto não encontrado');
          setMessageType('error');
          setLoading(false);
          return;
        }

        if (res.status === 403) {
          setMessage('Você não tem permissão para editar este produto');
          setMessageType('error');
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setMessage('Erro ao carregar produto');
          setMessageType('error');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setNome(data.nome || '');
        setDescricao(data.descricao || '');
        setPreco(data.preco || '');
        setCategoria(data.categoria || '');
        setEstoque(data.estoque || 0);
        setImagemUrl(data.imagem || '');
        setImagemPreview(data.imagem || '');
        setLoadingData(false);
      } catch (err) {
        setMessage('Erro: Verifique se backend está rodando');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    };

    fetchProduto();
  }, [params.id, router]);

  // Handle price input with mask (BRL format)
  const handlePrecoChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setPreco('');
      return;
    }
    value = (parseInt(value) / 100).toFixed(2);
    setPreco(value);
  };

  // Upload imagem para o servidor e retorna URL
  const uploadImagem = async (file) => {
    const formData = new FormData();
    formData.append('imagem', file);

    const res = await fetch('http://localhost:3000/upload/imagem', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro no upload');
    return data.url;
  };

  // Handle image selection - upload direto
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Por favor, selecione uma imagem');
      setMessageType('error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('A imagem deve ter no máximo 5MB');
      setMessageType('error');
      return;
    }

    setUploadingImage(true);
    setMessage('');

    try {
      const url = await uploadImagem(file);
      setImagemUrl(url);
      setImagemPreview(url);

      const reader = new FileReader();
      reader.onload = () => {
        if (!imagemUrl) setImagemPreview(reader.result);
      };
      reader.readAsDataURL(file);

    } catch (err) {
      setMessage('Erro ao subir imagem: ' + err.message);
      setMessageType('error');
    } finally {
      setUploadingImage(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setImagemUrl('');
    setImagemPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      const res = await fetch(`http://localhost:3000/produtos/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim(),
          preco: parseFloat(preco),
          estoque: parseInt(estoque) || 0,
          categoria,
          imagem: imagemUrl || null
        })
      });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN') {
          localStorage.removeItem('token');
          setMessage('Sessão expirada. Faça login novamente.');
          setMessageType('error');
          setTimeout(() => { router.replace(`/?login=1&next=${encodeURIComponent(`/editar-produto/${params.id}`)}`); }, 2000);
          return;
        }
      }

      if (res.status === 403) {
        setMessage('Você não tem permissão para editar este produto');
        setMessageType('error');
        setIsSubmitting(false);
        return;
      }

      if (res.ok) {
        setMessage('Produto atualizado com sucesso!');
        setMessageType('success');
        setTimeout(() => { router.push('/perfil'); }, 1500);
      } else {
        setMessage(data.mensagem || 'Erro ao atualizar produto');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Erro: Verifique se backend está rodando');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="site-background min-h-screen text-white flex items-center justify-center">
        <div className="text-[#ABDB25] text-xl">Carregando...</div>
      </div>
    );
  }

  const categorias = [
    { value: 'smartphones', label: 'Smartphones' },
    { value: 'notebooks', label: 'Notebooks' },
    { value: 'computadores', label: 'Computadores' },
    { value: 'tablets', label: 'Tablets' },
    { value: 'acessorios', label: 'Acessórios' },
    { value: 'gadgets', label: 'Gadgets' },
    { value: 'games', label: 'Games' },
    { value: 'audio', label: 'Áudio' },
    { value: 'cameras', label: 'Câmeras' },
    { value: 'smartwatches', label: 'Smartwatches' },
    { value: 'tv', label: 'TV e Vídeo' },
    { value: 'outros', label: 'Outros' },
  ];

  return (
    <div className="site-background min-h-screen text-white pt-20 pb-20">
      <div className="max-w-2xl mx-auto px-6">
        <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-[#ABDB25]">Editar Produto</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <div>
              <label className="block text-white font-medium mb-2">Nome do Produto</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: iPhone 15 Pro Max"
                className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-white font-medium mb-2">Descrição</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva seu produto..."
                rows={4}
                className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Preço e Estoque */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">Preço (R$)</label>
                <input
                  type="text"
                  value={preco}
                  onChange={handlePrecoChange}
                  placeholder="0,00"
                  className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Estoque</label>
                <input
                  type="number"
                  value={estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-full p-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-[#ABDB25] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-white font-medium mb-2">Categoria</label>
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

              {(imagemPreview && isValidImageUrl(imagemPreview)) ? (
                <div className="relative inline-block">
                  <img
                    src={imagemPreview}
                    alt="Preview"
                    className="max-w-full h-48 object-contain rounded-xl border border-gray-600 bg-gray-800/50"
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
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                      <span className="text-[#ABDB25]">Enviando...</span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={uploadingImage}
                  className="w-full p-8 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-[#ABDB25] hover:text-[#ABDB25] transition-colors flex flex-col items-center justify-center disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">{uploadingImage ? 'Enviando...' : 'Clique para enviar uma imagem'}</span>
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

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#ABDB25] hover:bg-white hover:text-black text-black font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
