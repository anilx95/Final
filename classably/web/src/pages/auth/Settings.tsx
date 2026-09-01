import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Moon, Sliders } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const Settings: React.FC = () => {
  const { addToast } = useToast();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [autoSubtitles, setAutoSubtitles] = useState(true);
  const [darkTheme, setDarkTheme] = useState(false);

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'Settings Saved',
      description: 'System preferences updated successfully.',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
          Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure application behavior, notification channels, and accessibility defaults
        </p>
      </div>

      <div className="space-y-4">
        <Card variant="default" className="space-y-4 p-5 sm:p-6">
          <h3 className="font-bold text-[#111827] text-base border-b border-slate-100 pb-3 flex items-center gap-2 tracking-tight">
            <Bell className="w-4 h-4 text-[#1d3bb5]" /> Notification Controls
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900">Email Alerts</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Receive class schedule updates and assignment due date alerts</div>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={() => setEmailNotifs(!emailNotifs)}
              className="w-4 h-4 rounded text-[#1d3bb5] border-slate-300 focus:ring-[#1d3bb5] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              <div className="text-xs font-semibold text-slate-900">Auto Live Subtitles</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Automatically open subtitles bar upon entering a live studio</div>
            </div>
            <input
              type="checkbox"
              checked={autoSubtitles}
              onChange={() => setAutoSubtitles(!autoSubtitles)}
              className="w-4 h-4 rounded text-[#1d3bb5] border-slate-300 focus:ring-[#1d3bb5] cursor-pointer"
            />
          </div>
        </Card>

        <Card variant="default" className="space-y-4 p-5 sm:p-6">
          <h3 className="font-bold text-[#111827] text-base border-b border-slate-100 pb-3 flex items-center gap-2 tracking-tight">
            <Moon className="w-4 h-4 text-[#1d3bb5]" /> Interface & Theme
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900">Dark Interface</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Optional dark theme preference for low-light environments</div>
            </div>
            <input
              type="checkbox"
              checked={darkTheme}
              onChange={() => setDarkTheme(!darkTheme)}
              className="w-4 h-4 rounded text-[#1d3bb5] border-slate-300 focus:ring-[#1d3bb5] cursor-pointer"
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

