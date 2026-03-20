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
    last_name: userMetadata?.last_name || '',
    market_name: userMetadata?.market_name || '',
    market_surname: userMetadata?.market_surname || ''
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
            first_name: formData.market_name,
            last_name: formData.market_surname
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="profile-container">
      <img src={logoImg} className="profile-main-logo" alt="SmartShop" />

      <div className="profile-layout">
        <div className="profile-card">
          <h2>PERFIL</h2>

          {role === 'Consumer' ? (
            <div className="name-row">
              <div className="name-col">
                <label>Nombre</label>
                {isEditing ? (
                  <input name="first_name" value={formData.first_name} onChange={handleChange} className="edit-input" />
                ) : (
                  <div className="info-box">{formData.first_name}</div>
                )}
              </div>
              <div className="name-col">
                <label>Apellidos</label>
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
                <input name="market_name" value={formData.market_name} onChange={handleChange} className="edit-input" />
              ) : (
                <div className="info-box">{formData.market_name}</div>
              )}

              <label>Staff member surname</label>
              {isEditing ? (
                <input name="market_surname" value={formData.market_surname} onChange={handleChange} className="edit-input" />
              ) : (
                <div className="info-box">{formData.market_surname}</div>
              )}
            </>
          )}

          <label>Email de contacto</label>
          <div className="info-box" style={{ opacity: 0.7 }}>{session?.user?.email}</div>

          <label>Tipo de Cuenta</label>
          <div className="info-box" style={{ opacity: 0.7 }}>{role}</div>

          <button className="btn-edit" onClick={handleSave}>
            {isEditing ? 'Guardar Cambios' : 'Editar Perfil'}
          </button>
        </div>

        <div className="actions-section">
          <button className="btn-manage" onClick={() => role === 'Supermarket' ? setView('manage-supermarkets') : setView('shop')}>
            📦 Gestionar Tienda
          </button>
          <button className="btn-logout" onClick={handleLogout}>Cerrar Sesión</button>
        </div>
      </div>

      <div className="go-home-footer" onClick={() => setView('home')}>
        <span>←</span> VOLVER AL INICIO
      </div>
    </div>
  );
};