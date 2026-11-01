import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Search,
  User,
  Users,
  BarChart3,
  ChevronRight,
  Star,
  Check,
  Sparkles,
  RefreshCw,
  FileText,
  Layers,
  ArrowUpRight,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { KRA, KPI, PerformanceDashboardStats, Employee } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { ToastContainer, ToastMessage } from '../../components/common/Toast';

export const PerformancePage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR Manager' || user?.role === 'HR Executive';

  // Navigation tab: HR gets 'dashboard' | 'kras' | 'kpis' | 'my-performance'; Employee gets 'my-performance'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kras' | 'kpis' | 'my-performance'>(
    isHR ? 'dashboard' : 'my-performance'
  );

  // Data states
  const [dashboardStats, setDashboardStats] = useState<PerformanceDashboardStats | null>(null);
  const [kras, setKras] = useState<KRA[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [myKpis, setMyKpis] = useState<KPI[]>([]);
  const [myKras, setMyKras] = useState<KRA[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters for HR views
  const [deptFilter, setDeptFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [empFilter, setEmpFilter] = useState('All');
  const [evalFilter, setEvalFilter] = useState('All');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Modals state
  const [showKraModal, setShowKraModal] = useState(false);
  const [editingKra, setEditingKra] = useState<KRA | null>(null);
  const [kraForm, setKraForm] = useState({
    title: '',
    description: '',
    department: 'Academics',
    designation: 'All Designations',
    assigned_to: 'ALL',
    period: '2026',
    weightage: 20,
    status: 'Active'
  });
  const [isSavingKra, setIsSavingKra] = useState(false);

  const [showKpiModal, setShowKpiModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);
  const [kpiForm, setKpiForm] = useState({
    kra_id: '',
    employee_id: '',
    title: '',
    description: '',
    target_value: 100,
    current_value: 0,
    unit: '%',
    weightage: 25,
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'Pending'
  });
  const [isSavingKpi, setIsSavingKpi] = useState(false);

  // Self Evaluation Modal state
  const [showSelfEvalModal, setShowSelfEvalModal] = useState(false);
  const [evaluatingKpi, setEvaluatingKpi] = useState<KPI | null>(null);
  const [selfRating, setSelfRating] = useState<number>(4);
  const [selfComments, setSelfComments] = useState('');
  const [selfCurrentValue, setSelfCurrentValue] = useState<number>(0);
  const [isSubmittingSelfEval, setIsSubmittingSelfEval] = useState(false);

  // Manager Evaluation Modal state
  const [showManagerEvalModal, setShowManagerEvalModal] = useState(false);
  const [managerEvaluatingKpi, setManagerEvaluatingKpi] = useState<KPI | null>(null);
  const [managerRating, setManagerRating] = useState<number>(4.5);
  const [managerComments, setManagerComments] = useState('');
  const [managerScoreOverride, setManagerScoreOverride] = useState<string>('');
  const [managerStatus, setManagerStatus] = useState<string>('Achieved');
  const [isSubmittingManagerEval, setIsSubmittingManagerEval] = useState(false);

  // Delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'kra' | 'kpi';
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load all initial data
  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      if (isHR) {
        // Fetch dashboard stats, KRAs, KPIs, Employees
        const [dashRes, krasRes, kpisRes, empsRes] = await Promise.all([
          api.get<{ success: boolean; stats: PerformanceDashboardStats }>('/performance/dashboard'),
          api.get<{ success: boolean; kras: KRA[] }>('/performance/kras'),
          api.get<{ success: boolean; kpis: KPI[] }>('/performance/kpis'),
          api.get<{ success: boolean; employees: Employee[] }>('/employees')
        ]);

        if (dashRes.success) setDashboardStats(dashRes.stats);
        if (krasRes.success) setKras(krasRes.kras);
        if (kpisRes.success) setKpis(kpisRes.kpis);
        if (empsRes.success) setEmployees(empsRes.employees);

        // Also extract user's own performance for "My Performance" tab
        if (kpisRes.success) {
          const myOwnKpis = kpisRes.kpis.filter(k => k.employee_id === user?.employee_id);
          setMyKpis(myOwnKpis);
        }
        if (krasRes.success) {
          const myOwnKras = krasRes.kras.filter(
            k => k.assigned_to === 'ALL' || k.assigned_to === user?.employee_id || k.department === user?.department
          );
          setMyKras(myOwnKras);
        }
      } else {
        // Employee role: fetch personal dashboard, personal KRAs and KPIs
        const [dashRes, krasRes, kpisRes] = await Promise.all([
          api.get<{ success: boolean; stats: PerformanceDashboardStats }>('/performance/dashboard'),
          api.get<{ success: boolean; kras: KRA[] }>('/performance/kras'),
          api.get<{ success: boolean; kpis: KPI[] }>('/performance/kpis')
        ]);

        if (dashRes.success) setDashboardStats(dashRes.stats);
        if (krasRes.success) {
          setKras(krasRes.kras);
          setMyKras(krasRes.kras);
        }
        if (kpisRes.success) {
          setKpis(kpisRes.kpis);
          setMyKpis(kpisRes.kpis);
        }
      }
    } catch (err: any) {
      console.error('[PerformancePage] Error fetching data:', err);
      showToast('error', err.message || 'Failed to load performance data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isHR, user?.employee_id]);

  // Seed sample data helper
  const handleSeedDemoData = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/performance/seed');
      if (res.success) {
        showToast('success', res.message || 'Performance sample data seeded successfully');
        await loadData(true);
      } else {
        showToast('error', res.message || 'Failed to seed sample data');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error executing demo seed');
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- KRA CRUD Actions ---
  const handleOpenCreateKra = () => {
    setEditingKra(null);
    setKraForm({
      title: '',
      description: '',
      department: user?.department || 'Academics',
      designation: 'All Designations',
      assigned_to: 'ALL',
      period: '2026',
      weightage: 20,
      status: 'Active'
    });
    setShowKraModal(true);
  };

  const handleOpenEditKra = (kra: KRA) => {
    setEditingKra(kra);
    setKraForm({
      title: kra.title,
      description: kra.description || '',
      department: kra.department || 'Academics',
      designation: kra.designation || 'All Designations',
      assigned_to: kra.assigned_to || 'ALL',
      period: kra.period || '2026',
      weightage: kra.weightage || 20,
      status: kra.status || 'Active'
    });
    setShowKraModal(true);
  };

  const handleSaveKra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kraForm.title.trim()) {
      showToast('error', 'KRA title is required');
      return;
    }

    setIsSavingKra(true);
    try {
      const payload: any = {
        ...kraForm,
        weightage: Number(kraForm.weightage) || 0
      };
      if (editingKra) {
        payload.id = editingKra.id;
      }

      const res = await api.post<{ success: boolean; kra: KRA; message?: string }>(
        '/performance/kras',
        payload
      );

      if (res.success) {
        showToast('success', editingKra ? 'KRA updated successfully' : 'KRA created successfully');
        setShowKraModal(false);
        await loadData(true);
      } else {
        showToast('error', res.message || 'Failed to save KRA');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error saving KRA');
    } finally {
      setIsSavingKra(false);
    }
  };

  // --- KPI CRUD Actions ---
  const handleOpenCreateKpi = (prefillKraId?: string) => {
    setEditingKpi(null);
    setKpiForm({
      kra_id: prefillKraId || (kras.length > 0 ? kras[0].id : ''),
      employee_id: employees.length > 0 ? employees[0].employee_id : user?.employee_id || '',
      title: '',
      description: '',
      target_value: 100,
      current_value: 0,
      unit: '%',
      weightage: 25,
      start_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Pending'
    });
    setShowKpiModal(true);
  };

  const handleOpenEditKpi = (kpi: KPI) => {
    setEditingKpi(kpi);
    setKpiForm({
      kra_id: kpi.kra_id,
      employee_id: kpi.employee_id,
      title: kpi.title,
      description: kpi.description || '',
      target_value: Number(kpi.target_value) || 100,
      current_value: Number(kpi.current_value) || 0,
      unit: kpi.unit || '%',
      weightage: Number(kpi.weightage) || 25,
      start_date: kpi.start_date || new Date().toISOString().split('T')[0],
      due_date: kpi.due_date || '',
      status: kpi.status || 'Pending'
    });
    setShowKpiModal(true);
  };

  const handleSaveKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiForm.kra_id) {
      showToast('error', 'Parent KRA selection is required');
      return;
    }
    if (!kpiForm.employee_id) {
      showToast('error', 'Assigned employee is required');
      return;
    }
    if (!kpiForm.title.trim()) {
      showToast('error', 'KPI title is required');
      return;
    }

    setIsSavingKpi(true);
    try {
      const payload: any = {
        ...kpiForm,
        target_value: Number(kpiForm.target_value) || 100,
        current_value: Number(kpiForm.current_value) || 0,
        weightage: Number(kpiForm.weightage) || 0
      };
      if (editingKpi) {
        payload.id = editingKpi.id;
      }

      const res = await api.post<{ success: boolean; kpi: KPI; message?: string }>(
        '/performance/kpis',
        payload
      );

      if (res.success) {
        showToast('success', editingKpi ? 'KPI updated successfully' : 'KPI created successfully');
        setShowKpiModal(false);
        await loadData(true);
      } else {
        showToast('error', res.message || 'Failed to save KPI');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error saving KPI');
    } finally {
      setIsSavingKpi(false);
    }
  };

  // --- Deletion Execution ---
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    setIsDeleting(true);

    try {
      const endpoint =
        deleteConfirmation.type === 'kra'
          ? `/performance/kras/${deleteConfirmation.id}`
          : `/performance/kpis/${deleteConfirmation.id}`;

      const res = await api.delete<{ success: boolean; message: string }>(endpoint);
      if (res.success) {
        showToast(
          'success',
          `${deleteConfirmation.type === 'kra' ? 'KRA and child KPIs' : 'KPI'} deleted successfully`
        );
        setDeleteConfirmation(null);
        await loadData(true);
      } else {
        showToast('error', res.message || 'Failed to delete record');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error executing deletion');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Self-Evaluation (Employee) ---
  const handleOpenSelfEval = (kpi: KPI) => {
    setEvaluatingKpi(kpi);
    setSelfRating(Number(kpi.self_rating) || 4);
    setSelfComments(kpi.self_comments || '');
    setSelfCurrentValue(Number(kpi.current_value) || 0);
    setShowSelfEvalModal(true);
  };

  const handleSubmitSelfEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingKpi) return;

    if (selfRating < 1 || selfRating > 5) {
      showToast('error', 'Rating must be between 1.0 and 5.0');
      return;
    }

    setIsSubmittingSelfEval(true);
    try {
      const res = await api.post<{ success: boolean; kpi: KPI; message: string }>(
        `/performance/kpis/${evaluatingKpi.id}/self-evaluate`,
        {
          self_rating: selfRating,
          self_comments: selfComments,
          current_value: selfCurrentValue
        }
      );

      if (res.success) {
        showToast('success', 'Self-evaluation submitted successfully!');
        setShowSelfEvalModal(false);
        await loadData(true);
      } else {
        showToast('error', res.message || 'Failed to submit self-evaluation');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error submitting self-evaluation');
    } finally {
      setIsSubmittingSelfEval(false);
    }
  };

  // --- Manager Evaluation (HR / Manager) ---
  const handleOpenManagerEval = (kpi: KPI) => {
    setManagerEvaluatingKpi(kpi);
    setManagerRating(Number(kpi.manager_rating) || 4.5);
    setManagerComments(kpi.manager_comments || '');
    setManagerScoreOverride(kpi.score !== undefined && kpi.score !== null ? String(kpi.score) : '');
    setManagerStatus(kpi.status || 'Achieved');
    setShowManagerEvalModal(true);
  };

  const calculatedPreviewScore = useMemo(() => {
    if (!managerEvaluatingKpi) return 0;
    const target = Number(managerEvaluatingKpi.target_value) || 100;
    const current = Number(managerEvaluatingKpi.current_value) || 0;
    const progressPct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 100;
    const ratingPct = (Number(managerRating) / 5) * 100;
    return Math.round(progressPct * 0.5 + ratingPct * 0.5);
  }, [managerEvaluatingKpi, managerRating]);

  const handleSubmitManagerEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerEvaluatingKpi) return;

    if (managerRating < 1 || managerRating > 5) {
      showToast('error', 'Manager rating must be between 1.0 and 5.0');
      return;
    }

    setIsSubmittingManagerEval(true);
    try {
      const finalScore = managerScoreOverride !== '' ? Number(managerScoreOverride) : calculatedPreviewScore;
      const res = await api.post<{ success: boolean; kpi: KPI; message: string }>(
        `/performance/kpis/${managerEvaluatingKpi.id}/evaluate`,
        {
          manager_rating: managerRating,
          manager_comments: managerComments,
          score: finalScore,
          status: managerStatus
        }
      );

      if (res.success) {
        showToast('success', 'Manager evaluation recorded successfully!');
        setShowManagerEvalModal(false);
        await loadData(true);
      } else {
        showToast('error', res.message || 'Failed to record manager evaluation');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error recording evaluation');
    } finally {
      setIsSubmittingManagerEval(false);
    }
  };

  // Filtered lists for HR views
  const filteredKras = useMemo(() => {
    return kras.filter(k => {
      const matchesDept = deptFilter === 'All' || k.department === deptFilter || k.department === 'All Departments';
      const matchesPeriod = periodFilter === 'All' || k.period === periodFilter;
      const matchesStatus = statusFilter === 'All' || k.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (k.description && k.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesDept && matchesPeriod && matchesStatus && matchesSearch;
    });
  }, [kras, deptFilter, periodFilter, statusFilter, searchQuery]);

  const filteredKpis = useMemo(() => {
    return kpis.filter(k => {
      const matchesEmp = empFilter === 'All' || k.employee_id === empFilter;
      const matchesStatus = statusFilter === 'All' || k.status === statusFilter;
      const matchesEval = evalFilter === 'All' || k.evaluation_status === evalFilter;
      const matchesSearch =
        !searchQuery ||
        k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (k.employee_name && k.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (k.kra_title && k.kra_title.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesEmp && matchesStatus && matchesEval && matchesSearch;
    });
  }, [kpis, empFilter, statusFilter, evalFilter, searchQuery]);

  // Unique lists for filter dropdowns
  const departmentsList = useMemo(() => {
    const set = new Set<string>(['Academics', 'Human Resources', 'Administration', 'Operations', 'Finance']);
    kras.forEach(k => {
      if (k.department && k.department !== 'All Departments') set.add(k.department);
    });
    return Array.from(set);
  }, [kras]);

  const periodsList = useMemo(() => {
    const set = new Set<string>(['2026', '2025-2026', 'Q1 2026', 'Q2 2026']);
    kras.forEach(k => {
      if (k.period) set.add(k.period);
    });
    return Array.from(set);
  }, [kras]);

  // Performance helpers
  const getScoreColor = (score?: number) => {
    if (score === undefined || score === null) return 'text-slate-400 bg-slate-100 border-slate-200';
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Achieved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Achieved</span>;
      case 'Partially Achieved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Partially Achieved</span>;
      case 'In Progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">In Progress</span>;
      case 'Missed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">Missed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{status || 'Pending'}</span>;
    }
  };

  const getEvaluationStatusBadge = (evalStatus?: string, score?: number) => {
    switch (evalStatus) {
      case 'Evaluated':
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            Evaluated {score !== undefined ? `(${score}%)` : ''}
          </span>
        );
      case 'Self Submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Self Submitted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Not Started
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-brand-950/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-sm border border-white/10 inline-flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-brand-300" /> KRA & KPI Management
            </span>
            <span className="text-xs text-brand-200 font-medium hidden sm:inline">• Performance Appraisal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">Performance Hub & Goals</h2>
          <p className="text-xs sm:text-sm text-brand-100 mt-1 max-w-2xl">
            {isHR
              ? 'Establish strategic Key Result Areas, assign measurable KPIs, evaluate staff appraisals, and track organization progress.'
              : 'Track your assigned Key Result Areas and KPIs, record self-appraisals, and review manager scores and feedback.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition flex items-center gap-2 border border-white/10"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {isHR && (
            <>
              {(!dashboardStats || dashboardStats.totalKras === 0) && (
                <button
                  type="button"
                  onClick={handleSeedDemoData}
                  className="px-4 py-3 bg-brand-600/60 hover:bg-brand-600 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border border-brand-400/30"
                  title="Initialize Master KRAs and KPIs for testing"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" /> Seed Sample KRAs
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreateKra}
                className="px-4 py-3 bg-white text-brand-900 rounded-2xl text-xs font-black shadow-md hover:bg-brand-50 transition active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-brand-700" /> New KRA
              </button>
              <button
                type="button"
                onClick={() => handleOpenCreateKpi()}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-xs font-black shadow-lg transition active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> New KPI
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role-Based Tab Switcher (HR sees 4 tabs, Employee views My Performance) */}
      {isHR ? (
        <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Executive Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kras')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'kras'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>KRA Catalog ({kras.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kpis')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'kpis'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>KPIs & Manager Evaluation ({kpis.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-performance')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'my-performance'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Self Performance</span>
          </button>
        </div>
      ) : null}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-brand-600 border-t-transparent animate-spin mb-4" />
          <h3 className="text-base font-bold text-slate-800">Loading Performance Data...</h3>
          <p className="text-xs text-slate-400 mt-1">Synchronizing KRAs, KPIs, and appraisal metrics</p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: EXECUTIVE DASHBOARD (HR Only)                                     */}
          {/* ========================================================================= */}
          {activeTab === 'dashboard' && isHR && (
            <div className="space-y-6">
              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <Target className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black text-slate-900">{dashboardStats?.totalKras || kras.length}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Active KRAs Defined</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Layers className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black text-slate-900">{dashboardStats?.totalKpis || kpis.length}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Assigned Employee KPIs</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-black text-purple-700">
                      {dashboardStats?.avgScore ? `${dashboardStats.avgScore}%` : '--'}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Average Performance Score</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black text-emerald-600">{dashboardStats?.completionRate || 0}%</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">KPI Goal Completion Rate</p>
                </div>
              </div>

              {/* Status Breakdown & Department Performance Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KPI Status Distribution */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                      <BarChart3 className="w-4 h-4 text-brand-600" /> KPI Achievement Distribution
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Achieved', count: dashboardStats?.statusDistribution?.['Achieved'] || 0, color: 'bg-emerald-500' },
                        { label: 'Partially Achieved', count: dashboardStats?.statusDistribution?.['Partially Achieved'] || 0, color: 'bg-amber-500' },
                        { label: 'In Progress', count: dashboardStats?.statusDistribution?.['In Progress'] || 0, color: 'bg-blue-500' },
                        { label: 'Pending', count: dashboardStats?.statusDistribution?.['Pending'] || 0, color: 'bg-slate-400' },
                        { label: 'Missed', count: dashboardStats?.statusDistribution?.['Missed'] || 0, color: 'bg-rose-500' }
                      ].map(item => {
                        const total = dashboardStats?.totalKpis || 1;
                        const pct = Math.round((item.count / total) * 100);
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-600">{item.label}</span>
                              <span className="text-slate-900">
                                {item.count} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Total tracked: {dashboardStats?.totalKpis || 0} KPIs</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('kpis')}
                      className="font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
                    >
                      View All <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Department Performance Breakdown */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-brand-600" /> Department Performance Breakdown
                      </h3>
                      <span className="text-xs text-slate-400">By Average Score</span>
                    </div>

                    {!dashboardStats?.departmentBreakdown || dashboardStats.departmentBreakdown.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-xs">
                        No department metrics recorded yet. Seed sample data or assign KPIs to begin tracking.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                              <th className="pb-3 font-semibold">Department</th>
                              <th className="pb-3 font-semibold text-center">KRAs</th>
                              <th className="pb-3 font-semibold text-center">KPIs</th>
                              <th className="pb-3 font-semibold">Performance Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dashboardStats.departmentBreakdown.map(dept => (
                              <tr key={dept.department} className="hover:bg-slate-50 transition">
                                <td className="py-3 font-bold text-slate-800">{dept.department}</td>
                                <td className="py-3 text-center text-slate-600 font-semibold">{dept.totalKras}</td>
                                <td className="py-3 text-center text-slate-600 font-semibold">{dept.totalKpis}</td>
                                <td className="py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 max-w-[120px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          dept.avgScore >= 80
                                            ? 'bg-emerald-500'
                                            : dept.avgScore >= 60
                                            ? 'bg-blue-500'
                                            : dept.avgScore > 0
                                            ? 'bg-amber-500'
                                            : 'bg-slate-300'
                                        }`}
                                        style={{ width: `${Math.min(100, dept.avgScore)}%` }}
                                      />
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${getScoreColor(
                                        dept.avgScore
                                      )}`}
                                    >
                                      {dept.avgScore > 0 ? `${dept.avgScore}%` : 'Pending'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Performance metrics reflect evaluated KPIs</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('kras')}
                      className="font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
                    >
                      Manage KRAs <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Top Performing Staff Leaderboard */}
              {dashboardStats?.topPerformers && dashboardStats.topPerformers.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> High-Performing Staff
                    </h3>
                    <span className="text-xs text-slate-400">Based on manager appraisals</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {dashboardStats.topPerformers.map((emp, idx) => (
                      <div
                        key={emp.employee_id}
                        className="p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 flex flex-col justify-between hover:border-brand-200 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                idx === 0
                                  ? 'bg-amber-400 text-slate-900'
                                  : idx === 1
                                  ? 'bg-slate-300 text-slate-800'
                                  : idx === 2
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-100 text-emerald-800">
                              {emp.score}%
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{emp.employee_name}</p>
                          <p className="text-[10px] text-slate-500">{emp.department}</p>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 mt-3 pt-2 border-t border-slate-100">
                          {emp.kpiCount} KPI{emp.kpiCount > 1 ? 's' : ''} evaluated
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: KRA CATALOG & ASSIGNMENT (HR Only)                                */}
          {/* ========================================================================= */}
          {activeTab === 'kras' && isHR && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search KRAs by title or description..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="All">All Departments</option>
                    {departmentsList.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    value={periodFilter}
                    onChange={e => setPeriodFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="All">All Periods</option>
                    {periodsList.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Completed</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleOpenCreateKra}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add KRA
                  </button>
                </div>
              </div>

              {/* KRA List Cards */}
              {filteredKras.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No Key Result Areas Found"
                  description="Define organizational or department-level KRAs to align staff goals and performance objectives."
                  actionText="Create First KRA"
                  onAction={handleOpenCreateKra}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredKras.map(kra => {
                    const childKpis = kpis.filter(k => k.kra_id === kra.id);
                    return (
                      <div
                        key={kra.id}
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-brand-200 transition space-y-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-100">
                              {kra.period}
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  kra.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {kra.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditKra(kra)}
                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                                title="Edit KRA"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteConfirmation({
                                    type: 'kra',
                                    id: kra.id,
                                    title: kra.title
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete KRA"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h4 className="text-base font-bold text-slate-900 leading-snug">{kra.title}</h4>
                          {kra.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{kra.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-800">
                              Dept: <span className="font-normal text-slate-600">{kra.department}</span>
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-800">
                              Designation: <span className="font-normal text-slate-600">{kra.designation || 'All'}</span>
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-800">
                              Weightage: <span className="text-brand-700 font-bold">{kra.weightage}%</span>
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">
                              Assigned: <strong className="text-slate-800">{kra.assigned_to === 'ALL' ? 'All Staff' : kra.assigned_to}</strong>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                              {childKpis.length} Linked KPI{childKpis.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenCreateKpi(kra.id)}
                            className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add KPI
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: KPI MANAGEMENT & MANAGER EVALUATION (HR Only)                      */}
          {/* ========================================================================= */}
          {activeTab === 'kpis' && isHR && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search KPIs by title, employee name, or KRA..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={empFilter}
                    onChange={e => setEmpFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="All">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.full_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>

                  <select
                    value={evalFilter}
                    onChange={e => setEvalFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="All">All Appraisal Status</option>
                    <option value="Self Submitted">Self Submitted (Pending Review)</option>
                    <option value="Evaluated">Evaluated</option>
                    <option value="Not Started">Not Started</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="All">All Outcomes</option>
                    <option value="Achieved">Achieved</option>
                    <option value="Partially Achieved">Partially Achieved</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="Missed">Missed</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleOpenCreateKpi()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add KPI
                  </button>
                </div>
              </div>

              {/* KPI List Table/Cards */}
              {filteredKpis.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No Key Performance Indicators Found"
                  description="Assign measurable KPIs linked to parent KRAs with specific targets, units, and deadlines."
                  actionText="Create First KPI"
                  onAction={() => handleOpenCreateKpi()}
                />
              ) : (
                <div className="space-y-3">
                  {filteredKpis.map(kpi => {
                    const target = Number(kpi.target_value) || 100;
                    const current = Number(kpi.current_value) || 0;
                    const progressPct = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 100;

                    return (
                      <div
                        key={kpi.id}
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-brand-200 transition"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              KRA: {kpi.kra_title || 'General'}
                            </span>
                            <span className="text-xs font-bold text-brand-700">
                              {kpi.employee_name || kpi.employee_id}
                            </span>
                            <span className="text-[10px] text-slate-400">({kpi.department || 'Academics'})</span>
                            {getStatusBadge(kpi.status)}
                            {getEvaluationStatusBadge(kpi.evaluation_status, kpi.score)}
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 leading-snug">{kpi.title}</h4>
                          {kpi.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{kpi.description}</p>
                          )}

                          {/* Progress and values */}
                          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600">
                            <div className="flex items-center gap-2 min-w-[160px]">
                              <span className="font-semibold text-slate-700">Progress:</span>
                              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-600 rounded-full"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-900 text-[11px]">
                                {current} / {target} {kpi.unit} ({progressPct}%)
                              </span>
                            </div>

                            {kpi.due_date && (
                              <span className="text-[11px] text-slate-500">
                                Due: <strong className="text-slate-700">{kpi.due_date}</strong>
                              </span>
                            )}

                            <span className="text-[11px] text-slate-500">
                              Weightage: <strong className="text-brand-700">{kpi.weightage}%</strong>
                            </span>

                            {kpi.self_rating && (
                              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                Self: {kpi.self_rating}/5
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleOpenManagerEval(kpi)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                              kpi.evaluation_status === 'Self Submitted'
                                ? 'bg-amber-500 hover:bg-amber-400 text-white animate-pulse'
                                : 'bg-brand-600 hover:bg-brand-700 text-white'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            {kpi.evaluation_status === 'Evaluated' ? 'Re-Evaluate' : 'Evaluate'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditKpi(kpi)}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition"
                            title="Edit KPI"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirmation({
                                type: 'kpi',
                                id: kpi.id,
                                title: kpi.title
                              })
                            }
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                            title="Delete KPI"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: MY PERFORMANCE (Employees & Personal View for HR)                 */}
          {/* ========================================================================= */}
          {activeTab === 'my-performance' && (
            <div className="space-y-6">
              {/* Personal Scorecard Header */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 font-black text-xl">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{user?.name}</h3>
                    <p className="text-xs text-slate-500">
                      {user?.designation} • {user?.department} • ID: {user?.employee_id}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {myKpis.length} Assigned KPIs
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700">
                        Period: 2026
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Stats */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[120px]">
                    <p className="text-2xl font-black text-brand-700">
                      {myKpis.filter(k => k.evaluation_status === 'Evaluated' && k.score !== undefined).length > 0
                        ? `${Math.round(
                            myKpis
                              .filter(k => k.evaluation_status === 'Evaluated' && k.score !== undefined)
                              .reduce((sum, k) => sum + Number(k.score || 0), 0) /
                              myKpis.filter(k => k.evaluation_status === 'Evaluated' && k.score !== undefined).length
                          )}%`
                        : '--'}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">My Average Score</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[120px]">
                    <p className="text-2xl font-black text-emerald-600">
                      {myKpis.filter(k => k.status === 'Achieved').length} / {myKpis.length}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">KPIs Achieved</p>
                  </div>
                </div>
              </div>

              {/* My Assigned KPIs Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-600" /> My Key Performance Indicators & Appraisals
                  </h3>
                  <span className="text-xs text-slate-400">Click self-evaluate to update progress & ratings</span>
                </div>

                {myKpis.length === 0 ? (
                  <EmptyState
                    icon={Target}
                    title="No KPIs Assigned Yet"
                    description="You do not have any active Key Performance Indicators assigned for this period. Your HR manager or team lead will set up your goals."
                  />
                ) : (
                  <div className="space-y-4">
                    {myKpis.map(kpi => {
                      const target = Number(kpi.target_value) || 100;
                      const current = Number(kpi.current_value) || 0;
                      const progressPct = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 100;

                      return (
                        <div
                          key={kpi.id}
                          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:border-brand-200 transition"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700">
                                  {kpi.kra_title || 'General KRA'}
                                </span>
                                {getStatusBadge(kpi.status)}
                                {getEvaluationStatusBadge(kpi.evaluation_status, kpi.score)}
                              </div>
                              <h4 className="text-base font-bold text-slate-900">{kpi.title}</h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenSelfEval(kpi)}
                              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                              {kpi.self_rating ? 'Update Self-Evaluation' : 'Self-Evaluate'}
                            </button>
                          </div>

                          {kpi.description && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              {kpi.description}
                            </p>
                          )}

                          {/* Progress bar */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-600">Goal Target & Completion</span>
                              <span className="font-bold text-slate-900">
                                {current} / {target} {kpi.unit} ({progressPct}%)
                              </span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  progressPct >= 100
                                    ? 'bg-emerald-500'
                                    : progressPct >= 50
                                    ? 'bg-brand-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {/* Evaluation Appraisal Card Details */}
                          {(kpi.self_rating || kpi.manager_rating) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              {/* Self Review Box */}
                              {kpi.self_rating && (
                                <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100 text-xs space-y-1">
                                  <div className="flex items-center justify-between text-amber-900 font-bold">
                                    <span className="flex items-center gap-1">
                                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> My Self-Appraisal
                                    </span>
                                    <span className="text-amber-800 font-black">{kpi.self_rating} / 5.0</span>
                                  </div>
                                  <p className="text-[11px] text-amber-800/90 italic">
                                    {kpi.self_comments || 'No written self-comments submitted.'}
                                  </p>
                                </div>
                              )}

                              {/* Manager Appraisal Box */}
                              {kpi.manager_rating ? (
                                <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs space-y-1">
                                  <div className="flex items-center justify-between text-purple-900 font-bold">
                                    <span className="flex items-center gap-1">
                                      <Award className="w-3.5 h-3.5 text-purple-600" /> Manager Evaluation
                                    </span>
                                    <span className="text-purple-800 font-black">
                                      {kpi.manager_rating} / 5.0 • Score: {kpi.score}%
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-purple-800/90">
                                    {kpi.manager_comments || 'Evaluation finalized.'}
                                  </p>
                                </div>
                              ) : (
                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-center text-slate-400 italic">
                                  Awaiting manager review & final score
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                            <span>Weightage: {kpi.weightage}%</span>
                            {kpi.due_date && <span>Deadline: {kpi.due_date}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT KRA (HR Only)                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showKraModal}
        onClose={() => setShowKraModal(false)}
        title={editingKra ? 'Edit Key Result Area (KRA)' : 'Create New Key Result Area (KRA)'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveKra} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">KRA Title *</label>
            <input
              type="text"
              required
              value={kraForm.title}
              onChange={e => setKraForm({ ...kraForm, title: e.target.value })}
              placeholder="e.g. Student Academic Excellence & Course Completion"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description / Strategic Objective</label>
            <textarea
              rows={3}
              value={kraForm.description}
              onChange={e => setKraForm({ ...kraForm, description: e.target.value })}
              placeholder="Outline what success in this strategic area entails..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Department</label>
              <select
                value={kraForm.department}
                onChange={e => setKraForm({ ...kraForm, department: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              >
                <option value="All Departments">All Departments (Organization-Wide)</option>
                {departmentsList.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Evaluation Period</label>
              <input
                type="text"
                value={kraForm.period}
                onChange={e => setKraForm({ ...kraForm, period: e.target.value })}
                placeholder="2026, Q1 2026, etc."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Scope</label>
              <select
                value={kraForm.assigned_to}
                onChange={e => setKraForm({ ...kraForm, assigned_to: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              >
                <option value="ALL">ALL (Applicable to all staff in dept)</option>
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.full_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Weightage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={kraForm.weightage}
                onChange={e => setKraForm({ ...kraForm, weightage: Number(e.target.value) })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
            <select
              value={kraForm.status}
              onChange={e => setKraForm({ ...kraForm, status: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
            >
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Under Review">Under Review</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowKraModal(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingKra}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              {isSavingKra ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editingKra ? 'Update KRA' : 'Save KRA'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT KPI (HR Only)                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showKpiModal}
        onClose={() => setShowKpiModal(false)}
        title={editingKpi ? 'Edit Key Performance Indicator (KPI)' : 'Create New KPI Target'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveKpi} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Parent KRA *</label>
            <select
              required
              value={kpiForm.kra_id}
              onChange={e => setKpiForm({ ...kpiForm, kra_id: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
            >
              <option value="">Select Parent KRA...</option>
              {kras.map(kra => (
                <option key={kra.id} value={kra.id}>
                  {kra.title} ({kra.department} - {kra.period})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Employee *</label>
            <select
              required
              value={kpiForm.employee_id}
              onChange={e => setKpiForm({ ...kpiForm, employee_id: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
            >
              <option value="">Select Assigned Employee...</option>
              {employees.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.full_name} ({emp.employee_id} - {emp.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">KPI Title *</label>
            <input
              type="text"
              required
              value={kpiForm.title}
              onChange={e => setKpiForm({ ...kpiForm, title: e.target.value })}
              placeholder="e.g. 100% Curriculum Syllabus Completion"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
            <textarea
              rows={2}
              value={kpiForm.description}
              onChange={e => setKpiForm({ ...kpiForm, description: e.target.value })}
              placeholder="Metrics, target specifics, evaluation criteria..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Value</label>
              <input
                type="number"
                required
                value={kpiForm.target_value}
                onChange={e => setKpiForm({ ...kpiForm, target_value: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Current Progress</label>
              <input
                type="number"
                value={kpiForm.current_value}
                onChange={e => setKpiForm({ ...kpiForm, current_value: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit</label>
              <input
                type="text"
                value={kpiForm.unit}
                onChange={e => setKpiForm({ ...kpiForm, unit: e.target.value })}
                placeholder="%, tasks, hrs, ₹"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Weightage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiForm.weightage}
                onChange={e => setKpiForm({ ...kpiForm, weightage: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={kpiForm.start_date}
                onChange={e => setKpiForm({ ...kpiForm, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Due Date</label>
              <input
                type="date"
                value={kpiForm.due_date}
                onChange={e => setKpiForm({ ...kpiForm, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowKpiModal(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingKpi}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              {isSavingKpi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editingKpi ? 'Update KPI' : 'Save KPI'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: EMPLOYEE SELF-EVALUATION MODAL                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showSelfEvalModal}
        onClose={() => setShowSelfEvalModal(false)}
        title="Submit Self-Evaluation Appraisal"
        maxWidth="max-w-lg"
      >
        {evaluatingKpi && (
          <form onSubmit={handleSubmitSelfEval} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                {evaluatingKpi.kra_title || 'General KRA'}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">{evaluatingKpi.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{evaluatingKpi.description}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Updated Current Progress ({evaluatingKpi.unit || '%'})
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  required
                  value={selfCurrentValue}
                  onChange={e => setSelfCurrentValue(Number(e.target.value))}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-600"
                />
                <span className="text-xs font-semibold text-slate-500">
                  Target: {evaluatingKpi.target_value} {evaluatingKpi.unit}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Self-Rating (1.0 to 5.0) *</label>
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {selfRating.toFixed(1)} / 5.0
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={selfRating}
                onChange={e => setSelfRating(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1 mt-1">
                <span>1 - Needs Work</span>
                <span>2 - Fair</span>
                <span>3 - Meets Goals</span>
                <span>4 - Exceeds</span>
                <span>5 - Outstanding</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Self Remarks & Deliverables Evidence
              </label>
              <textarea
                rows={3}
                required
                value={selfComments}
                onChange={e => setSelfComments(e.target.value)}
                placeholder="Highlight your key achievements, challenges overcome, and verifiable deliverables..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 resize-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSelfEvalModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingSelfEval}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {isSubmittingSelfEval ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                Submit Self Appraisal
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: MANAGER EVALUATION MODAL (HR / Manager Only)                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showManagerEvalModal}
        onClose={() => setShowManagerEvalModal(false)}
        title="Manager Performance Evaluation & Scoring"
        maxWidth="max-w-lg"
      >
        {managerEvaluatingKpi && (
          <form onSubmit={handleSubmitManagerEval} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                  {managerEvaluatingKpi.kra_title}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {managerEvaluatingKpi.employee_name} ({managerEvaluatingKpi.employee_id})
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 pt-1">{managerEvaluatingKpi.title}</h4>
              <p className="text-xs text-slate-500">
                Progress: {managerEvaluatingKpi.current_value} / {managerEvaluatingKpi.target_value}{' '}
                {managerEvaluatingKpi.unit}
              </p>
            </div>

            {/* Employee's Submitted Self Review (if submitted) */}
            {managerEvaluatingKpi.self_rating ? (
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-amber-900 font-bold">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> Employee Self Rating
                  </span>
                  <span className="font-black text-amber-900">{managerEvaluatingKpi.self_rating} / 5.0</span>
                </div>
                <p className="text-[11px] text-amber-800/90 italic">
                  "{managerEvaluatingKpi.self_comments || 'No comment provided'}"
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 italic">
                Employee has not submitted a self-rating yet. You can evaluate directly.
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Manager Rating (1.0 to 5.0) *
                </label>
                <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                  {managerRating.toFixed(1)} / 5.0
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={managerRating}
                onChange={e => setManagerRating(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1 mt-1">
                <span>1.0 Unsatisfactory</span>
                <span>3.0 Meets Target</span>
                <span>5.0 Exceptional</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Manager Feedback & Appraisal Notes *
              </label>
              <textarea
                rows={3}
                required
                value={managerComments}
                onChange={e => setManagerComments(e.target.value)}
                placeholder="Detailed appraisal notes, coaching recommendations, and performance summary..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Weighted Score (50% Progress + 50% Rating)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={managerScoreOverride !== '' ? managerScoreOverride : calculatedPreviewScore}
                  onChange={e => setManagerScoreOverride(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Calculated: {calculatedPreviewScore}%</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Final Status</label>
                <select
                  value={managerStatus}
                  onChange={e => setManagerStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-600"
                >
                  <option value="Achieved">Achieved</option>
                  <option value="Partially Achieved">Partially Achieved</option>
                  <option value="Missed">Missed</option>
                  <option value="In Progress">In Progress</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManagerEvalModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingManagerEval}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {isSubmittingManagerEval ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Finalize Manager Appraisal
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE CONFIRMATION DIALOG                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(deleteConfirmation)}
        onClose={() => setDeleteConfirmation(null)}
        title={`Confirm Delete ${deleteConfirmation?.type === 'kra' ? 'KRA' : 'KPI'}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete{' '}
            <strong className="text-slate-900">{deleteConfirmation?.title}</strong>?
            {deleteConfirmation?.type === 'kra' && (
              <span className="block mt-1 text-rose-600 font-semibold">
                Warning: Deleting this KRA will also cascade delete all associated employee KPIs.
              </span>
            )}
          </p>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmation(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
