import { useGeneration } from '../store/GenerationContext';

interface ExportButtonsProps {
  variant?: 'header' | 'sidebar';
}

export function ExportButtons({ variant = 'header' }: ExportButtonsProps) {
  const { state } = useGeneration();
  const { generatedImageUrl } = state;

  const handleDownloadPNG = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = 'rapcloud.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = async () => {
    if (!generatedImageUrl) return;
    await navigator.clipboard.writeText(generatedImageUrl);
  };

  const buttonBase = 'flex items-center gap-1.5 border rounded font-medium hover:bg-hover hover:border-border-light transition-colors';

  const buttonStyles = `${buttonBase} px-[10px] py-[5px] border-border bg-bg-card-alt text-text text-[0.72rem] font-medium`;

  const cyanButtonStyles = `${buttonBase} px-[10px] py-[5px] border-cyan/27 bg-cyan/9 text-cyan hover:bg-hover hover:border-border-light transition-colors`;

  return (
    <div className={variant === 'header' ? 'flex items-center gap-2' : 'flex flex-col gap-2 w-full'}>
      <button
        onClick={handleDownloadPNG}
        className={buttonStyles}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 2v7M3.5 6.5L7 10l3.5-3.5M2.5 12h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Download PNG
      </button>

      <button
        className={buttonStyles}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 2v7M3.5 6.5L7 10l3.5-3.5M2.5 12h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Download SVG
      </button>

      <button
        onClick={handleCopyToClipboard}
        className={cyanButtonStyles}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4.5" y="4.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9.5 4.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Copy to Clipboard
      </button>
    </div>
  );
}
