import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Pencil,
  Trash2,
  AlertTriangle,
  Boxes,
  DollarSign,
  TrendingUp,
  Download,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { onPrimaryAction } from '@/lib/events';
import {
  formatCurrency,
  PRODUCT_STATUS_COLORS,
  PRODUCT_STATUS_LABELS,
} from '@/lib/utils';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { exportProductsToExcel, exportProductsToPDF } from '@/lib/export';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Product, ProductInput, ProductStatus } from '@/types';

interface ProductsPageProps {
  search: string;
}

const STATUS_OPTIONS: ProductStatus[] = ['active', 'discontinued', 'out_of_stock'];

export function ProductsPage({ search }: ProductsPageProps) {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (error) { setProducts([]); }
    else { setProducts(data ?? []); }
    setLoading(false);
  }

  useEffect(() => {
    load();
    return onPrimaryAction('products', () => {
      setEditing(null);
      setShowForm(true);
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, categoryFilter]);

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', confirmDelete.id);
    if (error) {
      toast(
        'Khong the xoa: san pham da co trong don hang. Hay ngung ban thay vi xoa.',
        'error'
      );
      return;
    }
    toast('Da xoa san pham', 'success');
    load();
  }

  if (loading) return <FullPageSpinner label="Dang tai san pham..." />;

  const totalInventoryValue = products.reduce(
    (s, p) => s + Number(p.cost) * p.stock,
    0
  );
  const lowStock = products.filter((p) => p.stock <= p.reorder_level).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-5">
      {/* Inventory summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Boxes}
          label="Tong san pham"
          value={products.length.toString()}
          iconBg="bg-brand-50 text-[var(--brand-600)]"
        />
        <SummaryCard
          icon={DollarSign}
          label="Gia tri ton kho"
          value={formatCurrency(totalInventoryValue)}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Sap het hang"
          value={lowStock.toString()}
          iconBg="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Het hang"
          value={outOfStock.toString()}
          iconBg="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Export buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => exportProductsToExcel(filtered)}
          className="btn-secondary text-sm"
        >
          <Download size={16} /> Excel
        </button>
        <button
          onClick={() => exportProductsToPDF(filtered)}
          className="btn-secondary text-sm"
        >
          <FileText size={16} /> PDF
        </button>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200',
              categoryFilter === 'all'
                ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'
            )}
          >
            Tat ca danh muc
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200',
                categoryFilter === cat
                  ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                  : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Products table */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={search ? 'Khong tim thay san pham' : 'Chua co san pham'}
            description={
              search
                ? 'Thu dieu chinh tim kiem hoac bo loc danh muc'
                : 'Them san pham dau tien vao danh muc'
            }
            action={
              !search && (
                <button
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                  className="btn-primary"
                >
                  Them san pham
                </button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold">San pham</th>
                  <th className="text-left px-5 py-3.5 font-semibold">SKU</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Danh muc</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Gia ban</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Ton kho</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Trang thai</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((product) => {
                  const isLow = product.stock <= product.reorder_level;
                  const isOut = product.stock === 0;
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-ink-50/50 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0 group-hover:bg-ink-200/50 transition-colors">
                            <Package size={18} className="text-ink-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink-900 truncate">
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-xs text-ink-400 truncate max-w-xs">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-xs bg-ink-100 text-ink-600 px-2 py-0.5 rounded-md font-mono">
                          {product.sku}
                        </code>
                      </td>
                      <td className="px-5 py-4 text-ink-600">
                        {product.category ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="font-semibold text-ink-900 tabular-nums">
                          {formatCurrency(Number(product.price))}
                        </p>
                        <p className="text-xs text-ink-400">
                          gia von {formatCurrency(Number(product.cost))}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isOut ? (
                            <AlertTriangle size={14} className="text-rose-500" />
                          ) : isLow ? (
                            <AlertTriangle size={14} className="text-amber-500" />
                          ) : null}
                          <span
                            className={cn(
                              'font-semibold tabular-nums',
                              isOut
                                ? 'text-rose-600'
                                : isLow
                                  ? 'text-amber-600'
                                  : 'text-ink-800'
                            )}
                          >
                            {product.stock}
                          </span>
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">
                          dat lai: {product.reorder_level}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('badge', PRODUCT_STATUS_COLORS[product.status])}>
                          {PRODUCT_STATUS_LABELS[product.status]}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditing(product);
                              setShowForm(true);
                            }}
                            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-all hover:scale-110"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(product)}
                            className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-all hover:scale-110"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ProductFormModal
        open={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          load();
          setShowForm(false);
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Xoa san pham?"
        message={`Xoa "${confirmDelete?.name}"? Neu san pham nay da co trong don hang, khong the xoa — hay danh dau ngung ban thay vi do.`}
        confirmLabel="Xoa san pham"
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  iconBg,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  iconBg: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3 hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-ink-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-ink-900 tabular-nums">{value}</p>
      </div>
    </Card>
  );
}

interface ProductFormModalProps {
  open: boolean;
  editing: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

function ProductFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductInput>({
    sku: '',
    name: '',
    description: '',
    category: '',
    price: 0,
    cost: 0,
    stock: 0,
    reorder_level: 10,
    status: 'active',
    image_url: null,
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          sku: editing.sku,
          name: editing.name,
          description: editing.description ?? '',
          category: editing.category ?? '',
          price: Number(editing.price),
          cost: Number(editing.cost),
          stock: editing.stock,
          reorder_level: editing.reorder_level,
          status: editing.status,
          image_url: editing.image_url,
        });
      } else {
        setForm({
          sku: '',
          name: '',
          description: '',
          category: '',
          price: 0,
          cost: 0,
          stock: 0,
          reorder_level: 10,
          status: 'active',
          image_url: null,
        });
      }
    }
  }, [open, editing]);

  async function handleSave() {
    if (!form.name.trim()) {
      toast('Vui long nhap ten san pham', 'error');
      return;
    }
    if (!form.sku.trim()) {
      toast('Vui long nhap SKU', 'error');
      return;
    }
    if (form.price < 0) {
      toast('Gia ban khong duoc am', 'error');
      return;
    }
    if (form.cost < 0) {
      toast('Gia von khong duoc am', 'error');
      return;
    }
    if (form.stock < 0) {
      toast('So luong ton khong duoc am', 'error');
      return;
    }
    if (form.reorder_level !== undefined && form.reorder_level < 0) {
      toast('Muc dat lai khong duoc am', 'error');
      return;
    }
    setSaving(true);

    const payload: ProductInput = {
      ...form,
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description?.trim() || null,
      category: form.category?.trim() || null,
    };

    if (editing) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editing.id);
      if (error) {
        toast('Cap nhat san pham that bai: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      toast('Da cap nhat san pham', 'success');
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) {
        if (error.code === '23505') {
          toast('SKU nay da ton tai', 'error');
        } else {
          toast('Tao san pham that bai: ' + error.message, 'error');
        }
        setSaving(false);
        return;
      }
      toast('Da them san pham', 'success');
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Sua san pham' : 'Them san pham'}
      subtitle={editing ? 'Cap nhat thong tin san pham va ton kho' : 'Them san pham moi vao danh muc'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Huy
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            {editing ? 'Luu thay doi' : 'Them san pham'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Ten san pham *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tai nghe khong day"
              className="input"
            />
          </div>
          <div>
            <label className="label">SKU *</label>
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="WH-001"
              className="input font-mono uppercase"
            />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Mo ta ngan gon san pham..."
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Danh muc</label>
            <input
              value={form.category ?? ''}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Dien tu"
              className="input"
            />
          </div>
          <div>
            <label className="label">Gia ban (VND)</label>
            <input
              type="number"
              step="1000"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Gia von (VND)</label>
            <input
              type="number"
              step="1000"
              min={0}
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
              className="input"
            />
          </div>
          <div>
            <label className="label">So luong ton</label>
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Muc dat lai</label>
            <input
              type="number"
              min={0}
              value={form.reorder_level ?? 10}
              onChange={(e) => setForm({ ...form, reorder_level: parseInt(e.target.value) || 0 })}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Trang thai</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setForm({ ...form, status: s })}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200',
                  form.status === s
                    ? PRODUCT_STATUS_COLORS[s] + ' border-current'
                    : 'border-ink-200 text-ink-500 hover:bg-ink-50'
                )}
              >
                {PRODUCT_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
