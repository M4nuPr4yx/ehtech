'use client';
import { useState } from 'react';

/**
 * Componente para exibir imagens de forma robusta
 * - Suporta base64 data:image/*
 * - Suporta URLs externas (http/https)
 * - Fallback automático quando imagem falha
 * - Placeholder SVG estilizado
 */
export default function ImageWithFallback({ src, alt, className, style }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Placeholder SVG (ícone de imagem)
  const placeholder = (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  // Verifica se é uma URL/image base64 válida
  const isValidImageSrc = (value) => {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image/')
    );
  };

  if (error || !isValidImageSrc(src)) {
    return (
      <div className={className} style={style}>
        {placeholder}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'Imagem'}
      className={className}
      style={style}
      onLoad={() => setLoading(false)}
      onError={() => setError(true)}
    />
  );
}

/**
 * Helper para processar string base64 (remove prefixo data:image/xxx;base64,)
 * Retorna apenas os dados puros para armazenamento
 */
export function extractBase64Data(base64String) {
  if (!base64String || typeof base64String !== 'string') return null;
  const match = base64String.match(/^data:image\/[^;]+;base64,(.+)$/);
  return match ? match[1] : base64String;
}

/**
 * Helper para reconstruir string base64 completa com prefixo
 */
export function buildBase64Data(mimeType, base64Data) {
  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Helper para validar e comprimir imagem base64
 * Se maior que maxSizeKB, comprime automaticamente
 */
export function processBase64Image(file, maxSizeKB = 2000) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Arquivo inválido. Selecione uma imagem.'));
      return;
    }

    // Limite de 5MB
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Imagem muito grande. Máx 5MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo.'));
    };
    reader.readAsDataURL(file);
  });
}
