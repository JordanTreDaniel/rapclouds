# Admin Timeline Editor — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a horizontal timeline editor for word-level audio timing with playback, drag-to-edit, zoom, and auto-scroll — replacing the broken ReactFlow timing editor.

**Architecture:** Custom horizontal timeline using @dnd-kit for drag, HTMLAudioElement for playback, requestAnimationFrame for playhead sync. Hooks-first design with all logic in custom hooks. Save via existing PUT /api/songs/:name/timing endpoint.

**Tech Stack:** React 19, TypeScript, @dnd-kit/core, HTMLAudioElement, requestAnimationFrame, existing FastAPI backend

---

## Task Tree

### Phase 1: Hooks Foundation (extract + create)
- [ ] 1.1 Extract `useAudioPlayback` hook from Karaoke.tsx
- [ ] 1.2 Extract `useRecording` hook from Karaoke.tsx
- [ ] 1.3 Create `useTimeline` hook (zoom, word positioning, scroll)
- [ ] 1.4 Create `useWordDrag` hook (dnd-kit integration)

### Phase 2: Timeline Editor Core UI
- [ ] 2.1 Create `TimelineEditor` container component (vertical scroll, time axis)
- [ ] 2.2 Create `WordBlock` component (draggable, resizable word card)
- [ ] 2.3 Create `Playhead` component (vertical cursor line synced to audio)
- [ ] 2.4 Create `ZoomControls` component (zoom slider, presets)
- [ ] 2.5 Create `PlaybackControls` component (play/pause/skip/seek)

### Phase 3: Audio Integration
- [ ] 3.1 Wire audio playback to timeline (playhead sync)
- [ ] 3.2 Add active word highlighting with buffer (show upcoming words)
- [ ] 3.3 Add auto-scroll to keep active word centered
- [ ] 3.4 Add keyboard shortcuts (space=play/pause, click=seek)

### Phase 4: Word Editing
- [ ] 4.1 Click word to pause and edit text inline
- [ ] 4.2 Drag word edges to resize (adjust duration)
- [ ] 4.3 Drag word body to reposition (adjust start time)
- [ ] 4.4 Auto-save changes to D1 via existing API

### Phase 5: Admin Page Integration
- [ ] 5.1 Replace TimingEditor with new TimelineEditor
- [ ] 5.2 Add audio player section above timeline
- [ ] 5.3 Improve lyrics editor (Monaco or simpler)
- [ ] 5.4 Add song metadata display (artist, title, duration)

---

## Detailed Tasks

### Task 1.1: Extract `useAudioPlayback` hook

**Objective:** Extract the audio playback logic from Karaoke.tsx into a reusable hook.

**Files:**
- Create: `src/hooks/useAudioPlayback.ts`
- Modify: `src/pages/Karaoke.tsx` (replace inline logic with hook)

**What the hook provides:**
```ts
interface UseAudioPlaybackReturn {
  audioRef: React.RefObject<HTMLAudioElement>;
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  loadSrc: (src: string) => void;
}
```

**Implementation:**
- `audioRef` → `<audio>` element ref
- `currentTime` → updated via `requestAnimationFrame` loop reading `audioRef.current.currentTime`
- `isPlaying` → derived from audio state
- `play()` / `pause()` → `audioRef.current.play()` / `.pause()`
- `seek(time)` → `audioRef.current.currentTime = time`
- `loadSrc(src)` → `audioRef.current.src = src; audioRef.current.load()`

**Verification:**
- Import in Karaoke.tsx, replace inline logic
- Karaoke playback still works

---

### Task 1.2: Extract `useRecording` hook

**Objective:** Extract MediaRecorder logic from Karaoke.tsx.

**Files:**
- Create: `src/hooks/useRecording.ts`
- Modify: `src/pages/Karaoke.tsx`

**What the hook provides:**
```ts
interface UseRecordingReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  audioBlob: Blob | null;
}
```

**Implementation:**
- `getUserMedia({ audio: true })` with echo/noise suppression
- `MediaRecorder` with `audio/webm;codecs=opus`, `rec.start(100)`
- Chunk collection in ref
- `stopRecording()` → stops recorder, returns assembled blob

---

### Task 1.3: Create `useTimeline` hook

**Objective:** Core timeline math — zoom, pixel-to-time conversion, word positioning.

**Files:**
- Create: `src/hooks/useTimeline.ts`

**What the hook provides:**
```ts
interface UseTimelineReturn {
  zoom: number;                    // 0.01 to 5.0 (seconds per block)
  pxPerSecond: number;            // derived from zoom
  timeToPx: (time: number) => number;
  pxToTime: (px: number) => number;
  setZoom: (z: number) => void;
  totalHeight: number;            // based on audio duration + padding
  wordStyle: (word: Word) => { top: number; height: number };
}
```

**Math:**
- `pxPerSecond = BASE_PX_PER_SECOND * zoom` (zoom=1 → 200px/s, zoom=2 → 400px/s)
- `timeToPx(t) = t * pxPerSecond`
- `pxToTime(px) = px / pxPerSecond`
- `wordStyle` → `{ left: timeToPx(word.start), width: timeToPx(word.end - word.start) }`
- Granularity: placement snaps to `1 / (zoom * 10)` intervals (10x zoom resolution)

---

### Task 1.4: Create `useWordDrag` hook

**Objective:** Handle word drag/resize via @dnd-kit.

**Files:**
- Create: `src/hooks/useWordDrag.ts`

**What the hook provides:**
```ts
interface UseWordDragReturn {
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  activeWordId: string | null;
  dragType: 'move' | 'resize-top' | 'resize-bottom' | null;
}
```

**Implementation:**
- Detect drag type from event data (word body = move, top edge = resize-start, bottom edge = resize-end)
- On drag end: calculate new time from pixel delta, snap to granularity, update word
- Debounce 500ms before saving

---

### Task 2.1: Create `TimelineEditor` container

**Objective:** Vertical scrollable timeline with time axis labels.

**Files:**
- Create: `src/components/admin/TimelineEditor.tsx` (replace existing)

**Structure:**
```tsx
<div className="timeline-container" style={{ height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
  <div className="timeline-canvas" style={{ height: totalHeight, position: 'relative' }}>
    {/* Time axis labels (left side) */}
    {timeLabels.map(label => (
      <div className="time-label" style={{ top: timeToPx(label.time) }}>
        {formatTime(label.time)}
      </div>
    ))}
    
    {/* Grid lines */}
    {timeLabels.map(label => (
      <div className="grid-line" style={{ top: timeToPx(label.time) }} />
    ))}
    
    {/* Word blocks */}
    {words.map(word => (
      <WordBlock key={word.id} word={word} />
    ))}
    
    {/* Playhead */}
    <Playhead currentTime={currentTime} />
  </div>
</div>
```

---

### Task 2.2: Create `WordBlock` component

**Objective:** Draggable word card with resize handles.

**Files:**
- Create: `src/components/admin/WordBlock.tsx`

**Structure:**
```tsx
<div 
  className="word-block"
  style={{ 
    position: 'absolute',
    top: wordStyle(word).top,
    height: wordStyle(word).height,
    left: 60, // after time axis
    right: 20,
  }}
  data-word-id={word.id}
>
  {/* Top resize handle */}
  <div className="resize-handle top" data-resize="top" />
  
  {/* Word content */}
  <span className="word-text">{word.word}</span>
  
  {/* Bottom resize handle */}
  <div className="resize-handle bottom" data-resize="bottom" />
  
  {/* Time labels */}
  <span className="time-start">{formatTime(word.start)}</span>
  <span className="time-end">{formatTime(word.end)}</span>
</div>
```

---

### Task 2.3: Create `Playhead` component

**Objective:** Vertical cursor line synced to audio currentTime.

**Files:**
- Create: `src/components/admin/Playhead.tsx`

**Structure:**
```tsx
<div 
  className="playhead"
  style={{ 
    position: 'absolute',
    top: timeToPx(currentTime),
    left: 0,
    right: 0,
    height: 2,
    background: 'var(--color-pink)',
    zIndex: 10,
    pointerEvents: 'none',
  }}
>
  <div className="playhead-handle" /> {/* drag to seek */}
</div>
```

---

### Task 2.4: Create `ZoomControls` component

**Objective:** Zoom slider with presets.

**Files:**
- Create: `src/components/admin/ZoomControls.tsx`

**Presets:**
- 0.01s/block (maximum detail)
- 0.1s/block
- 0.5s/block (default — ~one word per block)
- 1.0s/block
- 3.0s/block (overview)

---

### Task 2.5: Create `PlaybackControls` component

**Objective:** Play/pause, skip, seek, time display.

**Files:**
- Create: `src/components/admin/PlaybackControls.tsx`

**Controls:**
- Play/Pause button (spacebar shortcut)
- Skip back 5s / Skip forward 5s
- Time display (current / total)
- Speed control (0.5x, 1x, 1.5x, 2x)

---

### Task 3.1-3.4: Audio Integration

**Objective:** Wire audio to timeline, add highlighting, auto-scroll, keyboard shortcuts.

**Key behaviors:**
- Playhead moves with audio.currentTime
- Active word (current time within word.start → word.end) gets pink highlight + glow
- Words within 2s of being spoken get subtle highlight (buffer)
- Auto-scroll keeps active word in viewport center
- Spacebar = play/pause, Click on timeline = seek, Click on word = pause + select

---

### Task 4.1-4.4: Word Editing

**Objective:** Click to edit text, drag edges to resize, drag body to move.

**Key behaviors:**
- Click word → pause audio, show inline text editor, save on blur/enter
- Drag top/bottom edge → resize word (adjust start/end time)
- Drag word body → move word (adjust start + end, keep duration)
- All changes auto-save to D1 via `PUT /api/songs/:name/timing`
- Granularity: snap to `zoom / 10` intervals

---

### Task 5.1-5.4: Admin Page Integration

**Objective:** Replace old TimingEditor, add audio player, improve lyrics editor.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Song: J Cole - Johnny P's Caddy                             │
│ Duration: 3:45 | Words: 257                                 │
├─────────────────────────────────────────────────────────────┤
│ [◀◀] [▶/❚❚] [▶▶] 1:23 / 3:45  [1x]  [Zoom: ===|===]     │  ← PlaybackControls + ZoomControls
├─────────────────────────────────────────────────────────────┤
│  0    0.5   1.0   1.5   2.0   2.5   3.0   3.5   4.0 ...  │  ← Time axis (scrollable)
│  ├────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼────┤     │
│  │if  │you'd│     │plee-│ase  │shut │     │the  │damn│     │  ← Word blocks (draggable)
│  │    │     │     │     │     │     │     │     │DOOR│     │    width = duration
│  ├────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼────┤     │
│  ▲ playhead (pink vertical line)                             │
├─────────────────────────────────────────────────────────────┤
│ Lyrics: [Monaco editor]                                     │  ← LyricsEditor
└─────────────────────────────────────────────────────────────┘
```

---

## Open Questions

1. **Audio file serving** — songs are served from `/songs/{name}`. Does the admin page need to load audio from the same endpoint?
2. **Concurrent editing** — if two people edit the same song's timing, who wins? (Probably not a concern for now)
3. **Undo/redo** — worth building now or later?

---

## Risks

1. **Performance with large songs** — 500+ words could cause rendering lag. Solution: virtual scrolling (only render visible words).
2. **Audio sync drift** — requestAnimationFrame may drift from audio time. Solution: use audio.currentTime directly, not accumulated delta.
3. **Mobile/touch** — drag and resize on touch devices. Solution: @dnd-kit supports touch sensors.
4. **Browser compatibility** — MediaRecorder not universal. Solution: webm/opus is widely supported.
