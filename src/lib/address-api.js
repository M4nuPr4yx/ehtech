import { apiRequest } from './api-request';

export async function accountRequest(path, options = {}) {
  const { body, ...requestOptions } = options;
  return apiRequest(path, { ...requestOptions, headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...options.headers }, ...(body !== undefined ? { json: body } : {}) });
}

export const formatCep = value => value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
export const formatPhone = value => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2');
};
