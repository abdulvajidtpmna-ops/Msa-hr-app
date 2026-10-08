import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle2, Clock, MapPin, Sparkles, Building2, FileText } from 'lucide-react';
import { api } from '../../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get<{ success: boolean; settings: Record<string, string> }>('/settings');
        if (res.success) setSettings(res.settings);
      } catch (e) {}
      finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedMsg(false);

    try {
      const res = await api.post('/settings', settings);
      if (res.success) {
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-brand-600" /> Academy & HR Settings
          </h2>
          <p className="text-xs text-slate-500">Configure office timings, GPS geofencing, scoring thresholds, and templates</p>
        </div>

        {savedMsg && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settings Saved!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Company Profile */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b pb-3 border-slate-100">
            <Building2 className="w-4 h-4 text-brand-600" /> Institute Profile Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company / Academy Name</label>
              <input
                type="text"
                value={settings.company_name || 'Mastered Skill Academy'}
                onChange={e => handleChange('company_name', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Address / Location</label>
              <input
                type="text"
                value={settings.company_address || 'Kerala, India'}
                onChange={e => handleChange('company_address', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official HR Email</label>
              <input
                type="email"
                value={settings.company_email || 'hr@masteredskill.com'}
                onChange={e => handleChange('company_email', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Phone</label>
              <input
                type="text"
                value={settings.company_phone || '+91 98765 43210'}
                onChange={e => handleChange('company_phone', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Attendance, Timings & Geofence */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b pb-3 border-slate-100">
            <Clock className="w-4 h-4 text-brand-600" /> Attendance Timings & Geofencing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Start Time</label>
              <input
                type="time"
                value={settings.office_start_time || '09:30'}
                onChange={e => handleChange('office_start_time', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Office End Time</label>
              <input
                type="time"
                value={settings.office_end_time || '18:00'}
                onChange={e => handleChange('office_end_time', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                value={settings.grace_minutes || '15'}
                onChange={e => handleChange('grace_minutes', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Latitude</label>
              <input
                type="number"
                step="any"
                value={settings.office_lat || '10.0159'}
                onChange={e => handleChange('office_lat', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Longitude</label>
              <input
                type="number"
                step="any"
                value={settings.office_lng || '76.3419'}
                onChange={e => handleChange('office_lng', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Geofence Radius (Meters)</label>
              <input
                type="number"
                value={settings.geofence_radius || '200'}
                onChange={e => handleChange('geofence_radius', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Offer Letter Template */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b pb-3 border-slate-100">
            <FileText className="w-4 h-4 text-brand-600" /> Default Offer Letter Text
          </h3>

          <div>
            <textarea
              rows={4}
              value={settings.offer_letter_template || ''}
              onChange={e => handleChange('offer_letter_template', e.target.value)}
              placeholder="Default terms of employment shown in generated offer letter PDFs..."
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs leading-relaxed"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-600/30 transition flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Configuration Changes'}
        </button>
      </form>
    </div>
  );
};
