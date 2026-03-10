import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Terminal, CreditCard, ShieldAlert, Network, ChevronRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const RATES = { 
  admin: 0,
  treasurer: 250,
  president: 500, 
  executive: 250, 
  foreman: 200, 
  mentor: 150, 
  general_member: 100 
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  
  const [forMonth, setForMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  
  // New state for controlling the email receipt
  const [sendReceipt, setSendReceipt] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setMembers(data || []);
  };

  const handleMemberSelect = (e) => {
    const id = e.target.value;
    setSelectedMember(id);
    const member = members.find(m => m.id === id);
    if (member) setAmount(member.role === 'patron' ? (member.patron_custom_amount || '') : RATES[member.role] || '');
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Save to database
    const { error } = await supabase.from('payments').insert({
      member_id: selectedMember, 
      amount: parseInt(amount), 
      recorded_by: user.id,
      for_month: forMonth
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Only send the email if the checkbox is checked
    if (sendReceipt) {
        await supabase.functions.invoke('send-email', {
        body: { type: 'receipt', memberId: selectedMember, amount: amount, month: forMonth }
        });
        alert('TRANSACTION LOGGED & RECEIPT TRANSMITTED');
    } else {
        alert('TRANSACTION LOGGED (SILENT PROTOCOL)');
    }

    setSelectedMember(''); setAmount(''); setLoading(false);
  };

  return (
    <div className="flex-1 p-6 bg-slate-950 overflow-y-auto pb-24 h-full selection:bg-blue-500 selection:text-white">
      
      {/* Header */}
      <div className="mb-6 border-b-4 border-slate-800 pb-4">
        <p className="text-[10px] font-mono text-blue-500 uppercase tracking-[0.3em] mb-1 flex items-center gap-2 font-bold">
          <Terminal size={14} strokeWidth={2.5}/> // COMMAND CENTER
        </p>
        <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter leading-none">Admin Panel</h2>
      </div>

      {/* Network Config Link */}
      <Link to="/admin/hierarchy" className="group w-full bg-slate-900 border-2 border-slate-700 p-4 mb-8 flex items-center justify-between shadow-[4px_4px_0px_0px_#020617] hover:border-blue-500 hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#3b82f6] transition-all cursor-pointer">
        <div className="flex items-center gap-4">
            <div className="bg-slate-950 p-2 border border-slate-800 text-blue-500 group-hover:bg-blue-900/30 transition-colors">
                <Network size={20} strokeWidth={2} />
            </div>
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-200 group-hover:text-blue-400 transition-colors">Personnel Hierarchy</h3>
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Manage Ranks & Reporting Lines</p>
            </div>
        </div>
        <ChevronRight className="text-slate-600 group-hover:text-blue-500 transition-colors" size={20}/>
      </Link>

      {/* Record Payment Section */}
      <div className="bg-slate-900 p-5 border-2 border-slate-800 shadow-[4px_4px_0px_0px_#020617] mb-8 relative overflow-hidden">
        <ShieldAlert className="absolute -right-4 -top-4 text-slate-800 opacity-20 w-32 h-32 rotate-12" strokeWidth={1} />
        
        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4 border-b-2 border-slate-800 pb-2 flex items-center gap-2 relative z-10">
          <CreditCard size={14} /> Record Transaction
        </h3>
        
        <form onSubmit={recordPayment} className="flex flex-col gap-4 relative z-10">
          <div>
            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1 font-bold">Operative Select</label>
            <select 
              className="w-full p-3 bg-slate-950 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-emerald-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#10b981] transition-all uppercase font-mono text-[10px] tracking-widest" 
              value={selectedMember} 
              onChange={handleMemberSelect} 
              required
            >
              <option value="">-- SELECT OPERATIVE --</option>
              
              {members.filter(m => m.role !== 'admin').map(m => {
                const safeName = m.full_name || 'UNIDENTIFIED OPERATIVE';
                const safeRole = (m.role || 'UNASSIGNED').replace('_', ' ');
                return (
                  <option key={m.id} value={m.id}>
                    {safeName} ({safeRole})
                  </option>
                );
              })}
            </select>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1 font-bold">Target Month</label>
              <input 
                type="month" 
                className="w-full p-3 bg-slate-950 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-emerald-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#10b981] transition-all font-mono text-xs uppercase" 
                value={forMonth} 
                onChange={(e) => setForMonth(e.target.value)} 
                required 
              />
            </div>
            <div className="w-28">
              <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1 font-bold">Amount (৳)</label>
              <input 
                type="number" 
                placeholder="BDT" 
                className="w-full p-3 bg-slate-950 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-emerald-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#10b981] transition-all font-mono text-xs" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Tactical Checkbox for Email Receipt */}
          <div 
            className="flex items-center gap-3 mt-2 cursor-pointer group w-max"
            onClick={() => setSendReceipt(!sendReceipt)}
          >
            <div className={`w-5 h-5 border-2 flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_#020617] ${sendReceipt ? 'border-emerald-500 bg-emerald-950 text-emerald-500' : 'border-slate-700 bg-slate-950 text-transparent group-hover:border-slate-500'}`}>
              <Check size={14} strokeWidth={4} className={sendReceipt ? 'opacity-100' : 'opacity-0'} />
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest group-hover:text-slate-200 transition-colors font-bold select-none">
              Transmit Electronic Receipt
            </span>
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-emerald-600 border-2 border-emerald-500 text-slate-950 p-3 font-black uppercase tracking-widest mt-2 shadow-[4px_4px_0px_0px_#064e3b] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#064e3b] transition-all disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : 'AUTHORIZE PAYMENT'}
          </button>
        </form>
      </div>

    </div>
  );
}