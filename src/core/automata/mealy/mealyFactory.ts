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
      // NÃO tem supportsNondeterminism - Mealy é DETERMINÍSTICA
    },
    
    // VALIDAÇÃO: Impede não-determinismo
    validateAddTransition: (snapshot, newTransition) => {
      if (!newTransition.pairs) return null;
      
      const newInputSymbols = (newTransition.pairs as MealyPair[])
        .map(p => p.in.trim())
        .filter(s => s.length > 0);
      
      for (const existing of snapshot.transitions) {
        if (existing.from !== newTransition.from) continue;
        if (existing.id === newTransition.id) continue; // mesma transição
        if (!existing.pairs) continue;
        
        const existingInputSymbols = (existing.pairs as MealyPair[])
          .map(p => p.in.trim())
          .filter(s => s.length > 0);
        
        // Verifica conflito de símbolos de entrada
        for (const newSym of newInputSymbols) {
          for (const existingSym of existingInputSymbols) {
            // Conflito se: símbolos idênticos OU um é prefixo do outro
            if (newSym === existingSym) {
              return `Símbolo de entrada '${newSym}' já usado em transição do estado ${existing.from}`;
            }
            if (newSym.startsWith(existingSym) || existingSym.startsWith(newSym)) {
              return `Conflito de prefixo: '${newSym}' e '${existingSym}' são ambíguos no estado ${existing.from}`;
            }
          }
        }
      }
      
      return null; // válido
    },
    
    normalizeTransition: (t) => {
      if (!t.pairs) t.pairs = [];
      const map = new Map<string, string>();
      for (const pair of t.pairs as MealyPair[]) {
        const inp = pair.in.trim();
        if (inp) {
          // Se símbolo já existe, sobrescreve (última ocorrência prevalece)
          map.set(inp, (pair.out ?? '').trim());
        }
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

    const rm = snapshot.meta?.recognitionMode;

    while (position < input.length) {
      let matchedTransition = null;
      let matchedPair: MealyPair | null = null;
      let maxLength = 0;
      
      // Busca DETERMINISTICAMENTE a transição com o maior símbolo que casa
      // Greedy matching: prefere símbolos mais longos
      for (const tr of snapshot.transitions) {
        if (tr.from !== current) continue;
        if (!tr.pairs) continue;
        
        for (const pair of tr.pairs as MealyPair[]) {
          const symbolLength = pair.in.length;
          if (input.substring(position, position + symbolLength) === pair.in) {
            // Escolhe o símbolo mais longo (determinístico se validação passou)
            if (symbolLength > maxLength) {
              matchedTransition = tr;
              matchedPair = pair;
              maxLength = symbolLength;
            }
          }
        }
      }
      
      // Se não encontrou transição, falha
      if (!matchedTransition || !matchedPair) {
        const finalStates = [current];
        
        // Comportamento por modo:
        if (!rm) {
          // Transducer mode: retorna saída parcial
          return { 
            steps, 
            status: 'transduced', 
            finalStates, 
            outputTrace: output 
          };
        }
        
        // Modos de reconhecimento: consumo incompleto => rejeita
        return { 
          steps, 
          status: 'rejected', 
          finalStates, 
          outputTrace: output 
        };
      }
      
      // Executa transição DETERMINÍSTICA
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

    // Consumiu toda a entrada; decide veredito conforme modo
    const finalStates = [current];
    
    if (!rm) {
      // Transducer mode: sempre retorna 'transduced'
      return { 
        steps, 
        status: 'transduced', 
        finalStates, 
        outputTrace: output 
      };
    }
    
    if (rm === 'consumption') {
      // Aceitação por consumo completo
      return { 
        steps, 
        status: 'accepted', 
        finalStates, 
        outputTrace: output 
      };
    }
    
    // rm === true ou 'final': aceitar só se estado final
    const accepted = snapshot.states.some((s) => s.id === current && s.isFinal);
    return {
      steps,
      status: accepted ? 'accepted' : 'rejected',
      finalStates,
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
          pairs: (t.symbols || []).map((sym: string): MealyPair => ({ 
            in: sym, 
            out: '' 
          }))
        }))
    };
    return {
      snapshot,
      warnings: ['Saídas vazias; modo reconhecimento desativado.']
    };
  }
};
