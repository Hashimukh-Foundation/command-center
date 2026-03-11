import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { CreditCard, ShieldAlert, Network, ChevronRight, Check } from 'lucide-react';
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

    if (sendReceipt) {
        await supabase.functions.invoke('send-email', {
        body: { type: 'receipt', memberId: selectedMember, amount: amount, month: forMonth }
        });
        alert('Transaction Logged & Receipt Transmitted');
    } else {
        alert('Transaction Logged (Silent Protocol)');
    }

    setSelectedMember(''); setAmount(''); setLoading(false);
  };

  return (
    <div className="flex-1 p-6 bg-zinc-950 overflow-y-auto pb-24 h-full text-zinc-100 font-sans">
      
      {/* Sleek Header */}
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <p className="text-xs font-medium text-blue-500 uppercase tracking-wider mb-1">
          Command Center
        </p>
        <h2 className="text-2xl font-semibold text-white tracking-tight leading-none">Admin Panel</h2>
      </div>

      {/* Network Config Link - Flat & Modern */}
      <Link to="/admin/hierarchy" className="group w-full bg-zinc-900/50 border border-zinc-800 p-5 mb-8 flex items-center justify-between hover:bg-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer">
        <div className="flex items-center gap-4">
            <div className="bg-zinc-900 p-3 border border-zinc-800 text-blue-500 group-hover:text-blue-400 transition-colors">
                <Network size={20} />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">Personnel Hierarchy</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Manage Ranks & Reporting Lines</p>
            </div>
        </div>
        <ChevronRight className="text-zinc-600 group-hover:text-blue-500 transition-colors" size={20}/>
      </Link>

      {/* Record Payment Section */}
      <div className="bg-zinc-900/50 p-6 border border-zinc-800 mb-8 relative overflow-hidden">
        <ShieldAlert className="absolute -right-4 -top-4 text-zinc-800 opacity-10 w-32 h-32 rotate-12" strokeWidth={1} />
        
        <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-5 border-b border-zinc-800 pb-3 flex items-center gap-2 relative z-10">
          <CreditCard size={16} /> Record Transaction
        </h3>
        
        <form onSubmit={recordPayment} className="flex flex-col gap-5 relative z-10">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Operative Select</label>
            <select 
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm" 
              value={selectedMember} 
              onChange={handleMemberSelect} 
              required
            >
              <option value="">-- Select Operative --</option>
              {/* DEFENSIVE PROGRAMMING PRESERVED */}
              {members.filter(m => m.role !== 'admin').map(m => {
                const safeName = m.full_name || 'Unidentified Operative';
                const safeRole = (m.role || 'Unassigned').replace('_', ' ');
                // Capitalize role nicely
                const formattedRole = safeRole.charAt(0).toUpperCase() + safeRole.slice(1);
                return (
                  <option key={m.id} value={m.id}>
                    {safeName} ({formattedRole})
                  </option>
                );
              })}
            </select>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Target Month</label>
              <input 
                type="month" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm uppercase tracking-wider" 
                value={forMonth} 
                onChange={(e) => setForMonth(e.target.value)} 
                required 
              />
            </div>
            <div className="w-32">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Amount (৳)</label>
              <input 
                type="number" 
                placeholder="BDT" 
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Tactical Checkbox for Email Receipt - Soft UI version */}
          <div 
            className="flex items-center gap-3 mt-1 cursor-pointer group w-max"
            onClick={() => setSendReceipt(!sendReceipt)}
          >
            <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${sendReceipt ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-transparent group-hover:border-zinc-700'}`}>
              <Check size={14} strokeWidth={3} className={sendReceipt ? 'opacity-100' : 'opacity-0'} />
            </div>
            <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors select-none">
              Transmit Electronic Receipt
            </span>
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 font-medium transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Processing...' : 'Authorize Payment'}
          </button>
        </form>
      </div>

    </div>
  );
}