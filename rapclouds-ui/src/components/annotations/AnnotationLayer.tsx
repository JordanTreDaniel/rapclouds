import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TOKEN_REJECTED_MESSAGE,
  useAnnotations,
} from '../../lib/annotations';
import type {
  AnnotationEndpoints,
  AnnotationSearchWriter,
  AnnotationStatus,
} from '../../lib/annotations';

export interface AnnotationLayerProps {
  endpoints?: Partial<AnnotationEndpoints>;
  search?: URLSearchParams;
  onSearch?: AnnotationSearchWriter;
}

interface AnnotationLayerCoreProps {
  searchParams: URLSearchParams;
  onSearch: AnnotationSearchWriter;
  endpoints: Partial<AnnotationEndpoints> | undefined;
}

interface DrawerRow {
  id: string;
  hidden: boolean;
  note: string;
  hasNote: boolean;
  latest: string | null;
}

function findTargetEl(id: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-annot-target]'));
  return els.find((el) => el.dataset.annotTarget === id) ?? null;
}

function formatStamp(iso: string | null): string {
  if (iso === null) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function statusTextFor(status: AnnotationStatus, error: string | null): string {
  if (status === 'unauthorized') return TOKEN_REJECTED_MESSAGE;
  if (status === 'saving') return 'Saving...';
  if (status === 'saved') return 'Saved';
  if (status === 'error') return error ?? 'Error — try again';
  return '';
}

function AnnotationLayerCore({
  searchParams,
  onSearch,
  endpoints,
}: AnnotationLayerCoreProps): JSX.Element | null {
  const { mode, hiddenIds, targets, status, error, saveAction } = useAnnotations({ endpoints });
  const sel = searchParams.get('sel');
  const panelOpen = searchParams.get('panel') === '1';

  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ target: string; value: string } | null>(null);
  const [drawerDrafts, setDrawerDrafts] = useState<Record<string, string>>({});
  const skipScrollRef = useRef(false);

  const setSel = useCallback(
    (value: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (value === null) next.delete('sel');
      else next.set('sel', value);
      onSearch(next, { replace: true });
    },
    [onSearch, searchParams],
  );

  const setPanel = useCallback(
    (open: boolean) => {
      const next = new URLSearchParams(searchParams);
      if (open) next.set('panel', '1');
      else next.delete('panel');
      onSearch(next, { replace: true });
    },
    [onSearch, searchParams],
  );

  const openTarget = useCallback(
    (id: string, scroll: boolean) => {
      skipScrollRef.current = !scroll;
      setSel(id);
    },
    [setSel],
  );

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-annot-target]');
    els.forEach((el) => {
      const id = el.dataset.annotTarget ?? '';
      const state = targets[id];
      const isHidden = state !== undefined ? state.hidden : hiddenIds.has(id);
      el.classList.toggle('rc-annot-hidden', mode === 'curator' && isHidden);
      if (mode === 'curator') {
        el.setAttribute('tabindex', '0');
      } else if (el.getAttribute('tabindex') === '0') {
        el.removeAttribute('tabindex');
      }
    });
  }, [hiddenIds, mode, targets]);

  useEffect(() => {
    if (mode !== 'curator') return;
    document.body.classList.add('rc-curator');
    return () => {
      document.body.classList.remove('rc-curator');
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'curator') return;
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>('[data-annot-target]');
      if (!el) return;
      const id = el.dataset.annotTarget ?? '';
      if (id.length === 0) return;
      openTarget(id, false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [mode, openTarget]);

  useEffect(() => {
    if (mode !== 'curator') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      const id = active.dataset.annotTarget ?? '';
      if (id.length === 0) return;
      e.preventDefault();
      openTarget(id, false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, openTarget]);

  useEffect(() => {
    if (mode !== 'curator') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (panelOpen) {
        setPanel(false);
        return;
      }
      if (sel !== null) setSel(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, panelOpen, sel, setPanel, setSel]);

  useEffect(() => {
    if (mode !== 'curator' || sel === null) return;
    const place = () => {
      const el = findTargetEl(sel);
      if (!el) {
        setPopoverPos(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const width = 320;
      const margin = 12;
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.min(Math.max(margin, left), window.innerWidth - width - margin);
      const popHeight = 320;
      let top = rect.bottom + 12;
      if (top + popHeight > window.innerHeight - margin) top = rect.top - popHeight - 12;
      if (top < margin) top = margin;
      setPopoverPos({ top, left });
    };
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [mode, sel]);

  useEffect(() => {
    if (mode !== 'curator' || sel === null) return;
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    const el = findTargetEl(sel);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [mode, sel]);

  const targetState = sel !== null ? targets[sel] : undefined;
  const hiddenNow =
    targetState !== undefined ? targetState.hidden : sel !== null && hiddenIds.has(sel);
  const noteValue =
    noteDraft !== null && noteDraft.target === sel
      ? noteDraft.value
      : sel !== null
        ? (targets[sel]?.note ?? '')
        : '';

  const rows = useMemo<DrawerRow[]>(() => {
    return Object.keys(targets)
      .sort()
      .map((id) => {
        const state = targets[id];
        const hidden = state !== undefined ? state.hidden : hiddenIds.has(id);
        const serverNote = state?.note ?? '';
        const draft = drawerDrafts[id];
        const note = draft !== undefined ? draft : serverNote;
        const stamps = [state?.hiddenAt ?? null, state?.noteUpdatedAt ?? null].filter(
          (s): s is string => s !== null,
        );
        const latest = stamps.length > 0 ? stamps.sort().slice(-1)[0] : null;
        return { id, hidden, note, hasNote: serverNote.length > 0, latest };
      });
  }, [drawerDrafts, hiddenIds, targets]);

  const statusText = statusTextFor(status, error);

  const onToggleHide = () => {
    if (sel === null) return;
    void saveAction(sel, hiddenNow ? 'show' : 'hide');
  };

  const onSaveNote = () => {
    if (sel === null) return;
    void saveAction(sel, 'note', noteValue);
  };

  const onDrawerNoteChange = (id: string, value: string) => {
    setDrawerDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const onDrawerNoteBlur = (id: string) => {
    const draft = drawerDrafts[id];
    if (draft === undefined) return;
    const serverNote = targets[id]?.note ?? '';
    setDrawerDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (draft !== serverNote) void saveAction(id, 'note', draft);
  };

  const onDeleteNote = (id: string) => {
    setDrawerDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    void saveAction(id, 'note', '');
  };

  if (mode !== 'curator') return null;

  return (
    <>
      {sel !== null && popoverPos !== null && (
        <div
          className="rc-annot-popover"
          role="dialog"
          aria-label={`Annotate ${sel}`}
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          <div className="rc-annot-popover__bar" aria-hidden="true" />
          <div className="mb-3 flex items-start justify-between gap-3 pt-2">
            <span className="rc-annot-popover__id">{sel}</span>
            <button
              type="button"
              onClick={() => setSel(null)}
              aria-label="Close annotation popover"
              className="rc-annot-icon-btn"
            >
              x
            </button>
          </div>
          <button
            type="button"
            aria-pressed={hiddenNow}
            onClick={onToggleHide}
            className={hiddenNow ? 'rc-annot-toggle rc-annot-toggle--on' : 'rc-annot-toggle'}
          >
            Hide from page
          </button>
          <label className="rc-annot-label" htmlFor="rc-annot-popover-note">
            Note
          </label>
          <textarea
            id="rc-annot-popover-note"
            value={noteValue}
            onChange={(e) => setNoteDraft({ target: sel, value: e.target.value })}
            placeholder="Why? Agents will read this."
            className="rc-annot-textarea"
            maxLength={2000}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="rc-annot-status" role="status">
              {statusText}
            </span>
            <button type="button" onClick={onSaveNote} className="rc-annot-save">
              Save note
            </button>
          </div>
        </div>
      )}
      {panelOpen && (
        <div className="rc-annot-drawer" role="dialog" aria-label="Annotations">
          <div className="rc-annot-drawer__head">
            <h3 className="rc-annot-drawer__title">Annotations</h3>
            <button
              type="button"
              onClick={() => setPanel(false)}
              aria-label="Close annotations drawer"
              className="rc-annot-icon-btn"
            >
              x
            </button>
          </div>
          <p className="rc-annot-status rc-annot-status--drawer" role="status">
            {statusText}
          </p>
          <div className="rc-annot-drawer__list">
            {rows.length === 0 && (
              <p className="rc-annot-empty">No targets found on this page.</p>
            )}
            {rows.map((row) => (
              <div key={row.id} className="rc-annot-drawer__row">
                <div className="rc-annot-drawer__row-head">
                  <button
                    type="button"
                    className="rc-annot-drawer__id"
                    onClick={() => {
                      openTarget(row.id, true);
                      setPanel(false);
                    }}
                  >
                    {row.id}
                  </button>
                  {row.hidden && <span className="rc-annot-badge">Hidden from public</span>}
                </div>
                <textarea
                  value={row.note}
                  onChange={(e) => onDrawerNoteChange(row.id, e.target.value)}
                  onBlur={() => onDrawerNoteBlur(row.id)}
                  placeholder="Why? Agents will read this."
                  className="rc-annot-textarea rc-annot-textarea--row"
                  maxLength={2000}
                />
                <div className="rc-annot-drawer__row-foot">
                  <button
                    type="button"
                    aria-pressed={row.hidden}
                    onClick={() => void saveAction(row.id, row.hidden ? 'show' : 'hide')}
                    className={row.hidden ? 'rc-annot-chip rc-annot-chip--on' : 'rc-annot-chip'}
                  >
                    {row.hidden ? 'Unhide' : 'Hide'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteNote(row.id)}
                    disabled={!row.hasNote}
                    className="rc-annot-chip"
                  >
                    Delete note
                  </button>
                  <span className="rc-annot-stamp">{formatStamp(row.latest)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {statusText !== '' && !panelOpen && sel === null && (
        <div className="rc-annot-toast" role="status">
          {statusText}
        </div>
      )}
      <button
        type="button"
        onClick={() => setPanel(!panelOpen)}
        aria-haspopup="dialog"
        aria-expanded={panelOpen}
        className="rc-annot-pill"
      >
        Annotations ({rows.length})
      </button>
    </>
  );
}

function AnnotationLayerRouted({
  endpoints,
}: {
  endpoints?: Partial<AnnotationEndpoints>;
}): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const onSearch = useCallback<AnnotationSearchWriter>(
    (next, options) => {
      setSearchParams(next, { replace: options?.replace ?? true });
    },
    [setSearchParams],
  );
  return (
    <AnnotationLayerCore
      searchParams={searchParams}
      onSearch={onSearch}
      endpoints={endpoints}
    />
  );
}

function AnnotationLayerDirect({
  endpoints,
  search,
  onSearch,
}: {
  endpoints?: Partial<AnnotationEndpoints>;
  search: URLSearchParams;
  onSearch: AnnotationSearchWriter;
}): JSX.Element {
  return (
    <AnnotationLayerCore searchParams={search} onSearch={onSearch} endpoints={endpoints} />
  );
}

function AnnotationLayer(props: AnnotationLayerProps): JSX.Element {
  if (props.search !== undefined && props.onSearch !== undefined) {
    return (
      <AnnotationLayerDirect
        endpoints={props.endpoints}
        search={props.search}
        onSearch={props.onSearch}
      />
    );
  }
  return <AnnotationLayerRouted endpoints={props.endpoints} />;
}

export default AnnotationLayer;
