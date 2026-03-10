import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { CheckCircle, XCircle, X, Save, AlertCircle, BellRing, Coins, Target, PenTool } from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  
  const [myDonations, setMyDonations] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [members, setMembers] = useState([]);
  
  const [filter, setFilter] = useState('all');
  const [sendingBulk, setSendingBulk] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const currentMonthString = new Date().toISOString().slice(0, 7);
  const formattedMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const isAdminOrTreasurer = profile?.role === 'admin' || profile?.role === 'treasurer';

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    const { data: payments } = await supabase.from('payments').select('amount').eq('member_id', user.id);
    setMyDonations(payments?.reduce((sum, p) => sum + p.amount, 0) || 0);

    const { data: total } = await supabase.rpc('get_total_collected');
    setTotalCollected(total || 0);

    const { data: memberData } = await supabase.rpc('get_member_status_by_month', { month_val: currentMonthString });
    if (memberData) setMembers(memberData);
  };

  const startEditing = async () => {
    setIsEditing(true); 
    
    setEditData({
      phone: profile?.phone || '', blood_group: profile?.blood_group || '',
      date_of_birth: profile?.date_of_birth || '', home_address: profile?.home_address || '',
      institution: profile?.institution || '', field_of_study: profile?.field_of_study || '',
    });

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (data) {
      setEditData({
        phone: data.phone || '', 
        blood_group: data.blood_group || '',
        date_of_birth: data.date_of_birth || '', 
        home_address: data.home_address || '',
        institution: data.institution || '', 
        field_of_study: data.field_of_study || '',
      });
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update(editData).eq('id', user.id);
    setSaving(false);
    if (error) alert(error.message);
    else { alert("Configuration updated!"); setIsEditing(false); }
  };

  const filteredMembers = members.filter(m => {
    if (filter === 'cleared') return m.amount_paid >= m.expected_amount;
    if (filter === 'partial') return m.amount_paid > 0 && m.amount_paid < m.expected_amount;
    if (filter === 'unpaid') return m.amount_paid === 0;
    return true; 
  });

  const handleBulkReminder = async () => {
    const pendingMembers = filteredMembers.filter(m => m.amount_paid < m.expected_amount);
    if (pendingMembers.length === 0) return alert('No pending dues in this list.');
    if (!window.confirm(`Transmit reminder directive to ${pendingMembers.length} operatives?`)) return;

    setSendingBulk(true);
    let successCount = 0;
    for (const m of pendingMembers) {
      const { error } = await supabase.functions.invoke('send-email', { body: { type: 'reminder', memberId: m.id, month: formattedMonth } });
      if (!error) successCount++;
    }
    setSendingBulk(false);
    alert(`Signal transmitted to ${successCount}/${pendingMembers.length} operatives.`);
  };

  const nameParts = profile?.full_name?.split(' ') || ['UNIDENTIFIED', 'OPERATIVE'];
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto pb-6 h-full selection:bg-blue-500 selection:text-white">
      
      {/* Tactical Header Section */}
      <div className="p-6 shrink-0 bg-slate-950">
        <div className="flex justify-between items-end border-b-4 border-slate-800 pb-4">
            <div className="flex items-center gap-4">
                
                {/* Profile Box */}
                <div 
                  onClick={startEditing}
                  className="w-16 h-16 border-2 border-slate-700 p-1 shrink-0 relative group cursor-pointer shadow-[4px_4px_0px_0px_#020617] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#3b82f6] hover:border-blue-500 transition-all bg-slate-900"
                >
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all">
                        <span className="text-2xl font-black text-slate-300 group-hover:text-white">{firstName.charAt(0)}</span>
                    </div>
                    
                    <div className="absolute inset-0 bg-blue-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PenTool className="text-white" size={20} />
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">
                        // ACTIVE SESSION
                    </p>
                    <h1 className="text-2xl font-black uppercase text-slate-100 leading-none tracking-tighter">
                        {firstName}<br/>
                        <span className="text-slate-500">{lastName}</span>
                    </h1>
                    {/* PATCHED: Safe Role display in Header */}
                    <p className="text-[10px] font-mono text-blue-500 uppercase mt-1 tracking-wider font-bold border-t border-slate-800 pt-1">
                      ID: {profile?.role === 'executive' && profile?.department ? `${profile.department} Executive` : (profile?.role || 'UNASSIGNED').replace('_', ' ')}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Brutalist Edit Profile Modal */}
      {isEditing && (
        <div className="absolute inset-0 bg-slate-950 z-50 p-6 overflow-y-auto pb-24 border-l-8 border-blue-600">
          <div className="flex justify-between items-center mb-6 border-b-4 border-slate-800 pb-4">
            <div>
              <p className="text-[10px] font-mono text-blue-500 uppercase tracking-widest mb-1">// CONFIGURATION</p>
              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">Edit Parameters</h2>
            </div>
            <button onClick={() => setIsEditing(false)} className="p-2 border-2 border-slate-700 text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-all shadow-[2px_2px_0px_0px_#020617] hover:shadow-[2px_2px_0px_0px_#991b1b]">
              <X size={20}/>
            </button>
          </div>
          <form onSubmit={saveProfile} className="flex flex-col gap-4 font-mono">
            {/* Same Input Fields */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Phone Number</label>
              <input type="tel" className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#3b82f6] transition-all" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Blood Group</label>
              <input type="text" className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#3b82f6] transition-all" value={editData.blood_group} onChange={e => setEditData({...editData, blood_group: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Date of Birth</label>
              <input type="date" className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#3b82f6] transition-all" value={editData.date_of_birth} onChange={e => setEditData({...editData, date_of_birth: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Home Address</label>
              <textarea rows="2" className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#3b82f6] transition-all resize-none" value={editData.home_address} onChange={e => setEditData({...editData, home_address: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Institution</label>
              <input type="text" className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#3b82f6] transition-all" value={editData.institution} onChange={e => setEditData({...editData, institution: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Field of Study</label>
              <input type="text" className="w-full p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_#3b82f6] transition-all" value={editData.field_of_study} onChange={e => setEditData({...editData, field_of_study: e.target.value})} />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-blue-600 border-2 border-blue-500 text-white p-4 font-black uppercase tracking-widest mt-4 shadow-[4px_4px_0px_0px_#1e3a8a] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1e3a8a] transition-all flex justify-center items-center gap-2">
              <Save size={18} /> {saving ? 'UPLOADING...' : 'SAVE CONFIGURATION'}
            </button>
          </form>
        </div>
      )}

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4 px-4 pb-6 mt-2">
        <div className="bg-slate-900 p-5 border-2 border-slate-800 shadow-[4px_4px_0px_0px_#020617] hover:border-blue-500 hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#3b82f6] transition-all duration-200">
            <div className="text-blue-500 mb-3">
                <Coins size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em] block mb-1">
                My Total
            </span>
            <span className="text-2xl font-mono font-bold text-slate-100">
                ৳{myDonations}
            </span>
        </div>
        
        <div className="bg-slate-900 p-5 border-2 border-slate-800 shadow-[4px_4px_0px_0px_#020617] hover:border-emerald-500 hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#10b981] transition-all duration-200">
            <div className="text-emerald-500 mb-3">
                <Target size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em] block mb-1">
                Global Fund
            </span>
            <span className="text-2xl font-mono font-bold text-slate-100">
                ৳{totalCollected}
            </span>
        </div>
      </div>

      {/* Ledger Section */}
      <div className="px-4 flex-1">
        
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b-2 border-slate-800 pb-2">
            Tactical Overview // {formattedMonth}
        </h3>

        {/* Brutalist Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 border-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${filter === 'all' ? 'bg-blue-600 text-white border-blue-500 shadow-[2px_2px_0px_0px_#1d4ed8] translate-y-[-1px]' : 'bg-slate-900 text-slate-400 border-slate-700 shadow-[2px_2px_0px_0px_#020617] hover:border-slate-500'}`}>
            All
          </button>
          <button onClick={() => setFilter('cleared')} className={`px-4 py-2 border-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${filter === 'cleared' ? 'bg-emerald-600 text-white border-emerald-500 shadow-[2px_2px_0px_0px_#047857] translate-y-[-1px]' : 'bg-slate-900 text-slate-400 border-slate-700 shadow-[2px_2px_0px_0px_#020617] hover:border-emerald-500 hover:text-emerald-500'}`}>
            Cleared
          </button>
          <button onClick={() => setFilter('partial')} className={`px-4 py-2 border-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${filter === 'partial' ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-[2px_2px_0px_0px_#b45309] translate-y-[-1px]' : 'bg-slate-900 text-slate-400 border-slate-700 shadow-[2px_2px_0px_0px_#020617] hover:border-amber-500 hover:text-amber-500'}`}>
            Partial
          </button>
          <button onClick={() => setFilter('unpaid')} className={`px-4 py-2 border-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${filter === 'unpaid' ? 'bg-rose-600 text-white border-rose-500 shadow-[2px_2px_0px_0px_#be123c] translate-y-[-1px]' : 'bg-slate-900 text-slate-400 border-slate-700 shadow-[2px_2px_0px_0px_#020617] hover:border-rose-500 hover:text-rose-500'}`}>
            Unpaid
          </button>
        </div>

        {/* Bulk Directive Button */}
        {isAdminOrTreasurer && (filter === 'unpaid' || filter === 'partial') && filteredMembers.length > 0 && (
          <button 
            onClick={handleBulkReminder}
            disabled={sendingBulk}
            className="w-full mb-6 bg-blue-600 border-2 border-blue-500 text-white p-3 font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#1e3a8a] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1e3a8a] transition-all disabled:opacity-50"
          >
            <BellRing size={18} />
            {sendingBulk ? 'TRANSMITTING...' : `ISSUE DIRECTIVE (${filteredMembers.length})`}
          </button>
        )}

        {/* Member Status List */}
        <div className="flex flex-col gap-3">
          {filteredMembers.map(m => (
            <div key={m.id} className="bg-slate-900 p-3 border-2 border-slate-800 shadow-[4px_4px_0px_0px_#020617] flex items-center justify-between hover:translate-x-1 hover:border-blue-500/50 hover:shadow-[4px_4px_0px_0px_#3b82f6] transition-all cursor-default">
              <div>
                {/* PATCHED: Safe fallback for Names and Roles */}
                <p className="font-black text-slate-100 uppercase tracking-tight">{m.full_name || 'UNIDENTIFIED OPERATIVE'}</p>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                  {m.role === 'executive' && m.department ? `${m.department} EXEC` : (m.role || 'UNASSIGNED').replace('_', ' ')}
                </p>
              </div>
              <div className="flex flex-col items-end">
                {m.amount_paid >= m.expected_amount ? (
                  <CheckCircle className="text-emerald-500" strokeWidth={2.5} size={24} />
                ) : m.amount_paid > 0 ? (
                  <div className="flex items-center gap-1.5 bg-slate-950 border-2 border-amber-500/50 px-2 py-1">
                    <AlertCircle className="text-amber-500" size={16} strokeWidth={2.5} />
                    <span className="text-[10px] font-mono font-bold text-amber-500">{m.amount_paid}/{m.expected_amount} ৳</span>
                  </div>
                ) : (
                  <XCircle className="text-rose-500" strokeWidth={2.5} size={24} />
                )}
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="p-8 text-center text-slate-600 border-2 border-dashed border-slate-800 bg-slate-900/50">
              <p className="text-[10px] font-mono uppercase tracking-widest">No operatives match parameters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}