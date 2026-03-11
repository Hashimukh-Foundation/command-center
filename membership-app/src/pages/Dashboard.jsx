import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { CheckCircle2, XCircle, X, Save, AlertCircle, Bell, Wallet, Globe, Settings, User } from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  
  const [myDonations, setMyDonations] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [members, setMembers] = useState([]);
  
  const [filter, setFilter] = useState('all');
  const [sendingBulk, setSendingBulk] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [newPassword, setNewPassword] = useState(''); // Restored password state
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
    setNewPassword(''); // Clear password field on open
    
    setEditData({
      phone: profile?.phone || '', blood_group: profile?.blood_group || '',
      date_of_birth: profile?.date_of_birth || '', home_address: profile?.home_address || '',
      institution: profile?.institution || '', field_of_study: profile?.field_of_study || '',
    });

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setEditData({
        phone: data.phone || '', blood_group: data.blood_group || '',
        date_of_birth: data.date_of_birth || '', home_address: data.home_address || '',
        institution: data.institution || '', field_of_study: data.field_of_study || '',
      });
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Update password if provided
    if (newPassword) {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) {
        alert("Password update failed: " + authError.message);
        setSaving(false);
        return;
      }
    }

    // Update profile
    const { error } = await supabase.from('profiles').update(editData).eq('id', user.id);
    setSaving(false);
    if (error) alert(error.message);
    else { 
      setIsEditing(false); 
      setNewPassword('');
    }
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
    if (!window.confirm(`Send reminders to ${pendingMembers.length} members?`)) return;

    setSendingBulk(true);
    let successCount = 0;
    for (const m of pendingMembers) {
      const { error } = await supabase.functions.invoke('send-email', { body: { type: 'reminder', memberId: m.id, month: formattedMonth } });
      if (!error) successCount++;
    }
    setSendingBulk(false);
    alert(`Reminders sent to ${successCount}/${pendingMembers.length} members.`);
  };

  // Safe name parsing
  const safeFullName = profile?.full_name || 'Unidentified User';
  const nameParts = safeFullName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  // Safe role parsing
  const displayRole = profile?.role === 'executive' && profile?.department 
    ? `${profile.department} Executive` 
    : (profile?.role || 'Unassigned').replace('_', ' ');

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto pb-6 h-full text-zinc-100">
      
      {/* Sleek Header Section */}
      <div className="p-6 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
                {/* Modern Sharp Avatar */}
                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-400">
                    {firstName.charAt(0)}
                </div>

                <div>
                    <h1 className="text-xl font-semibold leading-tight text-white">
                        {firstName} {lastName}
                    </h1>
                    <p className="text-sm text-zinc-500 capitalize mt-0.5">
                      {displayRole}
                    </p>
                </div>
            </div>
            
            <button 
              onClick={startEditing}
              className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
              title="Account Settings"
            >
              <Settings size={18} />
            </button>
        </div>
      </div>

      {/* Modern Settings Modal (Overlay) */}
      {isEditing && (
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex flex-col p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg mx-auto shadow-2xl mt-4">
            <div className="flex justify-between items-center p-5 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Account Settings</h2>
              <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={saveProfile} className="p-5 flex flex-col gap-5">
              
              {/* Security Section */}
              <div className="pb-5 border-b border-zinc-800">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Update Password</label>
                <input 
                  type="password" 
                  placeholder="Leave blank to keep current" 
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                />
              </div>

              {/* Profile Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Phone</label>
                  <input type="tel" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Blood Group</label>
                  <input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={editData.blood_group} onChange={e => setEditData({...editData, blood_group: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Date of Birth</label>
                  <input type="date" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={editData.date_of_birth} onChange={e => setEditData({...editData, date_of_birth: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Address</label>
                  <textarea rows="2" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none" value={editData.home_address} onChange={e => setEditData({...editData, home_address: e.target.value})} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Institution</label>
                  <input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={editData.institution} onChange={e => setEditData({...editData, institution: e.target.value})} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Field of Study</label>
                  <input type="text" className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={editData.field_of_study} onChange={e => setEditData({...editData, field_of_study: e.target.value})} />
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full bg-white hover:bg-zinc-200 text-zinc-950 py-3.5 font-semibold transition-colors mt-2 flex justify-center items-center gap-2">
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sleek Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 flex flex-col justify-between">
            <div className="text-zinc-500 mb-4">
                <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">My Contribution</p>
              <p className="text-2xl font-semibold text-white">৳{myDonations}</p>
            </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 flex flex-col justify-between">
            <div className="text-blue-500 mb-4">
                <Globe size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Global Fund</p>
              <p className="text-2xl font-semibold text-white">৳{totalCollected}</p>
            </div>
        </div>
      </div>

      {/* Main Ledger Section */}
      <div className="px-4 flex-1 mt-2">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-sm font-medium text-zinc-400">Activity for {formattedMonth}</h3>
        </div>

        {/* Modern Segmented Controls for Filtering */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 border text-xs font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-white text-zinc-950 border-white' : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'}`}>
            All Members
          </button>
          <button onClick={() => setFilter('cleared')} className={`px-4 py-2 border text-xs font-medium whitespace-nowrap transition-colors ${filter === 'cleared' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50' : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'}`}>
            Cleared
          </button>
          <button onClick={() => setFilter('partial')} className={`px-4 py-2 border text-xs font-medium whitespace-nowrap transition-colors ${filter === 'partial' ? 'bg-amber-500/10 text-amber-500 border-amber-500/50' : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'}`}>
            Partial
          </button>
          <button onClick={() => setFilter('unpaid')} className={`px-4 py-2 border text-xs font-medium whitespace-nowrap transition-colors ${filter === 'unpaid' ? 'bg-rose-500/10 text-rose-500 border-rose-500/50' : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'}`}>
            Unpaid
          </button>
        </div>

        {/* Action Button */}
        {isAdminOrTreasurer && (filter === 'unpaid' || filter === 'partial') && filteredMembers.length > 0 && (
          <button 
            onClick={handleBulkReminder}
            disabled={sendingBulk}
            className="w-full mb-6 bg-blue-600 hover:bg-blue-500 text-white py-3.5 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Bell size={18} />
            {sendingBulk ? 'Sending...' : `Send Reminders (${filteredMembers.length})`}
          </button>
        )}

        {/* Clean List View */}
        <div className="flex flex-col border border-zinc-800 divide-y divide-zinc-800 bg-zinc-900/20">
          {filteredMembers.map(m => (
            <div key={m.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
              <div>
                <p className="font-medium text-zinc-100">{m.full_name || 'Unidentified Member'}</p>
                <p className="text-xs text-zinc-500 capitalize mt-0.5">
                  {m.role === 'executive' && m.department ? `${m.department} Exec` : (m.role || 'Unassigned').replace('_', ' ')}
                </p>
              </div>
              
              <div className="flex items-center">
                {m.amount_paid >= m.expected_amount ? (
                  <CheckCircle2 className="text-emerald-500" strokeWidth={2} size={22} />
                ) : m.amount_paid > 0 ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <span className="text-xs font-medium">৳{m.amount_paid} / {m.expected_amount}</span>
                  </div>
                ) : (
                  <XCircle className="text-rose-500" strokeWidth={2} size={22} />
                )}
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="p-10 text-center text-zinc-500 text-sm">
              No members match this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}