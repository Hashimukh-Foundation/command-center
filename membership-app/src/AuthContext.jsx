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
    const meta = authUser.user_metadata || {};

    // Check if any metadata fields are present but missing from the profile.
    // This handles the case where the DB trigger already set full_name but
    // didn't know about the extra fields collected during signup.
    const needsSync =
      meta.phone         && !data?.phone         ||
      meta.blood_group   && !data?.blood_group   ||
      meta.institution   && !data?.institution   ||
      meta.field_of_study && !data?.field_of_study;

    if (data && needsSync) {
      const patch = {};
      if (!data.full_name     && meta.full_name)      patch.full_name      = meta.full_name;
      if (!data.phone         && meta.phone)          patch.phone          = meta.phone;
      if (!data.blood_group   && meta.blood_group)    patch.blood_group    = meta.blood_group;
      if (!data.institution   && meta.institution)    patch.institution    = meta.institution;
      if (!data.field_of_study && meta.field_of_study) patch.field_of_study = meta.field_of_study;

      await supabase.from('profiles').update(patch).eq('id', authUser.id);
      const { data: updated } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      setProfile(updated);
      setLoading(false);
      return;
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
