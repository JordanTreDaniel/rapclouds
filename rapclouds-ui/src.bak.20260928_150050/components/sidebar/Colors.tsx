import { useState, useRef } from 'react';
import { useGeneration } from '../../store/GenerationContext';

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        checked ? 'bg-pink' : 'bg-border-light'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-text-muted">
      {children}
    </p>
  );
}

function PaletteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Colors() {
  const { state, dispatch } = useGeneration();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingBg, setEditingBg] = useState(false);
  const [bgDraft, setBgDraft] = useState(state.bgColor);

  const addColor = () => {
    const input = fileInputRef.current;
    if (input) input.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const color = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    dispatch({ type: 'SET_CUSTOM_PALETTE', payload: [...state.customPalette, color] });
    e.target.value = '';
  };

  const removeColor = (index: number) => {
    const next = state.customPalette.filter((_, i) => i !== index);
    dispatch({ type: 'SET_CUSTOM_PALETTE', payload: next });
  };

  const commitBgDraft = () => {
    const hex = bgDraft.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      dispatch({ type: 'SET_BG_COLOR', payload: hex });
    }
    setEditingBg(false);
  };

  return (
    <section className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="color"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex items-center gap-2 text-text">
        <PaletteIcon />
        <span className="text-sm font-semibold">Colors</span>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Color Mode</SectionLabel>
        <div className="flex gap-2">
          {(['auto', 'custom'] as const).map((mode) => {
            const active = state.colorMode === mode;
            const label = mode === 'auto' ? 'Auto (K-Means)' : 'Custom Palette';
            return (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  dispatch({ type: 'SET_COLOR_MODE', payload: mode })
                }
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  active
                    ? 'border-pink text-pink bg-pink/10'
                    : 'border-border-light text-text-muted bg-transparent hover:border-text-dim'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {state.colorMode === 'custom' && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Custom Palette</SectionLabel>
          <div className="flex flex-wrap gap-2 items-center">
            {state.customPalette.map((color, i) => {
              const isActive = i === 0;
              return (
                <div key={`${color}-${i}`} className="relative group">
                  <button
                    type="button"
                    className={`w-7 h-7 rounded-md border-2 transition-shadow ${
                      isActive
                        ? 'border-white shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                        : 'border-transparent hover:border-white/30'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                  <button
                    type="button"
                    onClick={() => removeColor(i)}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[0.55rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addColor}
              className="w-7 h-7 rounded-md border-2 border-dashed border-border-light text-text-dim flex items-center justify-center hover:border-text-muted transition-colors text-sm"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <SectionLabel>Background</SectionLabel>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={state.bgColor}
              onChange={(e) =>
                dispatch({ type: 'SET_BG_COLOR', payload: e.target.value })
              }
              className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
            />
            <div
              className="w-7 h-7 rounded-md border border-border-light"
              style={{ backgroundColor: state.bgColor }}
            />
          </div>
          {editingBg ? (
            <input
              autoFocus
              type="text"
              value={bgDraft}
              onChange={(e) => setBgDraft(e.target.value)}
              onBlur={commitBgDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitBgDraft();
                if (e.key === 'Escape') {
                  setBgDraft(state.bgColor);
                  setEditingBg(false);
                }
              }}
              className="bg-bg-input border border-border-light rounded px-2 py-0.5 text-xs text-text w-20 font-mono focus:outline-none focus:border-pink"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setBgDraft(state.bgColor);
                setEditingBg(true);
              }}
              className="text-xs text-text-muted font-mono hover:text-text transition-colors"
            >
              {state.bgColor}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Transparent BG</span>
          <Toggle
            checked={state.transparentBg}
            onChange={() => dispatch({ type: 'TOGGLE_TRANSPARENT_BG' })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Use Mask Colors</span>
          <Toggle
            checked={state.useMaskColors}
            onChange={() => dispatch({ type: 'TOGGLE_MASK_COLORS' })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Mask as Background</span>
          <Toggle
            checked={state.maskAsBackground}
            onChange={() => dispatch({ type: 'TOGGLE_MASK_AS_BG' })}
          />
        </div>
      </div>
    </section>
  );
}
