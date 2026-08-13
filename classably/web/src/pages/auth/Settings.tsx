import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Moon, Shield, Sliders, Volume2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Settings: React.FC = () => {
  const { addToast } = useToast();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [autoSubtitles, setAutoSubtitles] = useState(true);
  const [darkTheme, setDarkTheme] = useState(true);

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'Settings Saved',
      description: 'System preferences updated successfully.',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-sky-400" /> Platform Settings
        </h1>
        <p className="text-xs text-slate-400">Configure application behavior, notification channels, and accessibility defaults</p>
      </div>

      <div className="space-y-4">
        <div className="card space-y-4">
          <h3 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-400" /> Notification Controls
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Email Alerts</div>
              <div className="text-[11px] text-slate-400">Receive class schedule updates and assignment due date alerts</div>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={() => setEmailNotifs(!emailNotifs)}
              className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-800 focus:ring-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
            <div>
              <div className="text-xs font-semibold text-slate-200">Auto Live Subtitles</div>
              <div className="text-[11px] text-slate-400">Automatically open subtitles bar upon entering a live studio</div>
            </div>
            <input
              type="checkbox"
              checked={autoSubtitles}
              onChange={() => setAutoSubtitles(!autoSubtitles)}
              className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-800 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
            <Moon className="w-4 h-4 text-purple-400" /> Interface & Dark Mode
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Enterprise Dark Mode</div>
              <div className="text-[11px] text-slate-400">Default sleek high-contrast dark theme for long reading comfort</div>
            </div>
            <input
              type="checkbox"
              checked={darkTheme}
              onChange={() => setDarkTheme(!darkTheme)}
              className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-800 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary">
          Save Settings
        </button>
      </div>
    </div>
  );
};
