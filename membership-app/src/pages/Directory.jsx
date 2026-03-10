import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Search, Phone, Droplet, Building, Database } from 'lucide-react';

export default function Directory() {
  const { profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      setMembers(data || []);
      setLoading(false);
    };
    fetchMembers();
  }, []);

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(search.toLowerCase()) || 
    m.role.toLowerCase().includes(search.toLowerCase()) ||
    (m.blood_group && m.blood_group.toLowerCase().includes(search.toLowerCase())) ||
    (m.institution && m.institution.toLowerCase().includes(search.toLowerCase()))
  );

  // Helper to extract initials (e.g., "Nazmus Shakib" -> "NS")
  const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Helper to render the tactical role badge
  const renderBadge = (role) => {
    switch(role) {
      case 'executive':
        return <span className="bg-purple-600 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_#000000]">EXEC</span>;
      case 'foreman':
        return <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_#000000]">FOREMAN</span>;
      case 'mentor':
        return <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_#000000]">MENTOR</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 text-[9px] font-bold px-2 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_#000000]">{role.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto pb-24 h-full selection:bg-blue-500 selection:text-white">
      
      {/* Tactical Header Section */}
      <div className="p-6 shrink-0 bg-slate-950 border-b-4 border-blue-600 mb-6 sticky top-0 z-20 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-500 mb-1 flex items-center gap-2">
          <Database size={12} />
          Database Access // {profile?.role?.replace('_', ' ')} Level
        </p>
        <div className="flex justify-between items-end mt-1">
          <h1 className="text-3xl font-black uppercase text-slate-100 tracking-tighter leading-none">
            Directory
          </h1>
          <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
            {members.length} Records
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-6 mb-6 relative group shrink-0">
        <Search className="absolute left-10 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="SEARCH DESIGNATION, ROLE, OR BLOOD..." 
          className="w-full pl-12 p-3 bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-[4px_4px_0px_0px_#020617] focus:outline-none focus:border-blue-500 focus:translate-y-[-2px] focus:shadow-[6px_6px_0px_0px_#3b82f6] transition-all uppercase placeholder-slate-600 font-mono text-xs tracking-wider"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Member Grid */}
      <div className="px-6 flex flex-col gap-4">
        {loading ? (
          <div className="p-8 text-center text-slate-600 border-2 border-dashed border-slate-800 bg-slate-900/50">
            <p className="text-[10px] font-mono uppercase tracking-widest animate-pulse">Scanning network...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map(m => (
            <Link 
              to={`/member/${m.id}`} 
              key={m.id} 
              className="relative block bg-slate-900 border-2 border-slate-800 p-4 shadow-[4px_4px_0px_0px_#020617] hover:border-blue-500 hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#3b82f6] transition-all group cursor-pointer"
            >
              {/* Top Right Badge */}
              <div className="absolute top-0 right-0 z-10">
                {renderBadge(m.role)}
              </div>

              <div className="flex items-start">
                {/* Boxy Avatar */}
                <div className="w-12 h-12 bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-lg font-black text-slate-500 mr-4 shrink-0 group-hover:bg-blue-900/30 group-hover:text-blue-400 group-hover:border-blue-500/50 transition-colors">
                  {getInitials(m.full_name)}
                </div>

                {/* Main Details */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">
                    ID: {m.id.substring(0, 8)}
                  </p>
                  
                  <h3 className="text-lg font-bold uppercase text-slate-100 leading-none mb-3 truncate group-hover:text-blue-400 transition-colors">
                    {m.full_name}
                  </h3>
                  
                  {/* Info Grid (Matches Django style) */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center truncate">
                      <Phone size={12} className="mr-2 opacity-50 text-slate-500" /> 
                      {m.phone || 'UNKNOWN'}
                    </div>
                    <div className="flex items-center truncate">
                      <Droplet size={12} className="mr-2 opacity-50 text-rose-500" /> 
                      <span className={m.blood_group ? 'text-rose-400 font-bold' : ''}>
                        {m.blood_group || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center truncate">
                      <Building size={12} className="mr-2 opacity-50 text-slate-500" /> 
                      {m.institution || 'UNASSIGNED'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="p-8 text-center text-slate-600 border-2 border-dashed border-slate-800 bg-slate-900/50">
            <p className="text-[10px] font-mono uppercase tracking-widest">No records accessible.</p>
          </div>
        )}
      </div>
      
    </div>
  );
}