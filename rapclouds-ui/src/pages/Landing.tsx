import { useRef } from 'react';
import LandingHeader from '../components/LandingHeader';
import Hero from '../components/landing/Hero';
import DualPath from '../components/landing/DualPath';
import GalleryBeat from '../components/landing/GalleryBeat';
import KaraokeSection from '../components/landing/KaraokeSection';
import SignupSection from '../components/landing/SignupSection';
import LandingFooter from '../components/landing/LandingFooter';
import { beats } from '../components/landing/beats';
import { useReveal } from '../hooks/useReveal';
import { useParallax } from '../hooks/useParallax';
import AnnotationLayer from '../components/annotations/AnnotationLayer';
import { useAnnotations } from '../lib/annotations';
import '../components/landing/landing.css';

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { mode, hiddenIds } = useAnnotations();

  useReveal(rootRef);
  useParallax(rootRef);

  const visibleBeats =
    mode === 'curator'
      ? beats
      : beats.filter((beat) => !hiddenIds.has(`gallery:${beat.image}`));

  return (
    <div className="landing" ref={rootRef}>
      <LandingHeader />
      <main>
        <section id="top">
          <Hero />
        </section>
        <section id="paths" data-annot-target="section:paths">
          <DualPath />
        </section>
        <section id="gallery" data-annot-target="section:gallery">
          {visibleBeats.map((beat) => (
            <GalleryBeat key={beat.id} beat={beat} />
          ))}
        </section>
        <section id="karaoke" data-annot-target="section:karaoke">
          <KaraokeSection />
        </section>
        <section id="order" data-annot-target="section:order">
          <SignupSection />
        </section>
      </main>
      <LandingFooter />
      <AnnotationLayer />
    </div>
  );
}
