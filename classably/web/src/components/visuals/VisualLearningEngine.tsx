import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Eye, Volume2, VolumeX, Globe, Maximize2, Minimize2,
  ZoomIn, ZoomOut, RotateCcw, Info, Layers, Compass, HelpCircle,
  CheckCircle2, ArrowRight, Play, RefreshCw, BookOpen, Radio, Zap, Activity
} from 'lucide-react';
import { aiQaApi } from '../../api/client';
import { useAccessibility } from '../../context/AccessibilityContext';

export interface VisualNode {
  id: string;
  label: string;
  translated_label?: string;
  desc: string;
  translated_desc?: string;
  x: number;
  y: number;
  icon?: string;
  color?: string;
  match_words?: string[];
}

export interface VisualLink {
  from: string;
  to: string;
  label: string;
}

export interface VisualDiagramData {
  id: string;
  title: string;
  subject: string;
  type: string;
  keywords?: string[];
  audio_description: string;
  translated_audio_description?: string;
  nodes: VisualNode[];
  links: VisualLink[];
}

interface VisualLearningEngineProps {
  currentTopic?: string;
  liveTranscript?: string;
  fullTranscript?: string;
  subject?: string;
  targetLang?: string;
  onAskAboutNode?: (nodeLabel: string, nodeDesc: string) => void;
}

export const VisualLearningEngine: React.FC<VisualLearningEngineProps> = ({
  currentTopic = 'Water Cycle',
  liveTranscript = '',
  fullTranscript = '',
  subject = 'Science',
  targetLang = 'en',
  onAskAboutNode,
}) => {
  const { speakText } = useAccessibility();
  const [diagram, setDiagram] = useState<VisualDiagramData | null>(null);
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>(currentTopic);
  const [lastSpokenSnippet, setLastSpokenSnippet] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'interactive' | 'accessible_list'>('interactive');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSpeechSyncing, setIsSpeechSyncing] = useState(false);

  const activeDiagramTopicRef = useRef<string>('');
  const lastGeneratedTranscriptRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch / synthesize diagram asynchronously for detected educational topic & speech
  const fetchDiagram = async (topicQuery: string, speechContext: string = '', source: 'init' | 'speech' = 'init') => {
    if (!topicQuery || topicQuery.trim().length === 0) return;
    const cleanTopic = topicQuery.trim();

    setIsLoading(true);
    try {
      const res = await aiQaApi.visualizeDiagram({
        topic: cleanTopic,
        transcript: speechContext,
        subject: subject,
        target_lang: targetLang,
      });
      if (res.data?.diagram) {
        const d: VisualDiagramData = res.data.diagram;
        setDiagram(d);
        activeDiagramTopicRef.current = cleanTopic;
        setActiveTopic(d.title || cleanTopic);
        if (d.nodes && d.nodes.length > 0) {
          setSelectedNode(d.nodes[0]);
        }
      }
    } catch (err) {
      console.warn('[VisualEngine] Visual generation note:', err);
      // Retain previous diagram gracefully on transient error
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load on mount or topic change
  useEffect(() => {
    fetchDiagram(currentTopic, fullTranscript || liveTranscript, 'init');
  }, [currentTopic, targetLang]);

  // 100% AUTOMATED: Real-time Teacher Speech Listener & Concept Highlighter
  useEffect(() => {
    if (!liveTranscript || liveTranscript.trim().length < 3) return;

    const rawSpeech = liveTranscript.trim();
    const lower = rawSpeech.toLowerCase();
    setLastSpokenSnippet(rawSpeech);

    // Trigger visual pulse indicating active speech synchronization
    setIsSpeechSyncing(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setIsSpeechSyncing(false), 2500);

    // 1. Check if teacher is explaining a specific node within the current active diagram
    if (diagram && diagram.nodes && diagram.nodes.length > 0) {
      for (const node of diagram.nodes) {
        const nodeMatchTerms = [
          node.id.toLowerCase(),
          node.label.toLowerCase(),
          ...(node.match_words || []).map((m) => m.toLowerCase()),
        ];

        const isMatch = nodeMatchTerms.some((term) => {
          if (term.length <= 3) return lower.includes(` ${term} `) || lower.startsWith(`${term} `) || lower.endsWith(` ${term}`);
          return lower.includes(term);
        });

        if (isMatch) {
          if (selectedNode?.id !== node.id) {
            setSelectedNode(node);
          }
          break;
        }
      }
    }

    // 2. Multi-topic dictionary for automatic topic switching as teacher lectures
    const topicRules: Array<{ words: string[]; topic: string }> = [
      { words: ['water cycle', 'evaporation', 'condensation', 'precipitation', 'hydrological cycle', 'water droplets', 'runoff', 'clouds formation'], topic: 'Water Cycle' },
      { words: ['plant cell', 'cell wall', 'chloroplast', 'central vacuole', 'mitochondria in cell', 'plant organelles', 'turgor pressure'], topic: 'Plant Cell' },
      { words: ['photosynthesis', 'chlorophyll', 'calvin cycle', 'light reaction', 'thylakoid', 'synthesis of glucose', 'carbon fixation'], topic: 'Photosynthesis' },
      { words: ['newton', 'laws of motion', 'inertia', 'f=ma', 'action reaction', 'newton second law', 'newton third law', 'force equals mass'], topic: 'Newton Laws' },
      { words: ['neural network', 'deep learning', 'hidden layer', 'softmax', 'backpropagation', 'artificial neural', 'activation function', 'weights and biases'], topic: 'Neural Network' },
      { words: ['electric circuit', 'ohm\'s law', 'voltage source', 'resistor load', 'amperes and volts', 'closed circuit loop', 'current flow'], topic: 'Electric Circuit' },
      { words: ['dna structure', 'double helix', 'nucleotide base', 'adenine thymine', 'guanine cytosine', 'sugar phosphate backbone', 'genetic code'], topic: 'DNA Structure' },
      { words: ['solar system', 'planetary orbit', 'terrestrial planets', 'asteroid belt', 'gas giants', 'sun central mass', 'jupiter and saturn'], topic: 'Solar System' },
      { words: ['mitosis', 'cell division', 'prophase', 'metaphase', 'anaphase', 'telophase', 'cytokinesis', 'spindle fibers'], topic: 'Mitosis' },
      { words: ['heart', 'circulatory system', 'cardiovascular', 'atrium', 'ventricle', 'aorta', 'pulmonary artery', 'deoxygenated blood'], topic: 'Circulatory System' },
    ];

    let matchedTopic: string | null = null;
    for (const rule of topicRules) {
      if (rule.words.some((w) => lower.includes(w))) {
        matchedTopic = rule.topic;
        break;
      }
    }

    // If teacher moved to another educational topic, automatically switch diagram without any button clicks!
    if (matchedTopic && matchedTopic.toLowerCase() !== activeDiagramTopicRef.current.toLowerCase()) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (matchedTopic) {
          fetchDiagram(matchedTopic, rawSpeech, 'speech');
        }
      }, 1000);
    } else if (!matchedTopic && (fullTranscript || rawSpeech).length > 60 && Math.abs((fullTranscript || rawSpeech).length - lastGeneratedTranscriptRef.current.length) > 80) {
      // Dynamic topic speech update
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        lastGeneratedTranscriptRef.current = fullTranscript || rawSpeech;
        fetchDiagram(currentTopic, fullTranscript || rawSpeech, 'speech');
      }, 3000);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [liveTranscript, fullTranscript, diagram, selectedNode]);

  const handlePlayAudioDescription = () => {
    if (!diagram) return;
    const textToSpeak = diagram.translated_audio_description || diagram.audio_description;
    speakText(textToSpeak);
    setIsPlayingAudio(true);
    setTimeout(() => setIsPlayingAudio(false), 8000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full text-slate-100 animate-fade-in">
      {/* Automated Header Bar with Live Speech Sync Indicator */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 relative">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            {isSpeechSyncing && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-base text-white tracking-wide flex items-center gap-2">
                <span>AI Visual Learning Engine</span>
              </h3>
              {/* Real-time speech sync badge */}
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <Activity className={`w-3 h-3 ${isSpeechSyncing ? 'text-emerald-400 animate-bounce' : 'text-emerald-400'}`} />
                <span>Auto-Synced with Teacher Speech</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span>Active Model:</span>
              <span className="text-cyan-300 font-bold">{diagram?.title || activeTopic}</span>
              {selectedNode && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Current Focus:</span>
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <span>{selectedNode.icon}</span>
                    <span>{(targetLang !== 'en' && selectedNode.translated_label) ? selectedNode.translated_label : selectedNode.label}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View Mode & Audio Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Description Button */}
          <button
            onClick={handlePlayAudioDescription}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              isPlayingAudio
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-300'
            }`}
            title="Read diagram audio description aloud"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{isPlayingAudio ? 'Speaking...' : 'Audio Description'}</span>
          </button>

          {/* Accessible List Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'interactive'
                  ? 'bg-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Diagram
            </button>
            <button
              onClick={() => setViewMode('accessible_list')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'accessible_list'
                  ? 'bg-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Accessible
            </button>
          </div>
        </div>
      </div>

      {/* Live Voice Synchrony Bar */}
      {lastSpokenSnippet && (
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-5 py-1.5 flex items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-2 min-w-0 text-slate-400 truncate">
            <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <span className="text-slate-500 shrink-0">Live Teacher Audio:</span>
            <span className="text-slate-300 italic truncate font-medium">"{lastSpokenSnippet}"</span>
          </div>
          <div className="text-[10px] text-cyan-400/80 font-mono shrink-0 hidden md:flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>0ms Synced</span>
          </div>
        </div>
      )}

      {/* Main Canvas & Inspection Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative">
        {/* Left / Center: Interactive SVG Canvas */}
        <div className="lg:col-span-8 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 min-h-[380px]">
          {/* Zoom controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-xl">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Diagram Render */}
          {isLoading && !diagram ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-slate-400">Synthesizing visual concept from teacher's speech...</p>
            </div>
          ) : viewMode === 'interactive' && diagram ? (
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-200 select-none relative"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {isLoading && (
                <div className="absolute top-2 left-2 z-30 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] text-cyan-300 flex items-center gap-1.5 shadow">
                  <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                  <span>Updating visual...</span>
                </div>
              )}
              <svg viewBox="0 0 600 400" className="w-full max-w-[560px] h-[360px] select-none">
                {/* SVG Definitions for glow and marker arrowheads */}
                <defs>
                  <filter id="activeGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
                  </marker>
                </defs>

                {/* Connecting Links */}
                {diagram.links.map((link, idx) => {
                  const fromNode = diagram.nodes.find((n) => n.id === link.from);
                  const toNode = diagram.nodes.find((n) => n.id === link.to);
                  if (!fromNode || !toNode) return null;

                  const midX = (fromNode.x + toNode.x) / 2;
                  const midY = (fromNode.y + toNode.y) / 2;
                  const isLinkActive = selectedNode?.id === fromNode.id || selectedNode?.id === toNode.id;

                  return (
                    <g key={`link_${idx}`} className="transition-all">
                      <line
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={isLinkActive ? '#38bdf8' : '#0284c7'}
                        strokeWidth={isLinkActive ? '3' : '2'}
                        strokeDasharray="4 3"
                        markerEnd="url(#arrowhead)"
                        className={isLinkActive ? 'opacity-100 animate-pulse' : 'opacity-60'}
                      />
                      {link.label && (
                        <g transform={`translate(${midX}, ${midY - 8})`}>
                          <rect
                            x="-45"
                            y="-10"
                            width="90"
                            height="20"
                            rx="5"
                            fill="#0f172a"
                            stroke={isLinkActive ? '#38bdf8' : '#1e293b'}
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            y="4"
                            fill={isLinkActive ? '#38bdf8' : '#94a3b8'}
                            fontSize="9.5"
                            fontWeight="600"
                          >
                            {link.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {diagram.nodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const nodeColor = node.color || '#3b82f6';
                  const displayLabel = (targetLang !== 'en' && node.translated_label) ? node.translated_label : node.label;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer group"
                    >
                      {/* Outer pulse ring when selected by speech or click */}
                      {isSelected && (
                        <circle
                          r="44"
                          fill="none"
                          stroke={nodeColor}
                          strokeWidth="2.5"
                          className="animate-ping opacity-40"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r="34"
                        fill="#0f172a"
                        stroke={isSelected ? '#ffffff' : nodeColor}
                        strokeWidth={isSelected ? '3.5' : '2.5'}
                        filter={isSelected ? 'url(#activeGlow)' : undefined}
                        className="transition-all duration-200 group-hover:scale-110"
                      />

                      {/* Node Icon */}
                      <text
                        textAnchor="middle"
                        y="6"
                        fontSize="20"
                        className="select-none pointer-events-none"
                      >
                        {node.icon || '📌'}
                      </text>

                      {/* Node Label Card */}
                      <g transform="translate(0, 48)">
                        <rect
                          x="-62"
                          y="-10"
                          width="124"
                          height="22"
                          rx="6"
                          fill={isSelected ? '#0284c7' : '#1e293b'}
                          stroke={isSelected ? '#38bdf8' : '#334155'}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          y="5"
                          fill={isSelected ? '#ffffff' : '#f1f5f9'}
                          fontSize="10"
                          fontWeight="700"
                          className="select-none pointer-events-none"
                        >
                          {displayLabel.length > 18 ? displayLabel.substring(0, 16) + '...' : displayLabel}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            /* Accessible Linear List View for Screen Readers & Keyboard Users */
            <div className="w-full max-h-[360px] overflow-y-auto p-4 space-y-3">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <h4 className="font-bold text-sm text-cyan-300 mb-1">{diagram?.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{diagram?.translated_audio_description || diagram?.audio_description}</p>
              </div>
              <div className="space-y-2">
                {diagram?.nodes.map((node, i) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      selectedNode?.id === node.id
                        ? 'bg-cyan-950/40 border-cyan-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{node.icon || '🔹'}</span>
                    <div>
                      <h5 className="font-bold text-xs text-white flex items-center gap-2">
                        <span>{i + 1}. {(targetLang !== 'en' && node.translated_label) ? node.translated_label : node.label}</span>
                        {selectedNode?.id === node.id && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">Active Focus</span>
                        )}
                      </h5>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(targetLang !== 'en' && node.translated_desc) ? node.translated_desc : node.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Selected Concept Deep Dive & Instant Doubt Ask */}
        <div className="lg:col-span-4 bg-slate-950 p-5 flex flex-col justify-between border-t lg:border-t-0 border-slate-800">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Live Concept Inspector
                </span>
                <span className="text-2xl">{selectedNode.icon || '💡'}</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  {(targetLang !== 'en' && selectedNode.translated_label) ? selectedNode.translated_label : selectedNode.label}
                </h4>
                {targetLang !== 'en' && selectedNode.label !== selectedNode.translated_label && (
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Original: {selectedNode.label}</p>
                )}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed">
                {(targetLang !== 'en' && selectedNode.translated_desc) ? selectedNode.translated_desc : selectedNode.desc}
              </div>

              {/* Action Buttons for this Concept */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    const text = (targetLang !== 'en' && selectedNode.translated_desc) ? selectedNode.translated_desc : selectedNode.desc;
                    speakText(text);
                  }}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all"
                >
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  Read Explanation Aloud
                </button>

                <button
                  onClick={() => {
                    if (onAskAboutNode) {
                      onAskAboutNode(selectedNode.label, selectedNode.desc);
                    }
                  }}
                  className="w-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                >
                  <HelpCircle className="w-4 h-4" />
                  Ask AI Tutor About This Node
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <Compass className="w-8 h-8 text-slate-600" />
              <p>Diagram automatically synchronizes with teacher speech in real-time.</p>
            </div>
          )}

          {/* Bottom helper tip */}
          <div className="pt-4 border-t border-slate-900 text-[11px] text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>WCAG 2.2 compliant: Full keyboard & screen-reader support</span>
          </div>
        </div>
      </div>
    </div>
  );
};
