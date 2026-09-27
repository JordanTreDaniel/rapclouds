import CloudDisplay from './CloudDisplay';

export default function MainDisplay() {
  return (
    <main
      className="flex flex-col items-center justify-center overflow-hidden"
      style={{
        gridArea: 'main',
        padding: 24,
        background: 'radial-gradient(ellipse at center, #111 0%, #0a0a0a 70%)',
      }}
    >
      <CloudDisplay />
    </main>
  );
}
