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
import '../components/landing/landing.css';

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);

  useReveal(rootRef);
  useParallax(rootRef);

  return (
    <div className="landing" ref={rootRef}>
      <LandingHeader />
      <main>
        <section id="top">
          <Hero />
        </section>
        <section id="paths">
          <DualPath />
        </section>
        <section id="gallery">
          {beats.map((beat) => (
            <GalleryBeat key={beat.id} beat={beat} />
          ))}
        </section>
        <section id="karaoke">
          <KaraokeSection />
        </section>
        <section id="order">
          <SignupSection />
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
