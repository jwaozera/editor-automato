import { AutomatonFactory } from './base/types';
import { dfaFactory } from './dfa/dfaFactory';
import { nfaFactory } from './nfa/nfaFactory';
import { mealyFactory } from './mealy/mealyFactory';
import { mooreFactory } from './moore/mooreFactory';
import { pdaFactory } from './pda/pdaFactory';
import { turingFactory } from './turing/turingFactory';

const factories: Record<string, AutomatonFactory<any, any, any>> = {
  dfa: dfaFactory,
  nfa: nfaFactory,
  mealy: mealyFactory,
  moore: mooreFactory,
  pda: pdaFactory,
  turing: turingFactory
};

export function getAutomatonFactory(type: string): AutomatonFactory {
  const f = factories[type];
  if (!f) throw new Error(`Tipo não registrado: ${type}`);
  return f;
}

export function listAutomatonTypes() {
  return Object.values(factories).map(f => ({
    type: f.config.type,
    name: f.config.displayName,
    capabilities: f.config.capabilities
  }));
}
