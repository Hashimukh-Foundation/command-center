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

  // Helper function to apply the Cyber Blue highlight if the route is active
  const isActive = (path) => {
    // Exact match for home, starts-with for dynamic routes like member detail
    if (path === '/' && location.pathname === '/') return 'text-blue-500 translate-y-[-2px]';
    if (path !== '/' && location.pathname.startsWith(path)) return 'text-blue-500 translate-y-[-2px]';
    return 'text-slate-600 hover:text-slate-400';
  };

  return (
    // Brutalist bottom nav with thick top border and shadow
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
      
      {/* Logout gets a distinct danger styling */}
      <button onClick={() => supabase.auth.signOut()} className="flex flex-col items-center text-rose-900 hover:text-rose-500 hover:translate-y-[-2px] transition-all duration-200">
        <LogOut size={22} className="mb-1" strokeWidth={2.5} />
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Abort</span>
      </button>
      
    </div>
  );
};

const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user, profile } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  if (requireAdmin && profile?.role !== 'admin' && profile?.role !== 'treasurer') return <Navigate to="/" />;
  return <>{children}<BottomNav /></>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MobileContainer>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/directory" element={<ProtectedRoute><Directory /></ProtectedRoute>} />
            <Route path="/member/:id" element={<ProtectedRoute><MemberDetail /></ProtectedRoute>} />
            <Route path="/treasury" element={<ProtectedRoute><Treasury /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminPanel /></ProtectedRoute>} />
            <Route path="/admin/hierarchy" element={<ProtectedRoute requireAdmin={true}><HierarchyManager /></ProtectedRoute>} />
            {/* Catch-all route to redirect back home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </MobileContainer>
      </BrowserRouter>
    </AuthProvider>
  );
}