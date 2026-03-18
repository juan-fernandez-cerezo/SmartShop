import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import './UploadProducts.css';
import type { ViewState } from '../App';

export const UploadProducts = ({ setView, session }: { setView: (v: ViewState) => void, session: any }) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Función auxiliar para mapear cualquier fila al esquema de la DB
  const mapRowToProduct = (row: any, marketId: string) => ({
    sup_id: marketId,
    name: row.Nombre || row.nombre || row.name || 'Sin nombre',
    price: parseFloat(String(row.Precio || row.precio || row.price || 0).replace(',', '.').replace('€', '')),
    category: row.Categoria || row.categoria || row.category || 'General',
    subcategory: row.Subcategoria || row.subcategoria || row.subcategory,
    image_url: row.Imagen_url || row.imagen_url || row.image_url,
    price_per_unit: row.Precio_ud || row.precio_ud || row.price_per_unit,
    format: row.formato || row.Formato || row.format,
    stock_quantity: parseInt(row.stock_quantity || row.Stock || 100),
    pos_x: 0,
    pos_y: 0,
    aisle_number: 0
  });

  const processAndUpload = async (rawData: any[], marketId: string) => {
    const productsToInsert = rawData.map(row => mapRowToProduct(row, marketId));
    
    const { error } = await supabase.from('products').insert(productsToInsert);
    
    if (error) throw error;
    alert(`¡Éxito! Se han importado ${productsToInsert.length} productos.`);
    setView('manage-supermarkets');
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const { data: market } = await supabase
        .from('supermarkets')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!market) throw new Error("No se encontró el supermercado");

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const reader = new FileReader();

      reader.onload = async (e) => {
        const content = e.target?.result;
        let jsonData: any[] = [];

        if (fileExtension === 'json') {
          jsonData = JSON.parse(content as string);
        } 
        else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          const workbook = XLSX.read(content, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
        } 
        else if (fileExtension === 'csv') {
          const result = Papa.parse(content as string, { header: true, skipEmptyLines: true });
          jsonData = result.data;
        }

        await processAndUpload(jsonData, market.id);
      };

      // Leemos según el tipo de archivo
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-products-container">
      <div className="upload-card">
        <div className="upload-header">
          <span className="icon">📂</span>
          <h2>Importar Inventario Multiformato</h2>
        </div>

        <div className="format-box">
          <p>Formatos aceptados: <strong>.csv, .xlsx, .json</strong></p>
          <code style={{fontSize: '11px'}}>Columnas: Categoria, Subcategoria, Nombre, Precio, Precio_ud, formato, Imagen_url</code>
        </div>

        <div className={`dropzone ${file ? 'active' : ''}`}>
          <input 
            type="file" 
            id="multiInput" 
            onChange={handleFileChange} 
            accept=".csv, .xlsx, .xls, .json" 
            hidden 
          />
          <label htmlFor="multiInput" className="btn-select">
            {file ? `Archivo: ${file.name}` : 'Seleccionar archivo'}
          </label>
        </div>

        <button className="btn-confirm" onClick={handleImport} disabled={!file || uploading}>
          {uploading ? 'Procesando archivo...' : 'Confirmar e Importar'}
        </button>
      </div>
    </div>
  );
};