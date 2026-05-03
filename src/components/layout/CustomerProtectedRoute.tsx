import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCustomerStore } from '@/store/useCustomerStore';

export function CustomerProtectedRoute() {
  const { customer, isCheckingSession, checkSession } = useCustomerStore();

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/customer/auth" replace />;
  }

  return <Outlet />;
}
