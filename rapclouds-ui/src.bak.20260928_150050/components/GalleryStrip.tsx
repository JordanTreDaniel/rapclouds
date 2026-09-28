import { useEffect, useState } from 'react';
import { useGeneration } from '../store/GenerationContext';
import type { GalleryItem } from '../store/GenerationContext';

export default function GalleryStrip() {
  const { state, dispatch } = useGeneration();
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  useEffect(() => {
    fetch('/api/gallery')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setGallery(data);
          dispatch({ type: 'SET_GALLERY', payload: data });
        }
      })
      .catch(() => {});
  }, []);

  const handleClick = (item: GalleryItem) => {
    dispatch({ type: 'SET_GENERATED_IMAGE', payload: item.url });
  };

  return (
    <section
      className="bg-bg-card border-t border-border flex flex-col"
      style={{
        gridArea: 'gallery',
        height: 220,
        padding: '16px 24px',
        gap: 8,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-bold text-[#f0f0f0]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1rem' }}
        >
          Previous Generations
        </span>
        <span
          className="text-text-dim uppercase tracking-widest"
          style={{ fontSize: '0.72rem', letterSpacing: 1 }}
        >
          {gallery.length} cloud{gallery.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {gallery.map((item) => {
          const isActive = state.generatedImageUrl === item.url;
          return (
            <div
              key={item.id}
              className={`flex-shrink-0 flex items-center justify-center rounded-lg border bg-bg-card-alt cursor-pointer transition-all relative overflow-hidden ${
                isActive
                  ? 'border-cyan shadow-[0_0_0_2px_rgba(0,229,255,0.2)]'
                  : 'border-border hover:border-pink hover:-translate-y-0.5 hover:shadow-[0_4px_12px_#00000066]'
              }`}
              style={{ width: 160, height: 120 }}
              onClick={() => handleClick(item)}
            >
              {item.url ? (
                <img
                  src={item.url}
                  alt={item.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="opacity-15"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '1.8rem',
                    fontWeight: 700,
                  }}
                >
                  ☁
                </span>
              )}
              <span
                className="absolute bottom-0 left-0 right-0 px-2 py-1 text-text-muted"
                style={{
                  fontSize: '0.65rem',
                  background: 'linear-gradient(transparent, #0a0a0acc)',
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
