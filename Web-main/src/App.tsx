import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useContext } from 'react';
import { AppProvider } from './context/AppContext';
import { ToastProvider, ToastContext } from './context/ToastContext';
import { ToastContainer } from './components/ui/Toast';
import { HomePage } from './components/HomePage';
import { WorkerDashboard } from './pages/worker/WorkerDashboard';
import { FindJobsPage } from './pages/worker/FindJobsPage';
import { WorkerSchedulePage } from './pages/worker/WorkerSchedulePage';
import { WorkerProfilePage } from './pages/worker/WorkerProfilePage';
import { EmployerDashboard } from './pages/employer/EmployerDashboard';
import { CreateShiftPage } from './pages/employer/CreateShiftPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';

function AppContent() {
  const context = useContext(ToastContext);
  const toasts = context?.toasts || [];
  const removeToast = context?.removeToast || (() => {});

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />

          {/* Worker Routes */}
          <Route path="/worker/dashboard" element={<WorkerDashboard />} />
          <Route path="/worker/jobs" element={<FindJobsPage />} />
          <Route path="/worker/schedule" element={<WorkerSchedulePage />} />
          <Route path="/worker/profile" element={<WorkerProfilePage />} />
          <Route path="/worker/notifications" element={<WorkerDashboard />} />
          <Route path="/worker/wallet" element={<WorkerProfilePage />} />

          {/* Employer Routes */}
          <Route path="/employer/dashboard" element={<EmployerDashboard />} />
          <Route path="/employer/create-shift" element={<CreateShiftPage />} />
          <Route path="/employer/shifts" element={<EmployerDashboard />} />
          <Route path="/employer/schedule" element={<EmployerDashboard />} />
          <Route path="/employer/profile" element={<EmployerDashboard />} />
          <Route path="/employer/notifications" element={<EmployerDashboard />} />
          <Route path="/employer/wallet" element={<EmployerDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/disputes" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminDashboard />} />
          <Route path="/admin/shifts" element={<AdminDashboard />} />
          <Route path="/admin/verification" element={<AdminDashboard />} />
          <Route path="/admin/reports" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
