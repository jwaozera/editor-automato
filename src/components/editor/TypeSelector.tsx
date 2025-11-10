import React from 'react';
import { listAutomatonTypes } from '../../core/automata/registry';

interface Props {
  currentType: string;
  onChange: (newType: string) => void;
}

export const TypeSelector: React.FC<Props> = ({ currentType, onChange }) => {
  const types = listAutomatonTypes();
  return (
    <select
      value={currentType}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-slate-700 text-slate-200 rounded-lg"
      title="Tipo de Autômato"
    >
      {types.map(t => (
        <option key={t.type} value={t.type}>{t.name}</option>
      ))}
    </select>
  );
};
