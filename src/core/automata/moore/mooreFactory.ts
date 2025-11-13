import {
  AutomatonFactory,
  SimulationResult,
  SimulationStep
} from '../base/types';

interface MooreMeta {
  recognitionMode: boolean;
}

export const mooreFactory: AutomatonFactory<any, any, MooreMeta> = {
  config: {
    type: 'moore',
    displayName: 'Máquina de Moore',
    capabilities: {
      supportsOutputPerState: true,
      supportsRecognitionMode: true
    },
    normalizeTransition: (t) => {
      if (!t.symbols) t.symbols = [];
      t.symbols = Array.from(new Set(
        t.symbols.map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      ));
      return t;
    },
    formatTransitionLabel: (t) => (t.symbols || []).join(', '),
    createState: (index, x, y) => ({
      id: `q${index}`,
      label: `q${index}`,
      x,
      y,
      isInitial: index === 0,
      isFinal: false,
      output: ''
    }),
    defaultMeta: { recognitionMode: false }
  },
  createEmpty: () => ({
    type: 'moore',
    meta: { recognitionMode: false },
    states: [],
    transitions: []
  }),
  simulate(snapshot, input): SimulationResult {
    const initial = snapshot.states.find((s) => s.isInitial);
    if (!initial) return { steps: [], status: 'rejected' };

    let current = initial.id;
    let position = 0;
    let outTrace = initial.output || '';

    const steps: SimulationStep[] = [];
    steps.push({
      currentState: current,
      remainingInput: input,
      cumulativeOutput: outTrace
    });

    while (position < input.length) {
      let matchedTransition = null;
      let matchedSymbol = '';
      
      // Busca a transição com o maior símbolo que casa
      for (const tr of snapshot.transitions) {
        if (tr.from !== current) continue;
        if (!tr.symbols) continue;
        
        for (const symbol of tr.symbols) {
          if (input.substring(position, position + symbol.length) === symbol) {
            if (symbol.length > matchedSymbol.length) {
              matchedTransition = tr;
              matchedSymbol = symbol;
            }
          }
        }
      }

      if (!matchedTransition) {
        if (!snapshot.meta?.recognitionMode) {
          return { steps, status: 'running', finalStates: [current], outputTrace: outTrace };
        }
        return { steps, status: 'rejected', finalStates: [current], outputTrace: outTrace };
      }

      current = matchedTransition.to;
      position += matchedSymbol.length;

      let stateObj: typeof snapshot.states[number] | undefined;
      for (const s of snapshot.states) {
        if (s.id === current) {
          stateObj = s;
          break;
        }
      }
      const produced = stateObj?.output || '';
      outTrace += produced;

      steps.push({
        currentState: current,
        remainingInput: input.slice(position),
        consumedSymbol: matchedSymbol,
        producedOutput: produced,
        cumulativeOutput: outTrace
      });
    }

    if (!snapshot.meta?.recognitionMode) {
      return { steps, status: 'running', finalStates: [current], outputTrace: outTrace };
    }

    const accepted = snapshot.states.some(
      (s) => s.id === current && s.isFinal
    );
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
        meta: { recognitionMode: false },
        states: source.states.map((s) => ({
          ...s,
          output: '',
          isFinal: false
        })),
        transitions: source.transitions
          .filter((t) => t.symbols)
          .map((t) => ({
            id: t.id,
            from: t.from,
            to: t.to,
            symbols: t.symbols?.slice() || []
          }))
      },
      warnings: ['Saídas vazias; modo reconhecimento desativado.']
    };
  }
};
