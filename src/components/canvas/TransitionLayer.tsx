import React, { useMemo } from 'react';
import { BaseState, BaseTransition } from '../../core/automata/base/types';

export const TransitionLayer: React.FC<{
  states: BaseState[];
  transitions: BaseTransition[];
  labelFormatter: (t: BaseTransition) => string;
  selectedTransition: string | null;
  onTransitionClick: (e: React.MouseEvent, id: string) => void;
  dragging: { id: string | null; x: number; y: number };
  dragTick: number;
}> = ({ states, transitions, labelFormatter, selectedTransition, onTransitionClick, dragging, dragTick }) => {
  // memo para lookup rápido
  const map = useMemo(() => Object.fromEntries(states.map(s => [s.id, s])), [states, dragTick]);

  // Agrupar transições por direção (from -> to)
  const transitionGroups = useMemo(() => {
    const groups: Record<string, BaseTransition[]> = {};
    transitions.forEach(t => {
      const key = `${t.from}->${t.to}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [transitions]);

  function eff(id: string): BaseState | undefined {
    if (dragging.id === id) {
      const base = map[id];
      if (!base) return undefined;
      return { ...base, x: dragging.x, y: dragging.y };
    }
    return map[id];
  }

  function getTransitionPath(from: BaseState, to: BaseState, isSelfLoop: boolean) {
    if (isSelfLoop) {
      const loopWidth = 30, loopHeight = 70;
      const endX = from.x - loopWidth, endY = from.y - loopWidth;
      return `M ${from.x + 20} ${from.y} C ${from.x + loopWidth} ${from.y - loopHeight - 50}, ${from.x - loopWidth} ${from.y - loopHeight - 50}, ${endX} ${endY}`;
    }
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const offsetX = (dx / dist) * 40, offsetY = (dy / dist) * 40;
    const hasReverse = transitions.some(t => t.from === to.id && t.to === from.id);
    if (hasReverse) {
      const midX = (from.x + to.x) / 2, midY = (from.y + to.y) / 2;
      const perpX = -(dy / dist) * 30, perpY = (dx / dist) * 30;
      return `M ${from.x + offsetX} ${from.y + offsetY} Q ${midX + perpX} ${midY + perpY} ${to.x - offsetX} ${to.y - offsetY}`;
    }
    return `M ${from.x + offsetX} ${from.y + offsetY} L ${to.x - offsetX} ${to.y - offsetY}`;
  }

  function getTransitionLabelPosition(from: BaseState, to: BaseState, isSelfLoop: boolean, offset = 0) {
    // Self-loop agora empilha para cima (y diminuindo)
    if (isSelfLoop) return { x: from.x - 5, y: from.y - 100 - offset * 20 };

    const hasReverse = transitions.some(t => t.from === to.id && t.to === from.id);
    const midX = (from.x + to.x) / 2, midY = (from.y + to.y) / 2;

    if (hasReverse) {
      // Base no lado do arco deste grupo
      const dx = to.x - from.x, dy = to.y - from.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const perpX = -(dy / dist) * 30, perpY = (dx / dist) * 30;
      const baseX = midX + perpX;
      const baseY = midY + perpY;

      // Abaixo empilha para baixo; acima empilha para cima
      const stackDir = baseY > midY ? 1 : -1;
      return { x: baseX, y: baseY + stackDir * offset * 20 };
    }

    // Sem reversa: empilhar sempre para cima
    return { x: midX, y: midY - offset * 20 };
  }

  return (
    <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#a78bfa">
          <polygon points="0 0, 10 3, 0 6" />
        </marker>
        <marker id="arrowhead-selected" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#fbbf24">
          <polygon points="0 0, 10 3, 0 6" />
        </marker>
      </defs>

      {Object.entries(transitionGroups).map(([key, group]) => {
        const firstTransition = group[0];
        const fromRaw = eff(firstTransition.from);
        const toRaw = eff(firstTransition.to);
        if (!fromRaw || !toRaw) return null;

        const isSelf = firstTransition.from === firstTransition.to;
        const path = getTransitionPath(fromRaw, toRaw, isSelf);

        return (
          <g key={key}>
            {/* Renderiza a seta apenas uma vez para o grupo */}
            <path
              d={path}
              stroke={group.some(t => selectedTransition === t.id) ? '#fbbf24' : '#a78bfa'}
              strokeWidth={group.some(t => selectedTransition === t.id) ? 3 : 2}
              fill="none"
              markerEnd={group.some(t => selectedTransition === t.id) ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
              className="transition-none pointer-events-none"
            />
            
            {/* Renderiza os labels com offset para evitar sobreposição */}
            {group.map((t, index) => {
              const labelPos = getTransitionLabelPosition(fromRaw, toRaw, isSelf, index);
              const isSel = selectedTransition === t.id;
              
              return (
                <text
                  key={t.id}
                  x={labelPos.x}
                  y={labelPos.y}
                  fill={isSel ? '#fbbf24' : '#e9d5ff'}
                  fontSize={14}
                  fontWeight="bold"
                  textAnchor="middle"
                  className="select-none cursor-pointer"
                  style={{ pointerEvents: 'all' }}
                  onClick={(e) => onTransitionClick(e as unknown as React.MouseEvent, t.id)}
                >
                  {labelFormatter(t)}
                </text>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};
