'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MotionEnhancements() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.getElementById('conteudo');
    if (!root || !('IntersectionObserver' in window)) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const tracked = new WeakSet();
    const animating = new Map();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target;
        observer.unobserve(element);
        if (preference.matches) continue;
        const animation = element.dataset.motion === 'fade' ? 'motion-fade' : 'motion-rise';
        const delay = Math.min(240, Math.max(0, Number(element.dataset.motionDelay) || 0));
        element.style.setProperty('--motion-delay', `${delay}ms`);
        const finish = () => {
          element.classList.remove(animation);
          element.style.removeProperty('--motion-delay');
          element.removeEventListener('animationend', finish);
          animating.delete(element);
        };
        animating.set(element, finish);
        element.addEventListener('animationend', finish);
        element.classList.add(animation);
      }
    }, { threshold: 0.08 });

    function track(element) {
      if (tracked.has(element)) return;
      tracked.add(element);
      observer.observe(element);
    }
    function scan(node) {
      if (!(node instanceof Element)) return;
      if (node.matches('[data-motion]')) track(node);
      node.querySelectorAll('[data-motion]').forEach(track);
    }
    scan(root);
    const updates = new MutationObserver(records => {
      for (const record of records) record.addedNodes.forEach(scan);
    });
    updates.observe(root, { childList: true, subtree: true });
    const reduce = () => {
      if (preference.matches) [...animating.values()].forEach(finish => finish());
    };
    preference.addEventListener('change', reduce);
    return () => {
      observer.disconnect();
      updates.disconnect();
      preference.removeEventListener('change', reduce);
      [...animating.values()].forEach(finish => finish());
    };
  }, [pathname]);

  return null;
}
