import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './Login.css';

export const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Actualizamos la contraseña (usa la sesión temporal del enlace)
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      alert("Error: " + error.message);
      setLoading(false);
    } else {
      alert("¡Contraseña actualizada con éxito!");
      // 2. Ahora que ya se cambió, cerramos la sesión temporal 
      // y mandamos al usuario al Login para que entre con su nueva clave
      await supabase.auth.signOut();
      window.location.href = "/"; // O setView('login') si prefieres
    }
  };

  return (
    <div className="split-screen">
      <div className="left-side"></div>
      <div className="right-side">
        <div className="login-card">
          <h2>Nueva contraseña</h2>
          <p style={{marginBottom: '20px', color: '#666'}}>
            Introduce tu nueva clave. No cierres sesión hasta completar este paso.
          </p>
          <form onSubmit={handleUpdate}>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Nueva contraseña" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
