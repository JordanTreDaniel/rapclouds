import { useState, useRef, useCallback } from 'react';

export interface Recording {
  /** Whether the recorder is currently active */
  isRecording: boolean;
  /** Start recording: requests mic access, sets up MediaRecorder */
  startRecording: () => Promise<void>;
  /** Stop recording and return the recorded Blob */
  stopRecording: () => Promise<Blob>;
  /** Cleanup: stop tracks without collecting the blob */
  cleanup: () => void;
}

export function useRecording(): Recording {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
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
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise<Blob>((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(new Blob([], { type: 'audio/webm' }));
        return;
      }
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        resolve(blob);
      };
      rec.stop();
      setIsRecording(false);
      // Brief delay to ensure all data events flush
      setTimeout(() => {
        rec.stream.getTracks().forEach((t) => t.stop());
      }, 300);
    });
  }, []);

  const cleanup = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
      rec.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    cleanup,
  };
}
