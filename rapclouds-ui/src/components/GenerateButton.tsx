import { useGeneration } from '../store/GenerationContext';

export function GenerateButton() {
  const { state, dispatch } = useGeneration();

  const handleGenerate = async () => {
    if (state.isGenerating) return;

    dispatch({ type: 'SET_GENERATING', payload: true });

    try {
      const payload = {
        font: state.font,
        width: state.width,
        height: state.height,
        clusters: state.clusters,
        maxWords: state.maxWords,
        margin: state.margin,
        horizontalRatio: state.horizontalRatio,
        relativeScaling: state.relativeScaling,
        repeatWords: state.repeatWords,
        includeNumbers: state.includeNumbers,
        detectEdges: state.detectEdges,
        phraseMode: state.phraseMode,
        maxNgram: state.maxNgram,
        collocations: state.collocations,
        coherentPhrases: state.coherentPhrases,
        colorMode: state.colorMode,
        customPalette: state.customPalette,
        bgColor: state.bgColor,
        transparentBg: state.transparentBg,
        useMaskColors: state.useMaskColors,
        maskAsBackground: state.maskAsBackground,
        detailSpeed: state.detailSpeed,
        cloudOpacity: state.cloudOpacity,
        watermark: state.watermark,
        drawContour: state.drawContour,
        contourThickness: state.contourThickness,
        contourColor: state.contourColor,
        maskImage: state.maskImage,
        mask_path: state.selectedMask || 'jcole_face_illustration.jpg',
        lyricsText: state.lyricsText,
        inputMode: state.inputMode,
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let detail = response.statusText;
        try {
          const errBody = await response.json();
          detail = errBody.detail || errBody.error || detail;
        } catch { /* non-JSON error — keep statusText */ }
        throw new Error(`Generation failed (${response.status}): ${detail}`);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      dispatch({ type: 'SET_GENERATED_IMAGE', payload: imageUrl });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      dispatch({ type: 'SET_GENERATING', payload: false });
    }
  };

  const progress = state.generationProgress;

  return (
    <button
      onClick={handleGenerate}
      disabled={state.isGenerating}
      className="w-full py-[14px] px-4 text-base font-bold rounded-lg text-white border-none cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg, #FF1493, #cc1177)',
        letterSpacing: '0.5px',
      }}
      onMouseEnter={(e) => {
        if (!state.isGenerating) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,20,147,0.27)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = state.isGenerating ? '' : 'translateY(-1px)';
      }}
    >
      {state.isGenerating ? (
        <span className="flex items-center justify-center gap-3">
          <span
            className="inline-block rounded-full"
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span>
            {progress
              ? `Generating... Layer ${progress.layer} of ${progress.total}`
              : 'Generating...'}
          </span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
              fill="currentColor"
            />
          </svg>
          Generate RapCloud
        </span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
