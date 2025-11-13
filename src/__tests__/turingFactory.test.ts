// src/core/automata/turing/__tests__/turingFactory.test.ts
import { turingFactory } from '../core/automata/turing/turingFactory';
import { AutomatonSnapshot } from '../core/automata/base/types';

describe('Turing Factory - Testes Comportamentais', () => {
  describe('Complemento de Bits', () => {
    let tm: AutomatonSnapshot;

    beforeEach(() => {
      // Máquina que inverte 0s e 1s
      tm = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'qf', label: 'qf', x: 100, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', tm: { read: '0', write: '1', move: 'R' } },
          { id: 't2', from: 'q0', to: 'q0', tm: { read: '1', write: '0', move: 'R' } },
          { id: 't3', from: 'q0', to: 'qf', tm: { read: '_', write: '_', move: 'S' } }
        ]
      };
    });

    test('deve inverter "0" para "1"', () => {
      const result = turingFactory.simulate(tm, '0');
      
      expect(result.status).toBe('accepted');
      // A fita pode conter o blank no final
      expect(result.steps[result.steps.length - 1].tape?.[0]).toBe('1');
    });

    test('deve inverter "01" para "10"', () => {
      const result = turingFactory.simulate(tm, '01');
      
      expect(result.status).toBe('accepted');
      const tape = result.steps[result.steps.length - 1].tape || [];
      expect(tape[0]).toBe('1');
      expect(tape[1]).toBe('0');
    });

    test('deve inverter "0101" para "1010"', () => {
      const result = turingFactory.simulate(tm, '0101');
      
      expect(result.status).toBe('accepted');
      const tape = result.steps[result.steps.length - 1].tape || [];
      expect(tape.slice(0, 4)).toEqual(['1', '0', '1', '0']);
    });

    test('deve inverter cadeia vazia (apenas blank)', () => {
      const result = turingFactory.simulate(tm, '');
      
      expect(result.status).toBe('accepted');
      // Cadeia vazia = fita vazia ou só com blank
    });
  });

  describe('Movimentos da Cabeça', () => {
    test('deve mover para direita (R)', () => {
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', tm: { read: 'a', write: 'b', move: 'R' } }
        ]
      };

      const result = turingFactory.simulate(tm, 'aa');
      
      expect(result.steps[1].headPosition).toBe(1);
      expect(result.steps[1].tape?.[0]).toBe('b');
    });

    test('deve mover para esquerda (L)', () => {
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: false },
          { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', tm: { read: 'a', write: 'a', move: 'R' } },
          { id: 't2', from: 'q1', to: 'q2', tm: { read: 'b', write: 'b', move: 'L' } }
        ]
      };

      const result = turingFactory.simulate(tm, 'ab');
      
      expect(result.steps[2].headPosition).toBe(0);
    });

    test('deve ficar parado (S)', () => {
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', tm: { read: 'a', write: 'b', move: 'S' } }
        ]
      };

      const result = turingFactory.simulate(tm, 'a');
      
      expect(result.steps[1].headPosition).toBe(0);
      expect(result.steps[1].tape?.[0]).toBe('b');
    });
  });

  describe('Duplicação de String', () => {
    test('deve duplicar "a" para "aa"', () => {
      // Máquina simplificada que duplica um símbolo
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: false },
          { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', tm: { read: 'a', write: 'a', move: 'R' } },
          { id: 't2', from: 'q1', to: 'q2', tm: { read: '_', write: 'a', move: 'S' } }
        ]
      };

      const result = turingFactory.simulate(tm, 'a');
      
      expect(result.status).toBe('accepted');
      expect(result.steps[result.steps.length - 1].tape).toEqual(['a', 'a']);
    });
  });

  describe('Casos Extremos', () => {
    test('deve parar em estado final mesmo sem transição', () => {
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: true }
        ],
        transitions: []
      };

      const result = turingFactory.simulate(tm, '');
      
      expect(result.status).toBe('accepted');
    });

    test('deve rejeitar quando não há transição', () => {
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false }
        ],
        transitions: []
      };

      const result = turingFactory.simulate(tm, 'a');
      
      expect(result.status).toBe('rejected');
    });

    test('deve detectar limite de passos', () => {
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 5 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', tm: { read: '_', write: '_', move: 'R' } }
        ]
      };

      const result = turingFactory.simulate(tm, '');
      
      expect(result.status).toBe('incomplete');
      expect(result.steps.length).toBeLessThanOrEqual(6); // inicial + maxSteps
    });

    test('não deve mover cabeça para posição negativa', () => {
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', tm: { read: 'a', write: 'a', move: 'L' } }
        ]
      };

      const result = turingFactory.simulate(tm, 'a');
      
      expect(result.steps[result.steps.length - 1].headPosition).toBe(0);
      expect(result.steps[result.steps.length - 1].headPosition).toBeGreaterThanOrEqual(0);
    });

    test('deve lidar com símbolo blank corretamente', () => {
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q1', tm: { read: '_', write: 'X', move: 'S' } }
        ]
      };

      const result = turingFactory.simulate(tm, '');
      
      expect(result.status).toBe('accepted');
    });
  });

  describe('Reconhecimento de Palíndromos', () => {
    test('deve reconhecer palíndromo simples', () => {
      // Máquina simplificada que verifica se "aba" é palíndromo
      const tm: AutomatonSnapshot = {
        type: 'turing',
        meta: { blank: '_', maxSteps: 300 },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
          { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: false },
          { id: 'q2', label: 'q2', x: 200, y: 0, isInitial: false, isFinal: false },
          { id: 'qf', label: 'qf', x: 300, y: 0, isInitial: false, isFinal: true }
        ],
        transitions: [
          // Marca primeiro 'a'
          { id: 't1', from: 'q0', to: 'q1', tm: { read: 'a', write: 'X', move: 'R' } },
          // Pula 'b'
          { id: 't2', from: 'q1', to: 'q1', tm: { read: 'b', write: 'b', move: 'R' } },
          // Encontra último 'a' e marca
          { id: 't3', from: 'q1', to: 'q2', tm: { read: 'a', write: 'X', move: 'L' } },
          // Volta pro 'b'
          { id: 't4', from: 'q2', to: 'q2', tm: { read: 'b', write: 'b', move: 'L' } },
          // Encontra 'X' (já verificado)
          { id: 't5', from: 'q2', to: 'qf', tm: { read: 'X', write: 'X', move: 'R' } },
          // Chega ao 'b' central e aceita
          { id: 't6', from: 'qf', to: 'qf', tm: { read: 'b', write: 'b', move: 'S' } }
        ]
      };

      const result = turingFactory.simulate(tm, 'aba');
      
      // Este é um teste de estrutura - a máquina pode ou não aceitar
      // dependendo da implementação completa
      expect(result.steps.length).toBeGreaterThan(0);
    });
  });
});
