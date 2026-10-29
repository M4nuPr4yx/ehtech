'use client';

import Link from './PendingLink';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import styles from './AppNavigation.module.css';

const primary = [['/', 'Início'], ['/produtos', 'Produtos'], ['/servicos', 'Serviços'], ['/sobre', 'Como funciona']];
const tools = [['/comparar', 'Comparar produtos', 'Veja as diferenças antes de escolher.'], ['/missoes', 'Encontrar por objetivo', 'Encontre opções para o que você precisa.'], ['/combos', 'Produto com serviço', 'Combine um equipamento com ajuda profissional.'], ['/compatibilidade', 'Verificar peças', 'Confira se as peças do seu PC combinam.']];
const account = [['/perfil', 'Meu perfil'], ['/pedidos', 'Pedidos e vendas'], ['/mensagens', 'Mensagens'], ['/contratacoes', 'Serviços contratados'], ['/meus-servicos', 'Meus serviços'], ['/favoritos', 'Favoritos'], ['/bloqueados', 'Bloqueados'], ['/passaportes', 'Meus equipamentos'], ['/certificados', 'Certificados'], ['/carrinho', 'Carrinho'], ['/anunciar', 'Anunciar']];

export default function AppNavigation() {
  const pathname = usePathname();
  const toolsRef = useRef(null);
  useEffect(() => {
    if (toolsRef.current) toolsRef.current.open = false;
  }, [pathname]);
  useEffect(() => {
    const dismiss = event => {
      if (toolsRef.current && !toolsRef.current.contains(event.target)) toolsRef.current.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const privateArea = account.some(([href]) => pathname === href) || pathname.startsWith('/editar-produto') || pathname.startsWith('/pedidos/');
  const links = pathname.startsWith('/admin')
    ? [['/admin', 'Visão geral'], ['/admin/servicos', 'Moderar serviços'], ['/admin/denuncias', 'Denúncias'], ['/admin/componentes', 'Catálogo de componentes']]
    : account;
  function navigation(items, label, className) {
    return <nav aria-label={label} className={className}>{items.map(([href, name]) => {
      const current = pathname === href || (href !== '/' && href !== '/admin' && pathname.startsWith(`${href}/`));
      return <Link href={href} key={href} aria-current={current ? 'page' : undefined}>{name}</Link>;
    })}</nav>;
  }
  return <>
    <div className={styles.row}>
      {navigation(primary, 'Navegação principal', 'app-navigation')}
      <details ref={toolsRef} className={styles.tools} onKeyDown={event => { if (event.key === 'Escape') { toolsRef.current.open = false; toolsRef.current.querySelector('summary')?.focus(); } }}>
        <summary className={tools.some(([href]) => pathname === href) ? styles.active : undefined}>Ferramentas <span aria-hidden="true">⌄</span></summary>
        <nav aria-label="Ferramentas para escolher" className={styles.options}>{tools.map(([href, name, hint]) => <Link href={href} key={href} aria-current={pathname === href ? 'page' : undefined}><strong>{name}</strong><small>{hint}</small></Link>)}</nav>
      </details>
    </div>
    {(privateArea || pathname.startsWith('/admin')) && navigation(links, pathname.startsWith('/admin') ? 'Administração' : 'Minha conta', 'account-navigation')}
  </>;
}
