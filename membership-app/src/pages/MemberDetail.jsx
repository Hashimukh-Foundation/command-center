import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext'; // <-- ADDED THIS
import { ArrowLeft, Phone, Mail, ChevronDown, Fingerprint, Target, Settings, ShieldAlert } from 'lucide-react'; // <-- ADDED ShieldAlert

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth(); // <-- ADDED THIS to check current user's role
  
  const [member, setMember] = useState(null);
  const [supervisorName, setSupervisorName] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalDonated, setTotalDonated] = useState(0);
  
  // Accordion state
  const [txOpen, setTxOpen] = useState(true);

  useEffect(() => {
    fetchMemberData();
  }, [id]);

  const requestRemoval = async () => {
    if (!window.confirm("Initiate termination protocol for this operative? The President must verify.")) return;
    
    // PATCHED: Using the secure RPC function to bypass RLS
    const { error } = await supabase.rpc('request_termination', { target_user_id: member.id });
    
    if (error) {
      alert("Request failed: " + error.message);
    } else {
      alert("Termination request forwarded to the President.");
      fetchMemberData(); // Refresh the page data
    }
  };

  const fetchMemberData = async () => {
    // 1. Fetch Member Profile
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single();
    setMember(profileData);

    if (profileData) {
      // 2. Fetch Supervisor Name (if they have one)
      if (profileData.supervisor_id) {
        const { data: supData } = await supabase.from('profiles').select('full_name').eq('id', profileData.supervisor_id).single();
        if (supData) setSupervisorName(supData.full_name);
      }

      // 3. Fetch Transaction History & Total
      const { data: txData } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('member_id', id)
        .order('paid_at', { ascending: false });
      
      if (txData) {
        setTransactions(txData);
        setTotalDonated(txData.reduce((sum, tx) => sum + tx.amount, 0));
      }
    }
  };

  if (!member) {
    return (
      <div className="flex-1 bg-zinc-950 flex flex-col items-center justify-center p-6 h-full font-sans text-zinc-100">
         <Settings size={40} className="text-zinc-700 animate-spin mb-4" />
         <p className="text-zinc-500 text-sm font-medium tracking-wide">Accessing protocol records...</p>
      </div>
    );
  }

  // Safe variable parsing
  const safeFullName = member.full_name || 'Unidentified User';
  const nameParts = safeFullName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  const getInitials = (first, last) => {
    return (first.charAt(0) + (last ? last.charAt(0) : '')).toUpperCase();
  };

  const safeRole = (member.role || 'Unassigned').replace('_', ' ');

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto pb-24 h-full text-zinc-100 font-sans">
      
      {/* Top Nav Bar - Sleek & Flat */}
      <div className="p-4 bg-zinc-950 border-b border-zinc-800 sticky top-0 z-20 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-0.5">Database Protocol</p>
          <h2 className="text-xl font-semibold text-white tracking-tight leading-none">Personnel File</h2>
        </div>
      </div>

      <div className="p-4 space-y-5">

        {/* Main Profile Block - Fintech Aesthetic */}
        <div className="bg-zinc-900/50 text-white p-5 border border-zinc-800 relative overflow-hidden flex items-center gap-5">
            
            <div className="relative z-10 w-20 h-20 shrink-0 border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                <span className="text-3xl font-bold text-zinc-400 tracking-tighter">
                  {getInitials(firstName, lastName)}
                </span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-2 border-zinc-950 bg-emerald-500"></div>
            </div>

            <div className="relative z-10 flex-1 min-w-0">
                <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">
                    Operative ID: {member.id.substring(0, 8).toUpperCase()}
                </p>
                <h1 className="text-2xl font-semibold uppercase tracking-tighter leading-tight mb-2 truncate text-white">
                    {firstName}<br/>
                    <span className="text-zinc-500">{lastName}</span>
                </h1>
                <span className="inline-block bg-blue-500/10 text-blue-400 text-xs font-semibold px-2.5 py-1 uppercase tracking-wider border border-blue-500/20">
                    {member.role === 'executive' && member.department ? `${member.department} Executive` : safeRole}
                </span>
            </div>

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <Fingerprint className="absolute -right-4 -bottom-4 text-zinc-800 opacity-10 w-32 h-32 rotate-12" strokeWidth={1} />
            </div>
        </div>

        {/* Quick Action Grid - Flat & Interactive */}
        <div className="grid grid-cols-2 gap-4">
            <a href={`tel:${member.phone}`} className="bg-zinc-900 border border-zinc-800 p-3.5 flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group">
                <Phone className="text-zinc-500 group-hover:text-emerald-500 mr-3" size={16} />
                <span className="text-sm font-medium tracking-wide text-zinc-300 group-hover:text-white">Secure Line</span>
            </a>
            <a href={`mailto:${member.email}`} className="bg-zinc-900 border border-zinc-800 p-3.5 flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-500/40 transition-all group">
                <Mail className="text-zinc-500 group-hover:text-blue-500 mr-3" size={16} />
                <span className="text-sm font-medium tracking-wide text-zinc-300 group-hover:text-white">Transmit</span>
            </a>
        </div>

        {/* Biometric & Academic Data Box - Clean Info Grid */}
        <div className="bg-zinc-900 border border-zinc-800 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 border-b border-zinc-800 pb-2">
                Biometric & Academic Data
            </h3>
            
            <div className="grid grid-cols-2 gap-y-5 gap-x-2 text-sm">
                <div>
                    <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Secure Line</span>
                    <span className="text-zinc-200 font-medium font-mono">{member.phone || 'UNKNOWN'}</span>
                </div>
                
                <div className="overflow-hidden">
                    <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Electronic Mail</span>
                    <span className="text-blue-400 font-medium truncate block">{member.email || 'N/A'}</span>
                </div>

                <div>
                    <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Blood Group</span>
                    <span className={`font-semibold px-2 py-0.5 inline-block text-xs border ${member.blood_group ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-zinc-500 bg-zinc-800 border-zinc-700'}`}>
                        {member.blood_group || 'UNKNOWN'}
                    </span>
                </div>

                <div>
                    <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Date of Birth</span>
                    <span className="text-zinc-200 font-medium font-mono">{member.date_of_birth || 'CLASSIFIED'}</span>
                </div>

                <div>
                    <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Direct Superior</span>
                    {member.supervisor_id ? (
                        <Link to={`/member/${member.supervisor_id}`} className="text-blue-400 underline decoration-dotted decoration-blue-700 font-semibold hover:text-blue-300">
                            {supervisorName || 'OP_LINK'}
                        </Link>
                    ) : (
                        <span className="text-zinc-600 italic">NONE</span>
                    )}
                </div>

                <div className="col-span-2 border-t border-zinc-800 pt-3.5 mt-1">
                    <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Institution / Base</span>
                    <span className="text-zinc-100 block font-semibold text-base uppercase">{member.institution || 'UNASSIGNED'}</span>
                    <span className="text-zinc-400 text-[10px] mt-1.5 block tracking-wide">{member.field_of_study ? `MAJOR: ${member.field_of_study.toUpperCase()}` : ''}</span>
                </div>
                
                <div className="col-span-2 pt-2">
                    <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Home Address</span>
                    <span className="text-zinc-300 leading-relaxed uppercase text-sm">{member.home_address || 'CLASSIFIED'}</span>
                </div>
            </div>
        </div>

        {/* Lifetime Contribution Banner */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 font-bold mb-1">Lifetime Contribution</p>
                <p className="text-3xl font-mono font-semibold text-white">৳{totalDonated}</p>
            </div>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <Target className="absolute -right-4 top-1/2 -translate-y-1/2 text-emerald-900 opacity-20 w-24 h-24" strokeWidth={2} />
            </div>
        </div>

        {/* Operation History Ledger */}
        <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 pb-2">
                Operation History
            </h3>

            <div className="bg-zinc-900/50 border border-zinc-800">
                <button 
                  onClick={() => setTxOpen(!txOpen)} 
                  className="w-full flex justify-between items-center bg-zinc-900 p-4 focus:outline-none hover:bg-zinc-800 transition-colors"
                >
                    <span className="text-sm font-medium tracking-wide text-zinc-200">Transactions Ledger</span>
                    <ChevronDown className={`text-zinc-500 transition-transform duration-300 ${txOpen ? 'rotate-180' : ''}`} size={16} />
                </button>
                
                <div className={`${txOpen ? 'block' : 'hidden'} max-h-[300px] overflow-y-auto`}>
                    {transactions.length > 0 ? transactions.map((tx, idx) => {
                      const dateObj = new Date(tx.paid_at);
                      return (
                        <div key={idx} className="flex justify-between items-center p-4 border-t border-zinc-800 text-sm font-mono tracking-tight">
                            <span className="text-zinc-300 uppercase">{dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span className="text-emerald-400 font-medium">৳{tx.amount}.00</span>
                        </div>
                      )
                    }) : (
                        <div className="p-6 text-center text-zinc-500 text-sm border-t border-zinc-800">
                            No protocol records found.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* NEW DANGER ZONE - Termination Request */}
        {['admin', 'president', 'convenor'].includes(profile?.role) && member.account_status !== 'terminated' && (
          <div className="mt-8 border-t border-rose-900/50 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-4 flex items-center gap-2">
              <ShieldAlert size={16} /> Danger Zone
            </h3>
            
            {member.account_status === 'pending_removal' ? (
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 text-center">
                <p className="text-sm font-medium text-rose-400">Termination Pending Presidential Review</p>
              </div>
            ) : (
              <button 
                onClick={requestRemoval}
                className="w-full bg-zinc-900 border border-rose-900/50 hover:bg-rose-500/10 hover:border-rose-500/50 text-rose-500 py-3.5 font-medium transition-colors text-sm"
              >
                Request Operative Termination
              </button>
            )}
          </div>
        )}
                    
      </div>
    </div>
  );
}