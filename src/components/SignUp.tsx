import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../assets/logo.png';
import './SignUp.css';

// Dentro de Login.tsx y SignUp.tsx
interface ComponentProps {
  setView: (v: 'home' | 'login' | 'signup' | 'shop' | 'forgot-password' | 'reset-password') => void;
}

export const SignUp = ({ setView }: ComponentProps) => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Consumer' | 'Supermarket'>('Consumer');
  
  // Campos dinámicos
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [marketName, setMarketName] = useState('');
  const [marketSurname, setMarketSurname] = useState('');

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
          market_Surname: role === 'Supermarket' ? marketSurname : undefined,
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
              <label>Type of user</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="Consumer">I am a consumer</option>
                <option value="Supermarket">I am a supermarket personal</option>
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
                  <input placeholder="Name of the Supermarket member" required onChange={(e) => setMarketName(e.target.value)} />
                </div>
                <div className="input-group">
                  <input placeholder="Surname of the Supermarket worker" required onChange={(e) => setMarketSurname(e.target.value)} />
                </div>
              </>
            )}
            
            <button type="submit" className="btn-auth">Register</button>
          </form>
          
          <div className="auth-footer">
            Have an account already? <a href="#" onClick={() => setView('login')}>Log in</a>
          </div>

          <button className="back-home" onClick={() => setView('home')}>
            ← Back to home
          </button>
          

        </div>
      </div>
    </div>
  );
};