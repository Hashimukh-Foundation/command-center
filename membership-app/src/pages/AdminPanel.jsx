import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { CreditCard, ShieldAlert, Network, ChevronRight, Check, HandCoins, TrendingDown, Trash2, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
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
    const entry = donations.find(d => d.id === id);
    if (!window.confirm('Permanently remove this donation entry?')) return;

    // 1. Write to logs first
    if (entry) {
      await supabase.from('treasury_logs').insert({
        action_type: 'DELETED',
        entity_type: 'DONATION',
        amount: entry.amount,
        details: `Removed donation: "${entry.description}"`,
        performed_by: user.id
      });
    }

    // 2. Delete the actual record
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

  const handleMemberSelect = (id) => {
    setSelectedMember(id);
    const member = members.find(m => m.id === id);
    if (member) setAmount(member.role === 'patron' ? (member.patron_custom_amount || '') : RATES[member.role] || '');
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    if (!selectedMember) return alert('Please select an operative first.');
    setLoading(true);
    
    const { error } = await supabase.from('payments').insert({
      member_id: selectedMember, 
      amount: parseInt(amount), 
      recorded_by: user.id,
      for_month: forMonth
    });
    
    if (error) { alert(error.message); setLoading(false); return; }

    // Write to logs
    const member = members.find(m => m.id === selectedMember);
    await supabase.from('treasury_logs').insert({
      action_type: 'ADDED',
      entity_type: 'MEMBER_PAYMENT',
      amount: parseInt(amount),
      details: `Added member due for ${member?.full_name || 'Unidentified'}`,
      performed_by: user.id
    });

    if (sendReceipt) {
      await supabase.functions.invoke('send-email', {
        body: { type: 'receipt', memberId: selectedMember, amount: amount, month: forMonth }
      });
      alert('Transaction Logged & Receipt Transmitted');
    } else {
      alert('Transaction Logged (Silent Protocol)');
    }
    setSelectedMember(''); setAmount(''); setSearchTerm(''); setLoading(false);
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
    
    if (error) { 
      setDonationLoading(false);
      alert('Failed: ' + error.message); 
      return; 
    }

    // Write to logs
    await supabase.from('treasury_logs').insert({
      action_type: 'ADDED',
      entity_type: 'DONATION',
      amount: parseInt(donationAmount),
      details: `Added custom donation: "${donationDesc}"`,
      performed_by: user.id
    });

    setDonationLoading(false);
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
    
    if (error) { 
      setExpenseLoading(false);
      alert('Failed: ' + error.message); 
      return; 
    }

    // Write to logs
    await supabase.from('treasury_logs').insert({
      action_type: 'ADDED',
      entity_type: 'EXPENSE',
      amount: parseInt(expenseAmount),
      details: `Added expense: "${expenseDesc}"`,
      performed_by: user.id
    });

    setExpenseLoading(false);
    alert('Expense logged.');
    setExpenseDesc(''); setExpenseAmount('');
  };

  // Filter members based on search term
  const filteredMembers = members.filter(m => 
    m.role !== 'admin' && 
    m.account_status !== 'terminated' &&
    (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 bg-zinc-950 overflow-y-auto pb-24 h-full text-zinc-100 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-6 border-b border-zinc-800 pb-4">
          <p className="text-xs font-medium text-blue-500 uppercase tracking-wider mb-1">Command Center</p>
          <h2 className="text-2xl font-semibold text-white tracking-tight leading-none">Admin Panel</h2>
        </div>

        {/* Global Controls & Alerts (Full Width) */}
        <div className="mb-8 flex flex-col gap-6">
          <Link to="/admin/hierarchy" className="group w-full bg-zinc-900/50 border border-zinc-800 p-5 flex items-center justify-between hover:bg-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer rounded-sm">
            <div className="flex items-center gap-4">
              <div className="bg-zinc-900 p-3 border border-zinc-800 text-blue-500 group-hover:text-blue-400 transition-colors rounded-sm">
                <Network size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">Personnel Hierarchy</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Manage Ranks & Reporting Lines</p>
              </div>
            </div>
            <ChevronRight className="text-zinc-600 group-hover:text-blue-500 transition-colors" size={20}/>
          </Link>

          {/* Pending Terminations */}
          {['admin', 'president'].includes(profile?.role) && members.filter(m => m.account_status === 'pending_removal').length > 0 && (
            <div className="bg-rose-950/20 p-6 border border-rose-900/50 relative overflow-hidden rounded-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-5 border-b border-rose-900/30 pb-3 flex items-center gap-2">
                <ShieldAlert size={16} /> Pending Terminations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.filter(m => m.account_status === 'pending_removal').map(m => (
                  <div key={m.id} className="bg-zinc-950 border border-rose-900/30 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 rounded-sm">
                    <div>
                      <p className="font-semibold text-zinc-100 text-sm">{m.full_name || 'Unidentified Operative'}</p>
                      <p className="text-xs text-zinc-500 capitalize mt-0.5">{(m.role || 'Unassigned').replace('_', ' ')}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleTermination(m.id, 'reject')} className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs font-medium rounded-sm">Deny</button>
                      <button onClick={() => handleTermination(m.id, 'approve')} className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors text-xs font-medium rounded-sm">Verify & Terminate</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Financial Tools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Payments & Expenses (Takes 7 columns on Desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Record Member Payment */}
            <div className="bg-zinc-900/40 p-6 border border-zinc-800 relative overflow-hidden rounded-sm flex-1 flex flex-col">
              <CreditCard className="absolute -right-4 -top-4 text-zinc-800 opacity-10 w-32 h-32 rotate-12" strokeWidth={1} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-5 border-b border-zinc-800 pb-3 flex items-center gap-2 relative z-10 shrink-0">
                <CreditCard size={16} /> Record Member Payment
              </h3>
              
              <form onSubmit={recordPayment} className="flex flex-col gap-5 relative z-10 flex-1">
                
                {/* Searchable Member Select */}
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">1. Locate Operative</label>
                  <div className="relative mb-2 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search by name..." 
                      className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm rounded-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="h-48 overflow-y-auto border border-zinc-800 rounded-sm bg-zinc-950/50 shrink-0 custom-scrollbar">
                    {filteredMembers.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => handleMemberSelect(m.id)}
                        className={`px-4 py-3 text-sm cursor-pointer border-b border-zinc-800/50 last:border-0 transition-colors flex justify-between items-center ${selectedMember === m.id ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'}`}
                      >
                        <span className="font-medium">{m.full_name || 'Unidentified'}</span>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{m.role.replace('_', ' ')}</span>
                      </div>
                    ))}
                    {filteredMembers.length === 0 && (
                      <div className="p-4 text-sm text-zinc-500 text-center flex items-center justify-center h-full">No operatives found.</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 shrink-0 mt-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Target Month</label>
                    <input type="month" className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm uppercase tracking-wider rounded-sm" value={forMonth} onChange={(e) => setForMonth(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Amount (৳)</label>
                    <input type="number" placeholder="BDT" className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm rounded-sm" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </div>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                  <div className="flex items-center gap-3 cursor-pointer group w-max" onClick={() => setSendReceipt(!sendReceipt)}>
                    <div className={`w-5 h-5 border rounded-sm flex items-center justify-center transition-colors ${sendReceipt ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-transparent group-hover:border-zinc-700'}`}>
                      <Check size={14} strokeWidth={3} className={sendReceipt ? 'opacity-100' : 'opacity-0'} />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors select-none">Transmit Electronic Receipt</span>
                  </div>
                  <button type="submit" disabled={loading || !selectedMember} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 font-medium transition-colors disabled:opacity-50 rounded-sm text-sm whitespace-nowrap">
                    {loading ? 'Processing...' : 'Authorize Payment'}
                  </button>
                </div>
              </form>
            </div>

            {/* Log Expense */}
            <div className="bg-zinc-900/40 p-6 border border-zinc-800 relative overflow-hidden rounded-sm shrink-0">
              <TrendingDown className="absolute -right-4 -top-4 text-zinc-800 opacity-10 w-32 h-32 rotate-12" strokeWidth={1} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-5 border-b border-zinc-800 pb-3 flex items-center gap-2 relative z-10">
                <TrendingDown size={16} /> Log Expense
              </h3>
              <form onSubmit={recordExpense} className="flex flex-col gap-4 relative z-10">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Description</label>
                  <input
                    type="text" placeholder="e.g. Event supplies, venue rental..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm placeholder-zinc-600 rounded-sm"
                    value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">For Month</label>
                    <input type="month" className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm uppercase tracking-wider rounded-sm" value={expenseMonth} onChange={e => setExpenseMonth(e.target.value)} required />
                  </div>
                  <div className="sm:w-36">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Amount (৳)</label>
                    <input type="number" placeholder="BDT" className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm rounded-sm" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required min="1" />
                  </div>
                </div>
                <button type="submit" disabled={expenseLoading} className="w-full bg-rose-600/90 hover:bg-rose-500 text-white py-3 font-medium transition-colors disabled:opacity-50 rounded-sm text-sm mt-2">
                  {expenseLoading ? 'Logging...' : '− Deduct Expense from Fund'}
                </button>
              </form>
            </div>

          </div>

          {/* RIGHT COLUMN: Donations (Takes 5 columns on Desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <div className="bg-zinc-900/40 p-6 border border-zinc-800 relative overflow-hidden rounded-sm flex-1 flex flex-col">
              <HandCoins className="absolute -right-4 -top-4 text-zinc-800 opacity-10 w-32 h-32 rotate-12" strokeWidth={1} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-5 border-b border-zinc-800 pb-3 flex items-center gap-2 relative z-10 shrink-0">
                <HandCoins size={16} /> Log Custom Donation
              </h3>
              
              <form onSubmit={recordCustomDonation} className="flex flex-col gap-4 relative z-10 shrink-0">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Description</label>
                  <input
                    type="text" placeholder="e.g. Anonymous donor, fundraiser..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm placeholder-zinc-600 rounded-sm"
                    value={donationDesc} onChange={e => setDonationDesc(e.target.value)} required
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">For Month</label>
                    <input type="month" className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm uppercase tracking-wider rounded-sm" value={donationMonth} onChange={e => setDonationMonth(e.target.value)} required />
                  </div>
                  <div className="w-32">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Amount</label>
                    <input type="number" placeholder="BDT" className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm rounded-sm" value={donationAmount} onChange={e => setDonationAmount(e.target.value)} required min="1" />
                  </div>
                </div>
                <button type="submit" disabled={donationLoading} className="w-full bg-blue-600/90 hover:bg-blue-500 text-white py-3 font-medium transition-colors disabled:opacity-50 rounded-sm text-sm mt-2">
                  {donationLoading ? 'Recording...' : '+ Add Donation to Fund'}
                </button>
              </form>

              {/* Manage existing donations */}
              <div className="mt-8 pt-6 border-t border-zinc-800 relative z-10 flex-1 flex flex-col min-h-[250px]">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 shrink-0">Recent Donations Log</p>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mr-2">
                  {donationsLoading ? (
                    <div className="flex items-center justify-center h-full text-xs text-zinc-600">Syncing data...</div>
                  ) : donations.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-sm">No donations logged yet.</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {donations.map(d => (
                        <div key={d.id} className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-sm group hover:border-zinc-700 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-200 truncate">{d.description}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{d.for_month} · <span className="text-blue-400">৳{d.amount}</span></p>
                          </div>
                          <button onClick={() => deleteDonation(d.id)} className="text-zinc-600 hover:text-rose-400 transition-colors shrink-0 p-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100" title="Delete donation">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}