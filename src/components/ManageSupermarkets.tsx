import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './ManageSupermarkets.css';
import type { ViewState } from '../App';

interface Supermarket {
  id: string;
  name: string;
  location: string;
  status: 'Activo' | 'Borrador' | 'Published' | 'Draft';
}

interface ManageProps {
  setView: (v: ViewState) => void;
  session: any;
  onEditProducts: (id: string) => void;
  onEditMap: (id: string) => void;
}

export const ManageSupermarkets = ({ setView, session, onEditProducts, onEditMap }: ManageProps) => {
  const [markets, setMarkets] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyMarkets = async () => {
      const { data, error } = await supabase
        .from('supermarkets')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) {
        console.error(error);
      } else {
        const marketsWithStatus: Supermarket[] = (data || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          location: m.location,
          status: m.status || 'Published',
        }));
        setMarkets(marketsWithStatus);
      }
      setLoading(false);
    };

    fetchMyMarkets();
  }, [session.user.id]);

  const handleStatusChange = async (marketId: string, newStatus: string) => {
    // Update local state immediately for fast UI feedback
    setMarkets(prev => prev.map(m => m.id === marketId ? { ...m, status: newStatus as any } : m));
    
    // Update Supabase
    const { error } = await supabase
      .from('supermarkets')
      .update({ status: newStatus })
      .eq('id', marketId);

    if (error) {
      console.error(error);
      alert("Error updating status");
    }
  };

  const handleDeleteMarket = async (marketId: string) => {
    if (window.confirm("Sure to eliminate this supermarket?")) {
      const { error } = await supabase
        .from('supermarkets')
        .delete()
        .eq('id', marketId);

      if (error) {
        console.error(error);
        alert("Error deleting supermarket");
      } else {
        setMarkets(prev => prev.filter(m => m.id !== marketId));
      }
    }
  };

  return (
    <div className="manage-container">
      <div className="manage-header">
        <div>
          <h1>Management Panel</h1>
          <p style={{ color: '#666' }}>Manage your supermarkets</p>
        </div>
        <button className="btn-new-market" onClick={() => setView('register-market')}>
          + New Supermarket
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Supermarkets</span>
          <span className="stat-value">{markets.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Supermarkets</span>
          <span className="stat-value">{markets.filter(m => m.status === 'Published' || m.status === 'Activo').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Draft Supermarkets</span>
          <span className="stat-value">{markets.filter(m => m.status === 'Draft' || m.status === 'Borrador').length}</span>
        </div>
      </div>

      <div className="table-container">
        <h2 style={{ padding: '20px', margin: 0, fontSize: '18px' }}>My Supermarkets</h2>
        <table className="markets-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}>Loading...</td></tr>
            ) : markets.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No Supermarkets found. Click on "+ New Supermarket" to start.
                </td>
              </tr>
            ) : (
              markets.map(market => (
                <tr key={market.id}>
                  <td style={{ fontWeight: '500' }}>{market.name}</td>
                  <td>{market.location}</td>
                  <td>
                    <select
                      value={market.status === 'Activo' ? 'Published' : market.status === 'Borrador' ? 'Draft' : market.status}
                      onChange={(e) => handleStatusChange(market.id, e.target.value)}
                      className={`status-badge ${market.status === 'Draft' || market.status === 'Borrador' ? 'status-draft' : 'status-active'} status-dropdown`}
                      style={{ cursor: 'pointer', border: '1px solid currentColor', outline: 'none', background: 'rgba(255,255,255,0.8)', paddingRight: '20px' }}
                    >
                      <option value="Published" className="status-active">Published</option>
                      <option value="Draft" className="status-draft">Draft</option>
                    </select>
                  </td>
                  <td style={{ display: 'flex', gap: '15px' }}>
                    <span
                      className="action-link"
                      onClick={() => onEditMap(market.id)}
                      style={{ cursor: 'pointer', color: '#2b459a', fontSize: '14px' }}
                    >
                      📍 Edit map
                    </span>
                    <span
                      className="action-link"
                      onClick={() => onEditProducts(market.id)}
                      style={{ cursor: 'pointer', color: '#2b459a', fontSize: '14px' }}
                    >
                      📦 Edit products
                    </span>
                    <span
                      className="action-link"
                      onClick={() => handleDeleteMarket(market.id)}
                      style={{ cursor: 'pointer', color: '#dc3545', fontSize: '14px' }}
                    >
                      🗑️ Delete
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: '30px', cursor: 'pointer', color: '#2b459a' }} onClick={() => setView('profile')}>
        ← Return to Profile
      </p>
    </div>
  );
};