import {
  AutomatonFactory,
  AutomatonSnapshot,
  SimulationResult,
  SimulationStep
} from '../base/types';

const EPSILON = 'ε';

function epsilonClosure(snapshot: AutomatonSnapshot, stateIds: string[]): Set<string> {
  const closure = new Set(stateIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of snapshot.transitions) {
      if (t.symbols?.includes(EPSILON) && closure.has(t.from) && !closure.has(t.to)) {
        closure.add(t.to);
        changed = true;
      }
    }
  }
  return closure;
}

export const nfaFactory: AutomatonFactory = {
  config: {
    type: 'nfa',
    displayName: 'NFA (Não-Determinístico)',
    capabilities: {
      supportsEpsilon: true,
      supportsNondeterminism: true
    },
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
      isFinal: false
    }),
    defaultMeta: { epsilon: EPSILON }
  },
  createEmpty: () => ({
    type: 'nfa',
    meta: { epsilon: EPSILON },
    states: [],
    transitions: []
  }),
  simulate(snapshot, input): SimulationResult {
    const initial = snapshot.states.find(s => s.isInitial);
    if (!initial) return { steps: [], status: 'rejected' };

    let currentSet = epsilonClosure(snapshot, [initial.id]);
    const steps: SimulationStep[] = [{
      activeStates: Array.from(currentSet),
      remainingInput: input
    }];

    for (let i = 0; i < input.length; i++) {
      const symbol = input[i];
      const next = new Set<string>();
      for (const t of snapshot.transitions) {
        if (!t.symbols) continue;
        if (currentSet.has(t.from) && t.symbols.includes(symbol)) {
          next.add(t.to);
        }
      }
      const closed = epsilonClosure(snapshot, Array.from(next));
      currentSet = closed;
      steps.push({
        activeStates: Array.from(currentSet),
        remainingInput: input.slice(i + 1),
        consumedSymbol: symbol
      });
    }

    const accepted = Array.from(currentSet).some(id =>
      snapshot.states.find(s => s.id === id && s.isFinal)
    );

    return {
      steps,
      status: accepted ? 'accepted' : 'rejected',
      finalStates: Array.from(currentSet)
    };
  },
  convertFrom: (source) => {
    return {
      snapshot: {
        type: 'nfa',
        meta: { epsilon: EPSILON },
        states: source.states.map(s => ({ ...s })),
        transitions: source.transitions
          .filter(t => t.symbols)
          .map(t => ({ id: t.id, from: t.from, to: t.to, symbols: t.symbols?.slice() || [] }))
      }
    };
  }
};
