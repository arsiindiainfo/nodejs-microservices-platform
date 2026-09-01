import { useCallback, useEffect, useState, type FormEvent } from 'react';
import * as api from '../../api/endpoints';
import type { Product } from '../../api/types';
import { SpinnerBlock } from '../../components/Spinner';
import { Pagination } from '../../components/Pagination';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { isApiError } from '../../api/client';

const PAGE_SIZE = 10;

interface ProductFormState {
  sku: string;
  name: string;
  price: string;
  stockQty: string;
}

const EMPTY_FORM: ProductFormState = { sku: '', name: '', price: '', stockQty: '' };

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();

  const reload = useCallback(() => {
    Promise.resolve()
      .then(() => {
        setLoading(true);
        return api.listProducts({ page, limit: PAGE_SIZE, search: search || undefined });
      })
      .then((result) => {
        setProducts(result.items);
        setTotal(result.total);
        setError(null);
      })
      .catch((err) => setError(isApiError(err) ? err.message : 'Could not load products.'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    reload();
  }, [reload]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({ sku: product.sku, name: product.name, price: String(product.price), stockQty: String(product.stockQty) });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const price = Number(form.price);
    const stockQty = Number(form.stockQty);
    if (!form.name.trim() || Number.isNaN(price) || price <= 0 || Number.isNaN(stockQty) || stockQty < 0) {
      setFormError('Please enter a valid name, a price greater than 0, and a non-negative stock quantity.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateProduct(editing.id, { name: form.name, price, stockQty });
        showToast('Product updated.', 'success');
      } else {
        if (!form.sku.trim()) {
          setFormError('SKU is required.');
          setSaving(false);
          return;
        }
        await api.createProduct({ sku: form.sku, name: form.name, price, stockQty });
        showToast('Product created.', 'success');
      }
      setShowForm(false);
      reload();
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not save this product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteProduct(deleteTarget.id);
      showToast('Product deleted.', 'success');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast(isApiError(err) ? err.message : 'Could not delete this product.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Manage Products</h1>
          <p>Create, update, and remove catalog items.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + New product
        </button>
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
      ) : (
        <>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td><code>{product.sku}</code></td>
                    <td>{product.name}</td>
                    <td>${product.price.toFixed(2)}</td>
                    <td>{product.stockQty}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(product)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(product)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px 16px' }}>
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={PAGE_SIZE} total={total} onChange={setPage} />
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => !saving && setShowForm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editing ? 'Edit product' : 'New product'}</div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="sku">SKU</label>
                <input
                  id="sku"
                  value={form.sku}
                  disabled={Boolean(editing)}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="name">Name</label>
                <input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-field">
                <label htmlFor="price">Price (USD)</label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="stock">Stock quantity</label>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stockQty}
                  onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this product?"
          body={`"${deleteTarget.name}" will be permanently removed. Products referenced by an in-progress order can't be deleted.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
