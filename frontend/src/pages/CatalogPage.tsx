import { useEffect, useState } from 'react';
import * as api from '../api/endpoints';
import type { Product } from '../api/types';
import { SpinnerBlock } from '../components/Spinner';
import { Pagination } from '../components/Pagination';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../api/client';

const PAGE_SIZE = 12;

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setError(null);
        return api.listProducts({ page, limit: PAGE_SIZE, search: search || undefined });
      })
      .then((result) => {
        if (cancelled) return;
        setProducts(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : 'Could not load the catalog.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  function handleAdd(product: Product) {
    const qty = quantities[product.id] ?? 1;
    addItem(product, qty);
    showToast(`Added ${qty} × ${product.name} to your cart.`, 'success');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Catalog</h1>
          <p>Browse products and add them to your cart.</p>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <SpinnerBlock />
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>No products found</h3>
          <p>Try a different search term.</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map((product) => {
              const outOfStock = product.stockQty === 0;
              const lowStock = product.stockQty > 0 && product.stockQty <= 5;
              return (
                <div key={product.id} className="product-card">
                  <div className="product-thumb">📦</div>
                  <div className="product-sku">{product.sku}</div>
                  <div className="product-name">{product.name}</div>
                  <div className="product-price">${product.price.toFixed(2)}</div>
                  <div className={`product-stock${outOfStock ? ' out' : lowStock ? ' low' : ''}`}>
                    {outOfStock ? 'Out of stock' : lowStock ? `Only ${product.stockQty} left` : `${product.stockQty} in stock`}
                  </div>
                  <div className="product-card-footer">
                    <input
                      type="number"
                      className="qty-input"
                      min={1}
                      max={Math.max(product.stockQty, 1)}
                      value={quantities[product.id] ?? 1}
                      disabled={outOfStock}
                      onChange={(e) =>
                        setQuantities((prev) => ({ ...prev, [product.id]: Math.max(1, Number(e.target.value) || 1) }))
                      }
                    />
                    <button type="button" className="btn btn-primary btn-sm" disabled={outOfStock} onClick={() => handleAdd(product)}>
                      Add to cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} limit={PAGE_SIZE} total={total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
