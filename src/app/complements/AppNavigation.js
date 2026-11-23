'use client';

import Link from './PendingLink';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import styles from './AppNavigation.module.css';

const primary = [['/', 'Início'], ['/produtos', 'Produtos'], ['/servicos', 'Serviços'], ['/sobre', 'Como funciona']];
const tools = [['/comparar', 'Comparar produtos', 'Veja as diferenças antes de escolher.'], ['/missoes', 'Buscar por objetivo', 'Explore opções dentro do seu orçamento.'], ['/combos', 'Produto + instalação', 'Encontre instalação e configuração.'], ['/compatibilidade', 'Compatibilidade', 'Confira peças com regras e fontes.']];
const account = [['/perfil', 'Meu perfil'], ['/pedidos', 'Pedidos e vendas'], ['/mensagens', 'Mensagens'], ['/contratacoes', 'Serviços contratados'], ['/meus-servicos', 'Meus serviços'], ['/favoritos', 'Favoritos'], ['/bloqueados', 'Bloqueados'], ['/carrinho', 'Carrinho'], ['/anunciar', 'Anunciar']];
const admin = [['/admin', 'Visão geral'], ['/admin/servicos', 'Moderar serviços'], ['/admin/denuncias', 'Denúncias'], ['/admin/componentes', 'Catálogo de componentes']];

export default function AppNavigation() {
  const pathname = usePathname();
  const toolsRef = useRef(null), accountRef = useRef(null);
  useEffect(() => {
    if (toolsRef.current) toolsRef.current.open = false;
    if (accountRef.current) accountRef.current.open = false;
  }, [pathname]);
  useEffect(() => {
    const dismiss = event => {
      for (const ref of [toolsRef, accountRef]) if (ref.current && !ref.current.contains(event.target)) ref.current.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const isAdmin = pathname.startsWith('/admin');
  const privateArea = account.some(([href]) => pathname === href) || pathname.startsWith('/editar-produto') || pathname.startsWith('/pedidos/');
  const active = items => items.some(([href]) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)));
  const links = items => items.map(([href, name, hint]) => {
    const current = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
    return <Link href={href} key={href} aria-current={current ? 'page' : undefined}><strong>{name}</strong>{hint && <small>{hint}</small>}</Link>;
  });
  return <>
    <div className={styles.row}>
      <nav aria-label="Navegação principal" className="app-navigation">{(isAdmin ? admin : primary).map(([href, name]) => {
        const current = pathname === href || (href !== '/' && href !== '/admin' && pathname.startsWith(`${href}/`));
        return <Link href={href} key={href} aria-current={current ? 'page' : undefined}>{name}</Link>;
      })}</nav>
      {!isAdmin && <details ref={toolsRef} className={styles.menu} onKeyDown={event => { if (event.key === 'Escape') { toolsRef.current.open = false; toolsRef.current.querySelector('summary')?.focus(); } }}>
        <summary className={active(tools) ? styles.active : undefined}>Ferramentas<span aria-hidden="true">⌄</span></summary>
        <nav aria-label="Ferramentas para escolher" className={styles.options}>{links(tools)}</nav>
      </details>}
      {!isAdmin && privateArea && <details ref={accountRef} className={styles.menu} onKeyDown={event => { if (event.key === 'Escape') { accountRef.current.open = false; accountRef.current.querySelector('summary')?.focus(); } }}>
        <summary className={active(account) ? styles.active : undefined}>Minha conta<span aria-hidden="true">⌄</span></summary>
        <nav aria-label="Minha conta" className={styles.options}>{links(account)}</nav>
      </details>}
    </div>
  </>;
}
