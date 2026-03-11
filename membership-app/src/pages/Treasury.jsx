import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ReceiptText, AlertTriangle, Download, Search, FileText, BarChart3 } from 'lucide-react';

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
  const [allMembers, setAllMembers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

    const { data: txData, error } = await supabase
      .from('payments')
      .select(`
        id, amount, paid_at, member_id, recorded_by,
        member:profiles!payments_member_id_fkey(full_name, role, department),
        recorder:profiles!payments_recorded_by_fkey(full_name)
      `)
      .eq('for_month', selectedMonth)
      .order('paid_at', { ascending: false });

    if (error) console.error('Error fetching treasury logs:', error);
    else setTransactions(txData || []);
    
    setLoading(false);
  };

  const formatTimestamp = (timestamp) => {
    const dateObj = new Date(timestamp);
    const date = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const time = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  const generateTextStatement = () => {
    if (allMembers.length === 0) return alert("DATABASE_ERROR: NO_OPERATIVE_DATA_FOUND");

    const dateObj = new Date(`${selectedMonth}-01`);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear();
    const periodString = `${monthName}, ${year}`;
    
    const pad = (str, len) => (str || '').toString().substring(0, len).padEnd(len, ' ');

    let report = `                            STATEMENT - ${periodString.toUpperCase()}\n\n`;
    report += `Hashimukh Foundation / Funding statement\n`;
    report += `--------------------------------------------------------------------------------------------------\n`;
    report += `Statement period: ${monthName}, ${year}\n`;
    report += `Fundraised: ${finances.actual.toLocaleString()} BDT\n`;
    report += `Expected raise: ${finances.expected.toLocaleString()} BDT\n\n`;
    report += `Timestamp: ${new Date().toLocaleString('en-GB')}\n`;
    report += `--------------------------------------------------------------------------------------------------\n\n`;

    report += `| SN | Name                            | Manager                       | Post            | Status    |\n`;
    report += `|----|---------------------------------|-------------------------------|-----------------|-----------|\n`;

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

      let status = 'Due';
      if (amountPaid >= expected && expected > 0) {
        status = 'Fulfilled';
      } else if (amountPaid > 0) {
        status = 'Partial';
      } else if (expected === 0) {
        status = 'Exempt'; 
      }

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
      const isPaid = !!payment;

      const safeName = member.full_name || 'Unidentified Operative';
      const safeRole = (member.role || 'Unassigned').replace('_', ' ').toUpperCase();

      return [
        `"${safeName}"`,
        `"${safeRole}"`,
        isPaid ? "PAID" : "UNPAID",
        isPaid ? payment.amount : 0,
        `"${selectedMonth}"`,
        isPaid ? `"${new Date(payment.paid_at).toLocaleDateString('en-GB')}"` : '"--"',
        isPaid ? `"${payment.recorder?.full_name || 'System'}"` : '"--"'
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

  const filteredTransactions = transactions.filter(tx => {
    const safeName = tx.member?.full_name || '';
    return safeName.toLowerCase().includes(search.toLowerCase());
  });

  const progressPercentage = finances.expected > 0 
    ? Math.min(100, Math.round((finances.actual / finances.expected) * 100)) 
    : 0;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 h-full overflow-hidden text-zinc-100 font-sans">
      
      {/* Sleek Header */}
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

      {/* Main Content Area - Switches to a side-by-side split on Desktop */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT COLUMN: Control Sector & Stats */}
        <div className="w-full lg:w-[400px] xl:w-[450px] p-4 lg:p-8 flex flex-col gap-6 shrink-0 lg:border-r lg:border-zinc-800 lg:overflow-y-auto hide-scrollbar border-b border-zinc-800 lg:border-b-0 bg-zinc-950/50">
            
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                    <BarChart3 size={16} className="text-zinc-500" />
                    <h3 className="text-sm font-semibold text-zinc-300 tracking-wide">Period Selection</h3>
                </div>
                {/* Period Selector */}
                <div className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 flex flex-col justify-center hover:border-zinc-700 transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 rounded-sm">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Active Cycle</label>
                    <input 
                    type="month" 
                    className="w-full bg-transparent text-white text-base md:text-lg font-medium outline-none cursor-pointer"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                </div>
                
                {/* Export Buttons */}
                <div className="flex gap-2">
                    <button 
                    onClick={generateTextStatement}
                    className="flex-1 bg-zinc-900 border border-zinc-800 py-3 px-4 text-xs font-medium text-zinc-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2 rounded-sm group"
                    >
                        <FileText size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                        ASCII Report
                    </button>

                    <button 
                    onClick={exportToCSV}
                    className="flex-1 bg-zinc-900 border border-zinc-800 py-3 px-4 text-xs font-medium text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2 rounded-sm group"
                    >
                        <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                        CSV Ledger
                    </button>
                </div>
            </div>

            {/* Global Financial Stat Cards */}
            <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between rounded-sm">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Target Expected</p>
                <p className="text-2xl lg:text-3xl font-semibold text-zinc-300">৳{finances.expected}</p>
            </div>
            <div className="p-5 bg-blue-900/10 border border-blue-500/30 flex flex-col justify-between rounded-sm">
                <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2">Total Raised</p>
                <p className="text-2xl lg:text-3xl font-semibold text-white">৳{finances.actual}</p>
            </div>
            </div>

            {/* Progress System */}
            <div>
                <div className="flex mb-2 items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Collection Progress
                    </span>
                    <span className="text-xs font-semibold text-blue-400">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-zinc-900 border border-zinc-800 h-2.5 rounded-sm overflow-hidden">
                    <div style={{ width: `${progressPercentage}%` }} className="bg-blue-500 h-full transition-all duration-500"></div>
                </div>
            </div>

            {/* Deficit Warning */}
            {finances.deficit > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 flex items-center justify-between rounded-sm">
                <div className="flex items-center">
                    <AlertTriangle className="text-rose-500 mr-3 shrink-0" size={18} />
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-0.5">Deficit Detected</p>
                        <p className="text-sm text-rose-400/80">Short by ৳{finances.deficit}</p>
                    </div>
                </div>
            </div>
            )}
        </div>

        {/* RIGHT COLUMN: Scrollable Ledger Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* Search & Header - Sticky within the right column */}
            <div className="sticky top-0 bg-zinc-950 p-4 lg:p-8 pb-4 lg:pb-6 z-10 shrink-0 border-b border-zinc-800 lg:border-none">
            <div className="relative group mb-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                type="text" 
                placeholder="Search operative records..." 
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-500 text-sm md:text-base rounded-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <ReceiptText size={16} className="text-zinc-500" />
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
                    Clearance Ledger
                </h3>
            </div>
            </div>
            
            {/* Scrolling Transaction List */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 hide-scrollbar">
                {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed bg-zinc-900/20 rounded-sm">
                    <p className="text-sm font-medium tracking-wide animate-pulse">Scanning monthly packets...</p>
                </div>
                ) : filteredTransactions.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 border border-zinc-800 bg-zinc-900/20 text-sm md:text-base rounded-sm">
                    No authorized payments found.
                </div>
                ) : (
                <div className="flex flex-col gap-3 lg:gap-4 pb-8">
                    {filteredTransactions.map(tx => {
                    const safeRole = tx.member?.role === 'executive' && tx.member.department 
                        ? `${tx.member.department} Exec` 
                        : (tx.member?.role || 'Unassigned').replace('_', ' ');

                    return (
                        <div key={tx.id} className="p-4 lg:p-5 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800/40 transition-colors group flex flex-col gap-4 rounded-sm">
                        
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 rounded-sm">
                                <Check strokeWidth={2.5} size={18} />
                            </div>
                            <div className="min-w-0">
                                <Link to={`/member/${tx.member_id}`} className="text-sm lg:text-base font-semibold text-zinc-100 hover:text-blue-400 transition-colors truncate block">
                                    {tx.member?.full_name || 'Unidentified Operative'}
                                </Link>
                                <p className="text-xs lg:text-sm text-zinc-500 capitalize mt-0.5 lg:mt-1 truncate">
                                    {safeRole}
                                </p>
                            </div>
                            </div>

                            <div className="text-right shrink-0 ml-4">
                                <p className="text-base lg:text-lg font-semibold text-emerald-400">+৳{tx.amount}</p>
                                <p className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider text-emerald-500/70 mt-0.5 lg:mt-1">Cleared</p>
                            </div>
                        </div>

                        {/* Metadata Footer */}
                        <div className="flex justify-between items-center pt-3 border-t border-zinc-800/50 text-[10px] lg:text-xs uppercase tracking-wider text-zinc-500 font-medium">
                            <div className="flex items-center gap-1.5 lg:gap-2">
                                <ReceiptText size={12} className="opacity-70 lg:w-4 lg:h-4"/> 
                                <span>Auth: {tx.recorder?.full_name || 'System'}</span>
                            </div>
                            <p>{formatTimestamp(tx.paid_at)}</p>
                        </div>

                        </div>
                    )
                    })}
                </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}