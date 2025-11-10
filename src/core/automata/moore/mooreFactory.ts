import {
  AutomatonFactory,
  AutomatonSnapshot,
  SimulationResult,
  SimulationStep
} from '../base/types';

export const mooreFactory: AutomatonFactory = {
  config: {
    type: 'moore',
    displayName: 'Máquina de Moore',
    capabilities: { supportsOutputPerState: true },
    normalizeTransition: (t) => {
      if (!t.symbols) t.symbols = [];
      t.symbols = Array.from(new Set(t.symbols.map(s => s.trim()).filter(Boolean)));
      return t;
    },
    formatTransitionLabel: (t) => (t.symbols || []).join(', '),
    createState: (index, x, y) => ({
      id: `q${index}`,
      label: `q${index}`,
      x, y,
      isInitial: index === 0,
      isFinal: false,
      output: ''
    }),
    defaultMeta: {}
  },
  createEmpty: () => ({
    type: 'moore',
    meta: {},
    states: [],
    transitions: []
  }),
  simulate(snapshot, input): SimulationResult {
    const initial = snapshot.states.find(s => s.isInitial);
    if (!initial) return { steps: [], status: 'rejected' };

    let current = initial.id;
    let remaining = input;
    let outTrace = initial.output || '';

    const steps: SimulationStep[] = [];
    steps.push({
      currentState: current,
      remainingInput: remaining,
      cumulativeOutput: outTrace
    });

    for (let i = 0; i < input.length; i++) {
      const symbol = input[i];
      const tr = snapshot.transitions.find(
        t => t.from === current && t.symbols?.includes(symbol)
      );
      if (!tr) {
        return { steps, status: 'rejected', finalStates: [current], outputTrace: outTrace };
      }
      current = tr.to;
      remaining = input.slice(i + 1);
      const stateObj = snapshot.states.find(s => s.id === current);
      const produced = stateObj?.output || '';
      outTrace += produced;
      steps.push({
        currentState: current,
        remainingInput: remaining,
        consumedSymbol: symbol,
        producedOutput: produced,
        cumulativeOutput: outTrace
      });
    }

    const accepted = snapshot.states.some(s => s.id === current && s.isFinal);
    return {
      steps,
      status: accepted ? 'accepted' : 'rejected',
      finalStates: [current],
      outputTrace: outTrace
    };
  },
  convertFrom: (source) => {
    return {
      snapshot: {
        type: 'moore',
        meta: {},
        states: source.states.map(s => ({ ...s, output: '' })),
        transitions: source.transitions
          .filter(t => t.symbols)
          .map(t => ({ id: t.id, from: t.from, to: t.to, symbols: t.symbols?.slice() || [] }))
      },
      warnings: ['Saídas foram inicializadas como vazias.']
    };
  }
};
