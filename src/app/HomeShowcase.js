'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import ImageWithFallback from './complements/ImageWithFallback';
import { getMainImage } from './complements/imageHelper';
import { ListingDetailLink } from './complements/ListingNavigation';
import { productCategoryLabel } from '../lib/product-category.mjs';
import styles from './home.module.css';

const motionQuery = '(prefers-reduced-motion: reduce)';
const transitionTime = 6500;
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function watchMotion(callback) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function watchVisibility(callback) {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}

export default function HomeShowcase({ items, fallbackImage }) {
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(watchMotion, () => window.matchMedia(motionQuery).matches, () => false);
  const visible = useSyncExternalStore(watchVisibility, () => !document.hidden, () => true);
  const total = items.length;
  const index = position % total;
  const item = items[index];
  const photo = getMainImage(item.imagem);
  const autoplay = playing ?? !reducedMotion;
  const rotating = autoplay && !hovered && !focused && visible && total > 1;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setPosition(current => (current + 1) % total), transitionTime);
    return () => window.clearTimeout(timer);
  }, [index, rotating, total]);

  function move(step) {
    setPlaying(false);
    setPosition(current => (current + step + total) % total);
  }

  return (
    <section
      className={styles.carousel}
      aria-label="Anúncios em destaque"
      aria-roledescription="carrossel"
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    >
      <div className={styles.carouselBar}>
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 2v5m0 10v5M2 12h5m10 0h5M5 5l3 3m8 8 3 3m0-14-3 3m-8 8-3 3" /></svg> Em destaque</span>
        {total > 1 && (
          <div className={styles.carouselControls}>
            <button type="button" aria-label={autoplay ? 'Pausar rotação' : 'Iniciar rotação'} onClick={() => setPlaying(!autoplay)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                {autoplay ? <path d="M9 5v14m6-14v14" /> : <path d="m9 5 10 7-10 7V5Z" />}
              </svg>
            </button>
            <button type="button" aria-label="Anúncio anterior" onClick={() => move(-1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button>
            <button type="button" aria-label="Próximo anúncio" onClick={() => move(1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
          </div>
        )}
      </div>
      <div aria-live={autoplay ? 'off' : 'polite'}>
        <ListingDetailLink from="/" href={'/produtos/' + item.id_produto} className={styles.heroProduct}>
          <div className={styles.heroPhoto} key={item.id_produto} aria-hidden="true">
            {photo ? <ImageWithFallback src={photo} alt="" sizes="(max-width: 759px) 87vw, 40vw" loading="eager" /> : fallbackImage}
          </div>
          <div className={styles.heroCaption}>
            <div>
              <small>{Number(item.estoque) <= 0 ? 'Esgotado · ' : ''}{productCategoryLabel(item.categoria)}</small>
              <h2>{item.nome}</h2>
            </div>
            <div className={styles.heroPrice}><strong>{currency.format(Number(item.preco))}</strong><span className={styles.detailArrow} aria-hidden="true">↗</span></div>
          </div>
        </ListingDetailLink>
      </div>
      {total > 1 && <div className={styles.carouselCounter}><span>{index + 1} de {total} anúncios</span><span className={styles.carouselTrack} aria-hidden="true"><span style={{ width: ((index + 1) / total * 100) + '%' }} /></span></div>}
    </section>
  );
}
