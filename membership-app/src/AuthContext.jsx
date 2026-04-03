import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authUser) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();

    // If the profile is missing key fields but the user signed up via the new form,
    // their data was stored in auth metadata — auto-populate the profile silently.
    if (data && !data.full_name) {
      const meta = authUser.user_metadata || {};
      if (meta.full_name) {
        const patch = {
          full_name:     meta.full_name     || null,
          phone:         meta.phone         || null,
          blood_group:   meta.blood_group   || null,
          institution:   meta.institution   || null,
          field_of_study: meta.field_of_study || null,
        };
        // Fire-and-forget update; re-fetch so the UI gets the populated profile
        await supabase.from('profiles').update(patch).eq('id', authUser.id);
        const { data: updated } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(updated);
        setLoading(false);
        return;
      }
    }

    setProfile(data);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
