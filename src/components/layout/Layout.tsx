import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useStore';
import { ThemeToggle } from './ThemeToggle';
import { 
  LayoutDashboard, 
  Grid3X3, 
  Gamepad2, 
  History, 
  LogOut,
  User,
  Menu,
  X
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pods', label: 'Pods', icon: Grid3X3 },
  { path: '/consoles', label: 'Consoles', icon: Gamepad2 },
  { path: '/history', label: 'History', icon: History },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0f] md:flex text-slate-900 dark:text-white">
      <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-[#12121a]/95 backdrop-blur border-b border-slate-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-slate-900 dark:text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Game Shop</h1>
              <p className="text-[10px] text-slate-500 dark:text-gray-500 leading-tight">Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="px-2.5 py-2 text-xs" />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="p-2 rounded-lg border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static top-[57px] md:top-0 left-0 z-30 h-[calc(100vh-57px)] md:h-auto w-64 bg-white dark:bg-[#12121a] border-r border-slate-200 dark:border-gray-800 flex flex-col transition-transform duration-200 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
      {/* Sidebar */}
        {/* Logo */}
        <div className="hidden md:block p-6 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-slate-900 dark:text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Game Shop</h1>
              <p className="text-xs text-slate-500 dark:text-gray-500">Management</p>
            </div>
          </div>
          <ThemeToggle className="mt-4 w-full justify-center" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-600 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          
          <button type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full md:ml-0">
        <div className="p-4 pb-24 md:p-6 md:pb-6">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 dark:bg-[#12121a]/95 backdrop-blur border-t border-slate-200 dark:border-gray-800">
        <ul className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex flex-col items-center justify-center py-2 gap-1 text-[11px] ${
                    isActive ? 'text-cyan-400' : 'text-slate-600 dark:text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
