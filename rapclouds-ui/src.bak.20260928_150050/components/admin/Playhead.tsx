export default function Playhead() {
  return (
    <div className="relative w-0.5 h-full">
      {/* Diamond marker at top */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rotate-45 z-10" />
      {/* Vertical line */}
      <div className="w-0.5 h-full bg-blue-500" />
    </div>
  );
}
