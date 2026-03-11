import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext'; 
import { ArrowLeft, Phone, Mail, ChevronDown, Fingerprint, Target, Settings, ShieldAlert, FileText } from 'lucide-react'; 

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth(); 
  
  const [member, setMember] = useState(null);
  const [supervisorName, setSupervisorName] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalDonated, setTotalDonated] = useState(0);
  
  const [txOpen, setTxOpen] = useState(true);

  useEffect(() => {
    fetchMemberData();
  }, [id]);

  const requestRemoval = async () => {
    if (!window.confirm("Initiate termination protocol for this operative? The President must verify.")) return;
    
    const { error } = await supabase.rpc('request_termination', { target_user_id: member.id });
    
    if (error) {
      alert("Request failed: " + error.message);
    } else {
      alert("Termination request forwarded to the President.");
      fetchMemberData(); 
    }
  };

  const fetchMemberData = async () => {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single();
    setMember(profileData);

    if (profileData) {
      if (profileData.supervisor_id) {
        const { data: supData } = await supabase.from('profiles').select('full_name').eq('id', profileData.supervisor_id).single();
        if (supData) setSupervisorName(supData.full_name);
      }

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

  const safeFullName = member.full_name || 'Unidentified User';
  const nameParts = safeFullName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  const getInitials = (first, last) => {
    return (first.charAt(0) + (last ? last.charAt(0) : '')).toUpperCase();
  };

  const safeRole = (member.role || 'Unassigned').replace('_', ' ');

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto h-full text-zinc-100 font-sans">
      
      {/* Sleek Header Section */}
      <div className="bg-zinc-950 border-b border-zinc-800 shrink-0 z-20">
        <div className="w-full max-w-6xl mx-auto p-6 md:px-8">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors rounded-sm">
                  <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-0.5">Database Protocol</p>
                  <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none">Personnel File</h2>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Area - Split Layout on Desktop */}
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 pb-24">

        {/* LEFT COLUMN: Identity & Quick Actions */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
            
            {/* Main Profile Block */}
            <div className="bg-zinc-900/40 text-white p-6 md:p-8 border border-zinc-800 relative overflow-hidden flex flex-col items-center text-center lg:items-start lg:text-left gap-5 rounded-sm">
                
                <div className="relative z-10 w-24 h-24 md:w-28 md:h-28 shrink-0 border border-zinc-800 bg-zinc-900 flex items-center justify-center rounded-sm mx-auto lg:mx-0">
                    <span className="text-4xl md:text-5xl font-bold text-zinc-400 tracking-tighter">
                      {getInitials(firstName, lastName)}
                    </span>
                    <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-[3px] border-zinc-950 bg-emerald-500 rounded-full"></div>
                </div>

                <div className="relative z-10 w-full">
                    <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
                        ID: {member.id.substring(0, 8).toUpperCase()}
                    </p>
                    <h1 className="text-2xl md:text-3xl font-semibold uppercase tracking-tight leading-tight mb-3 text-white">
                        {firstName} <span className="text-zinc-500">{lastName}</span>
                    </h1>
                    <span className="inline-block bg-blue-500/10 text-blue-400 text-xs font-semibold px-3 py-1.5 uppercase tracking-wider border border-blue-500/20 rounded-sm">
                        {member.role === 'executive' && member.department ? `${member.department} Executive` : safeRole}
                    </span>
                </div>

                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <Fingerprint className="absolute -right-6 -bottom-6 text-zinc-800 opacity-10 w-48 h-48 rotate-12" strokeWidth={1} />
                </div>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-4">
                <a href={`tel:${member.phone}`} className="bg-zinc-900/80 border border-zinc-800 p-4 flex flex-col items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group rounded-sm gap-2">
                    <Phone className="text-zinc-500 group-hover:text-emerald-500" size={20} />
                    <span className="text-xs font-medium tracking-wide text-zinc-400 group-hover:text-white">Secure Line</span>
                </a>
                <a href={`mailto:${member.email}`} className="bg-zinc-900/80 border border-zinc-800 p-4 flex flex-col items-center justify-center hover:bg-blue-500/10 hover:border-blue-500/40 transition-all group rounded-sm gap-2">
                    <Mail className="text-zinc-500 group-hover:text-blue-500" size={20} />
                    <span className="text-xs font-medium tracking-wide text-zinc-400 group-hover:text-white">Transmit</span>
                </a>
            </div>

            {/* Lifetime Contribution Banner */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 p-6 flex flex-col relative overflow-hidden rounded-sm">
                <div className="relative z-10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">Lifetime Contribution</p>
                    <p className="text-4xl font-mono font-semibold text-white">৳{totalDonated}</p>
                </div>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <Target className="absolute -right-4 -bottom-4 text-emerald-900 opacity-20 w-32 h-32" strokeWidth={2} />
                </div>
            </div>

            {/* Danger Zone - Termination Request */}
            {['admin', 'president', 'convenor'].includes(profile?.role) && member.account_status !== 'terminated' && (
              <div className="mt-2 border-t border-rose-900/50 pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-4 flex items-center gap-2">
                  <ShieldAlert size={16} /> Danger Zone
                </h3>
                
                {member.account_status === 'pending_removal' ? (
                  <div className="bg-rose-500/10 border border-rose-500/30 p-4 text-center rounded-sm">
                    <p className="text-sm font-medium text-rose-400">Termination Pending Presidential Review</p>
                  </div>
                ) : (
                  <button 
                    onClick={requestRemoval}
                    className="w-full bg-zinc-900 border border-rose-900/50 hover:bg-rose-500/10 hover:border-rose-500/50 text-rose-500 py-3.5 font-medium transition-colors text-sm rounded-sm"
                  >
                    Request Operative Termination
                  </button>
                )}
              </div>
            )}
        </div>


        {/* RIGHT COLUMN: Biometrics & Ledger */}
        <div className="w-full flex-1 flex flex-col gap-6 lg:gap-8">
            
            {/* Biometric & Academic Data Box */}
            <div className="bg-zinc-900/20 border border-zinc-800 p-6 md:p-8 rounded-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-6 border-b border-zinc-800 pb-3">
                    Biometric & Academic Data
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-6 text-sm">
                    <div>
                        <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Secure Line</span>
                        <span className="text-zinc-200 font-medium font-mono text-base">{member.phone || 'UNKNOWN'}</span>
                    </div>
                    
                    <div className="overflow-hidden sm:col-span-2 lg:col-span-2">
                        <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Electronic Mail</span>
                        <span className="text-blue-400 font-medium truncate block text-base">{member.email || 'N/A'}</span>
                    </div>

                    <div>
                        <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Blood Group</span>
                        <span className={`font-semibold px-2.5 py-1 inline-block text-sm border rounded-sm ${member.blood_group ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-zinc-500 bg-zinc-800 border-zinc-700'}`}>
                            {member.blood_group || 'UNKNOWN'}
                        </span>
                    </div>

                    <div>
                        <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Date of Birth</span>
                        <span className="text-zinc-200 font-medium font-mono text-base">{member.date_of_birth || 'CLASSIFIED'}</span>
                    </div>

                    <div>
                        <span className="block text-xs text-zinc-500 uppercase mb-1.5 tracking-wider font-semibold">Direct Superior</span>
                        {member.supervisor_id ? (
                            <Link to={`/member/${member.supervisor_id}`} className="text-blue-400 underline decoration-dotted decoration-blue-700 font-semibold hover:text-blue-300 text-base">
                                {supervisorName || 'OP_LINK'}
                            </Link>
                        ) : (
                            <span className="text-zinc-600 italic text-base">NONE</span>
                        )}
                    </div>

                    <div className="col-span-1 sm:col-span-2 lg:col-span-3 border-t border-zinc-800 pt-5 mt-2">
                        <span className="block text-xs text-zinc-500 uppercase mb-2 tracking-wider font-semibold">Institution / Base</span>
                        <span className="text-zinc-100 block font-semibold text-lg uppercase">{member.institution || 'UNASSIGNED'}</span>
                        <span className="text-zinc-400 text-xs mt-1.5 block tracking-wide">{member.field_of_study ? `MAJOR: ${member.field_of_study.toUpperCase()}` : ''}</span>
                    </div>
                    
                    <div className="col-span-1 sm:col-span-2 lg:col-span-3 pt-2">
                        <span className="block text-xs text-zinc-500 uppercase mb-2 tracking-wider font-semibold">Home Address</span>
                        <span className="text-zinc-300 leading-relaxed uppercase text-base">{member.home_address || 'CLASSIFIED'}</span>
                    </div>
                </div>
            </div>

            {/* Operation History Ledger */}
            <div className="flex flex-col flex-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
                    <FileText size={16}/> Operation History
                </h3>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-sm overflow-hidden">
                    <button 
                      onClick={() => setTxOpen(!txOpen)} 
                      className="w-full flex justify-between items-center bg-zinc-900/80 p-5 focus:outline-none hover:bg-zinc-800 transition-colors"
                    >
                        <span className="text-sm font-medium tracking-wide text-zinc-200">Transactions Ledger ({transactions.length})</span>
                        <ChevronDown className={`text-zinc-500 transition-transform duration-300 ${txOpen ? 'rotate-180' : ''}`} size={18} />
                    </button>
                    
                    {/* Limit height on desktop so it scrolls internally rather than pushing the page down forever */}
                    <div className={`${txOpen ? 'block' : 'hidden'} max-h-[400px] overflow-y-auto hide-scrollbar`}>
                        {transactions.length > 0 ? (
                            <div className="divide-y divide-zinc-800/50">
                                {transactions.map((tx, idx) => {
                                const dateObj = new Date(tx.paid_at);
                                return (
                                    <div key={idx} className="flex justify-between items-center p-5 text-sm font-mono tracking-tight hover:bg-zinc-800/20 transition-colors">
                                        <span className="text-zinc-400 uppercase">{dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        <span className="text-emerald-400 font-medium text-base">৳{tx.amount}.00</span>
                                    </div>
                                )
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-zinc-500 text-sm">
                                No protocol records found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
}