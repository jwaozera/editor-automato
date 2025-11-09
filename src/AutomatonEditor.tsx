import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef
} from 'react';
import {
  Play,
  Plus,
  Trash2,
  Save,
  Upload,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Undo,
  Redo
} from 'lucide-react';

interface State {
  id: string;
  x: number;
  y: number;
  label: string;
  isInitial: boolean;
  isFinal: boolean;
}

interface Transition {
  id: string;
  from: string;
  to: string;
  symbols: string[];
}

interface SimulationStep {
  currentState: string;
  remainingInput: string;
  symbol: string;
}

interface HistoryState {
  states: State[];
  transitions: Transition[];
}

// OTIMIZAÇÃO StateNode super leve - só re-renderiza quando necessário
const StateNode = forwardRef<HTMLDivElement, {
  state: State;
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
            <path d="M 0 10 L 20 10" stroke="#a78bfa" strokeWidth="2" markerEnd="url(#arrowhead)" />
          </svg>
        </div>
      )}
      <span className="text-white font-bold text-lg select-none">{state.label}</span>
    </div>
  );
});
StateNode.displayName = 'StateNode';

const deepCloneAutomaton = (states: State[], transitions: Transition[]) => {
  return {
    states: states.map((s) => ({ ...s })),
    transitions: transitions.map((t) => ({ ...t, symbols: [...t.symbols] }))
  };
};

const AutomatonEditor: React.FC = () => {
  const [states, setStates] = useState<State[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [transitionFrom, setTransitionFrom] = useState<string | null>(null);
  const [transitionTo, setTransitionTo] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'addState' | 'addTransition'>('select');
  const [inputString, setInputString] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulationResult, setSimulationResult] = useState<'accepted' | 'rejected' | null>(null);
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [showEditTransitionDialog, setShowEditTransitionDialog] = useState(false);
  const [transitionSymbols, setTransitionSymbols] = useState('');
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // OTIMIZAÇÃO Estado separado para posições durante drag (não disparar re-render de transições)
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  
  const stateElRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const statesRef = useRef<State[]>(states);
  
  useEffect(() => { statesRef.current = states; }, [states]);

  const draggingRef = useRef<{
    id: string | null;
    offsetX: number;
    offsetY: number;
    currentX: number;
    currentY: number;
  }>({ id: null, offsetX: 0, offsetY: 0, currentX: 0, currentY: 0 });

  // OTIMIZAÇÃO Canvas overlay para desenhar transições durante drag (garantir 60fps)
  const drawTransitionsOnCanvas = useCallback(() => {
    const canvas = canvasOverlayRef.current;
    if (!canvas || !isDragging) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pegar posições atualizadas
    const currentStates = statesRef.current.map(s => {
      if (s.id === draggingRef.current.id) {
        return { ...s, x: draggingRef.current.currentX, y: draggingRef.current.currentY };
      }
      return s;
    });

    // Desenhar transições
    transitions.forEach(t => {
      const from = currentStates.find(s => s.id === t.from);
      const to = currentStates.find(s => s.id === t.to);
      if (!from || !to) return;

      const isSelf = t.from === t.to;

      ctx.strokeStyle = selectedTransition === t.id ? '#fbbf24' : '#a78bfa';
      ctx.lineWidth = selectedTransition === t.id ? 3 : 2;
      ctx.fillStyle = selectedTransition === t.id ? '#fbbf24' : '#e9d5ff';

      if (isSelf) {
        // Self loop
        const loopWidth = 30, loopHeight = 70;
        ctx.beginPath();
        ctx.moveTo(from.x + 20, from.y);
        ctx.bezierCurveTo(
          from.x + loopWidth, from.y - loopHeight - 50,
          from.x - loopWidth, from.y - loopHeight - 50,
          from.x - loopWidth, from.y - loopWidth
        );
        ctx.stroke();

        // Label
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.symbols.join(', '), from.x - 5, from.y - 100);
      } else {
        const dx = to.x - from.x, dy = to.y - from.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const offsetX = (dx / dist) * 40, offsetY = (dy / dist) * 40;
        const hasReverse = transitions.some(tr => tr.from === to.id && tr.to === from.id);

        ctx.beginPath();
        if (hasReverse) {
          // Curved transition
          const midX = (from.x + to.x) / 2, midY = (from.y + to.y) / 2;
          const perpX = -(dy / dist) * 30, perpY = (dx / dist) * 30;
          ctx.moveTo(from.x + offsetX, from.y + offsetY);
          ctx.quadraticCurveTo(midX + perpX, midY + perpY, to.x - offsetX, to.y - offsetY);
          
          // Label
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(t.symbols.join(', '), midX + perpX, midY + perpY);
        } else {
          // Straight line
          ctx.moveTo(from.x + offsetX, from.y + offsetY);
          ctx.lineTo(to.x - offsetX, to.y - offsetY);
          
          // Label
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(t.symbols.join(', '), (from.x + to.x) / 2, (from.y + to.y) / 2);
        }
        ctx.stroke();

        // Arrow
        const angle = Math.atan2(dy, dx);
        const arrowSize = 10;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(to.x - offsetX, to.y - offsetY);
        ctx.lineTo(
          to.x - offsetX - arrowSize * Math.cos(angle - Math.PI / 6),
          to.y - offsetY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          to.x - offsetX - arrowSize * Math.cos(angle + Math.PI / 6),
          to.y - offsetY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    });
  }, [isDragging, transitions, selectedTransition]);

  // OTIMIZAÇÃO Atualizar canvas em loop RAF durante drag
  useEffect(() => {
    if (!isDragging) return;

    let rafId: number;
    const animate = () => {
      drawTransitionsOnCanvas();
      rafId = requestAnimationFrame(animate);
    };
    
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isDragging, drawTransitionsOnCanvas]);

  // Resize canvas to match container
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasOverlayRef.current;
      const container = canvasRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const saveToHistory = useCallback((newStates: State[], newTransitions: Transition[]) => {
    const snapshot = deepCloneAutomaton(newStates, newTransitions);
    const MAX = 50;
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > MAX) newHistory.splice(0, newHistory.length - MAX);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const snapshot = history[newIndex];
      setHistoryIndex(newIndex);
      setStates(snapshot.states.map(s => ({ ...s })));
      setTransitions(snapshot.transitions.map(t => ({ ...t, symbols: [...t.symbols] })));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const snapshot = history[newIndex];
      setHistoryIndex(newIndex);
      setStates(snapshot.states.map(s => ({ ...s })));
      setTransitions(snapshot.transitions.map(t => ({ ...t, symbols: [...t.symbols] })));
    }
  }, [history, historyIndex]);

  const saveAutomaton = useCallback(() => {
    const data = { states: statesRef.current, transitions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'automaton.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [transitions]);

  const deleteSelected = useCallback(() => {
    if (!selectedState) return;
    const newStates = statesRef.current.filter(s => s.id !== selectedState);
    const newTransitions = transitions.filter(t => t.from !== selectedState && t.to !== selectedState);
    setStates(newStates);
    setTransitions(newTransitions);
    saveToHistory(newStates, newTransitions);
    setSelectedState(null);
  }, [selectedState, transitions, saveToHistory]);

  const deleteTransition = useCallback(() => {
    if (selectedTransition) {
      const newTransitions = transitions.filter(t => t.id !== selectedTransition);
      setTransitions(newTransitions);
      saveToHistory(statesRef.current, newTransitions);
      setSelectedTransition(null);
    }
  }, [selectedTransition, transitions, saveToHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        else if (e.key === 's') { e.preventDefault(); saveAutomaton(); }
      }
      if (e.key === 'Delete' && (selectedState || selectedTransition)) {
        e.preventDefault();
        if (selectedState) deleteSelected();
        if (selectedTransition) deleteTransition();
      }
      if (e.key === 'Escape') {
        setMode('select');
        setTransitionFrom(null);
        setTransitionTo(null);
        setShowTransitionDialog(false);
        setShowEditTransitionDialog(false);
        setSelectedState(null);
        setSelectedTransition(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedState, selectedTransition, undo, redo, saveAutomaton, deleteSelected, deleteTransition]);

  useEffect(() => {
    if (isSimulating && currentStepIndex < simulationSteps.length) {
      const t = setTimeout(() => setCurrentStepIndex(i => i + 1), 800);
      return () => clearTimeout(t);
    } else if (isSimulating && currentStepIndex === simulationSteps.length) {
      setIsSimulating(false);
    }
  }, [currentStepIndex, isSimulating, simulationSteps.length]);

  // OTIMIZAÇÃO Dragging ultra-otimizado - só atualiza transform CSS, não React state
  const handleStateMouseDown = useCallback((e: React.MouseEvent, stateId: string) => {
    if (mode !== 'select') return;
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const st = statesRef.current.find(s => s.id === stateId);
    const el = stateElRefs.current[stateId];
    if (!st || !el) return;

    const offsetX = e.clientX - rect.left - st.x;
    const offsetY = e.clientY - rect.top - st.y;

    draggingRef.current = { 
      id: stateId, 
      offsetX, 
      offsetY, 
      currentX: st.x, 
      currentY: st.y 
    };
    
    setIsDragging(true);

    const onMove = (ev: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag.id) return;

      const rectCanvas = canvasRef.current?.getBoundingClientRect();
      if (!rectCanvas) return;

      const px = ev.clientX - rectCanvas.left;
      const py = ev.clientY - rectCanvas.top;
      const desiredX = px - drag.offsetX;
      const desiredY = py - drag.offsetY;

      // Atualizar posição temporária
      drag.currentX = desiredX;
      drag.currentY = desiredY;

      const st = statesRef.current.find(s => s.id === drag.id);
      if (!st) return;

      const deltaX = desiredX - st.x;
      const deltaY = desiredY - st.y;

      const elToMove = stateElRefs.current[drag.id];
      if (elToMove) {
        elToMove.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      }
    };

    const onUp = () => {
      const drag = draggingRef.current;

      if (!drag.id) {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        setIsDragging(false);
        return;
      }

      const movedEl = stateElRefs.current[drag.id];
      if (movedEl) movedEl.style.transform = '';

      // Só agora atualizar React state (dispara re-render das transições)
      setStates(prev => {
        const newStates = prev.map(s => 
          s.id === drag.id ? { ...s, x: drag.currentX, y: drag.currentY } : s
        );
        statesRef.current = newStates;
        saveToHistory(newStates, transitions);
        return newStates;
      });

      draggingRef.current = { id: null, offsetX: 0, offsetY: 0, currentX: 0, currentY: 0 };
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [mode, transitions, saveToHistory]);

  const handleTransitionClick = useCallback((e: React.MouseEvent, transitionId: string) => {
    e.stopPropagation();
    if (mode === 'select') {
      setSelectedTransition(transitionId);
      setSelectedState(null);
    }
  }, [mode]);

  const addTransition = useCallback(() => {
    if (transitionFrom && transitionTo && transitionSymbols.trim()) {
      const symbols = transitionSymbols.split(',').map(s => s.trim()).filter(s => s);
      const existing = transitions.find(t => t.from === transitionFrom && t.to === transitionTo);
      let newTransitions: Transition[];
      if (existing) {
        newTransitions = transitions.map(t => 
          t.id === existing.id ? { ...t, symbols: Array.from(new Set([...t.symbols, ...symbols])) } : t
        );
      } else {
        newTransitions = [...transitions, { 
          id: `t${Date.now()}`, 
          from: transitionFrom, 
          to: transitionTo, 
          symbols 
        }];
      }
      setTransitions(newTransitions);
      saveToHistory(statesRef.current, newTransitions);
    }
    setTransitionFrom(null);
    setTransitionTo(null);
    setTransitionSymbols('');
    setShowTransitionDialog(false);
    setMode('select');
  }, [transitionFrom, transitionTo, transitionSymbols, transitions, saveToHistory]);

  const updateTransition = useCallback(() => {
    if (selectedTransition && transitionSymbols.trim()) {
      const symbols = transitionSymbols.split(',').map(s => s.trim()).filter(s => s);
      const newTransitions = transitions.map(t => 
        t.id === selectedTransition ? { ...t, symbols } : t
      );
      setTransitions(newTransitions);
      saveToHistory(statesRef.current, newTransitions);
      setShowEditTransitionDialog(false);
      setTransitionSymbols('');
      setSelectedTransition(null);
    }
  }, [selectedTransition, transitionSymbols, transitions, saveToHistory]);

  const editTransition = useCallback(() => {
    if (selectedTransition) {
      const tr = transitions.find(t => t.id === selectedTransition);
      if (tr) {
        setTransitionSymbols(tr.symbols.join(', '));
        setShowEditTransitionDialog(true);
      }
    }
  }, [selectedTransition, transitions]);

  const toggleInitial = useCallback(() => {
    if (!selectedState) return;
    const newStates = statesRef.current.map(s => 
      ({ ...s, isInitial: s.id === selectedState ? !s.isInitial : false })
    );
    setStates(newStates);
    saveToHistory(newStates, transitions);
  }, [selectedState, transitions, saveToHistory]);

  const toggleFinal = useCallback(() => {
    if (!selectedState) return;
    const newStates = statesRef.current.map(s => 
      s.id === selectedState ? { ...s, isFinal: !s.isFinal } : s
    );
    setStates(newStates);
    saveToHistory(newStates, transitions);
  }, [selectedState, transitions, saveToHistory]);

  const simulate = useCallback(() => {
    const initialState = statesRef.current.find(s => s.isInitial);
    if (!initialState) { 
      alert('Defina um estado inicial!'); 
      return; 
    }

    const steps: SimulationStep[] = [];
    let currentState = initialState.id;
    let remaining = inputString;

    steps.push({ currentState, remainingInput: remaining, symbol: '' });

    for (let i = 0; i < inputString.length; i++) {
      const symbol = inputString[i];
      const transition = transitions.find(t => 
        t.from === currentState && t.symbols.includes(symbol)
      );
      
      if (!transition) {
        setSimulationResult('rejected');
        setSimulationSteps(steps);
        setCurrentStepIndex(0);
        setIsSimulating(true);
        return;
      }
      
      currentState = transition.to;
      remaining = inputString.slice(i + 1);
      steps.push({ currentState, remainingInput: remaining, symbol });
    }

    const finalState = statesRef.current.find(s => s.id === currentState);
    setSimulationResult(finalState?.isFinal ? 'accepted' : 'rejected');
    setSimulationSteps(steps);
    setCurrentStepIndex(0);
    setIsSimulating(true);
  }, [inputString, transitions]);

  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimulationSteps([]);
    setCurrentStepIndex(0);
    setSimulationResult(null);
  }, []);

  const loadAutomaton = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        const loadedStates: State[] = data.states || [];
        const loadedTransitions: Transition[] = data.transitions || [];
        setStates(loadedStates);
        setTransitions(loadedTransitions);
        saveToHistory(loadedStates, loadedTransitions);
      } catch {
        alert('Erro ao carregar arquivo!');
      }
    };
    reader.readAsText(file);
  }, [saveToHistory]);

  const currentSimState = simulationSteps[currentStepIndex]?.currentState;

  // Funções para cálculo de transições SVG (só usadas quando NÃO está dragging)
  const getTransitionPath = useCallback((from: State, to: State, isSelfLoop: boolean) => {
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
  }, [transitions]);

  const getTransitionLabelPosition = useCallback((from: State, to: State, isSelfLoop: boolean) => {
    if (isSelfLoop) return { x: from.x - 5, y: from.y - 100 };
    const hasReverse = transitions.some(t => t.from === to.id && t.to === from.id);
    if (hasReverse) {
      const midX = (from.x + to.x) / 2, midY = (from.y + to.y) / 2;
      const dx = to.x - from.x, dy = to.y - from.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const perpX = -(dy / dist) * 30, perpY = (dx / dist) * 30;
      return { x: midX + perpX, y: midY + perpY };
    }
    return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  }, [transitions]);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      <div className="bg-slate-800/50 backdrop-blur-lg border-b border-purple-500/30 p-4 shadow-lg">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
          Editor de Autômatos Finitos Determinísticos ⚡
        </h1>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setMode('select')} 
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'select' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Selecionar
          </button>
          
          <button 
            onClick={() => setMode('addState')} 
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              mode === 'addState' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Plus size={18} /> Adicionar Estado
          </button>
          
          <button 
            onClick={() => setMode('addTransition')} 
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'addTransition' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Adicionar Transição
          </button>

          <div className="border-l border-slate-600 mx-2"></div>

          <button 
            onClick={undo} 
            disabled={historyIndex <= 0} 
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
            title="Desfazer (Ctrl+Z)"
          >
            <Undo size={18} />
          </button>
          
          <button 
            onClick={redo} 
            disabled={historyIndex >= history.length - 1} 
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
            title="Refazer (Ctrl+Y)"
          >
            <Redo size={18} />
          </button>

          <div className="border-l border-slate-600 mx-2"></div>

          <button 
            onClick={saveAutomaton} 
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2" 
            title="Salvar (Ctrl+S)"
          >
            <Save size={18} /> Salvar
          </button>
          
          <label className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2 cursor-pointer">
            <Upload size={18} /> Carregar
            <input type="file" accept=".json" onChange={loadAutomaton} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div 
          ref={canvasRef} 
          className="flex-1 relative cursor-crosshair overflow-hidden" 
          onClick={(e) => {
            if (mode === 'addState') {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const newState: State = {
                id: `q${states.length}`,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                label: `q${states.length}`,
                isInitial: states.length === 0,
                isFinal: false
              };
              const newStates = [...states, newState];
              setStates(newStates);
              saveToHistory(newStates, transitions);
            } else {
              setSelectedState(null);
              setSelectedTransition(null);
            }
          }}
        >
          {/* Canvas overlay para transições durante drag */}
          <canvas
            ref={canvasOverlayRef}
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: isDragging ? 1 : 0, transition: 'opacity 0.1s' }}
          />

          {/* SVG para transições quando NÃO está dragging */}
          <svg 
            ref={svgRef} 
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: isDragging ? 0 : 1, transition: 'opacity 0.1s' }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#a78bfa">
                <polygon points="0 0, 10 3, 0 6" />
              </marker>
              <marker id="arrowhead-selected" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" fill="#fbbf24">
                <polygon points="0 0, 10 3, 0 6" />
              </marker>
            </defs>

            {transitions.map(t => {
              const from = states.find(s => s.id === t.from);
              const to = states.find(s => s.id === t.to);
              if (!from || !to) return null;
              const isSelf = t.from === t.to;
              const path = getTransitionPath(from, to, isSelf);
              const labelPos = getTransitionLabelPosition(from, to, isSelf);
              const isSel = selectedTransition === t.id;
              
              return (
                <g key={t.id}>
                  <path
                    d={path}
                    stroke={isSel ? '#fbbf24' : '#a78bfa'}
                    strokeWidth={isSel ? '3' : '2'}
                    fill="none"
                    markerEnd={isSel ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                    className="transition-all cursor-pointer"
                    style={{ pointerEvents: 'stroke' }}
                    onClick={(e) => handleTransitionClick(e, t.id)}
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    fill={isSel ? '#fbbf24' : '#e9d5ff'}
                    fontSize={14}
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                  >
                    {t.symbols.join(', ')}
                  </text>
                </g>
              );
            })}
          </svg>

          {states.map(state => {
            const isActive = isSimulating && currentSimState === state.id;
            const isSel = selectedState === state.id;
            
            return (
              <StateNode
                key={state.id}
                ref={(el) => { stateElRefs.current[state.id] = el; }}
                state={state}
                isActive={isActive}
                isSelected={isSel}
                onClick={(e) => {
                  e.stopPropagation();
                  if (mode === 'select') {
                    setSelectedState(state.id);
                    setSelectedTransition(null);
                  } else if (mode === 'addTransition') {
                    if (!transitionFrom) {
                      setTransitionFrom(state.id);
                    } else {
                      setTransitionTo(state.id);
                      setShowTransitionDialog(true);
                    }
                  }
                }}
                onMouseDown={handleStateMouseDown}
              />
            );
          })}
        </div>

        <div className="w-80 bg-slate-800/50 backdrop-blur-lg border-l border-purple-500/30 p-4 overflow-y-auto">
          <h2 className="text-xl font-bold text-purple-300 mb-4">Propriedades</h2>

          {selectedState && (
            <div className="space-y-3 mb-6">
              <div className="bg-slate-700/50 p-3 rounded-lg">
                <p className="text-slate-300 font-medium mb-2">Estado: {selectedState}</p>
                <div className="flex gap-2 mb-2">
                  <button 
                    onClick={toggleInitial} 
                    className={`flex-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      states.find(s => s.id === selectedState)?.isInitial 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    Inicial
                  </button>
                  <button 
                    onClick={toggleFinal} 
                    className={`flex-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      states.find(s => s.id === selectedState)?.isFinal 
                        ? 'bg-yellow-600 text-white' 
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    Final
                  </button>
                </div>
                <button 
                  onClick={deleteSelected} 
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Deletar Estado
                </button>
              </div>
            </div>
          )}

          {selectedTransition && (
            <div className="space-y-3 mb-6">
              <div className="bg-slate-700/50 p-3 rounded-lg">
                <p className="text-slate-300 font-medium mb-2">Transição Selecionada</p>
                <div className="flex gap-2">
                  <button 
                    onClick={editTransition} 
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button 
                    onClick={deleteTransition} 
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Deletar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-700/50 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
              <Play size={18} /> Simulação
            </h3>
            <input 
              type="text" 
              value={inputString} 
              onChange={(e) => setInputString(e.target.value)} 
              placeholder="Cadeia de entrada" 
              className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500" 
              disabled={isSimulating} 
            />
            <div className="flex gap-2">
              <button 
                onClick={simulate} 
                disabled={isSimulating || !inputString} 
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play size={16} /> Simular
              </button>
              <button 
                onClick={resetSimulation} 
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {simulationSteps.length > 0 && (
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <Eye size={18} /> Execução
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {simulationSteps.slice(0, currentStepIndex + 1).map((step, index) => (
                  <div 
                    key={index} 
                    className={`p-2 rounded-lg ${
                      index === currentStepIndex 
                        ? 'bg-purple-600/30 border border-purple-500' 
                        : 'bg-slate-600/30'
                    }`}
                  >
                    <div className="text-sm text-slate-300">
                      <span className="font-bold text-purple-300">Estado:</span> {step.currentState}
                    </div>
                    <div className="text-sm text-slate-300">
                      <span className="font-bold text-purple-300">Restante:</span> {step.remainingInput || 'ε'}
                    </div>
                    {step.symbol && (
                      <div className="text-sm text-slate-300">
                        <span className="font-bold text-purple-300">Símbolo:</span> {step.symbol}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!isSimulating && simulationResult && (
                <div 
                  className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                    simulationResult === 'accepted' 
                      ? 'bg-green-600/30 border border-green-500' 
                      : 'bg-red-600/30 border border-red-500'
                  }`}
                >
                  {simulationResult === 'accepted' ? (
                    <>
                      <CheckCircle2 className="text-green-400" />
                      <span className="text-green-300 font-semibold">Cadeia Aceita!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-red-400" />
                      <span className="text-red-300 font-semibold">Cadeia Rejeitada!</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 bg-slate-700/30 p-3 rounded-lg text-sm text-slate-400">
            <p className="mt-3 mb-2"><strong className="text-purple-300">Dicas:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Arraste estados ultra-suave</li>
              <li>Ctrl+Z desfazer, Ctrl+Y refazer</li>
              <li>Delete para remover</li>
              <li>Esc para cancelar ações</li>
            </ul>
          </div>
        </div>
      </div>

      {showTransitionDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-purple-500/30 w-96">
            <h3 className="text-xl font-bold text-purple-300 mb-4">Nova Transição</h3>
            <p className="text-slate-400 text-sm mb-3">
              De <span className="text-purple-400 font-bold">{transitionFrom}</span> para{' '}
              <span className="text-purple-400 font-bold">{transitionTo}</span>
            </p>
            <input 
              type="text" 
              value={transitionSymbols} 
              onChange={(e) => setTransitionSymbols(e.target.value)} 
              placeholder="Símbolos separados por vírgula (ex: a, b, 0)" 
              className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500" 
              autoFocus 
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTransition();
                if (e.key === 'Escape') {
                  setShowTransitionDialog(false);
                  setTransitionFrom(null);
                  setTransitionTo(null);
                  setTransitionSymbols('');
                  setMode('select');
                }
              }} 
            />
            <p className="text-slate-500 text-xs mb-4">
              Dica: Use vírgulas para adicionar múltiplas entradas na mesma transição
            </p>
            <div className="flex gap-2">
              <button 
                onClick={addTransition} 
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all font-medium"
              >
                Adicionar
              </button>
              <button 
                onClick={() => {
                  setShowTransitionDialog(false);
                  setTransitionFrom(null);
                  setTransitionTo(null);
                  setTransitionSymbols('');
                  setMode('select');
                }} 
                className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditTransitionDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-purple-500/30 w-96">
            <h3 className="text-xl font-bold text-purple-300 mb-4">Editar Transição</h3>
            <input 
              type="text" 
              value={transitionSymbols} 
              onChange={(e) => setTransitionSymbols(e.target.value)} 
              placeholder="Símbolos separados por vírgula (ex: a, b, 0)" 
              className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500" 
              autoFocus 
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateTransition();
                if (e.key === 'Escape') {
                  setShowEditTransitionDialog(false);
                  setTransitionSymbols('');
                }
              }} 
            />
            <p className="text-slate-500 text-xs mb-4">
              Dica: Use vírgulas para adicionar múltiplas entradas na mesma transição
            </p>
            <div className="flex gap-2">
              <button 
                onClick={updateTransition} 
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all font-medium"
              >
                Salvar
              </button>
              <button 
                onClick={() => {
                  setShowEditTransitionDialog(false);
                  setTransitionSymbols('');
                }} 
                className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomatonEditor;
