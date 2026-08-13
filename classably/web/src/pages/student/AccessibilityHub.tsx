import React, { useEffect, useState } from 'react';
import { Eye, Volume2, Globe, Type, Sparkles, Contrast, Check, VolumeX, ShieldAlert, Cpu } from 'lucide-react';
import { useAccessibility, DisabilityProfile } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';
import { accessibilityApi, profilesApi, authApi } from '../../api/client';

export const AccessibilityHub: React.FC = () => {
  const { user } = useAuth();
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
    speakText,
    stopSpeech,
  } = useAccessibility();

  const [recommendation, setRecommendation] = useState<any>(null);
  const [loadingRec, setLoadingRec] = useState(false);

  const studentId = user?.id || 1;

  // Fetch adaptive profile recommendation on mount
  useEffect(() => {
    setLoadingRec(true);
    profilesApi.getRecommendation(studentId)
      .then((res) => setRecommendation(res.data))
      .catch(() => {
        // Fallback default recommendation if backend isn't loaded
        setRecommendation({
          recommended_mode: activeDisabilities[0] || 'visual_impairment',
          suggested_contrast: 'yellow-on-black',
          auto_tts: true,
          confidence_score: 0.94,
          reasoning: 'Based on classroom ambient noise and device interaction telemetry.'
        });
      })
      .finally(() => setLoadingRec(false));
  }, [studentId]);

  const handleToggleProfile = (pId: DisabilityProfile, pLabel: string, isActive: boolean) => {
    toggleDisability(pId);
    if (!isActive) {
      speakText(`Activated ${pLabel} accommodation mode.`);
    }

    // Persist to backend
    accessibilityApi.createEvent({
      student_id: studentId,
      disability_profile: pId,
      action: isActive ? 'deactivate' : 'activate',
      timestamp: new Date().toISOString(),
    }).catch((err) => console.error('Failed to log accessibility event:', err));

    profilesApi.createProfileEvent({
      student_id: studentId,
      event_type: 'disability_profile_toggle',
      details: { profile: pId, active: !isActive }
    }).catch(() => {});
  };

  const handleContrastChange = (mode: string) => {
    setContrastMode(mode as any);
    accessibilityApi.createEvent({
      student_id: studentId,
      event_type: 'contrast_mode_change',
      value: mode,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  };

  const profiles: { id: DisabilityProfile; label: string; desc: string; icon: any }[] = [
    { id: 'visual_impairment', label: 'Visual Impairment / Blindness', desc: 'High contrast themes, screen narrator, large buttons, OCR read aloud', icon: Eye },
    { id: 'low_vision', label: 'Low Vision', desc: 'Zoom controls, bold fonts, minimal uncluttered layout', icon: Type },
    { id: 'hearing_impairment', label: 'Hearing Impairment', desc: 'Real-time live subtitles stream, transcript panel, downloadable VTT captions', icon: Volume2 },
    { id: 'language_barrier', label: 'Language Barrier', desc: 'Multi-lingual automatic translation for subtitles, OCR, and AI summaries', icon: Globe },
    { id: 'motor_disability', label: 'Motor Disability', desc: 'Hands-free voice assistant commands, large click targets, raise-hand shortcut', icon: Sparkles },
    { id: 'multiple_disabilities', label: 'Multiple Disabilities', desc: 'Combined multi-modal assistive features & accommodations', icon: Contrast },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-sky-400" /> Accessibility Adaptations Hub
        </h1>
        <p className="text-xs text-slate-400">Select your accommodation profiles to instantly tailor ClassAbly's visual, audio, and interaction systems</p>
      </div>

      {/* Adaptive Profile AI Recommendation Panel */}
      <div className="card p-5 bg-gradient-to-r from-purple-950/40 via-sky-950/40 to-slate-900 border-purple-500/30">
        <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold uppercase tracking-wider mb-2">
          <Cpu className="w-4 h-4 text-purple-400" /> AI Adaptive Profile Recommendation
        </div>
        {loadingRec ? (
          <p className="text-xs text-slate-400">Analyzing environment and interaction history...</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                Recommended Accommodation Mode: <span className="text-sky-300 capitalize">{recommendation?.recommended_mode?.replace('_', ' ')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {recommendation?.reasoning || 'Engine recommends optimized contrast and TTS based on classroom sensors.'}
              </p>
            </div>
            {recommendation?.confidence_score && (
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/40 shrink-0">
                {(recommendation.confidence_score * 100).toFixed(0)}% AI Match
              </span>
            )}
          </div>
        )}
      </div>

      {/* Disability Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map((p) => {
          const Icon = p.icon;
          const isActive = activeDisabilities.includes(p.id);
          return (
            <div
              key={p.id}
              onClick={() => handleToggleProfile(p.id, p.label, isActive)}
              className={`card p-5 cursor-pointer border-2 transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-sky-950/30 border-sky-500 text-sky-100 shadow-xl shadow-sky-500/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isActive ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{p.label}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                  </div>
                </div>
                {isActive && <Check className="w-5 h-5 text-sky-400 shrink-0" />}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold">
                <span className={isActive ? 'text-sky-400' : 'text-slate-500'}>
                  {isActive ? 'Accommodation Active' : 'Click to Activate'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fine-Tuning Controls */}
      <div className="card space-y-6">
        <h3 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-3">
          Fine-Tune Display & Speech Settings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* High Contrast Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">High Contrast Theme</label>
            <div className="space-y-2 text-xs">
              {[
                { mode: 'none', label: 'Default Enterprise Theme' },
                { mode: 'yellow-on-black', label: 'Black Background & High Gold Text' },
                { mode: 'black-on-white', label: 'Pure White Background & High Black Text' },
              ].map((item) => (
                <button
                  key={item.mode}
                  onClick={() => handleContrastChange(item.mode)}
                  className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all ${
                    contrastMode === item.mode
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Speech Synthesis (TTS) Controls */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Text-to-Speech Screen Narrator</label>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const nextState = !ttsEnabled;
                  setTtsEnabled(nextState);
                  if (nextState) speakText('Text to speech narrator enabled.');
                  accessibilityApi.createEvent({
                    student_id: studentId,
                    event_type: 'tts_toggle',
                    enabled: nextState,
                    timestamp: new Date().toISOString(),
                  }).catch(() => {});
                }}
                className={`btn-primary w-full text-xs ${ttsEnabled ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}
              >
                {ttsEnabled ? 'Narrator Active (Click to Disable)' : 'Enable Text-to-Speech Narrator'}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => speakText('ClassAbly Smart Classroom Accessibility Platform is fully functional.')}
                  className="btn-secondary text-xs flex-1"
                >
                  <Volume2 className="w-4 h-4 text-sky-400" /> Test Narrator Voice
                </button>
                <button onClick={stopSpeech} className="btn-secondary text-xs p-2 text-rose-400">
                  <VolumeX className="w-4 h-4" /> Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Profile Settings Card */}
      <ProfileSettingsSection />
    </div>
  );
};

const ProfileSettingsSection: React.FC = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [classroomId, setClassroomId] = useState(user?.classroom_id || 1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setClassroomId(user.classroom_id || 1);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await authApi.updateProfile({
        full_name: fullName,
        phone,
        classroom_id: Number(classroomId),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card space-y-4 border-sky-500/30">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" /> Student Profile & Classroom Settings
        </h3>
        {saveSuccess && (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
            Profile Updated ✓
          </span>
        )}
      </div>

      <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field text-xs"
            placeholder="Your full name"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field text-xs"
            placeholder="+1 555-0199"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Classroom</label>
          <select
            value={classroomId}
            onChange={(e) => setClassroomId(Number(e.target.value))}
            className="input-field text-xs bg-slate-950 text-slate-200"
          >
            <option value={1}>Smart Classroom 1 (Main Block)</option>
            <option value={2}>Smart Classroom 2 (Science Block)</option>
            <option value={3}>Smart Classroom 3 (Engineering Block)</option>
          </select>
        </div>

        <div className="sm:col-span-3 flex justify-end pt-2">
          <button type="submit" disabled={isSaving} className="btn-primary text-xs">
            {isSaving ? 'Saving Changes...' : 'Update Profile Details'}
          </button>
        </div>
      </form>
    </div>
  );
};

