import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './ManageSupermarkets.css';
import type { ViewState } from '../App';

interface Supermarket {
  id: string;
  name: string;
  location: string;
  status: 'Activo' | 'Borrador'; // Si no tienes esta columna, la emularemos
}

export const ManageSupermarkets = ({ setView, session }: { setView: (v: ViewState) => void, session: any }) => {
  const [markets, setMarkets] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyMarkets = async () => {
      // Buscamos los supermercados que pertenecen al usuario logueado
      const { data, error } = await supabase
        .from('supermarkets')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) console.error(error);
      else setMarkets(data || []);
      setLoading(false);
    };

    fetchMyMarkets();
  }, [session.user.id]);

  return (
    <div className="manage-container">
      <div className="manage-header">
        <div>
          <h1>Panel de Gestión</h1>
          <p style={{color: '#666'}}>Gestiona tus supermercados</p>
        </div>
        <button className="btn-new-market" onClick={() => setView('register-market')}>
        + New Supermarket
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Tiendas</span>
          <span className="stat-value">{markets.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tiendas Activas</span>
          <span className="stat-value">{markets.filter(m => m.status !== 'Borrador').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">En Borrador</span>
          <span className="stat-value">{markets.filter(m => m.status === 'Borrador').length}</span>
        </div>
      </div>

      <div className="table-container">
        <h2 style={{padding: '20px', margin: 0, fontSize: '18px'}}>Mis Supermercados</h2>
        <table className="markets-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}>Cargando...</td></tr>
            ) : markets.map(market => (
              <tr key={market.id}>
                <td style={{fontWeight: '500'}}>{market.name}</td>
                <td>{market.location}</td>
                <td>
                  <span className={`status-badge ${market.status === 'Borrador' ? 'status-draft' : 'status-active'}`}>
                    {market.status || 'Activo'}
                  </span>
                </td>
                <td>
                  <span className="action-link" onClick={() => alert('Editar Supermercado ' + market.name)}>📝 Editar Supermercado</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{marginTop: '30px', cursor: 'pointer', color: '#2b459a'}} onClick={() => setView('profile')}>
        ← Volver al Perfil
      </p>
    </div>
  );
};