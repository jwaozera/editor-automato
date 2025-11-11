// Tipos base (atualizado com supportsRecognitionMode opcional)

export type StateId = string;
export type TransitionId = string;

export interface BaseState {
  id: StateId;
  label: string;
  x: number;
  y: number;
  isInitial?: boolean;
  isFinal?: boolean;
  output?: string; // Moore
  [key: string]: any;
}

export interface BaseTransition {
  id: TransitionId;
  from: StateId;
  to: StateId;
  symbols?: string[];                           // DFA/NFA/Moore
  pairs?: { in: string; out: string }[];        // Mealy
  pda?: { read: string; pop: string; push: string }; // PDA
  tm?: { read: string; write: string; move: 'L' | 'R' | 'S' }; // Turing
  [key: string]: any;
}

export interface AutomatonSnapshot<
  S extends BaseState = BaseState,
  T extends BaseTransition = BaseTransition,
  M = any
> {
  type: string;
  meta?: M;
  states: S[];
  transitions: T[];
}

export interface SimulationStep {
  currentState?: StateId;
  activeStates?: StateId[];
  remainingInput?: string;
  consumedSymbol?: string;
  producedOutput?: string;
  cumulativeOutput?: string;
  stack?: string[];
  tape?: string[];
  headPosition?: number;
}

export type SimulationStatus = 'accepted' | 'rejected' | 'running' | 'incomplete';

export interface SimulationResult {
  steps: SimulationStep[];
  status: SimulationStatus;
  finalStates?: StateId[];
  outputTrace?: string;
}

export interface AutomatonCapabilities {
  supportsOutputPerTransition?: boolean; // Mealy
  supportsOutputPerState?: boolean;      // Moore
  supportsEpsilon?: boolean;             // NFA/PDA
  supportsNondeterminism?: boolean;      // NFA/PDA
  supportsStack?: boolean;               // PDA
  supportsTape?: boolean;                // Turing
  supportsRecognitionMode?: boolean;     // Mealy/Moore (extensão híbrida)
}

export interface AutomatonComponents {
  StateEditor?: React.ComponentType<any>;
  TransitionEditor?: React.ComponentType<any>;
  MetaEditor?: React.ComponentType<any>;
  TransitionLabel?: React.ComponentType<{ transition: BaseTransition }>;
}

export interface AutomatonConfig<
  S extends BaseState = BaseState,
  T extends BaseTransition = BaseTransition,
  M = any
> {
  type: string;
  displayName: string;
  capabilities: AutomatonCapabilities;
  validateAddTransition?: (snapshot: AutomatonSnapshot<S, T, M>, newTransition: T) => string | null;
  normalizeTransition?: (t: T) => T;
  formatTransitionLabel?: (t: T) => string;
  createState?: (index: number, x: number, y: number) => S;
  defaultMeta?: M;
  components?: AutomatonComponents;
}

export interface AutomatonFactory<
  S extends BaseState = BaseState,
  T extends BaseTransition = BaseTransition,
  M = any
> {
  config: AutomatonConfig<S, T, M>;
  createEmpty: () => AutomatonSnapshot<S, T, M>;
  simulate: (snapshot: AutomatonSnapshot<S, T, M>, input: string) => SimulationResult;
  convertFrom?: (source: AutomatonSnapshot<any, any, any>) => {
    snapshot: AutomatonSnapshot<S, T, M>;
    warnings?: string[];
  };
}
