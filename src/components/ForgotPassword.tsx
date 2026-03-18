import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../assets/logo.png';
import './Login.css'; // Reutilizamos los estilos

export const ForgotPassword = ({ setView }: { setView: (v: any) => void }) => {
  const [email, setEmail] = useState('');

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) alert(error.message);
    else alert("¡Enlace enviado! Revisa tu bandeja de entrada.");
  };

  return (
    <div className="split-screen">
      <div className="left-side"></div>
      <div className="right-side">
        <div className="login-card">
          <img src={logoImg} alt="Logo" className="card-logo" />
          <h2>Recuperar clave</h2>
          <p style={{marginBottom: '20px', color: '#666'}}>Escribe tu email y te enviaremos un enlace.</p>
          <form onSubmit={handleResetRequest}>
            <div className="input-group">
              <input type="email" placeholder="Email address" required onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn-login">Enviar enlace</button>
          </form>
          <button className="back-home" onClick={() => setView('login')}>← Volver al Login</button>
        </div>
      </div>
    </div>
  );
};