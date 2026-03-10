import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ReceiptText, UserCircle, TrendingDown, AlertTriangle, Download, Search } from 'lucide-react';

export default function Treasury() {
  const navigate = useNavigate();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [finances, setFinances] = useState({ expected: 0, actual: 0, deficit: 0 });
  const [transactions, setTransactions] = useState([]);
  const [allMembers, setAllMembers] = useState([]); // Used for generating the full CSV
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTreasuryData();
  }, [selectedMonth]);

  const fetchTreasuryData = async () => {
    setLoading(true);

    // 1. Fetch Global Financial Stats for the month
    const { data: financeData } = await supabase.rpc('get_monthly_finances', { month_val: selectedMonth });
    if (financeData) setFinances(financeData);

    // 2. Fetch all operative profiles (to identify unpaid members)
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, role').order('full_name');
    setAllMembers(profiles || []);

    // 3. Fetch successful payments for this month
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

  // Advanced CSV Export: Includes Paid and Unpaid status
  const exportToCSV = () => {
    if (allMembers.length === 0) return alert("DATABASE_ERROR: NO_OPERATIVE_DATA_FOUND");

    // CSV Headers
    const headers = ["Member Name", "Current Role", "Status", "Amount (BDT)", "Month", "Date Paid", "Authorized By"];
    
    // Cross-reference all members with existing transactions
    const rows = allMembers.map(member => {
      const payment = transactions.find(tx => tx.member_id === member.id);
      const isPaid = !!payment;

      return [
        `"${member.full_name}"`,
        `"${member.role.replace('_', ' ').toUpperCase()}"`,
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

  // Filter the UI list by search
  const filteredTransactions = transactions.filter(tx => 
    tx.member?.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const progressPercentage = finances.expected > 0 
    ? Math.min(100, Math.round((finances.actual / finances.expected) * 100)) 
    : 0;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden selection:bg-blue-500 selection:text-white">
      
      {/* Tactical Header */}
      <div className="p-6 bg-slate-950 border-b-4 border-slate-800 flex items-center gap-4 z-20 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-900 border-2 border-slate-700 text-slate-400 hover:text-white hover:border-blue-500 transition-colors shadow-[2px_2px_0px_0px_#020617] hover:shadow-[2px_2px_0px_0px_#3b82f6]">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">// FINANCIAL REPORT</p>
          <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter leading-none mt-1">Treasury</h2>
        </div>
      </div>

      {/* Control Sector */}
      <div className="p-4 flex flex-col gap-5 shrink-0 z-10 border-b-4 border-slate-900">
        
        <div className="flex gap-3">
            {/* Period Selector */}
            <div className="flex-1 bg-slate-900 border-2 border-slate-800 p-2 shadow-[4px_4px_0px_0px_#020617] flex justify-between items-center relative">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono absolute -top-2.5 left-2 bg-slate-950 px-1">Active Cycle</p>
                <input 
                  type="month" 
                  className="text-lg font-black text-blue-400 bg-transparent outline-none text-center w-full uppercase tracking-widest font-mono cursor-pointer"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
            </div>

            {/* Download Button */}
            <button 
              onClick={exportToCSV}
              className="bg-slate-900 border-2 border-slate-800 p-3 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 shadow-[4px_4px_0px_0px_#020617] hover:shadow-[4px_4px_0px_0px_#10b981] transition-all group"
              title="Download Full CSV Ledger"
            >
                <Download size={24} className="group-hover:translate-y-[1px] transition-transform" />
            </button>
        </div>

        {/* Global Financial Stat Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 border-l-4 border-slate-600 shadow-[4px_4px_0px_0px_#020617]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 font-mono">Target</p>
              <p className="text-xl font-mono font-bold text-slate-300">৳{finances.expected}</p>
          </div>
          <div className="p-4 bg-slate-900 border-2 border-white shadow-[4px_4px_0px_0px_#ffffff]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-500 mb-1 font-mono">Raised</p>
              <p className="text-2xl font-mono font-bold text-white">৳{finances.actual}</p>
          </div>
        </div>

        {/* Progress System */}
        <div className="relative">
            <div className="flex mb-2 items-end justify-between">
                <div>
                    <span className="text-[10px] font-bold font-mono inline-block py-1 px-2 uppercase text-blue-400 bg-blue-900/30 border border-blue-900 tracking-widest">
                        System Progress
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-xs font-black inline-block text-blue-400">{progressPercentage}%</span>
                </div>
            </div>
            <div className="overflow-hidden h-4 text-xs flex bg-slate-800 border-2 border-slate-700 shadow-inner">
                <div style={{ width: `${progressPercentage}%` }} className="bg-blue-600 transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            </div>
        </div>

        {/* Deficit Warning */}
        {finances.deficit > 0 && (
          <div className="bg-rose-950/20 border-2 border-rose-600 p-3 flex items-center justify-between shadow-[4px_4px_0px_0px_#4c0519] animate-pulse">
              <div className="flex items-center">
                  <AlertTriangle className="text-rose-500 mr-3" size={20} />
                  <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 font-mono font-black">Deficit Detected</p>
                      <p className="text-xs text-rose-400 font-mono font-bold mt-0.5">SHORT BY ৳{finances.deficit}</p>
                  </div>
              </div>
              <span className="text-[10px] font-mono bg-rose-900 text-rose-100 px-2 py-1 uppercase font-black border border-rose-700">CRITICAL</span>
          </div>
        )}
      </div>

      {/* Scrollable Ledger Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        
        {/* Search & Header */}
        <div className="sticky top-0 bg-slate-950 py-4 z-10 flex flex-col gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="SEARCH OPERATIVE DESIGNATION..." 
              className="w-full pl-10 p-2.5 bg-slate-900 border-2 border-slate-800 text-slate-200 shadow-[4px_4px_0px_0px_#020617] focus:border-blue-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#3b82f6] outline-none transition-all uppercase text-[10px] tracking-[0.2em] font-mono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-900 pb-1">
              Clearence Ledger // Records
          </h3>
        </div>
        
        {loading ? (
          <div className="py-12 text-center text-slate-600 flex flex-col items-center border-2 border-dashed border-slate-800 bg-slate-900/50">
            <p className="text-[10px] font-mono uppercase tracking-widest animate-pulse">Scanning monthly packets...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-10 text-center bg-slate-900 border-2 border-slate-800 text-slate-600 uppercase text-[10px] tracking-widest font-mono">
            No Authorized Payments Found
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTransactions.map(tx => (
              <div key={tx.id} className="bg-slate-900 border-l-4 border-emerald-500 border-y-2 border-r-2 border-slate-800 p-3 shadow-[4px_4px_0px_0px_#020617] hover:bg-slate-800/30 transition-all group">
                
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-500 flex items-center justify-center">
                        <Check strokeWidth={3} size={16} />
                    </div>
                    <div>
                        <Link to={`/member/${tx.member_id}`} className="text-xs font-black uppercase text-slate-100 hover:text-blue-400 transition-colors">
                            {tx.member?.full_name}
                        </Link>
                        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                            {tx.member?.role.replace('_', ' ')}
                        </p>
                    </div>
                  </div>

                  <div className="text-right">
                      <p className="text-sm font-mono font-black text-emerald-400">+৳{tx.amount}.00</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Cleared</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800/50 font-mono text-[9px] text-slate-600 uppercase tracking-widest">
                    <p><ReceiptText size={10} className="inline mr-1 opacity-50"/> AUTH: {tx.recorder?.full_name || 'SYSTEM'}</p>
                    <p>{formatTimestamp(tx.paid_at)}</p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}