import { useEffect } from 'react';

export function useEditorShortcuts(opts: {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  setSpaceDown: (v: boolean) => void;
}) {
  const { onUndo, onRedo, onSave, onZoomIn, onZoomOut, onResetView, onDelete, onEscape, setSpaceDown } = opts;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceDown(true);

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); onUndo(); }
        else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); onRedo(); }
        else if (e.key === 's') { e.preventDefault(); onSave(); }
        else if (e.key === '=' || e.key === '+') { e.preventDefault(); onZoomIn(); }
        else if (e.key === '-') { e.preventDefault(); onZoomOut(); }
        else if (e.key === '0') { e.preventDefault(); onResetView(); }
      }

      if (e.key === 'Delete' && onDelete) {
        e.preventDefault();
        onDelete();
      }

      if (e.key === 'Escape' && onEscape) {
        onEscape();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceDown(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onUndo, onRedo, onSave, onZoomIn, onZoomOut, onResetView, onDelete, onEscape, setSpaceDown]);
}
