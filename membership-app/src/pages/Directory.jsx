import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Search, Phone, Droplet, Building, Database, Users } from 'lucide-react';

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

  // SECURE FILTER: Prevents 'null' crashes by falling back to empty strings
  const filteredMembers = members.filter(m => {
    const safeName = m.full_name || '';
    const safeRole = m.role || '';
    const safeBlood = m.blood_group || '';
    const safeInstitution = m.institution || '';

    return safeName.toLowerCase().includes(search.toLowerCase()) || 
           safeRole.toLowerCase().includes(search.toLowerCase()) ||
           safeBlood.toLowerCase().includes(search.toLowerCase()) ||
           safeInstitution.toLowerCase().includes(search.toLowerCase());
  });

  // Helper to extract initials
  const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Modern, sleek transparency badges
  const renderBadge = (role) => {
    if (!role) return null;
    const baseClass = "text-[10px] font-medium px-2 py-0.5 uppercase tracking-wider border";
    switch(role) {
      case 'executive':
        return <span className={`${baseClass} bg-purple-500/10 text-purple-400 border-purple-500/20`}>Executive</span>;
      case 'foreman':
        return <span className={`${baseClass} bg-blue-500/10 text-blue-400 border-blue-500/20`}>Foreman</span>;
      case 'mentor':
        return <span className={`${baseClass} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`}>Mentor</span>;
      default:
        return <span className={`${baseClass} bg-zinc-800/50 text-zinc-400 border-zinc-700/50`}>{role.replace('_', ' ')}</span>;
    }
  };

  const safeProfileRole = (profile?.role || 'Unassigned').replace('_', ' ');

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto pb-24 h-full text-zinc-100 font-sans">
      
      {/* Sleek Header Section */}
      <div className="p-6 bg-zinc-950 border-b border-zinc-800 sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-2 text-xs font-medium text-blue-500 uppercase tracking-wider mb-2">
          <Database size={14} />
          <span>Access Level // {safeProfileRole}</span>
        </div>
        <div className="flex justify-between items-end">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Directory
          </h1>
          <span className="text-sm font-medium text-zinc-500 bg-zinc-900 px-2.5 py-1 border border-zinc-800">
            {members.length} Records
          </span>
        </div>
      </div>

      {/* Modern Search Input */}
      <div className="px-4 py-5 shrink-0 bg-zinc-950">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, role, blood group..." 
            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-500 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Member Grid */}
      <div className="px-4 flex flex-col gap-3">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed bg-zinc-900/20">
            <Users className="animate-pulse mb-3 opacity-50" size={24} />
            <p className="text-sm font-medium tracking-wide">Scanning database...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          filteredMembers.map(m => (
            <Link 
              to={`/member/${m.id}`} 
              key={m.id} 
              className="relative block bg-zinc-900/40 border border-zinc-800 p-5 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group"
            >
              {/* Top Right Badge */}
              <div className="absolute top-5 right-5 z-10">
                {renderBadge(m.role)}
              </div>

              <div className="flex items-center mb-4 pr-20">
                {/* Modern Sharp Avatar */}
                <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg font-semibold text-zinc-400 mr-4 shrink-0 group-hover:text-blue-400 group-hover:border-blue-500/50 transition-colors">
                  {getInitials(m.full_name)}
                </div>

                {/* Main Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
                    {m.full_name || 'Unidentified Operative'}
                  </h3>
                  <p className="text-xs font-mono text-zinc-500 uppercase mt-0.5">
                    ID: {m.id.substring(0, 8)}
                  </p>
                </div>
              </div>

              {/* Info Grid - Clean and spaced */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-zinc-400 pt-3 border-t border-zinc-800/50">
                <div className="flex items-center truncate">
                  <Phone size={14} className="mr-2 text-zinc-500 shrink-0" /> 
                  <span className="truncate">{m.phone || 'Unknown'}</span>
                </div>
                <div className="flex items-center truncate">
                  <Droplet size={14} className="mr-2 text-rose-500/70 shrink-0" /> 
                  <span className={m.blood_group ? 'text-rose-400 font-medium' : ''}>
                    {m.blood_group || 'Unknown'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center truncate">
                  <Building size={14} className="mr-2 text-zinc-500 shrink-0" /> 
                  <span className="truncate">{m.institution || 'Unassigned'}</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed bg-zinc-900/20">
            <p className="text-sm font-medium tracking-wide">No records found.</p>
          </div>
        )}
      </div>
      
    </div>
  );
}