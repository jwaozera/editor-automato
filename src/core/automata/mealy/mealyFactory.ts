import {
  AutomatonFactory,
  AutomatonSnapshot,
  SimulationResult,
  SimulationStep
} from '../base/types';

export const mealyFactory: AutomatonFactory = {
  config: {
    type: 'mealy',
    displayName: 'Máquina de Mealy',
    capabilities: { supportsOutputPerTransition: true },
    normalizeTransition: (t) => {
      if (!t.pairs) t.pairs = [];
      const map = new Map<string, string>();
      for (const pair of t.pairs) {
        const inp = pair.in.trim();
        if (inp) map.set(inp, (pair.out ?? '').trim());
      }
      t.pairs = Array.from(map.entries()).map(([i, o]) => ({ in: i, out: o }));
      return t;
    },
    formatTransitionLabel: (t) =>
      (t.pairs || []).map(p => `${p.in}/${p.out}`).join(', '),
    createState: (index, x, y) => ({
      id: `q${index}`,
      label: `q${index}`,
      x, y,
      isInitial: index === 0,
      isFinal: false
    }),
    defaultMeta: {}
  },
  createEmpty: (): AutomatonSnapshot => ({
    type: 'mealy',
    meta: {},
    states: [],
    transitions: []
  }),
  simulate(snapshot, input): SimulationResult {
    const initial = snapshot.states.find(s => s.isInitial);
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
        t => t.from === current && t.pairs?.some(p => p.in === symbol)
      );
      if (!transition) {
        return { steps, status: 'rejected', finalStates: [current], outputTrace: output };
      }
      const pair = transition.pairs!.find(p => p.in === symbol)!;
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

    const accepted = snapshot.states.some(s => s.id === current && s.isFinal);
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
      meta: {},
      states: source.states.map(s => ({ ...s })),
      transitions: source.transitions
        .filter(t => t.symbols)
        .map(t => ({
          id: t.id,
          from: t.from,
          to: t.to,
          pairs: (t.symbols || []).map((sym: string) => ({ in: sym, out: '' }))
        }))
    };
    return {
      snapshot,
      warnings: ['Saídas iniciais definidas como vazias (edite depois).']
    };
  }
};
