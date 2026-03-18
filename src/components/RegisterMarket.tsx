import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../assets/logo.png';
import './RegisterMarket.css';
import type { ViewState } from '../App';

// Objeto de mapeo para las imágenes de los supermercados
const marketImages: Record<string, string> = {
  'Mercadona': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Logo_Mercadona_%28color-300-alpha%29.png/1280px-Logo_Mercadona_%28color-300-alpha%29.png',
  'Lidl': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Lidl-Logo.svg/1024px-Lidl-Logo.svg.png',
  'ALDI': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/ALDI_Nord_Logo_2015.png/960px-ALDI_Nord_Logo_2015.png',
  'Alcampo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Alcampo_logo.svg/1280px-Alcampo_logo.svg.png',
  'Carrefour': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Carrefour_logo.svg/1280px-Carrefour_logo.svg.png',
  'Ahorramás': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Logo_Ahorram%C3%A1s.svg/1280px-Logo_Ahorram%C3%A1s.svg.png',
  'Dia': 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Dia_Logo.svg',
};

export const RegisterMarket = ({ setView, session }: { setView: (v: ViewState) => void, session: any }) => {
  const [name, setName] = useState('Mercadona'); // Valor inicial
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Obtenemos la imagen correspondiente al nombre seleccionado
    const imageUrl = marketImages[name];

    const { error } = await supabase
      .from('supermarkets')
      .insert([
        { 
          name, 
          location, 
          user_id: session.user.id,
          image_url: imageUrl, // <-- Se guarda la URL automáticamente
          status: 'Activo'
        }
      ]);

    if (!error) {
    setView('upload-map'); // <-- Cambiar para que siga el flujo
    } else {
      alert("Error al registrar: " + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="register-market-bg">
      <div className="register-market-overlay">
        <img src={logoImg} alt="SmartShop" className="register-logo" />
        
        <div className="register-header-blue">
          Register New Supermarket
        </div>

        <div className="register-card">
          <p className="register-subtitle">Please select the market details</p>
          
          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label>Name of the supermarket</label>
              <select 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="register-select"
                required
              >
                {Object.keys(marketImages).map(marketName => (
                  <option key={marketName} value={marketName}>
                    {marketName}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Location</label>
              <input 
                type="text" 
                placeholder="Ej: Calle Mayor 45, Madrid"
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                required 
              />
            </div>

            {/* Vista previa de la imagen (Opcional, queda muy profesional) */}
            <div className="image-preview">
              <img src={marketImages[name]} alt="Preview" />
            </div>

            <button type="submit" className="btn-register-confirm" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <button className="btn-back-link" onClick={() => setView('manage-supermarkets')}>
            ← Back to panel
          </button>
        </div>
      </div>
    </div>
  );
};