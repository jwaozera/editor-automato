import { useCallback, useEffect, useRef, useState } from 'react';
import { AutomatonFactory, AutomatonSnapshot, SimulationResult } from '../core/automata/base/types';

export function useSimulation(factory: AutomatonFactory) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepsIndex, setStepsIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  const run = useCallback((snapshot: AutomatonSnapshot, input: string) => {
    const res = factory.simulate(snapshot, input);
    setResult(res);
    setStepsIndex(0);
    setIsSimulating(true);
    setIsPlaying(false); // start pausado
  }, [factory]);

  const reset = useCallback(() => {
    setResult(null);
    setStepsIndex(0);
    setIsSimulating(false);
    setIsPlaying(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stepForward = useCallback(() => {
    if (!result) return;
    setStepsIndex(prev => {
      if (prev < result.steps.length - 1) return prev + 1;
      return prev;
    });
  }, [result]);

  const stepBackward = useCallback(() => {
    setStepsIndex(prev => {
      if (prev > 0) return prev - 1;
      return prev;
    });
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isSimulating || !result || !isPlaying) return;

    if (stepsIndex >= result.steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      setStepsIndex(i => i + 1);
    }, 800);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isSimulating, isPlaying, stepsIndex, result]);

  const currentStateId = result?.steps[Math.min(stepsIndex, (result?.steps.length || 1) - 1)]?.currentState;

  return {
    result,
    isSimulating,
    isPlaying,
    stepsIndex,
    run,
    reset,
    stepForward,
    stepBackward,
    togglePlay,
    currentStateId
  };
}
