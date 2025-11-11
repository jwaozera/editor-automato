import {
  AutomatonFactory,
  AutomatonSnapshot,
  SimulationResult,
  SimulationStep
} from '../base/types';

interface MealyMeta {
  recognitionMode: boolean; // habilita estados finais para aceitação
}

interface MealyPair {
  in: string;
  out: string;
}

export const mealyFactory: AutomatonFactory<any, any, MealyMeta> = {
  config: {
    type: 'mealy',
    displayName: 'Máquina de Mealy',
    capabilities: {
      supportsOutputPerTransition: true,
      supportsRecognitionMode: true
    },
    normalizeTransition: (t) => {
      if (!t.pairs) t.pairs = [];
      const map = new Map<string, string>();
      for (const pair of t.pairs as MealyPair[]) {
        const inp = pair.in.trim();
        if (inp) map.set(inp, (pair.out ?? '').trim());
      }
      t.pairs = Array.from(map.entries()).map(
        ([i, o]: [string, string]) => ({ in: i, out: o })
      );
      return t;
    },
    formatTransitionLabel: (t) =>
      (t.pairs || []).map((p: MealyPair) => `${p.in}/${p.out}`).join(', '),
    createState: (index, x, y) => ({
      id: `q${index}`,
      label: `q${index}`,
      x,
      y,
      isInitial: index === 0,
      isFinal: false
    }),
    defaultMeta: { recognitionMode: false }
  },
  createEmpty: (): AutomatonSnapshot => ({
    type: 'mealy',
    meta: { recognitionMode: false },
    states: [],
    transitions: []
  }),
  simulate(snapshot, input): SimulationResult {
    const initial = snapshot.states.find((s) => s.isInitial);
    if (!initial) return { steps: [], status: 'rejected' };

    const steps: SimulationStep[] = [];
    let current = initial.id;
    let remaining = input;
    let output = '';

    steps.push({
      currentState: current,
      remainingInput: remaining,
      cumulativeOutput: output
    });

    for (let i = 0; i < input.length; i++) {
      const symbol: string = input[i];
      const transition = snapshot.transitions.find(
        (t) => t.from === current && t.pairs?.some((p: MealyPair) => p.in === symbol)
      );
      if (!transition) {
        const finalStates = [current];
        if (!snapshot.meta?.recognitionMode) {
          return { steps, status: 'running', finalStates, outputTrace: output };
        }
        return { steps, status: 'rejected', finalStates, outputTrace: output };
      }
      const pair = transition.pairs!.find((p: MealyPair) => p.in === symbol)!;
      output += pair.out;
      current = transition.to;
      remaining = input.slice(i + 1);
      steps.push({
        currentState: current,
        remainingInput: remaining,
        consumedSymbol: symbol,
        producedOutput: pair.out,
        cumulativeOutput: output
      });
    }

    if (!snapshot.meta?.recognitionMode) {
      return {
        steps,
        status: 'running',
        finalStates: [current],
        outputTrace: output
      };
    }

    const accepted = snapshot.states.some(
      (s) => s.id === current && s.isFinal
    );
    return {
      steps,
      status: accepted ? 'accepted' : 'rejected',
      finalStates: [current],
      outputTrace: output
    };
  },
  convertFrom: (source) => {
    const snapshot: AutomatonSnapshot = {
      type: 'mealy',
      meta: { recognitionMode: false },
      states: source.states.map((s) => ({ ...s, isFinal: false })),
      transitions: source.transitions
        .filter((t) => t.symbols)
        .map((t) => ({
          id: t.id,
          from: t.from,
          to: t.to,
          pairs: (t.symbols || []).map(
            (sym: string): MealyPair => ({ in: sym, out: '' })
          )
        }))
    };
    return {
      snapshot,
      warnings: ['Saídas vazias; modo reconhecimento desativado.']
    };
  }
};
