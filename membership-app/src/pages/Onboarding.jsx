import { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Terminal, ShieldCheck, UserPlus, Fingerprint } from 'lucide-react';

export default function Onboarding() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [institution, setInstitution] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');

  const handleSetup = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Establish the Access Cipher (Password)
    if (password) {
      const { error: authError } = await supabase.auth.updateUser({ password: password });
      if (authError) {
        alert("CIPHER REJECTED: " + authError.message);
        setLoading(false);
        return;
      }
    }

    // 2. Upload Operative Parameters to Database
    const payload = {
      full_name: fullName,
      phone: phone,
      blood_group: bloodGroup,
      institution: institution,
      field_of_study: fieldOfStudy,
    };

    const { error: profileError } = await supabase.from('profiles').update(payload).eq('id', user.id);
    
    setLoading(false);

    if (profileError) {
      alert("UPLOAD FAILED: " + profileError.message);
    } else {
      // Force a full page reload to clear caches and drop them into the main Command Center
      window.location.href = '/';
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-950 min-h-screen selection:bg-blue-500 selection:text-white relative overflow-y-auto">
      
      {/* Background Decor */}
      <Fingerprint className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-800 opacity-10 w-96 h-96 pointer-events-none" strokeWidth={0.5} />

      <div className="w-full max-w-2xl bg-slate-900 border-2 border-slate-700 shadow-[8px_8px_0px_0px_#020617] relative z-10 p-8">
        
        {/* Header */}
        <div className="mb-8 border-b-2 border-slate-800 pb-4">
          <div className="flex items-center gap-2 mb-2 text-emerald-500">
            <Terminal size={20} strokeWidth={2.5} />
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] font-bold">
              // INITIALIZATION_PROTOCOL
            </p>
          </div>
          <h1 className="text-3xl font-black uppercase text-slate-100 tracking-tighter leading-none flex items-center gap-3">
            <UserPlus size={28} className="text-slate-500" /> New Operative Setup
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase mt-3 tracking-widest border-l-2 border-emerald-500 pl-2">
            Clearance accepted. Establish identity parameters and access cipher to proceed.
          </p>
        </div>

        <form onSubmit={handleSetup} className="flex flex-col gap-5 font-mono">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Required Identity Section */}
            <div className="md:col-span-2 bg-slate-950 p-4 border border-slate-800">
              <label className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest block mb-2">Primary Designation (Required)</label>
              <input 
                type="text" 
                placeholder="FULL LEGAL NAME" 
                className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 focus:translate-y-[-2px] transition-all uppercase placeholder-slate-600" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                required 
              />
            </div>

            {/* Required Security Section */}
            <div className="md:col-span-2 bg-slate-950 p-4 border border-slate-800">
              <label className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest block mb-2">Permanent Access Cipher (Required)</label>
              <input 
                type="password" 
                placeholder="SET PASSWORD (MIN 6 CHARACTERS)" 
                className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 focus:translate-y-[-2px] transition-all placeholder-slate-600 tracking-widest" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                minLength={6}
              />
              <p className="text-[9px] text-slate-500 mt-2 tracking-widest uppercase">You will use this to log in moving forward.</p>
            </div>

            {/* Optional Biometrics */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Secure Line (Phone)</label>
              <input 
                type="tel" 
                placeholder="017XXXXXXXX" 
                className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 transition-all uppercase placeholder-slate-600" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Blood Group</label>
              <input 
                type="text" 
                placeholder="E.G. O+" 
                className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 transition-all uppercase placeholder-slate-600" 
                value={bloodGroup} 
                onChange={e => setBloodGroup(e.target.value)} 
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Institution</label>
              <input 
                type="text" 
                placeholder="UNIVERSITY / COMPANY" 
                className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 transition-all uppercase placeholder-slate-600" 
                value={institution} 
                onChange={e => setInstitution(e.target.value)} 
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Field of Study / Role</label>
              <input 
                type="text" 
                placeholder="MAJOR / DEPARTMENT" 
                className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 transition-all uppercase placeholder-slate-600" 
                value={fieldOfStudy} 
                onChange={e => setFieldOfStudy(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 border-2 border-emerald-500 text-slate-950 p-4 font-black uppercase tracking-widest mt-6 shadow-[4px_4px_0px_0px_#064e3b] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#064e3b] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? 'UPLOADING TO MAINFRAME...' : <><ShieldCheck size={18}/> FINALIZE REGISTRATION</>}
          </button>
        </form>
      </div>
    </div>
  );
}