import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../assets/logo.png';
import './Login.css'; // Reutilizamos los estilos

export const ForgotPassword = ({ setView }: { setView: (v: any) => void }) => {
  const [email, setEmail] = useState('');

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) alert(error.message);
    else alert("¡Link sent! Check your inbox.");
  };

  return (
    <div className="split-screen">
      <div className="left-side"></div>
      <div className="right-side">
        <div className="login-card">
          <img src={logoImg} alt="Logo" className="card-logo" />
          <h2>Reset Password</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>Write your email and we will send you a link.</p>
          <form onSubmit={handleResetRequest}>
            <div className="input-group">
              <input type="email" placeholder="Email address" required onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn-login">Send link</button>
          </form>
          <button className="back-home" onClick={() => setView('login')}>← Return to Login</button>
        </div>
      </div>
    </div>
  );
};