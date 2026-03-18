import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './UploadMap.css';
import type { ViewState } from '../App';

export const UploadMap = ({ setView, session }: { setView: (v: ViewState) => void, session: any }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // 1. Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile)); // Vista previa local
    }
  };

  // 2. Subir a Supabase Storage y actualizar Tabla
  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      // A. Subir al Bucket 'supermarket-maps'
      const { error: uploadError } = await supabase.storage
        .from('supermarket-maps')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // B. Obtener la URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('supermarket-maps')
        .getPublicUrl(filePath);

      // C. Actualizar el último supermercado creado por este usuario
      // (Para hacerlo más preciso, lo ideal sería pasar el ID del market recién creado)
      const { data: lastMarket } = await supabase
        .from('supermarkets')
        .select('id')
        .eq('user_id', session.user.id)
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (lastMarket) {
        await supabase
          .from('supermarkets')
          .update({ map_image_url: publicUrl })
          .eq('id', lastMarket.id);
      }

      alert("¡Mapa subido correctamente!");
      // REDIRECCIÓN ACTUALIZADA:
      setView('upload-products');

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <div className="upload-header">
          <span className="cart-icon">🛒</span>
          <h2>MarketFind - Optimizador de Rutas</h2>
        </div>

        <div className="upload-dropzone">
          <div className="dropzone-content">
            {preview ? (
              <img src={preview} alt="Preview" className="map-preview" />
            ) : (
              <>
                <div className="upload-icon">⬆️</div>
                <h3>Carga el mapa de tu supermercado</h3>
                <p>Sube una imagen del plano del supermercado para comenzar</p>
              </>
            )}
          </div>
          
          <input 
            type="file" 
            id="file-upload" 
            accept="image/*" 
            onChange={handleFileChange} 
            hidden 
          />
          <label htmlFor="file-upload" className="btn-select">
            {file ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </label>
        </div>

        {file && (
          <button 
            className="btn-confirm-upload" 
            onClick={handleUpload} 
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : 'Confirmar y Finalizar'}
          </button>
        )}
      </div>
    </div>
  );
};