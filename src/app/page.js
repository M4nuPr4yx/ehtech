'use client';
import { apiResponse } from '../lib/api-request.js';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ImageWithFallback from './complements/ImageWithFallback';
import { getMainImage } from './complements/imageHelper';
import styles from './home.module.css';
import LoadingState from './complements/LoadingState';

export default function Home() {
  const router = useRouter();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [heroSearch, setHeroSearch] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProdutos = async () => {
      setLoading(true);
      setProductsError('');
      try {
        const res = await apiResponse('/produtos/catalogo?limit=8&page=1', { signal: controller.signal, cache: 'default' });
        if (controller.signal.aborted) return;
        
        if (res.ok) {
          const data = await res.json();
          // Produtos disponíveis aparecem primeiro; esgotados ficam no fim.
          const ordenados = [...(data.items || [])].sort((a, b) => {
            const aEsgotado = Number(a.estoque) <= 0;
            const bEsgotado = Number(b.estoque) <= 0;
            if (aEsgotado !== bEsgotado) return aEsgotado ? 1 : -1;
            return Number(b.id_produto) - Number(a.id_produto);
          });
          setProdutos(ordenados.slice(0, 8));
        } else {
          setProductsError('Não foi possível carregar os anúncios. Tente novamente em alguns instantes.');
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error fetching products:', err);
        setProductsError('Não foi possível carregar os anúncios. Verifique sua conexão e tente novamente.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchProdutos();
    return () => controller.abort();
  }, [retry]);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      router.push(`/produtos?search=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      router.push('/produtos');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const categories = [
    {
      name: 'Smartphones',
      id: 'smartphones',
      desc: 'iPhones, Galaxy e Xiaomi',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'Notebooks',
      id: 'notebooks',
      desc: 'Gamer, Trabalho e MacBooks',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'PCs Gamer',
      id: 'computadores',
      desc: 'Setups completos e Desktops',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    {
      name: 'Games & Consoles',
      id: 'games',
      desc: 'PS5, Xbox, Nintendo e Jogos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 6H9a6 6 0 00-6 6v3a2 2 0 002 2h1.5a1.5 1.5 0 001.5-1.5V14a1 1 0 011-1h6a1 1 0 011 1v1.5a1.5 1.5 0 001.5 1.5H19a2 2 0 002-2v-3a6 6 0 00-6-6zM6 11h4M8 9v4m8-2h.01M18 13h.01" />
        </svg>
      )
    },
    {
      name: 'Áudio & Som',
      id: 'audio',
      desc: 'Headsets, Fones e Caixas',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      )
    },
    {
      name: 'Acessórios',
      id: 'acessorios',
      desc: 'Teclados, Mouses e Cabos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      name: 'Redes & Wi-Fi',
      id: 'redes',
      desc: 'Roteadores e Adaptadores',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      )
    },
    {
      name: 'Gadgets & Outros',
      id: 'gadgets',
      desc: 'Smartwatches e Inovações',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const featured = produtos.find(item => Number(item.estoque) > 0 && getMainImage(item.imagem)) || produtos.find(item => Number(item.estoque) > 0) || produtos[0];
  const categoryName = value => categories.find(category => category.id === value)?.name || value || 'Equipamento';
  const emptyPhoto = <span className={styles.placeholder} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth=".9"><rect x="4" y="4" width="16" height="12" rx="1" /><path d="M2 20h20M8 17l-1 3m9-3 1 3" /></svg></span>;

  return (
    <div className={styles.home}><div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.intro} data-motion="rise">
          <p className={styles.kicker}>Comprar, vender e cuidar da sua tecnologia</p>
          <h1>Seu próximo<br />upgrade <span>está aqui.</span></h1>
          <p className={styles.description}>Compre produtos, contrate serviços ou publique seu anúncio. Converse diretamente com quem vende e combine os detalhes antes de fechar.</p>
          <form onSubmit={handleHeroSearch} className={styles.search} role="search" aria-label="Buscar produtos na vitrine">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <input type="search" aria-label="Buscar produtos" placeholder="Notebook, celular, peça…" maxLength={100} value={heroSearch} onChange={e => setHeroSearch(e.target.value)} />
            <button type="submit">Buscar</button>
          </form>
          <div className={styles.suggestions}><span>Explore:</span>{[['Notebooks', 'notebooks'], ['Celulares', 'smartphones'], ['PCs gamer', 'computadores']].map(([name, id]) => <Link key={id} href={'/produtos?categoria=' + id}>{name}</Link>)}</div>
          <div className={styles.introActions}><Link href="/anunciar">Quero anunciar <span aria-hidden="true">↗</span></Link><Link href="/servicos">Contratar um serviço <span aria-hidden="true">→</span></Link></div>
        </div>
        <div className={styles.showcase} data-motion="fade" data-motion-delay="120">
          {loading ? <div className={styles.skeleton}><LoadingState label="Buscando anúncios da comunidade…" detail="Enquanto isso, explore as categorias abaixo." /></div> : featured ? (
            <Link href={'/produtos/' + featured.id_produto} className={styles.heroProduct}>
              <div className={styles.heroLabel}><span>{Number(featured.estoque) <= 0 ? 'Anúncio esgotado' : 'Anúncio da comunidade'}</span><span>Ver na vitrine ↗</span></div>
              <div className={styles.heroPhoto}>{getMainImage(featured.imagem) ? <ImageWithFallback src={getMainImage(featured.imagem)} alt={featured.nome} sizes="(max-width: 759px) 90vw, 42vw" loading="eager" /> : emptyPhoto}</div>
              <div className={styles.heroCaption}><div><small>{categoryName(featured.categoria)}</small><h2>{featured.nome}</h2></div><strong>{formatPrice(featured.preco)}</strong></div>
            </Link>
          ) : (
            <Link href="/produtos" className={styles.heroProduct}><div className={styles.heroLabel}><span>Seu próximo equipamento</span><span>Explorar ↗</span></div><div className={styles.heroPhoto}>{emptyPhoto}</div><div className={styles.heroCaption}><h2>Encontre o que combina com você.</h2></div></Link>
          )}
          <Link href="/compatibilidade" className={styles.pcNote}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4M9 9h6v6H9z" /></svg>
            <div><strong>Vai montar um PC?</strong><small>Confira se suas peças combinam antes de comprar.</small></div><span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className={styles.quickStart} aria-labelledby="por-onde-comecar">
        <h2 id="por-onde-comecar">O que você quer fazer?</h2>
        <div>{[['/produtos', 'Comprar produtos', 'Busque, filtre e converse com o vendedor.'], ['/servicos', 'Contratar serviços', 'Encontre ajuda e peça um orçamento.'], ['/anunciar', 'Vender ou oferecer um serviço', 'Escolha o tipo de anúncio e publique.']].map(([href, title, hint]) => <Link key={href} href={href}><strong>{title} <span aria-hidden="true">→</span></strong><small>{hint}</small></Link>)}</div>
        <p>O pagamento é combinado entre as partes, fora do site. <Link href="/sobre">Veja como funciona →</Link></p>
      </section>

      <section className={styles.departments} aria-label="Categorias de produtos">
        <div className={styles.sectionHeading} data-motion="fade"><h2>Encontre pela categoria</h2><Link href="/produtos">Ver todas <span aria-hidden="true">→</span></Link></div>
        <div className={styles.departmentGrid}>{categories.map((category, index) => (
          <Link key={category.id} href={'/produtos?categoria=' + category.id} className={styles.department} data-motion="rise" data-motion-delay={(index % 4) * 50}>
            <span className={styles.departmentIcon}>{category.icon}</span><div><strong>{category.name}</strong><small>{category.desc}</small></div><span className={styles.departmentArrow} aria-hidden="true">↗</span>
          </Link>
        ))}</div>
      </section>

      <section className={styles.products} aria-labelledby="novos-anuncios">
        <div className={styles.sectionHeading} data-motion="fade"><div><h2 id="novos-anuncios">Novos anúncios</h2><p>O que acabou de entrar na vitrine.</p></div><Link href="/produtos">Explorar catálogo <span aria-hidden="true">→</span></Link></div>
        {loading ? <div className={styles.productGrid} aria-hidden="true">{Array.from({length: 4}, (_, index) => <div key={index} className={styles.skeleton} />)}</div> : productsError ? (
          <div className={styles.state} role="status"><p>{productsError}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>
        ) : produtos.length ? (
          <div className={styles.productGrid}>{produtos.map((produto, index) => (
            <Link key={produto.id_produto} href={'/produtos/' + produto.id_produto} className={styles.productCard} data-motion="rise" data-motion-delay={(index % 4) * 55}>
              <div className={styles.productPhoto}>{getMainImage(produto.imagem) ? <ImageWithFallback src={getMainImage(produto.imagem)} alt={produto.nome} sizes="(max-width: 759px) 44vw, 22vw" loading="lazy" /> : emptyPhoto}{Number(produto.estoque) <= 0 && <span className={styles.soldOut}>Esgotado</span>}</div>
              <div className={styles.productBody}><small>{categoryName(produto.categoria)}</small><h3>{produto.nome}</h3><div className={styles.productBottom}><strong>{formatPrice(produto.preco)}</strong><span aria-hidden="true">↗</span></div></div>
            </Link>
          ))}</div>
        ) : <div className={styles.state}><p>A vitrine está esperando o primeiro anúncio.</p><Link href="/anunciar">Anunciar um equipamento →</Link></div>}
      </section>

      <section className={styles.services}>
        <div data-motion="rise"><p className={styles.kicker}>Serviços da comunidade</p><h2>Uma ajuda.<br />Muitas possibilidades.</h2><p>Programação, design, aulas e suporte. Os serviços são anunciados pelos próprios usuários. Converse com o prestador e peça um orçamento antes de começar.</p><Link href="/servicos">Encontrar um profissional <span aria-hidden="true">→</span></Link></div>
        <div className={styles.serviceGrid} data-motion="fade">{[
          ['Programação', 'Sites, aplicativos e automações.', 'programacao'],
          ['Suporte técnico', 'Ajuda com programas e configurações.', 'suporte'],
          ['Design', 'Identidade visual e peças digitais.', 'design'],
          ['Aulas', 'Aprenda com orientação individual.', 'aulas']
        ].map(([name, description, id]) => <Link key={id} href={'/servicos?categoria=' + id}><strong>{name} <span aria-hidden="true">↗</span></strong><p>{description}</p></Link>)}</div>
      </section>

      <section className={styles.sell} data-motion="rise"><div><h2>Parado com você.<br />Útil para outra pessoa.</h2><p>Fotografe, descreva e dê um novo destino ao seu equipamento.</p></div><Link href="/anunciar">Criar meu anúncio <span aria-hidden="true">↗</span></Link></section>
    </div></div>
  );
}
