import { useState, useRef, useCallback } from 'react';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useRecording } from '../hooks/useRecording';
import SongPicker from '../components/karaoke/SongPicker';
import RangeSlider from '../components/karaoke/RangeSlider';
import LyricsDisplay from '../components/karaoke/LyricsDisplay';
import RecordingControls from '../components/karaoke/RecordingControls';
import Countdown from '../components/karaoke/Countdown';
import GradingSpinner from '../components/karaoke/GradingSpinner';
import GradeCard from '../components/karaoke/GradeCard';
import type {
  SongMeta,
  GroundTruth,
  GradeResult,
  ViewMode,
} from '../components/karaoke/types';

export default function Karaoke() {
  const [view, setView] = useState<ViewMode>('setup');
  const [song, setSong] = useState<SongMeta | null>(null);
  const [groundTruth, setGroundTruth] = useState<GroundTruth | null>(null);
  const [clipStart, setClipStart] = useState<number | null>(null);
  const [clipEnd, setClipEnd] = useState<number | null>(null);
  const [countdownActive, setCountdownActive] = useState(false);
  const [gradingActive, setGradingActive] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  const gradingGuardRef = useRef(false);

  const audio = useAudioPlayback();
  const recording = useRecording();

  const handleSongSelect = useCallback(async (s: SongMeta) => {
    const name = s.name;
    setSong(s);
    audio.resetTime();

    // Fetch ground truth
    try {
      const r = await fetch(`/api/songs/${encodeURIComponent(name)}`);
      const gt: GroundTruth = await r.json();
      setGroundTruth(gt);
    } catch (e) {
      console.error('Failed to load ground truth', e);
      setGroundTruth(null);
    }

    setClipStart(null);
    setClipEnd(null);
    setView('performance');

    // Set audio source
    audio.loadSrc(`/songs/${encodeURIComponent(name)}/${s.audio}`);
  }, [audio]);

  const handleRangeChange = useCallback((start: number | null, end: number | null) => {
    setClipStart(start);
    setClipEnd(end);
    audio.resetTime();
    audio.seek(start ?? 0);
  }, [audio]);

  const finish = useCallback(async () => {
    if (gradingGuardRef.current) return;
    gradingGuardRef.current = true;

    audio.stop();

    const blob = await recording.stopRecording();
    console.log(`Recording: ${blob.size} bytes`);

    setGradingActive(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const b64 = (reader.result as string).split(',')[1];
        try {
          const r = await fetch(`/api/songs/${encodeURIComponent(song?.name ?? '')}/grade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio: b64,
              clip_start: clipStart,
              clip_end: clipEnd,
            }),
          });
          const result: GradeResult = await r.json();
          setGradingActive(false);
          gradingGuardRef.current = false;
          if ('error' in result) {
            alert('Grading error: ' + (result as unknown as { error: string }).error);
            return;
          }
          setGradeResult(result);
          setView('grade');
        } catch (e) {
          setGradingActive(false);
          gradingGuardRef.current = false;
          alert('Grading failed: ' + (e as Error).message);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setGradingActive(false);
      gradingGuardRef.current = false;
      alert('Grading failed: ' + (e as Error).message);
    }
  }, [audio, recording, song, clipStart, clipEnd]);

  const handleCountdownDone = useCallback(() => {
    // If clip selected, stop at clip end
    if (clipEnd != null) {
      audio.audioRef.current!.ontimeupdate = () => {
        const el = audio.audioRef.current;
        if (el && el.currentTime >= clipEnd) {
          finish();
        }
      };
    } else {
      audio.audioRef.current!.ontimeupdate = null;
    }

    audio.play();
    audio.audioRef.current!.onended = () => finish();
  }, [clipEnd, audio, finish]);

  const handleStart = useCallback(async () => {
    if (!groundTruth) return;

    audio.seek(clipStart ?? 0);

    try {
      await recording.startRecording();
      gradingGuardRef.current = false;

      // Start countdown
      setCountdownActive(true);
    } catch {
      alert('Mic access required. Please allow and retry.');
    }
  }, [groundTruth, clipStart, audio, recording]);

  const handleStop = useCallback(() => {
    gradingGuardRef.current = false;
    audio.stop();
    recording.cleanup();
  }, [audio, recording]);

  const handleBack = useCallback(() => {
    handleStop();
    setView('setup');
    setSong(null);
    setGroundTruth(null);
    setClipStart(null);
    setClipEnd(null);
    setGradeResult(null);
  }, [handleStop]);

  const handleRetry = useCallback(() => {
    setClipStart(null);
    setClipEnd(null);
    audio.resetTime();
    if (song) {
      handleSongSelect(song);
    }
  }, [song, handleSongSelect, audio]);

  const filteredWords = groundTruth?.words ?? [];

  return (
    <>
      <style>{`
        @keyframes karaoke-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,68,68,0.6); }
          50% { box-shadow: 0 0 0 6px rgba(255,68,68,0); }
        }
        @keyframes karaoke-cpop {
          0% { transform: scale(1.4); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
        }
        @keyframes karaoke-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <audio ref={audio.audioRef} preload="auto" />

      <div className={`flex flex-col items-center px-4 max-w-[720px] mx-auto ${view === 'performance' ? 'h-screen py-4' : 'py-8'}`}>
        {/* ── SETUP VIEW ── */}
        {view === 'setup' && (
          <>
            <div className="text-center mb-7">
              <h1
                className="text-[42px] font-black"
                style={{
                  background: 'linear-gradient(135deg, var(--color-pink), var(--color-cyan))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                RAPCHECK
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Pick a song. Rap it. Get graded.
              </p>
            </div>
            <SongPicker onSelect={handleSongSelect} />
          </>
        )}

        {/* ── PERFORMANCE VIEW ── */}
        {view === 'performance' && (
          <div className="flex flex-col w-full flex-1 min-h-0">
            <RangeSlider
              duration={audio.duration}
              clipStart={clipStart}
              clipEnd={clipEnd}
              onChange={handleRangeChange}
            />

            {/* Progress bar */}
            <div
              className="w-full h-[3px] rounded-sm mb-3 overflow-hidden flex-none"
              style={{ background: 'var(--color-bg-card-alt)' }}
            >
              <div
                className="h-full transition-[width] duration-100"
                style={{
                  background: 'var(--color-pink)',
                  width: audio.duration
                    ? `${(audio.currentTime / (audio.duration || 1)) * 100}%`
                    : '0%',
                }}
              />
            </div>

            {/* Lyrics fill remaining space */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <LyricsDisplay
                words={filteredWords}
                currentTime={audio.currentTime}
                clipStart={clipStart}
                clipEnd={clipEnd}
                isPlaying={recording.isRecording}
              />
            </div>

            {/* Mute hint */}
            <div className="text-center text-xs flex-none py-2" style={{ color: 'var(--color-text-muted)' }}>
              {audio.isMuted
                ? 'Song muted — lyrics sync still active'
                : 'Song audio on — use headphones for best results'}
            </div>
          </div>
        )}

        {/* ── GRADE VIEW ── */}
        {view === 'grade' && gradeResult && (
          <GradeCard grade={gradeResult} onRetry={handleRetry} onHome={handleBack} />
        )}
      </div>

      {/* ── FIXED PLAYBACK CONTROLS ── */}
      {view === 'performance' && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none"
          style={{
            background: 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.92) 55%, transparent 100%)',
            paddingTop: '80px',
            paddingBottom: '28px',
          }}
        >
          <div className="pointer-events-auto">
            <RecordingControls
              isRecording={recording.isRecording}
              isMuted={audio.isMuted}
              onToggleMute={() => audio.setMuted(!audio.isMuted)}
              onStart={handleStart}
              onStop={handleStop}
              onBack={handleBack}
              canStart={!!groundTruth}
            />
          </div>
        </div>
      )}

      <Countdown active={countdownActive} onDone={() => { setCountdownActive(false); handleCountdownDone(); }} />
      <GradingSpinner active={gradingActive} />
    </>
  );
}
