import { AutomatonFactory, AutomatonSnapshot, SimulationResult, Transition } from '../base/types';

export const dfaFactory: AutomatonFactory = {
  config: {
    type: 'dfa',
    displayName: 'Autômato Finito Determinístico',
    normalizeTransition: (t: Transition) => {
      const unique = Array.from(new Set(t.symbols.map(s => s.trim()).filter(Boolean)));
      return { ...t, symbols: unique };
    },
    formatTransitionLabel: (t: Transition) => t.symbols.join(', '),
    createState: (index, x, y) => ({
      id: `q${index}`,
      label: `q${index}`,
      x,
      y,
      isInitial: index === 0,
      isFinal: false
    })
  },
  createEmpty: (): AutomatonSnapshot => ({
    states: [],
    transitions: []
  }),
  simulate(snapshot, input): SimulationResult {
    const initial = snapshot.states.find(s => s.isInitial);
    if (!initial) {
      return { steps: [], status: 'rejected' };
    }

    const steps = [];
    let currentState = initial.id;
    let remaining = input;

    steps.push({ currentState, remainingInput: remaining, symbol: '' });

    for (let i = 0; i < input.length; i++) {
      const symbol = input[i];
      const transition = snapshot.transitions.find(
        t => t.from === currentState && t.symbols.includes(symbol)
      );
      if (!transition) {
        return { steps, status: 'rejected' };
      }
      currentState = transition.to;
      remaining = input.slice(i + 1);
      steps.push({ currentState, remainingInput: remaining, symbol });
    }

    const finalState = snapshot.states.find(s => s.id === currentState);
    const status: SimulationResult['status'] = finalState?.isFinal ? 'accepted' : 'rejected';
    return { steps, status };
  }
};
