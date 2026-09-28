export interface SongMeta {
  name: string;
  audio: string;
  words: number;
  segments: number;
  duration: number;
  youtube_url: string;
}

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface GroundTruth {
  text: string;
  words: Word[];
}

export interface Section {
  label: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';
  start: number;
  end: number;
  word_count: number;
  preview: string;
}

export interface GradeDetail {
  word: string;
  expected: string;
  status: 'correct' | 'late' | 'miss';
  score: number;
  diff: number | null;
}

export interface GradeResult {
  grade: string;
  accuracy: number;
  timing: number;
  score: number;
  max: number;
  correct: number;
  partial: number;
  missed: number;
  total_words: number;
  total_attempted: number;
  user_words: number;
  flow_recoveries: number;
  details: GradeDetail[];
  segments: Record<string, unknown>[];
}

export type ViewMode = 'setup' | 'performance' | 'grading' | 'grade';
