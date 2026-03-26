import { useState, useEffect, useRef } from 'react';
import { Search, X, Building, User, Package, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import './GlobalSearch.css';

interface GlobalSearchResult {
  type: 'contact' | 'company' | 'order' | 'product';
  id: string;
  title: string;
  subtitle?: string | null;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim().length < 2) {
      setTimeout(() => {
        setResults([]);
        setIsOpen(false);
      }, 0);
      return;
    }

    const search = async () => {
      // search contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      // search companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(5);

      // search products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sku')
        .ilike('name', `%${query}%`)
        .limit(5);

      // search orders
      const strippedQuery = query.replace('#', '').trim();
      const isNum = /^\d+$/.test(strippedQuery);
      
      let ordersMatchNumeric: any[] = [];
      if (isNum) {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, customer_name, customer_email')
          .eq('order_number', Number(strippedQuery))
          .limit(5);
        if (data) ordersMatchNumeric = data;
      }

      const { data: ordersMatchString } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_email')
        .or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%`)
        .limit(5);

      const allOrders = [...ordersMatchNumeric, ...(ordersMatchString || [])];
      // deduplicate
      const uniqueOrders = allOrders.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i).slice(0, 5);

      const combined: GlobalSearchResult[] = [
        ...(contacts || []).map(c => ({
          type: 'contact' as const,
          id: c.id,
          title: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Contact',
          subtitle: c.email
        })),
        ...(companies || []).map(c => ({
          type: 'company' as const,
          id: c.id,
          title: c.name,
          subtitle: 'Company'
        })),
        ...(products || []).map(p => ({
          type: 'product' as const,
          id: p.id,
          title: p.name,
          subtitle: p.sku ? `SKU: ${p.sku}` : 'Product'
        })),
        ...uniqueOrders.map(o => ({
          type: 'order' as const,
          id: o.id,
          title: `Order #${o.order_number}`,
          subtitle: o.customer_name || o.customer_email || 'Unnamed Customer'
        }))
      ];

      setResults(combined);
      setIsOpen(true);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // Handle escape key and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  return (
    <div className="global-search-container" ref={containerRef}>
      <div className="global-search-input-wrapper">
        <Search size={16} className="global-search-icon" />
        <input
          type="text"
          placeholder="Search contacts, companies, orders, products..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          className="global-search-input"
        />
        {query && (
          <button onClick={clearSearch} className="global-search-clear" aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="global-search-dropdown">
          {results.length > 0 ? (
            <div className="global-search-results">
              {results.map(r => (
                <div
                  key={`${r.type}-${r.id}`}
                  className="global-search-result-item"
                  onClick={() => {
                    setIsOpen(false);
                    if (r.type === 'contact') navigate(`/crm/${r.id}`);
                    if (r.type === 'company') navigate(`/companies`);
                    if (r.type === 'order') navigate(`/orders/${r.id}`);
                    if (r.type === 'product') navigate(`/store/${r.id}`);
                  }}
                >
                  <div className="global-search-result-icon">
                    {r.type === 'contact' && <User size={14} />}
                    {r.type === 'company' && <Building size={14} />}
                    {r.type === 'order' && <Package size={14} />}
                    {r.type === 'product' && <ShoppingBag size={14} />}
                  </div>
                  <div className="global-search-result-text">
                    <div className="global-search-result-title">{r.title}</div>
                    {r.subtitle && <div className="global-search-result-subtitle">{r.subtitle}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="global-search-empty">No results found for "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
}
