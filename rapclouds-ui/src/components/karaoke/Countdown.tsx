import { useState, useEffect } from 'react';

interface Props {
  active: boolean;
  onDone: () => void;
}

export default function Countdown({ active, onDone }: Props) {
  const [num, setNum] = useState(3);

  useEffect(() => {
    if (!active) {
      setNum(3);
      return;
    }

    let cancelled = false;
    async function run() {
      for (let i = 3; i >= 1; i--) {
        if (cancelled) return;
        setNum(i);
        await new Promise((r) => setTimeout(r, 900));
      }
      if (cancelled) return;
      setNum(0); // "GO!"
      await new Promise((r) => setTimeout(r, 400));
      if (!cancelled) onDone();
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [active, onDone]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(10,10,10,0.92)' }}
    >
      <div
        className="font-black"
        key={num}
        style={{
          fontSize: 110,
          background: 'linear-gradient(135deg, var(--color-pink), var(--color-gold))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'karaoke-cpop 0.8s ease-out',
        }}
      >
        {num === 0 ? 'GO!' : num}
      </div>
    </div>
  );
}
