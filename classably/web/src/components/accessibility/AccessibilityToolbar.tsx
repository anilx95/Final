import React, { useState } from 'react';
import { Eye, Volume2, Globe, Type, Contrast, Sparkles, Check } from 'lucide-react';
import { useAccessibility, DisabilityProfile } from '../../context/AccessibilityContext';
import { SUPPORTED_LANGUAGES } from '../../utils/languages';

export const AccessibilityToolbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    activeDisabilities,
    toggleDisability,
    fontSize,
    setFontSize,
    contrastMode,
    setContrastMode,
    targetLanguage,
    setTargetLanguage,
    ttsEnabled,
    setTtsEnabled,
  } = useAccessibility();

  const profiles: { id: DisabilityProfile; label: string; desc: string; icon: any }[] = [
    { id: 'visual_impairment', label: 'Visual Impairment', desc: 'High contrast, narrator, large UI', icon: Eye },
    { id: 'low_vision', label: 'Low Vision', desc: 'Zoom & bold elements', icon: Type },
    { id: 'hearing_impairment', label: 'Hearing Impairment', desc: 'Live subtitles & visual indicators', icon: Volume2 },
    { id: 'language_barrier', label: 'Language Barrier', desc: 'Multi-lingual translation', icon: Globe },
    { id: 'motor_disability', label: 'Motor Disability', desc: 'Voice commands & simple targets', icon: Sparkles },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 text-xs font-semibold transition-all"
        title="Accessibility Adaptations Menu"
        aria-label="Toggle Accessibility Menu"
      >
        <Sparkles className="w-4 h-4 text-sky-400" />
        <span className="hidden sm:inline">Accessibility Hub</span>
        {(activeDisabilities || []).length > 0 && (
          <span className="bg-sky-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {(activeDisabilities || []).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" /> Adaptive Accessibility Settings
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Disability Adaptations</p>
            {profiles.map((p) => {
              const Icon = p.icon;
              const isActive = activeDisabilities.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleDisability(p.id)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{p.label}</div>
                      <div className="text-[10px] text-slate-400">{p.desc}</div>
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-sky-400" />}
                </button>
              );
            })}
          </div>

          {/* Quick Font & Contrast Toggles */}
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Font Sizing
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['normal', 'large', 'extra-large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`py-1 rounded-lg text-xs font-medium border capitalize transition-all ${
                      fontSize === size
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {size.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
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
                    className={`py-1 rounded-lg text-[11px] font-medium border transition-all ${
                      contrastMode === item.mode
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Translation Language */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Primary Language Translation
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
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
