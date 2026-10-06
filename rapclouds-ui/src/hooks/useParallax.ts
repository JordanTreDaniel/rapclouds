import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useParallax(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-speed]'));
    if (elements.length === 0) return;

    const origins = new Map<HTMLElement, number>();

    const captureOrigins = () => {
      elements.forEach((el) => {
        const speed = Number.parseFloat(el.dataset.speed ?? '');
        if (!Number.isFinite(speed) || speed === 0) return;
        origins.set(el, el.getBoundingClientRect().top + window.scrollY);
      });
    };

    captureOrigins();

    let frame = 0;

    const apply = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const positions: Array<{ el: HTMLElement; y: number }> = [];
      origins.forEach((origin, el) => {
        const speed = Number.parseFloat(el.dataset.speed ?? '');
        positions.push({ el, y: (scrollY - origin) * speed });
      });
      positions.forEach(({ el, y }) => {
        el.style.translate = `0 ${y.toFixed(2)}px`;
      });
    };

    const onScroll = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(apply);
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        captureOrigins();
        apply();
      }, 150);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    apply();

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [rootRef]);
}
