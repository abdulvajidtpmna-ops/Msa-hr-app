import React, { useState, useEffect } from 'react';
import {
  Clock,
  Camera,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Users,
  ExternalLink,
  Plus,
  RefreshCw,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Attendance, Holiday, LeaveRequest } from '../../types';
import { CameraCapture } from '../../components/common/CameraCapture';
import { LocationCapture } from '../../components/common/LocationCapture';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR Manager' || user?.role === 'HR Executive';

  const [activeTab, setActiveTab] = useState<'punch' | 'my-history' | 'team-live' | 'regularization'>('punch');

  // Punch State
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [isPunching, setIsPunching] = useState(false);
  const [punchMessage, setPunchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // History State
  const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().substring(0, 7));
  const [myHistory, setMyHistory] = useState<Attendance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Live Team State (HR)
  const [liveDate, setLiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [liveData, setLiveData] = useState<any[]>([]);
  const [liveSummary, setLiveSummary] = useState<any>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [selectedSelfieUrl, setSelectedSelfieUrl] = useState<string | null>(null);

  // Regularization Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [regInTime, setRegInTime] = useState('09:30');
  const [regOutTime, setRegOutTime] = useState('18:00');
  const [regReason, setRegReason] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  const fetchToday = async () => {
    try {
      const res = await api.get<{ success: boolean; attendance: Attendance | null }>('/attendance/today');
      if (res.success) {
        setTodayAttendance(res.attendance);
      }
    } catch (e) {}
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get<{ success: boolean; attendance: Attendance[]; holidays: Holiday[]; approvedLeaves: LeaveRequest[] }>(
        `/attendance/my-history?month=${historyMonth}`
      );
      if (res.success) {
        setMyHistory(res.attendance);
        setHolidays(res.holidays);
        setLeaves(res.approvedLeaves);
      }
    } catch (e) {}
    finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchLiveTeam = async () => {
    setIsLoadingLive(true);
    try {
      const res = await api.get<{ success: boolean; summary: any; liveData: any[] }>(
        `/attendance/live?date=${liveDate}`
      );
      if (res.success) {
        setLiveData(res.liveData);
        setLiveSummary(res.summary);
      }
    } catch (e) {}
    finally {
      setIsLoadingLive(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  useEffect(() => {
    if (activeTab === 'my-history') fetchHistory();
    if (activeTab === 'team-live') fetchLiveTeam();
  }, [activeTab, historyMonth, liveDate]);

  const handlePunch = async (punchType: 'IN' | 'OUT') => {
    if (!coords) {
      setPunchMessage({ type: 'error', text: 'GPS location coordinates are required. Please enable location.' });
      return;
    }
    if (!selfieDataUrl) {
      setPunchMessage({ type: 'error', text: 'Live selfie capture is required for attendance.' });
      return;
    }

    setIsPunching(true);
    setPunchMessage(null);

    try {
      const formData = new FormData();
      formData.append('punch_type', punchType);
      formData.append('latitude', String(coords.latitude));
      formData.append('longitude', String(coords.longitude));
      formData.append('accuracy', String(coords.accuracy));
      formData.append('selfie_base64', selfieDataUrl);
      formData.append('device_info', navigator.userAgent);

      const res = await api.post<{ success: boolean; message: string; attendance: Attendance }>(
        '/attendance/punch',
        formData
      );

      if (res.success) {
        setPunchMessage({ type: 'success', text: res.message });
        setTodayAttendance(res.attendance);
        setSelfieBlob(null);
        setSelfieDataUrl(null);
      } else {
        setPunchMessage({ type: 'error', text: res.message || 'Punch failed' });
      }
    } catch (err: any) {
      setPunchMessage({ type: 'error', text: err.message || 'Failed to punch attendance' });
    } finally {
      setIsPunching(false);
    }
  };

  const handleSubmitRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReg(true);
    try {
      const res = await api.post('/attendance/request-regularization', {
        date: regDate,
        requested_in: regInTime,
        requested_out: regOutTime,
        reason: regReason
      });
      if (res.success) {
        alert('Regularization request submitted to HR!');
        setShowRegModal(false);
        setRegReason('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit regularization');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('punch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'punch' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 inline mr-1.5" /> Selfie Punch
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'my-history' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1.5" /> My History
          </button>
          {isHR && (
            <button
              type="button"
              onClick={() => setActiveTab('team-live')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'team-live' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 inline mr-1.5" /> Live Team List
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowRegModal(true)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
        >
          Request Correction
        </button>
      </div>

      {/* Tab 1: Live Selfie Punch */}
      {activeTab === 'punch' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Punch Action Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col items-center">
            <h3 className="text-lg font-black text-slate-900 mb-1">Live Camera Attendance</h3>
            <p className="text-xs text-slate-500 mb-6 text-center">
              Front-camera selfie with GPS coordinates required. Device time is not used.
            </p>

            {punchMessage && (
              <div
                className={`w-full mb-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                  punchMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {punchMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{punchMessage.text}</span>
              </div>
            )}

            {/* GPS verification */}
            <div className="w-full mb-6">
              <LocationCapture onLocation={setCoords} />
            </div>

            {/* Camera Component */}
            <CameraCapture
              onCapture={(_blob, dataUrl) => {
                setSelfieBlob(_blob);
                setSelfieDataUrl(dataUrl);
              }}
              onRetake={() => {
                setSelfieBlob(null);
                setSelfieDataUrl(null);
              }}
            />

            {/* Punch Buttons */}
            <div className="w-full grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                disabled={isPunching || !selfieDataUrl || !coords || !!todayAttendance?.in_time}
                onClick={() => handlePunch('IN')}
                className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" /> Check IN
              </button>

              <button
                type="button"
                disabled={isPunching || !selfieDataUrl || !coords || !todayAttendance?.in_time || !!todayAttendance?.out_time}
                onClick={() => handlePunch('OUT')}
                className="py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" /> Check OUT
              </button>
            </div>
          </div>

          {/* Today's Status & Guidelines */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Today's Record</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{todayAttendance?.status || 'Not Checked In'}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      todayAttendance?.status === 'Present'
                        ? 'bg-emerald-100 text-emerald-700'
                        : todayAttendance?.status === 'Late'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {todayAttendance?.status || 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-xs text-slate-500">Punch IN Time</p>
                    <p className="text-lg font-black text-slate-900 mt-1">{todayAttendance?.in_time || '--:--'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-xs text-slate-500">Punch OUT Time</p>
                    <p className="text-lg font-black text-slate-900 mt-1">{todayAttendance?.out_time || '--:--'}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-1 text-slate-600">
                  <p><span className="font-semibold text-slate-800">Geofence Location:</span> {todayAttendance?.geofence_flag || 'N/A'}</p>
                  {todayAttendance?.in_lat && todayAttendance?.in_lng && (
                    <a
                      href={`https://www.google.com/maps?q=${todayAttendance.in_lat},${todayAttendance.in_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-600 font-bold hover:underline mt-1"
                    >
                      <MapPin className="w-3.5 h-3.5" /> View Punch Coordinates on Map
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Office Rules Info */}
            <div className="bg-brand-50/60 border border-brand-200/60 rounded-3xl p-6 text-xs text-brand-900 space-y-2">
              <h5 className="font-black text-sm text-brand-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-600" /> Attendance Guidelines
              </h5>
              <p>• Office timing: <strong>09:30 AM to 06:00 PM</strong></p>
              <p>• Grace time: <strong>15 minutes</strong> (Punches after 09:45 AM will be marked as Late)</p>
              <p>• Minimum 8 working hours required for Full Day Present, 4 hours for Half Day</p>
              <p>• Gallery uploads are disabled; selfie must be taken directly via camera</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Attendance History */}
      {activeTab === 'my-history' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Attendance Calendar History</h3>
              <p className="text-xs text-slate-500">Monthly breakdown of presence, late marks, and leaves</p>
            </div>
            <input
              type="month"
              value={historyMonth}
              onChange={e => setHistoryMonth(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
            />
          </div>

          {isLoadingHistory ? (
            <div className="py-12 flex justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
            </div>
          ) : myHistory.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No attendance records found"
              description={`No punch records found for the month of ${historyMonth}.`}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">In Time</th>
                    <th className="py-3 px-4">Out Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Geofence</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myHistory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-800">{item.date}</td>
                      <td className="py-3 px-4 text-slate-600">{item.in_time || '--'}</td>
                      <td className="py-3 px-4 text-slate-600">{item.out_time || '--'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.status === 'Present'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.status === 'Late'
                              ? 'bg-amber-100 text-amber-700'
                              : item.status === 'Half Day'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{item.geofence_flag || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{item.remark || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Live Team Attendance (HR Only) */}
      {activeTab === 'team-live' && isHR && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Live Team Punch Status</h3>
              <p className="text-xs text-slate-500">Live monitoring of today's presence, check-ins, and GPS locations</p>
            </div>
            <input
              type="date"
              value={liveDate}
              onChange={e => setLiveDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
            />
          </div>

          {isLoadingLive ? (
            <div className="py-12 flex justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
            </div>
          ) : liveData.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No live punches recorded"
              description="No staff members have punched in for the selected date yet."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveData.map(emp => (
                <div key={emp.employee_id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{emp.full_name}</h4>
                      <p className="text-[11px] text-slate-500">{emp.employee_id} • {emp.designation}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        emp.status === 'Present'
                          ? 'bg-emerald-100 text-emerald-700'
                          : emp.status === 'Late'
                          ? 'bg-amber-100 text-amber-700'
                          : emp.status === 'On Leave'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {emp.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Punch IN</p>
                      <p className="font-bold text-slate-800">{emp.in_time || '--:--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Punch OUT</p>
                      <p className="font-bold text-slate-800">{emp.out_time || '--:--'}</p>
                    </div>
                  </div>

                  {emp.map_link && (
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={emp.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700"
                      >
                        <MapPin className="w-3.5 h-3.5" /> View GPS on Map <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Regularization Modal */}
      <Modal isOpen={showRegModal} onClose={() => setShowRegModal(false)} title="Attendance Regularization Request">
        <form onSubmit={handleSubmitRegularization} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
            <input
              type="date"
              required
              value={regDate}
              onChange={e => setRegDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Corrected IN Time</label>
              <input
                type="time"
                value={regInTime}
                onChange={e => setRegInTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Corrected OUT Time</label>
              <input
                type="time"
                value={regOutTime}
                onChange={e => setRegOutTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Correction *</label>
            <textarea
              required
              rows={3}
              value={regReason}
              onChange={e => setRegReason(e.target.value)}
              placeholder="Explain why punch was missed or needs adjustment..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingReg}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isSubmittingReg ? 'Submitting...' : 'Submit Request to HR'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
