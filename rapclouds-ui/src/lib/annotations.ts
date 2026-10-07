import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type AnnotationAction = 'hide' | 'show' | 'note';

export type AnnotationStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unauthorized';

export type AnnotationMode = 'public' | 'curator';

export interface AnnotationTargetState {
  hidden: boolean;
  note: string | null;
  noteUpdatedAt: string | null;
  hiddenAt: string | null;
}

export interface LandingConfig {
  hidden: string[];
  updatedAt: string | null;
}

export interface AnnotationEndpoints {
  annotations: string;
  landingConfig: string;
}

export interface AnnotationSearchWriter {
  (next: URLSearchParams, options?: { replace?: boolean }): void;
}

export interface UseAnnotationsOptions {
  endpoints?: Partial<AnnotationEndpoints>;
  token?: string | null;
}

export interface AnnotationsApi {
  mode: AnnotationMode;
  hiddenIds: Set<string>;
  targets: Record<string, AnnotationTargetState>;
  updatedAt: string | null;
  error: string | null;
  status: AnnotationStatus;
  saveAction: (target: string, action: AnnotationAction, note?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const TOKEN_REJECTED_MESSAGE = 'Token rejected — update your ?curate= link';

const DEFAULT_ENDPOINTS: AnnotationEndpoints = {
  annotations: '/api/annotations',
  landingConfig: '/api/landing-config.json',
};

const TARGET_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,95}$/;

export function isValidTargetId(target: string): boolean {
  return TARGET_PATTERN.test(target);
}

export function readCuratorParam(searchParams: URLSearchParams): string | null {
  const token = searchParams.get('curate');
  if (token === null) return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface RawTargetState {
  hidden?: unknown;
  note?: unknown;
  noteUpdatedAt?: unknown;
  hiddenAt?: unknown;
}

function parseTargetState(raw: unknown): AnnotationTargetState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as RawTargetState;
  const hidden = record.hidden === true;
  const note = typeof record.note === 'string' && record.note.length > 0 ? record.note : null;
  const noteUpdatedAt = typeof record.noteUpdatedAt === 'string' ? record.noteUpdatedAt : null;
  const hiddenAt = typeof record.hiddenAt === 'string' ? record.hiddenAt : null;
  return { hidden, note, noteUpdatedAt, hiddenAt };
}

function parseTargets(raw: unknown): Record<string, AnnotationTargetState> {
  const parsed: Record<string, AnnotationTargetState> = {};
  if (typeof raw !== 'object' || raw === null) return parsed;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const state = parseTargetState(value);
    if (state !== null) parsed[id] = state;
  }
  return parsed;
}

export function useAnnotations(options?: UseAnnotationsOptions): AnnotationsApi {
  const [searchParams] = useSearchParams();
  const paramToken = readCuratorParam(searchParams);
  const token = options?.token !== undefined ? options.token : paramToken;
  const mode: AnnotationMode = token !== null ? 'curator' : 'public';
  const annotationsPath = options?.endpoints?.annotations ?? DEFAULT_ENDPOINTS.annotations;
  const configPath = options?.endpoints?.landingConfig ?? DEFAULT_ENDPOINTS.landingConfig;

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [targets, setTargets] = useState<Record<string, AnnotationTargetState>>(() => ({}));
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AnnotationStatus>('idle');

  const loadConfig = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(configPath);
      if (!res.ok) throw new Error(`config ${res.status}`);
      const data = (await res.json()) as Partial<LandingConfig>;
      const hidden = Array.isArray(data.hidden) ? data.hidden : [];
      setHiddenIds(new Set(hidden));
      setUpdatedAt(typeof data.updatedAt === 'string' ? data.updatedAt : null);
      setError(null);
    } catch {
      setHiddenIds(new Set());
      setError('Landing config unavailable');
    }
  }, [configPath]);

  const loadCuratorState = useCallback(async (): Promise<void> => {
    if (token === null) return;
    try {
      const res = await fetch(annotationsPath, {
        headers: { 'X-Curator-Token': token },
      });
      if (res.status === 401) {
        setStatus('unauthorized');
        setError(TOKEN_REJECTED_MESSAGE);
        return;
      }
      if (res.status === 403) {
        setStatus('error');
        setError('Curator token not configured on the server');
        return;
      }
      if (!res.ok) throw new Error(`annotations ${res.status}`);
      const data = (await res.json()) as { updatedAt?: unknown; targets?: unknown };
      const parsed = parseTargets(data.targets);
      setTargets(parsed);
      const hidden = new Set<string>();
      for (const [id, state] of Object.entries(parsed)) {
        if (state.hidden) hidden.add(id);
      }
      setHiddenIds((prev) => {
        const next = new Set(prev);
        hidden.forEach((id) => next.add(id));
        return next;
      });
      setUpdatedAt(typeof data.updatedAt === 'string' ? data.updatedAt : null);
      setError(null);
      setStatus((prev) => (prev === 'error' || prev === 'unauthorized' ? 'idle' : prev));
    } catch {
      setStatus('error');
      setError('Could not load annotations');
    }
  }, [annotationsPath, token]);

  const refresh = useCallback(async (): Promise<void> => {
    await loadConfig();
    if (mode === 'curator') await loadCuratorState();
  }, [loadConfig, loadCuratorState, mode]);

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const res = await fetch(configPath);
        if (!res.ok) throw new Error(`config ${res.status}`);
        const data = (await res.json()) as Partial<LandingConfig>;
        if (cancelled) return;
        const hidden = Array.isArray(data.hidden) ? data.hidden : [];
        setHiddenIds(new Set(hidden));
        setUpdatedAt(typeof data.updatedAt === 'string' ? data.updatedAt : null);
        setError(null);
      } catch {
        if (cancelled) return;
        setHiddenIds(new Set());
        setError('Landing config unavailable');
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [configPath]);

  useEffect(() => {
    if (mode !== 'curator') return;
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const res = await fetch(annotationsPath, {
          headers: { 'X-Curator-Token': token ?? '' },
        });
        if (cancelled) return;
        if (res.status === 401) {
          setStatus('unauthorized');
          setError(TOKEN_REJECTED_MESSAGE);
          return;
        }
        if (res.status === 403) {
          setStatus('error');
          setError('Curator token not configured on the server');
          return;
        }
        if (!res.ok) throw new Error(`annotations ${res.status}`);
        const data = (await res.json()) as { updatedAt?: unknown; targets?: unknown };
        if (cancelled) return;
        const parsed = parseTargets(data.targets);
        setTargets(parsed);
        const hidden = new Set<string>();
        for (const [id, state] of Object.entries(parsed)) {
          if (state.hidden) hidden.add(id);
        }
        setHiddenIds((prev) => {
          const next = new Set(prev);
          hidden.forEach((id) => next.add(id));
          return next;
        });
        setUpdatedAt(typeof data.updatedAt === 'string' ? data.updatedAt : null);
        setError(null);
        setStatus((prev) => (prev === 'error' || prev === 'unauthorized' ? 'idle' : prev));
      } catch {
        if (cancelled) return;
        setStatus('error');
        setError('Could not load annotations');
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [annotationsPath, mode, token]);

  const saveAction = useCallback(
    async (target: string, action: AnnotationAction, note?: string): Promise<void> => {
      if (mode !== 'curator' || token === null) return;
      if (!isValidTargetId(target)) {
        setStatus('error');
        setError('Invalid target id');
        return;
      }
      setStatus('saving');
      setError(null);
      try {
        const body: { target: string; action: AnnotationAction; note?: string } = {
          target,
          action,
        };
        if (note !== undefined) body.note = note;
        const res = await fetch(annotationsPath, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Curator-Token': token,
          },
          body: JSON.stringify(body),
        });
        if (res.status === 401) {
          setStatus('unauthorized');
          setError(TOKEN_REJECTED_MESSAGE);
          return;
        }
        if (res.status === 403) {
          setStatus('error');
          setError('Curator token not configured on the server');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          setError('Save failed');
          return;
        }
        setStatus('saved');
        await refresh();
      } catch {
        setStatus('error');
        setError('Network error');
      }
    },
    [annotationsPath, mode, refresh, token],
  );

  const effectiveTargets = mode === 'curator' ? targets : {};

  return {
    mode,
    hiddenIds,
    targets: effectiveTargets,
    updatedAt,
    error,
    status: mode === 'curator' ? status : 'idle',
    saveAction,
    refresh,
  };
}
