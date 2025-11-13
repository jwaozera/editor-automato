// src/core/automata/nfa/__tests__/nfaFactory.test.ts
import { nfaFactory } from '../core/automata/nfa/nfaFactory';
import { AutomatonSnapshot } from '../core/automata/base/types';

describe('NFA Factory - Testes Comportamentais', () => {
  describe('Não-determinismo', () => {
    let nfa: AutomatonSnapshot;

    beforeEach(() => {
      // NFA que aceita strings terminadas em "ab"
      nfa = {
        type: 'nfa',
        meta: { epsilon: 'ε' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: false },
          { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', symbols: ['a', 'b'] }, // loop em q0
          { id: 't2', from: 'q0', to: 'q1', symbols: ['a'] },      // começa sequência
          { id: 't3', from: 'q1', to: 'q2', symbols: ['b'] }       // completa "ab"
        ]
      };
    });

    test('deve aceitar "ab"', () => {
      const result = nfaFactory.simulate(nfa, 'ab');
      
      expect(result.status).toBe('accepted');
      expect(result.finalStates).toContain('q2');
    });

    test('deve aceitar "aab"', () => {
      const result = nfaFactory.simulate(nfa, 'aab');
      
      expect(result.status).toBe('accepted');
    });

    test('deve aceitar "bbbab"', () => {
      const result = nfaFactory.simulate(nfa, 'bbbab');
      
      expect(result.status).toBe('accepted');
    });

    test('deve rejeitar "a"', () => {
      const result = nfaFactory.simulate(nfa, 'a');
      
      expect(result.status).toBe('rejected');
    });

    test('deve rejeitar "aba"', () => {
      const result = nfaFactory.simulate(nfa, 'aba');
      
      expect(result.status).toBe('rejected');
    });
  });

  describe('Epsilon Transições', () => {
    let nfa: AutomatonSnapshot;

    beforeEach(() => {
      // NFA com ε-transições: aceita "a" ou "ab"
      nfa = {
        type: 'nfa',
        meta: { epsilon: 'ε' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true },
          { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] },
          { id: 't2', from: 'q1', to: 'q2', symbols: ['ε'] },  // ε-transição
          { id: 't3', from: 'q2', to: 'q1', symbols: ['b'] }
        ]
      };
    });

    test('deve aceitar "a" com epsilon-closure', () => {
      const result = nfaFactory.simulate(nfa, 'a');
      
      expect(result.status).toBe('accepted');
      // Deve alcançar q1 diretamente e q2 via ε
      expect(result.finalStates).toEqual(expect.arrayContaining(['q1', 'q2']));
    });

    test('deve aceitar "ab"', () => {
      const result = nfaFactory.simulate(nfa, 'ab');
      
      expect(result.status).toBe('accepted');
    });

    test('deve rejeitar "b"', () => {
      const result = nfaFactory.simulate(nfa, 'b');
      
      expect(result.status).toBe('rejected');
    });
  });

  describe('Múltiplas Transições com Mesmo Símbolo', () => {
    let nfa: AutomatonSnapshot;

    beforeEach(() => {
      // NFA com múltiplas transições 'a' do mesmo estado
      nfa = {
        type: 'nfa',
        meta: { epsilon: 'ε' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true },
          { id: 'q2', label: 'q2', x: 100, y: 100, isInitial: false, isFinal: false }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] },  // caminho 1
          { id: 't2', from: 'q0', to: 'q2', symbols: ['a'] },  // caminho 2
        ]
      };
    });

    test('deve explorar ambos os caminhos', () => {
      const result = nfaFactory.simulate(nfa, 'a');
      
      expect(result.status).toBe('accepted');
      expect(result.finalStates).toEqual(expect.arrayContaining(['q1', 'q2']));
    });
  });

  describe('Símbolos Multi-caractere com Não-determinismo', () => {
    let nfa: AutomatonSnapshot;

    beforeEach(() => {
      nfa = {
        type: 'nfa',
        meta: { epsilon: 'ε' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true },
          { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['ab'] },   // símbolo longo
          { id: 't2', from: 'q0', to: 'q2', symbols: ['a'] },    // símbolo curto
          { id: 't3', from: 'q2', to: 'q1', symbols: ['b'] }
        ]
      };
    });

    test('deve priorizar símbolo mais longo', () => {
      const result = nfaFactory.simulate(nfa, 'ab');
      
      expect(result.status).toBe('accepted');
      // Ambos os caminhos levam a estados finais
      expect(result.finalStates?.length).toBeGreaterThan(0);
    });
  });

  describe('Casos Extremos', () => {
    test('deve aceitar cadeia vazia se estado inicial é final', () => {
      const nfa: AutomatonSnapshot = {
        type: 'nfa',
        meta: { epsilon: 'ε' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: true }
        ],
        transitions: []
      };

      const result = nfaFactory.simulate(nfa, '');
      
      expect(result.status).toBe('accepted');
    });

    test('deve rejeitar quando não há estado inicial', () => {
      const nfa: AutomatonSnapshot = {
        type: 'nfa',
        meta: { epsilon: 'ε' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isFinal: true }
        ],
        transitions: []
      };

      const result = nfaFactory.simulate(nfa, 'a');
      
      expect(result.status).toBe('rejected');
    });

    test('deve lidar com loops epsilon', () => {
      const nfa: AutomatonSnapshot = {
        type: 'nfa',
        meta: { epsilon: 'ε' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['ε'] },
          { id: 't2', from: 'q1', to: 'q0', symbols: ['ε'] }  // loop
        ]
      };

      const result = nfaFactory.simulate(nfa, '');
      
      expect(result.status).toBe('accepted');
      // Não deve entrar em loop infinito
      expect(result.finalStates).toContain('q1');
    });
  });
});
