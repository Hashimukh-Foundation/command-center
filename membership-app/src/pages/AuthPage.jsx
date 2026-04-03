import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MailCheck, ArrowLeft, UserPlus, LogIn, Lock, ChevronRight, ChevronLeft } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1 = account info, 2 = profile info
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 fields
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [institution, setInstitution] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) alert(result.error.message);
    else navigate('/');
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          blood_group: bloodGroup,
          institution: institution,
          field_of_study: fieldOfStudy,
        }
      }
    });

    setLoading(false);

    if (result.error) {
      alert(result.error.message);
    } else {
      setSubmitted(true);
    }
  };

  const resetSignup = () => {
    setSubmitted(false);
    setIsLogin(true);
    setStep(1);
    setFullName(''); setEmail(''); setPassword('');
    setPhone(''); setBloodGroup(''); setInstitution(''); setFieldOfStudy('');
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
            Verification link sent to <span className="text-emerald-400 font-medium">{email}</span>. Verify your email to gain network access. Your profile is ready to go.
          </p>
          <button
            onClick={resetSignup}
            className="mt-8 text-xs font-medium text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-2 transition-colors border-b border-zinc-800 pb-1"
          >
            <ArrowLeft size={14} /> Back to Login
          </button>
        </div>
      ) : isLogin ? (
        <>
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2 text-blue-500">
              <Lock size={16} strokeWidth={2} />
              <p className="text-xs font-medium uppercase tracking-wider">Auth Gateway</p>
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight leading-none">System Login</h1>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Network Comm (Email)</label>
              <input
                type="email" id="email" name="email" autoComplete="email"
                placeholder="operative@network.com"
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Access Cipher (Password)</label>
              <input
                type="password" id="password" name="password" autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 tracking-widest text-sm"
                value={password} onChange={e => setPassword(e.target.value)} required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 font-medium flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Syncing...' : <><LogIn size={18} /> Initialize</>}
            </button>
          </form>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => { setIsLogin(false); setStep(1); }}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2"
            >
              <ShieldCheck size={16} /> New here? Request Clearance
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2 text-blue-500">
              <Lock size={16} strokeWidth={2} />
              <p className="text-xs font-medium uppercase tracking-wider">New Recruit</p>
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight leading-none mb-1">Create Record</h1>

            <div className="flex items-center gap-2 mt-4">
              <div className={`flex items-center justify-center w-6 h-6 text-xs font-bold border ${step === 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-emerald-600 border-emerald-600 text-white'}`}>1</div>
              <div className={`h-px flex-1 ${step === 2 ? 'bg-blue-600' : 'bg-zinc-700'}`} />
              <div className={`flex items-center justify-center w-6 h-6 text-xs font-bold border ${step === 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-600 text-zinc-500'}`}>2</div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {step === 1 ? 'Step 1 of 2 — Account credentials' : 'Step 2 of 2 — Profile details'}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Operative Name <span className="text-blue-500">*</span></label>
                <input
                  type="text" placeholder="Full legal name"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                  value={fullName} onChange={e => setFullName(e.target.value)} required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Network Comm (Email) <span className="text-blue-500">*</span></label>
                <input
                  type="email" id="signup-email" name="email" autoComplete="email"
                  placeholder="operative@network.com"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Access Cipher (Password) <span className="text-blue-500">*</span></label>
                <input
                  type="password" id="new-password" name="new-password" autoComplete="new-password"
                  placeholder="Minimum 6 characters"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 tracking-widest text-sm"
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 font-medium flex justify-center items-center gap-2 transition-colors mt-2"
              >
                Next: Profile Details <ChevronRight size={18} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Phone Number</label>
                  <input
                    type="tel" placeholder="017XXXXXXXX"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                    value={phone} onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Blood Group</label>
                  <input
                    type="text" placeholder="e.g. O+"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                    value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Institution</label>
                <input
                  type="text" placeholder="University or Company"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                  value={institution} onChange={e => setInstitution(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Field of Study / Role</label>
                <input
                  type="text" placeholder="Major or Department"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                  value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button" onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-3.5 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-medium transition-colors text-sm"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 font-medium flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Establishing...' : <><UserPlus size={18} /> Establish Record</>}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => { setIsLogin(true); setStep(1); }}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2"
            >
              <ShieldCheck size={16} /> Existing Operative? Return to Login
            </button>
          </div>
        </>
      )}
    </div>
  );
}
