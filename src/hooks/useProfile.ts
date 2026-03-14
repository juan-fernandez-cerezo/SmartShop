import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database.types';

// We extract the Row types from our generated database types
type Consumer = Database['public']['Tables']['consumers']['Row'];
type Supermarket = Database['public']['Tables']['supermarkets']['Row'];

export function useProfile() {
  const [profile, setProfile] = useState<Consumer | Supermarket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      setLoading(true);
      
      // 1. Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const role = user.user_metadata.role;

        // 2. Fetch from the correct table based on role
        if (role === 'Consumer') {
          const { data } = await supabase
            .from('consumers')
            .select('*')
            .eq('user_id', user.id)
            .single();
          setProfile(data);
        } else if (role === 'Supermarket') {
          const { data } = await supabase
            .from('supermarkets')
            .select('*')
            .eq('user_id', user.id)
            .single();
          setProfile(data);
        }
      }
      setLoading(false);
    }

    getProfile();
  }, []);

  return { profile, loading };
}