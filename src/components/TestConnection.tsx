import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database.types';

// Use the types we generated!
type Supermarket = Database['public']['Tables']['supermarkets']['Row'];

export const TestConnection = () => {
  const [markets, setMarkets] = useState<Supermarket[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      const { data, error } = await supabase
        .from('supermarkets')
        .select('*');

      if (error) setError(error.message);
      else setMarkets(data || []);
    };

    fetchMarkets();
  }, []);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h3>Supabase Connection Test</h3>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <p>Supermarkets found: {markets.length}</p>
      <ul>
        {markets.map(m => (
          <li key={m.id}>{m.name} - {m.location}</li>
        ))}
      </ul>
    </div>
  );
};