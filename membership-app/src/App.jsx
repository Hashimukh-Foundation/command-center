import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Home, Users, LogOut, BookOpen, ReceiptText } from 'lucide-react';
import { supabase } from './supabase';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Directory from './pages/Directory'; 
import MemberDetail from './pages/MemberDetail'; 
import Treasury from './pages/Treasury';
import HierarchyManager from './pages/HierarchyManager';
import Onboarding from './pages/Onboarding';

const MobileContainer = ({ children }) => (
  // Deep slate background for the desktop margins
  <div className="min-h-screen bg-slate-900 flex justify-center font-sans selection:bg-blue-500 selection:text-white">
    {/* Heavy border frame for the mobile view */}
    <div className="w-full max-w-[400px] bg-slate-950 min-h-screen flex flex-col relative border-x-4 border-slate-950 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
      {children}
    </div>
  </div>
);

const BottomNav = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'treasurer';

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return 'text-blue-500 translate-y-[-2px]';
    if (path !== '/' && location.pathname.startsWith(path)) return 'text-blue-500 translate-y-[-2px]';
    return 'text-slate-600 hover:text-slate-400';
  };

  return (
    <div className="mt-auto bg-slate-950 border-t-4 border-slate-900 flex justify-around p-3 pb-6 shrink-0 z-50 relative shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      
      <Link to="/" className={`flex flex-col items-center transition-all duration-200 ${isActive('/')}`}>
        <Home size={22} className="mb-1" strokeWidth={2.5} />
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Home</span>
      </Link>
      
      <Link to="/directory" className={`flex flex-col items-center transition-all duration-200 ${isActive('/directory')}`}>
        <BookOpen size={22} className="mb-1" strokeWidth={2.5} />
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Roster</span>
      </Link>
      
      <Link to="/treasury" className={`flex flex-col items-center transition-all duration-200 ${isActive('/treasury')}`}>
        <ReceiptText size={22} className="mb-1" strokeWidth={2.5} />
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Ledger</span>
      </Link>

      {isAdmin && (
        <Link to="/admin" className={`flex flex-col items-center transition-all duration-200 ${isActive('/admin')}`}>
          <Users size={22} className="mb-1" strokeWidth={2.5} />
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Admin</span>
        </Link>
      )}
      
      <button onClick={() => supabase.auth.signOut()} className="flex flex-col items-center text-rose-900 hover:text-rose-500 hover:translate-y-[-2px] transition-all duration-200">
        <LogOut size={22} className="mb-1" strokeWidth={2.5} />
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Abort</span>
      </button>
      
    </div>
  );
};

// THE INTERCEPTOR ROUTE
const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user, profile } = useAuth();

  // 1. Not logged in? Kick to login screen.
  if (!user) return <Navigate to="/auth" />;

  // 2. THE ONBOARDING TRAP: Are they logged in but missing a name?
  if (user && profile && !profile.full_name) {
    // Render the Onboarding screen ONLY. No bottom navigation. 
    return <Onboarding />;
  }

  // 3. Security Check: Are they trying to access an Admin route without clearance?
  if (requireAdmin && profile?.role !== 'admin' && profile?.role !== 'treasurer') {
    return <Navigate to="/" />;
  }

  // 4. All checks passed. Render the page and the Bottom Nav.
  return <>{children}<BottomNav /></>;
};

export default function App() {
  return (
    // FIX: BrowserRouter is now the absolute top-level wrapper
    <BrowserRouter>
      <AuthProvider>
        <MobileContainer>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            
            {/* All protected routes run through our interceptor */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/directory" element={<ProtectedRoute><Directory /></ProtectedRoute>} />
            <Route path="/member/:id" element={<ProtectedRoute><MemberDetail /></ProtectedRoute>} />
            <Route path="/treasury" element={<ProtectedRoute><Treasury /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminPanel /></ProtectedRoute>} />
            <Route path="/admin/hierarchy" element={<ProtectedRoute requireAdmin={true}><HierarchyManager /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </MobileContainer>
      </AuthProvider>
    </BrowserRouter>
  );
}