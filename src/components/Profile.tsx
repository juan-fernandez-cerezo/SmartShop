import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../assets/logo.png';
import './Profile.css';
import type { ViewState } from '../App';

export const Profile = ({ setView, session }: { setView: (v: ViewState) => void, session: any }) => {
  const userMetadata = session?.user?.user_metadata;
  const role = userMetadata?.role;
  const authId = session?.user?.id; // El UUID del usuario autenticado

  // Estados para el modo edición y los datos del formulario
  // Mapeamos los metadatos a nombres de campos que usaremos en el formulario
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: userMetadata?.first_name || '',
    last_name: userMetadata?.last_name || ''
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('home');
  };

  const handleSave = async () => {
    if (isEditing) {
      // 1. Actualizar Metadatos en Supabase Auth (Sistema interno)
      const { error: authError } = await supabase.auth.updateUser({
        data: formData
      });

      if (authError) {
        alert("Error en Auth: " + authError.message);
        return;
      }

      // 2. Actualizar Tabla de la Base de Datos (Pública)
      let dbError;

      if (role === 'Consumer') {
        // Ajustado a tus columnas: 'name' y 'surname'
        // Filtrado por 'user_id' según tu captura de pantalla
        const { error } = await supabase
          .from('consumers')
          .update({
            name: formData.first_name,
            surname: formData.last_name
          })
          .eq('user_id', authId);
        dbError = error;
      } else {
        const { error } = await supabase
          .from('supermarket_staff')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name
          })
          .eq('user_id', authId);
        dbError = error;
      }

      if (dbError) {
        alert("Error en Base de Datos: " + dbError.message);
      } else {
        alert("¡Perfil actualizado correctamente!");
        setIsEditing(false);
        // Recargamos para que la App lea los nuevos metadatos de la sesión
        window.location.reload();
      }
    } else {
      setIsEditing(true);
    }
  };

  const handleEliminateAccount = async () => {
    const confirmed = window.confirm("Sure you want to eliminate your account? You will not be able to recover your data.");
    if (confirmed) {
      // Nota: Supabase bloquea por seguridad el borrado de usuarios desde el frontend ('auth.users').
      // Para que funcione al 100%, se asume que tienes (o crearás) una función rpc 'delete_user' en Supabase.
      const { error } = await (supabase.rpc as any)('delete_user');

      if (error) {
        alert("Could not delete account. Make sure a delete_user function exists in your database: " + error.message);
      } else {
        // Sign out first, then we can clear and redirect
        await supabase.auth.signOut();
        setView('home');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="profile-container">
      <img src={logoImg} className="profile-main-logo" alt="SmartShop" />

      <div className="profile-layout">
        <div className="profile-card">
          <h2>PROFILE</h2>

          {role === 'Consumer' ? (
            <div className="name-row">
              <div className="name-col">
                <label>Name</label>
                {isEditing ? (
                  <input name="first_name" value={formData.first_name} onChange={handleChange} className="edit-input" />
                ) : (
                  <div className="info-box">{formData.first_name}</div>
                )}
              </div>
              <div className="name-col">
                <label>Surname</label>
                {isEditing ? (
                  <input name="last_name" value={formData.last_name} onChange={handleChange} className="edit-input" />
                ) : (
                  <div className="info-box">{formData.last_name}</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <label>Staff member name</label>
              {isEditing ? (
                <input name="first_name" value={formData.first_name} onChange={handleChange} className="edit-input" />
              ) : (
                <div className="info-box">{formData.first_name}</div>
              )}

              <label>Staff member surname</label>
              {isEditing ? (
                <input name="last_name" value={formData.last_name} onChange={handleChange} className="edit-input" />
              ) : (
                <div className="info-box">{formData.last_name}</div>
              )}
            </>
          )}

          <label>Contact Email</label>
          <div className="info-box" style={{ opacity: 0.7 }}>{session?.user?.email}</div>

          <label>Account Type</label>
          <div className="info-box" style={{ opacity: 0.7 }}>{role}</div>

          <button className="btn-edit" onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>

        <div className="actions-section">
          {role === 'Consumer' ? (
            <>
              <button className="btn-manage" onClick={() => setView('shop')}>
                🛒 Start Shopping
              </button>
              <button className="btn-manage" onClick={() => setView('saved-lists')} style={{ marginLeft: '10px' }}>
                📝 Saved Shopping Lists
              </button>
            </>
          ) : (
            <button className="btn-manage" onClick={() => setView('manage-supermarkets')}>
              📦 Manage Supermarkets
            </button>
          )}
          <button className="btn-logout" onClick={handleLogout}>Log out</button>

          <div className="danger-zone" style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '20px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <button className="btn-eliminate" onClick={handleEliminateAccount} style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              Eliminate account
            </button>
          </div>
        </div>
      </div>

      <div className="go-home-footer" onClick={() => setView('home')}>
        <span>←</span> Return Home
      </div>
    </div>
  );
};