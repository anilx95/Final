import React, { useState } from 'react';
import { User as UserIcon, Mail, Phone, Shield, Sparkles, Save, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../api/client';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [disabilityProfiles, setDisabilityProfiles] = useState<string[]>(
    user?.student?.disability_profiles || []
  );
  const [preferredLang, setPreferredLang] = useState(user?.student?.preferred_language || 'en');
  const [isSaving, setIsSaving] = useState(false);

  const handleDisabilityToggle = (profile: string) => {
    setDisabilityProfiles((prev) =>
      prev.includes(profile) ? prev.filter((p) => p !== profile) : [...prev, profile]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await authApi.updateProfile({
        full_name: fullName,
        phone,
        disability_profiles: disabilityProfiles,
        preferred_language: preferredLang,
      });

      updateUser(res.data);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        description: 'Your user profile and accessibility preferences were saved successfully.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: err.response?.data?.detail || 'Failed to update profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">User Profile</h1>
        <p className="text-xs text-slate-400">Manage your account details and adaptive accessibility preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <div className="card text-center flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 border-2 border-sky-400 flex items-center justify-center text-white font-extrabold text-3xl shadow-xl shadow-sky-500/20 mb-3">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <h3 className="font-bold text-slate-100 text-lg">{user?.full_name}</h3>
          <p className="text-xs text-slate-400 mb-3">{user?.email}</p>

          <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs font-bold uppercase tracking-wider">
            {user?.role} Account
          </span>
        </div>

        {/* Profile Form */}
        <div className="md:col-span-2 card">
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-sky-400" /> General Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email (Read Only)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="input-field opacity-60 bg-slate-950 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {user?.role === 'student' && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" /> Disability Profile & Preferences
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Selected Accommodations</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'visual_impairment', label: 'Visual Impairment' },
                      { id: 'hearing_impairment', label: 'Hearing Impairment' },
                      { id: 'language_barrier', label: 'Language Barrier' },
                      { id: 'motor_disability', label: 'Motor Disability' },
                    ].map((d) => (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => handleDisabilityToggle(d.id)}
                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                          disabilityProfiles.includes(d.id)
                            ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-semibold'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>{d.label}</span>
                        {disabilityProfiles.includes(d.id) && <Check className="w-4 h-4 text-sky-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Preferred Audio/Text Language</label>
                  <select
                    value={preferredLang}
                    onChange={(e) => setPreferredLang(e.target.value)}
                    className="input-field"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="fr">French (Français)</option>
                    <option value="de">German (Deutsch)</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                    <option value="zh">Chinese (中文)</option>
                    <option value="ar">Arabic (العربية)</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" disabled={isSaving} className="btn-primary w-full mt-4">
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile Changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
