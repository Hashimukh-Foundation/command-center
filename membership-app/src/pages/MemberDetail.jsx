import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Phone, Mail, ChevronDown, Fingerprint, Activity, Terminal } from 'lucide-react';

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [member, setMember] = useState(null);
  const [supervisorName, setSupervisorName] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalDonated, setTotalDonated] = useState(0);
  
  // Accordion state
  const [txOpen, setTxOpen] = useState(false);

  useEffect(() => {
    fetchMemberData();
  }, [id]);

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
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 h-full">
         <Terminal size={40} className="text-slate-700 animate-pulse mb-4" />
         <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Accessing records...</p>
      </div>
    );
  }

  const nameParts = member.full_name?.split(' ') || ['UNKNOWN', ''];
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  const getInitials = (first, last) => {
    return (first.charAt(0) + (last ? last.charAt(0) : '')).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto pb-24 h-full selection:bg-blue-500 selection:text-white">
      
      {/* Top Nav Bar */}
      <div className="p-4 bg-slate-950 border-b-4 border-slate-800 sticky top-0 z-20 flex items-center gap-4 shadow-[0_4px_10px_rgba(0,0,0,0.5)] shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-900 border-2 border-slate-700 text-slate-400 hover:text-white hover:border-blue-500 transition-colors shadow-[2px_2px_0px_0px_#020617] hover:shadow-[2px_2px_0px_0px_#3b82f6]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Database Access</p>
          <h2 className="text-lg font-black text-slate-100 uppercase tracking-tighter leading-none mt-1">Personnel File</h2>
        </div>
      </div>

      <div className="p-4 space-y-6">

        {/* Main Profile Block */}
        <div className="bg-slate-900 text-white p-5 border-l-8 border-blue-600 relative overflow-hidden flex items-center gap-5 shadow-[4px_4px_0px_0px_#020617]">
            
            {/* Boxy Avatar */}
            <div className="relative z-10 w-20 h-20 shrink-0 border-2 border-slate-700 shadow-[4px_4px_0px_0px_#020617] bg-slate-800 flex items-center justify-center">
                <span className="text-3xl font-black text-slate-500 tracking-tighter">
                  {getInitials(firstName, lastName)}
                </span>
                
                {/* Active Indicator Dot */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-2 border-slate-900 bg-emerald-500"></div>
            </div>

            <div className="relative z-10 flex-1 min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
                    ID: {member.id.substring(0, 8).toUpperCase()}
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2 truncate text-slate-100">
                    {firstName}<br/>
                    <span className="text-slate-500">{lastName}</span>
                </h1>
                {/* PATCHED: Safe Role formatting */}
                <span className="inline-block bg-blue-600 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_#000000]">
                    {member.role === 'executive' && member.department ? `${member.department} EXEC` : (member.role || 'UNASSIGNED').replace('_', ' ')}
                </span>
            </div>

            {/* PATCHED: Background decorative icon positioning */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <Fingerprint className="absolute -right-4 -bottom-4 text-slate-800 opacity-20 w-32 h-32 rotate-12" strokeWidth={1} />
            </div>
        </div>

        {/* Quick Action Grid */}
        <div className="grid grid-cols-2 gap-4">
            <a href={`tel:${member.phone}`} className="bg-slate-900 border-2 border-slate-800 p-3 flex items-center justify-center hover:border-emerald-500 shadow-[4px_4px_0px_0px_#020617] hover:shadow-[4px_4px_0px_0px_#10b981] hover:translate-y-[-2px] transition-all group">
                <Phone className="text-slate-500 group-hover:text-emerald-500 mr-2" size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 group-hover:text-white">Secure Line</span>
            </a>
            <a href={`mailto:${member.email}`} className="bg-slate-900 border-2 border-slate-800 p-3 flex items-center justify-center hover:border-blue-500 shadow-[4px_4px_0px_0px_#020617] hover:shadow-[4px_4px_0px_0px_#3b82f6] hover:translate-y-[-2px] transition-all group">
                <Mail className="text-slate-500 group-hover:text-blue-500 mr-2" size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 group-hover:text-white">Transmit</span>
            </a>
        </div>

        {/* Biometric & Academic Data Box */}
        <div className="bg-slate-900 border-2 border-slate-800 p-5 shadow-[4px_4px_0px_0px_#020617]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b-2 border-slate-800 pb-2">
                Biometric & Academic Data
            </h3>
            
            <div className="grid grid-cols-2 gap-y-5 gap-x-2 text-xs font-mono">
                <div>
                    <span className="block text-[9px] text-slate-500 uppercase mb-1 tracking-widest font-bold">Secure Line</span>
                    <span className="text-slate-200 font-bold">{member.phone || 'UNKNOWN'}</span>
                </div>
                
                <div className="overflow-hidden">
                    <span className="block text-[9px] text-slate-500 uppercase mb-1 tracking-widest font-bold">Electronic Mail</span>
                    <span className="text-blue-400 font-bold truncate block">{member.email || 'N/A'}</span>
                </div>

                <div>
                    <span className="block text-[9px] text-slate-500 uppercase mb-1 tracking-widest font-bold">Blood Type</span>
                    <span className={`font-bold px-2 py-0.5 inline-block border ${member.blood_group ? 'text-rose-400 bg-rose-950/50 border-rose-900' : 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                        {member.blood_group || 'UNKNOWN'}
                    </span>
                </div>

                <div>
                    <span className="block text-[9px] text-slate-500 uppercase mb-1 tracking-widest font-bold">Date of Birth</span>
                    <span className="text-slate-200">{member.date_of_birth || 'CLASSIFIED'}</span>
                </div>

                <div>
                    <span className="block text-[9px] text-slate-500 uppercase mb-1 tracking-widest font-bold">Direct Superior</span>
                    {member.supervisor_id ? (
                        <Link to={`/member/${member.supervisor_id}`} className="text-blue-400 underline decoration-dotted decoration-blue-700 font-bold hover:text-blue-300">
                            {supervisorName || 'OP_LINK'}
                        </Link>
                    ) : (
                        <span className="text-slate-600 italic">NONE</span>
                    )}
                </div>

                <div className="col-span-2 border-t-2 border-slate-800 pt-3 mt-1">
                    <span className="block text-[9px] text-slate-500 uppercase mb-1 tracking-widest font-bold">Institution / Base</span>
                    <span className="text-slate-100 block font-bold text-sm uppercase">{member.institution || 'UNASSIGNED'}</span>
                    <span className="text-slate-400 text-[10px] mt-1 block">{member.field_of_study ? `MAJOR: ${member.field_of_study.toUpperCase()}` : ''}</span>
                </div>
                
                <div className="col-span-2 pt-2">
                    <span className="block text-[9px] text-slate-500 uppercase mb-1 tracking-widest font-bold">Home Address</span>
                    <span className="text-slate-300 leading-relaxed uppercase">{member.home_address || 'CLASSIFIED'}</span>
                </div>
            </div>
        </div>

        {/* Lifetime Contribution Banner */}
        <div className="bg-slate-900 p-5 border-l-4 border-emerald-500 shadow-[4px_4px_0px_0px_#020617] flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-[9px] font-mono uppercase tracking-widest text-emerald-500 font-bold mb-1">Lifetime Contribution</p>
                <p className="text-3xl font-mono font-black text-slate-100">৳{totalDonated}</p>
            </div>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <Activity className="absolute -right-4 top-1/2 -translate-y-1/2 text-emerald-900 opacity-20 w-24 h-24" strokeWidth={2} />
            </div>
        </div>

        {/* Operation History / Ledger Accordion */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-800 pb-2">
                Operation History
            </h3>

            <div className="bg-slate-900 border-2 border-slate-800 shadow-[4px_4px_0px_0px_#020617]">
                <button 
                  onClick={() => setTxOpen(!txOpen)} 
                  className="w-full flex justify-between items-center bg-slate-800 p-4 focus:outline-none hover:bg-slate-700 transition-colors"
                >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-200">Transactions Ledger</span>
                    <ChevronDown className={`text-slate-400 transition-transform duration-300 ${txOpen ? 'rotate-180' : ''}`} size={16} />
                </button>
                
                <div className={`${txOpen ? 'block' : 'hidden'} max-h-[300px] overflow-y-auto`}>
                    {transactions.length > 0 ? transactions.map((tx, idx) => {
                      const dateObj = new Date(tx.paid_at);
                      return (
                        <div key={idx} className="flex justify-between items-center p-4 border-t-2 border-slate-800 text-xs font-mono">
                            <span className="text-slate-300 uppercase">{dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span className="text-emerald-400 font-bold">+৳{tx.amount}.00</span>
                        </div>
                      )
                    }) : (
                        <div className="p-6 text-center text-slate-500 text-[10px] font-mono uppercase tracking-widest border-t-2 border-slate-800">
                            No records found.
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}