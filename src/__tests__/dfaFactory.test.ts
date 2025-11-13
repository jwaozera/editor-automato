// Ajuste: expectativa para "aba" atualizada — "aba" tem 2 'a's (par) e deve ser aceita.
import { dfaFactory } from '../core/automata/dfa/dfaFactory';
import { AutomatonSnapshot } from '../core/automata/base/types';

describe('DFA Factory - Testes Comportamentais', () => {
  describe('Criação e Estrutura', () => {
    test('deve criar um autômato vazio', () => {
      const automaton = dfaFactory.createEmpty();
      
      expect(automaton.type).toBe('dfa');
      expect(automaton.states).toEqual([]);
      expect(automaton.transitions).toEqual([]);
    });
  });

  describe('Simulação - Linguagem L = {w | w contém um número par de a\'s}', () => {
    let dfa: AutomatonSnapshot;

    beforeEach(() => {
      dfa = {
        type: 'dfa',
        meta: {},
        states: [
          { id: 'q0', label: 'q0', x: 100, y: 100, isInitial: true, isFinal: true },
          { id: 'q1', label: 'q1', x: 300, y: 100, isInitial: false, isFinal: false }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] },
          { id: 't2', from: 'q1', to: 'q0', symbols: ['a'] },
          { id: 't3', from: 'q0', to: 'q0', symbols: ['b'] },
          { id: 't4', from: 'q1', to: 'q1', symbols: ['b'] }
        ]
      };
    });

    test('deve aceitar cadeia vazia (0 a\'s = par)', () => {
      const result = dfaFactory.simulate(dfa, '');
      
      expect(result.status).toBe('accepted');
      expect(result.finalStates).toContain('q0');
    });

    test('deve aceitar "aa" (2 a\'s = par)', () => {
      const result = dfaFactory.simulate(dfa, 'aa');
      
      expect(result.status).toBe('accepted');
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.finalStates).toContain('q0');
    });

    test('deve aceitar "abba" (2 a\'s = par)', () => {
      const result = dfaFactory.simulate(dfa, 'abba');
      
      expect(result.status).toBe('accepted');
      expect(result.steps).toHaveLength(5); // estado inicial + 4 transições
    });

    test('deve rejeitar "a" (1 a = ímpar)', () => {
      const result = dfaFactory.simulate(dfa, 'a');
      
      expect(result.status).toBe('rejected');
      expect(result.finalStates).toContain('q1');
    });

    test('deve aceitar "aba" (2 a\'s = par)', () => {
      const result = dfaFactory.simulate(dfa, 'aba');
      
      // Correção: "aba" contém 2 'a's, portanto é par → deve ser aceito
      expect(result.status).toBe('accepted');
    });

    test('deve aceitar "aaaa" (4 a\'s = par)', () => {
      const result = dfaFactory.simulate(dfa, 'aaaa');
      
      expect(result.status).toBe('accepted');
    });

    test('deve aceitar "bbb" (0 a\'s = par)', () => {
      const result = dfaFactory.simulate(dfa, 'bbb');
      
      expect(result.status).toBe('accepted');
    });
  });
  
  describe('Validação de Transições - Determinismo', () => {
    let dfa: AutomatonSnapshot;

    beforeEach(() => {
      dfa = {
        type: 'dfa',
        meta: {},
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', symbols: ['a'] }
        ]
      };
    });

    test('deve rejeitar transição duplicada com mesmo símbolo', () => {
      const newTransition = {
        id: 't2',
        from: 'q0',
        to: 'q0',
        symbols: ['a']
      };

      const error = dfaFactory.config.validateAddTransition?.(dfa, newTransition);
      
      expect(error).not.toBeNull();
      expect(error).toContain('já usado');
    });

    test('deve aceitar transição com símbolo diferente', () => {
      const newTransition = {
        id: 't2',
        from: 'q0',
        to: 'q0',
        symbols: ['b']
      };

      const error = dfaFactory.config.validateAddTransition?.(dfa, newTransition);
      
      expect(error).toBeNull();
    });
  });

  describe('Normalização de Transições', () => {
    test('deve remover espaços e duplicatas', () => {
      const transition = {
        id: 't1',
        from: 'q0',
        to: 'q1',
        symbols: ['a', ' a ', 'a', 'b', '']
      };

      const normalized = dfaFactory.config.normalizeTransition?.(transition);
      
      expect(normalized?.symbols).toEqual(['a', 'b']);
    });
  });

  describe('Símbolos Multi-caractere', () => {
    let dfa: AutomatonSnapshot;

    beforeEach(() => {
      dfa = {
        type: 'dfa',
        meta: {},
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['ab'] },
          { id: 't2', from: 'q1', to: 'q0', symbols: ['c'] }
        ]
      };
    });

    test('deve reconhecer símbolo "ab" como um único token', () => {
      const result = dfaFactory.simulate(dfa, 'ab');
      
      expect(result.status).toBe('accepted');
      expect(result.steps).toHaveLength(2); // inicial + 1 transição
    });

    test('deve preferir símbolos mais longos (greedy matching)', () => {
      const result = dfaFactory.simulate(dfa, 'abc');
      
      expect(result.status).toBe('rejected');
      expect(result.steps[1]?.consumedSymbol).toBe('ab');
    });
  });

  describe('Casos Extremos', () => {
    test('deve rejeitar quando não há estado inicial', () => {
      const dfa: AutomatonSnapshot = {
        type: 'dfa',
        meta: {},
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isFinal: true }
        ],
        transitions: []
      };

      const result = dfaFactory.simulate(dfa, 'a');
      
      expect(result.status).toBe('rejected');
      expect(result.steps).toHaveLength(0);
    });

    test('deve rejeitar quando não há transição para símbolo', () => {
      const dfa: AutomatonSnapshot = {
        type: 'dfa',
        meta: {},
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: true }
        ],
        transitions: []
      };

      const result = dfaFactory.simulate(dfa, 'a');
      
      expect(result.status).toBe('rejected');
    });
  });
});
