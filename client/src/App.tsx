import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Public Pages
import { LoginPage } from './pages/auth/LoginPage';
import { JobApplyPage } from './pages/public/JobApplyPage';
import { ThankYouPage } from './pages/public/ThankYouPage';

// Protected Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { TasksPage } from './pages/tasks/TasksPage';
import { LeavePage } from './pages/leave/LeavePage';
import { JobsPage } from './pages/recruitment/JobsPage';
import { ApplicationsPage } from './pages/recruitment/ApplicationsPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { PayrollPage } from './pages/payroll/PayrollPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ProfilePage } from './pages/profile/ProfilePage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Recruitment & Apply Routes */}
          <Route path="/apply/:slug" element={<JobApplyPage />} />
          <Route path="/apply/:slug/thank-you" element={<ThankYouPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Internal Portal Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="profile" element={<ProfilePage />} />

            {/* HR Operations */}
            <Route
              path="recruitment"
              element={
                <ProtectedRoute allowedRoles={['HR Manager', 'HR Executive']}>
                  <JobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="recruitment/applications"
              element={
                <ProtectedRoute allowedRoles={['HR Manager', 'HR Executive']}>
                  <ApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees"
              element={
                <ProtectedRoute allowedRoles={['HR Manager', 'HR Executive']}>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['HR Manager', 'HR Executive']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* HR Manager Admin Settings */}
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['HR Manager']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
