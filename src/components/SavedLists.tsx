import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './SavedLists.css';
import logoImg from '../assets/logo.png';
import type { ViewState } from '../App';

interface SavedListsProps {
  setView: (v: ViewState) => void;
  session: any;
  filterMarketId?: string | null;
  onEditList: (market: any, listItems: any[]) => void;
}

export const SavedLists = ({ setView, session, filterMarketId, onEditList }: SavedListsProps) => {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLists = async () => {
      if (!session?.user) return;
      setLoading(true);

      try {
        // 1. Get consumer id
        const { data: consumer } = await supabase
          .from('consumers')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (!consumer) {
          setLoading(false);
          return;
        }

        // 2. Fetch lists and their supermarket details
        let query = supabase
          .from('shopping_lists')
          .select(`
            id,
            list_name,
            is_active,
            sup_id,
            supermarkets ( id, name, location, map_image_url )
          `)
          .eq('consumer_id', consumer.id);

        if (filterMarketId) {
          query = query.eq('sup_id', filterMarketId);
        }

        const { data: userLists, error } = await query.order('id', { ascending: false });

        if (error) throw error;

        setLists(userLists || []);
      } catch (err) {
        console.error("Error fetching lists", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [session]);

  const handleEditList = async (list: any) => {
    try {
      // Fetch list items + products
      const { data: items, error } = await supabase
        .from('list_items')
        .select(`
          quantity,
          products (*)
        `)
        .eq('list_id', list.id);

      if (error) throw error;

      // Reconstruct cart format expected by ShoppingView
      const initialCart = items?.map((item: any) => ({
        ...item.products,
        quantity: item.quantity
      })) || [];

      // The market object needs to be matching what ShoppingView / RouteView expects.
      // Assuming supermarket data from the join is complete enough for ShopView/RouteView:
      const marketData = list.supermarkets;

      onEditList(marketData, initialCart);
    } catch (err) {
      console.error("Error loading list items", err);
      alert("Error loading list items");
    }
  };

  return (
    <div className="saved-lists-container">
      <header className="saved-lists-header">
        <button className="btn-back-header" onClick={() => setView('profile')}>
          <span className="icon">&#8592;</span> <span className="text">Return</span>
        </button>
        <div className="logo-container-header">
          <img src={logoImg} alt="SmartShop Logo" className="logo-header" />
        </div>
        <div className="header-right-actions">
          <button className="btn-profile-header" onClick={() => setView('profile')}>
            <span className="icon">👤</span> <span className="text">Profile</span>
          </button>
        </div>
      </header>

      <div className="saved-lists-content">
        <h2>Saved Shopping lists</h2>

        {loading ? (
          <p>Loading lists...</p>
        ) : lists.length > 0 ? (
          <div className="lists-grid">
            {lists.map(list => (
              <div key={list.id} className="list-card">
                <div className="list-card-details">
                  <h3>{list.list_name}</h3>
                  <p><strong>Supermarket:</strong> {list.supermarkets?.name || 'Unknown'}</p>
                  <p><strong>Address:</strong> {list.supermarkets?.location || 'Unknown'}</p>
                </div>
                <div className="list-card-actions">
                  <button className="btn-edit-list" onClick={() => handleEditList(list)}>
                    View / Edit List
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-lists-msg">
            <p>You don't have any saved lists.</p>
            <button className="btn-start-shopping" onClick={() => setView('shop')}>
              Start shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
