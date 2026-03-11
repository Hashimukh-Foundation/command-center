import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Home, Users, LogOut, BookOpen, ReceiptText, Menu, X } from 'lucide-react';
import { supabase } from './supabase';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Directory from './pages/Directory'; 
import MemberDetail from './pages/MemberDetail'; 
import Treasury from './pages/Treasury';
import HierarchyManager from './pages/HierarchyManager';
import Onboarding from './pages/Onboarding';

// --- FIXED TOP NAVIGATION ---
const TopNav = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const isAdmin = ['admin', 'treasurer', 'executive', 'president', 'convenor'].includes(profile?.role);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return 'text-blue-500';
    if (path !== '/' && location.pathname.startsWith(path)) return 'text-blue-500';
    return 'text-zinc-400 hover:text-white';
  };

  const navLinks = (
    <>
      <Link to="/" onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-3 text-sm font-medium transition-colors ${isActive('/')}`}>
        <Home size={18} /> <span className="md:hidden lg:inline">Home</span>
      </Link>
      <Link to="/directory" onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-3 text-sm font-medium transition-colors ${isActive('/directory')}`}>
        <BookOpen size={18} /> <span className="md:hidden lg:inline">Roster</span>
      </Link>
      <Link to="/treasury" onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-3 text-sm font-medium transition-colors ${isActive('/treasury')}`}>
        <ReceiptText size={18} /> <span className="md:hidden lg:inline">Ledger</span>
      </Link>
      {isAdmin && (
        <Link to="/admin" onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-3 text-sm font-medium transition-colors ${isActive('/admin')}`}>
          <Users size={18} /> <span className="md:hidden lg:inline">Admin</span>
        </Link>
      )}
      <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-sm font-medium text-rose-500/80 hover:text-rose-500 transition-colors w-full text-left md:w-auto">
        <LogOut size={18} /> <span className="md:hidden lg:inline">Log Out</span>
      </button>
    </>
  );

  return (
    // Removed the translation classes, locking it at top-0
    <div className="fixed top-0 left-0 right-0 z-50">
      
      {/* Main Nav Bar */}
      <div className="bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 shadow-sm relative z-20">
        <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex-shrink-0 flex items-center gap-2">
              <span className="text-xl font-bold text-white tracking-tight">Binder</span>
            </Link>

            {/* Desktop Nav (Hidden on Mobile) */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {navLinks}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-zinc-400 hover:text-white p-2 transition-colors">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`md:hidden absolute top-16 left-0 w-full bg-zinc-950 border-b border-zinc-800 shadow-2xl transition-all duration-300 origin-top overflow-hidden -z-10 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 border-transparent'}`}>
        <div className="px-6 py-5 space-y-6 flex flex-col bg-zinc-950/95 backdrop-blur-md">
          {navLinks}
        </div>
      </div>

    </div>
  );
};

// --- APP LAYOUT WRAPPER ---
const AppContainer = ({ children }) => (
  <div className="w-full bg-zinc-950 h-screen flex flex-col font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden">
    {children}
  </div>
);

// THE INTERCEPTOR ROUTE
const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user, profile } = useAuth();

  // 1. Not logged in? Kick to login screen.
  if (!user) return <Navigate to="/auth" />;

  // 2. THE ONBOARDING TRAP
  if (user && profile && !profile.full_name) {
    return <Onboarding />;
  }

  // 3. Security Check
  if (requireAdmin && !['admin', 'treasurer', 'executive', 'president', 'convenor'].includes(profile?.role)) {
    return <Navigate to="/" />;
  }

  // 4. All checks passed. Render TopNav, pt-16 ensures content doesn't load underneath it
  return (
    <>
      <TopNav />
      {/* pt-16 ensures the content gets pushed down below the fixed navbar */}
      <div className="flex-1 flex flex-col pt-16 overflow-hidden">
        {children}
      </div>
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContainer>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/directory" element={<ProtectedRoute><Directory /></ProtectedRoute>} />
            <Route path="/member/:id" element={<ProtectedRoute><MemberDetail /></ProtectedRoute>} />
            <Route path="/treasury" element={<ProtectedRoute><Treasury /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminPanel /></ProtectedRoute>} />
            <Route path="/admin/hierarchy" element={<ProtectedRoute requireAdmin={true}><HierarchyManager /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AppContainer>
      </AuthProvider>
    </BrowserRouter>
  );
}