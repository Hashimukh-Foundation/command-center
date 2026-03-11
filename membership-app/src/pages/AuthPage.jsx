import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MailCheck, ArrowLeft, UserPlus, LogIn, Lock } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let result;

    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: { full_name: fullName } } 
      });
    }

    setLoading(false);
    
    if (result.error) {
      alert(result.error.message);
    } else {
      if (!isLogin) {
        setSubmitted(true);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center p-8 bg-zinc-950 h-full text-zinc-100 font-sans relative overflow-hidden">
      
      {submitted ? (
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6">
            <MailCheck size={36} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight mb-3">Account Initialized</h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px]">
            Verification link sent to <span className="text-emerald-400 font-medium">{email}</span>. You must verify before gaining network access.
          </p>
          <button 
            onClick={() => { setSubmitted(false); setIsLogin(true); }}
            className="mt-8 text-xs font-medium text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-2 transition-colors border-b border-zinc-800 pb-1"
          >
            <ArrowLeft size={14} /> Back to Login
          </button>
        </div>
      ) : (
        <>
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2 text-blue-500">
              <Lock size={16} strokeWidth={2} />
              <p className="text-xs font-medium uppercase tracking-wider">
                {isLogin ? 'Auth Gateway' : 'New Recruit'}
              </p>
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight leading-none">
              {isLogin ? 'System Login' : 'Create Record'}
            </h1>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-5">
            {!isLogin && (
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Operative Name</label>
                <input 
                  type="text" 
                  placeholder="Full legal name" 
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required 
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Network Comm (Email)</label>
              <input 
                type="email" 
                id='email'
                name='email'
                autoComplete='email'
                placeholder="operative@network.com" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Access Cipher (Password)</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                id='password'
                name='password'
                autoComplete='current-password'
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 tracking-widest text-sm" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 font-medium flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Syncing...' : isLogin ? <><LogIn size={18}/> Initialize</> : <><UserPlus size={18}/> Establish Record</>}
            </button>
          </form>

          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2"
            >
              <ShieldCheck size={16} />
              {isLogin ? "New here? Request Clearance" : "Existing Operative? Return to Login"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}