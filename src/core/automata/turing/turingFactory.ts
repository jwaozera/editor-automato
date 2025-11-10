import {
  AutomatonFactory,
  AutomatonSnapshot,
  SimulationResult,
  SimulationStep
} from '../base/types';

interface TMMeta {
  blank: string;
  maxSteps: number;
}

export const turingFactory: AutomatonFactory<any, any, TMMeta> = {
  config: {
    type: 'turing',
    displayName: 'Máquina de Turing',
    capabilities: { supportsTape: true },
    formatTransitionLabel: (t) => t.tm ? `${t.tm.read}/${t.tm.write},${t.tm.move}` : '',
    createState: (index, x, y) => ({
      id: `q${index}`,
      label: `q${index}`,
      x, y,
      isInitial: index === 0,
      isFinal: false
    }),
    defaultMeta: { blank: '_', maxSteps: 300 }
  },
  createEmpty: () => ({
    type: 'turing',
    meta: { blank: '_', maxSteps: 300 },
    states: [],
    transitions: []
  }),
  simulate(snapshot, input): SimulationResult {
    const initial = snapshot.states.find(s => s.isInitial);
    if (!initial) return { steps: [], status: 'rejected' };

    const blank = snapshot.meta?.blank || '_';
    const maxSteps = snapshot.meta?.maxSteps || 300;
    const tape: string[] = input.split('');
    let head = 0;
    let state = initial.id;

    const steps: SimulationStep[] = [{
      currentState: state,
      tape: tape.slice(),
      headPosition: head
    }];

    for (let stepCount = 0; stepCount < maxSteps; stepCount++) {
      const currentSymbol = tape[head] ?? blank;
      const tr = snapshot.transitions.find(
        t => t.from === state && t.tm?.read === currentSymbol
      );
      if (!tr) {
        const finalOk = snapshot.states.find(s => s.id === state && s.isFinal);
        return {
          steps,
          status: finalOk ? 'accepted' : 'rejected',
          finalStates: [state]
        };
      }

      tape[head] = tr.tm!.write;
      if (tr.tm!.move === 'R') head += 1;
      else if (tr.tm!.move === 'L') head = Math.max(0, head - 1);

      state = tr.to;
      steps.push({
        currentState: state,
        tape: tape.slice(),
        headPosition: head,
        consumedSymbol: currentSymbol
      });

      const finalState = snapshot.states.find(s => s.id === state && s.isFinal);
      if (finalState) {
        return {
          steps,
          status: 'accepted',
          finalStates: [state]
        };
      }
    }

    return {
      steps,
      status: 'incomplete'
    };
  },
  convertFrom: (source) => {
    return {
      snapshot: {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: source.states.map(s => ({ ...s })),
        transitions: source.transitions
          .filter(t => t.symbols?.length)
          .map(t => ({
            id: t.id,
            from: t.from,
            to: t.to,
            tm: { read: t.symbols![0], write: t.symbols![0], move: 'S' }
          }))
      },
      warnings: ['Movimentos convertidos como Stay e write=read. Ajuste.']
    };
  }
};
