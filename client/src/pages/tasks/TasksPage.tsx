import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Link as LinkIcon,
  MessageSquare,
  Users,
  Calendar,
  Filter,
  Eye,
  Check,
  RotateCcw
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Task, Employee } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR Manager' || user?.role === 'HR Executive';

  const [activeTab, setActiveTab] = useState<'my-tasks' | 'team-tasks'>('my-tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [assignedTo, setAssignedTo] = useState(user?.employee_id || '');
  const [category, setCategory] = useState('General');
  const [isCreating, setIsCreating] = useState(false);

  // Mark Done Modal (Requires Evidence & Remark)
  const [selectedTaskForDone, setSelectedTaskForDone] = useState<Task | null>(null);
  const [completionRemark, setCompletionRemark] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // HR Review Modal
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<Task | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Needs Rework'>('Approved');
  const [reviewRemark, setReviewRemark] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'my-tasks') {
        const res = await api.get<{ success: boolean; tasks: Task[] }>('/tasks/my-tasks');
        if (res.success) setTasks(res.tasks);
      } else {
        const res = await api.get<{ success: boolean; tasks: Task[] }>('/tasks/team-tasks');
        if (res.success) setTasks(res.tasks);
      }
    } catch (e) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (isHR) {
      api.get<{ success: boolean; employees: Employee[] }>('/employees').then(res => {
        if (res.success) setEmployees(res.employees);
      });
    }
  }, [activeTab]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await api.post('/tasks', {
        title,
        description,
        task_date: taskDate,
        due_date: dueDate,
        priority,
        category,
        assigned_to: assignedTo
      });
      if (res.success) {
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        fetchTasks();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkDone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForDone) return;
    if (!completionRemark) {
      alert('Completion remark is mandatory');
      return;
    }
    if (!evidenceFile && !evidenceLink) {
      alert('Please upload an evidence file or enter an evidence link to mark as Done.');
      return;
    }

    setIsCompleting(true);
    try {
      const formData = new FormData();
      formData.append('status', 'Done');
      formData.append('remark', completionRemark);
      if (evidenceLink) formData.append('evidence_links', evidenceLink);
      if (evidenceFile) formData.append('evidence_files', evidenceFile);

      const res = await api.put(`/tasks/${selectedTaskForDone.id}/status`, formData);
      if (res.success) {
        setSelectedTaskForDone(null);
        setCompletionRemark('');
        setEvidenceFile(null);
        setEvidenceLink('');
        fetchTasks();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReviewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForReview) return;

    setIsReviewing(true);
    try {
      const res = await api.post(`/tasks/${selectedTaskForReview.id}/review`, {
        review_status: reviewStatus,
        review_remark: reviewRemark
      });
      if (res.success) {
        setSelectedTaskForReview(null);
        setReviewRemark('');
        fetchTasks();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setIsReviewing(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-brand-600" /> Daily Work & Task Tracker
          </h2>
          <p className="text-xs text-slate-500">Track daily work output with required photo/link evidence</p>
        </div>

        <div className="flex items-center gap-2">
          {isHR && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('my-tasks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'my-tasks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                My Tasks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('team-tasks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'team-tasks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Team Tasks
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
          <option value="Blocked">Blocked</option>
        </select>

        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Task Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description="No tasks match your current filter criteria. Create your first task to get started."
          actionText="Add a Task"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition ${
                task.status === 'Done' ? 'border-slate-100 opacity-90' : 'border-slate-200 hover:border-brand-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                      task.priority === 'High'
                        ? 'bg-rose-100 text-rose-700'
                        : task.priority === 'Medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.priority} Priority
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      task.status === 'Done'
                        ? 'bg-emerald-100 text-emerald-700'
                        : task.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 line-clamp-2">{task.title}</h3>
                {task.description && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{task.description}</p>
                )}

                {activeTab === 'team-tasks' && task.assignee_name && (
                  <p className="text-[11px] text-brand-700 font-semibold mt-2">
                    Assigned to: {task.assignee_name}
                  </p>
                )}

                {task.completion_remark && (
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
                    <p className="font-bold text-[10px] text-slate-400 uppercase">Completion Remark:</p>
                    <p className="mt-0.5">{task.completion_remark}</p>
                  </div>
                )}

                {task.review_status && task.review_status !== 'Pending Review' && (
                  <div className="mt-2 text-[11px] font-bold flex items-center gap-1 text-purple-700">
                    <span>Review: {task.review_status}</span>
                    {task.review_remark && <span className="text-slate-500 font-normal">({task.review_remark})</span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-medium">Due: {task.due_date}</span>

                <div className="flex items-center gap-2">
                  {task.status !== 'Done' && (
                    <button
                      type="button"
                      onClick={() => setSelectedTaskForDone(task)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      <Check className="w-3.5 h-3.5 inline mr-1" /> Mark Done
                    </button>
                  )}

                  {isHR && task.status === 'Done' && (
                    <button
                      type="button"
                      onClick={() => setSelectedTaskForReview(task)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Conduct Node.js batch 10 workshop"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide details about expected output..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {isHR && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign To Staff Member</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.full_name} ({emp.employee_id}) - {emp.designation}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isCreating ? 'Creating Task...' : 'Create & Assign Task'}
          </button>
        </form>
      </Modal>

      {/* Mark Done Modal (Evidence & Mandatory Remark) */}
      <Modal
        isOpen={!!selectedTaskForDone}
        onClose={() => setSelectedTaskForDone(null)}
        title="Complete Task with Evidence"
      >
        <form onSubmit={handleMarkDone} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-900">{selectedTaskForDone?.title}</p>
            <p className="text-[11px] text-slate-500">Provide completion evidence (photo/document/link) and a remark.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Completion Remark (Mandatory) *</label>
            <textarea
              required
              rows={2}
              value={completionRemark}
              onChange={e => setCompletionRemark(e.target.value)}
              placeholder="Explain how the task was completed..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Upload Photo / Document Evidence</label>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={e => setEvidenceFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Or Online Evidence URL / Link</label>
            <input
              type="url"
              value={evidenceLink}
              onChange={e => setEvidenceLink(e.target.value)}
              placeholder="https://drive.google.com/... or github.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isCompleting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isCompleting ? 'Submitting Evidence...' : 'Submit Evidence & Mark as Done'}
          </button>
        </form>
      </Modal>

      {/* HR Review Modal */}
      <Modal
        isOpen={!!selectedTaskForReview}
        onClose={() => setSelectedTaskForReview(null)}
        title="Review Completed Task"
      >
        <form onSubmit={handleReviewTask} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-2xl">
            <p className="text-xs font-bold text-slate-900">{selectedTaskForReview?.title}</p>
            <p className="text-[11px] text-slate-600 mt-1">Remark: {selectedTaskForReview?.completion_remark || 'None'}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Review Decision</label>
            <select
              value={reviewStatus}
              onChange={e => setReviewStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="Approved">Approved (Task verified)</option>
              <option value="Needs Rework">Needs Rework (Reopen task)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Review Remarks</label>
            <textarea
              rows={2}
              value={reviewRemark}
              onChange={e => setReviewRemark(e.target.value)}
              placeholder="Provide feedback or reasons..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isReviewing}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition"
          >
            {isReviewing ? 'Saving Review...' : 'Save Review'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
