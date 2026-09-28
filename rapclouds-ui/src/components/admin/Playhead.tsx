interface PlayheadProps {
  currentTime: number;
  pxPerSecond: number;
}

export default function Playhead({ currentTime, pxPerSecond }: PlayheadProps) {
  const left = currentTime * pxPerSecond;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none"
      style={{ left: `${left}px` }}
    >
      {/* Triangle marker at top */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rotate-45" />
    </div>
  );
}
