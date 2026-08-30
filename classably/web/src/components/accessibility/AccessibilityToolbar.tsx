import React, { useState, useRef, useEffect } from 'react';
import { Eye, Volume2, Globe, Type, Sparkles, Check, X } from 'lucide-react';
import { useAccessibility, DisabilityProfile } from '../../context/AccessibilityContext';
import { SUPPORTED_LANGUAGES } from '../../utils/languages';

export const AccessibilityToolbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const {
    activeDisabilities,
    toggleDisability,
    fontSize,
    setFontSize,
    contrastMode,
    setContrastMode,
    targetLanguage,
    setTargetLanguage,
  } = useAccessibility();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const profiles: { id: DisabilityProfile; label: string; desc: string; icon: any }[] = [
    { id: 'visual_impairment', label: 'Visual Impairment', desc: 'High contrast, narrator, large UI', icon: Eye },
    { id: 'low_vision', label: 'Low Vision', desc: 'Zoom & bold elements', icon: Type },
    { id: 'hearing_impairment', label: 'Hearing Impairment', desc: 'Live subtitles & visual indicators', icon: Volume2 },
    { id: 'language_barrier', label: 'Language Barrier', desc: 'Multi-lingual translation', icon: Globe },
    { id: 'motor_disability', label: 'Motor Disability', desc: 'Voice commands & simple targets', icon: Sparkles },
  ];

  return (
    <div className="relative" ref={toolbarRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0d131f] border border-[#1b2538] hover:border-sky-500/40 text-sky-300 hover:text-sky-200 text-xs font-semibold tracking-tight transition-all duration-150 shadow-sm"
        title="Accessibility Adaptations Menu"
        aria-label="Toggle Accessibility Menu"
      >
        <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="hidden sm:inline">Accessibility</span>
        {(activeDisabilities || []).length > 0 && (
          <span className="bg-sky-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {(activeDisabilities || []).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0d131f] border border-[#1b2538] rounded-2xl shadow-2xl p-4 z-50 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[#1b2538]">
            <h3 className="font-bold text-slate-100 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" /> Adaptive Accessibility Settings
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Disability Profiles</p>
            {profiles.map((p) => {
              const Icon = p.icon;
              const isActive = activeDisabilities.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleDisability(p.id)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all duration-150 ${
                    isActive
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
                      : 'bg-[#080c14] border-[#151d2c] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-100 truncate">{p.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{p.desc}</div>
                    </div>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Quick Font & Contrast Toggles */}
          <div className="mt-4 pt-3 border-t border-[#1b2538] space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                Font Scaling
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['normal', 'large', 'extra-large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`py-1 rounded-lg text-xs font-semibold border capitalize transition-all duration-150 ${
                      fontSize === size
                        ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                        : 'bg-[#080c14] border-[#151d2c] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {size.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                High Contrast Theme
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { mode: 'none', label: 'Default' },
                  { mode: 'yellow-on-black', label: 'Black & Gold' },
                  { mode: 'black-on-white', label: 'High Light' },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => setContrastMode(item.mode as any)}
                    className={`py-1 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                      contrastMode === item.mode
                        ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                        : 'bg-[#080c14] border-[#151d2c] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Translation Language */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                Primary Language Translation
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full bg-[#080c14] border border-[#1b2538] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} {l.nativeName ? `(${l.nativeName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
