import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { SignUp } from './components/SignUp';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { UpdatePassword } from './components/UpdatePassword';
import { Shop } from './components/Shop';
import { Profile } from './components/Profile';
import { ManageSupermarkets } from './components/ManageSupermarkets';
import { RegisterMarket } from './components/RegisterMarket';
import { UploadMap } from './components/UploadMap';
import { UploadProducts } from './components/UploadProducts';
import type { Session } from '@supabase/supabase-js';

import './App.css';
import logoImg from './assets/logo.png';

export type ViewState = 'home' | 'login' | 'signup' | 'shop' | 'forgot-password' | 'reset-password' | 'profile' | 'manage-supermarkets' | 'register-market' | 'upload-map' | 'upload-products';

function HomePage({ setView }: { setView: (view: ViewState) => void }) {
  return (
    <div className="home-container">
      <div className="logo-container">
        <img src={logoImg} alt="SmartShop Logo" className="logo-image" />
        <span className="smartshop-text">SmartShop</span>
      </div>
      <div className="central-box">
        <h2>¡BEGIN YOUR SHOP NOW!</h2>
        <h2>¡FASTER & EASIER!</h2>
        <button className="btn-home start-shopping" onClick={() => setView('shop')}>
          Begin Shopping
        </button>
        <button className="btn-home login-register" onClick={() => setView('login')}>
          Login/Register
        </button>
      </div>
      <p className="footer-note">*Sin iniciar sesión no podrás guardar tus listas de la compra</p>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<ViewState>('home');
  // Esta variable guardará desde dónde venía el usuario antes de ir a Login
  const [prevView, setPrevView] = useState<ViewState>('home');

  // Función para cambiar de vista guardando la anterior
  const navigateTo = (newView: ViewState) => {
    if (newView === 'login') {
      setPrevView(view); // Guardamos si veníamos de 'shop' o 'home'
    }
    setView(newView);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);

      if (event === 'SIGNED_IN') {
        // LÓGICA DE REDIRECCIÓN INFALIBLE
        if (prevView === 'shop') {
          setView('shop');
        } else {
          setView('profile');
        }
      }

      if (event === 'SIGNED_OUT') {
        setView('home');
      }

      if (event === "PASSWORD_RECOVERY") {
        setView('reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [prevView]); // Escuchamos prevView para que la lógica de SIGNED_IN sea precisa

  // --- RENDERING ---
  if (view === 'reset-password') return <UpdatePassword />;

  switch (view) {
    case 'home':
      return <HomePage setView={navigateTo} />;
    case 'shop':
      return <Shop setView={navigateTo} session={session} />;
    case 'login':
      return <Login setView={navigateTo} />;
    case 'signup':
      return <SignUp setView={navigateTo} />;
    case 'forgot-password':
      return <ForgotPassword setView={navigateTo} />;
    case 'profile':
      if (!session) return <Login setView={navigateTo} />;
      return <Profile setView={navigateTo} session={session} />;
    case 'manage-supermarkets':
      // Protegemos la ruta: solo para dueños de supermercados logueados
      if (!session || session.user.user_metadata.role !== 'Supermarket') {
        setView('profile');
        return null;
      }
      return <ManageSupermarkets setView={setView} session={session} />;
    case 'register-market':
      return <RegisterMarket setView={setView} session={session} />;
    case 'upload-map':
      return <UploadMap setView={setView} session={session} />;
    case 'upload-products':
        return <UploadProducts setView={setView} session={session} />;
    default:
      return <HomePage setView={navigateTo} />;
  }
}

export default App;
