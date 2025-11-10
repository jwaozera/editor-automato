import { AutomatonFactory } from './base/types';
import { dfaFactory } from './dfa/dfaFactory';

const factories: Record<string, AutomatonFactory> = {
  dfa: dfaFactory
  // futuros: mealy, moore, turing
};

export function getAutomatonFactory(type: string): AutomatonFactory {
  const f = factories[type];
  if (!f) throw new Error(`Automaton type not registered: ${type}`);
  return f;
}

export function listAutomatonTypes() {
  return Object.values(factories).map(f => ({ type: f.config.type, name: f.config.displayName }));
}
