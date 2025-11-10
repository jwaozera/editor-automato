import React, { useMemo } from 'react';
import { BaseState, BaseTransition } from '../../core/automata/base/types';

interface Props {
  states: BaseState[];
  transitions: BaseTransition[];
  labelFormatter: (t: BaseTransition) => string;
  selectedTransition: string | null;
  onTransitionClick: (e: React.MouseEvent, id: string) => void;
  dragging: { id: string | null; x: number; y: number };
  dragTick: number;
}

export const TransitionLayer: React.FC<Props> = ({
  states,
  transitions,
  labelFormatter,
  selectedTransition,
  onTransitionClick,
  dragging,
  dragTick
}) => {
  const map = useMemo(
    () => Object.fromEntries(states.map(s => [s.id, s])),
    [states, dragTick]
  );

  function effectiveState(id: string): BaseState | undefined {
    if (dragging.id === id) {
      const base = map[id];
      if (!base) return undefined;
      return { ...base, x: dragging.x, y: dragging.y };
    }
    return map[id];
  }

  function getTransitionPath(from: BaseState, to: BaseState, isSelf: boolean) {
    if (isSelf) {
      const loopWidth = 30, loopHeight = 70;
      const endX = from.x - loopWidth, endY = from.y - loopWidth;
      return `M ${from.x + 20} ${from.y} C ${from.x + loopWidth} ${from.y - loopHeight - 50}, ${from.x - loopWidth} ${from.y - loopHeight - 50}, ${endX} ${endY}`;
    }
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.max(1, Math.sqrt(dx*dx + dy*dy));
    const offsetX = (dx/dist)*40, offsetY = (dy/dist)*40;
    const hasReverse = transitions.some(t => t.from === to.id && t.to === from.id);
    if (hasReverse) {
      const midX = (from.x + to.x)/2, midY = (from.y + to.y)/2;
      const perpX = -(dy/dist)*30, perpY = (dx/dist)*30;
      return `M ${from.x + offsetX} ${from.y + offsetY} Q ${midX + perpX} ${midY + perpY} ${to.x - offsetX} ${to.y - offsetY}`;
    }
    return `M ${from.x + offsetX} ${from.y + offsetY} L ${to.x - offsetX} ${to.y - offsetY}`;
  }

  function getLabelPos(from: BaseState, to: BaseState, isSelf: boolean) {
    if (isSelf) return { x: from.x - 5, y: from.y - 100 };
    const hasReverse = transitions.some(t => t.from === to.id && t.to === from.id);
    if (hasReverse) {
      const midX = (from.x + to.x)/2, midY = (from.y + to.y)/2;
      const dx = to.x - from.x, dy = to.y - from.y;
      const dist = Math.max(1, Math.sqrt(dx*dx + dy*dy));
      const perpX = -(dy/dist)*30, perpY = (dx/dist)*30;
      return { x: midX + perpX, y: midY + perpY };
    }
    return { x: (from.x + to.x)/2, y: (from.y + to.y)/2 };
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
      {transitions.map(t => {
        const from = effectiveState(t.from);
        const to = effectiveState(t.to);
        if (!from || !to) return null;

        const isSelf = t.from === t.to;
        const path = getTransitionPath(from, to, isSelf);
        const labelPos = getLabelPos(from, to, isSelf);
        const isSel = selectedTransition === t.id;

        return (
          <g key={t.id} className="pointer-events-none">
            <path
              d={path}
              stroke={isSel ? '#fbbf24' : '#a78bfa'}
              strokeWidth={isSel ? 3 : 2}
              fill="none"
              markerEnd={isSel ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
              style={{ pointerEvents: 'stroke' }}
              onClick={(e) => onTransitionClick(e as unknown as React.MouseEvent, t.id)}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              fill={isSel ? '#fbbf24' : '#e9d5ff'}
              fontSize={14}
              fontWeight="bold"
              textAnchor="middle"
              className="select-none pointer-events-none"
            >
              {labelFormatter(t)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
