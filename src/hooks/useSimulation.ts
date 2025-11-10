import { useCallback, useEffect, useRef, useState } from 'react';
import { AutomatonFactory, AutomatonSnapshot, SimulationResult } from '../core/automata/base/types';

export function useSimulation(factory: AutomatonFactory) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [stepsIndex, setStepsIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  const run = useCallback((snapshot: AutomatonSnapshot, input: string) => {
    const res = factory.simulate(snapshot, input);
    setResult(res);
    setStepsIndex(0);
    setIsSimulating(true);
  }, [factory]);

  const reset = useCallback(() => {
    setResult(null);
    setStepsIndex(0);
    setIsSimulating(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // animação 800ms igual ao monolítico
  useEffect(() => {
    if (!isSimulating || !result) return;
    if (stepsIndex >= result.steps.length) {
      setIsSimulating(false);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      setStepsIndex(i => i + 1);
    }, 800);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isSimulating, stepsIndex, result]);

  const currentStateId = result?.steps[Math.min(stepsIndex, (result?.steps.length || 1) - 1)]?.currentState;

  return {
    result,
    isSimulating,
    stepsIndex,
    run,
    reset,
    currentStateId
  };
}
