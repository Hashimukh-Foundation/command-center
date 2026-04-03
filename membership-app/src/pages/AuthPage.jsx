import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MailCheck, ArrowLeft, UserPlus, LogIn, ChevronRight, ChevronLeft } from 'lucide-react';

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
    // Main background: Full height, centers the card on all screens
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-8 bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      
      {/* Responsive Card Container */}
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
        
        {submitted ? (
          <div className="p-8 sm:p-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
              <MailCheck size={36} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-3">Check your email</h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-8">
              We've sent a verification link to <span className="text-emerald-400 font-medium">{email}</span>. Please verify your email to continue.
            </p>
            <button
              onClick={resetSignup}
              className="text-sm font-medium text-zinc-400 hover:text-white flex items-center gap-2 transition-colors py-2 px-4 rounded-lg hover:bg-zinc-800"
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
          </div>
        ) : (
          <>
            {/* Clear Tab Navigation */}
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => { setIsLogin(true); setStep(1); }}
                className={`flex-1 py-4 text-sm font-medium transition-all ${
                  isLogin 
                    ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setIsLogin(false); setStep(1); }}
                className={`flex-1 py-4 text-sm font-medium transition-all ${
                  !isLogin 
                    ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form Container */}
            <div className="p-6 sm:p-8">
              <div className="mb-8 text-center">
                <div className="flex justify-center mb-3 text-blue-500">
                  <ShieldCheck size={28} strokeWidth={1.5} />
                </div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">
                  {isLogin ? 'Welcome back' : 'Create an account'}
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                  {isLogin ? 'Enter your credentials to access the system.' : 'Join the network to get started.'}
                </p>
              </div>

              {isLogin ? (
                /* LOGIN FORM */
                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Email Address</label>
                    <input
                      type="email" id="email" name="email" autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                      value={email} onChange={e => setEmail(e.target.value)} required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Password</label>
                    <input
                      type="password" id="password" name="password" autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 tracking-widest text-sm"
                      value={password} onChange={e => setPassword(e.target.value)} required
                    />
                  </div>
                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3 font-medium flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-2 shadow-lg shadow-blue-500/20"
                  >
                    {loading ? 'Authenticating...' : <><LogIn size={18} /> Sign In</>}
                  </button>
                </form>
              ) : (
                /* SIGNUP FORM */
                <>
                  {/* Step Progress Indicator */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${step === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'}`}>1</div>
                    <div className={`h-1 flex-1 rounded-full transition-colors ${step === 2 ? 'bg-blue-600' : 'bg-zinc-800'}`} />
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${step === 2 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>2</div>
                  </div>

                  {step === 1 ? (
                    <form onSubmit={handleNextStep} className="flex flex-col gap-4 animate-in slide-in-from-right-4 fade-in duration-300">
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Full Name <span className="text-blue-500">*</span></label>
                        <input
                          type="text" placeholder="John Doe"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                          value={fullName} onChange={e => setFullName(e.target.value)} required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Email Address <span className="text-blue-500">*</span></label>
                        <input
                          type="email" id="signup-email" name="email" autoComplete="email"
                          placeholder="you@example.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                          value={email} onChange={e => setEmail(e.target.value)} required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Password <span className="text-blue-500">*</span></label>
                        <input
                          type="password" id="new-password" name="new-password" autoComplete="new-password"
                          placeholder="Minimum 6 characters"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 tracking-widest text-sm"
                          value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3 font-medium flex justify-center items-center gap-2 transition-colors mt-4 shadow-lg shadow-blue-500/20"
                      >
                        Continue <ChevronRight size={18} />
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleSignUp} className="flex flex-col gap-4 animate-in slide-in-from-right-4 fade-in duration-300">
                      {/* Responsive Grid: Stacks on mobile, side-by-side on screens sm and up */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Phone Number</label>
                          <input
                            type="tel" placeholder="017XXXXXXXX"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                            value={phone} onChange={e => setPhone(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Blood Group</label>
                          <input
                            type="text" placeholder="e.g. O+"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                            value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Institution</label>
                        <input
                          type="text" placeholder="University or Company"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                          value={institution} onChange={e => setInstitution(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Field of Study / Role</label>
                        <input
                          type="text" placeholder="Major or Department"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600 text-sm"
                          value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          type="button" onClick={() => setStep(1)}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 font-medium transition-colors text-sm"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          type="submit" disabled={loading}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3 font-medium flex justify-center items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
                        >
                          {loading ? 'Creating...' : <><UserPlus size={18} /> Complete Sign Up</>}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}