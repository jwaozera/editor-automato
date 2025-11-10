export interface State {
  id: string;
  x: number;
  y: number;
  label: string;
  isInitial: boolean;
  isFinal: boolean;
  [key: string]: any;
}

export interface Transition {
  id: string;
  from: string;
  to: string;
  symbols: string[];
  [key: string]: any;
}

export interface AutomatonSnapshot {
  states: State[];
  transitions: Transition[];
}

export interface SimulationStep {
  currentState: string;
  remainingInput: string;
  symbol: string; // mantém o mesmo nome do monolítico
}

export type SimulationStatus = 'accepted' | 'rejected';

export interface SimulationResult {
  steps: SimulationStep[];
  status: SimulationStatus;
}

export interface AutomatonConfig {
  type: string; // 'dfa' | 'mealy' | 'moore' | 'turing'
  displayName: string;
  // Normalização de transição (ex.: remover duplicatas)
  normalizeTransition?: (t: Transition) => Transition;
  // Como exibir rótulo de transição
  formatTransitionLabel?: (t: Transition) => string;
  // Criação de estado default
  createState?: (index: number, x: number, y: number) => State;
}

export interface AutomatonFactory {
  config: AutomatonConfig;
  createEmpty: () => AutomatonSnapshot;
  simulate: (snapshot: AutomatonSnapshot, input: string) => SimulationResult;
}
