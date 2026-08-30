import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Globe, ChevronDown, Check, Search, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageByCode, SupportedLanguage } from '../../utils/languages';

export interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (langCode: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  variant?: 'surface' | 'ghost' | 'overlay';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  className = '',
  size = 'md',
  variant = 'surface',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedItemRef = useRef<HTMLButtonElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const activeLang = getLanguageByCode(selectedLanguage) || {
    code: selectedLanguage,
    name: selectedLanguage.toUpperCase(),
    nativeName: '',
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto-scroll to selected language when modal opens
  useEffect(() => {
    if (isOpen && selectedItemRef.current && listContainerRef.current) {
      setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 50);
    }
  }, [isOpen]);

  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return SUPPORTED_LANGUAGES;
    const q = search.toLowerCase().trim();
    return SUPPORTED_LANGUAGES.filter((l) => {
      return (
        l.name.toLowerCase().includes(q) ||
        (l.nativeName && l.nativeName.toLowerCase().includes(q)) ||
        l.code.toLowerCase().includes(q) ||
        (l.region && l.region.toLowerCase().includes(q))
      );
    });
  }, [search]);

  const buttonClasses = {
    surface: 'bg-[#0d131f] hover:bg-[#121a2a] border border-[#1b2538] hover:border-[#25334c] text-slate-200 shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-800/80',
    overlay: 'bg-black/80 hover:bg-black backdrop-blur-md border border-white/20 text-white shadow-xl',
  };

  return (
    <div className={`inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-xl transition-all duration-150 font-semibold tracking-tight cursor-pointer ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        } ${buttonClasses[variant]}`}
        title={`Subtitle Language: ${activeLang.name} (${activeLang.nativeName || activeLang.code})`}
      >
        <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="truncate max-w-[100px] xs:max-w-[130px] sm:max-w-[160px] font-bold">
          {activeLang.name} {activeLang.nativeName ? `(${activeLang.nativeName})` : ''}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Select Subtitle Language"
        >
          <div
            className="w-full max-w-sm sm:max-w-md bg-[#0d131f] border border-[#1b2538] rounded-2xl shadow-2xl p-4 flex flex-col max-h-[85vh] z-50 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2538]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm tracking-tight">Select Subtitle Language</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{SUPPORTED_LANGUAGES.length} Supported Languages</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="py-2.5">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search or scroll languages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#080c14] border border-[#1b2538] focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Vertically Scrollable Language List */}
            <div
              ref={listContainerRef}
              className="flex-1 overflow-y-auto space-y-1 py-1 pr-1 max-h-[50vh] sm:max-h-[55vh] min-h-[160px]"
            >
              {filteredLanguages.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No matching language found for &quot;{search}&quot;
                </div>
              ) : (
                filteredLanguages.map((lang: SupportedLanguage) => {
                  const isSelected = selectedLanguage.toLowerCase() === lang.code.toLowerCase();
                  return (
                    <button
                      key={lang.code}
                      ref={isSelected ? selectedItemRef : null}
                      type="button"
                      onClick={() => {
                        onLanguageChange(lang.code);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-sky-500/20 text-sky-200 border border-sky-500/50 font-bold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded shrink-0 font-bold ${
                            isSelected ? 'bg-sky-500/40 text-sky-100' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {lang.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold truncate">{lang.name}</span>
                            {lang.nativeName && (
                              <span className="text-[11px] text-slate-400 font-normal truncate">
                                ({lang.nativeName})
                              </span>
                            )}
                          </div>
                          {lang.region && (
                            <div className="text-[10px] text-slate-400 truncate">
                              {lang.region}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          <span className="text-[9px] uppercase font-mono tracking-widest text-sky-300 font-bold bg-sky-500/20 px-1.5 py-0.5 rounded border border-sky-500/30">
                            Active
                          </span>
                          <Check className="w-4 h-4 text-sky-400" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
