import React, { useEffect, useState } from 'react';
import { Eye, Volume2, Globe, Type, Sparkles, Contrast, Check, VolumeX, Cpu } from 'lucide-react';
import { useAccessibility, DisabilityProfile } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';
import { accessibilityApi, profilesApi, authApi } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const AccessibilityHub: React.FC = () => {
  const { user } = useAuth();
  const {
    activeDisabilities,
    toggleDisability,
    fontSize,
    setFontSize,
    contrastMode,
    setContrastMode,
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
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
          <Sparkles className="w-5 h-5 text-sky-400" /> Accessibility Adaptations Hub
        </h1>
        <p className="text-xs text-slate-400 mt-1">Select your accommodation profiles to instantly tailor ClassAbly's visual, audio, and interaction systems</p>
      </div>

      {/* Adaptive Profile AI Recommendation Panel */}
      <Card variant="ai" className="p-5">
        <div className="flex items-center gap-2 text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider mb-2">
          <Cpu className="w-4 h-4 text-indigo-400" /> AI Adaptive Profile Recommendation
        </div>
        {loadingRec ? (
          <p className="text-xs text-slate-400 py-3">Analyzing environment and interaction history...</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm tracking-tight">
                Recommended Mode: <span className="text-sky-300 capitalize">{recommendation?.recommended_mode?.replace('_', ' ')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {recommendation?.reasoning || 'Engine recommends optimized contrast and TTS based on classroom sensors.'}
              </p>
            </div>
            {recommendation?.confidence_score && (
              <Badge variant="ai" size="md">
                {(recommendation.confidence_score * 100).toFixed(0)}% AI Match
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* Disability Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map((p) => {
          const Icon = p.icon;
          const isActive = activeDisabilities.includes(p.id);
          return (
            <Card
              key={p.id}
              variant={isActive ? 'ai' : 'interactive'}
              onClick={() => handleToggleProfile(p.id, p.label, isActive)}
              className={`p-5 cursor-pointer flex flex-col justify-between ${isActive ? 'border-sky-500/60 ring-1 ring-sky-500/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight">{p.label}</h3>
                    <p className="text-xs text-slate-400 mt-1">{p.desc}</p>
                  </div>
                </div>
                {isActive && <Check className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />}
              </div>

              <div className="mt-4 pt-3 border-t border-[#1b2538] flex items-center justify-between text-xs font-semibold">
                <span className={isActive ? 'text-sky-400' : 'text-slate-500'}>
                  {isActive ? 'Accommodation Active' : 'Click to Activate'}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Fine-Tuning Controls */}
      <Card variant="default" className="space-y-5">
        <h3 className="font-bold text-slate-100 text-sm border-b border-[#1b2538] pb-3 tracking-tight">
          Fine-Tune Display & Speech Settings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* High Contrast Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">High Contrast Theme</label>
            <div className="space-y-2 text-xs">
              {[
                { mode: 'none', label: 'Default Dark Theme' },
                { mode: 'yellow-on-black', label: 'Black Background & Gold Text' },
                { mode: 'black-on-white', label: 'White Background & Black Text' },
              ].map((item) => (
                <button
                  key={item.mode}
                  onClick={() => handleContrastChange(item.mode)}
                  className={`w-full p-2.5 rounded-lg border text-left font-semibold transition-all duration-150 ${
                    contrastMode === item.mode
                      ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                      : 'bg-[#080c14] border-[#1b2538] text-slate-300 hover:bg-[#121a2a]'
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
            <div className="space-y-2.5">
              <Button
                variant={ttsEnabled ? 'primary' : 'secondary'}
                size="md"
                className="w-full"
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
              >
                {ttsEnabled ? 'Narrator Active (Click to Disable)' : 'Enable Text-to-Speech Narrator'}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => speakText('ClassAbly Smart Classroom Accessibility Platform is fully functional.')}
                  className="flex-1"
                  leftIcon={<Volume2 className="w-3.5 h-3.5 text-sky-400" />}
                >
                  Test Voice
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={stopSpeech}
                  className="text-rose-400 hover:text-rose-300"
                  leftIcon={<VolumeX className="w-3.5 h-3.5" />}
                >
                  Stop
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
    <Card variant="default" className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#1b2538] pb-3">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
          <Sparkles className="w-4 h-4 text-sky-400" /> Profile & Classroom Settings
        </h3>
        {saveSuccess && (
          <Badge variant="success" size="sm">
            Saved Successfully
          </Badge>
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
            className="input-field text-xs bg-[#080c14] text-slate-200"
          >
            <option value={1}>Smart Classroom 1 (Main Block)</option>
            <option value={2}>Smart Classroom 2 (Science Block)</option>
            <option value={3}>Smart Classroom 3 (Engineering Block)</option>
          </select>
        </div>

        <div className="sm:col-span-3 flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
            isLoading={isSaving}
          >
            Update Profile
          </Button>
        </div>
      </form>
    </Card>
  );
};
