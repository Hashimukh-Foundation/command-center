import { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { ShieldCheck, UserPlus, Fingerprint } from 'lucide-react';

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
        alert("Password setup failed: " + authError.message);
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
      alert("Profile update failed: " + profileError.message);
    } else {
      // Force a full page reload to clear caches and drop them into the main Command Center
      window.location.href = '/';
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-6 bg-zinc-950 min-h-screen text-zinc-100 font-sans relative overflow-y-auto">
      
      {/* Background Decor - Subtle & Professional */}
      <Fingerprint className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-800 opacity-10 w-96 h-96 pointer-events-none" strokeWidth={0.5} />

      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 shadow-2xl relative z-10 p-8">
        
        {/* Sleek Header */}
        <div className="mb-8 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-2 mb-2 text-emerald-500">
            <UserPlus size={18} strokeWidth={2} />
            <p className="text-xs font-medium uppercase tracking-wider">
              New Recruit Setup
            </p>
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight leading-none mb-3">
            Complete Your Profile
          </h1>
          <p className="text-sm text-zinc-400">
            Clearance accepted. Please provide your details and establish a secure password to access the network.
          </p>
        </div>

        <form onSubmit={handleSetup} className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Required Identity Section */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Full Legal Name <span className="text-emerald-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="John Doe" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder-zinc-600 text-sm" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                required 
              />
            </div>

            {/* Required Security Section */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Access Password <span className="text-emerald-500">*</span>
              </label>
              <input 
                type="password" 
                id="new-password"
                name="new-password"
                autoComplete="new-password"
                placeholder="Minimum 6 characters" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder-zinc-600 tracking-widest text-sm" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                minLength={6}
              />
              <p className="text-xs text-zinc-500 mt-2">You will use this password to log in moving forward.</p>
            </div>

            {/* Optional Biometrics */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Phone Number</label>
              <input 
                type="tel" 
                placeholder="017XXXXXXXX" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Blood Group</label>
              <input 
                type="text" 
                placeholder="e.g. O+" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm" 
                value={bloodGroup} 
                onChange={e => setBloodGroup(e.target.value)} 
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Institution</label>
              <input 
                type="text" 
                placeholder="University or Company" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm" 
                value={institution} 
                onChange={e => setInstitution(e.target.value)} 
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Field of Study / Role</label>
              <input 
                type="text" 
                placeholder="Major or Department" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm" 
                value={fieldOfStudy} 
                onChange={e => setFieldOfStudy(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 font-medium flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Saving Setup...' : <><ShieldCheck size={18}/> Finalize Setup</>}
          </button>
        </form>
      </div>
    </div>
  );
}