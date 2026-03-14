import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../assets/logo.png';
import './Login.css';

interface LoginProps {
  setView: (v: 'home' | 'login' | 'signup' | 'shop') => void;
}

export const Login = ({ setView }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="split-screen">
      <div className="left-side"></div>
      
      <div className="right-side">
        <div className="login-card">
          <img src={logoImg} alt="SmartShop Logo" className="card-logo" />
          
          <h2>Log in</h2>
          
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input 
                type="email" 
                placeholder="Email address" 
                required 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Password" 
                required 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
          
          <div className="login-footer">
            <span>Don't have an account? <a href="#" onClick={() => setView('signup')}>Sign up</a></span>
            <a href="#">Forgot password</a>
          </div>
          
          <button className="back-home" onClick={() => setView('home')}>
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
};