// src/core/automata/__tests__/integration.test.ts
/**
 * Testes de Integração - Conversão entre tipos de autômatos
 */
import { getAutomatonFactory } from '../core/automata/registry';
import { AutomatonSnapshot } from '../core/automata/base/types';

describe('Integração - Conversão entre Autômatos', () => {
  describe('DFA para NFA', () => {
    test('deve converter DFA válido para NFA', () => {
      const dfa: AutomatonSnapshot = {
        type: 'dfa',
        meta: {},
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', symbols: ['a'] }
        ]
      };

      const nfaFactory = getAutomatonFactory('nfa');
      const converted = nfaFactory.convertFrom!(dfa);

      expect(converted.snapshot.type).toBe('nfa');
      expect(converted.snapshot.states).toHaveLength(1);
      expect(converted.snapshot.transitions).toHaveLength(1);
    });
  });

  describe('NFA para DFA', () => {
    test('deve converter NFA básico para DFA', () => {
      const nfa: AutomatonSnapshot = {
        type: 'nfa',
        meta: { epsilon: 'ε' },
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: true }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', symbols: ['a', 'b'] }
        ]
      };

      const dfaFactory = getAutomatonFactory('dfa');
      const converted = dfaFactory.convertFrom!(nfa);

      expect(converted.snapshot.type).toBe('dfa');
      expect(converted.snapshot.states).toHaveLength(1);
    });
  });

  describe('DFA para Mealy', () => {
    test('deve converter DFA para Mealy com saídas vazias', () => {
      const dfa: AutomatonSnapshot = {
        type: 'dfa',
        meta: {},
        states: [
          { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false }
        ],
        transitions: [
          { id: 't1', from: 'q0', to: 'q0', symbols: ['a', 'b'] }
        ]
      };

      const mealyFactory = getAutomatonFactory('mealy');
      const converted = mealyFactory.convertFrom!(dfa);

      expect(converted.snapshot.type).toBe('mealy');
      expect(converted.warnings).toBeDefined();
      expect(converted.warnings?.length).toBeGreaterThan(0);
    });
  });
});

describe('Integração - Registry', () => {
  test('deve listar todos os tipos de autômatos', () => {
    const { listAutomatonTypes } = require('../core/automata/registry');
    const types = listAutomatonTypes();

    expect(types).toHaveLength(6);
    expect(types.map((t: any) => t.type)).toContain('dfa');
    expect(types.map((t: any) => t.type)).toContain('nfa');
    expect(types.map((t: any) => t.type)).toContain('mealy');
    expect(types.map((t: any) => t.type)).toContain('moore');
    expect(types.map((t: any) => t.type)).toContain('pda');
    expect(types.map((t: any) => t.type)).toContain('turing');
  });

  test('deve lançar erro para tipo não registrado', () => {
    expect(() => getAutomatonFactory('invalid')).toThrow();
  });
});

describe('Testes de Propriedades - Invariantes', () => {
  describe('Todos os Autômatos', () => {
    const types = ['dfa', 'nfa', 'mealy', 'moore', 'pda', 'turing'];

    types.forEach(type => {
      describe(`${type.toUpperCase()}`, () => {
        test('deve criar autômato vazio válido', () => {
          const factory = getAutomatonFactory(type);
          const empty = factory.createEmpty();

          expect(empty.type).toBe(type);
          expect(empty.states).toBeDefined();
          expect(empty.transitions).toBeDefined();
          expect(Array.isArray(empty.states)).toBe(true);
          expect(Array.isArray(empty.transitions)).toBe(true);
        });

        test('deve ter configuração válida', () => {
          const factory = getAutomatonFactory(type);

          expect(factory.config).toBeDefined();
          expect(factory.config.type).toBe(type);
          expect(factory.config.displayName).toBeDefined();
          expect(factory.config.capabilities).toBeDefined();
        });

        test('deve ter função de simulação', () => {
          const factory = getAutomatonFactory(type);

          expect(factory.simulate).toBeDefined();
          expect(typeof factory.simulate).toBe('function');
        });
      });
    });
  });

  describe('Determinismo', () => {
    test('DFA deve ser determinístico', () => {
      const factory = getAutomatonFactory('dfa');
      expect(factory.config.capabilities.supportsNondeterminism).toBeUndefined();
    });

    test('NFA deve suportar não-determinismo', () => {
      const factory = getAutomatonFactory('nfa');
      expect(factory.config.capabilities.supportsNondeterminism).toBe(true);
    });

    test('PDA deve suportar não-determinismo', () => {
      const factory = getAutomatonFactory('pda');
      expect(factory.config.capabilities.supportsNondeterminism).toBe(true);
    });
  });

  describe('Saídas', () => {
    test('Mealy deve suportar saída por transição', () => {
      const factory = getAutomatonFactory('mealy');
      expect(factory.config.capabilities.supportsOutputPerTransition).toBe(true);
    });

    test('Moore deve suportar saída por estado', () => {
      const factory = getAutomatonFactory('moore');
      expect(factory.config.capabilities.supportsOutputPerState).toBe(true);
    });

    test('DFA não deve suportar saídas', () => {
      const factory = getAutomatonFactory('dfa');
      expect(factory.config.capabilities.supportsOutputPerTransition).toBeUndefined();
      expect(factory.config.capabilities.supportsOutputPerState).toBeUndefined();
    });
  });

  describe('Estruturas Auxiliares', () => {
    test('PDA deve suportar pilha', () => {
      const factory = getAutomatonFactory('pda');
      expect(factory.config.capabilities.supportsStack).toBe(true);
    });

    test('Turing deve suportar fita', () => {
      const factory = getAutomatonFactory('turing');
      expect(factory.config.capabilities.supportsTape).toBe(true);
    });

    test('DFA não deve suportar pilha ou fita', () => {
      const factory = getAutomatonFactory('dfa');
      expect(factory.config.capabilities.supportsStack).toBeUndefined();
      expect(factory.config.capabilities.supportsTape).toBeUndefined();
    });
  });
});

describe('Testes de Regressão - Bugs Conhecidos', () => {
  test('DFA deve lidar com símbolos multi-caractere corretamente', () => {
    const factory = getAutomatonFactory('dfa');
    const dfa: AutomatonSnapshot = {
      type: 'dfa',
      meta: {},
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true }
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q1', symbols: ['ab', 'a'] }
      ]
    };

    const result = factory.simulate(dfa, 'ab');
    expect(result.status).toBe('accepted');
    // Deve consumir 'ab' como um único símbolo, não 'a' seguido de 'b'
  });

  test('NFA deve evitar loops infinitos em epsilon-closure', () => {
    const factory = getAutomatonFactory('nfa');
    const nfa: AutomatonSnapshot = {
      type: 'nfa',
      meta: { epsilon: 'ε' },
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isInitial: false, isFinal: true }
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q1', symbols: ['ε'] },
        { id: 't2', from: 'q1', to: 'q0', symbols: ['ε'] }
      ]
    };

    const result = factory.simulate(nfa, '');
    expect(result.status).toBe('accepted');
    // Não deve travar em loop infinito
  });

  test('PDA deve respeitar maxDepth', () => {
    const factory = getAutomatonFactory('pda');
    const pda: AutomatonSnapshot = {
      type: 'pda',
      meta: {
        initialStackSymbol: '$',
        epsilon: 'ε',
        maxDepth: 5,
        acceptanceMode: 'final'
      },
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isInitial: true, isFinal: false }
      ],
      transitions: [
        { id: 't1', from: 'q0', to: 'q0', pda: { read: 'ε', pop: 'ε', push: 'A' } }
      ]
    };

    const result = factory.simulate(pda, '');
    expect(result.status).toBe('incomplete');
  });
});
