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
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('account_status', 'terminated') 
        .order('full_name');
        
      setMembers(data || []);
      setLoading(false);
  };

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

  const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const renderBadge = (role) => {
    if (!role) return null;
    const baseClass = "text-[10px] font-medium px-2 py-0.5 uppercase tracking-wider border rounded-sm";
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
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto h-full text-zinc-100 font-sans">
      
      {/* Sleek Header Section - Full background width, constrained content */}
      <div className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-20 shrink-0">
        <div className="w-full max-w-6xl mx-auto p-6 md:px-8 md:py-8">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-500 uppercase tracking-wider mb-2 md:mb-3">
            <Database size={14} />
            <span>Access Level // {safeProfileRole}</span>
          </div>
          <div className="flex justify-between items-end">
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
              Directory
            </h1>
            <span className="text-sm font-medium text-zinc-500 bg-zinc-900 px-3 py-1 border border-zinc-800 rounded-sm">
              {members.length} Records
            </span>
          </div>
        </div>
      </div>

      {/* RESPONSIVE WRAPPER: Centers and limits width on large monitors */}
      <div className="w-full max-w-6xl mx-auto flex flex-col flex-1 pb-24">
        
        {/* Modern Search Input */}
        <div className="px-4 md:px-8 py-5 shrink-0 bg-zinc-950">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, role, blood group..." 
              className="w-full pl-10 pr-4 py-3 md:py-3.5 bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-500 text-sm md:text-base rounded-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Member Grid - Responsive Columns */}
        <div className="px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 pb-6">
          {loading ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-16 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed bg-zinc-900/20 rounded-sm">
              <Users className="animate-pulse mb-3 opacity-50" size={28} />
              <p className="text-sm font-medium tracking-wide">Scanning database...</p>
            </div>
          ) : filteredMembers.length > 0 ? (
            filteredMembers.map(m => (
              <Link 
                to={`/member/${m.id}`} 
                key={m.id} 
                // flex & flex-col makes the card a flex container, allowing mt-auto to push the footer down
                className="relative flex flex-col bg-zinc-900/40 border border-zinc-800 p-5 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group rounded-sm"
              >
                {/* Top Right Badge */}
                <div className="absolute top-5 right-5 z-10">
                  {renderBadge(m.role)}
                </div>

                <div className="flex items-center mb-5 pr-20">
                  {/* Modern Sharp Avatar */}
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg md:text-xl font-semibold text-zinc-400 mr-4 shrink-0 group-hover:text-blue-400 group-hover:border-blue-500/50 transition-colors rounded-sm">
                    {getInitials(m.full_name)}
                  </div>

                  {/* Main Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
                      {m.full_name || 'Unidentified Operative'}
                    </h3>
                    <p className="text-xs font-mono text-zinc-500 uppercase mt-0.5">
                      ID: {m.id.substring(0, 8)}
                    </p>
                  </div>
                </div>

                {/* Info Grid - Clean and spaced. mt-auto pushes it to the bottom so cards align perfectly */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs md:text-sm text-zinc-400 pt-4 border-t border-zinc-800/50 mt-auto">
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
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-16 flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 border-dashed bg-zinc-900/20 rounded-sm">
              <p className="text-sm md:text-base font-medium tracking-wide">No records found.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}