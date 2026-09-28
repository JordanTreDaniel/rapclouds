interface Props {
  isRecording: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onStart: () => void;
  onStop: () => void;
  onBack: () => void;
  canStart: boolean;
}

export default function RecordingControls({
  isRecording,
  isMuted,
  onToggleMute,
  onStart,
  onStop,
  onBack,
  canStart,
}: Props) {
  return (
    <div className="flex gap-3 items-center justify-center mb-4 flex-wrap">
      {!isRecording ? (
        <button
          onClick={onStart}
          disabled={!canStart}
          className="border-none rounded-full px-7 py-3 font-semibold text-sm cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:scale-[1.04] disabled:opacity-[0.35] disabled:cursor-not-allowed disabled:transform-none"
          style={{
            background: 'var(--color-pink)',
            color: '#fff',
          }}
        >
          ▶ Play &amp; Rap
        </button>
      ) : (
        <button
          onClick={onStop}
          className="border-none rounded-full px-7 py-3 font-semibold text-sm cursor-pointer transition-all duration-200 flex items-center gap-1.5"
          style={{
            background: 'rgba(255,68,68,0.12)',
            color: '#FF4444',
            border: '1px solid rgba(255,68,68,0.25)',
          }}
        >
          ■ Stop
        </button>
      )}

      <button
        onClick={onToggleMute}
        className="rounded-full px-7 py-3 font-semibold text-lg cursor-pointer transition-all duration-200 flex items-center gap-1.5"
        style={{
          background: 'var(--color-bg-card-alt)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
        title="Toggle song audio"
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      <button
        onClick={onBack}
        className="rounded-full px-7 py-3 font-semibold text-sm cursor-pointer transition-all duration-200 flex items-center gap-1.5"
        style={{
          background: 'var(--color-bg-card-alt)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
      >
        ← Back
      </button>

      {/* Mic dot */}
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{
          background: isRecording ? '#FF4444' : '#333',
          boxShadow: isRecording ? '0 0 8px rgba(255,68,68,0.6)' : undefined,
          animation: isRecording ? 'karaoke-pulse 1s infinite' : undefined,
        }}
      />
    </div>
  );
}
