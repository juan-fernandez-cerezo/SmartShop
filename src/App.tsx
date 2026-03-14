import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { SignUp } from './components/SignUp';
import { Login } from './components/Login';
import type { Session } from '@supabase/supabase-js';

// Importamos el archivo CSS y las imágenes
import './App.css';
import logoImg from './assets/logo.png';
// fondo.png se importa directamente en el archivo CSS

// Componente para la pantalla principal (Home)
function HomePage({ setView }: { setView: (view: 'login' | 'signup' | 'shop') => void }) {
  return (
    <div className="home-container">
      {/* Sección del Logo */}
      <div className="logo-container">
        <img src={logoImg} alt="SmartShop Logo" className="logo-image" />
        <span className="smartshop-text">SmartShop</span>
      </div>

      {/* Recuadro Central Azul */}
      <div className="central-box">
        <h2>¡COMIENZA TU COMPRA AHORA!</h2>
        <h2>¡MÁS RÁPIDO Y FÁCIL!</h2>

        <button className="action-button start-shopping-btn" onClick={() => setView('shop')}>
          Empezar a comprar
        </button>

        <button className="action-button login-register-btn" onClick={() => setView('login')}>
          Login/Registro
        </button>
      </div>

      {/* Nota al pie */}
      <p className="footer-note">
        *Sin iniciar sesión no podrás guardar tus listas de la compra
      </p>
    </div>
  );
}

// Componente Principal
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<'home' | 'login' | 'signup' | 'shop'>('home');

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Si HAY sesión, mostramos el Dashboard (provisional)
  if (session) {
    return (
      <div style={{ padding: '40px' }}>
        <h1>Bienvenido a SmartShop</h1>
        <p>Sesión iniciada como: {session.user.email}</p>
        <button onClick={() => supabase.auth.signOut()}>Cerrar Sesión</button>
      </div>
    );
  }

  // Si NO hay sesión, mostramos la pantalla correspondiente
  switch (view) {
    case 'home':
      return <HomePage setView={setView} />;
    case 'login':
      return (
        <div style={{ padding: '40px' }}>
          <Login setView={setView} />
          <button onClick={() => setView('home')} style={{ marginTop: '10px' }}>Volver a Home</button>
        </div>
      );
    case 'signup':
      return (
        <div style={{ padding: '40px' }}>
          <SignUp setView={setView} />
          <button onClick={() => setView('home')} style={{ marginTop: '10px' }}>Volver a Home</button>
        </div>
      );
    case 'shop':
      return (
        <div style={{ padding: '40px' }}>
          <p>Sección "Empezar a comprar" (próximamente)</p>
          <button onClick={() => setView('home')}>Volver a Home</button>
        </div>
      );
    default:
      return <HomePage setView={setView} />;
  }
}

export default App;