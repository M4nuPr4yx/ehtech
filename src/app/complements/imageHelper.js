/**
 * Helper para tratamento de imagens únicas e múltiplas em produtos do EHtech
 */

export const isValidImageUrl = (url) => {
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

/**
 * Retorna um array de URLs a partir do campo imagem do produto
 * Suporta JSON array string, array nativo ou URL única legada
 */
export const getProductImages = (imagem) => {
  if (!imagem) return [];
  
  if (Array.isArray(imagem)) {
    return imagem.map((img) => String(img).trim()).filter(isValidImageUrl);
  }
  
  if (typeof imagem === 'string') {
    const trimmed = imagem.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((img) => String(img).trim()).filter(isValidImageUrl);
        }
      } catch (e) {}
    }
    
    if (isValidImageUrl(trimmed)) {
      return [trimmed];
    }
  }
  
  return [];
};

/**
 * Retorna a imagem principal (capa) do produto
 */
export const getMainImage = (imagem) => {
  const images = getProductImages(imagem);
  return images.length > 0 ? images[0] : '';
};
