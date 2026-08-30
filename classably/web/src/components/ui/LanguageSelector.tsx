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

type CategoryType = 'all' | 'indian' | 'asian' | 'european' | 'other';

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  className = '',
  size = 'md',
  variant = 'surface',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryType>('all');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedItemRef = useRef<HTMLButtonElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const activeLang = getLanguageByCode(selectedLanguage) || {
    code: selectedLanguage,
    name: selectedLanguage.toUpperCase(),
    nativeName: '',
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to selected language when dropdown is opened
  useEffect(() => {
    if (isOpen && selectedItemRef.current && listContainerRef.current) {
      setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 50);
    }
  }, [isOpen]);

  const filteredLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter((l) => {
      const matchesSearch =
        !search.trim() ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.nativeName && l.nativeName.toLowerCase().includes(search.toLowerCase())) ||
        l.code.toLowerCase().includes(search.toLowerCase()) ||
        (l.region && l.region.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (category === 'all') return true;
      const reg = (l.region || '').toLowerCase();
      if (category === 'indian') return reg.includes('india') || reg.includes('south asia');
      if (category === 'asian') return reg.includes('japan') || reg.includes('korea') || reg.includes('china') || reg.includes('vietnam') || reg.includes('thailand') || reg.includes('asia') || reg.includes('taiwan') || reg.includes('philippines');
      if (category === 'european') return reg.includes('europe') || reg.includes('spain') || reg.includes('france') || reg.includes('germany') || reg.includes('italy') || reg.includes('portugal') || reg.includes('russia') || reg.includes('poland') || reg.includes('ukraine');
      if (category === 'other') return !reg.includes('india') && !reg.includes('asia') && !reg.includes('europe');

      return true;
    });
  }, [search, category]);

  const buttonClasses = {
    surface: 'bg-[#0d131f] hover:bg-[#121a2a] border border-[#1b2538] hover:border-[#25334c] text-slate-200 shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-800/80',
    overlay: 'bg-black/80 hover:bg-black backdrop-blur-md border border-white/20 text-white shadow-xl',
  };

  const categories: { id: CategoryType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'indian', label: 'Indian Regional' },
    { id: 'asian', label: 'Asian' },
    { id: 'european', label: 'European' },
    { id: 'other', label: 'World' },
  ];

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl transition-all duration-150 font-semibold tracking-tight cursor-pointer ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        } ${buttonClasses[variant]}`}
        title={`Current Subtitle Language: ${activeLang.name}`}
      >
        <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[160px] font-bold">
          {activeLang.name} {activeLang.nativeName ? `(${activeLang.nativeName})` : ''}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[95vw] bg-[#0d131f] border border-[#1b2538] rounded-2xl shadow-2xl p-2.5 z-50 animate-fade-in backdrop-blur-xl">
          {/* Header & Search */}
          <div className="space-y-2 pb-2 border-b border-[#1b2538]">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-sky-400" /> Select Subtitle Language
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {SUPPORTED_LANGUAGES.length} Languages
              </span>
            </div>

            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search languages (e.g. Hindi, Telugu, Tamil, Spanish)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#080c14] border border-[#1b2538] focus:border-sky-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    category === cat.id
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Language List */}
          <div ref={listContainerRef} className="max-h-72 overflow-y-auto space-y-1 py-1.5 pr-1">
            {filteredLanguages.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
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
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40 font-bold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded shrink-0 font-bold ${
                        isSelected ? 'bg-sky-500/40 text-sky-100' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {lang.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold truncate">{lang.name}</span>
                          {lang.nativeName && (
                            <span className="text-[11px] text-slate-400 font-normal truncate">
                              • {lang.nativeName}
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
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <span className="text-[9px] uppercase font-mono tracking-widest text-sky-300 font-bold bg-sky-500/20 px-1 py-0.5 rounded">Active</span>
                        <Check className="w-4 h-4 text-sky-400" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
