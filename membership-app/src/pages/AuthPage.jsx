import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Terminal, ShieldAlert } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    let result = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });

    setLoading(false);
    if (result.error) alert(result.error.message);
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
          {isLogin ? 'System Login' : 'New Operative'}
        </h1>
        <p className="text-xs font-mono text-slate-500 uppercase mt-2 tracking-widest border-l-2 border-slate-800 pl-2">
          {isLogin ? 'Authenticate to access network' : 'Register clearance credentials'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="flex flex-col gap-5 font-mono">
        {!isLogin && (
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Designation (Full Name)</label>
            <input 
              type="text" 
              placeholder="e.g. JOHN DOE" 
              className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[4px_4px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-2px] focus:shadow-[6px_6px_0px_0px_#3b82f6] transition-all uppercase placeholder-slate-700" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              required 
            />
          </div>
        )}
        
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
          {loading ? 'AUTHENTICATING...' : isLogin ? 'INITIALIZE LINK' : 'ESTABLISH RECORD'}
        </button>
      </form>

      <div className="mt-8 flex justify-center">
        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="text-[10px] font-mono text-slate-500 hover:text-blue-400 uppercase tracking-[0.2em] transition-colors border-b border-transparent hover:border-blue-500 pb-1 flex items-center gap-2"
        >
          <ShieldAlert size={14} />
          {isLogin ? "No clearance? Request access" : "Have clearance? Return to login"}
        </button>
      </div>
    </div>
  );
}