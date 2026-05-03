import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { CustomerProtectedRoute } from './components/layout/CustomerProtectedRoute';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/Dashboard';
import { PodsPage } from './pages/Pods';
import { ConsolesPage } from './pages/Consoles';
import { HistoryPage } from './pages/History';
import { BookingsPage } from './pages/Bookings';
import { SetupPage } from './pages/Setup';
import { LandingPage } from './pages/Landing';
import { CustomerAuthPage } from './pages/CustomerAuth';
import { CustomerPortalPage } from './pages/CustomerPortal';
import { useTheme } from './hooks/useTheme';

function App() {
  useTheme();

  useEffect(() => {
    const preventNativeSubmitNavigation = (event: Event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
    };

    // Capture-phase guard to prevent full page reloads from native form submission.
    document.addEventListener('submit', preventNativeSubmitNavigation, true);
    return () => {
      document.removeEventListener('submit', preventNativeSubmitNavigation, true);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/customer/auth" element={<CustomerAuthPage />} />

        <Route element={<CustomerProtectedRoute />}>
          <Route path="/customer/portal" element={<CustomerPortalPage />} />
        </Route>
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pods" element={<PodsPage />} />
            <Route path="/consoles" element={<ConsolesPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/setup" element={<SetupPage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
