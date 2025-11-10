import { useCallback, useState } from 'react';
import { AutomatonSnapshot } from '../core/automata/base/types';

export function useHistory(max = 50) {
  const [history, setHistory] = useState<AutomatonSnapshot[]>([]);
  const [index, setIndex] = useState(-1);

  const push = useCallback((snap: AutomatonSnapshot) => {
    setHistory(prev => {
      const next = prev.slice(0, index + 1);
      next.push(JSON.parse(JSON.stringify(snap)));
      if (next.length > max) next.splice(0, next.length - max);
      return next;
    });
    setIndex(i => Math.min(i + 1, max - 1));
  }, [index, max]);

  const undo = useCallback(() => {
    setIndex(i => Math.max(0, i - 1));
    return null;
  }, []);

  const redo = useCallback((len: number) => {
    setIndex(i => Math.min(len - 1, i + 1));
    return null;
  }, []);

  const canUndo = index > 0;
  const canRedo = index >= 0 && index < history.length - 1;

  const current = history[index] ? JSON.parse(JSON.stringify(history[index])) : null;

  return { history, index, length: history.length, push, undo, redo, canUndo, canRedo, current };
}
