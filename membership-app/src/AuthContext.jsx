import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Get access to the navigation system

  useEffect(() => {
    // 1. Check for existing session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        fetchProfile(activeUser.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for Auth Events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);

      if (activeUser) {
        await fetchProfile(activeUser.id);
        
        // TACTICAL REDIRECT: Catch the email invite link event
        // If the event is INITIAL_SESSION or SIGNED_IN, and they are on the login page, 
        // pull them into the system.
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          navigate('/');
        }
      } else {
        setProfile(null);
        setLoading(false);
        // Optional: navigate('/login'); // Force redirect on logout
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);