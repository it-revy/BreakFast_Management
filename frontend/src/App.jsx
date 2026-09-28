import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import Header from './components/Header';

import LoginPage from './pages/LoginPage';
import EmployeeDailyPage from './pages/EmployeeDailyPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import TodayBreakfastListPage from './pages/TodayBreakfastListPage';
import BreakfastOrdersPage from './pages/BreakfastOrdersPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import PublicHolidaysPage from './pages/PublicHolidaysPage';
import ReportsPage from './pages/ReportsPage';
import CEOViewPage from './pages/CEOViewPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';

import DailyEntryPage from './pages/DailyEntryPage';
import AdditionalOrdersPage from './pages/AdditionalOrdersPage';
import BreakfastMoneyPage from './pages/BreakfastMoneyPage';
import FinanceManagerPage from './pages/FinanceManagerPage';

import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';

const ProtectedLayout = ({ children, requiredPermission }) => {
  const { user, loading, hasPermission } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const checkPermission = () => {
    if (!requiredPermission) return true;
    if (Array.isArray(requiredPermission)) {
      return requiredPermission.some(p => hasPermission(p));
    }
    return hasPermission(requiredPermission);
  };

  if (!checkPermission()) {
    return (
      <div className="app-container">
        <ForcePasswordChangeModal />
        <Sidebar isMobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="main-content">
          <Header onToggleMobile={() => setMobileOpen(!mobileOpen)} />
          <div className="page-body">
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>403 - Permission Denied</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Your current role does not have required permissions <code>{JSON.stringify(requiredPermission)}</code> to view this section.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <ForcePasswordChangeModal />
      <Sidebar isMobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="main-content">
        <Header onToggleMobile={() => setMobileOpen(!mobileOpen)} />
        {children}
      </div>
    </div>
  );
};

function AppRoutes() {
  const { user, hasPermission } = useAuth();

  const getHomeRedirect = () => {
    if (!user) return '/login';
    if (hasPermission('breakfast.view')) return '/admin/dashboard';
    if (hasPermission('breakfast.dashboard.view')) return '/ceo-dashboard';
    if (hasPermission('finance.breakfast_fund.view')) return '/finance/fund-requests';
    return '/today';
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getHomeRedirect()} replace /> : <LoginPage />} />

      {/* Common Breakfast Response - Accessible by ANY authenticated user */}
      <Route
        path="/today"
        element={
          <ProtectedLayout>
            <EmployeeDailyPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/response"
        element={
          <ProtectedLayout>
            <EmployeeDailyPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/breakfast-response"
        element={
          <ProtectedLayout>
            <EmployeeDailyPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedLayout requiredPermission="breakfast.view">
            <AdminDashboardPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/daily-entry"
        element={
          <ProtectedLayout requiredPermission="breakfast.view">
            <DailyEntryPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/additional-orders"
        element={
          <ProtectedLayout requiredPermission="breakfast.view">
            <AdditionalOrdersPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/breakfast-money"
        element={
          <ProtectedLayout requiredPermission="breakfast.money.view">
            <BreakfastMoneyPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/finance/fund-requests"
        element={
          <ProtectedLayout requiredPermission="finance.breakfast_fund.view">
            <FinanceManagerPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/today-breakfast"
        element={
          <ProtectedLayout requiredPermission="breakfast.view">
            <TodayBreakfastListPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/today-list"
        element={
          <ProtectedLayout requiredPermission="breakfast.view">
            <TodayBreakfastListPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/orders"
        element={
          <ProtectedLayout requiredPermission="breakfast.view">
            <BreakfastOrdersPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/employees"
        element={
          <ProtectedLayout requiredPermission="breakfast.employee.read">
            <EmployeeManagementPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/holidays"
        element={
          <ProtectedLayout requiredPermission="breakfast.view">
            <PublicHolidaysPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedLayout requiredPermission={['breakfast.report', 'breakfast.money.report']}>
            <ReportsPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/admin/reports"
        element={
          <ProtectedLayout requiredPermission={['breakfast.report', 'breakfast.money.report']}>
            <ReportsPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/ceo-dashboard"
        element={
          <ProtectedLayout requiredPermission="breakfast.dashboard.view">
            <CEOViewPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <ProtectedLayout requiredPermission="breakfast.audit.view">
            <AuditLogsPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedLayout requiredPermission="breakfast.settings.manage">
            <SettingsPage />
          </ProtectedLayout>
        }
      />

      <Route path="*" element={<Navigate to={getHomeRedirect()} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
