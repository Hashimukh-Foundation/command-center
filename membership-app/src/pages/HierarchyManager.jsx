import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Edit2, X, Send, Network, ArrowLeft, Search } from 'lucide-react';

const ROLES = ['admin', 'treasurer', 'president', 'convenor', 'executive', 'foreman', 'mentor', 'general_member', 'patron'];

export default function HierarchyManager() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState(''); // Added search state
  
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

    if (error) alert('TRANSMISSION FAILED.');
    else alert('REMINDER TRANSMITTED SUCCESSFULLY.');
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
    else { alert('OPERATIVE PARAMETERS UPDATED.'); setEditingMember(null); fetchMembers(); }
  };

  // Filter members based on the search query
  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(search.toLowerCase()) || 
    m.role.toLowerCase().includes(search.toLowerCase()) ||
    (m.department && m.department.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto pb-24 h-full selection:bg-blue-500 selection:text-white">
      
      {/* Tactical Header (Fixed) */}
      <div className="p-6 bg-slate-950 border-b-4 border-slate-800 flex items-center gap-4 z-20 shrink-0 sticky top-0 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-900 border-2 border-slate-700 text-slate-400 hover:text-white hover:border-blue-500 transition-colors shadow-[2px_2px_0px_0px_#020617] hover:shadow-[2px_2px_0px_0px_#3b82f6]">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Network size={12} /> Network Topology //
          </p>
          <h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter leading-none mt-1">Personnel Config</h2>
        </div>
      </div>

      {/* Brutalist Search Bar */}
      <div className="px-4 mt-6 mb-2 relative group shrink-0">
        <Search className="absolute left-8 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="SEARCH BY DESIGNATION OR ROLE..." 
          className="w-full pl-12 p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[4px_4px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-2px] focus:shadow-[6px_6px_0px_0px_#3b82f6] transition-all uppercase placeholder-slate-600 font-mono text-xs tracking-wider"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      
      <div className="p-4 flex flex-col gap-3">
        {filteredMembers.map(m => (
          <div key={m.id} className="bg-slate-900 p-4 border-2 border-slate-800 shadow-[4px_4px_0px_0px_#020617] hover:border-slate-700 transition-all">
            
            <div className="flex justify-between items-start">
              <div>
                <p className="font-black text-slate-100 uppercase tracking-tight text-lg">{m.full_name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono text-slate-200 bg-slate-800 px-1.5 py-0.5 border border-slate-700 uppercase tracking-widest">
                        {m.role === 'executive' && m.department ? `${m.department} EXEC` : m.role.replace('_', ' ')}
                    </span>
                    {/* Display who they report to */}
                    {m.supervisor_id && (
                        <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest">
                            {`->`} {members.find(sup => sup.id === m.supervisor_id)?.full_name || 'UNKNOWN'}
                        </span>
                    )}
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button onClick={() => sendReminder(m.id)} className="p-2 bg-slate-800 border-2 border-slate-700 text-amber-500 hover:text-amber-400 hover:border-amber-500 transition-colors shadow-[2px_2px_0px_0px_#020617] group" title="Send Reminder">
                  <Send size={16} className="group-hover:translate-x-[1px] group-hover:translate-y-[-1px] transition-transform" />
                </button>
                <button onClick={() => startEditing(m)} className="p-2 bg-slate-800 border-2 border-slate-700 text-blue-500 hover:text-blue-400 hover:border-blue-500 transition-colors shadow-[2px_2px_0px_0px_#020617]" title="Edit Parameters">
                  <Edit2 size={16} />
                </button>
              </div>
            </div>

            {/* Inline Editor Form */}
            {editingMember === m.id && (
              <div className="mt-4 pt-4 border-t-2 border-slate-800 flex flex-col gap-4">
                <p className="text-[9px] font-mono text-blue-500 uppercase tracking-widest font-bold">// MODIFY OPERATIVE PARAMS</p>
                
                <div>
                  <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1 font-bold">Clearance Level</label>
                  <select 
                    className="w-full p-2 bg-slate-950 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-[10px] tracking-widest" 
                    value={editForm.role} 
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </div>
                
                {editForm.role === 'executive' && (
                  <div>
                    <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1 font-bold">Department</label>
                    <input 
                      type="text" 
                      placeholder="E.G., IT, HR" 
                      className="w-full p-2 bg-slate-950 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-xs placeholder-slate-600" 
                      value={editForm.department} 
                      onChange={(e) => setEditForm({...editForm, department: e.target.value})} 
                    />
                  </div>
                )}

                <div>
                  <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1 font-bold">Reports To (Supervisor)</label>
                  <select 
                    className="w-full p-2 bg-slate-950 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 transition-all uppercase font-mono text-[10px] tracking-widest" 
                    value={editForm.supervisor_id} 
                    onChange={(e) => setEditForm({...editForm, supervisor_id: e.target.value})}
                  >
                    <option value="">-- NO SUPERVISOR --</option>
                    {members.filter(sup => sup.id !== m.id).map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.full_name} ({sup.role.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>
                
                {editForm.role === 'patron' && (
                  <div>
                    <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1 font-bold">Custom Due</label>
                    <input 
                      type="number" 
                      placeholder="BDT" 
                      className="w-full p-2 bg-slate-950 border-2 border-slate-700 text-slate-200 shadow-[2px_2px_0px_0px_#020617] focus:outline-none focus:border-blue-500 transition-all font-mono text-xs placeholder-slate-600" 
                      value={editForm.patron_custom_amount} 
                      onChange={(e) => setEditForm({...editForm, patron_custom_amount: e.target.value})} 
                    />
                  </div>
                )}
                
                <div className="flex gap-2 mt-2">
                  <button onClick={saveMemberHierarchy} className="flex-1 bg-blue-600 border-2 border-blue-500 text-white p-3 font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#1e3a8a] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#1e3a8a] transition-all text-xs">
                    SAVE PARAMS
                  </button>
                  <button onClick={() => setEditingMember(null)} className="p-3 bg-slate-800 border-2 border-slate-700 text-slate-400 hover:text-white hover:bg-rose-600 hover:border-rose-500 transition-all shadow-[2px_2px_0px_0px_#020617]">
                    <X size={16}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="p-8 text-center text-slate-600 border-2 border-dashed border-slate-800 bg-slate-900/50 mt-2">
            <p className="text-[10px] font-mono uppercase tracking-widest">No operatives match parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
}