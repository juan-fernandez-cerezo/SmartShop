import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../assets/logo.png';
import './Shop.css';
import type { ViewState } from '../App';

interface Supermarket {
  id: string;
  name: string;
  location: string;
  image_url: string | null;
}

interface ShopProps {
  setView: (v: ViewState) => void;
  session: any;
}

export const Shop = ({ setView, session }: ShopProps) => {
  const [markets, setMarkets] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS PARA FILTROS ---
  const [searchTerm, setSearchTerm] = useState(''); // Para Location
  const [selectedName, setSelectedName] = useState('All'); // Para el Dropdown de Name

  useEffect(() => {
    const fetchMarkets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('supermarkets')
        .select('id, name, location, image_url');
      
      if (error) console.error("Error:", error);
      else setMarkets(data || []);
      setLoading(false);
    };
    fetchMarkets();
  }, []);

  // --- LÓGICA DE FILTRADO ---
  // Obtenemos nombres únicos para el desplegable
  const uniqueNames = useMemo(() => {
    const names = markets.map(m => m.name);
    return ['All', ...new Set(names)];
  }, [markets]);

  // Filtrado combinado
  const filteredMarkets = markets.filter(m => {
    const matchesName = selectedName === 'All' || m.name === selectedName;
    const matchesLocation = m.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesName && matchesLocation;
  });

  return (
    <div className="shop-container">
      <div className="shop-header">
        {/* Botón Home a la izquierda */}
        <button className="btn-nav" onClick={() => setView('home')}>
          Home
        </button>

        {/* Botón de Perfil/Login a la derecha (el que ya tenías) */}
        <button className="btn-nav" onClick={() => session ? setView('profile') : setView('login')}>
          {session ? 'Ver Perfil' : 'Log in'}
        </button>
      </div>

      <img src={logoImg} className="shop-logo-main" alt="SmartShop" />

      <h2 className="shop-title">Choose your supermarket</h2>

      {/* --- CONTENEDOR DE FILTROS --- */}
      <div className="filters-container">
        
        {/* Desplegable por Nombre */}
        <select 
          className="filter-select"
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
        >
          {uniqueNames.map(name => (
            <option key={name} value={name}>{name === 'All' ? 'All Supermarkets' : name}</option>
          ))}
        </select>

        {/* Búsqueda por Ubicación */}
        <div className="search-bar-container">
          <input 
            type="text" 
            placeholder="Search by location... 📍" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="supermarkets-grid">
        {loading ? (
          <p>Cargando...</p>
        ) : filteredMarkets.length > 0 ? (
          filteredMarkets.map((m) => (
            <div className="market-card" key={m.id}>
              <div className="market-logo-placeholder">
                {m.image_url ? (
                  <img src={m.image_url} alt={m.name} className="market-logo-img" />
                ) : (
                  <span className="no-image-text">{m.name}</span>
                )}
              </div>
              
              <div className="market-info">
                <h3>Supermarket Name:</h3>
                <p>{m.name}</p>
                <h3>Location:</h3>
                <p>{m.location}</p>
              </div>

              <button className="btn-choose" onClick={() => alert(`Supermarket: ${m.name}`)}>
                Choose
              </button>
            </div>
          ))
        ) : (
          <p>No markets found with those criteria.</p>
        )}
      </div>
    </div>
  );
};