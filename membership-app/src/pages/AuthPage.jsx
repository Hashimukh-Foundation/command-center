import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Terminal, ShieldAlert } from 'lucide-react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) alert(error.message);
    else navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col justify-center p-8 bg-slate-950 h-full selection:bg-blue-500 selection:text-white relative overflow-hidden">
      
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/30"></div>
      
      {/* Tactical Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2 text-blue-500">
          <Terminal size={20} strokeWidth={2.5} />
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold">
            // SECURE_GATEWAY
          </p>
        </div>
        <h1 className="text-4xl font-black uppercase text-slate-100 tracking-tighter leading-none">
          System Login
        </h1>
        <p className="text-xs font-mono text-slate-500 uppercase mt-2 tracking-widest border-l-2 border-slate-800 pl-2">
          Authenticate to access network
        </p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-5 font-mono">
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Network Comm (Email)</label>
          <input 
            type="email" 
            placeholder="OPERATIVE@NETWORK.COM" 
            className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[4px_4px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-2px] focus:shadow-[6px_6px_0px_0px_#3b82f6] transition-all uppercase placeholder-slate-700" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Access Cipher (Password)</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[4px_4px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-2px] focus:shadow-[6px_6px_0px_0px_#3b82f6] transition-all placeholder-slate-700 tracking-widest" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 border-2 border-blue-500 text-white p-4 font-black uppercase tracking-widest mt-4 shadow-[4px_4px_0px_0px_#1e3a8a] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1e3a8a] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'AUTHENTICATING...' : 'INITIALIZE LINK'}
        </button>
      </form>

      {/* Replaced the toggle button with a static security notice */}
      <div className="mt-8 flex justify-center">
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 text-center max-w-[250px] leading-relaxed">
          <ShieldAlert size={14} className="shrink-0" />
          Unidentified personnel must request clearance from Command Level directly.
        </p>
      </div>
    </div>
  );
}