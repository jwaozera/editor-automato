// src/core/automata/mealy/__tests__/mealyFactory.test.ts
import { mealyFactory } from '../core/automata/mealy/mealyFactory';
import { AutomatonSnapshot } from '../core/automata/base/types';

describe('Mealy Factory - Testes Comportamentais', () => {
  describe('Transdução Simples', () => {
    let mealy: AutomatonSnapshot;

    beforeEach(() => {
      // Transdutor que converte 'a' -> 'x' e 'b' -> 'y'
      mealy = {
        type: 'mealy',
        meta: { recognitionMode: false },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', pairs: [{ in: 'a', out: 'x' }] },
          { id: 't2', from: 'q0', to: 'q0', pairs: [{ in: 'b', out: 'y' }] }
        ]
      };
    });

    test('deve produzir saída correta para "ab"', () => {
      const result = mealyFactory.simulate(mealy, 'ab');
      
      expect(result.status).toBe('transduced');
      expect(result.outputTrace).toBe('xy');
    });

    test('deve produzir saída correta para "aabb"', () => {
      const result = mealyFactory.simulate(mealy, 'aabb');
      
      expect(result.outputTrace).toBe('xxyy');
    });

    test('deve produzir saída vazia para cadeia vazia', () => {
      const result = mealyFactory.simulate(mealy, '');
      
      expect(result.outputTrace).toBe('');
    });
  });

  describe('Modo de Reconhecimento - Consumo', () => {
    let mealy: AutomatonSnapshot;

    beforeEach(() => {
      mealy = {
        type: 'mealy',
        meta: { recognitionMode: 'consumption' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', pairs: [{ in: 'a', out: '1' }] }
        ]
      };
    });

    test('deve aceitar quando consome toda a entrada', () => {
      const result = mealyFactory.simulate(mealy, 'aaa');
      
      expect(result.status).toBe('accepted');
      expect(result.outputTrace).toBe('111');
    });

    test('deve rejeitar quando não consome toda a entrada', () => {
      const result = mealyFactory.simulate(mealy, 'aab');
      
      expect(result.status).toBe('rejected');
    });
  });

  describe('Modo de Reconhecimento - Estado Final', () => {
    let mealy: AutomatonSnapshot;

    beforeEach(() => {
      mealy = {
        type: 'mealy',
        meta: { recognitionMode: 'final' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', pairs: [{ in: 'a', out: 'x' }] },
          { id: 't2', from: 'q1', to: 'q0', pairs: [{ in: 'b', out: 'y' }] }
        ]
      };
    });

    test('deve aceitar quando termina em estado final', () => {
      const result = mealyFactory.simulate(mealy, 'a');
      
      expect(result.status).toBe('accepted');
      expect(result.outputTrace).toBe('x');
    });

    test('deve rejeitar quando não termina em estado final', () => {
      const result = mealyFactory.simulate(mealy, 'ab');
      
      expect(result.status).toBe('rejected');
      expect(result.outputTrace).toBe('xy');
    });
  });

  describe('Símbolos Multi-caractere', () => {
    let mealy: AutomatonSnapshot;

    beforeEach(() => {
      mealy = {
        type: 'mealy',
        meta: { recognitionMode: false },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', pairs: [
            { in: 'ab', out: 'XY' },
            { in: 'a', out: 'Z' }
          ]}
        ]
      };
    });

    test('deve priorizar símbolo mais longo', () => {
      const result = mealyFactory.simulate(mealy, 'ab');
      
      expect(result.outputTrace).toBe('XY');
    });
  });
});

// src/core/automata/moore/__tests__/mooreFactory.test.ts
/*import { mooreFactory } from '../src/core/automata/moore/mooreFactory';

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
});*/
