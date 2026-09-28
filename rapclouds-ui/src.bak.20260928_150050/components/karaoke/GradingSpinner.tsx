interface Props {
  active: boolean;
}

export default function GradingSpinner({ active }: Props) {
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: 'rgba(10,10,10,0.85)' }}
    >
      <div
        className="w-10 h-10 rounded-full"
        style={{
          border: '3px solid #333',
          borderTopColor: 'var(--color-pink)',
          animation: 'karaoke-spin 0.8s linear infinite',
        }}
      />
      <div className="text-[15px] font-medium mt-4" style={{ color: 'var(--color-text)' }}>
        Grading your performance...
      </div>
    </div>
  );
}
