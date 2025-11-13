import {
  AutomatonFactory,
  AutomatonSnapshot,
  SimulationResult,
  SimulationStep
} from '../base/types';

interface MealyMeta {
  // pode ser:
  // false (transducer), true (equivalente a "final"), "final", ou "consumption"
  recognitionMode?: boolean | 'final' | 'consumption';
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
      t.pairs = Array.from(map.entries()).map(([i, o]) => ({ in: i, out: o }));
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
    let position = 0;
    let output = '';

    steps.push({
      currentState: current,
      remainingInput: input,
      cumulativeOutput: output
    });

    // interpretando modos possíveis
    const rm = snapshot.meta?.recognitionMode;
    // rm === false|undefined -> transducer mode
    // rm === 'consumption' -> aceitar se consumir tudo
    // rm === true or 'final' -> aceitar por estado final (padrão se true)

    while (position < input.length) {
      let matchedTransition = null;
      let matchedPair: MealyPair | null = null;
      
      // Busca a transição com o maior símbolo que casa
      for (const tr of snapshot.transitions) {
        if (tr.from !== current) continue;
        if (!tr.pairs) continue;
        
        for (const pair of tr.pairs as MealyPair[]) {
          if (input.substring(position, position + pair.in.length) === pair.in) {
            if (!matchedPair || pair.in.length > matchedPair.in.length) {
              matchedTransition = tr;
              matchedPair = pair;
            }
          }
        }
      }
      
      if (!matchedTransition || !matchedPair) {
        const finalStates = [current];
        // comportamento por modo:
        if (!rm) {
          // transducer: não é erro crítico, devolve saída parcial com status transduced
          return { steps, status: 'transduced', finalStates, outputTrace: output };
        }
        // modos de reconhecimento: consumo incompleto => rejeita
        return { steps, status: 'rejected', finalStates, outputTrace: output };
      }
      
      output += matchedPair.out;
      current = matchedTransition.to;
      position += matchedPair.in.length;
      
      steps.push({
        currentState: current,
        remainingInput: input.slice(position),
        consumedSymbol: matchedPair.in,
        producedOutput: matchedPair.out,
        cumulativeOutput: output
      });
    }

    // consumiu toda a entrada; decidir veredito conforme modo
    if (!rm) {
      return { steps, status: 'transduced', finalStates: [current], outputTrace: output };
    }
    if (rm === 'consumption') {
      // aceitou por consumo completo
      return { steps, status: 'accepted', finalStates: [current], outputTrace: output };
    }
    // rm === true (ou 'final') -> aceitar só se estado final
    const accepted = snapshot.states.some((s) => s.id === current && s.isFinal);
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
          pairs: (t.symbols || []).map((sym: string): MealyPair => ({ in: sym, out: '' }))
        }))
    };
    return {
      snapshot,
      warnings: ['Saídas vazias; modo reconhecimento desativado.']
    };
  }
};
