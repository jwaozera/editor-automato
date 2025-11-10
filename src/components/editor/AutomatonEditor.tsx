import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Redo,
  ZoomIn,
  ZoomOut,
  Crosshair
} from 'lucide-react';
import { AutomatonSnapshot, State, Transition } from '../../core/automata/base/types';
import { getAutomatonFactory } from '../../core/automata/registry';
import { useHistory } from '../../hooks/useHistory';
import { usePanZoom } from '../../hooks/usePanZoom';
import { useEditorShortcuts } from '../../hooks/useEditorShortcuts';
import { useSimulation } from '../../hooks/useSimulation';
import { StateNode } from '../primitives/StateNode';
import { TransitionLayer } from '../canvas/TransitionLayer';
import { downloadSnapshot, readSnapshot } from '../../utils/file';

const EDGE_PAN_MARGIN = 50;
const EDGE_PAN_SPEED = 14;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

const deepClone = (s: AutomatonSnapshot) => JSON.parse(JSON.stringify(s));

const AutomatonEditor: React.FC<{ automatonType?: string }> = ({ automatonType = 'dfa' }) => {
  const factory = getAutomatonFactory(automatonType);

  // snapshot do autômato
  const [snapshot, setSnapshot] = useState<AutomatonSnapshot>(() => factory.createEmpty());
  const snapshotRef = useRef(snapshot);
  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);

  // seleção
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);

  // criação de transição
  const [mode, setMode] = useState<'select' | 'addState' | 'addTransition'>('select');
  const [transitionFrom, setTransitionFrom] = useState<string | null>(null);
  const [transitionTo, setTransitionTo] = useState<string | null>(null);
  const [transitionSymbols, setTransitionSymbols] = useState('');
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [showEditTransitionDialog, setShowEditTransitionDialog] = useState(false);

  // simulação
  const [inputString, setInputString] = useState('');
  const { result, isSimulating, stepsIndex, run, reset, currentStateId } = useSimulation(factory);
  const simulationResult = !isSimulating && result ? result.status : null;

  // histórico
  const { push, undo, redo, canUndo, canRedo, history, index } = useHistory(50);

  // Pan/Zoom
  const { scale, setScale, pan, setPan, isPanning, beginPan, continuePan, endPan, zoomIn, zoomOut, resetView } =
    usePanZoom(MIN_SCALE, MAX_SCALE, 1.15);
  const [spaceDown, setSpaceDown] = useState(false);

  // drag state
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef<{ id: string | null; startScreenX: number; startScreenY: number; startX: number; startY: number; currentX: number; currentY: number; }>({ id: null, startScreenX: 0, startScreenY: 0, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [dragTick, setDragTick] = useState(0);

  // refs
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const stateElRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // iniciar histórico com snapshot vazio
  useEffect(() => {
    push(deepClone(snapshot));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // shortcuts
  useEditorShortcuts({
    onUndo: () => {
      if (index > 0) {
        const newIndex = index - 1;
        const prev = history[newIndex];
        setSnapshot(deepClone(prev));
      }
    },
    onRedo: () => {
      if (index < history.length - 1) {
        const newIndex = index + 1;
        const next = history[newIndex];
        setSnapshot(deepClone(next));
      }
    },
    onSave: () => downloadSnapshot(snapshotRef.current),
    onZoomIn: () => zoomIn(),
    onZoomOut: () => zoomOut(),
    onResetView: () => resetView(),
    onDelete: () => {
      if (selectedState) {
        deleteSelectedState();
      } else if (selectedTransition) {
        deleteSelectedTransition();
      }
    },
    onEscape: () => {
      setMode('select');
      setTransitionFrom(null);
      setTransitionTo(null);
      setShowTransitionDialog(false);
      setShowEditTransitionDialog(false);
      setSelectedState(null);
      setSelectedTransition(null);
      if (isPanning) endPan();
    },
    setSpaceDown
  });

  // loop RAF para suavidade (força re-render de paths enquanto arrasta)
  useEffect(() => {
    if (!isDragging) return;
    let rafId = 0;
    const loop = () => {
      setDragTick(t => (t + 1) % 1_000_000);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isDragging]);

  const toLogicalPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    return {
      x: (screenX - pan.x) / scale,
      y: (screenY - pan.y) / scale
    };
  }, [pan.x, pan.y, scale]);

  const commit = useCallback((next: AutomatonSnapshot) => {
    setSnapshot(next);
    push(deepClone(next));
  }, [push]);

  const saveAutomaton = useCallback(() => {
    downloadSnapshot(snapshotRef.current);
  }, []);

  const loadAutomaton = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readSnapshot(file);
      setSnapshot(data);
      push(deepClone(data));
    } catch {
      alert('Erro ao carregar arquivo!');
    }
  }, [push]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const delta = e.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * zoomFactor));
    const ratio = newScale / scale;
    const newPanX = cursorX - (cursorX - pan.x) * ratio;
    const newPanY = cursorY - (cursorY - pan.y) * ratio;
    setPan({ x: newPanX, y: newPanY });
    setScale(newScale);
  }, [scale, pan.x, pan.y, setPan, setScale]);

  const addStateAt = useCallback((clientX: number, clientY: number) => {
    const { x, y } = toLogicalPoint(clientX, clientY);
    const st = factory.config.createState
      ? factory.config.createState(snapshot.states.length, x, y)
      : {
          id: `q${snapshot.states.length}`,
          label: `q${snapshot.states.length}`,
          x, y,
          isInitial: snapshot.states.length === 0,
          isFinal: false
        } as State;

    const next: AutomatonSnapshot = {
      ...snapshot,
      states: [...snapshot.states, st]
    };
    commit(next);
  }, [snapshot, commit, factory, toLogicalPoint]);

  const deleteSelectedState = useCallback(() => {
    if (!selectedState) return;
    const newStates = snapshot.states.filter(s => s.id !== selectedState);
    const newTransitions = snapshot.transitions.filter(t => t.from !== selectedState && t.to !== selectedState);
    commit({ states: newStates, transitions: newTransitions });
    setSelectedState(null);
  }, [selectedState, snapshot, commit]);

  const deleteSelectedTransition = useCallback(() => {
    if (!selectedTransition) return;
    const newTransitions = snapshot.transitions.filter(t => t.id !== selectedTransition);
    commit({ ...snapshot, transitions: newTransitions });
    setSelectedTransition(null);
  }, [selectedTransition, snapshot, commit]);

  const toggleInitial = useCallback(() => {
    if (!selectedState) return;
    const newStates = snapshot.states.map(s => ({ ...s, isInitial: s.id === selectedState ? !s.isInitial : false }));
    commit({ ...snapshot, states: newStates });
  }, [selectedState, snapshot, commit]);

  const toggleFinal = useCallback(() => {
    if (!selectedState) return;
    const newStates = snapshot.states.map(s => s.id === selectedState ? { ...s, isFinal: !s.isFinal } : s);
    commit({ ...snapshot, states: newStates });
  }, [selectedState, snapshot, commit]);

  const handleStateMouseDown = useCallback((e: React.MouseEvent, stateId: string) => {
    if (spaceDown || isPanning) return;
    if (mode !== 'select') return;
    e.stopPropagation();

    const st = snapshotRef.current.states.find(s => s.id === stateId);
    const el = stateElRefs.current[stateId];
    if (!st || !el) return;

    draggingRef.current = {
      id: stateId,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      startX: st.x,
      startY: st.y,
      currentX: st.x,
      currentY: st.y
    };

    setIsDragging(true);

    const onMove = (ev: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag.id) return;

      const containerRect = canvasRef.current?.getBoundingClientRect();
      if (containerRect) {
        let panDX = 0;
        let panDY = 0;
        if (ev.clientX - containerRect.left < EDGE_PAN_MARGIN) panDX = EDGE_PAN_SPEED;
        else if (containerRect.right - ev.clientX < EDGE_PAN_MARGIN) panDX = -EDGE_PAN_SPEED;

        if (ev.clientY - containerRect.top < EDGE_PAN_MARGIN) panDY = EDGE_PAN_SPEED;
        else if (containerRect.bottom - ev.clientY < EDGE_PAN_MARGIN) panDY = -EDGE_PAN_SPEED;

        if (panDX !== 0 || panDY !== 0) {
          setPan(prev => ({ x: prev.x + panDX, y: prev.y + panDY }));
          draggingRef.current.startScreenX += panDX;
          draggingRef.current.startScreenY += panDY;
        }
      }

      const deltaScreenX = ev.clientX - drag.startScreenX;
      const deltaScreenY = ev.clientY - drag.startScreenY;
      const desiredX = drag.startX + (deltaScreenX / scale);
      const desiredY = drag.startY + (deltaScreenY / scale);

      drag.currentX = desiredX;
      drag.currentY = desiredY;

      const stLocal = snapshotRef.current.states.find(s => s.id === drag.id);
      if (!stLocal) return;

      const deltaX = desiredX - stLocal.x;
      const deltaY = desiredY - stLocal.y;

      const elToMove = stateElRefs.current[drag.id];
      if (elToMove) {
        elToMove.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      }
    };

    const onUp = () => {
      const drag = draggingRef.current;
      if (!drag.id) {
        cleanup();
        return;
      }
      const movedEl = stateElRefs.current[drag.id];
      if (movedEl) movedEl.style.transform = '';

      const newStates = snapshotRef.current.states.map(s =>
        s.id === drag.id ? { ...s, x: drag.currentX, y: drag.currentY } : s
      );
      const next = { ...snapshotRef.current, states: newStates };
      setSnapshot(next);
      push(deepClone(next));

      draggingRef.current = { id: null, startScreenX: 0, startScreenY: 0, startX: 0, startY: 0, currentX: 0, currentY: 0 };
      cleanup();
    };

    const cleanup = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [mode, scale, setPan, push, spaceDown, isPanning]);

  const handleTransitionClick = useCallback((e: React.MouseEvent, transitionId: string) => {
    e.stopPropagation();
    if (mode === 'select') {
      setSelectedTransition(transitionId);
      setSelectedState(null);
    }
  }, [mode]);

  const openAddTransitionDialog = useCallback(() => {
    setShowTransitionDialog(true);
  }, []);

  const addTransition = useCallback(() => {
    if (transitionFrom && transitionTo && transitionSymbols.trim()) {
      const symbols = transitionSymbols.split(',').map(s => s.trim()).filter(s => s);
      const base: Transition = {
        id: `t${Date.now()}`,
        from: transitionFrom,
        to: transitionTo,
        symbols
      };
      const normalized = factory.config.normalizeTransition ? factory.config.normalizeTransition(base) : base;

      const existing = snapshot.transitions.find(t => t.from === normalized.from && t.to === normalized.to);
      let newTransitions: Transition[];
      if (existing) {
        newTransitions = snapshot.transitions.map(t =>
          t.id === existing.id ? { ...t, symbols: Array.from(new Set([...t.symbols, ...normalized.symbols])) } : t
        );
      } else {
        newTransitions = [...snapshot.transitions, normalized];
      }
      const next = { ...snapshot, transitions: newTransitions };
      commit(next);
    }
    setTransitionFrom(null);
    setTransitionTo(null);
    setTransitionSymbols('');
    setShowTransitionDialog(false);
    setMode('select');
  }, [transitionFrom, transitionTo, transitionSymbols, snapshot, commit, factory]);

  const editTransition = useCallback(() => {
    if (selectedTransition) {
      const tr = snapshot.transitions.find(t => t.id === selectedTransition);
      if (tr) {
        setTransitionSymbols(tr.symbols.join(', '));
        setShowEditTransitionDialog(true);
      }
    }
  }, [selectedTransition, snapshot]);

  const updateTransition = useCallback(() => {
    if (selectedTransition && transitionSymbols.trim()) {
      const symbols = transitionSymbols.split(',').map(s => s.trim()).filter(s => s);
      const newTransitions = snapshot.transitions.map(t =>
        t.id === selectedTransition ? { ...t, symbols } : t
      );
      const next = { ...snapshot, transitions: newTransitions };
      commit(next);
      setShowEditTransitionDialog(false);
      setTransitionSymbols('');
      setSelectedTransition(null);
    }
  }, [selectedTransition, transitionSymbols, snapshot, commit]);

  const simulate = useCallback(() => {
    if (!snapshot.states.find(s => s.isInitial)) {
      alert('Defina um estado inicial!');
      return;
    }
    run(snapshot, inputString);
  }, [run, snapshot, inputString]);

  const currentSimState = currentStateId || '';

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
            onClick={() => {
              if (index > 0) {
                const newIndex = index - 1;
                const prev = history[newIndex];
                setSnapshot(deepClone(prev));
              }
            }}
            disabled={index <= 0}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo size={18} />
          </button>

          <button
            onClick={() => {
              if (index < history.length - 1) {
                const newIndex = index + 1;
                const next = history[newIndex];
                setSnapshot(deepClone(next));
              }
            }}
            disabled={index >= history.length - 1}
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

          <div className="border-l border-slate-600 mx-2"></div>

          <button
            onClick={zoomIn}
            className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-2"
            title="Zoom In (Ctrl + +)"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={zoomOut}
            className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-2"
            title="Zoom Out (Ctrl + -)"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={resetView}
            className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-2"
            title="Reset View (Ctrl + 0)"
          >
            <Crosshair size={18} /> Reset
          </button>
          <div className="flex items-center text-xs text-slate-400 ml-2 select-none">
            Zoom: {(scale * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={(e) => {
            // pan com Space ou botão do meio
            if (spaceDown || e.button === 1) {
              beginPan(e.clientX, e.clientY, pan.x, pan.y);
              return;
            }
            if (mode === 'addState') {
              addStateAt(e.clientX, e.clientY);
            } else if (!isPanning) {
              setSelectedState(null);
              setSelectedTransition(null);
            }
          }}
          onMouseMove={(e) => {
            if (isPanning) continuePan(e.clientX, e.clientY);
          }}
          onMouseUp={() => { if (isPanning) endPan(); }}
          onMouseLeave={() => { if (isPanning) endPan(); }}
          style={{ cursor: spaceDown || isPanning ? 'grab' : mode === 'addState' ? 'crosshair' : 'default' }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              willChange: 'transform'
            }}
          >
            <TransitionLayer
              states={snapshot.states}
              transitions={snapshot.transitions}
              labelFormatter={factory.config.formatTransitionLabel || ((t) => t.symbols.join(', '))}
              selectedTransition={selectedTransition}
              onTransitionClick={handleTransitionClick}
              dragging={{
                id: draggingRef.current.id,
                x: draggingRef.current.currentX,
                y: draggingRef.current.currentY
              }}
              dragTick={dragTick}
            />

            {snapshot.states.map(state => {
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
                        openAddTransitionDialog();
                      }
                    }
                  }}
                  onMouseDown={handleStateMouseDown}
                />
              );
            })}
          </div>
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
                      snapshot.states.find(s => s.id === selectedState)?.isInitial
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    Inicial
                  </button>
                  <button
                    onClick={toggleFinal}
                    className={`flex-1 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                      snapshot.states.find(s => s.id === selectedState)?.isFinal
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    Final
                  </button>
                </div>
                <button
                  onClick={deleteSelectedState}
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
                    onClick={deleteSelectedTransition}
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
                onClick={reset}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {result?.steps?.length ? (
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <Eye size={18} /> Execução
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.steps.slice(0, Math.min(stepsIndex + 1, result.steps.length)).map((step, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-lg ${
                      index === Math.min(stepsIndex, result.steps.length - 1)
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
          ) : null}

          <div className="mt-6 bg-slate-700/30 p-3 rounded-lg text-sm text-slate-400">
            <p className="mt-3 mb-2"><strong className="text-purple-300">Dicas:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Use a roda do mouse para dar zoom</li>
              <li>Segure a barra de espaço ou o botão do meio para mover (pan)</li>
              <li>Ctrl + + / - / 0 para zoom in/out/reset</li>
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
                if (e.key === 'Enter') {
                  updateTransition();
                }
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
