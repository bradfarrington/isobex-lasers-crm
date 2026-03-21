import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '@/lib/api';
import type { Collection } from '@/types/database';

export function StorefrontCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchCollections()
      .then(setCollections)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="sf-loading">Loading collections...</div>;
  }

  return (
    <div>
      <div className="sf-page-header">
        <h1>Collections</h1>
        <p>Browse our curated collections</p>
      </div>

      <div className="sf-collection-grid">
        {collections.map((col) => (
          <Link
            key={col.id}
            to={`/shop/collections/${col.slug || col.id}`}
            className="sf-collection-card"
          >
            {col.cover_image_url && (
              <img src={col.cover_image_url} alt={col.name} className="sf-collection-card-cover" />
            )}
            <div className="sf-collection-card-overlay">
              <div>
                <div className="sf-collection-card-name">{col.name}</div>
                {col.product_count != null && (
                  <div className="sf-collection-card-count">{col.product_count} products</div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {collections.length === 0 && (
        <div className="sf-loading">No collections yet.</div>
      )}
    </div>
  );
}
