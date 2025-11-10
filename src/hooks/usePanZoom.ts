import { useCallback, useRef, useState } from 'react';

export function usePanZoom(minScale = 0.3, maxScale = 3, factor = 1.15) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const beginPan = useCallback((clientX: number, clientY: number, px: number, py: number) => {
    panStartRef.current = { sx: clientX, sy: clientY, px, py };
    setIsPanning(true);
  }, []);

  const continuePan = useCallback((clientX: number, clientY: number) => {
    if (!isPanning || !panStartRef.current) return;
    const { sx, sy, px, py } = panStartRef.current;
    setPan({ x: px + (clientX - sx), y: py + (clientY - sy) });
  }, [isPanning]);

  const endPan = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const zoomIn = useCallback(() => setScale(prev => Math.min(maxScale, prev * factor)), [maxScale, factor]);
  const zoomOut = useCallback(() => setScale(prev => Math.max(minScale, prev / factor)), [minScale, factor]);
  const resetView = useCallback(() => { setScale(1); setPan({ x: 0, y: 0 }); }, []);

  return { scale, setScale, pan, setPan, isPanning, beginPan, continuePan, endPan, zoomIn, zoomOut, resetView };
}
