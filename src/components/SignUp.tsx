import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../assets/logo.png';
import './SignUp.css';

interface SignUpProps {
  setView: (v: 'home' | 'login' | 'signup' | 'shop') => void;
}

export const SignUp = ({ setView }: SignUpProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Consumer' | 'Supermarket'>('Consumer');
  
  // Campos dinámicos
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [marketName, setMarketName] = useState('');
  const [location, setLocation] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          role: role,
          first_name: role === 'Consumer' ? firstName : undefined,
          last_name: role === 'Consumer' ? lastName : undefined,
          market_name: role === 'Supermarket' ? marketName : undefined,
          location: role === 'Supermarket' ? location : undefined,
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      alert(error.message);
    } else {
      alert("¡Registro casi listo! Revisa tu email para verificar la cuenta.");
      setView('login');
    }
  };

  return (
    <div className="split-screen">
      <div className="left-side"></div>
      
      <div className="right-side">
        <div className="auth-card">
          <img src={logoImg} alt="SmartShop Logo" className="card-logo" />
          <h2>Crear Cuenta</h2>
          
          <form onSubmit={handleSignUp}>
            <div className="input-group">
              <label>Tipo de usuario</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="Consumer">Soy Cliente</option>
                <option value="Supermarket">Soy un Supermercado</option>
              </select>
            </div>

            <div className="input-group">
              <input type="email" placeholder="Email" required onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="input-group">
              <input type="password" placeholder="Contraseña" required onChange={(e) => setPassword(e.target.value)} />
            </div>

            {role === 'Consumer' ? (
              <div className="input-row">
                <input placeholder="Nombre" required onChange={(e) => setFirstName(e.target.value)} />
                <input placeholder="Apellidos" required onChange={(e) => setLastName(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="input-group">
                  <input placeholder="Nombre del Supermercado" required onChange={(e) => setMarketName(e.target.value)} />
                </div>
                <div className="input-group">
                  <input placeholder="Dirección / Ubicación" required onChange={(e) => setLocation(e.target.value)} />
                </div>
              </>
            )}
            
            <button type="submit" className="btn-auth">Registrarse</button>
          </form>
          
          <div className="auth-footer">
            ¿Ya tienes cuenta? <a href="#" onClick={() => setView('login')}>Inicia sesión</a>
          </div>
          

        </div>
      </div>
    </div>
  );
};