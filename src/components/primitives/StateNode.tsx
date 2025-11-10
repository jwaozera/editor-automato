import React, { forwardRef } from 'react';
import { BaseState } from '../../core/automata/base/types';

export const StateNode = forwardRef<HTMLDivElement, {
  state: BaseState;
  isActive: boolean;
  isSelected: boolean;
  onClick: (e: React.MouseEvent, id: string) => void;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
}>(({ state, isActive, isSelected, onClick, onMouseDown }, ref) => {
  return (
    <div
      ref={ref}
      className={`absolute w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all transform ${
        isActive
          ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 scale-110'
          : isSelected
          ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50'
          : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105'
      }`}
      style={{
        left: state.x - 40,
        top: state.y - 40,
        border: state.isFinal ? '4px solid #fbbf24' : 'none',
        willChange: 'transform'
      }}
      onClick={(e) => onClick(e, state.id)}
      onMouseDown={(e) => onMouseDown(e, state.id)}
      onDragStart={(e) => e.preventDefault()}
    >
      {state.isInitial && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2">
          <svg width="30" height="20" className="pointer-events-none">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#a78bfa">
                <polygon points="0 0, 10 3, 0 6" />
              </marker>
            </defs>
            <path d="M 0 10 L 20 10" stroke="#a78bfa" strokeWidth="2" markerEnd="url(#arrowhead)" />
          </svg>
        </div>
      )}
      <span className="text-white font-bold text-lg select-none">{state.label}</span>
    </div>
  );
});

StateNode.displayName = 'StateNode';
