import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Shield, FileText, Upload, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Employee, EmployeeDoc } from '../../types';
import { Modal } from '../../components/common/Modal';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit fields
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Document upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docType, setDocType] = useState('aadhaar');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchProfile = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; employee: Employee }>(`/employees/${user.employee_id}`);
      if (res.success && res.employee) {
        setProfile(res.employee);
        setPhone(res.employee.phone || '');
        setAddress(res.employee.address || '');
        setEmergencyName(res.employee.emergency_name || '');
        setEmergencyPhone(res.employee.emergency_phone || '');
        setEmergencyRelation(res.employee.emergency_relation || '');
      }
    } catch (e) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await api.put(`/employees/${profile.id}`, {
        phone,
        address,
        emergency_name: emergencyName,
        emergency_phone: emergencyPhone,
        emergency_relation: emergencyRelation
      });
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !docFile) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('doc_type', docType);
      formData.append('file', docFile);

      const res = await api.post(`/employees/${profile.id}/documents`, formData);
      if (res.success) {
        setShowUploadModal(false);
        setDocFile(null);
        fetchProfile();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-brand-700 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-brand-700/20 flex-shrink-0">
          {profile?.full_name?.charAt(0) || 'U'}
        </div>

        <div className="text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{profile?.full_name || user?.name}</h2>
              <p className="text-xs text-brand-700 font-bold uppercase mt-0.5">
                {profile?.designation} • {profile?.department}
              </p>
            </div>
            <span className="px-3 py-1 bg-brand-50 text-brand-800 rounded-full text-xs font-bold border border-brand-200">
              Employee ID: {profile?.employee_id || user?.employee_id}
            </span>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {profile?.email}</span>
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {profile?.phone}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile?.work_location || 'Kerala'}</span>
          </div>
        </div>
      </div>

      {/* Edit Contact & Emergency Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Personal & Emergency Contact</h3>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Updated!
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Personal Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={e => setEmergencyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Relationship</label>
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={e => setEmergencyRelation(e.target.value)}
                  placeholder="e.g. Spouse / Parent"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Emergency Phone Number</label>
              <input
                type="tel"
                value={emergencyPhone}
                onChange={e => setEmergencyPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>

        {/* Uploaded Documents Box */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-sm font-black text-slate-900">My Verified Documents</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-3 py-1.5 bg-brand-50 text-brand-700 font-bold rounded-xl text-xs hover:bg-brand-100 transition flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              {!profile?.documents || profile.documents.length === 0 ? (
                <p className="text-slate-400 italic text-center py-6">No documents uploaded yet.</p>
              ) : (
                profile.documents.map((doc: EmployeeDoc) => (
                  <div key={doc.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-600" />
                      <div>
                        <p className="font-bold text-slate-800 uppercase text-[10px]">{doc.doc_type}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{doc.file_name}</p>
                      </div>
                    </div>
                    {doc.drive_file_id && (
                      <a
                        href={`/api/files/stream/${doc.drive_file_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-white text-brand-700 font-bold rounded-lg border border-slate-200 text-[10px]"
                      >
                        View File
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-brand-50/60 rounded-2xl border border-brand-200/50 text-[11px] text-brand-900">
            <p className="font-bold mb-0.5">Secure Document Vault</p>
            <p>All documents uploaded are stored privately in Google Drive and accessible only to authorized HR management.</p>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Personal Document">
        <form onSubmit={handleUploadDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Document Type *</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="aadhaar">Aadhaar Card</option>
              <option value="pan">PAN Card</option>
              <option value="education_cert">Education Certificate</option>
              <option value="experience_letter">Experience Letter</option>
              <option value="bank_passbook">Bank Passbook / Cheque</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">File (PDF or Image, Max 5MB) *</label>
            <input
              type="file"
              required
              accept=".pdf,image/*,.doc,.docx"
              onChange={e => setDocFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isUploading ? 'Uploading to Drive...' : 'Save Document to Drive'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
