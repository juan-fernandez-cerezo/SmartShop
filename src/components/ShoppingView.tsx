import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import './ShoppingView.css';
import logoImg from '../assets/logo.png'; // Make sure this path corresponds to your logo

export const ShoppingView = ({ setView, market, session, initialCart, onCheckout }: any) => {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>(initialCart || []);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedList, setHasSavedList] = useState(false);
  const role = session?.user?.user_metadata?.role;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas las secciones');

  useEffect(() => {
    const fetchProducts = async () => {
      if (!market?.id) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('sup_id', market.id);

      if (error) {
        console.error("Error de Supabase:", error);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [market]);

  useEffect(() => {
    const checkSavedList = async () => {
      if (!session?.user || !market?.id || role === 'Supermarket') return;

      try {
        const { data: consumer } = await supabase
          .from('consumers')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (!consumer) return;

        const { data } = await supabase
          .from('shopping_lists')
          .select('id')
          .eq('consumer_id', consumer.id)
          .eq('sup_id', market.id)
          .limit(1);

        if (data && data.length > 0) {
          setHasSavedList(true);
        }
      } catch (err) {
        console.error("Error al comprobar listas guardadas:", err);
      }
    };
    checkSavedList();
  }, [market, session, role]);

  // Derive categories
  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean);
    return ['All sections', ...new Set(cats)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'All sections' || p.category === selectedCategory;
      const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Cart logic
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (!existing) return prev;

      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(item => item.id !== id);
      }
      return prev.map(item => item.id === id ? { ...item, quantity: newQty } : item);
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const getCartQuantity = (id: string) => {
    const item = cart.find(i => i.id === id);
    return item ? item.quantity : 0;
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const saveList = async () => {
    if (!session?.user) {
      alert("You must be logged in to save lists.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Get consumer id
      let consumerId = null;
      const { data: consumer } = await supabase
        .from('consumers')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (consumer) {
        consumerId = consumer.id;
      } else {
        alert("Consumer profile not found - you cannot save.");
        setIsSaving(false);
        return;
      }

      const listName = prompt("List name:", "My Shopping List");
      if (!listName) { setIsSaving(false); return; }

      // 2. Insert into shopping_lists
      const { data: newList, error: listError } = await supabase
        .from('shopping_lists')
        .insert({
          consumer_id: consumerId,
          sup_id: market.id,
          list_name: listName,
          is_active: true
        })
        .select()
        .single();

      if (listError || !newList) throw listError;

      // 3. Insert into list_items
      const itemsToInsert = cart.map(item => ({
        list_id: newList.id,
        product_id: item.id,
        quantity: item.quantity,
        is_checked: false
      }));

      const { error: itemsError } = await supabase
        .from('list_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert("List saved successfully!");

    } catch (err: any) {
      console.error(err);
      alert("Error saving list: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="shopping-view-container">
      {/* Top Header */}
      <header className="shopping-header">
        <button className="btn-back-header" onClick={() => setView('shop')}>
          <span className="icon">&#8592;</span> <span className="text">Return</span>
        </button>
        <div className="logo-container-header">
          <img src={logoImg} alt="SmartShop Logo" className="logo-header" />
        </div>
        <div className="header-right-actions">
          <button className="btn-profile-header" onClick={() => session ? setView('profile') : setView('login')}>
            <span className="icon">{session ? '👤' : '🔑'}</span> <span className="text">{session ? 'Profile' : 'Log in'}</span>
          </button>
          <div className="cart-toggle-header" onClick={() => setIsCartOpen(!isCartOpen)}>
            <span className="cart-icon-header">🛒</span>
            <span className="cart-price-header">{cartTotal.toFixed(2)} €</span>
            {cartItemsCount > 0 && <span className="cart-badge-header">{cartItemsCount}</span>}
          </div>
        </div>
      </header>

      <div className="shopping-main-content">

        {/* Left Side: Products */}
        <div className="products-section">
          <div className="section-title">
            🛒 <h2>Available Products</h2>
          </div>

          <div className="filters-row">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="filter-dropdown"
            >
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search product by name"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="products-grid-new">
            {loading ? (
              <p>Loading products...</p>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <div key={p.id} className="product-card">
                  <div className="product-image-wrap">
                    <img src={p.image_url || 'https://via.placeholder.com/150'} alt={p.name} />
                  </div>
                  <div className="product-info-wrap">
                    <h4 className="product-name">{p.name}</h4>
                    <p className="product-format">{p.format || p.subcategory || 'Unidad'}</p>
                    <div className="product-price-row">
                      <span className="price-main">{p.price} €</span>
                      <span className="price-unit">/ud.</span>
                    </div>
                  </div>
                  {getCartQuantity(p.id) > 0 ? (
                    <div className="qty-controls-card">
                      <button className="btn-qty-card" onClick={() => updateQuantity(p.id, -1)}>-</button>
                      <span className="qty-value-card">{getCartQuantity(p.id)} en lista</span>
                      <button className="btn-qty-card" onClick={() => updateQuantity(p.id, 1)}>+</button>
                    </div>
                  ) : (
                    <button className="btn-add-cart" onClick={() => addToCart(p)}>
                      Add to list
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="no-products-msg">
                <p>No products found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart */}
        <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
          <div className="cart-header">
            <h3>📝 Shopping List ({cartItemsCount} Items)</h3>
          </div>

          <div className="cart-items-list">
            {cart.length === 0 ? (
              <p className="empty-cart">Your list is empty</p>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item-row">
                  <div className="cart-item-image-mini">
                    <img src={item.image_url || 'https://via.placeholder.com/150'} alt={item.name} />
                  </div>
                  <div className="cart-item-main">
                    <div className="cart-item-details">
                      <p className="item-name">{item.name}</p>
                      <p className="item-price">€{item.price.toFixed(2)} (x{item.quantity})</p>
                    </div>
                    <div className="cart-item-actions">
                      <div className="qty-controls">
                        <button onClick={() => updateQuantity(item.id, -1)} className="btn-qty">-</button>
                        <span className="qty-value">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="btn-qty">+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="btn-remove">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-total-section">
            <span className="total-label">Total Price:</span>
            <span className="total-amount">€{(Math.round(cartTotal * 100) / 100).toFixed(2)}</span>
          </div>

          {session && role !== 'Supermarket' && (
            <button className="btn-save-list" onClick={saveList} disabled={cart.length === 0 || isSaving}>
              {isSaving ? 'Saving...' : '💾 Save List'}
            </button>
          )}

          {hasSavedList && (
            <button
              className="btn-save-list"
              style={{ backgroundColor: '#3498db', marginTop: '10px' }}
              onClick={() => setView('saved-lists-filtered')}
            >
              🚀 Continue with created list
            </button>
          )}

          <button
            className="btn-checkout"
            disabled={cart.length === 0}
            onClick={() => onCheckout?.(cart)}
          >
            End Shopping and See Route
          </button>
        </div>

      </div>
    </div>
  );
};