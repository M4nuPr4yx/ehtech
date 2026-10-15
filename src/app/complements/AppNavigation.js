'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const primary = [['/', 'Início'], ['/produtos', 'Produtos'], ['/servicos', 'Serviços'], ['/missoes', 'Compra por missão'], ['/combos', 'Combos'], ['/compatibilidade', 'Compatibilidade'], ['/sobre', 'Como funciona']];
const account = [['/perfil', 'Meu perfil'], ['/pedidos', 'Pedidos e vendas'], ['/passaportes', 'Meus equipamentos'], ['/certificados', 'Certificados'], ['/contratacoes', 'Contratações'], ['/mensagens', 'Mensagens'], ['/carrinho', 'Carrinho'], ['/anunciar', 'Anunciar']];

export default function AppNavigation() {
  const pathname = usePathname();
  const privateArea = account.some(([href]) => pathname === href) || pathname.startsWith('/editar-produto') || pathname.startsWith('/pedidos/');
  const links = pathname.startsWith('/admin')
    ? [['/admin', 'Visão geral'], ['/admin/componentes', 'Catálogo de componentes']]
    : account;
  function navigation(items, label, className) {
    return <nav aria-label={label} className={className}>{items.map(([href, name]) => {
      const current = pathname === href || (href !== '/' && href !== '/admin' && pathname.startsWith(`${href}/`));
      return <Link href={href} key={href} aria-current={current ? 'page' : undefined}>{name}</Link>;
    })}</nav>;
  }
  return <>
    {navigation(primary, 'Navegação principal', 'app-navigation')}
    {(privateArea || pathname.startsWith('/admin')) && navigation(links, pathname.startsWith('/admin') ? 'Administração' : 'Minha conta', 'account-navigation')}
  </>;
}
