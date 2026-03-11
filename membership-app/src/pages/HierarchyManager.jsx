import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Edit2, X, Send, Network, ArrowLeft, Search } from 'lucide-react';

const ROLES = ['admin', 'treasurer', 'president', 'convenor', 'executive', 'foreman', 'mentor', 'general_member', 'patron'];

export default function HierarchyManager() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState(''); 
  
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', department: '', supervisor_id: '', patron_custom_amount: 0 });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setMembers(data || []);
  };

  const sendReminder = async (memberId) => {
    const confirm = window.confirm("Transmit payment reminder to this operative?");
    if (!confirm) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { error } = await supabase.functions.invoke('send-email', {
      body: { type: 'reminder', memberId: memberId, month: currentMonth }
    });

    if (error) alert('Transmission failed.');
    else alert('Reminder transmitted successfully.');
  };

  const startEditing = (m) => {
    setEditingMember(m.id);
    setEditForm({
      role: m.role || 'general_member',
      department: m.department || '',
      supervisor_id: m.supervisor_id || '',
      patron_custom_amount: m.patron_custom_amount || 0
    });
  };

  const saveMemberHierarchy = async () => {
    const payload = {
      role: editForm.role,
      department: editForm.role === 'executive' ? editForm.department : null,
      supervisor_id: editForm.supervisor_id || null, 
      patron_custom_amount: editForm.role === 'patron' ? parseInt(editForm.patron_custom_amount) : 0
    };

    const { error } = await supabase.from('profiles').update(payload).eq('id', editingMember);
    if (error) alert(error.message);
    else { setEditingMember(null); fetchMembers(); }
  };

  // SECURE FILTER: Safe variable extraction prevents null crashes
  const filteredMembers = members.filter(m => {
    const safeName = m.full_name || '';
    const safeRole = m.role || '';
    const safeDepartment = m.department || '';

    return safeName.toLowerCase().includes(search.toLowerCase()) || 
           safeRole.toLowerCase().includes(search.toLowerCase()) ||
           safeDepartment.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto pb-24 h-full text-zinc-100 font-sans">
      
      {/* Sleek Header */}
      <div className="p-6 bg-zinc-950 border-b border-zinc-800 flex items-center gap-4 z-20 shrink-0 sticky top-0">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-500 uppercase tracking-wider mb-0.5">
            <Network size={14} /> 
            <span>Network Topology</span>
          </div>
          <h2 className="text-xl font-semibold text-white tracking-tight leading-none">Personnel Config</h2>
        </div>
      </div>

      {/* Modern Search Bar */}
      <div className="px-4 pt-5 pb-2 shrink-0 bg-zinc-950">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by designation or role..." 
            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-500 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {/* List Area */}
      <div className="p-4 flex flex-col gap-3">
        {filteredMembers.map(m => (
          <div key={m.id} className="bg-zinc-900/40 border border-zinc-800 p-5 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all">
            
            <div className="flex justify-between items-start">
              <div>
                {/* PATCHED: Safe Full Name */}
                <p className="font-semibold text-zinc-100 text-base mb-1">
                    {m.full_name || 'Unidentified Operative'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Safe Role rendering - Flat transparent badge style */}
                    <span className="text-[10px] font-medium text-zinc-300 bg-zinc-800/50 px-2 py-0.5 border border-zinc-700/50 uppercase tracking-wider rounded-sm">
                        {m.role === 'executive' && m.department ? `${m.department} Exec` : (m.role || 'Unassigned').replace('_', ' ')}
                    </span>
                    
                    {/* Supervisor display */}
                    {m.supervisor_id && (
                        <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                            <span className="text-zinc-600">→</span> 
                            {members.find(sup => sup.id === m.supervisor_id)?.full_name || 'Unknown'}
                        </span>
                    )}
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0 ml-4">
                <button onClick={() => sendReminder(m.id)} className="p-2.5 bg-zinc-900 border border-zinc-800 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors group" title="Send Reminder">
                  <Send size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button onClick={() => startEditing(m)} className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/10 transition-colors" title="Edit Parameters">
                  <Edit2 size={16} />
                </button>
              </div>
            </div>

            {/* Inline Editor Form - Modern SaaS styling */}
            {editingMember === m.id && (
              <div className="mt-5 pt-5 border-t border-zinc-800/80 flex flex-col gap-4">
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-2">
                  <span>Modify Parameters</span>
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Clearance Level</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm capitalize" 
                      value={editForm.role} 
                      onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  
                  {editForm.role === 'executive' && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Department</label>
                      <input 
                        type="text" 
                        placeholder="e.g., IT, HR" 
                        className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm placeholder-zinc-600" 
                        value={editForm.department} 
                        onChange={(e) => setEditForm({...editForm, department: e.target.value})} 
                      />
                    </div>
                  )}

                  <div className={editForm.role === 'executive' ? 'sm:col-span-2' : ''}>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Reports To (Supervisor)</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm" 
                      value={editForm.supervisor_id} 
                      onChange={(e) => setEditForm({...editForm, supervisor_id: e.target.value})}
                    >
                      <option value="">-- No Supervisor --</option>
                      {/* PATCHED: Safe mapping for Supervisor Dropdown */}
                      {members.filter(sup => sup.id !== m.id).map(sup => {
                          const safeSupName = sup.full_name || 'Unidentified';
                          const safeSupRole = (sup.role || 'Unassigned').replace('_', ' ');
                          // Capitalize role nicely for dropdown
                          const formattedRole = safeSupRole.charAt(0).toUpperCase() + safeSupRole.slice(1);
                          return (
                            <option key={sup.id} value={sup.id}>
                              {safeSupName} ({formattedRole})
                            </option>
                          );
                      })}
                    </select>
                  </div>
                  
                  {editForm.role === 'patron' && (
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Custom Due Amount</label>
                      <input 
                        type="number" 
                        placeholder="BDT" 
                        className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm placeholder-zinc-600" 
                        value={editForm.patron_custom_amount} 
                        onChange={(e) => setEditForm({...editForm, patron_custom_amount: e.target.value})} 
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-2">
                  <button onClick={saveMemberHierarchy} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 font-medium transition-colors text-sm rounded-sm">
                    Save Changes
                  </button>
                  <button onClick={() => setEditingMember(null)} className="px-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors rounded-sm flex items-center justify-center">
                    <X size={18}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed bg-zinc-900/20 mt-2">
            <p className="text-sm font-medium tracking-wide">No operatives match parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
}