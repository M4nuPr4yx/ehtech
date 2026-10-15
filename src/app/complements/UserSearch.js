'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '../../lib/api';
import ImageWithFallback from './ImageWithFallback';

export default function UserSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const term = query.trim().replace(/^@/, '');
  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams({ q: query.trim(), page: String(page) });
        const response = await fetch(getApiUrl(`/usuarios/busca?${params}`), { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.mensagem || 'Não foi possível buscar pessoas.');
        if (!controller.signal.aborted) setResult({ ...data, query, page });
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, term, page, retry]);
  const current = result?.query === query && result?.page === page ? result : null;
  return <section className="flex min-h-0 flex-1 flex-col" aria-label="Buscar pessoas para conversar">
    <div className="border-b border-line p-4"><label htmlFor="user-search" className="mb-2 block text-sm font-bold">Buscar pessoas</label><input id="user-search" type="search" maxLength={81} value={query} onChange={event => { setQuery(event.target.value); setPage(1); setError(''); }} placeholder="Nome ou @usuário" autoComplete="off" className="w-full rounded-xl border border-line bg-surface-raised p-3 text-sm text-foreground focus:border-accent focus:outline-none" /><p className="mt-2 text-xs text-muted">Digite ao menos 2 caracteres. Não é necessário ter anúncio; e-mails e endereços não aparecem na busca.</p></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {term.length >= 2 && error && <div role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}<button type="button" className="ml-2 underline" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>}
      {term.length >= 2 && !error && (loading || !current) && <p role="status" className="p-3 text-sm text-muted">Buscando pessoas…</p>}
      {term.length >= 2 && !loading && current && <><p role="status" className="mb-3 text-xs text-muted">{current.total} usuário{current.total !== 1 ? 's' : ''} encontrado{current.total !== 1 ? 's' : ''}</p>{!current.items.length && <p className="p-3 text-sm text-muted">Nenhum usuário encontrado. Tente outro nome ou @usuário.</p>}
        <ul className="space-y-2">{current.items.map(user => <li key={user.id_usuario} className="rounded-xl border border-line p-3"><button type="button" aria-label={`Conversar com @${user.username}`} onClick={() => onSelect(user)} className="flex w-full items-center gap-3 rounded-lg text-left hover:bg-surface-raised"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft font-bold text-accent">{user.foto ? <ImageWithFallback src={user.foto} alt="" className="h-10 w-10 object-cover" sizes="40px" /> : user.username?.charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{user.nome || user.username}</strong><span className="block truncate text-xs text-muted">@{user.username}</span></span><span className="text-xs font-bold text-accent">Conversar →</span></button><Link href={`/perfil/${user.id_usuario}`} className="mt-2 inline-block text-xs text-accent underline">Ver perfil de @{user.username}</Link></li>)}</ul>
        {current.totalPages > 1 && <nav aria-label="Paginação de usuários" className="mt-4 flex items-center justify-between gap-2 text-xs"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-line p-2 disabled:opacity-40">Anterior</button><span>Página {page} de {current.totalPages}</span><button type="button" disabled={page >= current.totalPages || page >= 100} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-line p-2 disabled:opacity-40">Próxima</button></nav>}
      </>}
    </div>
  </section>;
}
