import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ReceiptText, AlertTriangle, Download, Search, FileText, BarChart3, LayoutList, HandCoins, TrendingDown } from 'lucide-react';

const RATES = { 
  admin: 0,
  treasurer: 250,
  president: 500, 
  executive: 250, 
  foreman: 200, 
  mentor: 150, 
  general_member: 100 
};

export default function Treasury() {
  const navigate = useNavigate();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [finances, setFinances] = useState({ expected: 0, actual: 0, deficit: 0 });
  const [transactions, setTransactions] = useState([]);
  const [customTransactions, setCustomTransactions] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mobileTab, setMobileTab] = useState('overview');

  useEffect(() => {
    fetchTreasuryData();
  }, [selectedMonth]);

  const fetchTreasuryData = async () => {
    setLoading(true);

    const { data: financeData } = await supabase.rpc('get_monthly_finances', { month_val: selectedMonth });
    if (financeData && financeData.length > 0) setFinances(financeData[0]);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, supervisor_id, patron_custom_amount')
      .neq('account_status', 'terminated')
      .order('full_name');
    setAllMembers(profiles || []);

    const { data: txData } = await supabase
      .from('payments')
      .select(`
        id, amount, paid_at, member_id, recorded_by,
        member:profiles!payments_member_id_fkey(full_name, role, department),
        recorder:profiles!payments_recorded_by_fkey(full_name)
      `)
      .eq('for_month', selectedMonth)
      .order('paid_at', { ascending: false });
    setTransactions(txData || []);

    const { data: customData } = await supabase
      .from('custom_transactions')
      .select(`
        id, type, description, amount, for_month, created_at, recorded_by,
        recorder:profiles!custom_transactions_recorded_by_fkey(full_name)
      `)
      .eq('for_month', selectedMonth)
      .order('created_at', { ascending: false });
    setCustomTransactions(customData || []);

    setLoading(false);
  };

  // Adjusted totals: member payments + custom donations - expenses
  const totalDonations = customTransactions.filter(t => t.type === 'donation').reduce((s, t) => s + t.amount, 0);
  const totalExpenses  = customTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const adjustedTotal  = finances.actual + totalDonations - totalExpenses;
  const adjustedDeficit = Math.max(0, finances.expected - adjustedTotal);

  const progressPercentage = finances.expected > 0
    ? Math.min(100, Math.round((adjustedTotal / finances.expected) * 100))
    : 0;

  const formatTimestamp = (timestamp) => {
    const d = new Date(timestamp);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  const generateTextStatement = () => {
    if (allMembers.length === 0) return alert("DATABASE_ERROR: NO_OPERATIVE_DATA_FOUND");
    const dateObj = new Date(`${selectedMonth}-01`);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();
    const pad = (str, len) => (str || '').toString().substring(0, len).padEnd(len, ' ');

    let report = `                            STATEMENT - ${monthName.toUpperCase()}, ${year}\n\n`;
    report += `Hashimukh Foundation / Funding statement\n`;
    report += `--------------------------------------------------------------------------------------------------\n`;
    report += `Statement period: ${monthName}, ${year}\n`;
    report += `Fundraised (members): ${finances.actual.toLocaleString()} BDT\n`;
    report += `Custom donations: ${totalDonations.toLocaleString()} BDT\n`;
    report += `Expenses: ${totalExpenses.toLocaleString()} BDT\n`;
    report += `Net total: ${adjustedTotal.toLocaleString()} BDT\n`;
    report += `Expected raise: ${finances.expected.toLocaleString()} BDT\n\n`;
    report += `Timestamp: ${new Date().toLocaleString('en-GB')}\n`;
    report += `--------------------------------------------------------------------------------------------------\n\n`;
    report += `| SN | Name                            | Manager                       | Post            | Status    |\n`;
    report += `|----|---------------------------------|-------------------------------|-----------------|----------|\n`;

    allMembers.forEach((member, index) => {
      const sn = String(index + 1).padStart(2, '0');
      const name = member.full_name || 'Unidentified';
      let managerName = '';
      if (member.supervisor_id) {
        const sup = allMembers.find(m => m.id === member.supervisor_id);
        managerName = sup ? sup.full_name : '';
      }
      let post = (member.role || 'Unassigned').replace('_', '-');
      post = post.charAt(0).toUpperCase() + post.slice(1);
      const payment = transactions.find(tx => tx.member_id === member.id);
      const amountPaid = payment ? payment.amount : 0;
      const expected = member.role === 'patron' ? (member.patron_custom_amount || 0) : (RATES[member.role] ?? 100);
      let status = expected === 0 ? 'Exempt' : amountPaid >= expected ? 'Fulfilled' : amountPaid > 0 ? 'Partial' : 'Due';
      report += `| ${sn} | ${pad(name, 31)} | ${pad(managerName, 29)} | ${pad(post, 15)} | ${pad(status, 9)} |\n`;
    });
    report += `--------------------------------------------------------------------------------------------------\n`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `STATEMENT_${monthName.toUpperCase()}_${year}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = () => {
    if (allMembers.length === 0) return alert("DATABASE_ERROR: NO_OPERATIVE_DATA_FOUND");
    const headers = ["Member Name", "Current Role", "Status", "Amount (BDT)", "Month", "Date Paid", "Authorized By"];
    const rows = allMembers.map(member => {
      const payment = transactions.find(tx => tx.member_id === member.id);
      return [
        `"${member.full_name || 'Unidentified'}"`,
        `"${(member.role || 'Unassigned').replace('_', ' ').toUpperCase()}"`,
        payment ? "PAID" : "UNPAID",
        payment ? payment.amount : 0,
        `"${selectedMonth}"`,
        payment ? `"${new Date(payment.paid_at).toLocaleDateString('en-GB')}"` : '"--"',
        payment ? `"${payment.recorder?.full_name || 'System'}"` : '"--"'
      ];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `HF_FULL_LEDGER_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTransactions = transactions.filter(tx =>
    (tx.member?.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustom = customTransactions.filter(tx =>
    tx.description.toLowerCase().includes(search.toLowerCase())
  );

  // Merge all entries for the ledger, sorted by date descending
  const allLedgerEntries = [
    ...filteredTransactions.map(tx => ({ ...tx, _kind: 'member' })),
    ...filteredCustom.map(tx => ({ ...tx, _kind: tx.type })),
  ].sort((a, b) => new Date(b.paid_at || b.created_at) - new Date(a.paid_at || a.created_at));

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 h-full overflow-hidden text-zinc-100 font-sans">
      
      <div className="bg-zinc-950 border-b border-zinc-800 shrink-0 z-20">
        <div className="w-full max-w-7xl mx-auto p-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-0.5">Financial Report</p>
              <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none">Treasury Dashboard</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="flex lg:hidden w-full border-b border-zinc-800 bg-zinc-950 shrink-0">
        <button onClick={() => setMobileTab('overview')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${mobileTab === 'overview' ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
          <BarChart3 size={16} /> Overview
        </button>
        <button onClick={() => setMobileTab('ledger')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${mobileTab === 'ledger' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
          <LayoutList size={16} /> Ledger
        </button>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT: Stats & Controls */}
        <div className={`w-full lg:w-[400px] xl:w-[450px] p-4 lg:p-8 flex-col gap-6 shrink-0 lg:border-r lg:border-zinc-800 overflow-y-auto hide-scrollbar bg-zinc-950/50 ${mobileTab === 'overview' ? 'flex' : 'hidden lg:flex'}`}>
          
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={16} className="text-zinc-500" />
              <h3 className="text-sm font-semibold text-zinc-300 tracking-wide">Period Selection</h3>
            </div>
            <div className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 flex flex-col justify-center hover:border-zinc-700 transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 rounded-sm">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Active Cycle</label>
              <input type="month" className="w-full bg-transparent text-white text-base md:text-lg font-medium outline-none cursor-pointer" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={generateTextStatement} className="flex-1 bg-zinc-900 border border-zinc-800 py-3 px-4 text-xs font-medium text-zinc-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2 rounded-sm group">
                <FileText size={16} className="group-hover:-translate-y-0.5 transition-transform" /> ASCII Report
              </button>
              <button onClick={exportToCSV} className="flex-1 bg-zinc-900 border border-zinc-800 py-3 px-4 text-xs font-medium text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2 rounded-sm group">
                <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" /> CSV Ledger
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between rounded-sm">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Target</p>
              <p className="text-2xl lg:text-3xl font-semibold text-zinc-300">৳{finances.expected}</p>
            </div>
            <div className="p-4 bg-blue-900/10 border border-blue-500/30 flex flex-col justify-between rounded-sm">
              <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2">Net Total</p>
              <p className="text-2xl lg:text-3xl font-semibold text-white">৳{adjustedTotal}</p>
            </div>
            <div className="p-4 bg-zinc-900/40 border border-zinc-800 flex flex-col rounded-sm">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Member Dues</p>
              <p className="text-xl font-semibold text-zinc-300">৳{finances.actual}</p>
            </div>
            <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 flex flex-col rounded-sm">
              <p className="text-xs font-medium text-emerald-500/80 uppercase tracking-wider mb-2">Donations</p>
              <p className="text-xl font-semibold text-emerald-400">+৳{totalDonations}</p>
            </div>
            {totalExpenses > 0 && (
              <div className="col-span-2 p-4 bg-rose-900/10 border border-rose-500/20 flex items-center justify-between rounded-sm">
                <p className="text-xs font-medium text-rose-400/80 uppercase tracking-wider">Total Expenses</p>
                <p className="text-xl font-semibold text-rose-400">−৳{totalExpenses}</p>
              </div>
            )}
          </div>

          {/* Progress */}
          <div>
            <div className="flex mb-2 items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Collection Progress</span>
              <span className="text-xs font-semibold text-blue-400">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-zinc-900 border border-zinc-800 h-2.5 rounded-sm overflow-hidden">
              <div style={{ width: `${progressPercentage}%` }} className="bg-blue-500 h-full transition-all duration-500"></div>
            </div>
          </div>

          {adjustedDeficit > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 flex items-center justify-between rounded-sm">
              <div className="flex items-center">
                <AlertTriangle className="text-rose-500 mr-3 shrink-0" size={18} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-0.5">Deficit Detected</p>
                  <p className="text-sm text-rose-400/80">Short by ৳{adjustedDeficit}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Ledger */}
        <div className={`flex-1 flex-col overflow-hidden relative ${mobileTab === 'ledger' ? 'flex' : 'hidden lg:flex'}`}>
          
          <div className="sticky top-0 bg-zinc-950 p-4 lg:p-8 pb-4 lg:pb-6 z-10 shrink-0 border-b border-zinc-800 lg:border-none">
            <div className="relative group mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="text" placeholder="Search ledger..." className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-500 text-sm md:text-base rounded-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ReceiptText size={16} className="text-zinc-500" />
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">Clearance Ledger</h3>
              </div>
              <span className="text-xs font-medium text-emerald-500/70">{allLedgerEntries.length} Records</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 hide-scrollbar">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed bg-zinc-900/20 rounded-sm">
                <p className="text-sm font-medium tracking-wide animate-pulse">Scanning monthly packets...</p>
              </div>
            ) : allLedgerEntries.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 border border-zinc-800 bg-zinc-900/20 text-sm rounded-sm">No records found for this period.</div>
            ) : (
              <div className="flex flex-col gap-3 lg:gap-4 pb-8">
                {allLedgerEntries.map(entry => {

                  // Member payment entry
                  if (entry._kind === 'member') {
                    const safeRole = entry.member?.role === 'executive' && entry.member.department
                      ? `${entry.member.department} Exec`
                      : (entry.member?.role || 'Unassigned').replace('_', ' ');
                    return (
                      <div key={`m-${entry.id}`} className="p-4 lg:p-5 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800/40 transition-colors flex flex-col gap-4 rounded-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 rounded-sm">
                              <Check strokeWidth={2.5} size={18} />
                            </div>
                            <div className="min-w-0">
                              <Link to={`/member/${entry.member_id}`} className="text-sm lg:text-base font-semibold text-zinc-100 hover:text-blue-400 transition-colors truncate block">
                                {entry.member?.full_name || 'Unidentified Operative'}
                              </Link>
                              <p className="text-xs text-zinc-500 capitalize mt-0.5 truncate">{safeRole}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-base lg:text-lg font-semibold text-emerald-400">+৳{entry.amount}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70 mt-0.5">Member Due</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-zinc-800/50 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                          <span>Auth: {entry.recorder?.full_name || 'System'}</span>
                          <p>{formatTimestamp(entry.paid_at)}</p>
                        </div>
                      </div>
                    );
                  }

                  // Custom donation entry
                  if (entry._kind === 'donation') {
                    return (
                      <div key={`d-${entry.id}`} className="p-4 lg:p-5 bg-blue-900/10 border border-blue-500/20 hover:bg-blue-900/20 transition-colors flex flex-col gap-4 rounded-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 rounded-sm">
                              <HandCoins size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm lg:text-base font-semibold text-zinc-100 truncate">{entry.description}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">Custom Donation</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-base lg:text-lg font-semibold text-blue-400">+৳{entry.amount}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500/70 mt-0.5">Donation</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-blue-500/10 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                          <span>Logged by: {entry.recorder?.full_name || 'System'}</span>
                          <p>{formatTimestamp(entry.created_at)}</p>
                        </div>
                      </div>
                    );
                  }

                  // Expense entry
                  if (entry._kind === 'expense') {
                    return (
                      <div key={`e-${entry.id}`} className="p-4 lg:p-5 bg-rose-900/10 border border-rose-500/20 hover:bg-rose-900/20 transition-colors flex flex-col gap-4 rounded-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 rounded-sm">
                              <TrendingDown size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm lg:text-base font-semibold text-zinc-100 truncate">{entry.description}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">Expense</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-base lg:text-lg font-semibold text-rose-400">−৳{entry.amount}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-500/70 mt-0.5">Expense</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-rose-500/10 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                          <span>Logged by: {entry.recorder?.full_name || 'System'}</span>
                          <p>{formatTimestamp(entry.created_at)}</p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}