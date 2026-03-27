import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoImg from '../assets/logo.png';
import './ProductManagement.css';
import type { ViewState } from '../App';

interface Product {
  id?: string;
  sup_id: string | null;
  name: string;
  price: number;
  category: string | null;
  subcategory: string | null;
  price_per_unit: string | null;
  format: string | null;
  image_url: string | null;
  stock_quantity?: number | null;
}

type SortConfig = {
  key: keyof Product | null;
  direction: 'asc' | 'desc';
};

export const ProductManagement = ({ supermarketId, setView }: { supermarketId: string, setView: (v: ViewState) => void }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

  const initialForm = {
    name: '', price: 0, category: '', subcategory: '',
    price_per_unit: '', format: '', image_url: '', stock_quantity: 0
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchProducts();
  }, [supermarketId]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('sup_id', supermarketId);

    if (!error) setProducts(data || []);
  };

  // --- LÓGICA DE ORDENAMIENTO ---
  const requestSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key] ?? '';
    const bValue = b[sortConfig.key] ?? '';

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // (Funciones handleSave, handleDelete, openEditModal se mantienen igual que antes...)
  const handleSave = async () => {
    const dataToSave = { ...formData, sup_id: supermarketId };
    if (editingProduct && editingProduct.id) {
      await supabase.from('products').update(dataToSave).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert([dataToSave]);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData(initialForm);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, price: product.price, category: product.category || '',
      subcategory: product.subcategory || '', price_per_unit: product.price_per_unit || '',
      format: product.format || '', image_url: product.image_url || '',
      stock_quantity: product.stock_quantity || 0
    });
    setIsModalOpen(true);
  };

  const getSortIcon = (key: keyof Product) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '🔼' : '🔽';
  };

  return (
    <div className="product-mgmt-container">
      <div className="header-actions">
        <button className="back-btn" onClick={() => setView('manage-supermarkets')}>← Return</button>
        <img src={logoImg} className="profile-main-logo" alt="SmartShop" />

        <button className="add-product-btn" onClick={() => { setEditingProduct(null); setFormData(initialForm); setIsModalOpen(true); }}>
          Add product
        </button>
      </div>

      {/* Contenedor con scroll */}
      <div className="table-scroll-container">
        <table className="product-table">
          <thead>
            <tr>
              <th>Actions</th>
              <th onClick={() => requestSort('category')}>Category {getSortIcon('category')}</th>
              <th onClick={() => requestSort('subcategory')}>Subcategory {getSortIcon('subcategory')}</th>
              <th onClick={() => requestSort('name')}>Name {getSortIcon('name')}</th>
              <th onClick={() => requestSort('price')}>Price {getSortIcon('price')}</th>
              <th onClick={() => requestSort('price_per_unit')}>Price/Unit {getSortIcon('price_per_unit')}</th>
              <th onClick={() => requestSort('format')}>Format {getSortIcon('format')}</th>
              <th>Image URL</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.length === 0 ? (
              /* Fila especial cuando la tabla está vacía */
              <tr>
                <td colSpan={8} style={{
                  textAlign: 'center',
                  padding: '50px',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  backgroundColor: 'transparent'
                }}>
                  No products found. Click on "Add product" to start.
                </td>
              </tr>
            ) : (
              sortedProducts.map((p) => (
                <tr key={p.id}>
                  <td className="action-cells">
                    <button className="edit-btn" onClick={() => openEditModal(p)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(p.id!)}>Delete</button>
                  </td>
                  <td>{p.category}</td>
                  <td>{p.subcategory}</td>
                  <td>{p.name}</td>
                  <td>{p.price} €</td>
                  <td>{p.price_per_unit}</td>
                  <td>{p.format}</td>
                  <td className="url-cell">{p.image_url}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* (Modal se mantiene igual...) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <div className="modal-grid">
              <div className="input-group">
                <label>Category</label>
                <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Subcategory</label>
                <input type="text" value={formData.subcategory} onChange={e => setFormData({ ...formData, subcategory: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Price</label>
                <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
              </div>
              <div className="input-group">
                <label>Price per unit</label>
                <input type="text" value={formData.price_per_unit} onChange={e => setFormData({ ...formData, price_per_unit: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Format</label>
                <input type="text" value={formData.format} onChange={e => setFormData({ ...formData, format: e.target.value })} />
              </div>
              <div className="input-group full-width">
                <label>Image URL</label>
                <textarea rows={2} value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} />
              </div>
            </div>
            <div className="modal-buttons">
              <button className="btn-save" onClick={handleSave}>{editingProduct ? 'Update' : 'Create Product'}</button>
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};