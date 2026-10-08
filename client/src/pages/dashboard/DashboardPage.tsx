import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckSquare,
  Calendar,
  Briefcase,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  UserX,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Attendance, Task, LeaveBalance } from '../../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [hrStats, setHrStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isHR = user?.role === 'HR Manager' || user?.role === 'HR Executive';

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [attRes, tasksRes, leaveRes] = await Promise.all([
          api.get<{ success: boolean; attendance: Attendance | null }>('/attendance/today'),
          api.get<{ success: boolean; tasks: Task[] }>('/tasks/my-tasks'),
          api.get<{ success: boolean; balances: LeaveBalance[] }>('/leave/my-balances')
        ]);

        if (attRes.success) setTodayAttendance(attRes.attendance);
        if (tasksRes.success) setTasks(tasksRes.tasks);
        if (leaveRes.success) setLeaveBalances(leaveRes.balances);

        if (isHR) {
          const [liveAttRes, jobsRes, appsRes] = await Promise.all([
            api.get<{ success: boolean; summary: any }>('/attendance/live'),
            api.get<{ success: boolean; jobs: any[] }>('/recruitment/jobs'),
            api.get<{ success: boolean; applications: any[] }>('/recruitment/applications')
          ]);

          setHrStats({
            attendance: liveAttRes.summary,
            openJobs: jobsRes.jobs?.filter(j => j.status === 'Open').length || 0,
            newApplications: appsRes.applications?.filter(a => a.status === 'Applied').length || 0,
            shortlisted: appsRes.applications?.filter(a => a.status === 'Shortlisted').length || 0,
            joined: appsRes.applications?.filter(a => a.status === 'Joined').length || 0
          });
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [isHR]);

  const pendingTasks = tasks.filter(t => t.status !== 'Done');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-brand-950/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2">Welcome back, {user?.name}!</h2>
          <p className="text-xs sm:text-sm text-brand-100 mt-1">
            {user?.designation} • {user?.department} • {user?.role}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Link
            to="/attendance"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-brand-900 rounded-2xl text-xs font-black shadow-md hover:bg-brand-50 transition active:scale-95"
          >
            <Clock className="w-4 h-4 text-brand-600" />
            {todayAttendance?.in_time ? (todayAttendance?.out_time ? 'Attendance Completed' : 'Punch OUT') : 'Punch IN (Selfie)'}
          </Link>
          <Link
            to="/tasks"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand-950/40 hover:bg-brand-950/60 text-white rounded-2xl text-xs font-bold transition"
          >
            <CheckSquare className="w-4 h-4" /> My Tasks
          </Link>
        </div>
      </div>

      {/* HR Overview Cards (HR Manager & HR Executive) */}
      {isHR && hrStats && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">HR Operations Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <Link to="/attendance" className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-brand-300 transition">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <UserCheck className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{hrStats.attendance?.present || 0}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Staff Present Today</p>
            </Link>

            <Link to="/attendance" className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-brand-300 transition">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{hrStats.attendance?.late || 0}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Late Marks</p>
            </Link>

            <Link to="/recruitment" className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-brand-300 transition">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Briefcase className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{hrStats.openJobs}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Open Job Openings</p>
            </Link>

            <Link to="/recruitment" className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-brand-300 transition">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900">{hrStats.newApplications}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">New Candidates</p>
            </Link>
          </div>
        </div>
      )}

      {/* Main Grid: Punch Card, Tasks, Leaves */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Punch Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" /> Today's Attendance
              </h3>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  todayAttendance?.status === 'Present'
                    ? 'bg-emerald-100 text-emerald-700'
                    : todayAttendance?.status === 'Late'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {todayAttendance?.status || 'Not Punched'}
              </span>
            </div>

            <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Punch IN:</span>
                <span className="font-bold text-slate-800">{todayAttendance?.in_time || '--:--'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Punch OUT:</span>
                <span className="font-bold text-slate-800">{todayAttendance?.out_time || '--:--'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Location:</span>
                <span className="font-bold text-slate-800">{todayAttendance?.geofence_flag || 'Pending'}</span>
              </div>
            </div>
          </div>

          <Link
            to="/attendance"
            className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold text-center block transition"
          >
            Open Attendance Camera & History
          </Link>
        </div>

        {/* Pending Daily Tasks */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-brand-600" /> My Tasks
              </h3>
              <span className="px-2.5 py-1 bg-brand-50 text-brand-700 font-bold text-[10px] rounded-full">
                {pendingTasks.length} Pending
              </span>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                All tasks are up to date!
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{t.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Due: {t.due_date}</p>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                        t.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/tasks"
            className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold text-center block transition"
          >
            Manage Tasks & Evidence
          </Link>
        </div>

        {/* Leave Balances */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600" /> Leave Balance
              </h3>
              <span className="text-[10px] font-bold text-slate-400">{new Date().getFullYear()}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {leaveBalances.slice(0, 4).map(b => (
                <div key={b.leave_type_id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-lg font-black text-brand-700">{b.balance}</p>
                  <p className="text-[10px] font-semibold text-slate-600 truncate">{b.leave_type_name}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/leave"
            className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold text-center block transition"
          >
            Apply for Leave
          </Link>
        </div>
      </div>
    </div>
  );
};
