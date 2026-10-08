import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Briefcase,
  CheckSquare,
  DollarSign,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { api } from '../../services/api';

export const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'recruitment' | 'attendance' | 'tasks' | 'payroll'>('recruitment');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      let endpoint = '/reports/recruitment-funnel';
      if (activeReport === 'attendance') endpoint = '/reports/attendance-monthly';
      if (activeReport === 'tasks') endpoint = '/reports/task-completion';
      if (activeReport === 'payroll') endpoint = '/reports/payroll-summary';

      const res = await api.get(endpoint);
      if (res.success) setData(res);
    } catch (e) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const exportCsv = () => {
    if (!data) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (activeReport === 'recruitment' && data.jobWise) {
      csvContent += 'Job Title,Department,Total Applications,Shortlisted,Interviewed,Joined\n';
      data.jobWise.forEach((j: any) => {
        csvContent += `"${j.title}","${j.department}",${j.total_applications},${j.shortlisted},${j.interviewed},${j.joined}\n`;
      });
    } else if (activeReport === 'attendance' && data.matrix) {
      csvContent += 'Employee ID,Name,Department,Present Count,Late Count,Half Day Count\n';
      data.matrix.forEach((m: any) => {
        csvContent += `"${m.employee_id}","${m.full_name}","${m.department}",${m.present_count},${m.late_count},${m.half_day_count}\n`;
      });
    } else if (activeReport === 'tasks' && data.stats) {
      csvContent += 'Employee ID,Name,Department,Total Tasks,Done Tasks,Completion Rate (%)\n';
      data.stats.forEach((s: any) => {
        csvContent += `"${s.employee_id}","${s.full_name}","${s.department}",${s.total_tasks},${s.done_tasks},${s.completion_rate}\n`;
      });
    } else if (activeReport === 'payroll' && data.payslips) {
      csvContent += 'Month,Employee ID,Name,Department,Gross,Deductions,Net Pay,Status\n';
      data.payslips.forEach((p: any) => {
        csvContent += `"${p.month}","${p.employee_id}","${p.employee_name}","${p.department}",${p.gross},${p.total_deductions},${p.net_pay},"${p.paid_status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MSA_HR_Report_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600" /> Executive HR Reports
          </h2>
          <p className="text-xs text-slate-500">Exportable metrics for recruitment, attendance, tasks, and payroll</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV / Excel
          </button>
          <button
            type="button"
            onClick={printReport}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveReport('recruitment')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeReport === 'recruitment'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-white text-slate-700 border border-slate-200/60'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Recruitment Funnel
        </button>

        <button
          type="button"
          onClick={() => setActiveReport('attendance')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeReport === 'attendance'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-white text-slate-700 border border-slate-200/60'
          }`}
        >
          <Calendar className="w-4 h-4" /> Attendance Monthly Matrix
        </button>

        <button
          type="button"
          onClick={() => setActiveReport('tasks')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeReport === 'tasks'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-white text-slate-700 border border-slate-200/60'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Task Completion Rate
        </button>

        <button
          type="button"
          onClick={() => setActiveReport('payroll')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeReport === 'payroll'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-white text-slate-700 border border-slate-200/60'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Payroll Summary
        </button>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Generating report...</div>
        ) : !data ? (
          <p className="text-xs text-slate-400 italic">No report data found.</p>
        ) : (
          <div className="space-y-6">
            {/* Recruitment Funnel View */}
            {activeReport === 'recruitment' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Total Applications</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{data.totalApplications || 0}</p>
                  </div>
                  <div className="p-4 bg-brand-50 rounded-2xl">
                    <p className="text-[10px] text-brand-700 font-bold uppercase">Shortlisted</p>
                    <p className="text-2xl font-black text-brand-900 mt-1">{data.funnel?.Shortlisted || 0}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-2xl">
                    <p className="text-[10px] text-purple-700 font-bold uppercase">Interviewed</p>
                    <p className="text-2xl font-black text-purple-900 mt-1">{data.funnel?.Interviewed || 0}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Staff Joined</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">{data.funnel?.Joined || 0}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Job Title</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Applications</th>
                        <th className="py-3 px-4">Shortlisted</th>
                        <th className="py-3 px-4">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.jobWise?.map((j: any) => (
                        <tr key={j.job_id}>
                          <td className="py-3 px-4 font-bold text-slate-900">{j.title}</td>
                          <td className="py-3 px-4 text-slate-600">{j.department}</td>
                          <td className="py-3 px-4 font-bold">{j.total_applications}</td>
                          <td className="py-3 px-4 text-brand-700 font-bold">{j.shortlisted}</td>
                          <td className="py-3 px-4 text-emerald-700 font-bold">{j.joined}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attendance Matrix View */}
            {activeReport === 'attendance' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Present Days</th>
                      <th className="py-3 px-4">Late Marks</th>
                      <th className="py-3 px-4">Half Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.matrix?.map((m: any) => (
                      <tr key={m.employee_id}>
                        <td className="py-3 px-4 font-bold text-slate-900">{m.full_name} ({m.employee_id})</td>
                        <td className="py-3 px-4 text-slate-600">{m.department}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">{m.present_count}</td>
                        <td className="py-3 px-4 font-bold text-amber-700">{m.late_count}</td>
                        <td className="py-3 px-4 font-bold text-slate-700">{m.half_day_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Task Completion View */}
            {activeReport === 'tasks' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Total Tasks</th>
                      <th className="py-3 px-4">Done Tasks</th>
                      <th className="py-3 px-4">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.stats?.map((s: any) => (
                      <tr key={s.employee_id}>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.full_name} ({s.employee_id})</td>
                        <td className="py-3 px-4 text-slate-600">{s.department}</td>
                        <td className="py-3 px-4 font-bold">{s.total_tasks}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">{s.done_tasks}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 bg-brand-100 text-brand-800 font-black rounded-full text-[10px]">
                            {s.completion_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payroll Summary View */}
            {activeReport === 'payroll' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Total Gross Earnings</p>
                    <p className="text-xl font-black text-slate-900 mt-1">₹{Number(data.summary?.totalGross || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-2xl">
                    <p className="text-[10px] text-rose-700 font-bold uppercase">Total Deductions</p>
                    <p className="text-xl font-black text-rose-900 mt-1">₹{Number(data.summary?.totalDeductions || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Total Net Disbursed</p>
                    <p className="text-xl font-black text-emerald-900 mt-1">₹{Number(data.summary?.totalNet || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Gross</th>
                        <th className="py-3 px-4">Deductions</th>
                        <th className="py-3 px-4">Net Take-Home</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.payslips?.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4 font-bold">{p.month}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{p.employee_name}</td>
                          <td className="py-3 px-4">₹{Number(p.gross).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-rose-600 font-semibold">-₹{Number(p.total_deductions).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-emerald-700 font-bold">₹{Number(p.net_pay).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4">{p.paid_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
