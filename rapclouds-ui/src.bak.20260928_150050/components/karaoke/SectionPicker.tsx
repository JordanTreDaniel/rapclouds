import type { Section } from './types';

interface Props {
  sections: Section[];
  selected: Section | null;
  onSelect: (section: Section | null) => void;
}

const LABEL_COLORS: Record<string, string> = {
  verse: 'var(--color-cyan)',
  chorus: 'var(--color-pink)',
  intro: 'var(--color-gold)',
  outro: 'var(--color-text-muted)',
  bridge: '#FF9800',
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

export default function SectionPicker({ sections, selected, onSelect }: Props) {
  if (!sections.length) return null;

  return (
    <div
      className="w-full rounded-[14px] p-5 mb-4"
      style={{ background: 'var(--color-bg-card)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Pick a section to rap</span>
        <button
          onClick={() => onSelect(null)}
          className="rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-200"
          style={{
            background: 'var(--color-bg-card-alt)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          Full Song
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {sections.map((sec, i) => {
          const color = LABEL_COLORS[sec.label] ?? 'var(--color-text-muted)';
          const isSelected = selected === sec;
          return (
            <button
              key={`${sec.label}-${i}`}
              onClick={() => onSelect(isSelected ? null : sec)}
              className="flex items-center gap-2.5 rounded-[10px] px-[18px] py-3 text-sm cursor-pointer transition-all duration-200 hover:bg-pink/5"
              style={{
                background: 'var(--color-bg-card-alt)',
                border: `1px solid ${isSelected ? 'var(--color-pink)' : 'var(--color-border)'}`,
                color: 'var(--color-text)',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <span className="font-extrabold text-xs" style={{ color: 'var(--color-pink)', width: 20 }}>
                {i + 1}
              </span>
              <div className="text-left">
                <div className="text-[13px]">
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-[2px] rounded mr-2"
                    style={{ background: `${color}20`, color }}
                  >
                    {sec.label}
                  </span>
                  {formatTime(sec.start)} — {formatTime(sec.end)} ({Math.round(sec.end - sec.start)}s)
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                  {sec.word_count} words — {sec.preview}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
