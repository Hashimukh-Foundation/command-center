import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { CreditCard, ShieldAlert, Network, ChevronRight, Check, HandCoins, TrendingDown, Trash2, Search, X } from 'lucide-react';
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
  const { user, profile } = useAuth(); 
  
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  const [forMonth, setForMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [sendReceipt, setSendReceipt] = useState(true);

  // Custom donation state
  const [donationDesc, setDonationDesc] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [donationMonth, setDonationMonth] = useState(new Date().toISOString().slice(0, 7));
  const [donationLoading, setDonationLoading] = useState(false);
  const [donations, setDonations] = useState([]);
  const [donationsLoading, setDonationsLoading] = useState(true);

  // Expense state
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMonth, setExpenseMonth] = useState(new Date().toISOString().slice(0, 7));
  const [expenseLoading, setExpenseLoading] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchDonations();
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setMembers(data || []);
  };

  const fetchDonations = async () => {
    setDonationsLoading(true);
    const { data } = await supabase
      .from('custom_transactions')
      .select('id, description, amount, for_month, created_at')
      .eq('type', 'donation')
      .order('for_month', { ascending: false })
      .order('created_at', { ascending: false });
    setDonations(data || []);
    setDonationsLoading(false);
  };

  const deleteDonation = async (id) => {
    if (!window.confirm('Permanently remove this donation entry?')) return;
    const { error } = await supabase.from('custom_transactions').delete().eq('id', id).eq('type', 'donation');
    if (error) { alert('Failed: ' + error.message); return; }
    fetchDonations();
  };

  const handleTermination = async (id, action) => {
    const newStatus = action === 'approve' ? 'terminated' : 'active';
    const confirmMsg = action === 'approve' ? 'Execute termination?' : 'Reject request and restore operative?';
    if (!window.confirm(confirmMsg)) return;
    const { error } = await supabase.rpc('process_termination', { target_user_id: id, new_status: newStatus });
    if (error) alert("Action failed: " + error.message);
    else fetchMembers();
  };

  const handleMemberSelect = (e) => {
    const id = e.target.value;
    setSelectedMember(id);
    const member = members.find(m => m.id === id);
    if (member) setAmount(member.role === 'patron' ? (member.patron_custom_amount || '') : RATES[member.role] || '');
  };

  const eligibleMembers = members.filter(m => m.role !== 'admin' && m.account_status !== 'terminated');
  const filteredMembers = eligibleMembers.filter(m => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    const name = (m.full_name || '').toLowerCase();
    const role = (m.role || '').replace('_', ' ').toLowerCase();
    return name.includes(q) || role.includes(q);
  });

  const recordPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('payments').insert({
      member_id: selectedMember, 
      amount: parseInt(amount), 
      recorded_by: user.id,
      for_month: forMonth
    });
    if (error) { alert(error.message); setLoading(false); return; }
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

  const recordCustomDonation = async (e) => {
    e.preventDefault();
    setDonationLoading(true);
    const { error } = await supabase.from('custom_transactions').insert({
      type: 'donation',
      description: donationDesc,
      amount: parseInt(donationAmount),
      recorded_by: user.id,
      for_month: donationMonth,
    });
    setDonationLoading(false);
    if (error) { alert('Failed: ' + error.message); return; }
    alert('Custom donation recorded.');
    setDonationDesc(''); setDonationAmount('');
    fetchDonations();
  };

  const recordExpense = async (e) => {
    e.preventDefault();
    setExpenseLoading(true);
    const { error } = await supabase.from('custom_transactions').insert({
      type: 'expense',
      description: expenseDesc,
      amount: parseInt(expenseAmount),
      recorded_by: user.id,
      for_month: expenseMonth,
    });
    setExpenseLoading(false);
    if (error) { alert('Failed: ' + error.message); return; }
    alert('Expense logged.');
    setExpenseDesc(''); setExpenseAmount('');
  };

  return (
    <div className="flex-1 p-4 sm:p-6 bg-zinc-950 overflow-y-auto pb-24 h-full text-zinc-100 font-sans">
      
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <p className="text-xs font-medium text-blue-500 uppercase tracking-wider mb-1">Command Center</p>
        <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-none">Admin Panel</h2>
      </div>

      <Link to="/admin/hierarchy" className="group w-full bg-zinc-900/50 border border-zinc-800 p-4 sm:p-5 mb-8 flex items-center justify-between gap-3 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="bg-zinc-900 p-3 border border-zinc-800 text-blue-500 group-hover:text-blue-400 transition-colors shrink-0">
            <Network size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors truncate">Personnel Hierarchy</h3>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">Manage Ranks & Reporting Lines</p>
          </div>
        </div>
        <ChevronRight className="text-zinc-600 group-hover:text-blue-500 transition-colors shrink-0" size={20}/>
      </Link>

      {/* Pending Terminations */}
      {['admin', 'president'].includes(profile?.role) && members.filter(m => m.account_status === 'pending_removal').length > 0 && (
        <div className="bg-zinc-900/30 p-4 sm:p-6 border border-rose-900/50 mb-8 relative overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-5 border-b border-rose-900/30 pb-3 flex items-center gap-2">
            <ShieldAlert size={16} /> Pending Terminations
          </h3>
          <div className="flex flex-col gap-3">
            {members.filter(m => m.account_status === 'pending_removal').map(m => (
              <div key={m.id} className="bg-zinc-950 border border-zinc-800 p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <p className="font-semibold text-zinc-100 text-sm">{m.full_name || 'Unidentified Operative'}</p>
                  <p className="text-xs text-zinc-500 capitalize mt-0.5">{(m.role || 'Unassigned').replace('_', ' ')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleTermination(m.id, 'reject')} className="flex-1 sm:flex-initial px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs font-medium">Deny</button>
                  <button onClick={() => handleTermination(m.id, 'approve')} className="flex-1 sm:flex-initial px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors text-xs font-medium">Verify & Terminate</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Member Payment */}
      <div className="bg-zinc-900/50 p-4 sm:p-6 border border-zinc-800 mb-6 relative overflow-hidden">
        <CreditCard className="absolute -right-4 -top-4 text-zinc-800 opacity-10 w-32 h-32 rotate-12" strokeWidth={1} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-5 border-b border-zinc-800 pb-3 flex items-center gap-2 relative z-10">
          <CreditCard size={16} /> Record Member Payment
        </h3>
        <form onSubmit={recordPayment} className="flex flex-col gap-5 relative z-10">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Operative Select</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name or role..."
                className="w-full bg-zinc-900 border border-zinc-800 text-white pl-9 pr-9 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm placeholder-zinc-600"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              {memberSearch && (
                <button
                  type="button"
                  onClick={() => setMemberSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <select 
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm" 
              value={selectedMember} onChange={handleMemberSelect} required
            >
              <option value="">
                {filteredMembers.length === 0 ? '-- No matching operatives --' : '-- Select Operative --'}
              </option>
              {filteredMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name || 'Unidentified'} ({((m.role || 'Unassigned').replace('_', ' '))})
                </option>
              ))}
            </select>
            {memberSearch && (
              <p className="text-[11px] text-zinc-500 mt-1.5">
                {filteredMembers.length} match{filteredMembers.length !== 1 ? 'es' : ''} for "{memberSearch}"
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Target Month</label>
              <input type="month" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm uppercase tracking-wider" value={forMonth} onChange={(e) => setForMonth(e.target.value)} required />
            </div>
            <div className="sm:w-32">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Amount (৳)</label>
              <input type="number" placeholder="BDT" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 cursor-pointer group w-max" onClick={() => setSendReceipt(!sendReceipt)}>
            <div className={`w-5 h-5 border flex items-center justify-center transition-colors shrink-0 ${sendReceipt ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-transparent group-hover:border-zinc-700'}`}>
              <Check size={14} strokeWidth={3} className={sendReceipt ? 'opacity-100' : 'opacity-0'} />
            </div>
            <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors select-none">Transmit Electronic Receipt</span>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 font-medium transition-colors disabled:opacity-50 mt-2">
            {loading ? 'Processing...' : 'Authorize Payment'}
          </button>
        </form>
      </div>

      {/* Custom Donation */}
      <div className="bg-zinc-900/50 p-4 sm:p-6 border border-zinc-800 mb-6 relative overflow-hidden">
        <HandCoins className="absolute -right-4 -top-4 text-zinc-800 opacity-10 w-32 h-32 rotate-12" strokeWidth={1} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-5 border-b border-zinc-800 pb-3 flex items-center gap-2 relative z-10">
          <HandCoins size={16} /> Log Custom Donation
        </h3>
        <form onSubmit={recordCustomDonation} className="flex flex-col gap-5 relative z-10">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Description</label>
            <input
              type="text" placeholder="e.g. Anonymous donor, fundraiser event..."
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm placeholder-zinc-600"
              value={donationDesc} onChange={e => setDonationDesc(e.target.value)} required
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">For Month</label>
              <input type="month" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm" value={donationMonth} onChange={e => setDonationMonth(e.target.value)} required />
            </div>
            <div className="sm:w-36">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Amount (৳)</label>
              <input type="number" placeholder="BDT" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm" value={donationAmount} onChange={e => setDonationAmount(e.target.value)} required min="1" />
            </div>
          </div>
          <button type="submit" disabled={donationLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 font-medium transition-colors disabled:opacity-50">
            {donationLoading ? 'Recording...' : '+ Add Donation to Fund'}
          </button>
        </form>

        {/* Manage existing donations across all months */}
        <div className="mt-6 pt-5 border-t border-zinc-800 relative z-10">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">All Logged Donations</p>
          {donationsLoading ? (
            <p className="text-xs text-zinc-600">Loading...</p>
          ) : donations.length === 0 ? (
            <p className="text-xs text-zinc-600">No donations logged yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {donations.map(d => (
                <div key={d.id} className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{d.description}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{d.for_month} · ৳{d.amount}</p>
                  </div>
                  <button onClick={() => deleteDonation(d.id)} className="text-zinc-600 hover:text-rose-400 transition-colors shrink-0 p-1" title="Delete donation">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Expense */}
      <div className="bg-zinc-900/50 p-4 sm:p-6 border border-zinc-800 mb-6 relative overflow-hidden">
        <TrendingDown className="absolute -right-4 -top-4 text-zinc-800 opacity-10 w-32 h-32 rotate-12" strokeWidth={1} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-5 border-b border-zinc-800 pb-3 flex items-center gap-2 relative z-10">
          <TrendingDown size={16} /> Log Expense
        </h3>
        <form onSubmit={recordExpense} className="flex flex-col gap-5 relative z-10">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Description</label>
            <input
              type="text" placeholder="e.g. Event supplies, venue rental..."
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm placeholder-zinc-600"
              value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">For Month</label>
              <input type="month" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm" value={expenseMonth} onChange={e => setExpenseMonth(e.target.value)} required />
            </div>
            <div className="sm:w-36">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Amount (৳)</label>
              <input type="number" placeholder="BDT" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required min="1" />
            </div>
          </div>
          <button type="submit" disabled={expenseLoading} className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3.5 font-medium transition-colors disabled:opacity-50">
            {expenseLoading ? 'Logging...' : '− Deduct Expense from Fund'}
          </button>
        </form>
      </div>

    </div>
  );
}