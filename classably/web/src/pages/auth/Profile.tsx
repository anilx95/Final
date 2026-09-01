import React, { useState } from 'react';
import { User as UserIcon, Mail, Phone, Sparkles, Save, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

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
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
          User Profile & Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your account details and adaptive accessibility preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <Card variant="default" className="text-center flex flex-col items-center justify-center p-6 space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#eef4ff] border-2 border-[#dbeafe] flex items-center justify-center text-[#1d3bb5] font-black text-2xl shadow-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-bold text-[#111827] text-base sm:text-lg tracking-tight">{user?.full_name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
          </div>

          <Badge variant={user?.role === 'teacher' ? 'brand' : user?.role === 'admin' ? 'ai' : 'brand'} size="md">
            {user?.role?.toUpperCase()} ACCOUNT
          </Badge>
        </Card>

        {/* Profile Form */}
        <div className="md:col-span-2">
          <Card variant="default" className="p-6">
            <form onSubmit={handleSave} className="space-y-4">
              <h3 className="font-bold text-[#111827] text-base border-b border-slate-100 pb-3 flex items-center gap-2 tracking-tight">
                <UserIcon className="w-4 h-4 text-[#1d3bb5]" /> General Details
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1d3bb5] focus:ring-2 focus:ring-[#1d3bb5]/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email (Read Only)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1d3bb5] focus:ring-2 focus:ring-[#1d3bb5]/20 outline-none"
                  />
                </div>
              </div>

              {user?.role === 'student' && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="font-bold text-[#111827] text-base flex items-center gap-2 tracking-tight">
                    <Sparkles className="w-4 h-4 text-[#1d3bb5]" /> Disability Profile & Preferences
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Selected Accommodations</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'visual_impairment', label: 'Visual Impairment' },
                        { id: 'hearing_impairment', label: 'Hearing Impairment' },
                        { id: 'language_barrier', label: 'Language Barrier' },
                      ].map((d) => (
                        <button
                          type="button"
                          key={d.id}
                          onClick={() => handleDisabilityToggle(d.id)}
                          className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all duration-150 cursor-pointer ${
                            disabilityProfiles.includes(d.id)
                              ? 'bg-[#eff4ff] border-[#dbeafe] text-[#1d3bb5] font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{d.label}</span>
                          {disabilityProfiles.includes(d.id) && <Check className="w-4 h-4 text-[#1d3bb5]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Preferred Audio/Text Language</label>
                    <select
                      value={preferredLang}
                      onChange={(e) => setPreferredLang(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-[#1d3bb5] focus:ring-2 focus:ring-[#1d3bb5]/20 outline-none"
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

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  isLoading={isSaving}
                  variant="primary"
                  size="md"
                  className="w-full"
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

