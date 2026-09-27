import { useState, useRef, useCallback } from 'react';
import SongPicker from '../components/karaoke/SongPicker';
import SectionPicker from '../components/karaoke/SectionPicker';
import LyricsDisplay from '../components/karaoke/LyricsDisplay';
import RecordingControls from '../components/karaoke/RecordingControls';
import Countdown from '../components/karaoke/Countdown';
import GradingSpinner from '../components/karaoke/GradingSpinner';
import GradeCard from '../components/karaoke/GradeCard';
import type {
  SongMeta,
  GroundTruth,
  Section,
  GradeResult,
  ViewMode,
} from '../components/karaoke/types';

export default function Karaoke() {
  const [view, setView] = useState<ViewMode>('setup');
  const [song, setSong] = useState<SongMeta | null>(null);
  const [groundTruth, setGroundTruth] = useState<GroundTruth | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const [gradingActive, setGradingActive] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const gradingGuardRef = useRef(false);

  const handleSongSelect = useCallback(async (s: SongMeta) => {
    const name = s.name;
    setSong(s);
    setCurrentTime(0);

    // Fetch ground truth
    try {
      const r = await fetch(`/api/songs/${encodeURIComponent(name)}`);
      const gt: GroundTruth = await r.json();
      setGroundTruth(gt);
    } catch (e) {
      console.error('Failed to load ground truth', e);
      setGroundTruth(null);
    }

    // Fetch sections
    try {
      const sr = await fetch(`/songs/${encodeURIComponent(name)}/sections.json`);
      if (sr.ok) {
        const secs: Section[] = await sr.json();
        setSections(secs);
      } else {
        setSections([]);
      }
    } catch {
      setSections([]);
    }

    setSelectedSection(null);
    setView('performance');

    // Set audio source
    if (audioRef.current) {
      audioRef.current.src = `/songs/${encodeURIComponent(name)}/${s.audio}`;
      audioRef.current.load();
    }
  }, []);

  const handleSectionSelect = useCallback((sec: Section | null) => {
    setSelectedSection(sec);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = sec ? sec.start : 0;
    }
  }, []);

  const animate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function tick() {
      if (!audioRef.current) return;
      setCurrentTime(audioRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleCountdownDone = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // If clip selected, stop at clip end
    if (selectedSection) {
      audio.ontimeupdate = () => {
        if (audio.currentTime >= selectedSection.end) {
          finish();
        }
      };
    } else {
      audio.ontimeupdate = null;
    }

    audio.play();
    animate();
    audio.onended = () => finish();
  }, [selectedSection, animate]);

  const finish = useCallback(async () => {
    if (gradingGuardRef.current) return;
    gradingGuardRef.current = true;

    setIsRecording(false);
    cancelAnimationFrame(rafRef.current);

    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.ontimeupdate = null;
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }

    await new Promise((r) => setTimeout(r, 300));

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
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
              clip_start: selectedSection?.start ?? null,
              clip_end: selectedSection?.end ?? null,
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
  }, [song, selectedSection]);

  const handleStart = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !groundTruth) return;

    audio.currentTime = selectedSection ? selectedSection.start : 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(100);
      recorderRef.current = rec;
      setIsRecording(true);
      gradingGuardRef.current = false;

      // Start countdown
      setCountdownActive(true);
    } catch {
      alert('Mic access required. Please allow and retry.');
    }
  }, [groundTruth, selectedSection]);

  const handleStop = useCallback(() => {
    setIsRecording(false);
    cancelAnimationFrame(rafRef.current);
    gradingGuardRef.current = false;

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.ontimeupdate = null;
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }

    setCurrentTime(0);
  }, []);

  const handleBack = useCallback(() => {
    handleStop();
    setView('setup');
    setSong(null);
    setGroundTruth(null);
    setSections([]);
    setSelectedSection(null);
    setGradeResult(null);
  }, [handleStop]);

  const handleRetry = useCallback(() => {
    setSelectedSection(null);
    setCurrentTime(0);
    if (song) {
      handleSongSelect(song);
    }
  }, [song, handleSongSelect]);

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

      <audio ref={audioRef} preload="auto" />

      <div className="flex flex-col items-center px-4 py-8 max-w-[720px] mx-auto">
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
          <>
            {sections.length > 0 && (
              <SectionPicker
                sections={sections}
                selected={selectedSection}
                onSelect={handleSectionSelect}
              />
            )}

            {/* Progress bar */}
            <div
              className="w-full h-[3px] rounded-sm mb-3 overflow-hidden"
              style={{ background: 'var(--color-bg-card-alt)' }}
            >
              <div
                className="h-full transition-[width] duration-100"
                style={{
                  background: 'var(--color-pink)',
                  width: audioRef.current
                    ? `${(currentTime / (audioRef.current.duration || 1)) * 100}%`
                    : '0%',
                }}
              />
            </div>

            <LyricsDisplay
              words={filteredWords}
              currentTime={currentTime}
              clipStart={selectedSection?.start ?? null}
              clipEnd={selectedSection?.end ?? null}
              isPlaying={isRecording}
            />

            <RecordingControls
              isRecording={isRecording}
              isMuted={isMuted}
              onToggleMute={() => {
                const next = !isMuted;
                setIsMuted(next);
                if (audioRef.current) audioRef.current.muted = next;
              }}
              onStart={handleStart}
              onStop={handleStop}
              onBack={handleBack}
              canStart={!!groundTruth}
            />

            <div className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {isMuted
                ? 'Song muted — lyrics sync still active'
                : 'Song audio on — use headphones for best results'}
            </div>
          </>
        )}

        {/* ── GRADE VIEW ── */}
        {view === 'grade' && gradeResult && (
          <GradeCard grade={gradeResult} onRetry={handleRetry} onHome={handleBack} />
        )}
      </div>

      <Countdown active={countdownActive} onDone={() => { setCountdownActive(false); handleCountdownDone(); }} />
      <GradingSpinner active={gradingActive} />
    </>
  );
}
