import { getApiUrl } from './api';

export async function accountRequest(path, options = {}) {
  const response = await fetch(getApiUrl(path), {
    ...options, cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...options.headers },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.mensagem || 'Não foi possível concluir. Tente novamente.'), { errors: data.erros, status: response.status });
  return data;
}

export const formatCep = value => value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
export const formatPhone = value => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2');
};
