// src/core/automata/moore/__tests__/mooreFactory.test.ts
import { mooreFactory } from '../core/automata/moore/mooreFactory';
import { AutomatonSnapshot } from '../core/automata/base/types';

describe('Moore Factory - Testes Comportamentais', () => {
  describe('Saída por Estado', () => {
    let moore: AutomatonSnapshot;

    beforeEach(() => {
      // Moore que produz saída baseada no estado
      moore = {
        type: 'moore',
        meta: { recognitionMode: false },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false, output: 'A' },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: false, output: 'B' }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] },
          { id: 't2', from: 'q1', to: 'q0', symbols: ['b'] }
        ]
      };
    });

    test('deve produzir saída do estado inicial', () => {
      const result = mooreFactory.simulate(moore, '');
      
      expect(result.outputTrace).toBe('A');
    });

    test('deve produzir saída a cada transição', () => {
      const result = mooreFactory.simulate(moore, 'a');
      
      expect(result.outputTrace).toBe('AB');
    });

    test('deve acumular saídas corretamente', () => {
      const result = mooreFactory.simulate(moore, 'aba');
      
      expect(result.outputTrace).toBe('ABAB');
    });
  });

  describe('Modo de Reconhecimento', () => {
    let moore: AutomatonSnapshot;

    beforeEach(() => {
      moore = {
        type: 'moore',
        meta: { recognitionMode: 'final' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false, output: '0' },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true, output: '1' }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] }
        ]
      };
    });

    test('deve aceitar e produzir saída', () => {
      const result = mooreFactory.simulate(moore, 'a');
      
      expect(result.status).toBe('accepted');
      expect(result.outputTrace).toBe('01');
    });

    test('deve rejeitar mas ainda produzir saída', () => {
      const result = mooreFactory.simulate(moore, '');
      
      expect(result.status).toBe('rejected');
      expect(result.outputTrace).toBe('0');
    });
  });

  describe('Símbolos Multi-caractere', () => {
    let moore: AutomatonSnapshot;

    beforeEach(() => {
      moore = {
        type: 'moore',
        meta: { recognitionMode: false },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false, output: 'X' },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: false, output: 'Y' }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['ab', 'a'] }
        ]
      };
    });

    test('deve priorizar símbolo mais longo', () => {
      const result = mooreFactory.simulate(moore, 'ab');
      
      expect(result.outputTrace).toBe('XY');
      expect(result.steps).toHaveLength(2); // inicial + 1 transição
    });
  });

  describe('Casos Extremos', () => {
    test('deve produzir saída mesmo sem transições', () => {
      const moore: AutomatonSnapshot = {
        type: 'moore',
        meta: { recognitionMode: false },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: true, output: 'END' }
        ],
        transitions: []
      };

      const result = mooreFactory.simulate(moore, '');
      
      expect(result.status).toBe('transduced');
      expect(result.outputTrace).toBe('END');
    });

    test('deve rejeitar quando não há estado inicial', () => {
      const moore: AutomatonSnapshot = {
        type: 'moore',
        meta: { recognitionMode: false },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isFinal: true, output: 'X' }
        ],
        transitions: []
      };

      const result = mooreFactory.simulate(moore, 'a');
      
      expect(result.status).toBe('rejected');
    });

    test('deve lidar com saída vazia', () => {
      const moore: AutomatonSnapshot = {
        type: 'moore',
        meta: { recognitionMode: false },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false, output: '' },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: false, output: '' }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] }
        ]
      };

      const result = mooreFactory.simulate(moore, 'a');
      
      expect(result.outputTrace).toBe('');
    });
  });
});
