import type { GradeResult } from './types';

interface Props {
  grade: GradeResult;
  onRetry: () => void;
  onHome: () => void;
}

const GRADE_COLORS: Record<string, string> = {
  S: 'var(--color-gold)',
  A: 'var(--color-green)',
  B: 'var(--color-cyan)',
  C: 'var(--color-gold)',
  D: '#FF9800',
  F: '#FF4444',
};

function formatDiff(diff: number | null) {
  if (diff === null || diff === undefined) return '';
  return `+${diff.toFixed(1)}s`;
}

export default function GradeCard({ grade, onRetry, onHome }: Props) {
  const color = GRADE_COLORS[grade.grade] ?? 'var(--color-text)';

  return (
    <div
      className="w-full max-w-[440px] rounded-2xl p-8 text-center"
      style={{ background: 'var(--color-bg-card)' }}
    >
      <div
        className="text-xs uppercase tracking-[2px]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Your Grade
      </div>
      <div
        className="text-[72px] font-black my-3"
        style={{
          color,
          textShadow: grade.grade === 'S' ? '0 0 24px rgba(255,215,0,0.4)' : undefined,
        }}
      >
        {grade.grade}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 my-5">
        <div className="rounded-[10px] p-3.5" style={{ background: 'var(--color-bg-card-alt)' }}>
          <div className="text-2xl font-extrabold">{grade.accuracy}%</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Accuracy
          </div>
        </div>
        <div className="rounded-[10px] p-3.5" style={{ background: 'var(--color-bg-card-alt)' }}>
          <div className="text-2xl font-extrabold">{grade.timing}%</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Timing
          </div>
        </div>
        <div className="rounded-[10px] p-3.5" style={{ background: 'var(--color-bg-card-alt)' }}>
          <div className="text-2xl font-extrabold">
            {grade.score}/{grade.max}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Score
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="text-left mt-5">
        <h3
          className="text-xs mb-2.5 uppercase tracking-[1px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Breakdown
        </h3>
        <Brow label="Correct words" value={String(grade.correct)} color="var(--color-green)" />
        <Brow label="Right word, off timing" value={String(grade.partial)} color="var(--color-gold)" />
        <Brow label="Missed" value={String(grade.missed)} color="#FF4444" />
        <Brow
          label="Flow recoveries"
          value={String(grade.flow_recoveries)}
          color="var(--color-cyan)"
        />
        <Brow
          label="You sang / expected"
          value={`${grade.total_attempted ?? grade.user_words} / ${grade.total_words}`}
        />
      </div>

      {/* Word-by-word transcript */}
      {grade.details && grade.details.length > 0 && (
        <div className="text-left mt-5">
          <h3
            className="text-xs mb-2.5 uppercase tracking-[1px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Time-Aligned Transcript
          </h3>
          <div className="grid gap-[2px] text-[13px] leading-[1.8]" style={{ gridTemplateColumns: '60px 1fr 1fr 50px' }}>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              TIME
            </div>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              EXPECTED
            </div>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              YOU SAID
            </div>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              SCORE
            </div>
            {grade.details.map((w, i) => {
              const isCorrect = w.status === 'correct';
              const isLate = w.status === 'late';
              return (
                <>
                  <div key={`t-${i}`} style={{ color: 'var(--color-text-muted)' }}>
                    {formatDiff(w.diff)}
                  </div>
                  <div
                    key={`e-${i}`}
                    style={
                      !isCorrect && !isLate
                        ? { color: 'var(--color-green)', fontWeight: 600 }
                        : undefined
                    }
                  >
                    {w.expected || '—'}
                  </div>
                  <div
                    key={`s-${i}`}
                    style={{
                      color: isCorrect
                        ? 'var(--color-green)'
                        : isLate
                          ? 'var(--color-gold)'
                          : '#FF4444',
                      textDecoration: !isCorrect && !isLate ? 'line-through' : undefined,
                    }}
                  >
                    {w.word}
                  </div>
                  <div key={`sc-${i}`} style={{ color: 'var(--color-text-muted)' }}>
                    {w.score}
                  </div>
                </>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2.5 justify-center mt-5">
        <button
          onClick={onRetry}
          className="border-none rounded-full px-7 py-3 font-semibold text-sm cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:scale-[1.04]"
          style={{ background: 'var(--color-pink)', color: '#fff' }}
        >
          Try Again
        </button>
        <button
          onClick={onHome}
          className="rounded-full px-7 py-3 font-semibold text-sm cursor-pointer transition-all duration-200 flex items-center gap-1.5"
          style={{
            background: 'var(--color-bg-card-alt)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          Pick Another
        </button>
      </div>
    </div>
  );
}

function Brow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="flex justify-between py-1.5 text-[13px]"
      style={{ borderBottom: '1px solid var(--color-bg-card-alt)' }}
    >
      <span>{label}</span>
      <span style={{ color: color ?? 'var(--color-text)' }}>{value}</span>
    </div>
  );
}
