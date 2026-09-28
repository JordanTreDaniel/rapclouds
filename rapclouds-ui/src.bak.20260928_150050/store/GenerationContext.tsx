import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';

interface GalleryItem {
  id: string;
  url: string;
  timestamp: string;
  label: string;
}

interface GenerationState {
  font: string;
  width: number;
  height: number;
  clusters: number;
  maxWords: number;
  margin: number;
  horizontalRatio: number;
  relativeScaling: number;
  repeatWords: boolean;
  includeNumbers: boolean;
  detectEdges: boolean;
  phraseMode: boolean;
  maxNgram: number;
  collocations: boolean;
  coherentPhrases: boolean;
  colorMode: 'auto' | 'custom';
  customPalette: string[];
  bgColor: string;
  transparentBg: boolean;
  useMaskColors: boolean;
  maskAsBackground: boolean;
  detailSpeed: number;
  cloudOpacity: number;
  watermark: boolean;
  drawContour: boolean;
  contourThickness: number;
  contourColor: string;
  maskImage: string | null;
  lyricsText: string;
  inputMode: 'single' | 'album' | 'custom';
  generatedImageUrl: string | null;
  isGenerating: boolean;
  generationProgress: { layer: number; total: number } | null;
  gallery: GalleryItem[];
  availableTracks: string[];
  selectedTrack: string | null;
  selectedMask: string | null;
  availableMasks: string[];
}

type GenerationAction =
  | { type: 'SET_FONT'; payload: string }
  | { type: 'SET_WIDTH'; payload: number }
  | { type: 'SET_HEIGHT'; payload: number }
  | { type: 'SET_CLUSTERS'; payload: number }
  | { type: 'SET_MAX_WORDS'; payload: number }
  | { type: 'SET_MARGIN'; payload: number }
  | { type: 'SET_HORIZONTAL_RATIO'; payload: number }
  | { type: 'SET_RELATIVE_SCALING'; payload: number }
  | { type: 'TOGGLE_REPEAT' }
  | { type: 'TOGGLE_NUMBERS' }
  | { type: 'TOGGLE_EDGES' }
  | { type: 'SET_PHRASE_MODE'; payload: boolean }
  | { type: 'SET_MAX_NGRAM'; payload: number }
  | { type: 'TOGGLE_COLLOCATIONS' }
  | { type: 'TOGGLE_COHERENT' }
  | { type: 'SET_COLOR_MODE'; payload: 'auto' | 'custom' }
  | { type: 'SET_CUSTOM_PALETTE'; payload: string[] }
  | { type: 'SET_BG_COLOR'; payload: string }
  | { type: 'TOGGLE_TRANSPARENT_BG' }
  | { type: 'TOGGLE_MASK_COLORS' }
  | { type: 'TOGGLE_MASK_AS_BG' }
  | { type: 'SET_DETAIL_SPEED'; payload: number }
  | { type: 'SET_OPACITY'; payload: number }
  | { type: 'TOGGLE_WATERMARK' }
  | { type: 'TOGGLE_CONTOUR' }
  | { type: 'SET_CONTOUR_THICKNESS'; payload: number }
  | { type: 'SET_CONTOUR_COLOR'; payload: string }
  | { type: 'SET_MASK_IMAGE'; payload: string | null }
  | { type: 'SET_LYRICS_TEXT'; payload: string }
  | { type: 'SET_INPUT_MODE'; payload: 'single' | 'album' | 'custom' }
  | { type: 'SET_GENERATED_IMAGE'; payload: string | null }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_PROGRESS'; payload: { layer: number; total: number } | null }
  | { type: 'SET_GALLERY'; payload: GalleryItem[] }
  | { type: 'SET_AVAILABLE_TRACKS'; payload: string[] }
  | { type: 'SET_SELECTED_TRACK'; payload: string | null }
  | { type: 'SET_SELECTED_MASK'; payload: string | null }
  | { type: 'SET_AVAILABLE_MASKS'; payload: string[] }
  | { type: 'RESET_DEFAULTS' };

const defaultState: GenerationState = {
  font: 'Montserrat Black',
  width: 1600,
  height: 1600,
  clusters: 6,
  maxWords: 2000,
  margin: 2,
  horizontalRatio: 70,
  relativeScaling: 60,
  repeatWords: true,
  includeNumbers: true,
  detectEdges: false,
  phraseMode: true,
  maxNgram: 4,
  collocations: true,
  coherentPhrases: false,
  colorMode: 'auto',
  customPalette: [],
  bgColor: '#0a0a0a',
  transparentBg: false,
  useMaskColors: false,
  maskAsBackground: false,
  detailSpeed: 2,
  cloudOpacity: 255,
  watermark: true,
  drawContour: false,
  contourThickness: 3,
  contourColor: '#FFD700',
  maskImage: null,
  lyricsText: '',
  inputMode: 'single',
  generatedImageUrl: null,
  isGenerating: false,
  generationProgress: null,
  gallery: [],
  availableTracks: [],
  selectedTrack: null,
  selectedMask: null,
  availableMasks: [],
};

const STORAGE_KEY = 'rapclouds-generation-state';

function loadFromStorage(): GenerationState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultState, ...JSON.parse(stored) };
    }
  } catch (e) {
  }
  return null;
}

function saveToStorage(state: GenerationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
  }
}

function parseQueryParams(): Partial<GenerationState> {
  const params = new URLSearchParams(window.location.search);
  const updates: Partial<GenerationState> = {};

  if (params.has('font')) updates.font = params.get('font')!;
  if (params.has('width')) updates.width = parseInt(params.get('width')!, 10);
  if (params.has('height')) updates.height = parseInt(params.get('height')!, 10);
  if (params.has('clusters')) updates.clusters = parseInt(params.get('clusters')!, 10);
  if (params.has('maxWords')) updates.maxWords = parseInt(params.get('maxWords')!, 10);
  if (params.has('margin')) updates.margin = parseInt(params.get('margin')!, 10);
  if (params.has('horizontalRatio')) updates.horizontalRatio = parseInt(params.get('horizontalRatio')!, 10);
  if (params.has('relativeScaling')) updates.relativeScaling = parseInt(params.get('relativeScaling')!, 10);
  if (params.has('repeatWords')) updates.repeatWords = params.get('repeatWords') === 'true';
  if (params.has('includeNumbers')) updates.includeNumbers = params.get('includeNumbers') === 'true';
  if (params.has('detectEdges')) updates.detectEdges = params.get('detectEdges') === 'true';
  if (params.has('phraseMode')) updates.phraseMode = params.get('phraseMode') === 'true';
  if (params.has('maxNgram')) updates.maxNgram = parseInt(params.get('maxNgram')!, 10);
  if (params.has('collocations')) updates.collocations = params.get('collocations') === 'true';
  if (params.has('coherentPhrases')) updates.coherentPhrases = params.get('coherentPhrases') === 'true';
  if (params.has('colorMode')) updates.colorMode = params.get('colorMode') as 'auto' | 'custom';
  if (params.has('customPalette')) updates.customPalette = JSON.parse(params.get('customPalette')!);
  if (params.has('bgColor')) updates.bgColor = params.get('bgColor')!;
  if (params.has('transparentBg')) updates.transparentBg = params.get('transparentBg') === 'true';
  if (params.has('useMaskColors')) updates.useMaskColors = params.get('useMaskColors') === 'true';
  if (params.has('maskAsBackground')) updates.maskAsBackground = params.get('maskAsBackground') === 'true';
  if (params.has('detailSpeed')) updates.detailSpeed = parseInt(params.get('detailSpeed')!, 10);
  if (params.has('cloudOpacity')) updates.cloudOpacity = parseInt(params.get('cloudOpacity')!, 10);
  if (params.has('watermark')) updates.watermark = params.get('watermark') === 'true';
  if (params.has('drawContour')) updates.drawContour = params.get('drawContour') === 'true';
  if (params.has('contourThickness')) updates.contourThickness = parseInt(params.get('contourThickness')!, 10);
  if (params.has('contourColor')) updates.contourColor = params.get('contourColor')!;
  if (params.has('maskImage')) updates.maskImage = params.get('maskImage');
  if (params.has('inputMode')) updates.inputMode = params.get('inputMode') as 'single' | 'album' | 'custom';

  return updates;
}

function writeQueryParams(state: GenerationState): void {
  const params = new URLSearchParams();
  params.set('font', state.font);
  params.set('width', state.width.toString());
  params.set('height', state.height.toString());
  params.set('clusters', state.clusters.toString());
  params.set('maxWords', state.maxWords.toString());
  params.set('margin', state.margin.toString());
  params.set('horizontalRatio', state.horizontalRatio.toString());
  params.set('relativeScaling', state.relativeScaling.toString());
  params.set('repeatWords', state.repeatWords.toString());
  params.set('includeNumbers', state.includeNumbers.toString());
  params.set('detectEdges', state.detectEdges.toString());
  params.set('phraseMode', state.phraseMode.toString());
  params.set('maxNgram', state.maxNgram.toString());
  params.set('collocations', state.collocations.toString());
  params.set('coherentPhrases', state.coherentPhrases.toString());
  params.set('colorMode', state.colorMode);
  params.set('customPalette', JSON.stringify(state.customPalette));
  params.set('bgColor', state.bgColor);
  params.set('transparentBg', state.transparentBg.toString());
  params.set('useMaskColors', state.useMaskColors.toString());
  params.set('maskAsBackground', state.maskAsBackground.toString());
  params.set('detailSpeed', state.detailSpeed.toString());
  params.set('cloudOpacity', state.cloudOpacity.toString());
  params.set('watermark', state.watermark.toString());
  params.set('drawContour', state.drawContour.toString());
  params.set('contourThickness', state.contourThickness.toString());
  params.set('contourColor', state.contourColor);
  if (state.maskImage) params.set('maskImage', state.maskImage);
  params.set('inputMode', state.inputMode);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

function generationReducer(state: GenerationState, action: GenerationAction): GenerationState {
  switch (action.type) {
    case 'SET_FONT':
      return { ...state, font: action.payload };
    case 'SET_WIDTH':
      return { ...state, width: action.payload };
    case 'SET_HEIGHT':
      return { ...state, height: action.payload };
    case 'SET_CLUSTERS':
      return { ...state, clusters: action.payload };
    case 'SET_MAX_WORDS':
      return { ...state, maxWords: action.payload };
    case 'SET_MARGIN':
      return { ...state, margin: action.payload };
    case 'SET_HORIZONTAL_RATIO':
      return { ...state, horizontalRatio: action.payload };
    case 'SET_RELATIVE_SCALING':
      return { ...state, relativeScaling: action.payload };
    case 'TOGGLE_REPEAT':
      return { ...state, repeatWords: !state.repeatWords };
    case 'TOGGLE_NUMBERS':
      return { ...state, includeNumbers: !state.includeNumbers };
    case 'TOGGLE_EDGES':
      return { ...state, detectEdges: !state.detectEdges };
    case 'SET_PHRASE_MODE':
      return { ...state, phraseMode: action.payload };
    case 'SET_MAX_NGRAM':
      return { ...state, maxNgram: action.payload };
    case 'TOGGLE_COLLOCATIONS':
      return { ...state, collocations: !state.collocations };
    case 'TOGGLE_COHERENT':
      return { ...state, coherentPhrases: !state.coherentPhrases };
    case 'SET_COLOR_MODE':
      return { ...state, colorMode: action.payload };
    case 'SET_CUSTOM_PALETTE':
      return { ...state, customPalette: action.payload };
    case 'SET_BG_COLOR':
      return { ...state, bgColor: action.payload };
    case 'TOGGLE_TRANSPARENT_BG':
      return { ...state, transparentBg: !state.transparentBg };
    case 'TOGGLE_MASK_COLORS':
      return { ...state, useMaskColors: !state.useMaskColors };
    case 'TOGGLE_MASK_AS_BG':
      return { ...state, maskAsBackground: !state.maskAsBackground };
    case 'SET_DETAIL_SPEED':
      return { ...state, detailSpeed: action.payload };
    case 'SET_OPACITY':
      return { ...state, cloudOpacity: action.payload };
    case 'TOGGLE_WATERMARK':
      return { ...state, watermark: !state.watermark };
    case 'TOGGLE_CONTOUR':
      return { ...state, drawContour: !state.drawContour };
    case 'SET_CONTOUR_THICKNESS':
      return { ...state, contourThickness: action.payload };
    case 'SET_CONTOUR_COLOR':
      return { ...state, contourColor: action.payload };
    case 'SET_MASK_IMAGE':
      return { ...state, maskImage: action.payload };
    case 'SET_LYRICS_TEXT':
      return { ...state, lyricsText: action.payload };
    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.payload };
    case 'SET_GENERATED_IMAGE':
      return { ...state, generatedImageUrl: action.payload };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_PROGRESS':
      return { ...state, generationProgress: action.payload };
    case 'SET_GALLERY':
      return { ...state, gallery: action.payload };
    case 'SET_AVAILABLE_TRACKS':
      return { ...state, availableTracks: action.payload };
    case 'SET_SELECTED_TRACK':
      return { ...state, selectedTrack: action.payload };
    case 'SET_SELECTED_MASK':
      return { ...state, selectedMask: action.payload };
    case 'SET_AVAILABLE_MASKS':
      return { ...state, availableMasks: action.payload };
    case 'RESET_DEFAULTS':
      return { ...defaultState };
    default:
      return state;
  }
}

const GenerationContext = createContext<{
  state: GenerationState;
  dispatch: React.Dispatch<GenerationAction>;
} | null>(null);

function GenerationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(generationReducer, defaultState, () => {
    const stored = loadFromStorage();
    const queryUpdates = parseQueryParams();
    return { ...defaultState, ...stored, ...queryUpdates };
  });

  useEffect(() => {
    saveToStorage(state);
    writeQueryParams(state);
  }, [state]);

  return (
    <GenerationContext.Provider value={{ state, dispatch }}>
      {children}
    </GenerationContext.Provider>
  );
}

function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
}

export { GenerationProvider, useGeneration, defaultState };
export type { GenerationState, GenerationAction, GalleryItem };
