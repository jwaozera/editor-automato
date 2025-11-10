import {
  AutomatonFactory,
  AutomatonSnapshot,
  SimulationResult,
  SimulationStep
} from '../base/types';

const EPS = 'ε';

interface PDAMeta {
  initialStackSymbol: string;
  epsilon: string;
  maxDepth: number;
}

export const pdaFactory: AutomatonFactory<any, any, PDAMeta> = {
  config: {
    type: 'pda',
    displayName: 'PDA (Autômato de Pilha)',
    capabilities: {
      supportsEpsilon: true,
      supportsNondeterminism: true,
      supportsStack: true
    },
    formatTransitionLabel: (t) =>
      t.pda ? `${t.pda.read}, ${t.pda.pop} → ${t.pda.push}` : '',
    createState: (index, x, y) => ({
      id: `q${index}`,
      label: `q${index}`,
      x, y,
      isInitial: index === 0,
      isFinal: false
    }),
    defaultMeta: {
      initialStackSymbol: '$',
      epsilon: EPS,
      maxDepth: 500
    }
  },
  createEmpty: () => ({
    type: 'pda',
    meta: {
      initialStackSymbol: '$',
      epsilon: EPS,
      maxDepth: 500
    },
    states: [],
    transitions: []
  }),
  simulate(snapshot, input): SimulationResult {
    const initial = snapshot.states.find(s => s.isInitial);
    if (!initial) return { steps: [], status: 'rejected' };

    const queue: Array<{
      state: string;
      index: number;
      stack: string[];
      path: SimulationStep[];
    }> = [{
      state: initial.id,
      index: 0,
      stack: [snapshot.meta?.initialStackSymbol || '$'],
      path: [{
        activeStates: [initial.id],
        remainingInput: input,
        stack: [snapshot.meta?.initialStackSymbol || '$']
      }]
    }];

    const visited = new Set<string>();
    const epsilon = snapshot.meta?.epsilon || EPS;
    const maxDepth = snapshot.meta?.maxDepth || 500;

    while (queue.length) {
      const current = queue.shift()!;
      if (current.path.length > maxDepth) {
        return { steps: current.path, status: 'incomplete' };
      }

      const finished = current.index === input.length &&
        snapshot.states.find(s => s.id === current.state && s.isFinal);
      if (finished) {
        return {
          steps: current.path,
          status: 'accepted',
          finalStates: [current.state],
          outputTrace: ''
        };
      }

      const key = `${current.state}|${current.index}|${current.stack.join(',')}`;
      if (visited.has(key)) continue;
      visited.add(key);

      for (const t of snapshot.transitions) {
        if (!t.pda) continue;
        if (t.from !== current.state) continue;

        const { read, pop, push } = t.pda;

        if (read !== epsilon) {
          if (current.index >= input.length) continue;
          if (input[current.index] !== read) continue;
        }

        const top = current.stack[current.stack.length - 1] ?? epsilon;
        if (pop !== epsilon && top !== pop) continue;

        const newStack = current.stack.slice();
        if (pop !== epsilon) newStack.pop();

        if (push !== epsilon) {
          for (let i = push.length - 1; i >= 0; i--) {
            newStack.push(push[i]);
          }
        }

        const newIndex = read === epsilon ? current.index : current.index + 1;
        const remainingInput = input.slice(newIndex);

        const step: SimulationStep = {
          activeStates: [t.to],
          remainingInput,
            consumedSymbol: read === epsilon ? undefined : read,
          stack: newStack.slice()
        };

        queue.push({
          state: t.to,
          index: newIndex,
          stack: newStack,
          path: [...current.path, step]
        });
      }
    }

    return { steps: [], status: 'rejected' };
  },
  convertFrom: (source) => {
    return {
      snapshot: {
        type: 'pda',
        meta: { initialStackSymbol: '$', epsilon: EPS, maxDepth: 500 },
        states: source.states.map(s => ({ ...s })),
        transitions: source.transitions
          .filter(t => t.symbols)
          .map(t => ({
            id: t.id,
            from: t.from,
            to: t.to,
            pda: { read: t.symbols![0], pop: EPS, push: EPS }
          }))
      },
      warnings: ['Transições convertidas com pop/push ε. Ajuste manualmente.']
    };
  }
};
