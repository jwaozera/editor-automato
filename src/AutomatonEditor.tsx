import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Play, Plus, Trash2, Save, Upload, RotateCcw, CheckCircle2, XCircle, Eye, Edit2, Undo, Redo, ZoomIn, ZoomOut, Maximize2, AlertCircle } from 'lucide-react';

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
  transitionUsed?: string;
}

interface HistoryState {
  states: State[];
  transitions: Transition[];
}

interface ViewportState {
  scale: number;
  translateX: number;
  translateY: number;
}

// Componente State Node otimizado
const StateNode = memo(({ 
  state, 
  isActive, 
  isSelected, 
  scale,
  onClick, 
  onMouseDown 
}: {
  state: State;
  isActive: boolean;
  isSelected: boolean;
  scale: number;
  onClick: (e: React.MouseEvent, id: string) => void;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
}) => (
  <div
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
      border: state.isFinal ? '4px solid #fbbf24' : 'none'
    }}
    onClick={(e) => onClick(e, state.id)}
    onMouseDown={(e) => onMouseDown(e, state.id)}
    title={state.label}
  >
    {state.isInitial && (
      <div className="absolute -left-8 top-1/2 -translate-y-1/2">
        <svg width="30" height="20">
          <defs>
            <marker
              id={`arrow-${state.id}`}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              fill="#a78bfa"
            >
              <polygon points="0 0, 10 3, 0 6" />
            </marker>
          </defs>
          <path
            d="M 0 10 L 20 10"
            stroke="#a78bfa"
            strokeWidth="2"
            markerEnd={`url(#arrow-${state.id})`}
          />
        </svg>
      </div>
    )}
    <span className="text-white font-bold text-lg select-none">{state.label}</span>
  </div>
));

const AutomatonEditor = () => {
  const [states, setStates] = useState<State[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  const [transitionFrom, setTransitionFrom] = useState<string | null>(null);
  const [transitionTo, setTransitionTo] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'addState' | 'addTransition'>('select');
  const [inputString, setInputString] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulationResult, setSimulationResult] = useState<'accepted' | 'rejected' | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [showEditTransitionDialog, setShowEditTransitionDialog] = useState(false);
  const [transitionSymbols, setTransitionSymbols] = useState('');
  const [draggingState, setDraggingState] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [viewport, setViewport] = useState<ViewportState>({ scale: 1, translateX: 0, translateY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Debounced mouse move
    const mouseMoveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToHistory = useCallback((newStates: State[], newTransitions: Transition[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ 
      states: JSON.parse(JSON.stringify(newStates)), 
      transitions: JSON.parse(JSON.stringify(newTransitions)) 
    });
    if (newHistory.length > 50) newHistory.shift(); // Limitar histórico
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setStates(JSON.parse(JSON.stringify(history[newIndex].states)));
      setTransitions(JSON.parse(JSON.stringify(history[newIndex].transitions)));
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setStates(JSON.parse(JSON.stringify(history[newIndex].states)));
      setTransitions(JSON.parse(JSON.stringify(history[newIndex].transitions)));
    }
  }, [historyIndex, history]);

  // Validação do autômato
  const validateAutomaton = useCallback(() => {
    const errors: string[] = [];
    
    // Verificar estado inicial
    const initialStates = states.filter(s => s.isInitial);
    if (initialStates.length === 0) {
      errors.push('Nenhum estado inicial definido');
    } else if (initialStates.length > 1) {
      errors.push('Múltiplos estados iniciais definidos (AFD permite apenas um)');
    }
    
    // Verificar estados finais
    if (!states.some(s => s.isFinal)) {
      errors.push('Nenhum estado final definido');
    }
    
    // Verificar determinismo
    const transitionMap = new Map<string, Set<string>>();
    transitions.forEach(t => {
      t.symbols.forEach(symbol => {
        const key = `${t.from}-${symbol}`;
        if (!transitionMap.has(key)) {
          transitionMap.set(key, new Set());
        }
        transitionMap.get(key)!.add(t.to);
      });
    });
    
    transitionMap.forEach((targets, key) => {
      if (targets.size > 1) {
        const [from, symbol] = key.split('-');
        errors.push(`Estado ${from} tem múltiplas transições para o símbolo '${symbol}' (não-determinístico)`);
      }
    });
    
    // Verificar estados inalcançáveis
    if (initialStates.length === 1) {
      const reachable = new Set<string>([initialStates[0].id]);
      const queue = [initialStates[0].id];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        transitions.filter(t => t.from === current).forEach(t => {
          if (!reachable.has(t.to)) {
            reachable.add(t.to);
            queue.push(t.to);
          }
        });
      }
      
      const unreachable = states.filter(s => !reachable.has(s.id));
      if (unreachable.length > 0) {
        errors.push(`Estados inalcançáveis: ${unreachable.map(s => s.label).join(', ')}`);
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [states, transitions]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          saveAutomaton();
        }
      }
      if (e.key === 'Delete' && selectedState && !editingLabel) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === 'Delete' && selectedTransition) {
        e.preventDefault();
        deleteTransition();
      }
      if (e.key === 'Escape') {
        setEditingLabel(null);
        setSelectedState(null);
        setSelectedTransition(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedState, selectedTransition, editingLabel]);

  // Zoom com wheel
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setViewport(prev => ({
          ...prev,
          scale: Math.max(0.1, Math.min(3, prev.scale * delta))
        }));
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, []);

  useEffect(() => {
    if (isSimulating && currentStepIndex < simulationSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    } else if (isSimulating && currentStepIndex === simulationSteps.length) {
      setIsSimulating(false);
    }
  }, [currentStepIndex, isSimulating, simulationSteps.length]);

  const screenToCanvas = (screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - viewport.translateX) / viewport.scale,
      y: (screenY - rect.top - viewport.translateY) / viewport.scale
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) return;
    
    if (mode === 'addState') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const newState: State = {
        id: `q${states.length}`,
        x: pos.x,
        y: pos.y,
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
  };

  const handleStateClick = (e: React.MouseEvent, stateId: string) => {
    e.stopPropagation();
    
    if (mode === 'select') {
      setSelectedState(stateId);
      setSelectedTransition(null);
    } else if (mode === 'addTransition') {
      if (!transitionFrom) {
        setTransitionFrom(stateId);
      } else {
        setTransitionTo(stateId);
        setShowTransitionDialog(true);
      }
    }
  };

  const handleStateDoubleClick = (e: React.MouseEvent, stateId: string) => {
    e.stopPropagation();
    if (mode === 'select') {
      const state = states.find(s => s.id === stateId);
      if (state) {
        setEditingLabel(stateId);
        setTempLabel(state.label);
      }
    }
  };

  const finishEditingLabel = () => {
    if (editingLabel && tempLabel.trim()) {
      const newStates = states.map(s =>
        s.id === editingLabel ? { ...s, label: tempLabel.trim() } : s
      );
      setStates(newStates);
      saveToHistory(newStates, transitions);
    }
    setEditingLabel(null);
    setTempLabel('');
  };

  const handleStateMouseDown = (e: React.MouseEvent, stateId: string) => {
    if (mode === 'select' && !editingLabel) {
      e.stopPropagation();
      const state = states.find(s => s.id === stateId);
      if (state) {
        setDraggingState(stateId);
        const pos = screenToCanvas(e.clientX, e.clientY);
        setDragOffset({
          x: pos.x - state.x,
          y: pos.y - state.y
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseMoveTimeout.current) {
      clearTimeout(mouseMoveTimeout.current);
    }

    mouseMoveTimeout.current = setTimeout(() => {
      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setViewport(prev => ({
          ...prev,
          translateX: prev.translateX + dx,
          translateY: prev.translateY + dy
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
      } else if (draggingState && mode === 'select') {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setStates(states.map(s =>
          s.id === draggingState ? { ...s, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : s
        ));
      }
    }, 5);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (draggingState) {
      saveToHistory(states, transitions);
      setDraggingState(null);
    }
    setIsPanning(false);
  };

  const handleTransitionClick = (e: React.MouseEvent, transitionId: string) => {
    e.stopPropagation();
    if (mode === 'select') {
      setSelectedTransition(transitionId);
      setSelectedState(null);
    }
  };

  const addTransition = () => {
    if (transitionFrom && transitionTo && transitionSymbols.trim()) {
      const symbols = transitionSymbols.split(',').map(s => s.trim()).filter(s => s);
      
      const existingTransition = transitions.find(
        t => t.from === transitionFrom && t.to === transitionTo
      );

      let newTransitions;
      if (existingTransition) {
        newTransitions = transitions.map(t =>
          t.id === existingTransition.id
            ? { ...t, symbols: t.symbols.concat(symbols).filter((v, i, a) => a.indexOf(v) === i) }
            : t
        );
      } else {
        const newTransition: Transition = {
          id: `t${Date.now()}`,
          from: transitionFrom,
          to: transitionTo,
          symbols
        };
        newTransitions = [...transitions, newTransition];
      }
      
      setTransitions(newTransitions);
      saveToHistory(states, newTransitions);
    }
    setTransitionFrom(null);
    setTransitionTo(null);
    setTransitionSymbols('');
    setShowTransitionDialog(false);
    setMode('select');
  };

  const updateTransition = () => {
    if (selectedTransition && transitionSymbols.trim()) {
      const symbols = transitionSymbols.split(',').map(s => s.trim()).filter(s => s);
      const newTransitions = transitions.map(t =>
        t.id === selectedTransition ? { ...t, symbols } : t
      );
      setTransitions(newTransitions);
      saveToHistory(states, newTransitions);
      setShowEditTransitionDialog(false);
      setTransitionSymbols('');
      setSelectedTransition(null);
    }
  };

  const deleteTransition = () => {
    if (selectedTransition) {
      const newTransitions = transitions.filter(t => t.id !== selectedTransition);
      setTransitions(newTransitions);
      saveToHistory(states, newTransitions);
      setSelectedTransition(null);
    }
  };

  const editTransition = () => {
    if (selectedTransition) {
      const transition = transitions.find(t => t.id === selectedTransition);
      if (transition) {
        setTransitionSymbols(transition.symbols.join(', '));
        setShowEditTransitionDialog(true);
      }
    }
  };

  const deleteSelected = () => {
    if (selectedState) {
      const newStates = states.filter(s => s.id !== selectedState);
      const newTransitions = transitions.filter(t => t.from !== selectedState && t.to !== selectedState);
      setStates(newStates);
      setTransitions(newTransitions);
      saveToHistory(newStates, newTransitions);
      setSelectedState(null);
    }
  };

  const toggleInitial = () => {
    if (selectedState) {
      const newStates = states.map(s => ({
        ...s,
        isInitial: s.id === selectedState ? !s.isInitial : false
      }));
      setStates(newStates);
      saveToHistory(newStates, transitions);
    }
  };

  const toggleFinal = () => {
    if (selectedState) {
      const newStates = states.map(s =>
        s.id === selectedState ? { ...s, isFinal: !s.isFinal } : s
      );
      setStates(newStates);
      saveToHistory(newStates, transitions);
    }
  };

  const simulate = () => {
    if (!validateAutomaton()) {
      return;
    }

    const initialState = states.find(s => s.isInitial);
    if (!initialState) return;

    const steps: SimulationStep[] = [];
    let currentState = initialState.id;
    let remaining = inputString;

    steps.push({
      currentState,
      remainingInput: remaining,
      symbol: ''
    });

    for (let i = 0; i < inputString.length; i++) {
      const symbol = inputString[i];
      const transition = transitions.find(
        t => t.from === currentState && t.symbols.includes(symbol)
      );

      if (!transition) {
        steps.push({
          currentState,
          remainingInput: remaining.slice(i),
          symbol,
          transitionUsed: undefined
        });
        setSimulationResult('rejected');
        setSimulationSteps(steps);
        setCurrentStepIndex(0);
        setIsSimulating(true);
        return;
      }

      currentState = transition.to;
      remaining = inputString.slice(i + 1);
      steps.push({
        currentState,
        remainingInput: remaining,
        symbol,
        transitionUsed: transition.id
      });
    }

    const finalState = states.find(s => s.id === currentState);
    setSimulationResult(finalState?.isFinal ? 'accepted' : 'rejected');
    setSimulationSteps(steps);
    setCurrentStepIndex(0);
    setIsSimulating(true);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setSimulationSteps([]);
    setCurrentStepIndex(0);
    setSimulationResult(null);
  };

  const resetViewport = () => {
    setViewport({ scale: 1, translateX: 0, translateY: 0 });
  };

  const zoomIn = () => {
    setViewport(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }));
  };

  const zoomOut = () => {
    setViewport(prev => ({ ...prev, scale: Math.max(0.1, prev.scale / 1.2) }));
  };

  const getTransitionPath = (from: State, to: State, isSelfLoop: boolean, isReverse: boolean = false) => {
    if (isSelfLoop) {
      const loopOffset = isReverse ? -60 : 60;
      return `M ${from.x} ${from.y - 40} Q ${from.x + loopOffset} ${from.y - 90} ${from.x} ${from.y - 40}`;
    }
    
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (dx / dist) * 40;
    const offsetY = (dy / dist) * 40;
    
    const hasReverse = transitions.some(t => t.from === to.id && t.to === from.id && t.id !== transitions.find(tr => tr.from === from.id && tr.to === to.id)?.id);
    
    if (hasReverse) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const curvature = isReverse ? -40 : 40;
      const perpX = -(dy / dist) * curvature;
      const perpY = (dx / dist) * curvature;
      
      return `M ${from.x + offsetX} ${from.y + offsetY} Q ${midX + perpX} ${midY + perpY} ${to.x - offsetX} ${to.y - offsetY}`;
    }
    
    return `M ${from.x + offsetX} ${from.y + offsetY} L ${to.x - offsetX} ${to.y - offsetY}`;
  };

  const getTransitionLabelPosition = (from: State, to: State, isSelfLoop: boolean, isReverse: boolean = false) => {
    if (isSelfLoop) {
      const loopOffset = isReverse ? -60 : 60;
      return { x: from.x + loopOffset, y: from.y - 95 };
    }
    
    const hasReverse = transitions.some(t => t.from === to.id && t.to === from.id);
    
    if (hasReverse) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const curvature = isReverse ? -40 : 40;
      const perpX = -(dy / dist) * curvature;
      const perpY = (dx / dist) * curvature;
      
      return { x: midX + perpX, y: midY + perpY };
    }
    
    return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  };

  const saveAutomaton = () => {
    const data = { states, transitions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'automaton.json';
    a.click();
  };

  const loadAutomaton = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          setStates(data.states || []);
          setTransitions(data.transitions || []);
          saveToHistory(data.states || [], data.transitions || []);
        } catch (error) {
          alert('Erro ao carregar arquivo!');
        }
      };
      reader.readAsText(file);
    }
  };

  const currentSimState = simulationSteps[currentStepIndex]?.currentState;
  const currentTransition = simulationSteps[currentStepIndex]?.transitionUsed;

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      <div className="bg-slate-800/50 backdrop-blur-lg border-b border-purple-500/30 p-4 shadow-lg">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
          Editor de Autômatos Finitos Determinísticos
        </h1>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode('select')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'select'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Modo Selecionar"
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
            title="Adicionar Estado (clique no canvas)"
          >
            <Plus size={18} /> Estado
          </button>
          <button
            onClick={() => setMode('addTransition')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'addTransition'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Adicionar Transição (clique em dois estados)"
          >
            Transição
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
            onClick={zoomIn}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
            title="Zoom In (Ctrl+Scroll)"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={zoomOut}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
            title="Zoom Out (Ctrl+Scroll)"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={resetViewport}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
            title="Resetar Visualização"
          >
            <Maximize2 size={18} />
          </button>
          
          <div className="border-l border-slate-600 mx-2"></div>
          
          <button
            onClick={saveAutomaton}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2"
            title="Salvar Autômato (Ctrl+S)"
          >
            <Save size={18} /> Salvar
          </button>
          <label className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2 cursor-pointer">
            <Upload size={18} /> Carregar
            <input type="file" accept=".json" onChange={loadAutomaton} className="hidden" />
          </label>
          
          <div className="ml-auto text-slate-400 text-sm flex items-center gap-2">
            <span>Zoom: {(viewport.scale * 100).toFixed(0)}%</span>
            <span className="text-slate-600">|</span>
            <span>Estados: {states.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          style={{ cursor: isPanning ? 'grabbing' : mode === 'addState' ? 'crosshair' : 'default' }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `translate(${viewport.translateX}px, ${viewport.translateY}px) scale(${viewport.scale})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%',
              position: 'relative'
            }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  fill="#a78bfa"
                >
                  <polygon points="0 0, 10 3, 0 6" />
                </marker>
                <marker
                  id="arrowhead-selected"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  fill="#fbbf24"
                >
                  <polygon points="0 0, 10 3, 0 6" />
                </marker>
                <marker
                  id="arrowhead-active"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  fill="#10b981"
                >
                  <polygon points="0 0, 10 3, 0 6" />
                </marker>
              </defs>
              
              {transitions.map(t => {
                const fromState = states.find(s => s.id === t.from);
                const toState = states.find(s => s.id === t.to);
                if (!fromState || !toState) return null;
                
                const isSelfLoop = t.from === t.to;
                const reverseTransition = transitions.find(tr => tr.from === t.to && tr.to === t.from);
                const isReverse = reverseTransition && reverseTransition.id < t.id;
                
                const path = getTransitionPath(fromState, toState, isSelfLoop, isReverse);
                const labelPos = getTransitionLabelPosition(fromState, toState, isSelfLoop, isReverse);
                const isSelected = selectedTransition === t.id;
                const isActive = isSimulating && currentTransition === t.id;
                
                return (
                  <g key={t.id}>
                    <path
                      d={path}
                      stroke={isActive ? '#10b981' : isSelected ? '#fbbf24' : '#a78bfa'}
                      strokeWidth={isActive ? '4' : isSelected ? '3' : '2'}
                      fill="none"
                      markerEnd={isActive ? 'url(#arrowhead-active)' : isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                      className="transition-all cursor-pointer"
                      style={{ pointerEvents: 'stroke' }}
                      onClick={(e) => handleTransitionClick(e as any, t.id)}
                    />
                    <rect
                      x={labelPos.x - 30}
                      y={labelPos.y - 12}
                      width={60}
                      height={24}
                      fill={isActive ? '#10b981' : isSelected ? '#fbbf24' : '#6b21a8'}
                      opacity="0.8"
                      rx="4"
                      className="pointer-events-none"
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 4}
                      fill="white"
                      fontSize="13"
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
              const isSelected = selectedState === state.id;
              const isEditing = editingLabel === state.id;
              
              return (
                <div key={state.id}>
                  <StateNode
                    state={state}
                    isActive={isActive}
                    isSelected={isSelected}
                    scale={viewport.scale}
                    onClick={handleStateClick}
                    onMouseDown={handleStateMouseDown}
                  />
                  {isEditing && (
                    <input
                      type="text"
                      value={tempLabel}
                      onChange={(e) => setTempLabel(e.target.value)}
                      onBlur={finishEditingLabel}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishEditingLabel();
                        if (e.key === 'Escape') {
                          setEditingLabel(null);
                          setTempLabel('');
                        }
                      }}
                      autoFocus
                      className="absolute bg-slate-800 text-white px-2 py-1 rounded border-2 border-purple-500 focus:outline-none"
                      style={{
                        left: state.x - 30,
                        top: state.y + 30,
                        width: '60px',
                        textAlign: 'center'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-lg rounded-lg p-3 text-slate-300 text-sm border border-purple-500/30">
            <div className="flex items-center gap-2 mb-1">
              <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Alt+Drag</kbd>
              <span>Pan</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl+Wheel</kbd>
              <span>Zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Double Click</kbd>
              <span>Renomear</span>
            </div>
          </div>
        </div>

        <div className="w-80 bg-slate-800/50 backdrop-blur-lg border-l border-purple-500/30 p-4 overflow-y-auto">
          <h2 className="text-xl font-bold text-purple-300 mb-4">Propriedades</h2>
          
          {validationErrors.length > 0 && (
            <div className="mb-4 bg-red-900/30 border border-red-500/50 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-red-300 font-semibold text-sm mb-1">Problemas Encontrados:</p>
                  <ul className="text-red-200 text-xs space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {selectedState && (
            <div className="space-y-3 mb-6">
              <div className="bg-slate-700/50 p-3 rounded-lg">
                <p className="text-slate-300 font-medium mb-2">
                  Estado: {states.find(s => s.id === selectedState)?.label}
                </p>
                <p className="text-slate-400 text-xs mb-3">Duplo clique no estado para renomear</p>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={toggleInitial}
                    className={`flex-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      states.find(s => s.id === selectedState)?.isInitial
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                    title="Marcar como estado inicial"
                  >
                    Inicial
                  </button>
                  <button
                    onClick={toggleFinal}
                    className={`flex-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      states.find(s => s.id === selectedState)?.isFinal
                        ? 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                    title="Marcar como estado final"
                  >
                    Final
                  </button>
                </div>
                <button
                  onClick={deleteSelected}
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                  title="Deletar estado (Delete)"
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
                <div className="text-sm text-slate-400 mb-3">
                  {(() => {
                    const trans = transitions.find(t => t.id === selectedTransition);
                    if (!trans) return null;
                    const from = states.find(s => s.id === trans.from)?.label;
                    const to = states.find(s => s.id === trans.to)?.label;
                    return `${from} → ${to}`;
                  })()}
                </div>
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
                    title="Deletar transição (Delete)"
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
              placeholder="Cadeia de entrada (ex: 010101)"
              className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isSimulating}
            />
            <div className="flex gap-2">
              <button
                onClick={simulate}
                disabled={isSimulating || !inputString}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <Play size={16} /> Simular
              </button>
              <button
                onClick={resetSimulation}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
                title="Resetar simulação"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {simulationSteps.length > 0 && (
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <Eye size={18} /> Execução Passo a Passo
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
                      <span className="font-bold text-purple-300">Passo {index}:</span>{' '}
                      {states.find(s => s.id === step.currentState)?.label || step.currentState}
                    </div>
                    <div className="text-sm text-slate-300">
                      <span className="font-bold text-purple-300">Restante:</span>{' '}
                      {step.remainingInput || 'ε'}
                    </div>
                    {step.symbol && (
                      <div className="text-sm text-slate-300">
                        <span className="font-bold text-purple-300">Leu:</span> {step.symbol}
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
                      <span className="text-green-300 font-semibold">Cadeia Aceita! ✓</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-red-400" />
                      <span className="text-red-300 font-semibold">Cadeia Rejeitada! ✗</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 bg-slate-700/30 p-3 rounded-lg text-sm text-slate-400">
            <p className="mb-2"><strong className="text-purple-300">Atalhos:</strong></p>
            <ul className="space-y-1 text-xs">
              <li><kbd className="bg-slate-800 px-1 rounded">Ctrl+Z</kbd> Desfazer</li>
              <li><kbd className="bg-slate-800 px-1 rounded">Ctrl+Y</kbd> Refazer</li>
              <li><kbd className="bg-slate-800 px-1 rounded">Delete</kbd> Remover</li>
              <li><kbd className="bg-slate-800 px-1 rounded">Ctrl+S</kbd> Salvar</li>
              <li><kbd className="bg-slate-800 px-1 rounded">Esc</kbd> Cancelar</li>
            </ul>
          </div>
        </div>
      </div>

      {showTransitionDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-purple-500/30 w-96">
            <h3 className="text-xl font-bold text-purple-300 mb-4">Nova Transição</h3>
            <p className="text-slate-400 text-sm mb-3">
              De <span className="text-purple-400 font-bold">{states.find(s => s.id === transitionFrom)?.label}</span> para{' '}
              <span className="text-purple-400 font-bold">{states.find(s => s.id === transitionTo)?.label}</span>
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
              💡 Use vírgulas para adicionar múltiplas entradas
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
              placeholder="Símbolos separados por vírgula"
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
              💡 Use vírgulas para adicionar múltiplas entradas
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
