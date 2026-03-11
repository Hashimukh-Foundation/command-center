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
  // Deep zinc background for the desktop margins
  <div className="min-h-screen bg-zinc-900 flex justify-center font-sans selection:bg-blue-500 selection:text-white">
    {/* Clean 1px border frame for the mobile view */}
    <div className="w-full max-w-[400px] bg-zinc-950 min-h-screen flex flex-col relative border-x border-zinc-800 shadow-2xl overflow-hidden">
      {children}
    </div>
  </div>
);

const BottomNav = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const isAdmin = ['admin', 'treasurer', 'executive'].includes(profile?.role);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return 'text-blue-500';
    if (path !== '/' && location.pathname.startsWith(path)) return 'text-blue-500';
    return 'text-zinc-500 hover:text-zinc-300';
  };

  return (
    // Sleek, flat bottom nav
    <div className="mt-auto bg-zinc-950 border-t border-zinc-800 flex justify-around px-2 py-3 pb-6 shrink-0 z-50 relative">
      
      <Link to="/" className={`flex flex-col items-center transition-colors ${isActive('/')}`}>
        <Home size={22} strokeWidth={2} />
        <span className="text-[10px] font-medium mt-1">Home</span>
      </Link>
      
      <Link to="/directory" className={`flex flex-col items-center transition-colors ${isActive('/directory')}`}>
        <BookOpen size={22} strokeWidth={2} />
        <span className="text-[10px] font-medium mt-1">List</span>
      </Link>
      
      <Link to="/treasury" className={`flex flex-col items-center transition-colors ${isActive('/treasury')}`}>
        <ReceiptText size={22} strokeWidth={2} />
        <span className="text-[10px] font-medium mt-1">Ledger</span>
      </Link>

      {isAdmin && (
        <Link to="/admin" className={`flex flex-col items-center transition-colors ${isActive('/admin')}`}>
          <Users size={22} strokeWidth={2} />
          <span className="text-[10px] font-medium mt-1">Admin</span>
        </Link>
      )}
      
      <button onClick={() => supabase.auth.signOut()} className="flex flex-col items-center text-rose-500/70 hover:text-rose-500 transition-colors">
        <LogOut size={22} strokeWidth={2} />
        <span className="text-[10px] font-medium mt-1">Log Out</span>
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
  // PATCHED: Added 'executive' to match your BottomNav logic
  if (requireAdmin && !['admin', 'treasurer', 'executive'].includes(profile?.role)) {
    return <Navigate to="/" />;
  }

  // 4. All checks passed. Render the page and the Bottom Nav.
  return <>{children}<BottomNav /></>;
};

export default function App() {
  return (
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