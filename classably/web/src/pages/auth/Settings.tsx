import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Moon, Sliders } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

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
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
          <SettingsIcon className="w-5 h-5 text-sky-400" /> Platform Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">Configure application behavior, notification channels, and accessibility defaults</p>
      </div>

      <div className="space-y-4">
        <Card variant="default" className="space-y-4 p-6">
          <h3 className="font-bold text-slate-100 text-sm border-b border-[#1b2538] pb-3 flex items-center gap-2 tracking-tight">
            <Bell className="w-4 h-4 text-sky-400" /> Notification Controls
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Email Alerts</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Receive class schedule updates and assignment due date alerts</div>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={() => setEmailNotifs(!emailNotifs)}
              className="w-4 h-4 rounded text-sky-500 bg-[#080c14] border-[#1b2538] focus:ring-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#1b2538]">
            <div>
              <div className="text-xs font-semibold text-slate-200">Auto Live Subtitles</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Automatically open subtitles bar upon entering a live studio</div>
            </div>
            <input
              type="checkbox"
              checked={autoSubtitles}
              onChange={() => setAutoSubtitles(!autoSubtitles)}
              className="w-4 h-4 rounded text-sky-500 bg-[#080c14] border-[#1b2538] focus:ring-0 cursor-pointer"
            />
          </div>
        </Card>

        <Card variant="default" className="space-y-4 p-6">
          <h3 className="font-bold text-slate-100 text-sm border-b border-[#1b2538] pb-3 flex items-center gap-2 tracking-tight">
            <Moon className="w-4 h-4 text-indigo-400" /> Interface & Theme
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Dark Interface</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Default high-contrast dark theme for optimal legibility and reading comfort</div>
            </div>
            <input
              type="checkbox"
              checked={darkTheme}
              onChange={() => setDarkTheme(!darkTheme)}
              className="w-4 h-4 rounded text-sky-500 bg-[#080c14] border-[#1b2538] focus:ring-0 cursor-pointer"
            />
          </div>
        </Card>

        <Button onClick={handleSave} variant="primary" size="md">
          Save Settings
        </Button>
      </div>
    </div>
  );
};
