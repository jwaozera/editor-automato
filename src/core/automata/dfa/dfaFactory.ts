import { AutomatonFactory, AutomatonSnapshot, SimulationResult } from '../base/types';

export const dfaFactory: AutomatonFactory = {
  config: {
    type: 'dfa',
    displayName: 'DFA (Determinístico)',
    capabilities: {},
    normalizeTransition: (t) => {
      if (!t.symbols) t.symbols = [];
      t.symbols = Array.from(new Set(t.symbols.map(s => s.trim()).filter(Boolean)));
      return t;
    },
    validateAddTransition: (snapshot, newT) => {
      if (!newT.symbols) return null;
      for (const symbol of newT.symbols) {
        const conflict = snapshot.transitions.find(
          tr => tr.from === newT.from && tr.symbols?.includes(symbol) && tr.id !== newT.id
        );
        if (conflict) return `Símbolo '${symbol}' já usado a partir de ${newT.from}.`;
      }
      return null;
    },
    formatTransitionLabel: (t) => (t.symbols || []).join(', '),
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
    type: 'dfa',
    meta: {},
    states: [],
    transitions: []
  }),
  simulate(snapshot, input): SimulationResult {
    const initial = snapshot.states.find(s => s.isInitial);
    if (!initial) return { steps: [], status: 'rejected' };

    const steps = [];
    let current = initial.id;
    let position = 0;
    
    steps.push({ currentState: current, remainingInput: input });

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
        return { steps, status: 'rejected', finalStates: [current] };
      }
      
      position += matchedSymbol.length;
      current = matchedTransition.to;
      
      steps.push({ 
        currentState: current, 
        remainingInput: input.slice(position),
        consumedSymbol: matchedSymbol 
      });
    }

    const finalState = snapshot.states.find(s => s.id === current && s.isFinal);
    return {
      steps,
      status: finalState ? 'accepted' : 'rejected',
      finalStates: [current]
    };
  },
  convertFrom: (source) => {
    return {
      snapshot: {
        type: 'dfa',
        meta: {},
        states: source.states.map(s => ({
          id: s.id,
          label: s.label,
          x: s.x,
          y: s.y,
          isInitial: !!s.isInitial,
          isFinal: !!s.isFinal
        })),
        transitions: source.transitions
          .filter(t => t.symbols)
          .map(t => ({
            id: t.id,
            from: t.from,
            to: t.to,
            symbols: t.symbols?.slice() || []
          }))
      }
    };
  }
};
