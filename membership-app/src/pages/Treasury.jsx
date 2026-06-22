import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ReceiptText, AlertTriangle, Download, Search, FileText, BarChart3, LayoutList, HandCoins, TrendingDown, Trash2, Globe, History, PlusCircle, MinusCircle } from 'lucide-react';

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
  const { profile } = useAuth();
  const isAdmin = ['admin', 'treasurer', 'president', 'convenor'].includes(profile?.role);
  const navigate = useNavigate();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [finances, setFinances] = useState({ expected: 0, actual: 0, deficit: 0 });
  const [transactions, setTransactions] = useState([]);
  const [customTransactions, setCustomTransactions] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [globalFund, setGlobalFund] = useState(0);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Controls mobile layout tabs
  const [mobileTab, setMobileTab] = useState('overview');
  // Controls right panel on desktop (and active view on mobile)
  const [rightPanelMode, setRightPanelMode] = useState('ledger'); // 'ledger' | 'logs'

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

    // Fetch Audit Logs
    const { data: logsData } = await supabase
      .from('treasury_logs')
      .select(`
        *,
        performer:profiles!treasury_logs_performed_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100); 
    setLogs(logsData || []);

    // Global fund calculation
    const { data: allPayments } = await supabase.from('payments').select('amount');
    const { data: allCustom } = await supabase.from('custom_transactions').select('type, amount');
    const totalAllPayments = (allPayments || []).reduce((s, t) => s + t.amount, 0);
    const totalAllDonations = (allCustom || []).filter(t => t.type === 'donation').reduce((s, t) => s + t.amount, 0);
    const totalAllExpenses  = (allCustom || []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    setGlobalFund(totalAllPayments + totalAllDonations - totalAllExpenses);

    setLoading(false);
  };

  const deleteCustomTransaction = async (entry) => {
    if (!window.confirm(`Remove this ${entry.type} entry of ৳${entry.amount}?`)) return;

    await supabase.from('treasury_logs').insert({
      action_type: 'DELETED',
      entity_type: entry.type.toUpperCase(),
      amount: entry.amount,
      details: `Removed ${entry.type}: "${entry.description}" (Originally for ${entry.for_month})`,
      performed_by: profile.id
    });

    const { error } = await supabase.from('custom_transactions').delete().eq('id', entry.id);
    if (error) { alert('Failed: ' + error.message); return; }
    fetchTreasuryData();
  };

  const deleteMemberPayment = async (entry) => {
    if (!window.confirm(`Remove member payment of ৳${entry.amount} for ${entry.member?.full_name}?`)) return;

    await supabase.from('treasury_logs').insert({
      action_type: 'DELETED',
      entity_type: 'MEMBER_PAYMENT',
      amount: entry.amount,
      details: `Removed member due for ${entry.member?.full_name || 'Unidentified'}`,
      performed_by: profile.id
    });

    const { error } = await supabase.from('payments').delete().eq('id', entry.id);
    if (error) { alert('Failed: ' + error.message); return; }
    fetchTreasuryData();
  };

  const totalDonations = customTransactions.filter(t => t.type === 'donation').reduce((s, t) => s + t.amount, 0);
  const totalExpenses  = customTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const adjustedTotal = finances.actual + totalDonations - totalExpenses;
  const progressPercentage = finances.expected > 0 ? Math.min(100, Math.round((finances.actual / finances.expected) * 100)) : 0;
  const monthlyDeficit = Math.max(0, finances.expected - finances.actual);

  const formatTimestamp = (timestamp) => {
    const d = new Date(timestamp);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  // --- ASCII GENERATOR ---
  const generateTextStatement = () => {
    if (allMembers.length === 0 && transactions.length === 0) return alert("No operational data found to export.");
    
    const dateObj = new Date(`${selectedMonth}-01`);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();
    const pad = (str, len) => (str || '').toString().substring(0, len).padEnd(len, ' ');

    let report = `================================================================================\n`;
    report += `                    HASHIMUKH FOUNDATION - TREASURY REPORT                      \n`;
    report += `================================================================================\n`;
    report += ` Period:       ${monthName} ${year}\n`;
    report += ` Generated on: ${new Date().toLocaleString('en-GB')}\n`;
    report += `--------------------------------------------------------------------------------\n`;
    report += ` FINANCIAL SUMMARY\n`;
    report += `--------------------------------------------------------------------------------\n`;
    report += ` Target Collection:     ${finances.expected.toLocaleString()} BDT\n`;
    report += ` Actual Collected:      ${finances.actual.toLocaleString()} BDT\n`;
    report += ` Custom Donations:      + ${totalDonations.toLocaleString()} BDT\n`;
    report += ` Monthly Expenses:      - ${totalExpenses.toLocaleString()} BDT\n`;
    report += ` Net Monthly Total:     ${adjustedTotal.toLocaleString()} BDT\n\n`;
    report += ` Global Fund (Total):   ${globalFund.toLocaleString()} BDT\n`;
    report += `================================================================================\n`;
    report += ` MEMBER CLEARANCE STATUS\n`;
    report += `================================================================================\n`;
    report += `| SN | Member Name                    | Role            | Amount  | Status     |\n`;
    report += `|----|--------------------------------|-----------------|---------|------------|\n`;

    allMembers.forEach((member, index) => {
      const sn = String(index + 1).padStart(2, '0');
      const name = member.full_name || 'Unidentified';
      let post = (member.role || 'Unassigned').replace('_', ' ');
      post = post.charAt(0).toUpperCase() + post.slice(1);
      
      const payment = transactions.find(tx => tx.member_id === member.id);
      const amountPaid = payment ? payment.amount : 0;
      const expected = member.role === 'patron' ? (member.patron_custom_amount || 0) : (RATES[member.role] ?? 100);
      
      let status = expected === 0 ? 'Exempt' : amountPaid >= expected ? 'Fulfilled' : amountPaid > 0 ? 'Partial' : 'Due';
      
      report += `| ${sn} | ${pad(name, 30)} | ${pad(post, 15)} | ${pad(amountPaid.toString(), 7)} | ${pad(status, 10)} |\n`;
    });
    report += `================================================================================\n`;

    if (customTransactions.length > 0) {
      report += `\n================================================================================\n`;
      report += ` CUSTOM TRANSACTIONS (DONATIONS & EXPENSES)\n`;
      report += `================================================================================\n`;
      report += `| Date       | Type       | Description                    | Amount          |\n`;
      report += `|------------|------------|--------------------------------|-----------------|\n`;
      
      customTransactions.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleDateString('en-GB');
        const type = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
        const sign = tx.type === 'expense' ? '-' : '+';
        report += `| ${pad(date, 10)} | ${pad(type, 10)} | ${pad(tx.description, 30)} | ${pad(sign + tx.amount.toLocaleString(), 15)} |\n`;
      });
      report += `================================================================================\n`;
    }

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `HF_STATEMENT_${monthName.toUpperCase()}_${year}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV GENERATOR ---
  const exportToCSV = () => {
    if (allMembers.length === 0 && transactions.length === 0) return alert("No operational data found to export.");

    const dateObj = new Date(`${selectedMonth}-01`);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();

    // 1. Member Status Section
    let csvContent = `Hashimukh Foundation - Financial Report (${monthName} ${year})\n\n`;
    
    csvContent += `MEMBER CLEARANCE STATUS\n`;
    csvContent += `Member Name,Role,Expected (BDT),Paid (BDT),Status,Payment Date,Authorized By\n`;
    
    allMembers.forEach(member => {
      const payment = transactions.find(tx => tx.member_id === member.id);
      const expected = member.role === 'patron' ? (member.patron_custom_amount || 0) : (RATES[member.role] ?? 100);
      const amountPaid = payment ? payment.amount : 0;
      let status = expected === 0 ? 'Exempt' : amountPaid >= expected ? 'Fulfilled' : amountPaid > 0 ? 'Partial' : 'Due';
      
      const datePaid = payment ? new Date(payment.paid_at).toLocaleDateString('en-GB') : '--';
      const authBy = payment ? (payment.recorder?.full_name || 'System') : '--';
      
      const safeName = `"${(member.full_name || 'Unidentified').replace(/"/g, '""')}"`;
      const safeRole = `"${(member.role || 'Unassigned').replace('_', ' ').toUpperCase()}"`;
      const safeAuth = `"${authBy.replace(/"/g, '""')}"`;

      csvContent += `${safeName},${safeRole},${expected},${amountPaid},${status},${datePaid},${safeAuth}\n`;
    });

    // 2. Custom Transactions Section
    csvContent += `\nCUSTOM TRANSACTIONS (DONATIONS & EXPENSES)\n`;
    csvContent += `Date,Type,Description,Amount (BDT),Authorized By\n`;
    
    if (customTransactions.length === 0) {
      csvContent += `No custom transactions for this period.\n`;
    } else {
      customTransactions.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleDateString('en-GB');
        const type = tx.type.toUpperCase();
        const safeDesc = `"${tx.description.replace(/"/g, '""')}"`;
        const safeAuth = `"${(tx.recorder?.full_name || 'System').replace(/"/g, '""')}"`;
        const amount = tx.type === 'expense' ? `-${tx.amount}` : tx.amount;
        
        csvContent += `${date},${type},${safeDesc},${amount},${safeAuth}\n`;
      });
    }

    // 3. Summary Section
    csvContent += `\nMONTHLY SUMMARY\n`;
    csvContent += `Target Collection,${finances.expected}\n`;
    csvContent += `Actual Collected,${finances.actual}\n`;
    csvContent += `Total Donations,${totalDonations}\n`;
    csvContent += `Total Expenses,-${totalExpenses}\n`;
    csvContent += `Net Monthly Total,${adjustedTotal}\n`;
    csvContent += `Global Fund (All Time),${globalFund}\n`;

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

  const allLedgerEntries = [
    ...filteredTransactions.map(tx => ({ ...tx, _kind: 'member' })),
    ...filteredCustom.map(tx => ({ ...tx, _kind: tx.type })),
  ].sort((a, b) => new Date(b.paid_at || b.created_at) - new Date(a.paid_at || a.created_at));

  const filteredLogs = logs.filter(log => 
    log.details.toLowerCase().includes(search.toLowerCase()) || 
    (log.performer?.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 h-full overflow-hidden text-zinc-100 font-sans">
      
      <div className="bg-zinc-950 border-b border-zinc-800 shrink-0 z-20">
        <div className="w-full max-w-7xl mx-auto p-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-0.5">Financial Report</p>
                <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none">Treasury Dashboard</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex lg:hidden w-full border-b border-zinc-800 bg-zinc-950 shrink-0">
        <button onClick={() => setMobileTab('overview')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${mobileTab === 'overview' ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
          <BarChart3 size={16} /> Overview
        </button>
        <button onClick={() => { setMobileTab('panel'); setRightPanelMode('ledger'); }} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${mobileTab === 'panel' && rightPanelMode === 'ledger' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
          <LayoutList size={16} /> Ledger
        </button>
        <button onClick={() => { setMobileTab('panel'); setRightPanelMode('logs'); }} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${mobileTab === 'panel' && rightPanelMode === 'logs' ? 'border-rose-500 text-rose-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
          <History size={16} /> Logs
        </button>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT: Stats & Controls */}
        <div className={`w-full lg:w-[400px] xl:w-[450px] p-4 lg:p-8 flex-col gap-6 shrink-0 lg:border-r lg:border-zinc-800 overflow-y-auto hide-scrollbar bg-zinc-950/50 ${mobileTab === 'overview' ? 'flex' : 'hidden lg:flex'}`}>
          
          <div className="hidden lg:flex p-1 bg-zinc-900/80 border border-zinc-800 rounded-sm mb-2">
            <button 
              onClick={() => setRightPanelMode('ledger')} 
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors rounded-sm flex justify-center items-center gap-2 ${rightPanelMode === 'ledger' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutList size={14} /> View Ledger
            </button>
            <button 
              onClick={() => setRightPanelMode('logs')} 
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors rounded-sm flex justify-center items-center gap-2 ${rightPanelMode === 'logs' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <History size={14} /> Activity Logs
            </button>
          </div>

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

          <div className="p-5 bg-gradient-to-br from-blue-900/20 to-zinc-900/40 border border-blue-500/30 rounded-sm flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={14} className="text-blue-400" />
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Global Fund (All Time)</p>
            </div>
            <p className="text-3xl font-semibold text-white">৳{globalFund.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-1">All dues + donations − expenses</p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">This Month</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 flex flex-col rounded-sm">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Target</p>
                <p className="text-2xl font-semibold text-zinc-300">৳{finances.expected}</p>
              </div>
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 flex flex-col rounded-sm">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Collected</p>
                <p className="text-2xl font-semibold text-zinc-300">৳{finances.actual}</p>
              </div>
              {totalDonations > 0 && (
                <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 flex flex-col rounded-sm">
                  <p className="text-xs font-medium text-emerald-500/80 uppercase tracking-wider mb-2">Donations</p>
                  <p className="text-xl font-semibold text-emerald-400">+৳{totalDonations}</p>
                </div>
              )}
              {totalExpenses > 0 && (
                <div className="p-4 bg-rose-900/10 border border-rose-500/20 flex flex-col rounded-sm">
                  <p className="text-xs font-medium text-rose-400/80 uppercase tracking-wider mb-2">Expenses</p>
                  <p className="text-xl font-semibold text-rose-400">−৳{totalExpenses}</p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="flex mb-2 items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Monthly Collection Progress</span>
              <span className="text-xs font-semibold text-blue-400">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-zinc-900 border border-zinc-800 h-2.5 rounded-sm overflow-hidden">
              <div style={{ width: `${progressPercentage}%` }} className="bg-blue-500 h-full transition-all duration-500"></div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Based on member dues only</p>
          </div>

          {monthlyDeficit > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 flex items-center justify-between rounded-sm">
              <div className="flex items-center">
                <AlertTriangle className="text-rose-500 mr-3 shrink-0" size={18} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-0.5">Deficit Detected</p>
                  <p className="text-sm text-rose-400/80">Short by ৳{monthlyDeficit}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Ledger or Logs */}
        <div className={`flex-1 flex-col overflow-hidden relative ${mobileTab === 'panel' || mobileTab === 'ledger' || mobileTab === 'logs' ? 'flex' : 'hidden lg:flex'}`}>
          
          <div className="sticky top-0 bg-zinc-950 p-4 lg:p-8 pb-4 lg:pb-6 z-10 shrink-0 border-b border-zinc-800 lg:border-none">
            <div className="relative group mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="text" placeholder={`Search ${rightPanelMode === 'ledger' ? 'ledger' : 'logs'}...`} className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-500 text-sm md:text-base rounded-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                {rightPanelMode === 'ledger' ? (
                  <ReceiptText size={16} className="text-zinc-500" />
                ) : (
                  <History size={16} className="text-zinc-500" />
                )}
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
                  {rightPanelMode === 'ledger' ? 'Clearance Ledger' : 'Activity Logs'}
                </h3>
              </div>
              <span className="text-xs font-medium text-zinc-500">
                {rightPanelMode === 'ledger' ? `${allLedgerEntries.length} Records` : `${filteredLogs.length} Events`}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 hide-scrollbar">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed bg-zinc-900/20 rounded-sm">
                <p className="text-sm font-medium tracking-wide animate-pulse">Scanning...</p>
              </div>
            ) : rightPanelMode === 'ledger' ? (
              // ---------------- LEDGER VIEW ----------------
              allLedgerEntries.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 border border-zinc-800 bg-zinc-900/20 text-sm rounded-sm">No records found for this period.</div>
              ) : (
                <div className="flex flex-col gap-3 lg:gap-4 pb-8">
                  {allLedgerEntries.map(entry => {
                    // Member payment entry
                    if (entry._kind === 'member') {
                      return (
                        <div key={`m-${entry.id}`} className="p-4 lg:p-5 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800/40 transition-colors flex flex-col gap-4 rounded-sm">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 rounded-sm">
                                <Check strokeWidth={2.5} size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm lg:text-base font-semibold text-zinc-100 truncate">{entry.member?.full_name || 'Unidentified'}</p>
                                <p className="text-xs text-zinc-500 capitalize mt-0.5 truncate">{entry.member?.role.replace('_', ' ')}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-base lg:text-lg font-semibold text-emerald-400">+৳{entry.amount}</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-zinc-800/50 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                            <span>Auth: {entry.recorder?.full_name || 'System'}</span>
                            <div className="flex items-center gap-3">
                              <p>{formatTimestamp(entry.paid_at)}</p>
                              {isAdmin && (
                                <button onClick={() => deleteMemberPayment(entry)} className="text-zinc-600 hover:text-rose-400 transition-colors" title="Remove entry">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Custom entry (donation/expense)
                    return (
                      <div key={`${entry._kind}-${entry.id}`} className={`p-4 lg:p-5 border flex flex-col gap-4 rounded-sm transition-colors ${entry._kind === 'donation' ? 'bg-blue-900/10 border-blue-500/20 hover:bg-blue-900/20' : 'bg-rose-900/10 border-rose-500/20 hover:bg-rose-900/20'}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-sm border ${entry._kind === 'donation' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                              {entry._kind === 'donation' ? <HandCoins size={18} /> : <TrendingDown size={18} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm lg:text-base font-semibold text-zinc-100 truncate">{entry.description}</p>
                              <p className="text-xs text-zinc-500 mt-0.5 capitalize">{entry._kind}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className={`text-base lg:text-lg font-semibold ${entry._kind === 'donation' ? 'text-blue-400' : 'text-rose-400'}`}>
                              {entry._kind === 'donation' ? '+' : '−'}৳{entry.amount}
                            </p>
                          </div>
                        </div>
                        <div className={`flex justify-between items-center pt-3 border-t text-[10px] uppercase tracking-wider font-medium ${entry._kind === 'donation' ? 'border-blue-500/10 text-blue-500/70' : 'border-rose-500/10 text-rose-500/70'}`}>
                          <span>Logged by: {entry.recorder?.full_name || 'System'}</span>
                          <div className="flex items-center gap-3">
                            <p>{formatTimestamp(entry.created_at)}</p>
                            {isAdmin && (
                              <button onClick={() => deleteCustomTransaction(entry)} className="text-zinc-500 hover:text-white transition-colors" title="Remove entry">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // ---------------- LOGS VIEW ----------------
              filteredLogs.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 border border-zinc-800 bg-zinc-900/20 text-sm rounded-sm">No activity logs found.</div>
              ) : (
                <div className="flex flex-col gap-3 pb-8">
                  {filteredLogs.map(log => (
                    <div key={log.id} className="p-4 bg-zinc-900/40 border border-zinc-800 flex flex-col gap-3 rounded-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 shrink-0 ${log.action_type === 'DELETED' ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {log.action_type === 'DELETED' ? <MinusCircle size={16} /> : <PlusCircle size={16} />}
                          </div>
                          <div>
                            <p className="text-sm text-zinc-200">{log.details}</p>
                            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-1">
                              Amount: ৳{log.amount} • {log.entity_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider ${log.action_type === 'DELETED' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {log.action_type}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50 text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
                        <span>User: {log.performer?.full_name || 'System'}</span>
                        <span>{formatTimestamp(log.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}