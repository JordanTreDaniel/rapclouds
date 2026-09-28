import { useState, useCallback, useEffect } from 'react';
import SongList from '../components/admin/SongList';
import LyricsEditor from '../components/admin/LyricsEditor';
import TimelineEditor from '../components/admin/TimelineEditor';
import { fetchSong, fetchSongs, updateSongText, updateSongTiming } from '../api';
import type { GroundTruth, SongMeta } from '../types';

type Tab = 'lyrics' | 'timing';

export default function Admin() {
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [songData, setSongData] = useState<GroundTruth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('timing');
  const [saving, setSaving] = useState(false);
  const [songs, setSongs] = useState<SongMeta[]>([]);

  useEffect(() => {
    fetchSongs().then(setSongs).catch(() => {});
  }, []);

  const loadSong = useCallback(async (name: string) => {
    setSelectedSong(name);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSong(name);
      setSongData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load song');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTextSave = useCallback(async (text: string) => {
    if (!selectedSong || !songData) return;
    setSaving(true);
    try {
      await updateSongText(selectedSong, text);
      setSongData((prev) => prev ? { ...prev, text } : prev);
    } catch (err) {
      console.error('Failed to save text:', err);
    } finally {
      setSaving(false);
    }
  }, [selectedSong, songData]);

  const handleTimingSave = useCallback(async (words: GroundTruth['words']) => {
    if (!selectedSong || !songData) return;
    setSaving(true);
    try {
      const updated: GroundTruth = { ...songData, words };
      await updateSongTiming(selectedSong, updated);
      setSongData(updated);
    } catch (err) {
      console.error('Failed to save timing:', err);
    } finally {
      setSaving(false);
    }
  }, [selectedSong, songData]);

  // Song selected, show editor
  if (selectedSong) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Top bar */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-card">
          <button
            onClick={() => { setSelectedSong(null); setSongData(null); }}
            className="text-text-muted hover:text-text text-sm"
          >
            ← Songs
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-text font-semibold truncate">{selectedSong}</h2>
            {songData && (
              <span className="text-xs text-text-muted">
                {songData.words.length} words · {songData.text.length} chars
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {saving && <span className="text-xs text-pink animate-pulse">Saving…</span>}
            {/* Tab switcher */}
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setActiveTab('lyrics')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === 'lyrics'
                    ? 'bg-pink text-white'
                    : 'text-text-muted hover:text-text hover:bg-bg-card-alt'
                }`}
              >
                Lyrics
              </button>
              <button
                onClick={() => setActiveTab('timing')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === 'timing'
                    ? 'bg-pink text-white'
                    : 'text-text-muted hover:text-text hover:bg-bg-card-alt'
                }`}
              >
                Timing
              </button>
            </div>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-border border-t-pink rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-500 text-lg font-medium mb-2">Error loading song</div>
                <div className="text-text-muted text-sm">{error}</div>
                <button
                  onClick={() => loadSong(selectedSong)}
                  className="mt-4 px-4 py-2 rounded-md bg-pink text-white text-sm hover:opacity-90"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : songData ? (
            activeTab === 'lyrics' ? (
              <LyricsEditor text={songData.text} onSave={handleTextSave} />
            ) : (
              <TimelineEditor words={songData.words} onTimingSave={handleTimingSave} audioUrl={
                (() => {
                  const meta = songs.find((s) => s.name === selectedSong);
                  return meta ? `/songs/${encodeURIComponent(selectedSong)}/${meta.audio}` : null;
                })()
              } />
            )
          ) : null}
        </div>
      </div>
    );
  }

  // Song list view
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Admin</h1>
        <p className="text-text-muted text-sm mt-1">Select a song to edit lyrics and timing.</p>
      </div>
      <SongList onSelect={loadSong} />
    </div>
  );
}
