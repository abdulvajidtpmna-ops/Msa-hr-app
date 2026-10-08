import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Clock,
  CheckSquare,
  Calendar,
  DollarSign,
  Briefcase,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PwaInstallBanner } from '../common/PwaInstallBanner';
import { PasswordChangeModal } from '../common/PasswordChangeModal';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isHRManager = user?.role === 'HR Manager';
  const isHRExecutive = user?.role === 'HR Executive';
  const isHR = isHRManager || isHRExecutive;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Home', path: '/dashboard', icon: Home, show: true },
    { label: 'Attendance', path: '/attendance', icon: Clock, show: true },
    { label: 'Daily Tasks', path: '/tasks', icon: CheckSquare, show: true },
    { label: 'Leave & Offs', path: '/leave', icon: Calendar, show: true },
    { label: 'Recruitment', path: '/recruitment', icon: Briefcase, show: isHR },
    { label: 'Staff Directory', path: '/employees', icon: Users, show: isHR },
    { label: 'Payroll & Slips', path: '/payroll', icon: DollarSign, show: true },
    { label: 'Reports', path: '/reports', icon: BarChart3, show: isHR },
    { label: 'Settings', path: '/settings', icon: SettingsIcon, show: isHRManager },
    { label: 'My Profile', path: '/profile', icon: UserIcon, show: true }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-20 md:pb-0">
      {/* PWA Install Banner */}
      <PwaInstallBanner />

      {/* Force Change Password Modal */}
      <PasswordChangeModal />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl md:hidden"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-700 p-1.5 flex items-center justify-center shadow-sm">
                <img src="/logo.png" alt="MSA Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm md:text-base leading-tight text-slate-900">
                  Mastered Skill Academy
                </h1>
                <p className="text-[10px] text-brand-700 font-bold uppercase tracking-wider">
                  HR & Employee Portal
                </p>
              </div>
            </div>
          </div>

          {/* User Profile info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">{user?.name}</p>
              <div className="flex items-center justify-end gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase">{user?.role}</span>
              </div>
            </div>

            <NavLink
              to="/profile"
              className="w-9 h-9 rounded-full bg-brand-100 border border-brand-200 text-brand-800 flex items-center justify-center font-bold text-sm overflow-hidden"
            >
              {user?.photo_url ? (
                <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || 'U'
              )}
            </NavLink>

            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition hidden sm:block"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="w-64 hidden md:block p-4 border-r border-slate-100 bg-white min-h-[calc(100vh-4rem)]">
          <nav className="space-y-1">
            {navItems
              .filter(item => item.show)
              .map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
          </nav>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                <span>Emp ID: {user?.employee_id}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{user?.department}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="w-3/4 max-w-xs h-full bg-white p-4 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-700 p-1.5 flex items-center justify-center">
                    <img src="/logo.png" alt="MSA Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold">MSA HR</h2>
                    <p className="text-[10px] text-slate-500">{user?.employee_id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 flex-1 overflow-y-auto">
                {navItems
                  .filter(item => item.show)
                  .map(item => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                            isActive
                              ? 'bg-brand-600 text-white shadow-md'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>
                    );
                  })}
              </nav>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm rounded-2xl transition"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Main Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb friendly) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              isActive ? 'text-brand-700 font-bold' : 'text-slate-500'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </NavLink>

        <NavLink
          to="/attendance"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              isActive ? 'text-brand-700 font-bold' : 'text-slate-500'
            }`
          }
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px]">Punch</span>
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              isActive ? 'text-brand-700 font-bold' : 'text-slate-500'
            }`
          }
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[10px]">Tasks</span>
        </NavLink>

        <NavLink
          to={isHR ? '/recruitment' : '/leave'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              isActive ? 'text-brand-700 font-bold' : 'text-slate-500'
            }`
          }
        >
          {isHR ? <Briefcase className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
          <span className="text-[10px]">{isHR ? 'Hiring' : 'Leave'}</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-500"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">More</span>
        </button>
      </div>
    </div>
  );
};
